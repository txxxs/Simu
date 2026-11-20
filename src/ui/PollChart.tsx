import { useMemo, useState } from 'react'
import type { GameState } from '../engine/types'
import { daysBetween, fmtDate, pct } from '../engine/util'

export type PollMode = 'smoothed' | 'raw' | 'truth'

export function PollChart({ g, mode, hidden, maxParties = 8 }: { g: GameState; mode: PollMode; hidden: Set<string>; maxParties?: number }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 820
  const H = 340
  const m = { l: 40, r: 14, t: 12, b: 28 }
  const polls = g.polls
  const { series, xs, ymax } = useMemo(() => {
    const last = polls[polls.length - 1]
    const ids = (last?.rows ?? []).filter((r) => r.partyId !== 'autres').slice(0, maxParties).map((r) => r.partyId).filter((id) => !hidden.has(id))
    const t0 = polls[0]?.date ?? g.date
    const span = Math.max(1, daysBetween(t0, polls[polls.length - 1]?.date ?? g.date))
    const xs = polls.map((p) => daysBetween(t0, p.date) / span)
    const val = (pi: number, id: string) => {
      const p = polls[pi]
      if (mode === 'truth') return p.truth?.[id]
      const r = p.rows.find((x) => x.partyId === id)
      return r ? (mode === 'raw' ? r.value : r.smoothed) : undefined
    }
    const series = ids.map((id) => ({ id, pts: polls.map((_, i) => val(i, id)) }))
    const mx = Math.max(10, ...series.flatMap((s) => s.pts.filter((v): v is number => v !== undefined)))
    return { series, xs, ymax: Math.ceil((mx * 1.08) / 5) * 5 }
  }, [polls, mode, hidden, maxParties, g.date])
  if (polls.length < 2) return <p className="muted">Pas encore assez de sondages pour tracer une courbe.</p>
  const X = (t: number) => m.l + t * (W - m.l - m.r)
  const Y = (v: number) => H - m.b - (v / ymax) * (H - m.t - m.b)
  const ticks = Array.from({ length: ymax / 5 + 1 }, (_, i) => i * 5)
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const t = ((e.clientX - r.left) / r.width * W - m.l) / (W - m.l - m.r)
    let best = 0
    xs.forEach((x, i) => { if (Math.abs(x - t) < Math.abs(xs[best] - t)) best = i })
    setHover(best)
  }
  const hp = hover !== null ? polls[hover] : null
  return (
    <div className="chart" style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Évolution des intentions de vote">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={Y(t)} y2={Y(t)} stroke="var(--line)" />
            <text x={m.l - 6} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{t} %</text>
          </g>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const idx = xs.findIndex((x) => x >= t - 0.001)
          const p = polls[Math.max(0, idx)]
          return <text key={t} x={X(t)} y={H - 8} textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'} fontSize="11" fill="var(--muted)">{fmtDate(p.date, true)}</text>
        })}
        {series.map((s) => {
          const color = g.parties[s.id]?.color ?? '#888'
          const d = s.pts.map((v, i) => (v === undefined ? '' : `${i === 0 || s.pts[i - 1] === undefined ? 'M' : 'L'}${X(xs[i]).toFixed(1)},${Y(v).toFixed(1)}`)).join(' ')
          return (
            <g key={s.id}>
              {mode === 'smoothed' && polls.map((p, i) => {
                const r = p.rows.find((x) => x.partyId === s.id)
                return r ? <circle key={i} cx={X(xs[i])} cy={Y(r.value)} r="2" fill={color} opacity="0.28" /> : null
              })}
              <path d={d} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={mode === 'truth' ? '5 4' : undefined} />
              {mode === 'raw' && s.pts.map((v, i) => (v === undefined ? null : <circle key={i} cx={X(xs[i])} cy={Y(v)} r="2.6" fill={color} />))}
            </g>
          )
        })}
        {hover !== null && <line x1={X(xs[hover])} x2={X(xs[hover])} y1={m.t} y2={H - m.b} stroke="var(--muted)" strokeDasharray="3 3" />}
      </svg>
      {hp && hover !== null && (
        <div className="tooltip" style={{ position: 'absolute', top: 8, left: `${Math.min(66, Math.max(2, (X(xs[hover]) / W) * 100 + 2))}%` }}>
          <b>{fmtDate(hp.date)}</b>
          <div className="small">{hp.institute}</div>
          {series.map((s) => ({ s, v: s.pts[hover] })).filter((x) => x.v !== undefined).sort((a, b) => (b.v as number) - (a.v as number)).map(({ s, v }) => (
            <div key={s.id} className="small"><span className="dot" style={{ background: g.parties[s.id]?.color }} /> {g.parties[s.id]?.acronym} {pct(v as number)} %</div>
          ))}
        </div>
      )}
    </div>
  )
}
