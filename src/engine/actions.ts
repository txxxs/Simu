// Actions politiques atomiques : utilisées à la fois par le narrateur (ops) et par l'autonomie des acteurs (ai).
import type { Alliance, Crisis, Family, GameState, Party, Person } from './types'
import { between, chance, pick, rand, randn, shuffle } from './rng'
import { addDays, clamp, fmtDate, pct, uid } from './util'
import { conductPoll, effectiveSupport, impact, prox, renorm, shift } from './polls'
import { leaderName, publish, addNews, communique } from './narrate'
import { newFictionalPerson, seatsOf, setLeader } from './parliament'
import { leaderResigns } from './elections'
import { randomName, randomPartyName } from './names'

export const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24)

export const FAMILY_DEFAULTS: Record<Family, { lr: number; cult: number; color: string }> = {
  'extreme-gauche': { lr: -0.9, cult: -0.6, color: '#b3122a' },
  gauche: { lr: -0.5, cult: -0.45, color: '#e0607f' },
  ecologiste: { lr: -0.55, cult: -0.65, color: '#2a9d5c' },
  centre: { lr: 0.1, cult: -0.1, color: '#f0a020' },
  droite: { lr: 0.55, cult: 0.5, color: '#2b5aa8' },
  'extreme-droite': { lr: 0.88, cult: 0.92, color: '#243a6b' },
  regionaliste: { lr: 0, cult: 0, color: '#8a7fb4' },
  divers: { lr: 0.1, cult: 0.1, color: '#9aa0a6' },
}
export const FAMILY_LABEL: Record<Family, string> = { 'extreme-gauche': 'd’extrême gauche', gauche: 'de gauche', ecologiste: 'écologiste', centre: 'du centre', droite: 'de droite', 'extreme-droite': 'd’extrême droite', regionaliste: 'régionaliste', divers: 'sans étiquette' }
const PALETTE = ['#e76f51', '#2a9d8f', '#7b6cf6', '#c77dff', '#43aa8b', '#f4a261', '#577590', '#d65db1', '#00a6a6', '#b5838d']

export function initRelations(s: GameState, p: Party) {
  for (const q of Object.values(s.parties)) {
    if (q.id === p.id) continue
    const base = clamp(Math.round((prox(p, q) - 0.4) * 110 + between(s, -8, 8)), -90, 90)
    p.relations[q.id] = base
    q.relations[p.id] = clamp(base + Math.round(between(s, -6, 6)), -90, 90)
  }
}

export function adjustRelation(s: GameState, a: string, b: string, d: number) {
  const pa = s.parties[a]
  const pb = s.parties[b]
  if (!pa || !pb) return
  pa.relations[b] = clamp((pa.relations[b] ?? 0) + d, -100, 100)
  pb.relations[a] = clamp((pb.relations[a] ?? 0) + d, -100, 100)
}

export interface NewPartyOpts {
  name: string
  acronym?: string
  family?: Family
  lr?: number
  cult?: number
  ideology?: string
  leaderName?: string
  leaderId?: string
  supportShare?: number
  fromPartyId?: string
  seatShare?: number
  fictionalReason?: string
}

