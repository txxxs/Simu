export function Sparkline({ values, color = 'var(--blue)', h = 34 }: { values: number[]; color?: string; h?: number }) {
  if (values.length < 2) return null
  const W = 120
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(0.001, max - min)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${((i / (values.length - 1)) * W).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}
