import { useState } from 'react'
import { useGame } from '../store/game'
import { Card, Delta, fmtDate, pct } from './common'
import { PollChart, type PollMode } from './PollChart'

export function PollsPage() {
  const g = useGame((s) => s.game)!
  const narrate = useGame((s) => s.narrate)
  const [mode, setMode] = useState<PollMode>('smoothed')
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [sel, setSel] = useState<number>(-1)
  const polls = g.polls
  const poll = polls[sel < 0 ? polls.length + sel : sel] ?? polls[polls.length - 1]
  const last = polls[polls.length - 1]
  const toggle = (id: string) => setHidden((h) => { const n = new Set(h); n.has(id) ? n.delete(id) : n.add(id); return n })
  return (
    <div className="page">
      <h1>Sondages</h1>
      <p className="lede">Intentions de vote pour les législatives. Les sondages sont <b>fictifs</b> (instituts imaginaires) : ils mesurent un niveau d’opinion réel mais caché, avec un bruit statistique.</p>
      <div className="grid g-main">
        <Card title="Évolution" right={
          <div className="seg">
            <button aria-pressed={mode === 'smoothed'} onClick={() => setMode('smoothed')} title="Moyenne glissante : filtre le bruit">Tendance</button>
            <button aria-pressed={mode === 'raw'} onClick={() => setMode('raw')}>Sondages bruts</button>
            <button aria-pressed={mode === 'truth'} onClick={() => setMode('truth')} title="Vue du maître de jeu : opinion réelle, sans bruit">Vue du MJ</button>
          </div>}>
          <PollChart g={g} mode={mode} hidden={hidden} />
          <div className="chips" style={{ marginTop: 10 }}>
            {(last?.rows ?? []).filter((r) => r.partyId !== 'autres').slice(0, 10).map((r) => {
              const p = g.parties[r.partyId]
              return <button key={r.partyId} className="chip" aria-pressed={!hidden.has(r.partyId)} onClick={() => toggle(r.partyId)} style={{ opacity: hidden.has(r.partyId) ? 0.4 : 1 }}><span className="dot" style={{ background: p?.color }} />{p?.acronym}</button>
            })}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            {mode === 'smoothed' && 'Les courbes sont des moyennes glissantes ; les petits points sont les sondages bruts.'}
            {mode === 'raw' && 'Sondages bruts : les oscillations de quelques points sont en grande partie du bruit d’échantillonnage.'}
            {mode === 'truth' && 'Vue du MJ : niveau réel de l’opinion (invisible pour les médias), qui ne bouge que sous l’effet d’événements ou de la dérive lente.'}
          </p>
        </Card>
        <Card title="Dernier sondage" right={<button className="btn sm" onClick={() => narrate('Un sondage apparaît')}>Commander un sondage</button>}>
          {poll && (
            <>
              <p className="small muted" style={{ marginTop: -6 }}>{poll.institute} · {fmtDate(poll.date)} · {poll.sample} personnes · marge ±{pct(poll.moe)} pts</p>
              <div className="tablewrap"><table>
                <thead><tr><th>Parti</th><th className="r">%</th><th className="r">Δ</th><th className="r" title="Moyenne glissante">Moy.</th></tr></thead>
                <tbody>{poll.rows.map((r) => {
                  const p = g.parties[r.partyId]
                  return <tr key={r.partyId}><td><span className="dot" style={{ background: p?.color ?? '#999' }} /> {p?.name ?? 'Autres'}</td><td className="r num"><b>{pct(r.value)}</b></td><td className="r"><Delta v={r.delta} sig={r.deltaSignificant} /></td><td className="r num muted">{pct(r.smoothed)}</td></tr>
                })}
                <tr><td><b>Total</b></td><td className="r num"><b>{pct(poll.rows.reduce((a, r) => a + r.value, 0))}</b></td><td /><td /></tr></tbody>
              </table></div>
              <p className="small muted">● variation hors marge d’erreur · ○ dans la marge (fluctuation probable)</p>
              {poll.analysis.map((a, i) => <p key={i} className="small" style={{ margin: '4px 0' }}>• {a}</p>)}
              <p className="small muted">{poll.disclaimer}</p>
            </>
          )}
        </Card>
      </div>
      <Card title="Historique des sondages" className="" right={<span className="muted small">{polls.length} sondages</span>}>
        <div className="tablewrap"><table>
          <thead><tr><th>Date</th><th>Institut</th><th>Tête</th><th>2e</th><th className="r">Éch.</th></tr></thead>
          <tbody>{[...polls].reverse().slice(0, 25).map((p, i) => {
            const rows = p.rows.filter((r) => r.partyId !== 'autres')
            return <tr key={p.id} className="click" onClick={() => setSel(polls.length - 1 - i)}><td>{fmtDate(p.date, true)}</td><td>{p.institute}</td><td>{g.parties[rows[0].partyId]?.acronym} {pct(rows[0].value)} %</td><td>{g.parties[rows[1]?.partyId]?.acronym} {pct(rows[1]?.value ?? 0)} %</td><td className="r num">{p.sample}</td></tr>
          })}</tbody>
        </table></div>
      </Card>
    </div>
  )
}