export function createParty(s: GameState, o: NewPartyOpts): Party {
  const fam = o.family ?? 'divers'
  const d = FAMILY_DEFAULTS[fam]
  let id = slug(o.name) || 'parti'
  while (s.parties[id]) id += '-' + Math.floor(rand(s) * 99)
  const acr = (o.acronym ?? o.name.split(/\s+/).filter((w) => w.length > 2).map((w) => w[0].toUpperCase()).join('')).slice(0, 8) || id.toUpperCase().slice(0, 4)
  const party: Party = {
    id, name: o.name, acronym: acr, color: PALETTE[Object.keys(s.parties).length % PALETTE.length] ?? d.color, family: fam,
    lr: clamp(o.lr ?? d.lr + between(s, -0.05, 0.05), -1, 1), cult: clamp(o.cult ?? d.cult + between(s, -0.05, 0.05), -1, 1),
    ideology: o.ideology ?? `Formation ${FAMILY_LABEL[fam]} fondée pendant la partie.`, leaderId: null, members: Math.round(between(s, 1500, 9000)), budget: 0.5,
    support: 0.05, territorial: Math.round(between(s, 8, 25)), cohesion: Math.round(between(s, 70, 90)), rejection: fam === 'extreme-droite' ? 0.55 : fam === 'extreme-gauche' ? 0.4 : 0.2,
    transfer: fam === 'centre' ? 0.8 : fam === 'extreme-droite' ? 0.15 : 0.55, oppositionStyle: fam === 'centre' ? 0.15 : 0.7, regional: fam === 'regionaliste', pseudo: false, real: false, active: true,
    founded: s.date, factions: [{ name: 'Direction', share: 0.7, lrShift: 0 }, { name: 'Courant critique', share: 0.3, lrShift: 0.1 }], objective: 'S’imposer dans le paysage politique.',
    relations: {}, nextCongress: addDays(s.date, 540), history: [{ date: s.date, text: 'Fondation du parti.' }],
  }
  s.parties[id] = party
  initRelations(s, party)
  // dirigeant
  let leader: Person | undefined = o.leaderId ? s.persons[o.leaderId] : undefined
  if (!leader) {
    leader = newFictionalPerson(s, id, `Président(e) de ${acr}`)
    if (o.leaderName) leader.name = o.leaderName
    leader.ambition = Math.max(leader.ambition, 70)
  }
  leader.partyId = id
  leader.role = `Président(e) de ${acr}`
  party.leaderId = leader.id
  // rival interne
  const rival = newFictionalPerson(s, id, `Cadre de ${acr}`)
  rival.ambition = Math.round(between(s, 55, 85))
  // soutien populaire pris aux voisins idéologiques
  if (o.supportShare && o.supportShare > 0) shift(s, id, Math.min(o.supportShare, 25))
  renorm(s)
  // députés transférés
  if (o.fromPartyId && o.seatShare) {
    const pool = s.deputies.filter((x) => x.partyId === o.fromPartyId).sort((a, b) => b.rebel - a.rebel)
    const n = Math.round(pool.length * clamp(o.seatShare, 0, 1))
    pool.slice(0, n).forEach((x) => (x.partyId = id))
  }
  // nouvelles relations de leadership
  return party
}

export function createAlliance(s: GameState, partyIds: string[], name?: string, purpose: Alliance['purpose'] = 'electoral'): Alliance {
  const ids = partyIds.filter((id) => s.parties[id])
  const fams = ids.map((i) => s.parties[i].family)
  const nm =
    name ??
    (fams.every((f) => f === 'extreme-gauche' || f === 'gauche' || f === 'ecologiste')
      ? ids.length > 2 ? 'Union de la gauche et des écologistes' : 'Union de la gauche'
      : fams.every((f) => f === 'droite' || f === 'extreme-droite')
        ? 'Union des droites'
        : fams.every((f) => f === 'centre' || f === 'droite')
          ? 'Alliance du centre et de la droite'
          : `Alliance ${ids.map((i) => s.parties[i].acronym).join('-')}`)
  const al: Alliance = { id: uid(s, 'al'), name: nm, partyIds: ids, formed: s.date, purpose, history: [{ date: s.date, text: 'Alliance conclue.' }] }
  s.alliances.push(al)
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) adjustRelation(s, ids[i], ids[j], 8)
  return al
}

export function joinAlliance(s: GameState, allianceId: string, partyId: string) {
  const al = s.alliances.find((a) => a.id === allianceId && !a.dissolved)
  if (!al || al.partyIds.includes(partyId)) return null
  al.partyIds.push(partyId)
  al.history.push({ date: s.date, text: `${s.parties[partyId]?.acronym} rejoint l’alliance.` })
  al.partyIds.forEach((id) => id !== partyId && adjustRelation(s, id, partyId, 6))
  return al
}

