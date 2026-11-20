// Autonomie des partis, dirigeants, médias et événements : exécutée à chaque jour simulé.
import type { GameState, Party, Realism } from './types'
import { between, chance, pick, rand, randn, shuffle, weightedPick } from './rng'
import { addDays, clamp, daysBetween, yearOf } from './util'
import { MAJORITY, censureVote, fallOfGovernment, govSeats, seatMap } from './parliament'
import { adjustRelation, allianceOf, announceAlliance, breakAlliance, createAlliance, crisis, holdCongress, joinAlliance, mergeParties, newMovement, proposeAlliance, protest, publishPoll, scandal, splitParty } from './actions'
import { fileLaw, DOMAINS } from './laws'
import { prox } from './polls'
import { dissolveAssembly, leaderResigns, nextElection } from './elections'
import { publish } from './narrate'
import type { LawDomain } from './types'

export const RATE: Record<Realism, number> = { fidele: 0.65, plausible: 1, libre: 1.8 }

export function aiDay(s: GameState) {
  const rate = RATE[s.config.realism]
  const unpop = clamp((45 - s.economy.approval) / 45, 0, 1)
  const parties = shuffle(s, Object.values(s.parties).filter((p) => p.active && !p.pseudo))
  const upcoming = nextElection(s)
  const daysToElection = upcoming ? daysBetween(s.date, upcoming.date) : 999

  for (const p of parties) {
    // 1) congrès
    if (s.date >= p.nextCongress) holdCongress(s, p)
    // 2) cohésion : lente dérive vers la normale, aggravée par l'impopularité
    const inGov = s.government.partyIds.includes(p.id)
    p.cohesion = clamp(p.cohesion + (60 - p.cohesion) * 0.002 + randn(s) * 0.25 - (inGov ? unpop * 0.12 : 0), 3, 100)
    // 3) scission
    if (p.cohesion < 32 && (p.members > 4000 || p.support > 2) && chance(s, 0.0016 * rate * ((36 - p.cohesion) / 10))) splitParty(s, p.id)
    // 4) défi de leadership
    const leader = p.leaderId ? s.persons[p.leaderId] : null
    if (leader && leader.popularity < 22 && p.cohesion < 45 && chance(s, 0.0009 * rate)) {
      const rival = Object.values(s.persons).filter((x) => x.partyId === p.id && x.active && x.id !== leader.id).sort((a, b) => b.ambition - a.ambition)[0]
      if (rival && rival.ambition > 62) leaderResigns(s, p, 'après une fronde interne', rival.id)
    }
    // 5) propositions de loi de l'opposition
    if (!inGov && p.support > 3 && chance(s, 0.0016 * rate)) {
      const dom = pick(s, Object.keys(DOMAINS).filter((d) => d !== 'autre') as LawDomain[])
      fileLaw(s, { byGov: false, partyId: p.id, domain: dom })
    }
  }

  // 6) alliances : fréquentes à l'approche d'un scrutin
  const allianceRate = daysToElection < 150 ? 0.05 : 0.007
  if (chance(s, allianceRate * rate)) {
    const cand = parties.filter((p) => p.support > 1.2 && p.leaderId)
    if (cand.length >= 2) {
      const [a, b] = [cand[0], cand[1]]
      const aa = allianceOf(s, a.id)
      const ab = allianceOf(s, b.id)
      if (!(aa && aa === ab) && prox(a, b) > 0.4) {
        const r = proposeAlliance(s, a, b)
        if (r.ok) {
          if (aa && !ab && aa.partyIds.length < 4 && aa.partyIds.every((x) => prox(s.parties[x], b) > 0.2)) { joinAlliance(s, aa.id, b.id); announceAlliance(s, aa) }
          else if (ab && !aa && ab.partyIds.length < 4 && ab.partyIds.every((x) => prox(s.parties[x], a) > 0.2)) { joinAlliance(s, ab.id, a.id); announceAlliance(s, ab) }
          else if (!aa && !ab) announceAlliance(s, createAlliance(s, [a.id, b.id]))
        } else if (chance(s, 0.2) && daysToElection < 200) {
          publish(s, { type: 'alliance', title: `${a.acronym} et ${b.acronym} échouent à s’entendre`, detail: `Les discussions entre ${a.name} et ${b.name} ont achoppé : ${r.why}. Chaque camp se renvoie la responsabilité.`, partyIds: [a.id, b.id], importance: 1, tone: 'negatif', subject: a.id, reactions: false })
          adjustRelation(s, a.id, b.id, -5)
        }
      }
    }
  }
  // rupture d'alliance
  for (const al of s.alliances) {
    if (al.dissolved || al.partyIds.length < 2) continue
    const ps = al.partyIds.map((i) => s.parties[i]).filter(Boolean)
    let tot = 0
    let n = 0
    for (const x of ps) for (const y of ps) if (x !== y) { tot += x.relations[y.id] ?? 0; n++ }
    const avg = n ? tot / n : 0
    if (avg < 25 && chance(s, 0.0007 * rate * (1 + (25 - avg) / 30))) {
      const leaver = ps.sort((a, b) => (a.cohesion - b.cohesion) || (b.rejection - a.rejection))[0]
      breakAlliance(s, al, leaver.id, pick(s, ['des désaccords sur la ligne politique', 'un manque de considération de ses partenaires', 'une divergence stratégique sur les investitures']))
    } else if (avg < 40) for (const x of ps) for (const y of ps) if (x !== y && chance(s, 0.0004)) adjustRelation(s, x.id, y.id, -2)
  }

  // 7) fusion de petits partis proches
  if (chance(s, 0.0003 * rate)) {
    const small = parties.filter((p) => (!p.real && p.support < 3.5) || (p.support < 2 && p.members < 15000))
    for (const a of small) for (const b of small) if (a.id < b.id && prox(a, b) > 0.75 && (a.relations[b.id] ?? 0) > 40) { mergeParties(s, a.id, b.id); break }
  }

  // 8) événements nationaux
  if (chance(s, 0.0055 * rate * (1 + unpop + (s.economy.unemployment - 7) / 8))) protest(s, {})
  if (chance(s, 0.0042 * rate)) scandal(s, { personId: pick(s, Object.values(s.persons).filter((x) => x.active && x.partyId).map((x) => x.id)) })
  if (chance(s, 0.0015 * rate)) crisis(s, {})
  if (unpop > 0.3 && chance(s, 0.00025 * rate)) newMovement(s, 'Dans un climat de défiance envers les partis installés,')

  // 9) gouvernement : motions de censure spontanées
  if (!s.government.caretaker && govSeats(s) < MAJORITY && chance(s, 0.0016 * rate * (1 + unpop * 1.5))) {
    const opp = Object.values(s.parties).filter((p) => p.active && !p.pseudo && !s.government.partyIds.includes(p.id) && (seatMap(s)[p.id] ?? 0) > 20)
    const author = opp.length ? weightedPick(s, opp, opp.map((o) => o.oppositionStyle * seatMap(s)[o.id])) : undefined
    if (author) {
      const c = censureVote(s, author.id)
      if (c.passes) {
        publish(s, { type: 'censure', title: `Le gouvernement renversé par une motion de censure (${c.yes} voix)`, detail: `Déposée par ${author.name}, la motion de censure recueille ${c.yes} voix (majorité requise : ${MAJORITY}).`, partyIds: Object.keys(c.byParty), importance: 3, tone: 'negatif', subject: s.government.partyIds[0] })
        fallOfGovernment(s, 'Le gouvernement est renversé.')
      } else {
        publish(s, { type: 'censure', title: `Motion de censure de ${author.acronym} : ${c.yes} voix, il en manquait ${MAJORITY - c.yes}`, detail: `Le gouvernement survit à la motion déposée par ${author.name}, faute d’une alliance suffisante des oppositions.`, partyIds: [author.id], importance: 2, tone: 'positif', subject: s.government.partyIds[0] })
        s.government.stability = clamp(s.government.stability + 3, 3, 100)
      }
    }
  }

  // 10) dissolution décidée par le président (jamais dans les 12 mois suivant des élections)
  const sinceElect = daysBetween(s.lastLegislative, s.date)
  if (!s.government.caretaker && sinceElect > 400 && daysToElection > 90 && govSeats(s) < 200 && chance(s, 0.0004 * rate * (1 + unpop))) {
    dissolveAssembly(s, 30 + Math.floor(rand(s) * 10))
  }
  void yearOf; void between; void addDays
}

