// Pont avec la couche IA : résumé compact de l'état (digest) et validation stricte des opérations renvoyées par le LLM.
import type { Family, GameState, LawDomain, Op } from './types'
import { fmtDate, pct } from './util'
import { seatMap } from './parliament'

export function buildDigest(s: GameState) {
  const seats = seatMap(s)
  const eff = [...s.polls].reverse()[0]
  return {
    date: s.date,
    dateLisible: fmtDate(s.date),
    realisme: s.config.realism,
    president: s.president.personId ? { id: s.president.personId, nom: s.persons[s.president.personId]?.name, parti: s.president.partyId } : null,
    gouvernement: { premierMinistre: s.government.pmId ? { id: s.government.pmId, nom: s.persons[s.government.pmId]?.name } : null, nom: s.government.name, partis: s.government.partyIds, demissionnaire: s.government.caretaker },
    partis: Object.values(s.parties).filter((p) => p.active).map((p) => ({
      id: p.id, nom: p.name, sigle: p.acronym, famille: p.family, lr: Number(p.lr.toFixed(2)), cult: Number(p.cult.toFixed(2)),
      dirigeant: p.leaderId ? { id: p.leaderId, nom: s.persons[p.leaderId]?.name } : null, sieges: seats[p.id] ?? 0,
      sondage: eff?.rows.find((r) => r.partyId === p.id)?.value ?? null, cohesion: Math.round(p.cohesion),
    })),
    alliances: s.alliances.filter((a) => !a.dissolved).map((a) => ({ id: a.id, nom: a.name, partis: a.partyIds })),
    personnalites: Object.values(s.persons).filter((p) => p.active).slice(0, 60).map((p) => ({ id: p.id, nom: p.name, parti: p.partyId, role: p.role, popularite: Math.round(p.popularity) })),
    economie: { chomage: pct(s.economy.unemployment), inflation: pct(s.economy.inflation), croissance: pct(s.economy.growth), approbationExecutif: Math.round(s.economy.approval) },
    prochainesEcheances: s.calendar.filter((c) => c.date >= s.date).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6).map((c) => ({ date: c.date, titre: c.title })),
    evenementsRecents: s.chronicle.slice(-12).map((c) => `${c.date} — ${c.title}`),
  }
}

const FAMILIES: Family[] = ['extreme-gauche', 'gauche', 'ecologiste', 'centre', 'droite', 'extreme-droite', 'regionaliste', 'divers']
const DOMAINS: LawDomain[] = ['retraites', 'immigration', 'fiscalite', 'securite', 'ecologie', 'sante', 'education', 'travail', 'institutions', 'autre']
const ELECTIONS = ['legislatives', 'presidentielle', 'europeennes', 'municipales', 'regionales', 'departementales', 'senatoriales']

const str = (v: unknown, max = 160) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined)
const num = (v: unknown, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : undefined)

