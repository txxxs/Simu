import { useMemo, useState } from 'react'
import { useGame } from '../store/game'
import { Card, Gauge, PartyChip } from './common'

export function PeoplePage() {
  const g = useGame((s) => s.game)!
  const selected = useGame((s) => s.selectedPerson)
  const select = useGame((s) => s.selectPerson)
  const narrate = useGame((s) => s.narrate)
  const [q, setQ] = useState('')
  const list = useMemo(() => Object.values(g.persons).filter((p) => p.active && (!q || (p.name + p.role).toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.popularity - a.popularity), [g.persons, q])
  const p = selected ? g.persons[selected] : null
  const rel = p ? Object.entries(p.relations).filter(([id]) => g.persons[id]?.active).sort((a, b) => b[1] - a[1]) : []
  const TR: [string, number][] = p ? [['Ambition', p.ambition], ['Pragmatisme', p.pragmatism], ['Loyauté', p.loyalty], ['Charisme', p.charisma], ['Intégrité', p.integrity], ['Aisance média', p.mediaSkill]] : []
  return (
    <div className="page">
      <h1>Personnages politiques</h1>
      <p className="lede">Chaque dirigeant a ses convictions, ses relations, ses ambitions et sa stratégie. Les profils sont des paramètres de simulation, pas des affirmations factuelles.</p>
      <div className="grid g-main">
        <Card title={`${list.length} personnalités`} right={<input type="text" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 200 }} />}>
          <div className="tablewrap"><table>
            <thead><tr><th>Nom</th><th>Fonction</th><th className="r">Popularité</th></tr></thead>
            <tbody>{list.map((x) => (
              <tr key={x.id} className="click" onClick={() => select(x.id)} style={x.id === selected ? { background: 'var(--surface-2)' } : undefined}>
                <td><span className="dot" style={{ background: g.parties[x.partyId ?? '']?.color ?? '#999' }} /> <b>{x.name}</b>{x.fictional && <span className="badge" style={{ marginLeft: 6 }}>fictif</span>}</td>
                <td className="small">{x.role}</td><td className="r num">{Math.round(x.popularity)} %</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
        {p ? (
          <Card title={p.name} right={<button className="btn sm ghost" onClick={() => select(null)}>Fermer</button>}>
            <p className="muted" style={{ marginTop: -6 }}>{p.role} · {p.age} ans</p>
            <p>{p.bio}</p>
            <div className="chips" style={{ marginTop: 0 }}>{p.partyId && <PartyChip id={p.partyId} g={g} />}<span className="chip">Stratégie : {p.strategy}</span></div>
            <h4 style={{ margin: '14px 0 4px' }}>Personnalité</h4>
            {TR.map(([l, v]) => <div key={l} className="trait"><span>{l}</span><Gauge value={v} color="var(--blue)" /><b className="num">{Math.round(v)}</b></div>)}
            <h4 style={{ margin: '12px 0 4px' }}>Convictions</h4>
            <div className="chips" style={{ marginTop: 0 }}>{p.convictions.map((c) => <span key={c} className="chip">{c}</span>)}</div>
            <h4 style={{ margin: '12px 0 4px' }}>Relations</h4>
            <div className="small muted">Alliés</div><div className="chips">{rel.slice(0, 3).map(([id, v]) => <button key={id} className="chip" onClick={() => select(id)}>{g.persons[id].name} <span className="delta up">+{Math.round(v)}</span></button>)}</div>
            <div className="small muted" style={{ marginTop: 6 }}>Rivaux</div><div className="chips">{rel.slice(-3).reverse().map(([id, v]) => <button key={id} className="chip" onClick={() => select(id)}>{g.persons[id].name} <span className="delta down">{Math.round(v)}</span></button>)}</div>
            <div className="row wrap" style={{ marginTop: 14 }}>
              <button className="btn sm" onClick={() => narrate(`${p.name} est invité(e) sur Info 24`)}>Interview</button>
              <button className="btn sm" onClick={() => narrate(`${p.name} prononce un discours`)}>Discours</button>
              <button className="btn sm" onClick={() => narrate(`Un scandale éclate autour de ${p.name}`)}>Scandale</button>
              <button className="btn sm" onClick={() => narrate(`${p.name} démissionne`)}>Démission</button>
            </div>
          </Card>
        ) : <Card><p className="muted">Sélectionnez une personnalité pour afficher sa fiche.</p></Card>}
      </div>
    </div>
  )
}
