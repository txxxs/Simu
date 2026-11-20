import type { CalendarEvent, GameState } from './types'
import { addDays, toDate, uid } from './util'
import { aiDay, aiMonthly, aiWeekly, RATE } from './ai'
import { dailyDrift, cleanShocks } from './polls'
import { monthlyEconomy } from './economy'
import { lawStage, fileLaw } from './laws'
import { nominatePm, runGenericElection, runLegislative, runPresidential } from './elections'

function processCalendar(s: GameState, c: CalendarEvent) {
  if (c.kind === 'election-legislatives') runLegislative(s, c.title.includes('anticipées') ? 'Élections législatives anticipées' : 'Élections législatives')
  else if (c.kind === 'election-presidentielle') runPresidential(s, 1)
  else if (c.kind === 'election-presidentielle-t2') {
    const pl = c.payload as { a: string; b: string; first: Record<string, number> }
    runPresidential(s, 2, [pl.a, pl.b], pl.first)
  } else if (c.kind.startsWith('election-')) runGenericElection(s, c.kind.replace('election-', ''))
  else if (c.kind === 'nomination-pm') nominatePm(s)
  else if (c.kind === 'loi-etape') lawStage(s, c.payload!.lawId as string, c.payload!.stage as string)
  else if (c.kind === 'budget') {
    fileLaw(s, { title: `projet de loi de finances pour ${toDate(s.date).getUTCFullYear() + 1}`, domain: 'fiscalite', byGov: true })
    s.calendar.push({ id: uid(s, 'c'), date: addDays(s.date, 365), kind: 'budget', title: 'Dépôt du projet de loi de finances' })
  }
}

export function stepDay(s: GameState) {
  s.date = addDays(s.date, 1)
  const due = s.calendar.filter((c) => c.date <= s.date).sort((a, b) => a.date.localeCompare(b.date))
  if (due.length) {
    const ids = new Set(due.map((d) => d.id))
    s.calendar = s.calendar.filter((c) => !ids.has(c.id))
    for (const c of due) processCalendar(s, c)
  }
  dailyDrift(s, RATE[s.config.realism] ** 0.5)
  const d = toDate(s.date)
  if (d.getUTCDate() % 5 === 0) cleanShocks(s)
  aiDay(s)
  if (d.getUTCDay() === 1) aiWeekly(s)
  if (d.getUTCDate() === 1) {
    monthlyEconomy(s, RATE[s.config.realism])
    aiMonthly(s)
  }
}

export function advance(s: GameState, days: number) {
  for (let i = 0; i < days; i++) stepDay(s)
}

/** Avance jusqu'au prochain événement important (flash d'info majeur ou scrutin) — au plus `max` jours. */
export function advanceToNextEvent(s: GameState, max = 400): number {
  const n0 = s.news.length
  for (let i = 1; i <= max; i++) {
    stepDay(s)
    if (s.news.slice(n0).some((n) => n.importance === 3)) return i
  }
  return max
}