export function leaveAlliance(s: GameState, allianceId: string, partyId: string) {
  const al = s.alliances.find((a) => a.id === allianceId && !a.dissolved)
  if (!al) return
  al.partyIds = al.partyIds.filter((x) => x !== partyId)
  al.history.push({ date: s.date, text: `${s.parties[partyId]?.acronym} quitte l’alliance.` })
  al.partyIds.forEach((id) => adjustRelation(s, id, partyId, -18))
  if (al.partyIds.length < 2) {
    al.dissolved = s.date
    al.history.push({ date: s.date, text: 'Alliance dissoute.' })
  }
}

export function allianceOf(s: GameState, partyId: string) {
  return s.alliances.find((a) => !a.dissolved && a.partyIds.includes(partyId))
}

export function proposeAlliance(s: GameState, a: Party, b: Party, force = false): { ok: boolean; why: string } {
  if (prox(a, b) < 0.1 && !force) return { ok: false, why: 'incompatibilité idéologique' }
  const la = a.leaderId ? s.persons[a.leaderId] : null
  const lb = b.leaderId ? s.persons[b.leaderId] : null
  const style = (p: Person | null) => (p ? (p.strategy === 'bâtisseur d’alliances' ? 12 : p.strategy === 'purificateur' ? -22 : p.strategy === 'conquérant' ? -6 : 0) : 0)
  const need = ((1 - clamp(a.support / 20, 0, 1)) + (1 - clamp(b.support / 20, 0, 1))) / 2
  const score = prox(a, b) * 60 + (a.relations[b.id] ?? 0) * 0.45 + (b.relations[a.id] ?? 0) * 0.2 + 25 * need + style(la) + style(lb)
  const ok = force || score > 66 + randn(s) * 4
  return { ok, why: ok ? 'intérêt électoral commun' : score < 40 ? 'désaccords de fond' : 'refus des dirigeants' }
}

export function announceAlliance(s: GameState, al: Alliance) {
  const names = al.partyIds.map((i) => s.parties[i].acronym).join(', ')
  publish(s, {
    type: 'alliance', title: `Alliance : ${al.name}`, detail: `${names} annoncent une alliance (${al.purpose}). Les dirigeants évoquent des candidatures communes et un programme partagé.`, partyIds: al.partyIds, importance: 2,
    tone: 'neutre', subject: al.partyIds[0],
  })
  communique(s, al.partyIds[0], `Communiqué commun : ${al.name}`, `Les formations signataires (${names}) annoncent la conclusion d’un accord et appellent leurs militants à « construire une dynamique de rassemblement ».`)
}

export function breakAlliance(s: GameState, al: Alliance, partyId: string, why: string) {
  const p = s.parties[partyId]
  leaveAlliance(s, al.id, partyId)
  publish(s, {
    type: 'alliance', title: `${p.acronym} quitte l’alliance « ${al.name} »`, detail: `${p.name} annonce sa sortie de l’alliance, invoquant ${why}. ${al.dissolved ? 'L’alliance est dissoute.' : 'Les partenaires restants dénoncent un « coup de poignard ».'}`,
    partyIds: [partyId, ...al.partyIds], importance: 2, tone: 'negatif', subject: partyId,
  })
}

