import type { ElectionResult, GameState, Party, Person } from './types'
import { chance, randn, rand } from './rng'
import { addDays, addYears, clamp, fmtDate, largestRemainder, pct, uid } from './util'
import { effectiveSupport, impact, prox, shift } from './polls'
import { MAJORITY, TOTAL_SEATS, allocateSeats, assignDeputies, chooseGovernment, fallOfGovernment, installGovernment, seatMap, setLeader } from './parliament'
import { logChronicle, publish } from './narrate'

export const ELECTION_LABEL: Record<string, string> = {
  legislatives: 'Élections législatives',
  presidentielle: 'Élection présidentielle',
  europeennes: 'Élections européennes',
  municipales: 'Élections municipales',
  regionales: 'Élections régionales',
  departementales: 'Élections départementales',
  senatoriales: 'Élections sénatoriales',
}

export function nextElection(s: GameState, kind?: string) {
  return s.calendar
    .filter((c) => c.kind.startsWith('election-') && (!kind || c.kind === 'election-' + kind) && c.date >= s.date)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

export function scheduleElection(s: GameState, kind: string, date: string, title?: string, replace = true) {
  if (replace) s.calendar = s.calendar.filter((c) => c.kind !== 'election-' + kind)
  s.calendar.push({ id: uid(s, 'c'), date, kind: 'election-' + kind, title: title ?? ELECTION_LABEL[kind] ?? kind })
}

/** Calendrier républicain par défaut à partir de la date de départ. */
export function scheduleDefaults(s: GameState, lastLegislative: string, lastPresidential: string) {
  const d = s.date
  const nextAfter = (anchor: string, step: number) => {
    let a = anchor
    while (a < d) a = addYears(a, step)
    while (addYears(a, -step) >= d) a = addYears(a, -step)
    return a
  }
  scheduleElection(s, 'legislatives', addYears(lastLegislative, 5), 'Élections législatives (fin de législature)')
  scheduleElection(s, 'presidentielle', addDays(addYears(lastPresidential, 5), -14), 'Élection présidentielle — 1er tour')
  scheduleElection(s, 'municipales', nextAfter('2026-03-15', 6))
  scheduleElection(s, 'europeennes', nextAfter('2024-06-09', 5))
  scheduleElection(s, 'regionales', nextAfter('2028-03-12', 6))
  scheduleElection(s, 'departementales', nextAfter('2028-03-12', 6))
  scheduleElection(s, 'senatoriales', nextAfter('2026-09-27', 3))
  const oct = (y: number) => `${y}-10-01`
  let y = Number(d.slice(0, 4))
  if (oct(y) <= d) y++
  s.calendar.push({ id: uid(s, 'c'), date: oct(y), kind: 'budget', title: 'Dépôt du projet de loi de finances' })
}

// ---------- Législatives ----------
export function runLegislative(s: GameState, label = 'Élections législatives') {
  const eff = effectiveSupport(s)
  const before = seatMap(s)
  const shares: Record<string, number> = {}
  let tot = 0
  for (const [id, v] of Object.entries(eff)) {
    shares[id] = v * Math.exp(randn(s) * 0.07)
    tot += shares[id]
  }
  for (const id in shares) shares[id] = Math.round((shares[id] / tot) * 1000) / 10
  const turnout = Math.round(clamp(0.57 + (s.economy.approval < 30 ? 0.03 : 0) + randn(s) * 0.03, 0.42, 0.72) * 1000) / 10
  const seats = allocateSeats(s, shares)
  assignDeputies(s, seats)
  const res: ElectionResult = {
    id: uid(s, 'el'), date: s.date, kind: 'legislatives', title: label, turnout, shares, seats,
    note: `Majorité absolue : ${MAJORITY} sièges.`,
  }
  s.elections.push(res)
  s.lastLegislative = s.date
  // les résultats réalignent durablement l'opinion
  for (const p of Object.values(s.parties)) {
    if (!p.active || p.pseudo) continue
    const gap = (shares[p.id] ?? p.support) - p.support
    shift(s, p.id, gap * 0.6)
  }
  s.shocks = []
  const ranked = Object.entries(seats).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
  const top = ranked[0]
  const lines = ranked.slice(0, 6).map(([id, n]) => `${s.parties[id].acronym} ${n} (${pct(shares[id])} %)`).join(' · ')
  const winnerParty = s.parties[top[0]]
  publish(s, {
    type: 'election', kind: 'result', title: `${label} : ${winnerParty.acronym} arrive en tête avec ${top[1]} sièges`,
    detail: `Participation : ${pct(turnout)} %. Sièges : ${lines}. ${top[1] >= MAJORITY ? `${winnerParty.acronym} obtient la majorité absolue.` : `Aucun parti n’atteint la majorité absolue (${MAJORITY}).`}`,
    partyIds: ranked.slice(0, 3).map(([k]) => k), importance: 3, tone: 'neutre', subject: top[0], reactions: true, editorial: true,
  })
  // conséquences : défaite des partis → démissions de dirigeants ; gouvernement
  for (const [id, n] of Object.entries(seats)) {
    const p = s.parties[id]
    const b = before[id] ?? 0
    if (!p || p.pseudo || !p.leaderId) continue
    const loss = b > 0 ? (b - n) / b : 0
    p.cohesion = clamp(p.cohesion + (n > b ? 6 : -8 * Math.min(1, loss * 2)), 5, 100)
    if (loss > 0.3 && chance(s, 0.4)) leaderResigns(s, p, `après la lourde défaite aux ${label.toLowerCase()}`)
  }
  govAfterElection(s)
  scheduleElection(s, 'legislatives', addYears(s.date, 5), 'Élections législatives (fin de législature)')
  return res
}

export function govAfterElection(s: GameState) {
  const seats = s.government.partyIds.reduce((a, id) => a + (seatMap(s)[id] ?? 0), 0)
  if (seats >= MAJORITY) {
    publish(s, { type: 'gouvernement', title: 'Le Premier ministre est reconduit', detail: `Le gouvernement dispose d’une majorité absolue (${seats} députés) ; le président reconduit le Premier ministre.`, partyIds: s.government.partyIds, importance: 2, tone: 'positif', subject: s.government.partyIds[0] })
    s.government.stability = 80
    return
  }
  fallOfGovernment(s, 'Au lendemain du scrutin, le Premier ministre remet la démission de son gouvernement.')
}

export function leaderResigns(s: GameState, p: Party, why: string, successorId?: string) {
  const old = p.leaderId ? s.persons[p.leaderId] : null
  if (!old) return
  const cands = Object.values(s.persons).filter((x) => x.partyId === p.id && x.active && x.id !== old.id)
  const succ: Person | undefined = (successorId ? s.persons[successorId] : undefined) ?? cands.sort((a, b) => b.ambition * 0.5 + b.popularity * 0.5 - (a.ambition * 0.5 + a.popularity * 0.5))[0]
  if (!succ) {
    publish(s, { type: 'direction', title: `${p.acronym} : ${old.name} quitte la direction`, detail: `${old.name} démissionne ${why}. Une direction collégiale assure l’intérim.`, partyIds: [p.id], personIds: [old.id], importance: 2, tone: 'negatif', subject: p.id })
    return
  }
  setLeader(s, p.id, succ.id, why)
  p.cohesion = clamp(p.cohesion + 4, 5, 100)
  publish(s, { type: 'direction', title: `${p.acronym} : ${succ.name} succède à ${old.name}`, detail: `${old.name} quitte la présidence de ${p.name} ${why}. ${succ.name} prend la tête du parti.`, partyIds: [p.id], personIds: [old.id, succ.id], importance: 2, tone: 'neutre', subject: p.id })
}

// ---------- Présidentielle ----------
interface Cand { person: Person; party: Party; score: number; share: number }

export function runPresidential(s: GameState, round = 1, finalists?: [string, string], firstShares?: Record<string, number>) {
  if (round === 2 && finalists) return presidentialSecondRound(s, finalists, firstShares!)
  const eff = effectiveSupport(s)
  const inAlliance = new Map<string, string>()
  for (const al of s.alliances) if (!al.dissolved && al.purpose === 'electoral' && al.partyIds.length >= 2) al.partyIds.forEach((id) => inAlliance.set(id, al.id))
  const cands: Cand[] = []
  const done = new Set<string>()
  for (const p of Object.values(s.parties)) {
    if (!p.active || p.pseudo || p.regional) continue
    const al = inAlliance.get(p.id)
    let group = [p]
    if (al) {
      if (done.has(al)) continue
      done.add(al)
      group = Object.values(s.parties).filter((x) => inAlliance.get(x.id) === al && x.active)
    }
    const support = group.reduce((a, x) => a + (eff[x.id] ?? 0), 0)
    if (support < 1.8) continue
    const head = [...group].sort((a, b) => (eff[b.id] ?? 0) - (eff[a.id] ?? 0))[0]
    let person = head.leaderId ? s.persons[head.leaderId] : undefined
    const rivals = Object.values(s.persons).filter((x) => x.partyId === head.id && x.active && x.id !== head.leaderId)
    const rival = rivals.sort((a, b) => b.ambition - a.ambition)[0]
    if (person && rival && person.popularity < 24 && rival.ambition > 75 && chance(s, 0.4)) person = rival
    if (!person) person = rival
    if (!person) continue
    const score = Math.max(0.3, support * (1 + (person.popularity - 30) / 90 + (person.charisma - 60) / 250 + (person.mediaSkill - 60) / 400)) * Math.exp(randn(s) * 0.1)
    cands.push({ person, party: head, score, share: 0 })
  }
  const tot = cands.reduce((a, c) => a + c.score, 0)
  const tenths = largestRemainder(cands.map((c) => c.score), 1000)
  cands.forEach((c, i) => (c.share = tenths[i] / 10))
  cands.sort((a, b) => b.share - a.share)
  const shares: Record<string, number> = {}
  cands.forEach((c) => (shares[c.party.id] = c.share))
  void tot
  const turnout = Math.round(clamp(0.72 + randn(s) * 0.03, 0.6, 0.82) * 1000) / 10
  const [A, B] = cands
  const lines = cands.slice(0, 6).map((c) => `${c.person.name} (${c.party.acronym}) ${pct(c.share)} %`).join(' · ')
  s.elections.push({ id: uid(s, 'el'), date: s.date, kind: 'presidentielle', title: 'Présidentielle — 1er tour', turnout, shares, rounds: [{ label: '1er tour', shares }], note: 'Premier tour', winner: undefined })
  publish(s, {
    type: 'election', kind: 'result', title: `Présidentielle, 1er tour : ${A.person.name} et ${B.person.name} qualifiés`,
    detail: `Participation : ${pct(turnout)} %. ${lines}. Le second tour opposera ${A.person.name} (${A.party.acronym}) à ${B.person.name} (${B.party.acronym}).`,
    partyIds: [A.party.id, B.party.id], personIds: [A.person.id, B.person.id], importance: 3, tone: 'neutre', subject: A.party.id,
  })
  s.calendar = s.calendar.filter((c) => c.kind !== 'election-presidentielle-t2')
  s.calendar.push({ id: uid(s, 'c'), date: addDays(s.date, 14), kind: 'election-presidentielle-t2', title: 'Élection présidentielle — 2nd tour', payload: { a: A.party.id, b: B.party.id, pa: A.person.id, pb: B.person.id, first: shares } })
  return { A, B }
}

function presidentialSecondRound(s: GameState, [aId, bId]: [string, string], first: Record<string, number>) {
  const A = s.parties[aId]
  const B = s.parties[bId]
  const w = (from: Party, to: Party) => Math.pow(prox(from, to), 1.4) * (1 - 0.55 * to.rejection)
  let va = first[aId] * 0.97
  let vb = first[bId] * 0.97
  for (const [id, sh] of Object.entries(first)) {
    if (id === aId || id === bId) continue
    const from = s.parties[id]
    if (!from) continue
    const wa = w(from, A)
    const wb = w(from, B)
    const abst = clamp(0.22 + 0.25 * (1 - Math.max(wa, wb)), 0.1, 0.6)
    const t = (1 - abst) * sh
    va += (t * wa) / (wa + wb + 1e-9)
    vb += (t * wb) / (wa + wb + 1e-9)
  }
  va += randn(s) * 1.6
  const pa = (va / (va + vb)) * 100
  const winnerId = pa > 50 ? aId : bId
  const winner = s.parties[winnerId]
  const wPerson = Object.values(s.persons).find((p) => p.id === (winnerId === aId ? s.calendar.find((c) => c.kind === 'election-presidentielle-t2')?.payload?.pa : s.calendar.find((c) => c.kind === 'election-presidentielle-t2')?.payload?.pb)) ?? (winner.leaderId ? s.persons[winner.leaderId] : undefined)
  const person = wPerson ?? s.persons[winner.leaderId ?? '']
  const wScore = Math.round((winnerId === aId ? pa : 100 - pa) * 10) / 10
  const turnout = Math.round(clamp(0.71 + randn(s) * 0.03, 0.58, 0.8) * 1000) / 10
  const first1 = s.elections[s.elections.length - 1]
  first1.rounds!.push({ label: '2nd tour', shares: { [aId]: Math.round(pa * 10) / 10, [bId]: Math.round((100 - pa) * 10) / 10 } })
  first1.winner = person?.id
  first1.title = 'Élection présidentielle'
  first1.note = `Élu(e) : ${person?.name ?? winner.acronym} avec ${pct(wScore)} %.`
  const prev = s.president.personId ? s.persons[s.president.personId] : null
  if (prev) prev.role = `Ancien président de la République`
  if (person) {
    s.president = { personId: person.id, partyId: winnerId, since: s.date, interim: false }
    person.role = 'Président de la République'
  }
  impact(s, winnerId, 3, { durable: 0.3, halfLife: 45, reason: 'Élection présidentielle' })
  publish(s, {
    type: 'election', kind: 'result', title: `${person?.name ?? winner.acronym} élu(e) président(e) de la République avec ${pct(wScore)} %`,
    detail: `Au second tour, ${person?.name} (${winner.acronym}) l’emporte face à ${winnerId === aId ? B.acronym : A.acronym}. Participation : ${pct(turnout)} %. Investiture dans les prochains jours.`,
    partyIds: [aId, bId], personIds: person ? [person.id] : [], importance: 3, tone: 'neutre', subject: winnerId,
  })
  s.government.caretaker = true
  s.calendar.push({ id: uid(s, 'c'), date: addDays(s.date, 10), kind: 'nomination-pm', title: 'Nomination du Premier ministre' })
  s.calendar = s.calendar.filter((c) => c.kind !== 'election-presidentielle-t2')
  scheduleElection(s, 'presidentielle', addDays(addYears(s.date, 5), -14), 'Élection présidentielle — 1er tour')
}

// ---------- Autres scrutins ----------
export function runGenericElection(s: GameState, kind: string) {
  const eff = effectiveSupport(s)
  const shares: Record<string, number> = {}
  let t = 0
  for (const [id, v] of Object.entries(eff)) {
    const p = s.parties[id]
    // scrutins locaux : prime aux partis implantés ; européennes : prime protestataire
    const local = kind === 'europeennes' ? 1 + (p.rejection > 0.4 ? 0.08 : 0) : 1 + (p.territorial - 50) / 250
    shares[id] = v * local * Math.exp(randn(s) * 0.08)
    t += shares[id]
  }
  for (const id in shares) shares[id] = Math.round((shares[id] / t) * 1000) / 10
  const turnout = kind === 'europeennes' ? 51 + randn(s) * 3 : kind === 'municipales' ? 55 + randn(s) * 4 : kind === 'senatoriales' ? 98 : 40 + randn(s) * 4
  const title = ELECTION_LABEL[kind] ?? kind
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1])
  const el: ElectionResult = { id: uid(s, 'el'), date: s.date, kind, title, turnout: Math.round(turnout * 10) / 10, shares, note: '' }
  if (kind === 'senatoriales') {
    const old = s.senate
    const ids = Object.keys(old)
    const target = largestRemainder(ids.map((id) => (s.parties[id] ? Math.pow(shares[id] ?? 1, 0.6) * (s.parties[id].territorial / 60) : 1) * 10), 348)
    const next = largestRemainder(ids.map((id, i) => old[id] * 0.7 + target[i] * 0.3), 348)
    ids.forEach((id, i) => (s.senate[id] = next[i]))
    el.seats = { ...s.senate }
    el.note = 'Renouvellement partiel du Sénat (grands électeurs).'
    const best = ids.map((id, i) => ({ id, d: next[i] - old[id] })).sort((a, b) => b.d - a.d)[0]
    publish(s, { type: 'election', kind: 'result', title: 'Sénatoriales : la droite conserve la majorité du Sénat', detail: `Le renouvellement partiel modifie légèrement les équilibres (${s.parties[best.id]?.acronym ?? best.id} ${best.d >= 0 ? '+' : ''}${best.d} sièges).`, partyIds: [best.id], importance: 2, tone: 'neutre' })
  } else {
    for (const p of Object.values(s.parties)) if (p.active && !p.pseudo) shift(s, p.id, ((shares[p.id] ?? 0) - p.support) * 0.12)
    const lines = ranked.slice(0, 5).map(([id, v]) => `${s.parties[id].acronym} ${pct(v)} %`).join(' · ')
    publish(s, { type: 'election', kind: 'result', title: `${title} : ${s.parties[ranked[0][0]].acronym} arrive en tête`, detail: `Participation : ${pct(el.turnout)} %. ${lines}. Le gouvernement ${s.government.partyIds.includes(ranked[0][0]) ? 'savoure un succès' : 'encaisse un revers'}.`, partyIds: ranked.slice(0, 3).map(([k]) => k), importance: 3, tone: 'neutre', subject: ranked[0][0] })
  }
  s.elections.push(el)
  const step: Record<string, number> = { europeennes: 5, municipales: 6, regionales: 6, departementales: 6, senatoriales: 3 }
  scheduleElection(s, kind, addYears(s.date, step[kind] ?? 5))
  return el
}

export function dissolveAssembly(s: GameState, inDays = 30, by = 'le président de la République') {
  const d = clamp(inDays, 20, 40)
  const date = addDays(s.date, d)
  s.lastDissolution = s.date
  scheduleElection(s, 'legislatives', date, 'Élections législatives anticipées')
  publish(s, {
    type: 'institution', title: 'Dissolution de l’Assemblée nationale',
    detail: `${by[0].toUpperCase() + by.slice(1)} prononce la dissolution de l’Assemblée nationale. Les élections législatives auront lieu le ${fmtDate(date)} (délai constitutionnel de 20 à 40 jours).`,
    partyIds: [s.president.partyId ?? ''].filter(Boolean), importance: 3, tone: 'neutre', subject: s.president.partyId ?? undefined,
  })
  s.institutional.push({ date: s.date, text: `Dissolution de l’Assemblée nationale ; législatives le ${fmtDate(date)}.` })
  return date
}

export function nominatePm(s: GameState) {
  const g = chooseGovernment(s)
  installGovernment(s, g, 'Après consultations, le président de la République nomme un nouveau Premier ministre.')
  s.government.caretaker = false
}

export { fallOfGovernment, TOTAL_SEATS }
void rand
