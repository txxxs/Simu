import type { GameState } from './types'

// Générateur pseudo-aléatoire déterministe (mulberry32) dont l'état est sauvegardé dans la partie.
export function rand(s: Pick<GameState, 'rng'>): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0
  let t = s.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function randn(s: Pick<GameState, 'rng'>): number {
  const u = Math.max(rand(s), 1e-9)
  const v = rand(s)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const chance = (s: Pick<GameState, 'rng'>, p: number) => rand(s) < p
export const pick = <T>(s: Pick<GameState, 'rng'>, arr: readonly T[]): T => arr[Math.floor(rand(s) * arr.length)]
export const between = (s: Pick<GameState, 'rng'>, a: number, b: number) => a + rand(s) * (b - a)
export const intBetween = (s: Pick<GameState, 'rng'>, a: number, b: number) => Math.floor(between(s, a, b + 1))

export function shuffle<T>(s: Pick<GameState, 'rng'>, arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function weightedPick<T>(s: Pick<GameState, 'rng'>, items: readonly T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0)
  if (total <= 0) return items[Math.floor(rand(s) * items.length)]
  let r = rand(s) * total
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i])
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}