export function splitParty(s: GameState, partyId: string, o: { newName?: string; seatShare?: number; leaderName?: string; reason?: string } = {}) {
  const p = s.parties[partyId]
  if (!p || p.pseudo) return null
  const fac = [...p.factions].sort((a, b) => b.share - a.share)[1] ?? p.factions[0]
  const share = clamp(o.seatShare ?? (fac?.share ?? 0.25) * between(s, 0.7, 1.1), 0.08, 0.55)
  const taken = new Set(Object.values(s.parties).map((x) => x.name))
  const gen = randomPartyName(s, p.family === 'extreme-droite' || p.family === 'extreme-gauche' ? p.family : p.family, taken)
  const nm = o.newName ?? gen.name
  const rivalP = Object.values(s.persons).filter((x) => x.partyId === partyId && x.active && x.id !== p.leaderId).sort((a, b) => b.ambition - a.ambition)[0]
  const np = createParty(s, {
    name: nm, acronym: o.newName ? undefined : gen.acronym, family: p.family, lr: clamp(p.lr + (fac?.lrShift ?? 0.1) * 1.3, -1, 1), cult: clamp(p.cult + (fac?.lrShift ?? 0.1) * 0.5, -1, 1),
    leaderId: o.leaderName ? undefined : rivalP?.id, leaderName: o.leaderName, supportShare: 0, fromPartyId: partyId, seatShare: share,
    ideology: `Scission de ${p.acronym}. ${fac?.name ?? 'Courant dissident'}.`,
  })
  // le soutien se partage : une partie des intentions de vote suit les dissidents
  const moved = p.support * share * 0.6
  p.support -= moved
  np.support = Math.max(0.2, moved)
  renorm(s)
  p.members = Math.round(p.members * (1 - share * 0.8))
  np.members = Math.round(p.members * share * 0.8) + 1500
  p.cohesion = clamp(p.cohesion + 12, 5, 100)
  p.factions = p.factions.filter((f) => f !== fac)
  if (p.factions.length) p.factions[0].share = 1
  adjustRelation(s, partyId, np.id, -45)
  const moves = s.deputies.filter((d) => d.partyId === np.id).length
  p.history.push({ date: s.date, text: `Scission : naissance de ${np.name} (${moves} députés).` })
  publish(s, {
    type: 'scission', title: `Scission au sein de ${p.acronym} : naissance de ${np.acronym}`,
    detail: `${o.reason ?? 'Après des mois de tensions internes'}, ${moves} élus et une partie des militants quittent ${p.name} pour fonder ${np.name}, présidé par ${leaderName(s, np)}. « Nous ne pouvions plus continuer ensemble », explique l’un des dissidents.`,
    partyIds: [partyId, np.id], personIds: np.leaderId ? [np.leaderId] : [], importance: 3, tone: 'negatif', subject: partyId,
  })
  return np
}

export function mergeParties(s: GameState, aId: string, bId: string) {
  const big = s.parties[aId].support >= s.parties[bId].support ? s.parties[aId] : s.parties[bId]
  const small = big.id === aId ? s.parties[bId] : s.parties[aId]
  for (const d of s.deputies) if (d.partyId === small.id) d.partyId = big.id
  big.support += small.support
  big.members += small.members
  big.budget += small.budget
  small.active = false
  small.support = 0
  s.alliances.forEach((al) => (al.partyIds = al.partyIds.filter((x) => x !== small.id)))
  s.shocks = s.shocks.filter((sh) => sh.partyId !== small.id)
  for (const p of Object.values(s.persons)) if (p.partyId === small.id) p.partyId = big.id
  big.history.push({ date: s.date, text: `Fusion avec ${small.name}.` })
  renorm(s)
  publish(s, { type: 'fusion', title: `Fusion : ${small.acronym} rejoint ${big.acronym}`, detail: `${small.name} fusionne avec ${big.name}. Les deux directions évoquent « une nouvelle étape » ; les cadres se répartissent les responsabilités.`, partyIds: [big.id, small.id], importance: 2, tone: 'neutre', subject: big.id })
}

// ---------- Congrès ----------
export function holdCongress(s: GameState, p: Party) {
  const leader = p.leaderId ? s.persons[p.leaderId] : null
  p.nextCongress = addDays(s.date, 900 + Math.floor(rand(s) * 400))
  if (!leader) return
  const rivals = Object.values(s.persons).filter((x) => x.partyId === p.id && x.active && x.id !== leader.id).sort((a, b) => b.ambition - a.ambition)
  const rival = rivals[0]
  const strength = leader.popularity * 0.45 + leader.loyalty * 0.2 + p.cohesion * 0.35
  const challenge = rival ? rival.ambition * 0.4 + (100 - p.cohesion) * 0.3 + rival.popularity * 0.3 : 0
  if (rival && challenge + randn(s) * 9 > strength + 4) {
    leaderResigns(s, p, 'à l’issue du congrès', rival.id)
    return
  }
  const score = Math.round(clamp(50 + strength / 3 + randn(s) * 7, 51, 97))
  publish(s, {
    type: 'congrès', title: `${p.acronym} : ${leader.name} reconduit(e) avec ${score} % au congrès`,
    detail: `Réuni en congrès, ${p.name} confirme sa direction (${score} % des suffrages des adhérents) et adopte sa ligne pour les échéances à venir : « ${p.objective} »`,
    partyIds: [p.id], personIds: [leader.id], importance: 1, tone: 'neutre', subject: p.id, reactions: false,
  })
  p.cohesion = clamp(p.cohesion + 3, 5, 100)
}

