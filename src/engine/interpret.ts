// Interprétation hors-ligne (règles) des interventions en langage naturel du narrateur.
// Sans clé API, ce moteur couvre les formulations courantes ; avec l'API, Claude interprète n'importe quelle formulation.
import type { Family, GameState, LawDomain, Op, Party } from './types'
import { norm } from './util'
import { DOMAINS } from './laws'

const EXTRA_ALIASES: Record<string, string[]> = {
  lfi: ['insoumis', 'insoumise', 'france insoumise', 'melenchonistes'],
  ps: ['parti socialiste', 'socialistes'],
  eelv: ['ecologistes', 'les ecologistes', 'verts', 'europe ecologie'],
  pcf: ['parti communiste', 'communistes francais'],
  ren: ['renaissance', 'macronistes', 'camp presidentiel', 'majorite presidentielle'],
  modem: ['mouvement democrate', 'democrates'],
  hor: ['horizons'],
  lr: ['les republicains', 'republicains', 'droite republicaine'],
  rn: ['rassemblement national', 'lepenistes'],
  rec: ['reconquete'],
  liot: ['liot', 'libertes independants'],
}

const NUMS: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40 }

const OUTLET_MAP: [RegExp, string][] = [
  [/bfm|lci|cnews|info 24/, 'Info 24'],
  [/tf1|france 2|20 ?h|journal/, 'Journal de 20 h'],
  [/franceinfo|france inter|rtl|europe 1|radio/, 'Radio Publique'],
  [/le monde|quotidien/, 'Le Quotidien'],
  [/figaro|courrier/, 'Le Courrier de Paris'],
  [/liberation|rappel|humanite/, 'Le Rappel'],
]
const REAL_INSTITUTES = ['ifop', 'elabe', 'odoxa', 'opinionway', 'harris interactive', 'ipsos', 'viavoice', 'cluster17', 'toluna', 'bva', 'csa', 'kantar']

interface Ent { id: string; idx: number }

