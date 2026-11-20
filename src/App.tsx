import type React from 'react'
import { useEffect, useState } from 'react'
import { useGame, type View } from './store/game'
import { Icon, VIEWS, fmtDate } from './ui/common'
import { Setup } from './ui/Setup'
import { Dashboard } from './ui/Dashboard'
import { NewsPage } from './ui/NewsPage'
import { PollsPage } from './ui/PollsPage'
import { ParliamentPage } from './ui/ParliamentPage'
import { PartiesPage } from './ui/PartiesPage'
import { PeoplePage } from './ui/PeoplePage'
import { ElectionsPage } from './ui/ElectionsPage'
import { HistoryPage } from './ui/HistoryPage'
import { EconomyPage } from './ui/EconomyPage'
import { SavesPage } from './ui/SavesPage'
import { Narrator } from './ui/Narrator'

const PAGES: Record<View, () => React.ReactElement> = {
  dashboard: Dashboard, news: NewsPage, polls: PollsPage, parliament: ParliamentPage, parties: PartiesPage, people: PeoplePage, elections: ElectionsPage, history: HistoryPage, economy: EconomyPage, saves: SavesPage,
}
const PRIMARY: View[] = ['dashboard', 'news', 'polls', 'parliament']

export default function App() {
  const { game, view, setView, init, toast, busy, llm, advanceDays, advanceEvent } = useGame()
  const [more, setMore] = useState(false)
  useEffect(() => {
    init()
    try { const t = localStorage.getItem('hemicycle.theme'); if (t && t !== 'auto') document.documentElement.setAttribute('data-theme', t) } catch { /* ignore */ }
  }, [init])
  if (!game) return <><Setup />{toast && <div className="toast" role="status">{toast}</div>}</>
  const Page = PAGES[view]
  return (
    <div className="shell">
      <nav className="nav" aria-label="Navigation principale">
        <div className="brand">
          <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#1b2c52" /><path d="M10 44a22 22 0 0 1 44 0" fill="none" stroke="#e63946" strokeWidth="6" /><path d="M20 44a12 12 0 0 1 24 0" fill="none" stroke="#fff" strokeWidth="6" /></svg>
          <div><b>L’Hémicycle</b><span>Mode narrateur</span></div>
        </div>
        {VIEWS.map((v) => <button key={v.id} aria-current={view === v.id ? 'page' : undefined} onClick={() => setView(v.id)}><Icon name={v.icon} />{v.label}</button>)}
        <div className="sp" />
        <div className="foot">{game.config.name}<br />{game.config.mode === 'reel' ? 'France réelle' : 'France alternative'} · {game.config.realism}<br />{llm.available && llm.enabled ? '● IA active' : '○ Mode hors-ligne'}</div>
      </nav>
      <div className="main">
        <header className="topbar">
          <div className="dateblock"><b>{fmtDate(game.date)}</b><span>{game.government.name}</span></div>
          <div className="grow" />
          <div className="seg" role="group" aria-label="Faire avancer le temps">
            <button onClick={() => advanceDays(1)} disabled={!!busy}>+1 j</button>
            <button onClick={() => advanceDays(7)} disabled={!!busy}>+1 sem.</button>
            <button onClick={() => advanceDays(30)} disabled={!!busy}>+1 mois</button>
            <button onClick={() => advanceDays(365)} disabled={!!busy}>+1 an</button>
            <button onClick={() => advanceEvent()} disabled={!!busy} title="Jusqu’au prochain événement important">⏭ Événement</button>
          </div>
        </header>
        <Page />
      </div>
      <Narrator />
      <nav className="tabbar mobile-only" aria-label="Navigation mobile">
        {PRIMARY.map((id) => { const v = VIEWS.find((x) => x.id === id)!; return <button key={id} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}><Icon name={v.icon} />{v.label.split(' ')[0]}</button> })}
        <button onClick={() => setMore(true)} aria-current={!PRIMARY.includes(view) ? 'page' : undefined}><Icon name="more" />Plus</button>
      </nav>
      {more && (
        <div className="sheet" onClick={() => setMore(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            {VIEWS.filter((v) => !PRIMARY.includes(v.id)).map((v) => <button key={v.id} onClick={() => { setView(v.id); setMore(false) }}>{v.label}</button>)}
          </div>
        </div>
      )}
      {busy && <div className="busy" role="status"><span className="spin" />{busy}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
