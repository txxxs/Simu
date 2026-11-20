import { useMemo, useState } from 'react'
import { useGame } from '../store/game'
import { Card, fmtDate, pct } from './common'
import { REGIONS } from '../engine/regions'
import { fit } from '../engine/parliament'
import { effectiveSupport } from '../engine/polls'
import { daysBetween } from '../engine/util'
import { ELECTION_LABEL } from '../engine/elections'

export function ElectionsPage() {
  const g = useGame((s) => s.game)!
  const narrate = useGame((s) => s.narrate)
  const [mapMode, setMapMode] = useState<'deputes' | 'opinion'>('deputes')
  const [open, setOpen] = useState<string | null>(null)
  const eff = useMemo(() => effectiveSupport(g), [g])
  const tiles = useMemo(() => REGIONS.map((r) => {
    let counts: Record<string, number> = {}
    if (mapMode === 'deputes') for (const d of g.deputies) if (d.region === r.id) counts[d.partyId] = (counts[d.partyId] ?? 0) + 1
    else for (const [id, v] of Object.entries(eff)) counts[id] = v * fit(g.parties[id], r)
    const tot = Object.values(counts).reduce((a, b) => a + b, 0) || 1
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return { r, top: sorted[0], share: sorted[0] ? (sorted[0][1] / tot) * 100 : 0, second: sorted[1] }
  }), [g.deputies, g.parties, eff, mapMode])
  const upcoming = g.calendar.filter((c) => c.kind.startsWith('election-') && c.date >= g.date).sort((a, b) => a.date.localeCompare(b.date))
  const history = [...g.elections].reverse()
  const shown = history.find((e) => e.id === open) ?? history[0]
  return (
    <div className="page">
      <h1>Élections & carte</h1>
      <p className="lede">Calendrier électoral, résultats passés et carte politique par régions (cartogramme).</p>
      <div className="grid g-main">
        <Card title="Carte électorale" right={<div className="seg"><button aria-pressed={mapMode === 'deputes'} onClick={() => setMapMode('deputes')}>Députés élus</button><button aria-pressed={mapMode === 'opinion'} onClick={() => setMapMode('opinion')}>Opinion estimée</button></div>}>
          <div className="tilemap" role="img" aria-label="Carte des régions">
            {Array.from({ length: 6 * 6 }, (_, i) => {
              const col = i % 6
              const row = Math.floor(i / 6)
              const t = tiles.find((x) => x.r.col === col && x.r.row === row)
              if (!t) return <div key={i} />
              const p = t.top ? g.parties[t.top[0]] : null
              return (
                <div key={i} className="tile" style={{ background: p?.color ?? '#999' }} title={`${t.r.name} — ${p?.name ?? ''} (${t.share.toFixed(0)} %)${t.second ? `, puis ${g.parties[t.second[0]]?.acronym}` : ''}`}>
                  {t.r.short}<small>{p?.acronym} · {t.share.toFixed(0)} %</small>
                </div>
              )
            })}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>{mapMode === 'deputes' ? 'Parti arrivé en tête en nombre de députés dans chaque région.' : 'Estimation : opinion nationale pondérée par la sensibilité locale de chaque région (modèle simplifié).'} Cartogramme : une tuile par région, sans respecter les surfaces.</p>
        </Card>
        <Card title="Prochains scrutins" right={<button className="btn sm" onClick={() => narrate('Le président annonce une dissolution de l’Assemblée nationale')}>Dissolution</button>}>
          {upcoming.length === 0 && <p className="muted">Aucun scrutin programmé.</p>}
          {upcoming.slice(0, 8).map((c) => (
            <div key={c.id} className="row spread" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <span>{c.title}</span><span className="small muted num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.date, true)} · J−{daysBetween(g.date, c.date)}</span>
            </div>
          ))}
          <div className="chips"><span className="small muted">Convoquer :</span>
            {Object.entries(ELECTION_LABEL).map(([k, l]) => <button key={k} className="chip" onClick={() => narrate(`On organise des ${l.replace('Élection', 'élection').replace('Élections ', 'élections ')} dans 40 jours`)}>{l.replace('Élections ', '').replace('Élection ', '')}</button>)}
          </div>
        </Card>
      </div>
      <Card title="Historique des scrutins" right={<span className="small muted">{history.length} scrutin(s) depuis le début de la partie</span>}>
        {history.length === 0 && <p className="muted">Aucun scrutin n’a encore eu lieu pendant la partie. Faites avancer le temps ou convoquez une élection depuis la console.</p>}
        {history.length > 0 && (
          <div className="grid g2">
            <div>{history.map((e) => (
              <button key={e.id} className="row spread" onClick={() => setOpen(e.id)} style={{ all: 'unset', display: 'flex', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid var(--line)', background: shown?.id === e.id ? 'var(--surface-2)' : undefined }}>
                <span><b>{e.title}</b><div className="small muted">{e.note}</div></span><span className="small muted">{fmtDate(e.date, true)}</span>
              </button>))}</div>
            {shown && (
              <div>
                <b>{shown.title}</b> <span className="muted small">— participation {pct(shown.turnout)} %</span>
                <div className="tablewrap"><table>
                  <thead><tr><th>Liste</th><th className="r">Voix %</th>{shown.seats && <th className="r">Sièges</th>}</tr></thead>
                  <tbody>{Object.entries(shown.shares).sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.3).map(([id, v]) => (
                    <tr key={id}><td><span className="dot" style={{ background: g.parties[id]?.color ?? '#555' }} /> {g.parties[id]?.name ?? id.toUpperCase()}</td><td className="r num">{pct(v)}</td>{shown.seats && <td className="r num"><b>{shown.seats[id] ?? 0}</b></td>}</tr>))}</tbody>
                </table></div>
                {shown.rounds && shown.rounds.map((r) => <p key={r.label} className="small">{r.label} : {Object.entries(r.shares).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, v]) => `${g.parties[id]?.acronym ?? id} ${pct(v)} %`).join(' · ')}</p>)}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
