import type { GameState, Op } from '../engine/types'
import { buildDigest } from '../engine/bridge'

export interface LlmStatus { llm: boolean; model: string | null }

async function post<T>(url: string, body: unknown, timeout = 60000): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`)
    return j as T
  } finally {
    clearTimeout(t)
  }
}

export async function fetchStatus(): Promise<LlmStatus> {
  try {
    const r = await fetch('/api/status')
    if (!r.ok) return { llm: false, model: null }
    return await r.json()
  } catch {
    return { llm: false, model: null }
  }
}

export const llmInterpret = (s: GameState, text: string) => post<{ ops: unknown[]; notes: string[] }>('/api/interpret', { digest: buildDigest(s), text })

export interface NarratedItem { kind?: string; outlet?: string; title?: string; body?: string; partyId?: string }
export interface NarratedMedia { title?: string; intro?: string; body?: string; dialog?: { speaker: string; text: string }[] }

export const llmCoverage = (s: GameState, events: string[]) => post<{ items: NarratedItem[] }>('/api/narrate', { kind: 'articles', digest: buildDigest(s), events })
export const llmMedia = (s: GameState, kind: Extract<Op, { op: 'media' }>['kind'], personIds: string[], topic?: string, outlet?: string) =>
  post<NarratedMedia>('/api/narrate', {
    kind,
    digest: buildDigest(s),
    subject: { personnes: personIds.map((id) => ({ id, nom: s.persons[id]?.name, parti: s.persons[id]?.partyId, convictions: s.persons[id]?.convictions, lr: s.persons[id]?.lr })), sujet: topic, media: outlet },
  })
