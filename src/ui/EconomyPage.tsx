import { useGame } from '../store/game'
import { Card, Delta, Gauge, fmtDate, pct } from './common'
import { Sparkline } from './Spark'

export function EconomyPage() {
  const g = useGame((s) => s.game)!
  const e = g.economy
  const ser = (k: 'growth' | 'unemployment' | 'inflation' | 'approval' | 'debt') => e.series.map((x) => x[k])
  const d = (k: 'growth' | 'unemployment' | 'inflation' | 'approval' | 'debt') => { const s = ser(k); return s.length > 3 ? s[s.length - 1] - s[s.length - 4] : undefined }
  const K: [string, string, number, 'growth' | 'unemployment' | 'inflation' | 'approval' | 'debt', string][] = [
    ['Croissance', '%', e.growth, 'growth', 'Variation annuelle du PIB'], ['Chômage', '%', e.unemployment, 'unemployment', 'Réagit lentement à la croissance'], ['Inflation', '%', e.inflation, 'inflation', 'Prix à la consommation'],
    ['Dette publique', '% PIB', e.debt, 'debt', 'Évolue avec déficit et croissance'], ['Popularité de l’exécutif', '%', e.approval, 'approval', 'Composite lent des indicateurs'],
  ]
  const IDX: [string, number][] = [['Pouvoir d’achat (base 100)', e.purchasing], ['Sécurité (insécurité perçue)', e.insecurity], ['Inégalités', e.inequality], ['Services publics', e.publicServices]]
  return (
    <div className="page">
      <h1>Économie & société</h1>
      <p className="lede">Les indicateurs évoluent progressivement ; les lois, crises et alternances les infléchissent, jamais de miracle sans cause.</p>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        {K.map(([l, u, v, k, sub]) => (
          <Card key={l}><div className="kpi"><span className="label">{l}</span><span className="value num">{pct(v)} <small style={{ fontSize: 14 }} className="muted">{u}</small></span><Sparkline values={ser(k)} /><span className="sub"><Delta v={d(k)} /> sur 3 mois · {sub}</span></div></Card>
        ))}
        <Card><div className="kpi"><span className="label">Déficit public</span><span className="value num">{pct(e.deficit)} <small style={{ fontSize: 14 }} className="muted">% PIB</small></span><span className="sub">Règle européenne de référence : 3 %</span><Gauge value={e.deficit} max={10} color={e.deficit > 3 ? 'var(--accent)' : 'var(--good)'} /></div></Card>
      </div>
      <div className="grid g2">
        <Card title="Indices de société">
          {IDX.map(([l, v]) => <div key={l} className="trait" style={{ gridTemplateColumns: '210px 1fr 44px' }}><span>{l}</span><Gauge value={Math.min(100, v)} max={l.startsWith('Pouvoir') ? 140 : 100} /><b className="num">{Math.round(v)}</b></div>)}
        </Card>
        <Card title="Crises en cours">
          {g.crises.filter((c) => c.ongoing).length === 0 ? <p className="muted">Aucune crise en cours.</p> : g.crises.filter((c) => c.ongoing).map((c) => <p key={c.id} style={{ margin: '6px 0' }}><span className="badge warn">gravité {c.severity}/5</span> <b>{c.title}</b> <span className="muted small">depuis le {fmtDate(c.start, true)}</span></p>)}
        </Card>
      </div>
    </div>
  )
}
