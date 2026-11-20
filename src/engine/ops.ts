// Exécution des « opérations » issues des interventions du narrateur : modifie les données et génère les conséquences.
import type { GameState, Op, OpResult, Party } from './types'
import { chance, pick, rand } from './rng'
import { clamp, fmtDate } from './util'
import { impact } from './polls'
import { MAJORITY, censureVote, chooseGovernment, fallOfGovernment, govSeats, installGovernment, newFictionalPerson, seatsOf } from './parliament'
import { addNews, communique, logChronicle, publish } from './narrate'
import { announceAlliance, breakAlliance, createAlliance, createParty, crisis, joinAlliance, adjustRelation, protest, publishPoll, referendum, scandal, splitParty, allianceOf, proposeAlliance, FAMILY_DEFAULTS } from './actions'
import { dissolveAssembly, leaderResigns, nominatePm, scheduleElection, ELECTION_LABEL } from './elections'
import { fileLaw } from './laws'
import { generateDebate, generateInterview, generateSpeech } from './media'

export interface ApplyOpts {
  deferMedia?: boolean
}

export function applyOps(s: GameState, ops: Op[], text: string, opts: ApplyOpts = {}): OpResult {
  const res: OpResult = { summary: [], warnings: [], advanceDays: 0, mediaRequests: [], needsNarration: [] }
  let lastNew: string | undefined
  const P = (id?: string): Party | undefined => (id === '$new' ? s.parties[lastNew ?? ''] : id ? s.parties[id] : undefined)
  const ok = (m: string) => res.summary.push(m)
  const warn = (m: string) => res.warnings.push(m)

  for (const op of ops) {
    try {
      switch (op.op) {
        case 'create_party': {
          const from = P(op.fromPartyId)
          const p = createParty(s, {
            name: op.name, acronym: op.acronym, family: op.family, lr: op.lr, cult: op.cult, leaderName: op.leaderName, ideology: op.ideology,
            supportShare: op.supportShare ?? 1.2, fromPartyId: from?.id, seatShare: op.seatShare,
          })
          lastNew = p.id
          publish(s, { type: 'creation', title: `Naissance d’un parti : ${p.name} (${p.acronym})`, detail: `${p.name} est officiellement lancé, sous la direction de ${s.persons[p.leaderId!]?.name}. ${p.ideology} Il revendique ${p.members.toLocaleString('fr-FR')} adhérents.`, partyIds: [p.id], personIds: p.leaderId ? [p.leaderId] : [], importance: 3, tone: 'neutre', subject: p.id })
          ok(`Parti créé : ${p.name} (${p.acronym}), famille ${p.family.replace('-', ' ')}, ≈ ${p.support.toFixed(1)} % d’intentions de vote.`)
          if (op.joinAllianceFamily) {
            const fam = op.joinAllianceFamily
            const sameSide = (x: Party) => (fam === 'extreme-gauche' || fam === 'gauche' || fam === 'ecologiste' ? ['extreme-gauche', 'gauche', 'ecologiste'].includes(x.family) : x.family === fam || (fam === 'droite' && x.family === 'extreme-droite'))
            const al = s.alliances.find((a) => !a.dissolved && a.partyIds.some((id) => s.parties[id] && (fam === 'extreme-gauche' ? s.parties[id].family === 'extreme-gauche' : sameSide(s.parties[id]))))
            if (al) {
              const attitude = al.partyIds.reduce((a, id) => a + (s.parties[id].relations[p.id] ?? 0), 0) / al.partyIds.length
              if (attitude > -30) { joinAlliance(s, al.id, p.id); announceAlliance(s, al); ok(`${p.acronym} rejoint « ${al.name} ».`) }
              else { ok(`Les partenaires de « ${al.name} » refusent d’intégrer ${p.acronym} (relations trop dégradées).`); publish(s, { type: 'alliance', title: `${al.name} ferme la porte à ${p.acronym}`, detail: `Les partis de l’alliance refusent l’adhésion du nouveau venu, jugé trop clivant.`, partyIds: [p.id, ...al.partyIds], importance: 2, tone: 'negatif', subject: p.id }) }
            } else {
              const mates = Object.values(s.parties).filter((x) => x.id !== p.id && x.active && !x.pseudo && sameSide(x)).sort((a, b) => b.support - a.support).slice(0, 2)
              if (mates.length) { const a = createAlliance(s, [p.id, ...mates.map((m) => m.id)]); announceAlliance(s, a); ok(`Nouvelle alliance : ${a.name}.`) }
            }
          }
          break
        }
        case 'dissolve_assembly': {
          if (s.lastDissolution && (new Date(s.date).getTime() - new Date(s.lastDissolution).getTime()) / 86400000 < 365) warn('Dissolution rapprochée de la précédente (moins d’un an) : contraire à l’article 12 de la Constitution. Elle est tout de même appliquée car décidée par le narrateur.')
          const d = dissolveAssembly(s, op.inDays ?? 30)
          ok(`Dissolution : législatives le ${fmtDate(d)}.`)
          // réactions des partis : campagne éclair, ralliements
          for (const p of Object.values(s.parties)) if (p.active && !p.pseudo && p.support > 2 && chance(s, 0.5)) p.cohesion = clamp(p.cohesion - 3, 5, 100)
          break
        }
        case 'call_election': {
          const kind = op.kind in ELECTION_LABEL ? op.kind : 'legislatives'
          const days = clamp(op.inDays ?? (kind === 'presidentielle' ? 45 : 35), 5, 400)
          const date = addDaysSafe(s.date, days)
          scheduleElection(s, kind, date, `${ELECTION_LABEL[kind]}${kind === 'legislatives' ? ' anticipées' : ''}`)
          publish(s, { type: 'election', title: `${ELECTION_LABEL[kind]} convoquées pour le ${fmtDate(date)}`, detail: `Le scrutin est fixé au ${fmtDate(date)}. Les partis entrent en campagne et négocient candidatures et alliances.`, partyIds: [], importance: 3, tone: 'neutre' })
          ok(`${ELECTION_LABEL[kind]} programmées le ${fmtDate(date)}.`)
          break
        }
        case 'form_alliance': {
          const ids = op.partyIds.map((i) => P(i)?.id).filter(Boolean) as string[]
          if (ids.length < 2) { warn('Alliance : au moins deux partis sont nécessaires.'); break }
          if (op.proposal) {
            const a = s.parties[ids[0]]
            const b = s.parties[ids[1]]
            const r = proposeAlliance(s, a, b)
            if (!r.ok) {
              adjustRelation(s, a.id, b.id, -3)
              publish(s, { type: 'alliance', title: `${b.acronym} décline la main tendue de ${a.acronym}`, detail: `La proposition d’alliance est repoussée : ${r.why}.`, partyIds: [a.id, b.id], importance: 2, tone: 'negatif', subject: a.id })
              ok(`Proposition d’alliance refusée (${r.why}).`)
              break
            }
          }
          const al = createAlliance(s, ids, op.name, op.purpose ?? 'electoral')
          announceAlliance(s, al)
          for (const id of ids) impact(s, id, 0.3, { durable: 0.3, halfLife: 25, reason: `Alliance ${al.name}` })
          // les composantes éloignées idéologiquement voient monter la contestation interne
          for (const id of ids) {
            const p = s.parties[id]
            const far = ids.filter((o) => o !== id && s.parties[o] && Math.abs(s.parties[o].lr - p.lr) > 0.6).length
            if (far) p.cohesion = clamp(p.cohesion - 4 * far, 5, 100)
          }
          ok(`Alliance créée : ${al.name} (${ids.map((i) => s.parties[i].acronym).join(', ')}).`)
          break
        }
        case 'join_alliance': {
          const p = P(op.partyId)
          if (!p) { warn('Parti introuvable pour rejoindre l’alliance.'); break }
          const al = (op.allianceId && s.alliances.find((a) => a.id === op.allianceId)) || s.alliances.find((a) => !a.dissolved && a.partyIds.some((x) => s.parties[x]?.family === op.family))
          if (!al) { warn('Aucune alliance correspondante.'); break }
          joinAlliance(s, al.id, p.id)
          announceAlliance(s, al)
          ok(`${p.acronym} rejoint « ${al.name} ».`)
          break
        }
        case 'break_alliance': {
          const p = P(op.partyId)
          const al = (op.allianceId && s.alliances.find((a) => a.id === op.allianceId && !a.dissolved)) || (p && allianceOf(s, p.id))
          if (!al) { warn('Aucune alliance à rompre.'); break }
          if (p) breakAlliance(s, al, p.id, 'des désaccords stratégiques')
          else for (const id of [...al.partyIds]) { if (!al.dissolved) breakAlliance(s, al, id, 'des désaccords stratégiques') }
          ok(`Alliance « ${al.name} » rompue.`)
          break
        }
        case 'split_party': {
          const np = splitParty(s, op.partyId, { newName: op.newName, seatShare: op.seatShare, leaderName: op.leaderName, reason: 'Sous l’effet d’une crise interne' })
          if (np) ok(`Scission : ${np.name} naît de ${s.parties[op.partyId].acronym} (${seatsOf(s, np.id)} députés).`)
          else warn('Scission impossible.')
          break
        }
        case 'change_leader': {
          const p = P(op.partyId)
          if (!p) break
          if (op.newLeaderName) {
            const found = Object.values(s.persons).find((x) => x.name.toLowerCase() === op.newLeaderName!.toLowerCase())
            const succ = found ?? undefined
            if (succ) leaderResigns(s, p, 'à la demande du narrateur', succ.id)
            else {
              const person = newFictionalPerson(s, p.id, `Président(e) de ${p.acronym}`)
              person.name = op.newLeaderName
              person.bio = 'Personnalité fictive créée par le narrateur.'
              leaderResigns(s, p, 'à la demande du narrateur', person.id)
            }
          } else leaderResigns(s, p, 'après sa démission')
          ok(`Direction de ${p.acronym} renouvelée.`)
          break
        }
        case 'resign': {
          const per = s.persons[op.personId]
          if (!per) break
          if (s.president.personId === per.id) {
            s.president = { personId: null, partyId: s.president.partyId, since: s.date, interim: true }
            s.government.caretaker = true
            scheduleElection(s, 'presidentielle', addDaysSafe(s.date, 30), 'Présidentielle anticipée — 1er tour')
            publish(s, { type: 'institution', title: `${per.name} démissionne de la présidence de la République`, detail: 'La vacance est constatée ; le président du Sénat assure l’intérim. L’élection présidentielle doit avoir lieu 20 à 35 jours après la vacance.', partyIds: s.president.partyId ? [s.president.partyId] : [], personIds: [per.id], importance: 3, tone: 'negatif', subject: s.president.partyId ?? undefined })
            s.institutional.push({ date: s.date, text: `${per.name} quitte la présidence ; présidentielle anticipée.` })
            ok('Démission du président : présidentielle anticipée dans 30 jours.')
          } else if (s.government.pmId === per.id) {
            fallOfGovernment(s, `${per.name} remet la démission du gouvernement.`)
            ok('Le Premier ministre démissionne : le gouvernement est démissionnaire.')
          } else {
            const party = per.partyId ? s.parties[per.partyId] : null
            if (party && party.leaderId === per.id) leaderResigns(s, party, 'après sa démission')
            else { per.active = false; publish(s, { type: 'démission', title: `${per.name} quitte la vie politique`, detail: `${per.name} annonce sa démission de ses fonctions.`, partyIds: party ? [party.id] : [], personIds: [per.id], importance: 2, tone: 'negatif', subject: party?.id }) }
            ok(`${per.name} démissionne.`)
          }
          break
        }
        case 'scandal': {
          const sev = scandal(s, { personId: op.personId, partyId: op.partyId === '$new' ? lastNew : op.partyId, severity: op.severity, title: op.title })
          if (sev) ok(`Scandale de gravité ${sev}/5.`)
          else warn('Scandale : cible introuvable.')
          break
        }
        case 'shock': {
          const p = P(op.partyId)
          if (!p) { warn('Choc : parti introuvable.'); break }
          impact(s, p.id, clamp(op.delta, -15, 15), { durable: op.durable === false ? 0.1 : 0.6, halfLife: 30, reason: op.reason ?? 'Intervention du narrateur' })
          ok(`${p.acronym} ${op.delta >= 0 ? '+' : ''}${op.delta} pt (effet ${op.durable === false ? 'transitoire' : 'durable'}).`)
          break
        }
        case 'crisis': { const c = crisis(s, { kind: op.kind, severity: op.severity, title: op.title }); ok(`Crise : ${c.title} (gravité ${c.severity}/5).`); break }
        case 'protest': { protest(s, { topic: op.topic, severity: op.severity }); ok('Mobilisation nationale déclenchée.'); break }
        case 'censure_motion': {
          const author = P(op.byPartyId) ?? Object.values(s.parties).filter((p) => p.active && !p.pseudo && !s.government.partyIds.includes(p.id)).sort((a, b) => b.oppositionStyle * seatsOf(s, b.id) - a.oppositionStyle * seatsOf(s, a.id))[0]
          const c = censureVote(s, author?.id)
          if (c.passes) {
            publish(s, { type: 'censure', title: `Motion de censure adoptée : ${c.yes} voix`, detail: `Déposée par ${author?.name ?? 'l’opposition'}, la motion renverse le gouvernement (majorité requise : ${MAJORITY}).`, partyIds: Object.keys(c.byParty).slice(0, 4), importance: 3, tone: 'negatif', subject: s.government.partyIds[0] })
            fallOfGovernment(s, 'Le gouvernement est renversé.')
            ok(`Censure adoptée (${c.yes} voix).`)
          } else {
            publish(s, { type: 'censure', title: `Motion de censure rejetée : ${c.yes} voix, il en manquait ${MAJORITY - c.yes}`, detail: `Le gouvernement survit au vote de la motion déposée par ${author?.name ?? 'l’opposition'}.`, partyIds: author ? [author.id] : [], importance: 3, tone: 'positif', subject: s.government.partyIds[0] })
            ok(`Censure rejetée (${c.yes} voix).`)
          }
          break
        }
        case 'new_pm': {
          const person = op.personId ? s.persons[op.personId] : undefined
          if (person) {
            const g = chooseGovernment(s, person.partyId ?? undefined)
            g.pm = person
            g.name = `Gouvernement ${person.name.split(' ').slice(1).join(' ') || person.name}`
            installGovernment(s, g, 'Le président de la République nomme ce Premier ministre.')
            s.government.caretaker = false
            ok(`${person.name} nommé(e) Premier ministre.`)
          } else { nominatePm(s); ok('Un nouveau Premier ministre est nommé.') }
          break
        }
        case 'reshuffle': {
          s.government.stability = clamp(s.government.stability + 5, 3, 100)
          s.economy.approval = clamp(s.economy.approval + 0.4, 5, 80)
          publish(s, { type: 'gouvernement', title: 'Remaniement ministériel', detail: `Le Premier ministre procède à un remaniement ; plusieurs portefeuilles changent de titulaire pour « donner un nouveau souffle » à l’exécutif (${s.government.name}).`, partyIds: s.government.partyIds, importance: 2, tone: 'neutre', subject: s.government.partyIds[0] })
          ok('Remaniement ministériel.')
          break
        }
        case 'referendum': referendum(s, op.topic); ok(`Référendum sur ${op.topic}.`); break
        case 'propose_law': { const l = fileLaw(s, { title: op.title, domain: op.domain, byGov: op.byGovernment ?? true, partyId: op.partyId }); ok(`Loi déposée : « ${l.title} » (vote à l’Assemblée dans ~24 jours).`); break }
        case 'poll': {
          const p = publishPoll(s, undefined, op.realInstrument ? `(Précision : l’institut « ${op.realInstrument} » existe réellement ; ce sondage est une simulation sans lien avec lui.)` : undefined)
          ok(`Sondage fictif publié (${p.institute}).`)
          if (op.realInstrument) warn(`Le sondage est attribué à « ${p.institute} » (institut fictif) : la simulation ne reproduit pas d’instituts réels.`)
          break
        }
        case 'media': {
          if (opts.deferMedia) res.mediaRequests.push({ kind: op.kind, personIds: op.personIds, outlet: op.outlet, topic: op.topic })
          else generateMedia(s, op.kind, op.personIds, op.outlet, op.topic)
          ok(`${op.kind === 'interview' ? 'Interview' : op.kind === 'debate' ? 'Débat' : 'Discours'} programmé(e).`)
          break
        }
        case 'advance_time': res.advanceDays += clamp(Math.round(op.days), 1, 3650); ok(`Le temps avance de ${Math.round(op.days)} jour(s).`); break
        case 'note': {
          addNews(s, { kind: 'article', outlet: 'Fil du narrateur', title: op.text.length > 90 ? op.text.slice(0, 87) + '…' : op.text, body: op.text, importance: 2, source: 'narrateur' })
          logChronicle(s, 'narrateur', 'Annonce du narrateur', op.text)
          ok('Fait consigné dans la chronique (sans effet mécanique : précisez un événement ou activez l’IA pour l’interpréter).')
          break
        }
      }
    } catch (e) {
      warn(`Erreur sur « ${(op as Op).op} » : ${(e as Error).message}`)
    }
  }
  void communique; void pick; void rand; void govSeats; void FAMILY_DEFAULTS
  return res
}

export function generateMedia(s: GameState, kind: 'interview' | 'debate' | 'speech', personIds: string[], outlet?: string, topic?: string) {
  const ids = personIds.filter((i) => s.persons[i])
  const fallback = s.president.personId ?? Object.values(s.persons)[0]?.id
  if (kind === 'interview') return generateInterview(s, ids[0] ?? fallback!, outlet, topic)
  if (kind === 'debate') return generateDebate(s, ids.length >= 2 ? ids : [ids[0] ?? fallback!, s.government.pmId ?? fallback!], topic, outlet)
  return generateSpeech(s, ids[0] ?? fallback!, topic)
}

function addDaysSafe(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
