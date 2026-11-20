import { create } from 'zustand'
import type { GameState, Op, StartConfig } from '../engine/types'
import { createGame } from '../engine/scenario'
import { advance, advanceToNextEvent } from '../engine/sim'
import { applyOps, generateMedia } from '../engine/ops'
import { interpretOffline } from '../engine/interpret'
import { sanitizeOps } from '../engine/bridge'
import { addNews, logChronicle } from '../engine/narrate'
import { fmtDate } from '../engine/util'
import { fetchStatus, llmCoverage, llmInterpret, llmMedia } from '../api/llm'
import { deleteSave, getSave, listSaves, parseSaveFile, putSave, toSaveFile, type SaveMeta } from './saves'

export type View = 'dashboard' | 'news' | 'polls' | 'parliament' | 'parties' | 'people' | 'elections' | 'history' | 'economy' | 'saves'

export interface NarrationResult { id: number; text: string; summary: string[]; warnings: string[]; source: 'ia' | 'regles'; date: string }

interface Store {
  game: GameState | null
  view: View
  llm: { available: boolean; model: string | null; enabled: boolean }
  busy: string | null
  toast: string | null
  results: NarrationResult[]
  saves: SaveMeta[]
  selectedParty: string | null
  selectedPerson: string | null
  init: () => Promise<void>
  setView: (v: View) => void
  selectParty: (id: string | null) => void
  selectPerson: (id: string | null) => void
  setLlmEnabled: (b: boolean) => void
  newGame: (cfg: Partial<StartConfig>) => void
  narrate: (text: string) => Promise<void>
  advanceDays: (d: number) => void
  advanceEvent: () => void
  requestMedia: (kind: 'interview' | 'debate' | 'speech', personIds: string[], topic?: string, outlet?: string) => Promise<void>
  updateSettings: (p: Partial<GameState['settings']>) => void
  refreshSaves: () => Promise<void>
  saveAs: (name: string) => Promise<void>
  loadSave: (id: string) => Promise<void>
  removeSave: (id: string) => Promise<void>
  exportGame: () => string
  importGame: (text: string) => void
  closeGame: () => void
  say: (m: string) => void
}

const LS_LLM = 'hemicycle.llm.enabled'
let rid = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined
let autoTimer: ReturnType<typeof setTimeout> | undefined

const readEnabled = () => { try { return localStorage.getItem(LS_LLM) !== '0' } catch { return true } }

