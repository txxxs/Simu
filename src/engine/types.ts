// Modèle de données du simulateur. Tout l'état de la partie est sérialisable en JSON.

export type Family =
  | 'extreme-gauche'
  | 'gauche'
  | 'ecologiste'
  | 'centre'
  | 'droite'
  | 'extreme-droite'
  | 'regionaliste'
  | 'divers'

export type Realism = 'fidele' | 'plausible' | 'libre'
export type StartMode = 'reel' | 'alternatif'

export interface StartConfig {
  year: number
  mode: StartMode
  realism: Realism
  name: string
  seed: number
}

export interface Faction {
  name: string
  share: number // part des adhérents/élus (0..1)
  lrShift: number // décalage idéologique par rapport à la ligne officielle
  leaderId?: string
}

export interface Party {
  id: string
  name: string
  acronym: string
  color: string
  family: Family
  lr: number // axe gauche (-1) / droite (+1)
  cult: number // axe progressiste (-1) / conservateur (+1)
  ideology: string
  leaderId: string | null
  members: number
  budget: number // M€ / an
  support: number // intentions de vote « de fond » (somme = 100)
  territorial: number // implantation 0..100
  cohesion: number // 0..100 (cohésion interne)
  rejection: number // 0..1, rejet par l'électorat non acquis (barrage)
  transfer: number // 0..1, capacité à bénéficier des reports de voix
  oppositionStyle: number // 0..1, propension à censurer le gouvernement
  regional: boolean
  pseudo: boolean // groupe fourre-tout (non-inscrits…) : n'agit pas
  real: boolean // parti existant dans la réalité
  active: boolean
  founded: string
  factions: Faction[]
  objective: string
  relations: Record<string, number> // -100..100 vers les autres partis
  nextCongress: string
  history: { date: string; text: string }[]
}

export interface Person {
  id: string
  name: string
  partyId: string | null
  role: string
  age: number
  bio: string
  ambition: number
  pragmatism: number
  loyalty: number
  charisma: number
  integrity: number
  mediaSkill: number
  lr: number
  cult: number
  popularity: number
  strategy: string
  relations: Record<string, number>
  fictional: boolean
  active: boolean
  convictions: string[]
}

export interface Deputy {
  id: string
  name: string
  partyId: string
  circo: string
  region: string
  rebel: number // 0..1 tendance à voter contre la consigne
}

export interface Alliance {
  id: string
  name: string
  partyIds: string[]
  formed: string
  purpose: 'electoral' | 'gouvernementale' | 'parlementaire'
  dissolved?: string
  history: { date: string; text: string }[]
}

export interface Shock {
  id: string
  partyId: string
  delta: number
  start: string
  halfLife: number // jours
  reason: string
}

export interface PollResultRow {
  partyId: string // ou 'autres'
  value: number // %, 1 décimale
  delta?: number
  deltaSignificant?: boolean
  smoothed: number
}

export interface Poll {
  id: string
  date: string
  institute: string
  disclaimer: string
  sample: number
  moe: number // marge d'erreur 95 % pour 30 %
  kind: 'legislatives' | 'presidentielle'
  rows: PollResultRow[]
  analysis: string[]
  truth?: Record<string, number> // niveau réel caché (vue du MJ)
}

export type NewsKind =
  | 'breaking'
  | 'headline'
  | 'article'
  | 'editorial'
  | 'communique'
  | 'reaction'
  | 'interview'
  | 'debate'
  | 'speech'
  | 'poll'
  | 'result'
  | 'conference'

export interface NewsItem {
  id: string
  date: string
  kind: NewsKind
  outlet: string
  title: string
  body: string
  partyIds: string[]
  importance: 1 | 2 | 3
  dialog?: { speaker: string; partyId?: string | null; text: string }[]
  source: 'moteur' | 'ia' | 'narrateur'
}

export interface ChronicleEntry {
  id: string
  date: string
  type: string
  title: string
  detail: string
  partyIds: string[]
  personIds: string[]
}

export interface CalendarEvent {
  id: string
  date: string
  kind: string // 'election' | 'congres' | 'loi' | 'budget' | 'investiture' | ...
  title: string
  payload?: Record<string, unknown>
}

export interface ElectionResult {
  id: string
  date: string
  kind: string
  title: string
  turnout: number
  shares: Record<string, number>
  seats?: Record<string, number>
  rounds?: { label: string; shares: Record<string, number> }[]
  winner?: string
  note: string
}

