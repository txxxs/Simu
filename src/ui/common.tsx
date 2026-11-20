import type { ReactNode } from 'react'
import type { GameState, NewsItem } from '../engine/types'
import { useGame, type View } from '../store/game'
import { fmtDate, pct, signed } from '../engine/util'

export const Icon = ({ name }: { name: string }) => {
  const p: Record<string, string> = {
    dashboard: 'M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    news: 'M4 5h13v14H6a2 2 0 0 1-2-2zM17 8h3v9a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h5',
    polls: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    parliament: 'M3 18a9 9 0 0 1 18 0M7 18a5 5 0 0 1 10 0M12 18v0M2 21h20',
    parties: 'M5 21V5l9 2-9 3M5 21h14M9 21v-6h6v6',
    people: 'M16 20v-2a4 4 0 0 0-8 0v2M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1.5a3 3 0 0 0-3-3M3 20v-1.5a3 3 0 0 1 3-3',
    elections: 'M5 9l7-6 7 6v11H5zM9 20v-6h6v6M3 20h18',
    history: 'M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7M3 4v4h4',
    economy: 'M3 17l6-6 4 4 8-8M15 7h6v6',
    saves: 'M5 4h12l3 3v13H5zM8 4v5h8V4M8 20v-6h8v6',
    more: 'M5 12h.01M12 12h.01M19 12h.01',
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={p[name] ?? p.more} />
    </svg>
  )
}

export const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
  { id: 'news', label: 'Actualités', icon: 'news' },
  { id: 'polls', label: 'Sondages', icon: 'polls' },
  { id: 'parliament', label: 'Parlement', icon: 'parliament' },
  { id: 'parties', label: 'Partis & alliances', icon: 'parties' },
  { id: 'people', label: 'Personnages', icon: 'people' },
  { id: 'elections', label: 'Élections & carte', icon: 'elections' },
  { id: 'history', label: 'Mémoire & histoire', icon: 'history' },
  { id: 'economy', label: 'Économie & société', icon: 'economy' },
  { id: 'saves', label: 'Parties & réglages', icon: 'saves' },
]

export function PartyDot({ id, g }: { id: string; g: GameState }) {
  return <span className="dot" style={{ background: g.parties[id]?.color ?? '#999' }} />
}

export function PartyChip({ id, g, onClick }: { id: string; g: GameState; onClick?: boolean }) {
  const p = g.parties[id]
  const sel = useGame((s) => s.selectParty)
  const view = useGame((s) => s.setView)
  if (!p) return null
  const inner = (
    <>
      <span className="dot" style={{ background: p.color }} />
      {p.acronym}
    </>
  )
  if (onClick === false) return <span className="chip">{inner}</span>
  return (
    <button className="chip" title={p.name} onClick={() => { sel(id); view('parties') }}>
      {inner}
    </button>
  )
}

export function Delta({ v, digits = 1, sig }: { v?: number; digits?: number; sig?: boolean }) {
  if (v === undefined || v === null) return <span className="delta flat">—</span>
  const cls = Math.abs(v) < 0.05 ? 'flat' : v > 0 ? 'up' : 'down'
  return (
    <span className={`delta ${cls}`} title={sig === undefined ? undefined : sig ? 'Variation supérieure à la marge d’erreur' : 'Dans la marge d’erreur (fluctuation statistique probable)'}>
      {signed(v, digits)}
      {sig !== undefined && <span className="sig">{sig ? '●' : '○'}</span>}
    </span>
  )
}

export function Card({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || right) && (
        <div className="cardhead">
          <h2>{title}</h2>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

export const KIND_LABEL: Record<string, string> = {
  breaking: 'Flash', headline: 'À la une', article: 'Article', editorial: 'Éditorial', communique: 'Communiqué', reaction: 'Réaction', interview: 'Interview', debate: 'Débat', speech: 'Discours', poll: 'Sondage', result: 'Résultats', conference: 'Conférence de presse',
}

export function NewsCard({ n, g }: { n: NewsItem; g: GameState }) {
  return (
    <article className={`news k-${n.kind}`}>
      <div className="meta">
        <span className="kind">{KIND_LABEL[n.kind] ?? n.kind}</span>
        <span>{n.outlet}</span>
        <span>· {fmtDate(n.date, true)}</span>
        {n.source === 'ia' && <span className="ia" title="Texte rédigé par l’IA">IA</span>}
        {n.source === 'narrateur' && <span className="badge">Narrateur</span>}
      </div>
      <h3>{n.title}</h3>
      {n.body && <p>{n.body}</p>}
      {n.dialog && (
        <div className="dialog">
          {n.dialog.map((d, i) => {
            const guest = !!d.partyId || (!!d.speaker && !d.speaker.includes('('))
            return (
              <div key={i} className={`bubble ${guest ? 'guest' : ''}`}>
                <b>{d.speaker}</b>
                {d.text}
              </div>
            )
          })}
        </div>
      )}
      {n.partyIds.length > 0 && (
        <div className="chips">
          {n.partyIds.filter((p) => g.parties[p]).slice(0, 5).map((p) => (
            <PartyChip key={p} id={p} g={g} />
          ))}
        </div>
      )}
    </article>
  )
}

export function Gauge({ value, max = 100, color = 'var(--blue)' }: { value: number; max?: number; color?: string }) {
  return (
    <div className="bar" role="meter" aria-valuenow={Math.round(value)} aria-valuemax={max}>
      <i style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  )
}

export { fmtDate, pct, signed }
