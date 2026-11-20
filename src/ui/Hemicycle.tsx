import { useMemo, useState } from 'react'
import type { GameState } from '../engine/types'

interface Pt { x: number; y: number; a: number; r: number }

export function layout(total: number, W = 1000, H = 520): { pts: Pt[]; sr: number } {
  const rows = total > 400 ? 11 : total > 200 ? 9 : total > 80 ? 7 : 5
  const R = Math.min(W / 2 - 14, H - 14)
  const r0 = R * 0.42
  const radii = Array.from({ length: rows }, (_, k) => r0 + ((R - r0) * k) / (rows - 1))
  const sum = radii.reduce((a, b) => a + b, 0)
  const counts = radii.map((r) => Math.floor((total * r) / sum))
  let rest = total - counts.reduce((a, b) => a + b, 0)
  for (let i = rows - 1; rest > 0; i = (i - 1 + rows) % rows, rest--) counts[i]++
  const pts: Pt[] = []
  radii.forEach((r, k) => {
    const n = counts[k]
    for (let i = 0; i < n; i++) {
      const a = Math.PI - (Math.PI * (n === 1 ? 0.5 : i / (n - 1)))
      pts.push({ x: W / 2 + r * Math.cos(a), y: H - 8 - r * Math.sin(a), a, r })
    }
  })
  pts.sort((p, q) => q.a - p.a || p.r - q.r)
  const dr = (R - r0) / (rows - 1)
  const arc = (Math.PI * radii[rows - 1]) / counts[rows - 1]
  return { pts, sr: Math.min(dr, arc) * 0.42 }
}

export function Hemicycle({ g, compact = false, highlight, onPick }: { g: GameState; compact?: boolean; highlight?: string | null; onPick?: (partyId: string) => void }) {
  const [tip, setTip] = useState<{ x: number; y: number; t: string } | null>(null)
  const W = 1000
  const H = 520
  const data = useMemo(() => {
    const order = Object.values(g.parties).filter((p) => p.active).sort((a, b) => a.lr - b.lr || a.cult - b.cult).map((p) => p.id)
    const byParty = new Map<string, typeof g.deputies>()
    for (const d of g.deputies) {
      const arr = byParty.get(d.partyId) ?? []
      arr.push(d)
      byParty.set(d.partyId, arr)
    }
    const seq: typeof g.deputies = []
    for (const id of order) seq.push(...(byParty.get(id) ?? []))
    const { pts, sr } = layout(seq.length || 577, W, H)
    return { seq, pts, sr }
  }, [g.deputies, g.parties])
  const { seq, pts, sr } = data
  return (
    <div className="hemi" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hémicycle de ${seq.length} députés`} onMouseLeave={() => setTip(null)}>
        {pts.map((p, i) => {
          const d = seq[i]
          if (!d) return null
          const dim = highlight && d.partyId !== highlight
          return (
            <circle
              key={d.id}
              className="seat"
              cx={p.x}
              cy={p.y}
              r={sr}
              fill={g.parties[d.partyId]?.color ?? '#999'}
              opacity={dim ? 0.18 : 1}
              onMouseMove={compact ? undefined : (e) => setTip({ x: e.clientX + 12, y: e.clientY + 12, t: `${d.name} — ${g.parties[d.partyId]?.acronym}\n${d.circo}` })}
              onClick={() => onPick?.(d.partyId)}
            />
          )
        })}
        <text x={W / 2} y={H - 70} textAnchor="middle" fontFamily="var(--serif)" fontSize="58" fill="var(--ink)">{seq.length}</text>
        <text x={W / 2} y={H - 40} textAnchor="middle" fontSize="17" fill="var(--muted)">députés · majorité : 289</text>
      </svg>
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y, whiteSpace: 'pre-line' }}>{tip.t}</div>
      )}
    </div>
  )
}
