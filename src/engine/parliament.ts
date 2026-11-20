import type { Deputy, GameState, Law, Party, Person } from './types'
import { between, chance, pick, rand, randn, shuffle, weightedPick } from './rng'
import { clamp, largestRemainder, uid, addDays } from './util'
import { prox } from './polls'
import { randomName } from './names'
import { ETRANGER_SEATS, REGIONS } from './regions'
import { publish } from './narrate'

export const TOTAL_SEATS = 577
export const MAJORITY = 289

export const seatsOf = (s: GameState, partyId: string) => s.deputies.reduce((a, d) => a + (d.partyId === partyId ? 1 : 0), 0)
export function seatMap(s: GameState): Record<string, number> {
  const m: Record<string, number> = {}
  for (const d of s.deputies) m[d.partyId] = (m[d.partyId] ?? 0) + 1
  return m
}
export const govSeats = (s: GameState) => s.government.partyIds.reduce((a, id) => a + seatsOf(s, id), 0)

function regionCaps(): number[] {
  const ordinary = REGIONS.filter((r) => r.id !== 'etr')
  const caps = largestRemainder(ordinary.map((r) => r.pop), TOTAL_SEATS - ETRANGER_SEATS)
  const out: number[] = []
  let i = 0
  for (const r of REGIONS) out.push(r.id === 'etr' ? ETRANGER_SEATS : caps[i++])
  return out
}

export function fit(p: Pick<Party, 'lr' | 'cult'>, r: { lr: number; cult: number }) {
  return Math.exp(-((p.lr - 2 * r.lr) ** 2 + (0.6 * (p.cult - 2 * r.cult)) ** 2) / (2 * 0.9 ** 2))
}

/** Crée les 577 députés (fictifs) en respectant exactement les effectifs par parti. */
export function assignDeputies(s: GameState, seats: Record<string, number>) {
  const total = Object.values(seats).reduce((a, b) => a + b, 0)
  if (total !== TOTAL_SEATS) throw new Error(`Effectifs invalides : ${total} sièges au lieu de ${TOTAL_SEATS}`)
  const caps = regionCaps()
  const rem: Record<string, number> = { ...seats }
  const ids = Object.keys(rem).filter((k) => rem[k] > 0 && s.parties[k])
  const deputies: Deputy[] = []
  const order = shuffle(s, REGIONS.map((_, i) => i))
  for (const ri of order) {
    const r = REGIONS[ri]
    for (let k = 0; k < caps[ri]; k++) {
      const avail = ids.filter((id) => rem[id] > 0)
      const w = avail.map((id) => fit(s.parties[id], r) * rem[id])
      const pid = weightedPick(s, avail, w)
      rem[pid]--
      deputies.push({
        id: uid(s, 'd'),
        name: randomName(s),
        partyId: pid,
        region: r.id,
        circo: `${r.name} (n°${k + 1})`,
        rebel: clamp(Math.abs(randn(s)) * 0.15, 0, 0.6) * (1 - s.parties[pid].cohesion / 160),
      })
    }
  }
  s.deputies = deputies
}

/** Modèle de passage des voix aux sièges (scrutin à deux tours, reports, désistements). */
export function allocateSeats(s: GameState, shares: Record<string, number>, noise = 0.07): Record<string, number> {
  const parties = Object.keys(shares).filter((id) => s.parties[id]?.active)
  const inAlliance = new Map<string, string>()
  for (const al of s.alliances) if (!al.dissolved && (al.purpose === 'electoral' || al.purpose === 'gouvernementale') && al.partyIds.length >= 2) al.partyIds.forEach((id) => inAlliance.set(id, al.id))
  const blocks: { key: string; ids: string[] }[] = []
  const seen = new Set<string>()
  for (const id of parties) {
    const a = inAlliance.get(id)
    if (a) {
      if (seen.has(a)) continue
      seen.add(a)
      blocks.push({ key: a, ids: parties.filter((x) => inAlliance.get(x) === a) })
    } else blocks.push({ key: id, ids: [id] })
  }
  const bw = blocks.map((b) => {
    const share = b.ids.reduce((a, id) => a + shares[id], 0)
    const transfer = b.ids.reduce((a, id) => a + shares[id] * s.parties[id].transfer, 0) / Math.max(share, 0.01)
    const regional = b.ids.some((id) => s.parties[id].regional)
    let w = Math.pow(share, 1.2) * (0.55 + 0.9 * transfer) * Math.exp(randn(s) * noise)
    if (b.ids.length > 1) w *= 1.05 // candidatures uniques
    if (regional) w *= 2.5
    if (share < 1.0 && !regional) w = 0
    return w
  })
  const bs = largestRemainder(bw, TOTAL_SEATS)
  const out: Record<string, number> = {}
  blocks.forEach((b, i) => {
    const inner = largestRemainder(b.ids.map((id) => shares[id]), bs[i])
    b.ids.forEach((id, j) => (out[id] = inner[j]))
  })
  return out
}