export function sanitizeOps(s: GameState, raw: unknown): Op[] {
  if (!Array.isArray(raw)) return []
  const party = (v: unknown) => (typeof v === 'string' && (v === '$new' || s.parties[v]) ? v : undefined)
  const person = (v: unknown) => (typeof v === 'string' && s.persons[v] ? v : undefined)
  const out: Op[] = []
  for (const r of raw.slice(0, 8) as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue
    switch (r.op) {
      case 'create_party': {
        const name = str(r.name, 80)
        if (!name) break
        out.push({ op: 'create_party', name, acronym: str(r.acronym, 8), family: FAMILIES.includes(r.family as Family) ? (r.family as Family) : undefined, lr: num(r.lr, -1, 1), cult: num(r.cult, -1, 1), leaderName: str(r.leaderName, 60), supportShare: num(r.supportShare, 0, 25), fromPartyId: party(r.fromPartyId), seatShare: num(r.seatShare, 0, 0.7), ideology: str(r.ideology, 300), joinAllianceFamily: FAMILIES.includes(r.joinAllianceFamily as Family) ? (r.joinAllianceFamily as Family) : undefined })
        break
      }
      case 'dissolve_assembly': out.push({ op: 'dissolve_assembly', inDays: num(r.inDays, 20, 40) }); break
      case 'call_election': if (ELECTIONS.includes(r.kind as string)) out.push({ op: 'call_election', kind: r.kind as string, inDays: num(r.inDays, 5, 400) }); break
      case 'form_alliance': { const ids = (Array.isArray(r.partyIds) ? r.partyIds : []).map(party).filter(Boolean) as string[]; if (ids.length >= 2) out.push({ op: 'form_alliance', partyIds: ids, name: str(r.name, 90), purpose: ['electoral', 'gouvernementale', 'parlementaire'].includes(r.purpose as string) ? (r.purpose as 'electoral') : undefined, proposal: r.proposal === true }); break }
      case 'join_alliance': { const p = party(r.partyId); if (p) out.push({ op: 'join_alliance', partyId: p, allianceId: typeof r.allianceId === 'string' && s.alliances.some((a) => a.id === r.allianceId) ? r.allianceId : undefined, family: FAMILIES.includes(r.family as Family) ? (r.family as Family) : undefined }); break }
      case 'break_alliance': out.push({ op: 'break_alliance', partyId: party(r.partyId), allianceId: typeof r.allianceId === 'string' && s.alliances.some((a) => a.id === r.allianceId) ? r.allianceId : undefined }); break
      case 'split_party': { const p = party(r.partyId); if (p && p !== '$new') out.push({ op: 'split_party', partyId: p, newName: str(r.newName, 80), seatShare: num(r.seatShare, 0.05, 0.6), leaderName: str(r.leaderName, 60) }); break }
      case 'change_leader': { const p = party(r.partyId); if (p) out.push({ op: 'change_leader', partyId: p, newLeaderName: str(r.newLeaderName, 60) }); break }
      case 'resign': { const p = person(r.personId); if (p) out.push({ op: 'resign', personId: p }); break }
      case 'scandal': { const p = person(r.personId); const q = party(r.partyId); if (p || q) out.push({ op: 'scandal', personId: p, partyId: q, severity: num(r.severity, 1, 5), title: str(r.title, 120) }); break }
      case 'shock': { const q = party(r.partyId); const d = num(r.delta, -15, 15); if (q && d !== undefined) out.push({ op: 'shock', partyId: q, delta: d, durable: r.durable !== false, reason: str(r.reason, 140) }); break }
      case 'crisis': out.push({ op: 'crisis', kind: str(r.kind, 20) ?? 'politique', severity: num(r.severity, 1, 5), title: str(r.title, 120) }); break
      case 'protest': out.push({ op: 'protest', topic: str(r.topic, 80), severity: num(r.severity, 1, 5) }); break
      case 'censure_motion': out.push({ op: 'censure_motion', byPartyId: party(r.byPartyId) }); break
      case 'new_pm': out.push({ op: 'new_pm', personId: person(r.personId) }); break
      case 'reshuffle': out.push({ op: 'reshuffle' }); break
      case 'referendum': { const t = str(r.topic, 120); if (t) out.push({ op: 'referendum', topic: t }); break }
      case 'propose_law': { const t = str(r.title, 140); if (t) out.push({ op: 'propose_law', title: t, domain: DOMAINS.includes(r.domain as LawDomain) ? (r.domain as LawDomain) : 'autre', byGovernment: r.byGovernment !== false, partyId: party(r.partyId) }); break }
      case 'poll': out.push({ op: 'poll', realInstrument: str(r.realInstrument, 40) }); break
      case 'media': {
        const kind = ['interview', 'debate', 'speech'].includes(r.kind as string) ? (r.kind as 'interview') : undefined
        const ids = (Array.isArray(r.personIds) ? r.personIds : []).map(person).filter(Boolean) as string[]
        if (kind && ids.length) out.push({ op: 'media', kind, personIds: ids.slice(0, 3), outlet: str(r.outlet, 40), topic: str(r.topic, 80) })
        break
      }
      case 'advance_time': { const d = num(r.days, 1, 3650); if (d) out.push({ op: 'advance_time', days: Math.round(d) }); break }
      case 'note': { const t = str(r.text, 400); if (t) out.push({ op: 'note', text: t }); break }
    }
  }
  return out
}