/** Tâches hebdomadaires / mensuelles (sondages, indicateurs, partis). */
export function aiWeekly(s: GameState) {
  const nxt = nextElection(s)
  const campaign = nxt && daysBetween(s.date, nxt.date) < 60
  const every = campaign ? Math.max(3, Math.floor(s.settings.pollEveryDays / 2)) : s.settings.pollEveryDays
  const last = s.polls.length ? s.polls[s.polls.length - 1].date : '1900-01-01'
  if (daysBetween(last, s.date) >= every) publishPoll(s)
  for (const p of Object.values(s.persons)) {
    if (!p.active) continue
    const base = p.partyId && s.parties[p.partyId] ? 18 + s.parties[p.partyId].support * 0.9 + (p.charisma - 50) * 0.2 : 15
    p.popularity = clamp(p.popularity + (base - p.popularity) * 0.03 + randn(s) * 0.8, 2, 90)
  }
}

export function aiMonthly(s: GameState) {
  for (const p of Object.values(s.parties)) {
    if (!p.active || p.pseudo) continue
    p.members = Math.max(100, Math.round(p.members * (1 + (p.support - 5) * 0.0004 + randn(s) * 0.003)))
    p.budget = Math.max(0.1, Math.round((p.budget * (1 + randn(s) * 0.01)) * 100) / 100)
    for (const q of Object.keys(p.relations)) {
      const o = s.parties[q]
      if (!o) { delete p.relations[q]; continue }
      const baseline = (prox(p, o) - 0.4) * 100
      p.relations[q] = clamp(p.relations[q] + (baseline - p.relations[q]) * 0.02 + randn(s) * 0.6, -100, 100)
    }
  }
}
export type { Party }
