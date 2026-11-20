import type { GameState, Op } from '../engine/types'
import { buildDigest } from '../engine/bridge'

import { OPS_SCHEMA, SPECS, SYSTEM_BASE } from './prompts'

export interface LlmStatus { llm: boolean; model: string | null }

type Sample = (input: string, opts?: { modelTier?: 'quick' | 'default' | 'complex' }) => Promise<{ text: string }>
let backend: 'server' | 'sample' | null = null
let samplePromise: Promise<Sample | null> | null = null

function getSample(): Promise<Sample | null> {
  samplePromise ??= (async () => {
    try {
      const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude
      if (!c?.use) return null
      return ((await c.use('sample')) as Sample | null) ?? null
    } catch { return null }
  })()
  return samplePromise
}

function extractJSON(text: string): Record<string, unknown> {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  if (a < 0 || b < 0) throw new Error('Réponse IA non exploitable')
  return JSON.parse(text.slice(a, b + 1))
}

async function viaSample(system: string, payload: unknown): Promise<Record<string, unknown>> {
  const sample = await getSample()
  if (!sample) throw new Error('IA indisponible')
  const r = await sample(`${system}\n\nDONNÉES (JSON) :\n${JSON.stringify(payload)}`, { modelTier: 'default' })
  return extractJSON(r.text)
}

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

/** Détecte la source d'IA : serveur (clé côté serveur) ou, sur la page publiée, Claude via le compte du lecteur. */
export async function fetchStatus(): Promise<LlmStatus> {
  try {
    const r = await fetch('/api/status')
    if (r.ok) {
      const j = (await r.json()) as LlmStatus
      if (j.llm) { backend = 'server'; return j }
    }
  } catch { /* pas de serveur */ }
  if (await getSample()) { backend = 'sample'; return { llm: true, model: 'Claude (votre compte)' } }
  return { llm: false, model: null }
}

export async function llmInterpret(s: GameState, text: string): Promise<{ ops: unknown[]; notes: string[] }> {
  if (backend === 'sample') {
    const out = await viaSample(`${SYSTEM_BASE}\nTâche : traduire l'intervention du narrateur en opérations structurées.\n${OPS_SCHEMA}\nFormat de sortie : {"ops":[...],"notes":["remarques éventuelles"]}`, { digest: buildDigest(s), intervention: text.slice(0, 1500) })
    return { ops: Array.isArray(out.ops) ? out.ops.slice(0, 8) : [], notes: Array.isArray(out.notes) ? out.notes.slice(0, 5).map(String) : [] }
  }
  return post('/api/interpret', { digest: buildDigest(s), text })
}

export interface NarratedItem { kind?: string; outlet?: string; title?: string; body?: string; partyId?: string }
export interface NarratedMedia { title?: string; intro?: string; body?: string; dialog?: { speaker: string; text: string }[] }

async function narrate<T>(kind: string, payload: Record<string, unknown>): Promise<T> {
  if (backend === 'sample') return (await viaSample(`${SYSTEM_BASE}\n${SPECS[kind]}`, payload)) as T
  return post<T>('/api/narrate', { kind, ...payload })
}

export const llmCoverage = (s: GameState, events: string[]) => narrate<{ items: NarratedItem[] }>('articles', { digest: buildDigest(s), events })
export const llmMedia = (s: GameState, kind: Extract<Op, { op: 'media' }>['kind'], personIds: string[], topic?: string, outlet?: string) =>
  narrate<NarratedMedia>(kind, {
    digest: buildDigest(s),
    subject: { personnes: personIds.map((id) => ({ id, nom: s.persons[id]?.name, parti: s.persons[id]?.partyId, convictions: s.persons[id]?.convictions, lr: s.persons[id]?.lr })), sujet: topic, media: outlet },
  })