// ---------- Scandales, crises, mobilisations ----------
export function scandal(s: GameState, o: { personId?: string; partyId?: string; severity?: number; title?: string }) {
  let person = o.personId ? s.persons[o.personId] : undefined
  let party = o.partyId ? s.parties[o.partyId] : person?.partyId ? s.parties[person.partyId] : undefined
  if (!person && party?.leaderId) person = s.persons[party.leaderId]
  if (!person && !party) return null
  if (!party && person?.partyId) party = s.parties[person.partyId]
  const sev = clamp(Math.round(o.severity ?? 1 + rand(s) * 2.4), 1, 5)
  const kinds = ['soupçons de financement irrégulier', 'révélations sur des frais de représentation', 'une enquête préliminaire du parquet financier', 'une affaire d’emploi fictif présumé', 'des propos polémiques tenus en privé', 'un conflit d’intérêts présumé']
  const what = o.title ?? pick(s, kinds)
  if (person) person.popularity = clamp(person.popularity - sev * 3.5, 2, 100)
  if (party) {
    impact(s, party.id, -0.35 * sev, { durable: 0.5, halfLife: 25, reason: 'Scandale' })
    party.cohesion = clamp(party.cohesion - sev * 2, 5, 100)
  }
  const who = person ? person.name : party!.name
  publish(s, {
    type: 'scandale', title: `Affaire : ${who} visé(e) par ${what}`,
    detail: `${who}${party ? ` (${party.acronym})` : ''} est mis(e) en cause pour ${what}. L’intéressé(e) ${person && person.integrity > 60 ? 'dénonce « une campagne de calomnie » et assure avoir toujours respecté la loi' : 'refuse de s’exprimer à ce stade'}. L’opposition réclame des explications.`,
    partyIds: party ? [party.id] : [], personIds: person ? [person.id] : [], importance: sev >= 3 ? 3 : 2, tone: 'negatif', subject: party?.id,
  })
  // démission possible
  if (person && party && party.leaderId === person.id && sev >= 3 && chance(s, 0.25 + (100 - person.integrity) / 250)) leaderResigns(s, party, 'sous la pression de l’affaire')
  return sev
}

export const CRISIS_KINDS: Record<string, { label: string; titles: string[] }> = {
  economique: { label: 'économique', titles: ['Krach boursier et crise du crédit', 'Fermeture en cascade d’usines industrielles', 'Flambée des taux d’intérêt'] },
  sociale: { label: 'sociale', titles: ['Mouvement social d’ampleur dans les transports', 'Grève générale dans le secteur public'] },
  sanitaire: { label: 'sanitaire', titles: ['Épidémie saisonnière hors norme saturant les hôpitaux', 'Alerte sanitaire nationale'] },
  diplomatique: { label: 'diplomatique', titles: ['Rupture diplomatique avec un partenaire majeur', 'Tensions au sein de l’Union européenne'] },
  securitaire: { label: 'sécuritaire', titles: ['Vague de violences urbaines', 'Menace sécuritaire élevée : plan d’urgence'] },
  climatique: { label: 'naturelle', titles: ['Inondations dévastatrices dans plusieurs départements', 'Canicule et sécheresse historiques'] },
  internationale: { label: 'internationale', titles: ['Escalade militaire aux portes de l’Europe', 'Crise énergétique mondiale'] },
  politique: { label: 'politique', titles: ['Crise de confiance envers les institutions', 'Blocage institutionnel'] },
}