function findParties(s: GameState, t: string): Ent[] {
  const out: Ent[] = []
  for (const p of Object.values(s.parties)) {
    if (!p.active || p.pseudo) continue
    const al = new Set<string>([norm(p.name), ...(EXTRA_ALIASES[p.id] ?? [])])
    if (p.acronym.length >= 2 && !['re', 'le', 'la', 'de', 'du', 'un', 'et', 'ou', 'div'].includes(norm(p.acronym))) al.add(norm(p.acronym))
    let best = -1
    for (const a of al) {
      if (a.length < 2) continue
      const m = new RegExp(`(^|[^a-z0-9])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).exec(t)
      if (m && (best < 0 || m.index < best)) best = m.index
    }
    if (best >= 0) out.push({ id: p.id, idx: best })
  }
  return out.sort((a, b) => a.idx - b.idx)
}

function findPersons(s: GameState, t: string): Ent[] {
  const out: Ent[] = []
  for (const p of Object.values(s.persons)) {
    const full = norm(p.name)
    const last = full.split(' ').slice(-1)[0]
    const cands = [full, ...(last.length >= 4 ? [last] : [])]
    for (const c of cands) {
      const m = new RegExp(`(^|[^a-z0-9])${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).exec(t)
      if (m) { out.push({ id: p.id, idx: m.index }); break }
    }
  }
  const pres = /\b(le|la) president(e)?( de la republique)?\b/.exec(t)
  if (pres && s.president.personId && !/president(e)? (du|de la|d')\s*(parti|groupe|assemblee|senat|conseil|region)/.test(t) && !out.some((o) => o.id === s.president.personId)) out.push({ id: s.president.personId, idx: pres.index })
  const pm = /\bpremier(e)? ministre\b/.exec(t)
  if (pm && s.government.pmId && !out.some((o) => o.id === s.government.pmId)) out.push({ id: s.government.pmId, idx: pm.index })
  return out.sort((a, b) => a.idx - b.idx)
}

function duration(t: string): number | null {
  const m = /(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|quarante)\s*(jours?|semaines?|mois|ans?|annees?)/.exec(t)
  if (!m) return null
  const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMS[m[1]]
  const u = m[2]
  return Math.round(n * (u.startsWith('jour') ? 1 : u.startsWith('sem') ? 7 : u === 'mois' ? 30 : 365))
}

function familyOf(t: string): Family | undefined {
  if (/extreme[- ]gauche|gauche radicale|anticapitaliste|trotsk/.test(t)) return 'extreme-gauche'
  if (/extreme[- ]droite|droite radicale|identitaire/.test(t)) return 'extreme-droite'
  if (/ecolog|vert/.test(t)) return 'ecologiste'
  if (/centre|centriste|liberal|progressiste|reformiste/.test(t)) return 'centre'
  if (/gauche|socialiste|social-democrate/.test(t)) return 'gauche'
  if (/droite|conservateur|gaulliste/.test(t)) return 'droite'
  if (/regionalist|autonomist/.test(t)) return 'regionaliste'
  return undefined
}

const IDEO: [RegExp, { name: string; acr: string; fam: Family; lr: number; cult: number }][] = [
  [/communiste/, { name: 'Nouveau Parti Communiste', acr: 'NPC', fam: 'extreme-gauche', lr: -0.93, cult: -0.5 }],
  [/trotsk|anticapitaliste|revolutionnaire/, { name: 'Parti Anticapitaliste Révolutionnaire', acr: 'PAR', fam: 'extreme-gauche', lr: -0.95, cult: -0.7 }],
  [/socialiste|social-democrate/, { name: 'Nouveau Parti Socialiste', acr: 'NPS', fam: 'gauche', lr: -0.48, cult: -0.4 }],
  [/ecolog|vert/, { name: 'Les Écologistes Indépendants', acr: 'LEI', fam: 'ecologiste', lr: -0.55, cult: -0.65 }],
  [/centriste|liberal|progressiste|reformiste/, { name: 'Mouvement Progressiste', acr: 'MP', fam: 'centre', lr: 0.15, cult: -0.1 }],
  [/conservateur|gaulliste/, { name: 'Les Conservateurs', acr: 'LC', fam: 'droite', lr: 0.6, cult: 0.6 }],
  [/nationaliste|souverainiste|patriote|identitaire/, { name: 'Mouvement Souverainiste', acr: 'MS', fam: 'extreme-droite', lr: 0.85, cult: 0.9 }],
  [/regionalist|autonomist/, { name: 'Union Régionaliste', acr: 'UR', fam: 'regionaliste', lr: 0, cult: 0 }],
]

const CAP = /([A-ZÀ-ÖØ-Þ][\p{L}'’-]+(?:\s+(?:de|du|des|la|le|d['’]))?(?:\s+[A-ZÀ-ÖØ-Þ][\p{L}'’-]+){0,2})/u

function domainOf(t: string): LawDomain {
  if (/retraite/.test(t)) return 'retraites'
  if (/immigr|etranger|migrat/.test(t)) return 'immigration'
  if (/impot|fiscal|taxe|budget|finances/.test(t)) return 'fiscalite'
  if (/securite|police|delinquan|justice penale/.test(t)) return 'securite'
  if (/ecolog|climat|energie|nucleaire|transition/.test(t)) return 'ecologie'
  if (/sante|hopital|medecin/.test(t)) return 'sante'
  if (/ecole|education|lycee|universit/.test(t)) return 'education'
  if (/travail|chomage|emploi|salaire|smic/.test(t)) return 'travail'
  if (/constitution|institution|proportionnelle|referendum|49/.test(t)) return 'institutions'
  return 'autre'
}

export function interpretOffline(s: GameState, text: string): { ops: Op[]; notes: string[] } {
  const orig = text.trim()
  const t = norm(orig)
  const ops: Op[] = []
  const notes: string[] = []
  const parties = findParties(s, t)
  const persons = findPersons(s, t)
  const dur = duration(t)
  const quoted = /[«"“]\s*([^»"”]+?)\s*[»"”]/.exec(orig)?.[1]
  const pct = /(\d+(?:[.,]\d+)?)\s*(?:%|points?|pts?)/.exec(t)
  const pId = (i: number) => parties[i]?.id
  const personParty = (id: string) => s.persons[id]?.partyId ?? undefined
  const hasVerb = (re: RegExp) => re.test(t)
  const used = new Set<string>()

  // ---- création de parti ----
  if (/(nouveau|nouvelle)\s+(parti|mouvement|formation)|(cree|fonde|lance|creation|naissance)\b.*\b(parti|mouvement|formation)|\b(parti|mouvement)\b.*\b(est cree|voit le jour|est fonde|nait|est lance)/.test(t) && !/dissolution du parti/.test(t)) {
    const ideo = IDEO.find(([re]) => re.test(t))?.[1]
    const named = /(?:appele|nomme|baptise|intitule)\s+(?:«\s*)?([A-ZÀ-ÖØ-Þ][^,.»"]+?)(?:\s+(?:est|et|qui|dirige|rejoint)\b|[,.»"]|$)/u.exec(orig)?.[1]
    const leader = new RegExp(`(?:dirige|fonde|cree|mene|lance|preside|conduit)\\s+par\\s+${CAP.source}`, 'u').exec(orig)?.[1] ?? new RegExp(`(?:sous la direction de|autour de)\\s+${CAP.source}`, 'u').exec(orig)?.[1]
    const fam = ideo?.fam ?? familyOf(t) ?? 'divers'
    const from = /(?:issu|scission|dissidents?|ex-?|ancien(?:s)? du|quittent le)\b/.test(t) && parties.length ? pId(0) : undefined
    ops.push({
      op: 'create_party', name: quoted ?? named ?? ideo?.name ?? 'Nouveau Mouvement Citoyen', acronym: quoted || named ? undefined : ideo?.acr, family: fam,
      lr: ideo?.lr, cult: ideo?.cult, leaderName: leader && !findPersons(s, norm(leader)).length ? leader : undefined,
      supportShare: pct && /intentions|sondage|point|%/.test(t) ? Number(pct[1].replace(',', '.')) : undefined, fromPartyId: from, seatShare: from ? 0.15 : undefined,
      joinAllianceFamily: /rejoint|integre|intègre/.test(t) && /alliance|union|front|coalition/.test(t) ? (familyOf(t.slice(t.search(/rejoint|integre/))) ?? fam) : undefined,
    })
    used.add('create')
  }

  // ---- dissolution / élections / référendum ----
  if (/dissol(ution|ut|vre)/.test(t) && !/dissolution (de l'alliance|du parti|du gouvernement)/.test(t)) {
    ops.push({ op: 'dissolve_assembly', inDays: dur && dur >= 15 && dur <= 60 ? dur : undefined }); used.add('dissol')
  }
  if (/referendum/.test(t)) {
    const topic = /referendum\s+(?:sur|portant sur|concernant)\s+(.+?)(?:[.,;]|$)/.exec(norm(orig))?.[1] ?? 'une question institutionnelle'
    ops.push({ op: 'referendum', topic }); used.add('ref')
  }
  const elecKinds: [RegExp, string][] = [[/presidentielle/, 'presidentielle'], [/legislative/, 'legislatives'], [/municipale/, 'municipales'], [/europeenne/, 'europeennes'], [/regionale/, 'regionales'], [/departementale/, 'departementales'], [/senatoriale/, 'senatoriales']]
  for (const [re, kind] of elecKinds) {
    if (re.test(t) && /(organis|convoqu|declench|anticip|fixe|annonce|tenir|se tiendr|aura lieu|lance)/.test(t) && !used.has('dissol') && !used.has('ref')) {
      ops.push({ op: 'call_election', kind, inDays: dur && dur < 400 ? dur : undefined }); used.add('elec'); break
    }
  }

  // ---- alliances ----
  const breaking = /(rompt|rupture|quitte l'alliance|sort de l'alliance|fin de l'alliance|claque la porte|se retire de l'alliance|quitte le nupes|quitte le nfp|divorce)/.test(t)
  if (breaking && parties.length) { ops.push({ op: 'break_alliance', partyId: pId(0) }); used.add('break') }
  else if (/(s'allie|s'allient|alliance|accord electoral|front commun|coalition|se rapprochent|union (de|des|avec)|candidature commune|rejoint)/.test(t) && !used.has('create')) {
    const alMatch = s.alliances.find((a) => !a.dissolved && (t.includes(norm(a.name)) || /\(([^)]+)\)/.exec(a.name) && new RegExp(`(^|[^a-z])${norm(/\(([^)]+)\)/.exec(a.name)![1])}($|[^a-z])`).test(t)))
    if (/rejoint/.test(t) && parties.length >= 1 && (alMatch || familyOf(t))) {
      ops.push({ op: 'join_alliance', partyId: pId(0)!, allianceId: alMatch?.id, family: familyOf(t) })
    } else if (parties.length >= 2) {
      ops.push({ op: 'form_alliance', partyIds: parties.map((p) => p.id), name: quoted, proposal: /(propose|tend la main|ouvre la porte|invite)/.test(t) })
    } else if (familyOf(t)) {
      const fam = familyOf(t)!
      const ids = Object.values(s.parties).filter((p) => p.active && !p.pseudo && (p.family === fam || (fam === 'gauche' && p.family === 'ecologiste'))).sort((a, b) => b.support - a.support).slice(0, 3).map((p) => p.id)
      if (ids.length >= 2) ops.push({ op: 'form_alliance', partyIds: ids, name: quoted })
    }
    if (ops.length) used.add('alliance')
  }

  // ---- scission / direction / démission ----
  if (/(scission|se scinde|fait scission|schisme|eclate|les dissidents|fronde)/.test(t) && parties.length && !used.has('create')) {
    const p = s.parties[pId(0)!]
    const n = /(\d+)\s*deputes?/.exec(t)
    ops.push({ op: 'split_party', partyId: p.id, newName: quoted, seatShare: n ? Math.min(0.6, Number(n[1]) / Math.max(1, s.deputies.filter((d) => d.partyId === p.id).length)) : undefined })
    used.add('split')
  }
  if (/(nouveau|nouvelle)\s+(president|presidente|chef|cheffe|leader|dirigeant|premier secretaire|secretaire national|patron)|prend la tete|prend la direction|elu(e)? (president|a la tete)|succede a|remplace .* a la tete/.test(t) && parties.length && !used.has('create')) {
    const nameM = new RegExp(`(?:elu(?:e)?|nomme(?:e)?|nouveau (?:president|chef|leader|dirigeant)|nouvelle (?:presidente|cheffe))\\s*(?::|,)?\\s*${CAP.source}`, 'u').exec(orig)?.[1] ?? new RegExp(`${CAP.source}\\s+(?:prend|succede|devient|est elu)`, 'u').exec(orig)?.[1]
    ops.push({ op: 'change_leader', partyId: pId(0)!, newLeaderName: nameM && !/^(Le|La|Un|Une|Les)\b/.test(nameM) ? nameM : undefined }); used.add('leader')
  } else if (/(demission|demissionne|quitte (la vie politique|ses fonctions|la presidence|matignon)|se retire de la vie)/.test(t) && !used.has('leader')) {
    const who = persons[0]
    if (who) { ops.push({ op: 'resign', personId: who.id }); used.add('resign') }
    else if (parties.length) { ops.push({ op: 'change_leader', partyId: pId(0)! }); used.add('leader') }
  }

  // ---- gouvernement et Parlement ----
  if (/motion de censure|censure le gouvernement|renverse le gouvernement/.test(t)) { ops.push({ op: 'censure_motion', byPartyId: pId(0) }); used.add('censure') }
  if (/remaniement/.test(t)) { ops.push({ op: 'reshuffle' }); used.add('reshuffle') }
  if (/(nomme|nommer|nomination|designe)\b.*premier(e)? ministre|nouveau premier ministre|nouvelle premiere ministre/.test(t) && !used.has('resign')) {
    const pmCand = persons.find((p) => p.id !== s.government.pmId && p.id !== s.president.personId)
    ops.push({ op: 'new_pm', personId: pmCand?.id }); used.add('pm')
  }
  if (/(projet de loi|proposition de loi|loi\s+(sur|contre|pour|relative)|reforme|texte sur)/.test(t) && !used.has('ref')) {
    const dom = domainOf(t)
    const gov = /(gouvernement|premier ministre|ministre|executif)/.test(t) || !parties.length
    const title = /(?:loi|reforme)\s+(?:sur|des|du|de la|de l'|contre|pour)\s+(.+?)(?:[.,;]|$)/.exec(norm(orig))?.[0]
    ops.push({ op: 'propose_law', title: title && title.length < 90 ? title : DOMAINS[dom].titles[0], domain: dom, byGovernment: gov, partyId: gov ? undefined : pId(0) }); used.add('law')
  }

  // ---- crises et événements ----
  if (/crise\s+gouvernementale/.test(t) && s.government.pmId) { ops.push({ op: 'resign', personId: s.government.pmId }); used.add('crisis') }
  else if (/(crise|catastrophe|inondation|canicule|seisme|guerre|krach|pandemie|epidemie|attentat|emeutes|violences urbaines|incendie|tempete)/.test(t) && !used.has('censure') && !used.has('dissol')) {
    const kind = /econom|financ|krach|dette/.test(t) ? 'economique' : /sanitaire|pandemie|epidemie/.test(t) ? 'sanitaire' : /diplomat/.test(t) ? 'diplomatique' : /securit|attentat|emeutes|violences/.test(t) ? 'securitaire' : /inondation|canicule|seisme|tempete|incendie|catastrophe|climat/.test(t) ? 'climatique' : /guerre|internationale|energet/.test(t) ? 'internationale' : /sociale/.test(t) ? 'sociale' : 'politique'
    ops.push({ op: 'crisis', kind, severity: /(grave|majeure|historique|violente)/.test(t) ? 4 : /(legere|petite|mineure)/.test(t) ? 1 : 3, title: quoted }); used.add('crisis')
  }
  if (/(manifestation|manif\b|greve|mobilisation|blocage|cortege|syndicats|gilets)/.test(t)) {
    const topic = /(?:contre|sur|pour)\s+(?:la |le |les |l')?(.+?)(?:[.,;]|$)/.exec(t)?.[1]
    ops.push({ op: 'protest', topic: topic && topic.length < 50 ? topic : undefined, severity: /(massive|historique|geante|generale)/.test(t) ? 4 : 2 }); used.add('protest')
  }
  if (/(scandale|affaire|mis en examen|revelation|soupcon|corruption|emploi fictif|enquete judiciaire|perquisition)/.test(t) && !used.has('censure')) {
    ops.push({ op: 'scandal', personId: persons[0]?.id, partyId: persons[0] ? undefined : pId(0), severity: /(grave|enorme|majeur|retentissant)/.test(t) ? 4 : /(mineur|petit|leger)/.test(t) ? 1 : 3, title: quoted }); used.add('scandal')
  }

  // ---- médias et sondages ----
  if (/sondage/.test(t)) {
    const inst = REAL_INSTITUTES.find((i) => t.includes(i))
    ops.push({ op: 'poll', realInstrument: inst ? inst.toUpperCase() : undefined }); used.add('poll')
  }
  const outlet = OUTLET_MAP.find(([re]) => re.test(t))?.[1]
  const leaderOf = (partyId?: string) => (partyId ? s.parties[partyId]?.leaderId ?? undefined : undefined)
  if (/(debat|face[- ]a[- ]face|confrontation televisee)/.test(t)) {
    const ids = [...persons.map((p) => p.id), ...parties.map((p) => leaderOf(p.id)).filter(Boolean) as string[]]
    const uniq = [...new Set(ids)]
    if (uniq.length >= 2) { ops.push({ op: 'media', kind: 'debate', personIds: uniq.slice(0, 3), outlet, topic: /(econom|securit|ecolog|institution|social)/.exec(t)?.[1] }); used.add('media') }
  } else if (/(interview|invite(e|s)? (de|sur|a|par)|est l'invite|plateau|entretien|questions? des journalistes)/.test(t)) {
    const id = persons[0]?.id ?? leaderOf(pId(0))
    if (id) { ops.push({ op: 'media', kind: 'interview', personIds: [id], outlet, topic: /(econom|securit|ecolog|institution|social)/.exec(t)?.[1] }); used.add('media') }
  } else if (/(discours|allocution|s'adresse aux francais|prend la parole|declaration solennelle|conference de presse|reagit)/.test(t)) {
    const id = persons[0]?.id ?? (/(president|elysee)/.test(t) ? s.president.personId ?? undefined : leaderOf(pId(0)))
    if (id) { ops.push({ op: 'media', kind: 'speech', personIds: [id], topic: /(?:sur|a propos de)\s+(.+?)(?:[.,;]|$)/.exec(norm(orig))?.[1] }); used.add('media') }
  }

  // ---- variation d'opinion explicite ----
  if (!ops.length && parties.length && /(gagne|perd|chute|bond|progresse|recule|s'effondre|decolle|grimpe|plonge|monte)/.test(t)) {
    const neg = /(perd|chute|recule|s'effondre|plonge|baisse)/.test(t)
    const amount = pct ? Number(pct[1].replace(',', '.')) : /(effondre|decolle|bond|plonge)/.test(t) ? 5 : 2
    ops.push({ op: 'shock', partyId: pId(0)!, delta: neg ? -amount : amount, durable: !/(temporaire|passager|ephemere)/.test(t), reason: orig.slice(0, 120) }); used.add('shock')
  }

  // ---- avancer le temps ----
  const adv = /(avance|avancer|passe|passent|s'ecoule|ecoulent|plus tard|apres|laisse le temps|fais passer)/.test(t)
  if (dur && (adv || /^(dans |apres )?\d/.test(t)) && !used.has('dissol') && !used.has('elec')) ops.push({ op: 'advance_time', days: dur })
  else if (!ops.length && /(demain|le lendemain)/.test(t)) ops.push({ op: 'advance_time', days: 1 })

  if (!ops.length) {
    ops.push({ op: 'note', text: orig })
    notes.push('Aucune action reconnue par le moteur de règles : l’intervention est consignée comme fait narratif. Activez l’API Claude pour une interprétation libre.')
  }
  void hasVerb; void personParty
  return { ops, notes }
}

export type { Party }
