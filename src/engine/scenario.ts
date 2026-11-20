import type { GameState, Person, StartConfig } from './types'
import { buildBase, type BaseYear } from './data/france'
import { between, chance, pick, randn, rand } from './rng'
import { addYears, clamp, fmtDate, uid, yearOf } from './util'
import { backfillPolls, conductPoll, renorm } from './polls'
import { assignDeputies, allocateSeats, chooseGovernment, newFictionalPerson, seatMap } from './parliament'
import { initRelations, createParty } from './actions'
import { scheduleDefaults } from './elections'
import { addNews, logChronicle } from './narrate'
import { effectiveSupport } from './polls'
import { randomPartyName } from './names'
import { prox } from './polls'

export const SAVE_VERSION = 1
export const SEAT_TOTAL = 577

export function normalizeConfig(c: Partial<StartConfig>): StartConfig {
  return {
    year: clamp(Math.round(c.year ?? 2024), 1958, 2100),
    mode: c.mode ?? 'reel',
    realism: c.realism ?? 'plausible',
    name: (c.name ?? '').trim() || 'Ma partie',
    seed: Math.round(c.seed ?? Math.floor(Math.random() * 1e9)),
  }
}

export function baseFor(year: number): BaseYear {
  return year <= 2023 ? 2022 : 2024
}

export function createGame(input: Partial<StartConfig>): GameState {
  const cfg = normalizeConfig(input)
  const base = baseFor(cfg.year)
  const b = buildBase(base)
  const exact = cfg.year === yearOf(b.date)
  const date = exact ? b.date : `${cfg.year}-01-15`

  const s: GameState = {
    version: SAVE_VERSION,
    config: cfg,
    date,
    rng: cfg.seed | 0,
    counter: 0,
    baseNote: '',
    president: { personId: b.presidentId, partyId: 'ren', since: b.lastPresidential, interim: false },
    assemblyPresidentId: b.assemblyPresidentId,
    government: { pmId: b.pmId, name: b.govName, partyIds: b.govParties, formed: b.date, stability: 60, cohabitation: false, caretaker: b.caretaker && exact },
    parties: Object.fromEntries(b.parties.map((p) => [p.id, p])),
    persons: Object.fromEntries(b.persons.map((p) => [p.id, p])),
    alliances: b.alliances.map((a) => ({ ...a, formed: b.date, history: [{ date: b.date, text: 'Alliance en vigueur au début de la partie.' }] })),
    deputies: [],
    senate: { ...b.senate },
    lastLegislative: b.lastLegislative,
    lastDissolution: null,
    shocks: [],
    polls: [],
    news: [],
    chronicle: [],
    calendar: [],
    elections: [],
    laws: [],
    crises: [],
    economy: { ...b.economy, series: [] },
    institutional: [],
    narratorLog: [],
    settings: { pollSample: 1200, pollEveryDays: 14 },
  }

  // dates : on translate les échéances institutionnelles selon l'année choisie
  let lastLeg = b.lastLegislative
  while (addYears(lastLeg, 5) <= date) lastLeg = addYears(lastLeg, 5)
  while (lastLeg > date) lastLeg = addYears(lastLeg, -5)
  let lastPres = b.lastPresidential
  while (addYears(lastPres, 5) <= date) lastPres = addYears(lastPres, 5)
  while (lastPres > date) lastPres = addYears(lastPres, -5)
  s.lastLegislative = lastLeg
  s.president.since = lastPres
  const shiftYears = cfg.year - yearOf(b.date)
  Object.values(s.persons).forEach((p) => (p.age = Math.max(25, p.age + (exact ? 0 : shiftYears))))
  Object.values(s.parties).forEach((p) => {
    if (p.nextCongress < date) p.nextCongress = fmtIso(date, Math.round(between(s, 60, 900)))
  })

  // relations entre partis et personnalités
  Object.values(s.parties).forEach((p) => initRelations(s, p))
  for (const a of s.alliances) for (const x of a.partyIds) for (const y of a.partyIds) if (x !== y) s.parties[x].relations[y] = Math.max(s.parties[x].relations[y] ?? 0, 35)
  s.parties.rn.relations.lfi = -75
  s.parties.lfi.relations.rn = -80
  const per = Object.values(s.persons)
  for (const a of per) for (const c of per) if (a.id !== c.id) {
    const pa = a.partyId ? s.parties[a.partyId] : null
    const pc = c.partyId ? s.parties[c.partyId] : null
    const base2 = pa && pc ? (pa.relations[pc.id] ?? (pa.id === pc.id ? 15 : 0)) * 0.6 : 0
    a.relations[c.id] = clamp(Math.round(base2 + (pa && pc && pa.id === pc.id ? -15 : 0) + between(s, -10, 10)), -95, 95)
  }

  // sièges
  let seats = { ...b.seats }
  if (cfg.mode === 'alternatif') mutateAlternative(s, cfg)
  if (cfg.mode === 'alternatif') {
    const shares: Record<string, number> = {}
    const eff = effectiveSupport(s)
    for (const [k, v] of Object.entries(eff)) shares[k] = v
    seats = allocateSeats(s, shares, 0.1)
  }
  assignDeputies(s, seats)

  // président et gouvernement (alternatif libre : peut changer)
  s.government.stability = clamp((govSeatsOf(s) / 289) * 70, 5, 95)
  if (cfg.mode === 'alternatif') settleAlternativeExecutive(s, cfg)

  // économie : historique plat avec bruit
  const e = s.economy
  for (let i = 12; i >= 1; i--) e.series.push({ date: fmtIso(date, -i * 30), growth: round2(e.growth + randn(s) * 0.15), unemployment: round2(e.unemployment + randn(s) * 0.1), inflation: round2(e.inflation + randn(s) * 0.15), approval: round2(e.approval + randn(s) * 1.2), debt: round2(e.debt - i * 0.1) })

  scheduleDefaults(s, s.lastLegislative, lastPres)
  if (b.caretaker && exact) s.calendar.push({ id: uid(s, 'c'), date: fmtIso(date, 48), kind: 'nomination-pm', title: 'Nomination d’un Premier ministre' })

  backfillPolls(s, 10)
  conductPoll(s)
  s.baseNote = exact ? b.note : `${b.note} Le contexte de ${yearOf(b.date)} est transposé en ${cfg.year} : approximation assumée (pas de reconstitution historique détaillée pour cette année).`
  const modeTxt = cfg.mode === 'reel' ? 'France réelle (approximative)' : 'France alternative'
  logChronicle(s, 'debut', `Début de la partie « ${cfg.name} »`, `${modeTxt}, ${fmtDate(date)}. Réalisme : ${cfg.realism}. ${s.baseNote}`)
  addNews(s, { kind: 'article', outlet: 'Info 24', importance: 3, title: `${fmtDate(date)} — la situation politique`, body: briefing(s), source: 'moteur' })
  return s
}