export function crisis(s: GameState, o: { kind?: string; severity?: number; title?: string }) {
  const kind = o.kind && CRISIS_KINDS[o.kind] ? o.kind : pick(s, Object.keys(CRISIS_KINDS))
  const sev = clamp(Math.round(o.severity ?? 1 + rand(s) * 2.5), 1, 5)
  const title = o.title ?? pick(s, CRISIS_KINDS[kind].titles)
  const c: Crisis = { id: uid(s, 'cr'), title, kind, start: s.date, severity: sev, ongoing: true }
  s.crises.push(c)
  const e = s.economy
  if (kind === 'economique') { e.growth -= 0.5 * sev; e.unemployment += 0.15 * sev }
  if (kind === 'internationale') { e.inflation += 0.4 * sev; e.growth -= 0.2 * sev }
  if (kind === 'securitaire') e.insecurity = clamp(e.insecurity + 3 * sev, 0, 100)
  if (kind === 'sanitaire') { e.publicServices = clamp(e.publicServices - 2 * sev, 0, 100); e.growth -= 0.2 * sev }
  if (kind === 'climatique') e.growth -= 0.1 * sev
  const rally = (kind === 'internationale' || kind === 'securitaire') && sev >= 2
  const presParty = s.president.partyId
  if (rally && presParty) impact(s, presParty, 0.4 * sev, { durable: 0.15, halfLife: 30, reason: 'Effet de ralliement' })
  else for (const id of s.government.partyIds) impact(s, id, -0.3 * sev, { durable: 0.5, halfLife: 30, reason: 'Crise' })
  if (!rally) e.approval = clamp(e.approval - sev * 1.2, 5, 80)
  publish(s, {
    type: 'crise', title: `Crise ${CRISIS_KINDS[kind].label} : ${title}`,
    detail: `${title}. Le gouvernement ${rally ? 'appelle à l’unité nationale' : 'est sommé de réagir'} ; l’opposition ${rally ? 'oscille entre soutien et critiques' : 'dénonce un manque d’anticipation'}. Gravité estimée : ${sev}/5.`,
    partyIds: s.government.partyIds, importance: sev >= 3 ? 3 : 2, tone: rally ? 'neutre' : 'negatif', subject: s.government.partyIds[0],
  })
  return c
}

const PROTEST_TOPICS = ['les retraites', 'le pouvoir d’achat', 'les services publics', 'la sécurité', 'le climat', 'les salaires', 'la réforme de l’assurance-chômage', 'l’immigration']
export function protest(s: GameState, o: { topic?: string; severity?: number }) {
  const topic = o.topic ?? (s.economy.inflation > 4 ? 'le pouvoir d’achat' : s.economy.unemployment > 8.5 ? 'l’emploi' : pick(s, PROTEST_TOPICS))
  const sev = clamp(Math.round(o.severity ?? 1 + rand(s) * 2), 1, 5)
  const crowd = Math.round((sev * 80 + between(s, 20, 120)) / 10) * 10
  const proTopic = { lr: /climat/.test(topic) ? -0.6 : /sécurité|immigration/.test(topic) ? 0.7 : -0.5, cult: /climat/.test(topic) ? -0.7 : /sécurité|immigration/.test(topic) ? 0.8 : -0.2 }
  const beneficiaries = Object.values(s.parties).filter((p) => p.active && !p.pseudo && prox(p, proTopic) > 0.55 && !s.government.partyIds.includes(p.id))
  for (const p of beneficiaries) impact(s, p.id, 0.12 * sev, { durable: 0.3, halfLife: 20, reason: 'Mobilisation sociale' })
  s.economy.approval = clamp(s.economy.approval - sev * 0.5, 5, 80)
  publish(s, {
    type: 'mobilisation', title: `Mobilisation nationale sur ${topic} : ${crowd} 000 manifestants selon les syndicats`,
    detail: `Des cortèges ont défilé dans plusieurs dizaines de villes. La préfecture de police avance un chiffre nettement inférieur. ${sev >= 3 ? 'Des perturbations importantes sont attendues dans les transports.' : 'Le mouvement reste maîtrisé.'}`,
    partyIds: beneficiaries.slice(0, 2).map((p) => p.id), importance: sev >= 3 ? 3 : 2, tone: 'negatif', subject: s.government.partyIds[0],
  })
}

