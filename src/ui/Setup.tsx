import { useState } from 'react'
import { useGame } from '../store/game'
import type { Realism, StartMode } from '../engine/types'
import { baseFor } from '../engine/scenario'

export function Setup() {
  const { newGame, saves, loadSave, importGame, llm } = useGame()
  const [name, setName] = useState('Ma partie')
  const [year, setYear] = useState(2024)
  const [mode, setMode] = useState<StartMode>('reel')
  const [realism, setRealism] = useState<Realism>('plausible')
  const [seed, setSeed] = useState('')
  const exact = year === 2022 || year === 2024
  const base = baseFor(year)
  const valid = Number.isFinite(year) && year >= 1958 && year <= 2100
  return (
    <div className="setup">
      <div className="panel">
        <div className="row" style={{ gap: 12 }}>
          <svg width="44" height="44" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#0f1b33" /><path d="M10 44a22 22 0 0 1 44 0" fill="none" stroke="#e63946" strokeWidth="6" /><path d="M20 44a12 12 0 0 1 24 0" fill="none" stroke="#fff" strokeWidth="6" /></svg>
          <span className="small muted" style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 800 }}>Simulateur politique français</span>
        </div>
        <h1>L’Hémicycle</h1>
        <p className="muted" style={{ maxWidth: '62ch' }}>Vous êtes le <b>narrateur</b> : vous écrivez l’histoire, le moteur simule un monde politique vivant — partis autonomes, sondages dynamiques, Parlement, médias, élections incertaines.</p>
        <div className="card" style={{ marginTop: 18 }}>
          <div className="field"><label htmlFor="gn">Nom de la partie</label><input id="gn" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></div>
          <div className="field">
            <label htmlFor="yr">1. Année de départ</label>
            <div className="row wrap">
              <input id="yr" type="number" min={1958} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ maxWidth: 130 }} />
              <div className="seg">{[2022, 2024, 2026, 2027, 2032].map((y) => <button key={y} aria-pressed={year === y} onClick={() => setYear(y)}>{y}</button>)}</div>
            </div>
            <span className="small muted">Données détaillées disponibles pour <b>2022</b> (lendemain des législatives) et <b>2024</b> (XVIIe législature). Pour une autre année, la situation la plus proche est transposée.</span>
            {!exact && valid && <div className="note">Approximation : le contexte de {base === 2022 ? 'juin 2022' : 'juillet 2024'} est transposé en {year}. Les institutions et échéances sont recalées sur cette date.</div>}
          </div>
          <div className="field">
            <span className="lab">2. France réelle ou alternative ?</span>
            <div className="choice c2">
              <button className="opt" aria-pressed={mode === 'reel'} onClick={() => setMode('reel')}><b>France réelle</b><span>Partis, dirigeants et rapports de force réels (approximatifs). L’histoire diverge ensuite.</span></button>
              <button className="opt" aria-pressed={mode === 'alternatif'} onClick={() => setMode('alternatif')}><b>France alternative</b><span>Un monde parallèle : rapports de force, dirigeants et partis modifiés.</span></button>
            </div>
          </div>
          <div className="field">
            <span className="lab">3. Niveau de réalisme</span>
            <div className="choice c3">
              {([['fidele', 'Fidèle', 'Événements rares et sobres, évolutions lentes. Proche de la réalité.'], ['plausible', 'Plausible', 'Rythme politique soutenu, surprises mesurées. Recommandé.'], ['libre', 'Libre', 'Monde agité : crises, scissions et ruptures fréquentes.']] as const).map(([k, t, d]) => (
                <button key={k} className="opt" aria-pressed={realism === k} onClick={() => setRealism(k)}><b>{t}</b><span>{d}</span></button>
              ))}
            </div>
          </div>
          <details style={{ marginBottom: 16 }}><summary className="small muted" style={{ cursor: 'pointer' }}>Options avancées</summary>
            <div className="field" style={{ marginTop: 8 }}><label htmlFor="sd">Graine aléatoire (même graine = même monde)</label><input id="sd" type="text" value={seed} placeholder="aléatoire" onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))} style={{ maxWidth: 200 }} /></div>
          </details>
          <div className="row wrap spread">
            <span className={`badge ${llm.available ? 'ok' : 'warn'}`}>{llm.available ? `IA Claude active (${llm.model})` : 'Mode hors-ligne (sans clé API)'}</span>
            <button className="btn primary" disabled={!valid} onClick={() => newGame({ name, year, mode, realism, seed: seed ? Number(seed) : undefined })}>Lancer la simulation →</button>
          </div>
        </div>
        {saves.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="cardhead"><h2>Reprendre une partie</h2></div>
            {saves.slice(0, 6).map((s) => (
              <div key={s.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span><b>{s.name}</b> <span className="muted small">· {s.gameDate} · {s.summary}</span></span>
                <button className="btn sm" onClick={() => loadSave(s.id)}>Charger</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <label className="btn ghost sm" style={{ display: 'inline-block' }}>Importer une sauvegarde (.json)<input type="file" accept=".json,application/json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) importGame(await f.text()); e.target.value = '' }} /></label>
        </div>
        <p className="small muted" style={{ marginTop: 18 }}>Œuvre de fiction. Les personnalités réelles apparaissent avec des profils simulés ; les événements, résultats et sondages sont inventés par la simulation et ne représentent pas des faits.</p>
      </div>
    </div>
  )
}
