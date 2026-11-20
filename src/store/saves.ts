import type { GameState } from '../engine/types'
import { SAVE_VERSION } from '../engine/scenario'
import { fmtDate } from '../engine/util'

const DB = 'hemicycle-saves'
const STORE = 'saves'

export interface SaveMeta { id: string; name: string; savedAt: string; gameDate: string; summary: string; auto: boolean }
interface SaveRow extends SaveMeta { data: GameState }

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' })
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open()
  return new Promise((res, rej) => {
    const rq = fn(db.transaction(STORE, mode).objectStore(STORE))
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })
}

const summaryOf = (g: GameState) => `${g.config.mode === 'reel' ? 'France réelle' : 'France alternative'} · ${g.chronicle.length} faits · ${g.polls.length} sondages`

export async function putSave(id: string, name: string, g: GameState, auto = false) {
  const row: SaveRow = { id, name, savedAt: new Date().toISOString(), gameDate: fmtDate(g.date), summary: summaryOf(g), auto, data: g }
  await tx('readwrite', (s) => s.put(row))
}
export async function listSaves(): Promise<SaveMeta[]> {
  const rows = await tx<SaveRow[]>('readonly', (s) => s.getAll() as IDBRequest<SaveRow[]>)
  return rows.map(({ data: _d, ...m }) => m).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}
export async function getSave(id: string): Promise<GameState | null> {
  const row = await tx<SaveRow | undefined>('readonly', (s) => s.get(id) as IDBRequest<SaveRow | undefined>)
  return row?.data ?? null
}
export const deleteSave = (id: string) => tx('readwrite', (s) => s.delete(id))

export interface SaveFile { format: 'hemicycle-save'; version: number; exportedAt: string; game: GameState }
export const toSaveFile = (g: GameState): SaveFile => ({ format: 'hemicycle-save', version: SAVE_VERSION, exportedAt: new Date().toISOString(), game: g })

/** Valide et migre un fichier de sauvegarde ; lève une erreur lisible si invalide. */
export function parseSaveFile(text: string): GameState {
  let j: unknown
  try { j = JSON.parse(text) } catch { throw new Error('Fichier illisible (JSON invalide).') }
  const f = j as Partial<SaveFile>
  const g = (f?.format === 'hemicycle-save' ? f.game : (j as GameState)) as GameState | undefined
  if (!g || typeof g !== 'object' || !g.parties || !g.persons || !Array.isArray(g.deputies) || !g.date) throw new Error('Ce fichier n’est pas une sauvegarde valide.')
  if (g.deputies.length !== 577 && g.deputies.length === 0) throw new Error('Sauvegarde incomplète : aucun député.')
  if ((g.version ?? 0) > SAVE_VERSION) throw new Error('Sauvegarde créée par une version plus récente du jeu.')
  g.version = SAVE_VERSION
  return g
}
