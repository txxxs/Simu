import { describe, expect, it } from 'vitest'
import { createGame } from '../src/engine/scenario'
import { interpretOffline } from '../src/engine/interpret'
import { applyOps } from '../src/engine/ops'
import { sanitizeOps } from '../src/engine/bridge'

const s0 = () => createGame({ year: 2024, seed: 1 })
const kinds = (t: string) => interpretOffline(s0(), t).ops.map((o) => o.op)

describe('interprétation hors-ligne', () => {
  it('phrases du cahier des charges', () => {
    expect(kinds('Le président annonce une dissolution')).toEqual(['dissolve_assembly'])
    expect(kinds('Un nouveau parti communiste est créé et rejoint une alliance d’extrême gauche')).toEqual(['create_party'])
    expect(kinds('Un sondage IFOP apparaît')).toEqual(['poll'])
    expect(kinds('Le parti organise un vote interne')).toEqual(['note'])
    expect(kinds('Une crise éclate à l’Assemblée nationale')).toEqual(['crisis'])
    expect(kinds('Le candidat est invité sur BFMTV')).toContain('note')
    expect(kinds('Marine Le Pen est invitée sur BFMTV')).toEqual(['media'])
    expect(kinds('Le PS et les Écologistes s’allient')).toEqual(['form_alliance'])
    expect(kinds('Scission au PS')).toEqual(['split_party'])
    expect(kinds('Un scandale éclate autour de Gérald Darmanin')).toEqual(['scandal'])
    expect(kinds('Le RN perd 3 points')).toEqual(['shock'])
    expect(kinds('Avance de trois mois')).toEqual(['advance_time'])
    expect(kinds('Le Premier ministre démissionne')).toEqual(['resign'])
    expect(kinds('LFI dépose une motion de censure')).toEqual(['censure_motion'])
    expect(kinds('Le président réagit à la situation')).toEqual(['media'])
  })

  it('le nouveau parti communiste rejoint l’alliance de gauche et modifie les données', () => {
    const s = s0()
    const { ops } = interpretOffline(s, 'Un nouveau parti communiste est créé et rejoint une alliance d’extrême gauche')
    const n0 = Object.keys(s.parties).length
    const r = applyOps(s, ops, 'x')
    expect(Object.keys(s.parties).length).toBe(n0 + 1)
    expect(r.summary.length).toBeGreaterThan(0)
    expect(s.deputies.length).toBe(577)
    expect(Math.abs(Object.values(s.parties).filter((p) => p.active).reduce((a, p) => a + p.support, 0) - 100)).toBeLessThan(0.01)
  })

  it('valide strictement les opérations renvoyées par le LLM', () => {
    const s = s0()
    const ops = sanitizeOps(s, [
      { op: 'shock', partyId: 'rn', delta: 999 },
      { op: 'shock', partyId: 'inexistant', delta: 1 },
      { op: 'drop_database' },
      { op: 'form_alliance', partyIds: ['ps', 'eelv'] },
    ])
    expect(ops.map((o) => o.op)).toEqual(['shock', 'form_alliance'])
    expect((ops[0] as { delta: number }).delta).toBe(15)
  })
})
