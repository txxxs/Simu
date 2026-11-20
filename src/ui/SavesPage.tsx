import { useRef, useState } from 'react'
import { useGame } from '../store/game'
import { Card, fmtDate } from './common'

export function SavesPage() {
  const g = useGame((s) => s.game)!
  const { saves, llm, saveAs, loadSave, removeSave, exportGame, importGame, closeGame, setLlmEnabled, updateSettings, say } = useGame()
  const [name, setName] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('hemicycle.theme') || 'auto' } catch { return 'auto' } })
  const applyTheme = (t: string) => {
    setTheme(t)
    try { localStorage.setItem('hemicycle.theme', t) } catch { /* ignore */ }
    if (t === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', t)
  }
  const download = () => {
    const blob = new Blob([exportGame()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${g.config.name.replace(/[^\w-]+/g, '_')}_${g.date}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const onFile = async (f?: File) => { if (f) importGame(await f.text()) }
  return (
    <div className="page">
      <h1>Parties & réglages</h1>
      <p className="lede">Sauvegardez, chargez, exportez votre partie. Une sauvegarde automatique est enregistrée dans votre navigateur après chaque action.</p>
      <div className="grid g2">
        <Card title="Partie en cours">
          <p style={{ marginTop: 0 }}><b>{g.config.name}</b><br /><span className="muted small">{g.config.mode === 'reel' ? 'France réelle (approximative)' : 'France alternative'} · réalisme « {g.config.realism} » · départ en {g.config.year} · aujourd’hui : {fmtDate(g.date)}</span></p>
          {g.baseNote && <p className="note info small">{g.baseNote}</p>}
          <div className="field"><label htmlFor="sn">Nom de la sauvegarde</label><input id="sn" type="text" value={name} placeholder={g.config.name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="row wrap">
            <button className="btn primary" onClick={() => { saveAs(name); setName('') }}>Sauvegarder</button>
            <button className="btn" onClick={download}>Exporter (.json)</button>
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(exportGame()).then(() => say('Sauvegarde copiée dans le presse-papiers.'), () => say('Copie impossible : utilisez l’export fichier.')) }}>Copier la sauvegarde</button>
            <button className="btn" onClick={() => file.current?.click()}>Importer…</button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '16px 0' }} />
          <button className="btn" onClick={() => { if (confirm('Quitter la partie en cours ? (Pensez à sauvegarder ; l’auto-sauvegarde est conservée.)')) closeGame() }}>Nouvelle partie…</button>
        </Card>
        <Card title="Réglages">
          <div className="field">
            <span className="lab">Intelligence artificielle (Claude)</span>
            <div className="row wrap">
              <span className={`badge ${llm.available ? 'ok' : 'warn'}`}>{llm.available ? `Serveur connecté · ${llm.model}` : 'Clé API non configurée'}</span>
              <label className="row small"><input type="checkbox" checked={llm.enabled} disabled={!llm.available} onChange={(e) => setLlmEnabled(e.target.checked)} /> Utiliser l’IA</label>
            </div>
            {!llm.available && <p className="note small" style={{ margin: '6px 0 0' }}>Mode hors-ligne : interprétation par règles et textes générés localement. Pour activer l’IA, copiez <code>.env.example</code> en <code>.env</code>, renseignez <code>ANTHROPIC_API_KEY</code> et relancez le serveur. La clé reste côté serveur.</p>}
          </div>
          <div className="field">
            <label htmlFor="ps">Taille d’échantillon des sondages</label>
            <select id="ps" value={g.settings.pollSample} onChange={(e) => updateSettings({ pollSample: Number(e.target.value) })}>
              {[500, 800, 1000, 1200, 2000, 5000].map((n) => <option key={n} value={n}>{n} personnes (marge ≈ ±{(1.96 * Math.sqrt((1.3 * 0.21) / n) * 100).toFixed(1)} pts)</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="pf">Fréquence des sondages (hors campagne)</label>
            <select id="pf" value={g.settings.pollEveryDays} onChange={(e) => updateSettings({ pollEveryDays: Number(e.target.value) })}>
              {[7, 14, 21, 30].map((n) => <option key={n} value={n}>tous les {n} jours</option>)}
            </select>
          </div>
          <div className="field">
            <span className="lab">Thème</span>
            <div className="seg" style={{ alignSelf: 'flex-start' }}>{(['auto', 'light', 'dark'] as const).map((t) => <button key={t} aria-pressed={theme === t} onClick={() => applyTheme(t)}>{t === 'auto' ? 'Auto' : t === 'light' ? 'Clair' : 'Sombre'}</button>)}</div>
          </div>
        </Card>
      </div>
      <Card title="Sauvegardes dans ce navigateur" right={<span className="small muted">{saves.length}</span>}>
        {saves.length === 0 && <p className="muted">Aucune sauvegarde pour l’instant.</p>}
        <div className="tablewrap"><table>
          <thead><tr><th>Nom</th><th>Date du jeu</th><th>Enregistrée le</th><th /></tr></thead>
          <tbody>{saves.map((s) => (
            <tr key={s.id}><td><b>{s.name}</b> {s.auto && <span className="badge">auto</span>}<div className="small muted">{s.summary}</div></td><td>{s.gameDate}</td><td className="small">{new Date(s.savedAt).toLocaleString('fr-FR')}</td>
              <td className="r"><button className="btn sm" onClick={() => loadSave(s.id)}>Charger</button> <button className="btn sm ghost" onClick={() => removeSave(s.id)}>Supprimer</button></td></tr>))}</tbody>
        </table></div>
      </Card>
    </div>
  )
}
