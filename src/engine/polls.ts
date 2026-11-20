import type { GameState, Party, Poll, PollResultRow } from './types'
import { randn } from './rng'
import { addDays, clamp, daysBetween, hash, largestRemainder, pct, signed, uid } from './util'

export const INSTITUTES = ['Institut Méridien', 'Odéon Opinion', 'Baromètre Civitas', 'Panel Républica']
export const POLL_DISCLAIMER = 'Sondage fictif généré par le simulateur — aucun lien avec un institut réel.'
const DEFF = 1.3 // effet de plan de sondage (quotas)

export const activeParties = (s: GameState): Party[] => Object.values(s.parties).filter((p) => p.active)

/** Proximité idéologique entre deux partis (0..1). */
export function prox(a: { lr: number; cult: number }, b: { lr: number; cult: number }) {
  const d2 = (a.lr - b.lr) ** 2 + (0.6 * (a.cult - b.cult)) ** 2
  return Math.exp(-d2 / (2 * 0.45 ** 2))
}

export function renorm(s: GameState) {
  const act = activeParties(s)
  const tot = act.reduce((a, p) => a + p.support, 0)
  if (tot <= 0) return
  act.forEach((p) => (p.support = (p.support / tot) * 100))
}

/** Modification DURABLE d'une intention de vote : les points gagnés sont pris en priorité aux voisins idéologiques. */
export function shift(s: GameState, id: string, delta: number) {
  const p = s.parties[id]
  if (!p || !p.active || delta === 0) return
  const others = activeParties(s).filter((o) => o.id !== id)
  if (!others.length) return
  const w = others.map((o) => prox(p, o) * Math.max(o.support, 0.2) + 0.01 * o.support)
  const sw = w.reduce((a, b) => a + b, 0)
  const applied = delta < 0 ? -Math.min(-delta, p.support - 0.05) : delta
  p.support += applied
  others.forEach((o, i) => (o.support = Math.max(0.05, o.support - (applied * w[i]) / sw)))
  renorm(s)
}

/** Effet d'un événement : une part durable + une part transitoire (rebond/effet d'annonce) qui s'estompe. */
export function impact(
  s: GameState,
  partyId: string,
  magnitude: number,
  opts: { durable?: number; halfLife?: number; reason: string } = { reason: '' },
) {
  const p = s.parties[partyId]
  if (!p || !p.active || p.pseudo) return
  const dur = opts.durable ?? 0.4
  shift(s, partyId, magnitude * dur)
  const trans = magnitude * (1 - dur)
  if (Math.abs(trans) > 0.02) {
    s.shocks.push({ id: uid(s, 'sh'), partyId, delta: trans, start: s.date, halfLife: opts.halfLife ?? 20, reason: opts.reason })
  }
}

export function effectiveSupport(s: GameState): Record<string, number> {
  const act = activeParties(s)
  const eff: Record<string, number> = {}
  act.forEach((p) => (eff[p.id] = p.support))
  for (const sh of s.shocks) {
    if (eff[sh.partyId] === undefined) continue
    const age = daysBetween(sh.start, s.date)
    eff[sh.partyId] += sh.delta * Math.pow(0.5, age / sh.halfLife)
  }
  let tot = 0
  for (const k in eff) {
    eff[k] = Math.max(0.05, eff[k])
    tot += eff[k]
  }
  for (const k in eff) eff[k] = (eff[k] / tot) * 100
  return eff
}

export function cleanShocks(s: GameState) {
  s.shocks = s.shocks.filter((sh) => Math.abs(sh.delta) * Math.pow(0.5, daysBetween(sh.start, s.date) / sh.halfLife) > 0.03 && s.parties[sh.partyId]?.active)
}

/** Dérive quotidienne lente : marche aléatoire + usure du pouvoir. Les vraies évolutions viennent des événements. */
export function dailyDrift(s: GameState, volatility = 1) {
  const act = activeParties(s)
  for (const p of act) {
    if (p.pseudo) continue
    const sd = 0.012 * Math.sqrt(Math.max(p.support, 1) / 10) * volatility
    p.support = Math.max(0.05, p.support + randn(s) * sd)
  }
  renorm(s)
  const wearBase = Math.max(0, 40 - s.economy.approval) / 10
  if (wearBase > 0) {
    for (const id of s.government.partyIds) {
      const p = s.parties[id]
      if (p && p.active && !p.pseudo) shift(s, id, -p.support * 0.0005 * wearBase)
    }
  } else {
    for (const id of s.government.partyIds) {
      const p = s.parties[id]
      if (p && p.active && !p.pseudo) shift(s, id, p.support * 0.0003 * Math.abs(wearBase))
    }
  }
}

function houseEffect(institute: string, partyId: string) {
  return (hash(institute + '|' + partyId) - 0.5) * 0.9
}