// ---------- Votes ----------
function lawSupportProb(s: GameState, p: Party, law: Law): number {
  const inGov = s.government.partyIds.includes(p.id)
  const closeness = prox(p, { lr: law.lr, cult: law.cult })
  let pr = 0.15 + 0.8 * closeness
  if (law.government) pr += inGov ? 0.5 : -0.2 * p.oppositionStyle
  else if (law.authorPartyId === p.id) pr = 0.97
  else if (inGov) pr -= 0.1
  if (law.authorPartyId && law.authorPartyId !== p.id) pr += ((p.relations[law.authorPartyId] ?? 0) / 100) * 0.15
  return clamp(pr, 0.03, 0.97)
}

export function voteOnLaw(s: GameState, law: Law, label: string) {
  let pour = 0
  let contre = 0
  let abst = 0
  const byParty: Record<string, { pour: number; contre: number; abst: number }> = {}
  for (const d of s.deputies) {
    const p = s.parties[d.partyId]
    if (!p) continue
    let pr = lawSupportProb(s, p, law)
    if (chance(s, d.rebel * 0.6)) pr = 1 - pr
    const r = rand(s)
    const v = r < pr ? 'pour' : r < pr + (1 - pr) * 0.18 ? 'abst' : 'contre'
    ;(byParty[d.partyId] ??= { pour: 0, contre: 0, abst: 0 })[v]++
    if (v === 'pour') pour++
    else if (v === 'contre') contre++
    else abst++
  }
  const vote = { label, date: s.date, pour, contre, abst }
  law.votes.push(vote)
  return { ...vote, byParty }
}

export function censureVote(s: GameState, byPartyId?: string) {
  const unpop = clamp((45 - s.economy.approval) / 45, 0, 1)
  let yes = 0
  const byParty: Record<string, number> = {}
  for (const d of s.deputies) {
    const p = s.parties[d.partyId]
    if (!p) continue
    let pr: number
    if (s.government.partyIds.includes(p.id)) pr = 0.01
    else if (p.id === byPartyId) pr = 0.98
    else pr = clamp(p.oppositionStyle * (0.5 + 0.75 * unpop) - (s.government.caretaker ? 0 : 0), 0.02, 0.97)
    if (chance(s, d.rebel * 0.4)) pr = 1 - pr
    if (rand(s) < pr) {
      yes++
      byParty[d.partyId] = (byParty[d.partyId] ?? 0) + 1
    }
  }
  return { yes, passes: yes >= MAJORITY, byParty }
}

// ---------- Gouvernement ----------
function newFictionalPerson(s: GameState, partyId: string | null, role: string): Person {
  const p = partyId ? s.parties[partyId] : null
  const id = uid(s, 'p')
  const person: Person = {
    id,
    name: randomName(s),
    partyId,
    role,
    age: 40 + Math.floor(rand(s) * 25),
    bio: 'Personnalité fictive créée par la simulation.',
    ambition: Math.round(between(s, 40, 90)),
    pragmatism: Math.round(between(s, 40, 90)),
    loyalty: Math.round(between(s, 40, 90)),
    charisma: Math.round(between(s, 35, 85)),
    integrity: Math.round(between(s, 40, 90)),
    mediaSkill: Math.round(between(s, 35, 85)),
    lr: clamp((p?.lr ?? 0) + between(s, -0.1, 0.1), -1, 1),
    cult: clamp((p?.cult ?? 0) + between(s, -0.1, 0.1), -1, 1),
    popularity: Math.round(between(s, 10, 35)),
    strategy: pick(s, ['consolidateur', 'conquérant', 'bâtisseur d’alliances', 'arbitre', 'outsider']),
    relations: {},
    fictional: true,
    active: true,
    convictions: ['Compromis', 'Gestion'],
  }
  s.persons[id] = person
  return person
}
export { newFictionalPerson }

