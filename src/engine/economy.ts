import type { GameState } from './types'
import { randn } from './rng'
import { clamp, daysBetween } from './util'
import { govSeats } from './parliament'

/** Mise à jour mensuelle : les indicateurs évoluent progressivement (aucun « miracle » sans cause). */
export function monthlyEconomy(s: GameState, rate = 1) {
  const e = s.economy
  const ongoing = s.crises.filter((c) => c.ongoing)
  const crisisDrag = ongoing.reduce((a, c) => a + c.severity * 0.12, 0)
  e.growth = clamp(e.growth * 0.9 + 1.2 * 0.1 + randn(s) * 0.12 * rate - crisisDrag * 0.15, -6, 5)
  // loi d'Okun simplifiée : le chômage réagit lentement à la croissance
  e.unemployment = clamp(e.unemployment - (e.growth - 1.0) * 0.03 + randn(s) * 0.03 + crisisDrag * 0.02, 3, 20)
  e.inflation = clamp(e.inflation * 0.93 + 2.0 * 0.07 + randn(s) * 0.1 * rate + crisisDrag * 0.05, -1, 15)
  e.deficit = clamp(e.deficit + (e.growth < 0.5 ? 0.03 : -0.015) + randn(s) * 0.02 + crisisDrag * 0.02, 0, 12)
  e.debt = clamp(e.debt + (e.deficit - e.growth - 0.5 * e.inflation * 0.1) / 12, 40, 250)
  e.purchasing = clamp(e.purchasing * (1 + (e.growth * 0.3 - e.inflation * 0.4 + 0.2) / 1200), 70, 140)
  e.insecurity = clamp(e.insecurity + randn(s) * 0.4 + crisisDrag * 0.1 - 0.02, 0, 100)
  e.inequality = clamp(e.inequality + randn(s) * 0.15 + (e.unemployment - 7) * 0.03, 0, 100)
  e.publicServices = clamp(e.publicServices + randn(s) * 0.2 - (e.deficit - 5) * 0.03, 0, 100)
  // popularité de l'exécutif : composite lent
  const target =
    50 - (e.unemployment - 6.5) * 2.2 - (e.inflation - 2) * 2.0 + (e.growth - 1) * 2.5 + (e.purchasing - 100) * 0.4 - (e.insecurity - 50) * 0.15 - crisisDrag * 3 - (s.government.caretaker ? 3 : 0) + (s.government.stability - 50) * 0.1
  e.approval = clamp(e.approval + (target - e.approval) * 0.06 + randn(s) * 0.5 * rate, 8, 75)
  e.series.push({ date: s.date, growth: round2(e.growth), unemployment: round2(e.unemployment), inflation: round2(e.inflation), approval: round2(e.approval), debt: round2(e.debt) })
  if (e.series.length > 240) e.series.splice(0, e.series.length - 240)
  // fin des crises
  for (const c of s.crises) if (c.ongoing && daysBetween(c.start, s.date) > 40 + c.severity * 25) c.ongoing = false
  void govSeats
}
const round2 = (x: number) => Math.round(x * 100) / 100
