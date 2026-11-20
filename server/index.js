// Serveur du simulateur : sert l'application (production) et relaie les appels à l'API Claude.
// La clé ANTHROPIC_API_KEY n'existe QUE ici (variables d'environnement / .env) et n'est jamais envoyée au navigateur.
import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 8787)
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5'
const KEY = (process.env.ANTHROPIC_API_KEY || '').trim()
const client = KEY ? new Anthropic({ apiKey: KEY }) : null

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '300kb' }))

// Limitation de débit simple (par IP) pour protéger la clé.
const hits = new Map()
function limiter(req, res, next) {
  const now = Date.now()
  const ip = req.ip || 'x'
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60_000)
  if (arr.length >= 30) return res.status(429).json({ error: 'Trop de requêtes, patientez une minute.' })
  arr.push(now)
  hits.set(ip, arr)
  next()
}

app.get('/api/status', (_req, res) => res.json({ llm: !!client, model: client ? MODEL : null }))

const SYSTEM_BASE = `Tu es le moteur narratif d'un simulateur politique français fictif (Ve République). Le joueur est le NARRATEUR : ses interventions sont des faits établis.
Règles : reste cohérent avec l'état fourni (digest), respecte les idéologies, n'invente jamais de sondage réel (tous les sondages sont fictifs), distingue faits réels et fiction.
Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, sans balises markdown.`

const OPS_SCHEMA = `Opérations possibles (champ "op"), utilise UNIQUEMENT les identifiants (id) présents dans le digest, ou "$new" pour désigner le parti créé plus tôt dans la même liste :
- create_party {name, acronym?, family(extreme-gauche|gauche|ecologiste|centre|droite|extreme-droite|regionaliste|divers), lr(-1..1), cult(-1..1), leaderName?, supportShare?(points %), fromPartyId?, seatShare?(0..1), ideology?, joinAllianceFamily?}
- dissolve_assembly {inDays?(20..40)} ; call_election {kind(legislatives|presidentielle|europeennes|municipales|regionales|departementales|senatoriales), inDays?}
- form_alliance {partyIds[], name?, purpose?, proposal?(true si simple proposition que l'autre peut refuser)} ; join_alliance {partyId, allianceId?} ; break_alliance {partyId?, allianceId?}
- split_party {partyId, newName?, seatShare?, leaderName?} ; change_leader {partyId, newLeaderName?} ; resign {personId}
- scandal {personId?|partyId?, severity(1..5), title?} ; shock {partyId, delta(points, ±), durable?(bool), reason?}
- set_support {partyId, value(% voulu)} ; set_seats {partyId, seats(nombre de députés voulu)} ; set_president {personId?, personName?} ; set_economy {metric(chomage|inflation|croissance|dette|deficit|popularite), value}
- crisis {kind(economique|sociale|sanitaire|diplomatique|securitaire|climatique|internationale|politique), severity, title?} ; protest {topic?, severity?}
- censure_motion {byPartyId?} ; new_pm {personId?} ; reshuffle {} ; referendum {topic} ; propose_law {title, domain(retraites|immigration|fiscalite|securite|ecologie|sante|education|travail|institutions|autre), byGovernment?, partyId?}
- poll {realInstrument?} ; media {kind(interview|debate|speech), personIds[], outlet?, topic?} ; advance_time {days} ; note {text}
Le narrateur a tous les pouvoirs : traduis fidèlement ce qu'il dit, en combinant plusieurs opérations si besoin. Si aucune opération précise ne correspond, choisis les plus proches (shock, crisis, scandal, set_support…) plutôt que "note".`

async function askJSON(system, payload, maxTokens = 2000) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: JSON.stringify(payload) }],
  })
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end < 0) throw new Error('Réponse IA non exploitable')
  return JSON.parse(text.slice(start, end + 1))
}

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '')

function requireLLM(_req, res, next) {
  if (!client) return res.status(503).json({ error: 'API Claude non configurée (ANTHROPIC_API_KEY manquante).' })
  next()
}

app.post('/api/interpret', limiter, requireLLM, async (req, res) => {
  try {
    const { digest, text } = req.body || {}
    if (typeof text !== 'string' || !text.trim() || !digest) return res.status(400).json({ error: 'Requête invalide' })
    const out = await askJSON(
      `${SYSTEM_BASE}\nTâche : traduire l'intervention du narrateur en opérations structurées.\n${OPS_SCHEMA}\nFormat de sortie : {"ops":[...],"notes":["remarques éventuelles, ex. incohérence constitutionnelle"]}`,
      { digest, intervention: clip(text, 1500) },
    )
    res.json({ ops: Array.isArray(out.ops) ? out.ops.slice(0, 8) : [], notes: Array.isArray(out.notes) ? out.notes.slice(0, 5).map((n) => clip(String(n), 200)) : [] })
  } catch (e) {
    console.error('[interpret]', e?.message)
    res.status(502).json({ error: "L'IA n'a pas pu interpréter l'intervention." })
  }
})

// kind: "articles" (couverture d'un événement) | "interview" | "debate" | "speech"
app.post('/api/narrate', limiter, requireLLM, async (req, res) => {
  try {
    const { kind, digest, events, subject } = req.body || {}
    if (!digest || !['articles', 'interview', 'debate', 'speech'].includes(kind)) return res.status(400).json({ error: 'Requête invalide' })
    const spec = {
      articles: `Écris la couverture médiatique des événements fournis. Sortie : {"items":[{"kind":"article|editorial|reaction","outlet":"nom (parmi: Info 24, Journal de 20 h, Le Quotidien, Le Courrier de Paris, Le Rappel, Radio Publique)","title":"...","body":"2 à 4 phrases","partyId?":"id"}]} — 3 à 5 éléments, tons différents selon la ligne éditoriale, y compris des critiques envers tous les camps, et réactions de partis cohérentes avec leur idéologie.`,
      interview: `Écris une interview télévisée réaliste avec de vraies questions difficiles, des relances sur les contradictions, des réponses fidèles à la personnalité. Sortie : {"title":"...","intro":"...","dialog":[{"speaker":"nom","text":"..."}]} — 8 à 12 répliques.`,
      debate: `Écris un débat télévisé avec modérateur, échanges vifs et cohérents avec chaque idéologie. Sortie : {"title":"...","intro":"...","dialog":[{"speaker":"nom","text":"..."}]} — 12 à 18 répliques.`,
      speech: `Écris un discours crédible et fidèle à l'idéologie de l'orateur et au contexte. Sortie : {"title":"...","body":"paragraphes séparés par des sauts de ligne (200 à 350 mots)"}.`,
    }[kind]
    const out = await askJSON(`${SYSTEM_BASE}\n${spec}`, { digest, events: Array.isArray(events) ? events.slice(0, 6) : undefined, subject }, 3000)
    res.json(out)
  } catch (e) {
    console.error('[narrate]', e?.message)
    res.status(502).json({ error: "L'IA n'a pas pu générer ce contenu." })
  }
})

// Production : sert l'application compilée.
const dist = path.resolve(__dirname, '../dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`\n  Simulateur politique — API sur http://localhost:${PORT}`)
  console.log(client ? `  IA activée (modèle : ${MODEL})` : '  IA désactivée : aucune clé ANTHROPIC_API_KEY (mode hors-ligne limité)')
  if (fs.existsSync(dist)) console.log(`  Application servie sur http://localhost:${PORT}`)
})
