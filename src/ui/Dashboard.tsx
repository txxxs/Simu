import { useGame } from '../store/game'
import { Card, Delta, Gauge, NewsCard, PartyChip, fmtDate, pct } from './common'
import { Hemicycle } from './Hemicycle'
import { seatMap, govSeats } from '../engine/parliament'
import { daysBetween } from '../engine/util'
import { Sparkline } from './Spark'

export function Dashboard() {
  const g = useGame((s) => s.game)!
  const setView = useGame((s) => s.setView)
  const poll = g.polls[g.polls.length - 1]
  const hero = [...g.news].reverse().find((n) => n.importance === 3 && n.kind !== 'reaction') ?? g.news[g.news.length - 1]
  const seats = seatMap(g)
  const gs = govSeats(g)
  const pres = g.president.personId ? g.persons[g.president.personId] : null
  const pm = g.government.pmId ? g.persons[g.government.pmId] : null
  const feed = [...g.news].reverse().filter((n) => n !== hero).slice(0, 8)
  const upcoming = g.calendar.filter((c) => c.date >= g.date && c.kind !== 'loi-etape').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6)
  const e = g.economy
  const prevApproval = e.series[e.series.length - 4]?.approval

  return (
    <div className="page">
      <h1>Tableau de bord</h1>
      <p className="lede">Vue d’ensemble de la situation politique au {fmtDate(g.date)}.</p>
      {hero && (
        <div className="hero" style={{ marginBottom: 16 }}>
          <span className="tag">{hero.kind === 'breaking' ? 'Flash' : 'À la une'}</span>
          <h2>{hero.title}</h2>
          <p>{hero.body.length > 520 ? hero.body.slice(0, 517) + '…' : hero.body}</p>
          <div className="meta">{hero.outlet} · {fmtDate(hero.date)}</div>
        </div>
      )}
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Card><div className="kpi"><span className="label">Président de la République</span><span className="value">{pres?.name ?? 'Vacance'}</span><span className="sub">{g.president.partyId ? g.parties[g.president.partyId]?.name : g.president.interim ? 'Intérim en cours' : ''}</span></div></Card>
        <Card><div className="kpi"><span className="label">Premier ministre</span><span className="value">{pm?.name ?? '—'}</span><span className="sub">{g.government.name}{g.government.caretaker ? ' · démissionnaire' : ''}{g.government.cohabitation ? ' · cohabitation' : ''}</span></div></Card>
        <Card>
          <div className="kpi"><span className="label">Majorité à l’Assemblée</span><span className="value num">{gs} <small className="muted" style={{ fontSize: 14 }}>/ 289</small></span>
            <Gauge value={gs} max={289} color={gs >= 289 ? 'var(--good)' : 'var(--accent)'} />
            <span className="sub">{gs >= 289 ? 'Majorité absolue' : `Il manque ${289 - gs} sièges`}</span></div>
        </Card>
        <Card>
          <div className="kpi"><span className="label">Popularité de l’exécutif</span><span className="value num">{Math.round(e.approval)} %</span>
            <Sparkline values={e.series.map((x) => x.approval)} />
            <span className="sub">{prevApproval !== undefined && <Delta v={e.approval - prevApproval} /> } sur 3 mois</span></div>
        </Card>
      </div>
      <div className="grid g-main">
        <div className="grid">
          {poll && (
            <Card title="Intentions de vote" right={<button className="btn sm" onClick={() => setView('polls')}>Détails</button>}>
              <p className="small muted" style={{ marginTop: -6 }}>{poll.institute} · {fmtDate(poll.date)} · échantillon {poll.sample} (±{pct(poll.moe)} pts) — sondage fictif</p>
              <div className="grid" style={{ gap: 7 }}>
                {poll.rows.slice(0, 9).map((r) => {
                  const p = g.parties[r.partyId]
                  return (
                    <div key={r.partyId} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 52px 58px', gap: 8, alignItems: 'center' }}>
                      <b>{p ? p.acronym : 'Autres'}</b>
                      <Gauge value={r.value} max={Math.max(40, poll.rows[0].value + 4)} color={p?.color ?? '#999'} />
                      <span className="num" style={{ textAlign: 'right' }}>{pct(r.value)} %</span>
                      <span style={{ textAlign: 'right' }}><Delta v={r.delta} sig={r.deltaSignificant} /></span>
                    </div>
                  )
                })}
              </div>
              {poll.analysis[0] && <p className="small" style={{ marginBottom: 0 }}>{poll.analysis.slice(0, 2).join(' ')}</p>}
            </Card>
          )}
          <Card title="Dernières nouvelles" right={<button className="btn sm" onClick={() => setView('news')}>Tout voir</button>}>
            <div className="feed">{feed.map((n) => <NewsCard key={n.id} n={n} g={g} />)}</div>
          </Card>
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <Card title="Assemblée nationale" right={<button className="btn sm" onClick={() => setView('parliament')}>Hémicycle</button>}>
            <Hemicycle g={g} compact />
            <div className="chips">{Object.entries(seats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => <span key={id} className="chip"><span className="dot" style={{ background: g.parties[id].color }} />{g.parties[id].acronym} {n}</span>)}</div>
          </Card>
          <Card title="Calendrier">
            {upcoming.length === 0 && <p className="muted">Aucune échéance programmée.</p>}
            {upcoming.map((c) => (
              <div key={c.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{c.title}</span>
                <span className="muted small num" style={{ whiteSpace: 'nowrap' }}>{fmtDate(c.date, true)} · J−{daysBetween(g.date, c.date)}</span>
              </div>
            ))}
          </Card>
          <Card title="Alliances en vigueur">
            {g.alliances.filter((a) => !a.dissolved).map((a) => (
              <div key={a.id} style={{ marginBottom: 8 }}>
                <b className="small">{a.name}</b>
                <div className="chips">{a.partyIds.map((p) => <PartyChip key={p} id={p} g={g} />)}</div>
              </div>
            ))}
            {!g.alliances.some((a) => !a.dissolved) && <p className="muted">Aucune alliance.</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}
