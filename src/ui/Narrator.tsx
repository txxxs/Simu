import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/game'

const QUICK: [string, string][] = [
  ['Dissolution', 'Le président annonce la dissolution de l’Assemblée nationale'],
  ['Sondage', 'Un sondage apparaît'],
  ['Scandale', 'Un scandale éclate autour du président du RN'],
  ['Alliance', 'Le PS et les Écologistes s’allient'],
  ['Scission', 'Scission au sein du PS'],
  ['Censure', 'LFI dépose une motion de censure'],
  ['Crise', 'Une crise économique grave éclate'],
  ['Manifestation', 'Grande manifestation contre la réforme des retraites'],
  ['Nouveau parti', 'Un nouveau parti communiste est créé et rejoint une alliance d’extrême gauche'],
  ['Interview', 'Le Premier ministre est invité sur Info 24'],
  ['Discours', 'Le président réagit à la situation'],
  ['Remaniement', 'Le Premier ministre annonce un remaniement'],
]

export function Narrator() {
  const { narrate, busy, results, llm } = useGame()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const ta = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { if (results.length) setOpen(true) }, [results.length])
  const send = async () => {
    const t = text.trim()
    if (!t || busy) return
    setText('')
    await narrate(t)
  }
  return (
    <div className="console" role="region" aria-label="Console du narrateur">
      <div className="box">
        <label className="tag" htmlFor="narr">
          Console du narrateur
          <span className="badge" style={{ textTransform: 'none', letterSpacing: 0 }}>{llm.available && llm.enabled ? 'IA' : 'règles'}</span>
          <span className="grow" />
          {results.length > 0 && <button className="btn sm ghost" onClick={() => setOpen(!open)}>{open ? 'Masquer' : `Historique (${results.length})`}</button>}
        </label>
        {open && results.length > 0 && (
          <div className="results" aria-live="polite">
            {results.slice(0, 6).map((r) => (
              <div key={r.id} className="res">
                <b>« {r.text} »</b> <span className="muted small">· {r.source === 'ia' ? 'interprété par l’IA' : 'interprété par les règles'}</span>
                <ul>{r.summary.map((s, i) => <li key={i}>{s}</li>)}{r.warnings.map((w, i) => <li key={`w${i}`} className="warn">⚠ {w}</li>)}</ul>
              </div>
            ))}
          </div>
        )}
        <div className="inputrow">
          <textarea
            id="narr" ref={ta} rows={1} value={text} placeholder="Annoncez un événement : « Le président annonce une dissolution »…"
            onChange={(e) => { setText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px' }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
          <button className="btn primary" onClick={send} disabled={!text.trim() || !!busy}>Annoncer</button>
        </div>
        <div className="quick">
          {QUICK.map(([l, t]) => <button key={l} className="chip" onClick={() => { setText(t); ta.current?.focus() }}>{l}</button>)}
        </div>
      </div>
    </div>
  )
}
