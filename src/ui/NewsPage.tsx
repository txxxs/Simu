import { useMemo, useState } from 'react'
import { useGame } from '../store/game'
import { Card, KIND_LABEL, NewsCard } from './common'
import { OUTLETS } from '../engine/narrate'

export function NewsPage() {
  const g = useGame((s) => s.game)!
  const requestMedia = useGame((s) => s.requestMedia)
  const busy = useGame((s) => s.busy)
  const [kind, setKind] = useState('all')
  const [outlet, setOutlet] = useState('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(40)
  const [mk, setMk] = useState<'interview' | 'debate' | 'speech'>('interview')
  const [who, setWho] = useState<string[]>([])
  const people = useMemo(() => Object.values(g.persons).filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name)), [g.persons])
  const items = useMemo(() => [...g.news].reverse().filter((n) => (kind === 'all' || n.kind === kind) && (outlet === 'all' || n.outlet === outlet) && (!q || (n.title + n.body).toLowerCase().includes(q.toLowerCase()))), [g.news, kind, outlet, q])
  const need = mk === 'debate' ? 2 : 1
  return (
    <div className="page">
      <h1>Actualités & médias</h1>
      <p className="lede">Le fil complet de l’actualité politique : articles, éditoriaux, communiqués, réactions, interviews, débats et discours.</p>
      <div className="grid g-main">
        <div>
          <div className="row wrap" style={{ marginBottom: 12 }}>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ width: 'auto' }} aria-label="Type">
              <option value="all">Tous les types</option>
              {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={outlet} onChange={(e) => setOutlet(e.target.value)} style={{ width: 'auto' }} aria-label="Média">
              <option value="all">Tous les médias</option>
              {OUTLETS.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
            <input type="text" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
            <span className="muted small">{items.length} éléments</span>
          </div>
          <div className="feed">{items.slice(0, limit).map((n) => <NewsCard key={n.id} n={n} g={g} />)}</div>
          {items.length > limit && <button className="btn" style={{ marginTop: 12 }} onClick={() => setLimit(limit + 40)}>Afficher plus</button>}
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Card title="Plateau : interview, débat, discours">
            <div className="seg" style={{ marginBottom: 10 }}>
              {(['interview', 'debate', 'speech'] as const).map((k) => <button key={k} aria-pressed={mk === k} onClick={() => setMk(k)}>{k === 'interview' ? 'Interview' : k === 'debate' ? 'Débat' : 'Discours'}</button>)}
            </div>
            <p className="small muted">{mk === 'debate' ? 'Choisissez 2 ou 3 personnalités.' : 'Choisissez une personnalité.'}</p>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 9 }}>
              {people.map((p) => (
                <label key={p.id} className="row" style={{ padding: '6px 10px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={who.includes(p.id)} onChange={(e) => setWho(e.target.checked ? [...who, p.id].slice(-3) : who.filter((x) => x !== p.id))} />
                  <span className="dot" style={{ background: g.parties[p.partyId ?? '']?.color ?? '#999' }} />
                  <span className="grow">{p.name}</span><span className="muted small">{g.parties[p.partyId ?? '']?.acronym}</span>
                </label>
              ))}
            </div>
            <button className="btn primary" style={{ marginTop: 10, width: '100%' }} disabled={who.length < need || !!busy} onClick={() => requestMedia(mk, who)}>Lancer</button>
          </Card>
        </div>
      </div>
    </div>
  )
}
