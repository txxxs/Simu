import type { GameState } from './types'

export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x))
export const round1 = (x: number) => Math.round(x * 10) / 10

/** Répartition proportionnelle en entiers (méthode du plus fort reste) : la somme vaut toujours `total`. */
export function largestRemainder(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0)
  if (sum <= 0 || weights.length === 0) return weights.map(() => 0)
  const raw = weights.map((w) => (Math.max(0, w) / sum) * total)
  const base = raw.map(Math.floor)
  let rest = total - base.reduce((a, b) => a + b, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) base[order[k].i]++
  return base
}

// ---------- Dates (UTC, format ISO yyyy-mm-dd) ----------
const MS = 86400000
export const toDate = (iso: string) => new Date(iso + 'T00:00:00Z')
export const isoOf = (d: Date) => d.toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => isoOf(new Date(toDate(iso).getTime() + n * MS))
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / MS)
export function addYears(iso: string, n: number) {
  const d = toDate(iso)
  d.setUTCFullYear(d.getUTCFullYear() + n)
  return isoOf(d)
}
export function addMonths(iso: string, n: number) {
  const d = toDate(iso)
  d.setUTCMonth(d.getUTCMonth() + n)
  return isoOf(d)
}
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export function fmtDate(iso: string, short = false) {
  const d = toDate(iso)
  const m = MOIS[d.getUTCMonth()]
  const day = d.getUTCDate() === 1 ? '1er' : String(d.getUTCDate())
  return short ? `${day} ${m.slice(0, 4)}${m.length > 4 ? '.' : ''} ${d.getUTCFullYear()}` : `${day} ${m} ${d.getUTCFullYear()}`
}
export const yearOf = (iso: string) => toDate(iso).getUTCFullYear()

export const uid = (s: GameState, prefix: string) => `${prefix}${(s.counter = (s.counter || 0) + 1).toString(36)}`

export const pct = (x: number, d = 1) => x.toFixed(d).replace('.', ',')
export const signed = (x: number, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(d).replace('.', ',')

export function norm(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
}

export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}
