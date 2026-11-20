import { useState } from 'react'
import { useGame } from '../store/game'
import { Card, Gauge, PartyChip, fmtDate } from './common'
import { Hemicycle } from './Hemicycle'
import { seatMap, govSeats } from '../engine/parliament'

export function ParliamentPage() {
  const g = useGame((s) => s.game)!
  const [hl, setHl] = useState<string | null>(null)
  const [tab, setTab] = useState<'an' | 'senat' | 'lois'>('an')
  const seats = seatMap(g)
  const rows = Object.entries(seats).sort((a, b) => g.parties[a[0]].lr - g.parties[b[0]].lr)
  const gs = govSeats(g)
  const lastLeg = [...g.elections].reverse().find((e) => e.kind === 'legislatives')
  const members = hl ? g.deputies.filter((d) => d.partyId === hl) : []
  const senate = Object.entries(g.senate).filter(([id]) => g.parties[id]).sort((a, b) => g.parties[a[0]].lr - g.parties[b[0]].lr)
  const laws = [...g.laws].reverse()
  return (
    <div className="page">
      <h1>Parlement</h1>
      <p className="lede">Assemblée nationale (577 sièges, majorité absolue : 289) et Sénat (348 sièges). Les députés sont fictifs ; survolez un siège pour voir son occupant.</p>
      <div className="tabs" role="tablist">
        {([['an', 'Assemblée nationale'], ['senat', 'Sénat'], ['lois', `Lois (${laws.length})`]] as const).map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'an' && (
        <div className="grid g-main">
          <Card title="Hémicycle" right={hl ? <button className="btn sm" onClick={() => setHl(null)}>Tout afficher</button> : undefined}>
            <Hemicycle g={g} highlight={hl} onPick={(id) => setHl(hl === id ? null : id)} />
            <div className="row spread wrap" style={{ marginTop: 8 }}>
              <span className="small muted">Dernières législatives : {lastLeg ? fmtDate(lastLeg.date) : fmtDate(g.lastLegislative)}</span>
              <span className="small">Majorité gouvernementale : <b>{gs}</b> / 289</span>
            </div>
            <Gauge value={gs} max={289} color={gs >= 289 ? 'var(--good)' : 'var(--accent)'} />
          </Card>
          <Card title="Groupes (de gauche à droite)">
            <div className="legend">
              {rows.map(([id, n]) => (
                <button key={id} aria-pressed={hl === id} onClick={() => setHl(hl === id ? null : id)}>
                  <span className="dot" style={{ background: g.parties[id].color }} />
                  <span>{g.parties[id].name}{g.government.partyIds.includes(id) && <span className="badge" style={{ marginLeft: 6 }}>gouv.</span>}</span>
                  <b className="num">{n}</b>
                  <span className="muted small num">{((n / 577) * 100).toFixed(1)} %</span>
                </button>
              ))}
            </div>
            {hl && (
              <div style={{ marginTop: 12 }}>
                <b className="small">Quelques élus de {g.parties[hl].acronym}</b>
                <div className="small muted" style={{ maxHeight: 150, overflowY: 'auto' }}>{members.slice(0, 40).map((d) => <div key={d.id}>{d.name} — {d.circo}</div>)}</div>
              </div>
            )}
          </Card>
        </div>
      )}
      {tab === 'senat' && (
        <Card title="Sénat (348 sièges)">
          <div className="grid" style={{ gap: 8 }}>
            {senate.map(([id, n]) => (
              <div key={id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 44px', gap: 10, alignItems: 'center' }}>
                <PartyChip id={id} g={g} /><Gauge value={n} max={140} color={g.parties[id].color} /><b className="num">{n}</b>
              </div>
            ))}
          </div>
          <p className="small muted">Composition approximative issue du dernier renouvellement ; le Sénat vote les textes selon la proximité idéologique de ses groupes.</p>
        </Card>
      )}
      {tab === 'lois' && (
        <Card title="Textes examinés">
          {laws.length === 0 && <p className="muted">Aucun texte pour l’instant. Le gouvernement et l’opposition en déposeront au fil du temps ; vous pouvez aussi en annoncer dans la console du narrateur (« Le gouvernement présente une réforme des retraites »).</p>}
          <div className="tablewrap"><table>
            <thead><tr><th>Texte</th><th>Déposé</th><th>Auteur</th><th>Statut</th><th>Votes</th></tr></thead>
            <tbody>{laws.map((l) => (
              <tr key={l.id}><td><b>{l.title}</b><div className="small muted">{l.summary || l.stage}</div></td><td className="small">{fmtDate(l.filed, true)}</td><td>{l.authorPartyId ? <PartyChip id={l.authorPartyId} g={g} /> : <span className="badge">Gouvernement</span>}</td>
                <td><span className={`badge ${l.status === 'adoptée' ? 'ok' : l.status === 'en cours' ? '' : 'warn'}`}>{l.status}</span></td>
                <td className="small">{l.votes.map((v, i) => <div key={i}>{v.label}: {v.pour}–{v.contre}{v.abst ? ` (${v.abst} abst.)` : ''}</div>)}</td></tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
    </div>
  )
}
