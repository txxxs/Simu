import { describe, expect, it } from 'vitest'
import { createGame } from '../src/engine/scenario'
import { advance, advanceToNextEvent } from '../src/engine/sim'
import { seatMap } from '../src/engine/parliament'
import { effectiveSupport } from '../src/engine/polls'
import { applyOps } from '../src/engine/ops'

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

function invariants(s: ReturnType<typeof createGame>) {
  expect(s.deputies.length).toBe(577)
  expect(sum(seatMap(s))).toBe(577)
  const act = Object.values(s.parties).filter((p) => p.active)
  expect(Math.abs(act.reduce((a, p) => a + p.support, 0) - 100)).toBeLessThan(0.01)
  for (const p of s.polls) expect(Math.round(p.rows.reduce((a, r) => a + r.value, 0) * 10)).toBe(1000)
  for (const d of s.deputies) expect(s.parties[d.partyId]?.active).toBe(true)
  expect(sum(s.senate)).toBe(348)
}

describe('moteur', () => {
  for (const cfg of [
    { year: 2024, mode: 'reel', realism: 'plausible' },
    { year: 2022, mode: 'reel', realism: 'fidele' },
    { year: 2027, mode: 'alternatif', realism: 'libre' },
    { year: 2035, mode: 'alternatif', realism: 'plausible' },
  ] as const) {
    it(`invariants sur ${JSON.stringify(cfg)} après 3 ans`, () => {
      const s = createGame({ ...cfg, seed: 42 })
      invariants(s)
      for (let y = 0; y < 3; y++) { advance(s, 365); invariants(s) }
      expect(s.news.length).toBeGreaterThan(50)
      expect(s.chronicle.length).toBeGreaterThan(10)
    })
  }

  it('est déterministe à graine égale', () => {
    const a = createGame({ year: 2024, seed: 7 })
    const b = createGame({ year: 2024, seed: 7 })
    advance(a, 200); advance(b, 200)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('la dissolution mène à des législatives avec 577 sièges', () => {
    const s = createGame({ year: 2024, seed: 3 })
    applyOps(s, [{ op: 'dissolve_assembly', inDays: 30 }], 'dissolution')
    const n0 = s.elections.length
    advance(s, 45)
    expect(s.elections.length).toBe(n0 + 1)
    invariants(s)
  })

  it('sondage : une vraie variation est distinguée du bruit', () => {
    const s = createGame({ year: 2024, seed: 5 })
    const before = effectiveSupport(s).rn
    applyOps(s, [{ op: 'scandal', partyId: 'rn', severity: 5 }], 'scandale')
    expect(effectiveSupport(s).rn).toBeLessThan(before)
  })

  it('une présidentielle désigne un président', () => {
    const s = createGame({ year: 2027, mode: 'reel', seed: 11 })
    advanceToNextEvent(s, 2000)
    for (let i = 0; i < 40; i++) advance(s, 30)
    expect(s.elections.some((e) => e.kind === 'presidentielle')).toBe(true)
    invariants(s)
  })
})