export type LawDomain =
  | 'retraites'
  | 'immigration'
  | 'fiscalite'
  | 'securite'
  | 'ecologie'
  | 'sante'
  | 'education'
  | 'travail'
  | 'institutions'
  | 'autre'

export interface Law {
  id: string
  title: string
  domain: LawDomain
  lr: number
  cult: number
  authorPartyId: string | null
  government: boolean
  stage: string
  status: 'en cours' | 'adoptée' | 'rejetée' | 'censurée' | 'retirée'
  filed: string
  votes: { label: string; date: string; pour: number; contre: number; abst: number }[]
  summary: string
}

export interface Economy {
  growth: number
  unemployment: number
  inflation: number
  debt: number // % du PIB
  deficit: number // % du PIB
  purchasing: number // indice pouvoir d'achat (100 = départ)
  insecurity: number // indice 0..100
  inequality: number // indice 0..100
  publicServices: number // indice 0..100
  approval: number // popularité de l'exécutif 0..100
  series: { date: string; growth: number; unemployment: number; inflation: number; approval: number; debt: number }[]
}

export interface Crisis {
  id: string
  title: string
  kind: string
  start: string
  severity: number
  ongoing: boolean
}

export interface Government {
  pmId: string | null
  name: string
  partyIds: string[]
  formed: string
  stability: number // 0..100
  cohabitation: boolean
  caretaker: boolean
}

export interface Settings {
  pollSample: number
  pollEveryDays: number
}

export interface GameState {
  version: number
  config: StartConfig
  date: string
  rng: number
  counter: number
  baseNote: string
  president: { personId: string | null; partyId: string | null; since: string; interim: boolean }
  assemblyPresidentId: string | null
  government: Government
  parties: Record<string, Party>
  persons: Record<string, Person>
  alliances: Alliance[]
  deputies: Deputy[]
  senate: Record<string, number>
  lastLegislative: string
  lastDissolution: string | null
  shocks: Shock[]
  polls: Poll[]
  news: NewsItem[]
  chronicle: ChronicleEntry[]
  calendar: CalendarEvent[]
  elections: ElectionResult[]
  laws: Law[]
  crises: Crisis[]
  economy: Economy
  institutional: { date: string; text: string }[]
  narratorLog: { date: string; text: string; summary: string[] }[]
  settings: Settings
}

// ---------- Opérations (interprétation des interventions du narrateur) ----------

export type Op =
  | {
      op: 'create_party'
      name: string
      acronym?: string
      family?: Family
      lr?: number
      cult?: number
      leaderName?: string
      supportShare?: number
      fromPartyId?: string
      seatShare?: number
      ideology?: string
      joinAllianceFamily?: Family
    }
  | { op: 'dissolve_assembly'; inDays?: number }
  | { op: 'call_election'; kind: string; inDays?: number }
  | { op: 'form_alliance'; name?: string; partyIds: string[]; purpose?: Alliance['purpose']; proposal?: boolean }
  | { op: 'join_alliance'; partyId: string; allianceId?: string; family?: Family }
  | { op: 'break_alliance'; allianceId?: string; partyId?: string }
  | { op: 'split_party'; partyId: string; newName?: string; seatShare?: number; leaderName?: string }
  | { op: 'change_leader'; partyId: string; newLeaderName?: string }
  | { op: 'resign'; personId: string }
  | { op: 'scandal'; partyId?: string; personId?: string; severity?: number; title?: string }
  | { op: 'shock'; partyId: string; delta: number; durable?: boolean; reason?: string }
  | { op: 'crisis'; kind: string; severity?: number; title?: string }
  | { op: 'protest'; topic?: string; severity?: number }
  | { op: 'censure_motion'; byPartyId?: string }
  | { op: 'new_pm'; personId?: string }
  | { op: 'reshuffle' }
  | { op: 'referendum'; topic: string }
  | { op: 'propose_law'; title: string; domain?: LawDomain; byGovernment?: boolean; partyId?: string }
  | { op: 'poll'; institute?: string; realInstrument?: string }
  | { op: 'media'; kind: 'interview' | 'debate' | 'speech'; personIds: string[]; outlet?: string; topic?: string }
  | { op: 'advance_time'; days: number }
  | { op: 'note'; text: string }

export interface OpResult {
  summary: string[]
  warnings: string[]
  advanceDays: number
  mediaRequests: { kind: 'interview' | 'debate' | 'speech'; personIds: string[]; outlet?: string; topic?: string }[]
  needsNarration: ChronicleEntry[]
}