export function publishPoll(s: GameState, institute?: string, extra?: string) {
  const poll = conductPoll(s, institute)
  const rows = poll.rows.slice(0, 7).map((r) => `${r.partyId === 'autres' ? 'Autres' : s.parties[r.partyId]?.acronym} ${pct(r.value)} %`).join(' · ')
  addNews(s, {
    kind: 'poll', outlet: poll.institute, title: `Sondage fictif — ${poll.institute}`, importance: 2,
    body: `${rows}.${poll.analysis.length ? ' ' + poll.analysis.slice(0, 2).join(' ') : ''} ${extra ?? ''} (${poll.disclaimer})`.trim(),
    partyIds: poll.rows.slice(0, 3).map((r) => r.partyId).filter((x) => s.parties[x]),
  })
  return poll
}

export function referendum(s: GameState, topic: string) {
  const approval = s.economy.approval
  const yes = clamp(0.5 + (approval - 40) / 160 + randn(s) * 0.06, 0.2, 0.8)
  const turnout = clamp(0.5 + randn(s) * 0.05, 0.35, 0.7)
  const y = Math.round(yes * 1000) / 10
  const adopted = y > 50
  const presParty = s.president.partyId
  const el = { id: uid(s, 'el'), date: s.date, kind: 'referendum', title: `Référendum : ${topic}`, turnout: Math.round(turnout * 1000) / 10, shares: { oui: y, non: Math.round((100 - y) * 10) / 10 }, note: adopted ? 'Adopté' : 'Rejeté' }
  s.elections.push(el)
  if (presParty) impact(s, presParty, adopted ? 1.2 : -1.8, { durable: 0.3, halfLife: 40, reason: 'Référendum' })
  publish(s, {
    type: 'election', kind: 'result', title: `Référendum sur ${topic} : le « ${adopted ? 'oui' : 'non'} » l’emporte avec ${pct(Math.max(y, 100 - y))} %`,
    detail: `Participation : ${pct(el.turnout)} %. ${adopted ? 'Le texte est adopté ; le président salue « la volonté du peuple ».' : 'Le texte est rejeté ; l’opposition réclame que le pouvoir « tire toutes les conséquences » de ce désaveu.'}`,
    partyIds: presParty ? [presParty] : [], importance: 3, tone: adopted ? 'positif' : 'negatif', subject: presParty ?? undefined,
  })
  s.institutional.push({ date: s.date, text: `Référendum sur ${topic} : ${adopted ? 'oui' : 'non'} à ${pct(Math.max(y, 100 - y))} %.` })
}

export function newMovement(s: GameState, reason: string) {
  const fams: Family[] = ['gauche', 'centre', 'droite', 'ecologiste', 'extreme-gauche', 'extreme-droite']
  const fam = pick(s, fams)
  const taken = new Set(Object.values(s.parties).map((x) => x.name))
  const g = randomPartyName(s, fam, taken)
  const p = createParty(s, { name: g.name, acronym: g.acronym, family: fam, supportShare: between(s, 0.8, 2.2) })
  publish(s, { type: 'creation', title: `Naissance d’un mouvement : ${p.name}`, detail: `${reason} ${leaderName(s, p)} lance ${p.name} (${p.acronym}), qui revendique déjà ${p.members.toLocaleString('fr-FR')} adhérents.`, partyIds: [p.id], importance: 2, tone: 'neutre', subject: p.id })
  return p
}

export { setLeader, seatsOf, effectiveSupport, fmtDate, shuffle, addNews, randomName }