export function conductPoll(s: GameState, institute?: string, opts: { silent?: boolean; sample?: number; kind?: Poll['kind']; backfillDate?: string } = {}): Poll {
  const inst = institute ?? INSTITUTES[Math.floor(hash(s.date + s.counter) * INSTITUTES.length)]
  const n = opts.sample ?? s.settings.pollSample
  const eff = effectiveSupport(s)
  const date = opts.backfillDate ?? s.date
  // 1) bruit d'échantillonnage (différent du mouvement réel) + biais propre à l'institut
  const raw: Record<string, number> = {}
  for (const [id, v] of Object.entries(eff)) {
    const se = Math.sqrt((v / 100) * (1 - v / 100) / n) * 100 * Math.sqrt(DEFF)
    raw[id] = Math.max(0.1, v + randn(s) * se + houseEffect(inst, id))
  }
  // 2) regroupement des petits partis, puis arrondi au dixième avec somme exacte de 100,0
  const entries = Object.entries(raw)
  const small = entries.filter(([, v]) => v < 1.0)
  const big = entries.filter(([, v]) => v >= 1.0)
  const grouped: [string, number][] = [...big]
  if (small.length) grouped.push(['autres', small.reduce((a, [, v]) => a + v, 0)])
  grouped.sort((a, b) => b[1] - a[1])
  const tenths = largestRemainder(grouped.map(([, v]) => v), 1000)
  const prev = [...s.polls].reverse().find((p) => p.kind === (opts.kind ?? 'legislatives') && p.date <= date)
  const rows: PollResultRow[] = grouped.map(([id], i) => ({ partyId: id, value: tenths[i] / 10, smoothed: 0 }))

  // 3) moyenne glissante (« poll of polls ») : sépare tendance de fond et bruit
  const recent = s.polls.filter((p) => p.kind === (opts.kind ?? 'legislatives') && p.date <= date).slice(-4).reverse()
  const wts = [1, 0.8, 0.6, 0.45, 0.3]
  const smoothFor = (id: string, cur: number) => {
    let num = cur * wts[0]
    let den = wts[0]
    recent.forEach((p, i) => {
      const r = p.rows.find((x) => x.partyId === id)
      if (r) {
        num += r.value * wts[i + 1]
        den += wts[i + 1]
      }
    })
    return num / den
  }
  rows.forEach((r) => (r.smoothed = Math.round(smoothFor(r.partyId, r.value) * 10) / 10))

  const analysis: string[] = []
  const nm = (id: string) => (id === 'autres' ? 'Autres' : s.parties[id]?.acronym ?? id)
  if (prev) {
    for (const r of rows) {
      const pr = prev.rows.find((x) => x.partyId === r.partyId)
      if (!pr) continue
      r.delta = Math.round((r.value - pr.value) * 10) / 10
      const p = r.value / 100
      const moeDiff = 1.96 * Math.sqrt((2 * DEFF * p * (1 - p)) / n) * 100
      r.deltaSignificant = Math.abs(r.delta) > moeDiff
    }
    const sig = rows.filter((r) => r.deltaSignificant && r.partyId !== 'autres').sort((a, b) => Math.abs(b.delta!) - Math.abs(a.delta!))
    const trend = rows
      .map((r) => {
        const old = [...s.polls].reverse().find((p) => p.kind === (opts.kind ?? 'legislatives') && daysBetween(p.date, date) >= 25)
        const o = old?.rows.find((x) => x.partyId === r.partyId)
        return { r, d: o ? r.smoothed - o.smoothed : 0 }
      })
      .filter((x) => Math.abs(x.d) >= 1.2 && x.r.partyId !== 'autres')
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
    sig.slice(0, 2).forEach((x) => analysis.push(`${nm(x.partyId)} ${signed(x.delta!)} pt : variation supérieure à la marge d’erreur, à confirmer par la moyenne glissante.`))
    trend.slice(0, 3).forEach((x) => analysis.push(`${nm(x.r.partyId)} : tendance de fond ${x.d > 0 ? 'à la hausse' : 'à la baisse'} (${signed(x.d)} pt en un mois sur la moyenne des sondages).`))
    const noise = rows.filter((r) => !r.deltaSignificant && Math.abs(r.delta ?? 0) >= 1.5 && r.partyId !== 'autres')
    noise.slice(0, 1).forEach((r) => analysis.push(`${nm(r.partyId)} ${signed(r.delta!)} pt : variation dans la marge d’erreur, probablement une fluctuation statistique.`))
  }
  const lead = rows.filter((r) => r.partyId !== 'autres')[0]
  if (lead) analysis.unshift(`${nm(lead.partyId)} en tête avec ${pct(lead.value)} %.`)

  const truth: Record<string, number> = {}
  for (const [k, v] of Object.entries(eff)) truth[k] = Math.round(v * 100) / 100
  const poll: Poll = {
    id: uid(s, 'po'),
    date,
    institute: inst,
    disclaimer: POLL_DISCLAIMER,
    sample: n,
    moe: Math.round(1.96 * Math.sqrt((DEFF * 0.3 * 0.7) / n) * 1000) / 10,
    kind: opts.kind ?? 'legislatives',
    rows,
    analysis,
    truth,
  }
  if (!opts.silent || opts.backfillDate) s.polls.push(poll)
  return poll
}

/** Historique de sondages avant le début de la partie (pour que les courbes ne démarrent pas vides). */
export function backfillPolls(s: GameState, count = 10) {
  const saved = s.date
  for (let i = count; i >= 1; i--) {
    const d = addDays(saved, -i * 7)
    conductPoll(s, undefined, { backfillDate: d })
  }
  s.polls.sort((a, b) => a.date.localeCompare(b.date))
  // marquage : sondages antérieurs au début de partie
  s.polls.forEach((p) => {
    if (p.date < saved) p.analysis = ['Sondage antérieur au début de la partie (historique reconstitué).']
  })
}

export const clampSupport = (x: number) => clamp(x, 0.05, 80)
