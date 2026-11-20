import { useMemo, useState } from 'react'
import { useGame } from '../store/game'
import { Card, PartyChip, fmtDate } from './common'

const TYPES: Record<string, string> = { election: 'Élections', gouvernement: 'Gouvernement', censure: 'Censure', crise: 'Crises', alliance: 'Alliances', scission: 'Scissions', direction: 'Directions', 'congrès': 'Congrès', loi: 'Lois', scandale: 'Scandales', mobilisation: 'Mobilisations', institution: 'Institutions', creation: 'Créations', fusion: 'Fusions', media: 'Médias', narrateur: 'Narrateur', debut: 'Début' }

export function HistoryPage() {
  const g = useGame((s) => s.game)!
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(60)
  const items = useMemo(() => [...g.chronicle].reverse().filter((c) => (type === 'all' || c.type === type) && (!q || (c.title + c.detail).toLowerCase().includes(q.toLowerCase()))), [g.chronicle, type, q])
  const present = [...new Set(g.chronicle.map((c) => c.type))]
  return (
    <div className="page">
      <h1>Mémoire & histoire</h1>
      <p className="lede">Le registre permanent de la partie : tout ce qui s’est passé, daté. Rien n’est modifié sans événement explicatif.</p>
      <div className="grid g-main">
        <Card title="Chronique" right={<span className="small muted">{items.length} faits</span>}>
          <div className="row wrap" style={{ marginBottom: 10 }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }}>
              <option value="all">Tous les faits</option>{present.map((t) => <option key={t} value={t}>{TYPES[t] ?? t}</option>)}
            </select>
            <input type="text" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
          </div>
          <div className="timeline">
            {items.slice(0, limit).map((c) => (
              <div key={c.id} className="tl">
                <div className="d">{fmtDate(c.date)} · {TYPES[c.type] ?? c.type}</div>
                <b>{c.title}</b>
                {c.detail && <div className="small muted">{c.detail}</div>}
                {c.partyIds.length > 0 && <div className="chips">{c.partyIds.filter((p) => g.parties[p]).slice(0, 4).map((p) => <PartyChip key={p} id={p} g={g} />)}</div>}
              </div>
            ))}
          </div>
          {items.length > limit && <button className="btn" onClick={() => setLimit(limit + 60)}>Afficher plus</button>}
        </Card>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Card title="Changements institutionnels">
            {g.institutional.length === 0 && <p className="muted">Aucun pour l’instant.</p>}
            {[...g.institutional].reverse().map((i, k) => <p key={k} className="small" style={{ margin: '6px 0' }}><b>{fmtDate(i.date, true)}</b> — {i.text}</p>)}
          </Card>
          <Card title="Crises">
            {g.crises.length === 0 && <p className="muted">Aucune crise.</p>}
            {[...g.crises].reverse().slice(0, 12).map((c) => <p key={c.id} className="small" style={{ margin: '6px 0' }}><span className={`badge ${c.ongoing ? 'warn' : ''}`}>{c.ongoing ? 'en cours' : 'terminée'}</span> <b>{c.title}</b> · gravité {c.severity}/5 · {fmtDate(c.start, true)}</p>)}
          </Card>
          <Card title="Interventions du narrateur">
            {g.narratorLog.length === 0 && <p className="muted">Aucune intervention.</p>}
            {[...g.narratorLog].reverse().slice(0, 15).map((n, k) => <p key={k} className="small" style={{ margin: '6px 0' }}><b>{fmtDate(n.date, true)}</b> — « {n.text} »</p>)}
          </Card>
        </div>
      </div>
    </div>
  )
}