function round2(x: number) { return Math.round(x * 100) / 100 }
function fmtIso(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function govSeatsOf(s: GameState) {
  const m = seatMap(s)
  return s.government.partyIds.reduce((a, id) => a + (m[id] ?? 0), 0)
}

function briefing(s: GameState) {
  const m = seatMap(s)
  const groups = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${s.parties[id].acronym} ${n}`).join(', ')
  const pm = s.government.pmId ? s.persons[s.government.pmId] : null
  const pres = s.president.personId ? s.persons[s.president.personId] : null
  return `Le président de la République est ${pres?.name ?? '—'}. ${pm?.name ?? '—'} dirige le ${s.government.name.replace(/^Gouvernement /, 'gouvernement ')}. Assemblée nationale (577 sièges) : ${groups}. Majorité absolue : 289. ${s.baseNote}`
}

/** France alternative : perturbe les rapports de force et les dirigeants selon le niveau de réalisme. */
function mutateAlternative(s: GameState, cfg: StartConfig) {
  const sigma = { fidele: 0.15, plausible: 0.32, libre: 0.6 }[cfg.realism]
  const pSwap = { fidele: 0.15, plausible: 0.35, libre: 0.65 }[cfg.realism]
  for (const p of Object.values(s.parties)) p.support = Math.max(0.3, p.support * Math.exp(randn(s) * sigma))
  renorm(s)
  // changements de dirigeants
  for (const p of Object.values(s.parties)) {
    if (p.pseudo || !p.leaderId || !chance(s, pSwap)) continue
    const cands = Object.values(s.persons).filter((x) => x.partyId === p.id && x.active && x.id !== p.leaderId)
    let succ: Person | undefined = cands.sort((a, b) => b.ambition - a.ambition)[0]
    if (!succ) { succ = newFictionalPerson(s, p.id, `Président(e) de ${p.acronym}`); succ.ambition = 75 }
    const old = s.persons[p.leaderId]
    old.role = `Ancien dirigeant de ${p.acronym}`
    p.leaderId = succ.id
    succ.role = `Dirigeant de ${p.acronym}`
    p.history.push({ date: s.date, text: `${succ.name} dirige le parti (histoire alternative).` })
  }
  // nouveaux mouvements
  const nNew = { fidele: 0, plausible: 1, libre: 2 }[cfg.realism]
  for (let i = 0; i < nNew; i++) {
    const fam = pick(s, ['gauche', 'centre', 'droite', 'ecologiste', 'extreme-droite'] as const)
    const g = randomPartyName(s, fam, new Set(Object.values(s.parties).map((x) => x.name)))
    createParty(s, { name: g.name, acronym: g.acronym, family: fam, supportShare: between(s, 2, 5) })
  }
  void prox
}

function settleAlternativeExecutive(s: GameState, cfg: StartConfig) {
  if (cfg.realism === 'libre' && chance(s, 0.6)) {
    const cands = Object.values(s.parties).filter((p) => p.active && !p.pseudo && p.leaderId && !p.family.startsWith('extreme') && p.family !== 'regionaliste').sort((a, b) => b.support - a.support)
    const winner = cands[0]
    if (winner?.leaderId) {
      const old = s.president.personId ? s.persons[s.president.personId] : null
      if (old) old.role = 'Ancien président de la République'
      s.president = { personId: winner.leaderId, partyId: winner.id, since: s.president.since, interim: false }
      s.persons[winner.leaderId].role = 'Président de la République'
    }
  }
  if (cfg.realism !== 'fidele') {
    const g = chooseGovernment(s)
    const prev = s.government.pmId ? s.persons[s.government.pmId] : null
    if (prev && prev.id !== g.pm.id) prev.role = 'Ancien Premier ministre'
    g.pm.role = 'Premier ministre'
    s.government = { pmId: g.pm.id, name: g.name, partyIds: g.partyIds, formed: s.date, stability: clamp((govSeatsOf(s) / 289) * 70, 5, 95), cohabitation: false, caretaker: false }
  }
}

void rand