export function setLeader(s: GameState, partyId: string, personId: string, reason: string) {
  const p = s.parties[partyId]
  if (!p) return
  const old = p.leaderId
  p.leaderId = personId
  if (old && s.persons[old] && old !== personId) {
    s.persons[old].role = `Ancien dirigeant de ${p.acronym}`
  }
  const np = s.persons[personId]
  if (np) {
    np.partyId = partyId
    np.role = `Dirigeant de ${p.acronym}`
  }
  p.history.push({ date: s.date, text: `${np?.name ?? '?'} prend la tête du parti (${reason}).` })
}

/** Le président choisit un Premier ministre et une coalition de gouvernement. */
export function chooseGovernment(s: GameState, preferParty?: string): { pm: Person; partyIds: string[]; name: string } {
  const parties = Object.values(s.parties).filter((p) => p.active && !p.pseudo)
  const seats = seatMap(s)
  const presParty = s.president.partyId
  // coalition la plus large « acceptable » : on ajoute des partis du plus coopératif au moins coopératif
  const coop = parties.filter((p) => (seats[p.id] ?? 0) > 0).sort((a, b) => a.oppositionStyle - b.oppositionStyle)
  const chosen: Party[] = []
  let total = 0
  const pres = presParty ? s.parties[presParty] : null
  for (const p of coop) {
    if (p.oppositionStyle > 0.72 && total >= 200) break
    if (pres && prox(pres, p) < 0.35 && p.id !== pres.id) continue
    chosen.push(p)
    total += seats[p.id] ?? 0
    if (total >= MAJORITY) break
  }
  const hub = preferParty && s.parties[preferParty] ? s.parties[preferParty] : [...chosen].sort((a, b) => (seats[b.id] ?? 0) - (seats[a.id] ?? 0))[0] ?? pres
  const candidates = Object.values(s.persons).filter((x) => x.active && x.partyId === hub?.id && x.id !== s.president.personId && x.id !== s.assemblyPresidentId)
  const score = (x: Person) => x.pragmatism * 0.4 + x.charisma * 0.25 + x.integrity * 0.15 + x.popularity * 0.2
  const pm = candidates.sort((a, b) => score(b) - score(a))[0] ?? newFictionalPerson(s, hub?.id ?? null, 'Premier ministre')
  const names = chosen.map((c) => c.acronym).join(' + ')
  return { pm, partyIds: chosen.map((c) => c.id), name: `Gouvernement ${pm.name.split(' ').slice(1).join(' ') || pm.name} (${names || 'sans majorité'})` }
}

export function installGovernment(s: GameState, g: { pm: Person; partyIds: string[]; name: string }, why: string) {
  const prev = s.government.pmId ? s.persons[s.government.pmId] : null
  if (prev) prev.role = `Ancien Premier ministre`
  s.government = { pmId: g.pm.id, name: g.name, partyIds: g.partyIds, formed: s.date, stability: 0, cohabitation: false, caretaker: false }
  g.pm.role = 'Premier ministre'
  const seats = govSeats(s)
  s.government.stability = clamp((seats / MAJORITY) * 70, 5, 95)
  const presP = s.president.partyId ? s.parties[s.president.partyId] : null
  const pmParty = g.pm.partyId ? s.parties[g.pm.partyId] : null
  s.government.cohabitation = !!(presP && pmParty && pmParty.id !== presP.id && prox(presP, pmParty) < 0.35)
  const rel = seats >= MAJORITY ? 'dispose d’une majorité absolue' : `ne dispose que de ${seats} députés (majorité absolue : ${MAJORITY})`
  publish(s, {
    type: 'gouvernement',
    title: `${g.pm.name} nommé(e) à Matignon`,
    detail: `${why} ${g.pm.name} forme le ${g.name}. L’exécutif ${rel}.${s.government.cohabitation ? ' Il s’agit d’une cohabitation.' : ''}`,
    partyIds: g.partyIds,
    personIds: [g.pm.id],
    importance: 3,
    tone: 'neutre',
    subject: g.pm.partyId ?? undefined,
  })
}

export function fallOfGovernment(s: GameState, reason: string) {
  const old = s.government.name
  s.government.caretaker = true
  const delay = 3 + Math.floor(rand(s) * 6)
  s.calendar.push({ id: uid(s, 'c'), date: addDays(s.date, delay), kind: 'nomination-pm', title: 'Nomination d’un Premier ministre' })
  publish(s, {
    type: 'crise',
    title: `Chute du ${old}`,
    detail: `${reason} Le gouvernement est démissionnaire et expédie les affaires courantes ; le président de la République consulte pour désigner un nouveau chef de gouvernement.`,
    partyIds: s.government.partyIds,
    importance: 3,
    tone: 'negatif',
    subject: s.president.partyId ?? undefined,
  })
}
