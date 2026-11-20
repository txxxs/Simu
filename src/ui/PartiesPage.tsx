import { useMemo, useState } from 'react'
import { useGame } from '../store/game'
import { Card, Gauge, PartyChip, fmtDate, pct } from './common'
import { seatMap } from '../engine/parliament'
import { effectiveSupport } from '../engine/polls'

const FAM: Record<string, string> = { 'extreme-gauche': 'Extrême gauche', gauche: 'Gauche', ecologiste: 'Écologistes', centre: 'Centre', droite: 'Droite', 'extreme-droite': 'Extrême droite', regionaliste: 'Régionalistes', divers: 'Divers' }

export function PartiesPage() {
  const g = useGame((s) => s.game)!
  const selected = useGame((s) => s.selectedParty)
  const select = useGame((s) => s.selectParty)
  const selPerson = useGame((s) => s.selectPerson)
  const setView = useGame((s) => s.setView)
  const [sort, setSort] = useState<'support' | 'seats' | 'lr'>('support')
  const seats = seatMap(g)
  const eff = effectiveSupport(g)
  const list = useMemo(() => Object.values(g.parties).filter((p) => p.active).sort((a, b) => (sort === 'lr' ? a.lr - b.lr : sort === 'seats' ? (seats[b.id] ?? 0) - (seats[a.id] ?? 0) : b.support - a.support)), [g.parties, sort, seats])
  const p = selected ? g.parties[selected] : null
  const leader = p?.leaderId ? g.persons[p.leaderId] : null
  const rel = p ? Object.entries(p.relations).filter(([id]) => g.parties[id]?.active).sort((a, b) => b[1] - a[1]) : []
  const alliance = p ? g.alliances.find((a) => !a.dissolved && a.partyIds.includes(p.id)) : null
  return (
    <div className="page">
      <h1>Partis & alliances</h1>
      <p className="lede">Chaque parti agit de manière autonome : congrès, alliances, scissions, changements de direction.</p>
      <div className="grid g-main">
        <Card title={`${list.length} formations`} right={<div className="seg">{([['support', 'Poids'], ['seats', 'Sièges'], ['lr', 'G → D']] as const).map(([k, l]) => <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>)}</div>}>
          <div className="tablewrap"><table>
            <thead><tr><th>Parti</th><th>Dirigeant</th><th className="r">Opinion</th><th className="r">Sièges</th><th className="r">Adhérents</th></tr></thead>
            <tbody>{list.map((x) => (
              <tr key={x.id} className="click" onClick={() => select(x.id)} style={x.id === selected ? { background: 'var(--surface-2)' } : undefined}>
                <td><span className="dot" style={{ background: x.color }} /> <b>{x.acronym}</b> <span className="muted small">{x.pseudo ? '' : FAM[x.family]}</span>{!x.real && <span className="badge" style={{ marginLeft: 6 }}>fictif</span>}</td>
                <td className="small">{x.leaderId ? g.persons[x.leaderId]?.name : '—'}</td>
                <td className="r num">{pct(eff[x.id] ?? x.support)} %</td>
                <td className="r num"><b>{seats[x.id] ?? 0}</b></td>
                <td className="r num small">{x.members ? x.members.toLocaleString('fr-FR') : '—'}</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
        <div className="grid" style={{ alignContent: 'start' }}>
          {p ? (
            <Card title={<span><span className="dot" style={{ background: p.color }} /> {p.name}</span>} right={<button className="btn sm ghost" onClick={() => select(null)}>Fermer</button>}>
              <p style={{ marginTop: 0 }}>{p.ideology}</p>
              <div className="grid g2" style={{ gap: 8 }}>
                <div><div className="small muted">Dirigeant</div>{leader ? <button className="chip" onClick={() => { selPerson(leader.id); setView('people') }}>{leader.name}</button> : '—'}</div>
                <div><div className="small muted">Famille</div>{FAM[p.family]}</div>
                <div><div className="small muted">Budget</div>{p.budget.toLocaleString('fr-FR')} M€/an</div>
                <div><div className="small muted">Fondé</div>{p.founded === '—' ? 'Historique' : fmtDate(p.founded)}</div>
              </div>
              <h4 style={{ margin: '14px 0 4px' }}>Indicateurs</h4>
              {([['Cohésion interne', p.cohesion], ['Implantation territoriale', p.territorial]] as const).map(([l, v]) => <div key={l} className="trait" style={{ gridTemplateColumns: '150px 1fr 28px' }}><span>{l}</span><Gauge value={v} color={p.color} /><b className="num">{Math.round(v)}</b></div>)}
              <p className="small"><b>Objectif :</b> {p.objective}</p>
              {alliance && <p className="small"><b>Alliance :</b> {alliance.name}</p>}
              <h4 style={{ margin: '12px 0 4px' }}>Courants internes</h4>
              {p.factions.map((f) => <div key={f.name} className="trait" style={{ gridTemplateColumns: '150px 1fr 38px' }}><span>{f.name}</span><Gauge value={f.share * 100} color={p.color} /><span className="num small">{Math.round(f.share * 100)} %</span></div>)}
              <h4 style={{ margin: '12px 0 4px' }}>Relations</h4>
              <div className="small muted">Plus proches</div><div className="chips">{rel.slice(0, 3).map(([id, v]) => <span key={id} className="chip"><PartyChip id={id} g={g} onClick={false} /> <span className="delta up">+{Math.round(v)}</span></span>)}</div>
              <div className="small muted" style={{ marginTop: 6 }}>Plus hostiles</div><div className="chips">{rel.slice(-3).reverse().map(([id, v]) => <span key={id} className="chip"><PartyChip id={id} g={g} onClick={false} /> <span className="delta down">{Math.round(v)}</span></span>)}</div>
              {p.history.length > 0 && <><h4 style={{ margin: '12px 0 4px' }}>Histoire</h4>{p.history.slice(-5).reverse().map((h, i) => <div key={i} className="small"><b>{fmtDate(h.date, true)}</b> — {h.text}</div>)}</>}
              <p className="small muted">Prochain congrès : {p.nextCongress.startsWith('2099') ? '—' : fmtDate(p.nextCongress)}</p>
            </Card>
          ) : <Card><p className="muted">Sélectionnez un parti pour voir sa fiche détaillée.</p></Card>}
          <Card title="Alliances">
            {g.alliances.length === 0 && <p className="muted">Aucune alliance.</p>}
            {[...g.alliances].reverse().map((a) => (
              <div key={a.id} style={{ marginBottom: 10, opacity: a.dissolved ? 0.55 : 1 }}>
                <b className="small">{a.name}</b> {a.dissolved && <span className="badge warn">dissoute</span>}
                <div className="chips">{a.partyIds.map((id) => <PartyChip key={id} id={id} g={g} />)}</div>
                <div className="small muted">Depuis le {fmtDate(a.formed, true)} · {a.purpose}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