export const useGame = create<Store>((set, get) => {
  const autosave = (g: GameState) => {
    clearTimeout(autoTimer)
    autoTimer = setTimeout(() => { putSave('auto', `Sauvegarde automatique — ${g.config.name}`, g, true).then(() => get().refreshSaves()).catch(() => {}) }, 600)
  }
  const commit = (g: GameState) => { set({ game: g }); autosave(g) }
  const say = (m: string) => { set({ toast: m }); clearTimeout(toastTimer); toastTimer = setTimeout(() => set({ toast: null }), 4200) }

  return {
    game: null, view: 'dashboard', llm: { available: false, model: null, enabled: readEnabled() }, busy: null, toast: null, results: [], saves: [], selectedParty: null, selectedPerson: null,
    say,
    async init() {
      const st = await fetchStatus()
      set({ llm: { available: st.llm, model: st.model, enabled: readEnabled() } })
      await get().refreshSaves()
    },
    setView: (view) => { set({ view }); try { window.scrollTo({ top: 0 }) } catch { /* ignore */ } },
    selectParty: (selectedParty) => set({ selectedParty }),
    selectPerson: (selectedPerson) => set({ selectedPerson }),
    setLlmEnabled(b) { try { localStorage.setItem(LS_LLM, b ? '1' : '0') } catch { /* ignore */ } set({ llm: { ...get().llm, enabled: b } }) },
    newGame(cfg) {
      const g = createGame(cfg)
      set({ game: g, view: 'dashboard', results: [], selectedParty: null, selectedPerson: null })
      autosave(g)
    },
    closeGame() { set({ game: null, results: [] }) },

    async narrate(text) {
      const cur = get().game
      if (!cur || !text.trim()) return
      const { llm } = get()
      const useLlm = llm.available && llm.enabled
      const g = structuredClone(cur)
      let ops: Op[] = []
      let source: 'ia' | 'regles' = 'regles'
      const notes: string[] = []
      set({ busy: useLlm ? 'L’IA interprète votre intervention…' : 'Interprétation…' })
      if (useLlm) {
        try {
          const r = await llmInterpret(g, text)
          ops = sanitizeOps(g, r.ops)
          notes.push(...(r.notes ?? []))
          if (ops.length) source = 'ia'
        } catch (e) { say(`IA indisponible (${(e as Error).message}) — interprétation par règles.`) }
      }
      if (!ops.length) { const r = interpretOffline(g, text); ops = r.ops; notes.push(...r.notes) }
      const c0 = g.chronicle.length
      logChronicle(g, 'narrateur', 'Intervention du narrateur', text)
      const res = applyOps(g, ops, text, { deferMedia: source === 'ia' })
      if (res.advanceDays) advance(g, res.advanceDays)
      const eventTitles = g.chronicle.slice(c0 + 1).filter((c) => c.type !== 'loi').map((c) => `${c.date} — ${c.title}: ${c.detail}`).slice(0, 5)
      g.narratorLog.push({ date: g.date, text, summary: res.summary })

      if (source === 'ia') {
        set({ busy: 'Rédaction de la couverture médiatique…' })
        try {
          for (const m of res.mediaRequests) {
            try {
              const out = await llmMedia(g, m.kind, m.personIds, m.topic, m.outlet)
              const p = g.persons[m.personIds[0]]
              addNews(g, { kind: m.kind, outlet: m.outlet ?? 'Info 24', importance: 2, partyIds: p?.partyId ? [p.partyId] : [], title: out.title ?? `${m.kind} — ${p?.name}`, body: out.intro ?? out.body ?? '', dialog: out.dialog?.slice(0, 24).map((d) => ({ speaker: String(d.speaker).slice(0, 60), text: String(d.text).slice(0, 1200) })), source: 'ia' })
              if (m.kind === 'speech' && out.body) g.news[g.news.length - 1].body = String(out.body).slice(0, 4000)
            } catch { generateMedia(g, m.kind, m.personIds, m.outlet, m.topic) }
          }
          if (eventTitles.length) {
            const cov = await llmCoverage(g, eventTitles)
            for (const it of (cov.items ?? []).slice(0, 5)) {
              if (!it.title || !it.body) continue
              const k = ['article', 'editorial', 'reaction'].includes(it.kind ?? '') ? (it.kind as 'article') : 'article'
              addNews(g, { kind: k, outlet: String(it.outlet ?? 'Info 24').slice(0, 40), title: String(it.title).slice(0, 160), body: String(it.body).slice(0, 900), partyIds: it.partyId && g.parties[it.partyId] ? [it.partyId] : [], importance: 2, source: 'ia' })
            }
          }
        } catch (e) { say(`Couverture IA indisponible : ${(e as Error).message}`) }
      }
      const result: NarrationResult = { id: ++rid, text, summary: res.summary.length ? res.summary : ['Aucune modification.'], warnings: [...res.warnings, ...notes], source, date: g.date }
      set({ results: [result, ...get().results].slice(0, 30), busy: null })
      commit(g)
    },

    advanceDays(d) {
      const cur = get().game
      if (!cur) return
      const g = structuredClone(cur)
      const n0 = g.news.length
      const from = g.date
      advance(g, d)
      commit(g)
      say(`${fmtDate(from, true)} → ${fmtDate(g.date, true)} : ${g.news.length - n0} nouvelles publiées.`)
    },
    advanceEvent() {
      const cur = get().game
      if (!cur) return
      const g = structuredClone(cur)
      const n0 = g.news.length
      const d = advanceToNextEvent(g)
      commit(g)
      say(`${d} jour(s) écoulé(s) jusqu’au prochain événement important (${g.news.length - n0} nouvelles).`)
    },

    async requestMedia(kind, personIds, topic, outlet) {
      const cur = get().game
      if (!cur) return
      const g = structuredClone(cur)
      const { llm } = get()
      set({ busy: 'Préparation du plateau…' })
      let done = false
      if (llm.available && llm.enabled) {
        try {
          const out = await llmMedia(g, kind, personIds, topic, outlet)
          const p = g.persons[personIds[0]]
          addNews(g, { kind, outlet: outlet ?? 'Info 24', importance: 2, partyIds: p?.partyId ? [p.partyId] : [], title: out.title ?? `${kind} — ${p?.name}`, body: kind === 'speech' ? String(out.body ?? '') : String(out.intro ?? ''), dialog: out.dialog?.slice(0, 24).map((d) => ({ speaker: String(d.speaker).slice(0, 60), text: String(d.text).slice(0, 1200) })), source: 'ia' })
          logChronicle(g, 'media', `${kind} : ${out.title ?? p?.name}`, '', [], personIds)
          done = true
        } catch (e) { say(`IA indisponible : ${(e as Error).message}`) }
      }
      if (!done) generateMedia(g, kind, personIds, outlet, topic)
      set({ busy: null })
      commit(g)
      set({ view: 'news' })
    },

    updateSettings(p) {
      const cur = get().game
      if (!cur) return
      const g = structuredClone(cur)
      g.settings = { ...g.settings, ...p }
      commit(g)
    },

    async refreshSaves() { try { set({ saves: await listSaves() }) } catch { set({ saves: [] }) } },
    async saveAs(name) {
      const g = get().game
      if (!g) return
      const id = `slot-${Date.now()}`
      await putSave(id, name.trim() || g.config.name, g)
      await get().refreshSaves()
      say('Partie sauvegardée.')
    },
    async loadSave(id) {
      const g = await getSave(id)
      if (!g) return say('Sauvegarde introuvable.')
      set({ game: g, view: 'dashboard', results: [] })
      say('Partie chargée.')
    },
    async removeSave(id) { await deleteSave(id); await get().refreshSaves() },
    exportGame() { const g = get().game; return g ? JSON.stringify(toSaveFile(g)) : '' },
    importGame(text) {
      try {
        const g = parseSaveFile(text)
        set({ game: g, view: 'dashboard', results: [] })
        autosave(g)
        say('Sauvegarde importée.')
      } catch (e) { say((e as Error).message) }
    },
  }
})
