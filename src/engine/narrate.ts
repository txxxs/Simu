// Couche narrative hors-ligne : titres, communiqués, réactions, éditoriaux.
// (La couche IA, quand elle est disponible, enrichit ces textes via le serveur.)
import type { ChronicleEntry, GameState, NewsItem, NewsKind, Party } from './types'
import { chance, pick, rand, shuffle } from './rng'
import { fmtDate, pct, uid } from './util'
import { prox } from './polls'

export const OUTLETS = [
  { id: 'info24', name: 'Info 24', slant: 'neutre', type: 'Chaîne d’information en continu' },
  { id: 'jt20', name: 'Journal de 20 h', slant: 'neutre', type: 'Télévision généraliste' },
  { id: 'quotidien', name: 'Le Quotidien', slant: 'centre', type: 'Presse nationale' },
  { id: 'courrier', name: 'Le Courrier de Paris', slant: 'droite', type: 'Presse nationale' },
  { id: 'rappel', name: 'Le Rappel', slant: 'gauche', type: 'Presse nationale' },
  { id: 'radio', name: 'Radio Publique', slant: 'neutre', type: 'Radio du service public' },
] as const

export interface GameEvent {
  type: string
  title: string
  detail: string
  partyIds: string[]
  personIds?: string[]
  importance: 1 | 2 | 3
  tone?: 'positif' | 'negatif' | 'neutre'
  subject?: string // parti principalement concerné
  kind?: NewsKind
  reactions?: boolean
  editorial?: boolean
}

export function logChronicle(s: GameState, type: string, title: string, detail: string, partyIds: string[] = [], personIds: string[] = []): ChronicleEntry {
  const e: ChronicleEntry = { id: uid(s, 'ch'), date: s.date, type, title, detail, partyIds, personIds }
  s.chronicle.push(e)
  return e
}

export function addNews(s: GameState, n: Partial<NewsItem> & { title: string; body: string; kind: NewsKind }): NewsItem {
  const item: NewsItem = {
    id: uid(s, 'n'),
    date: s.date,
    outlet: 'Info 24',
    partyIds: [],
    importance: 1,
    source: 'moteur',
    ...n,
  }
  s.news.push(item)
  return item
}

const REACT: Record<string, Record<'pro' | 'con' | 'neutre', string[]>> = {
  'extreme-gauche': {
    pro: ['« Voilà qui va dans le bon sens pour celles et ceux qui travaillent. Nous resterons vigilants », a réagi {leader} ({acr}).', '{leader} ({acr}) salue « une avancée arrachée par la mobilisation ».'],
    con: ['« C’est un choix de classe, une provocation sociale. Nous nous y opposerons partout », a lancé {leader} ({acr}).', '{leader} ({acr}) dénonce « un coup de force contre les classes populaires ».'],
    neutre: ['{leader} ({acr}) renvoie dos à dos « les jeux d’appareils » et appelle à « parler du fond ».'],
  },
  gauche: {
    pro: ['« C’est une bonne nouvelle pour le pays, nous y prendrons notre part », a déclaré {leader} ({acr}).', '{leader} ({acr}) y voit « un pas dans la bonne direction, à condition que les actes suivent ».'],
    con: ['« Nous ne cautionnerons pas cette dérive », a averti {leader} ({acr}).', '{leader} ({acr}) regrette « une occasion manquée de rassembler ».'],
    neutre: ['{leader} ({acr}) appelle « à la responsabilité de tous » et juge qu’« il faut attendre de voir ».'],
  },
  ecologiste: {
    pro: ['{leader} ({acr}) se félicite d’« une décision qui prend enfin la mesure du moment ».', '« C’est cohérent avec l’urgence climatique et sociale », a commenté {leader} ({acr}).'],
    con: ['{leader} ({acr}) fustige « une décision à contretemps de l’urgence écologique ».', '« On avance à reculons », a déploré {leader} ({acr}).'],
    neutre: ['{leader} ({acr}) demande « des garanties concrètes » avant de se prononcer.'],
  },
  centre: {
    pro: ['« Nous soutenons cette démarche, qui va dans le sens de la stabilité », a affirmé {leader} ({acr}).', '{leader} ({acr}) y voit « un choix de responsabilité ».'],
    con: ['{leader} ({acr}) s’inquiète d’« une décision qui fragilise l’équilibre des institutions ».', '« Ce n’est pas la bonne méthode », a regretté {leader} ({acr}).'],
    neutre: ['{leader} ({acr}) appelle à « garder la tête froide » et à « privilégier le compromis ».'],
  },
  droite: {
    pro: ['« C’est ce que nous réclamions depuis longtemps », a salué {leader} ({acr}).', '{leader} ({acr}) approuve « une décision de bon sens ».'],
    con: ['« Le gouvernement navigue à vue, et les Français en paient le prix », a tancé {leader} ({acr}).', '{leader} ({acr}) dénonce « une improvisation de plus ».'],
    neutre: ['{leader} ({acr}) dit « regarder les textes de près » avant de se prononcer.'],
  },
  'extreme-droite': {
    pro: ['« Enfin, un début de prise en compte de ce que disent les Français », a réagi {leader} ({acr}).', '{leader} ({acr}) revendique « une victoire de nos idées ».'],
    con: ['« Encore un tour de passe-passe de l’establishment », a lancé {leader} ({acr}).', '{leader} ({acr}) accuse le pouvoir d’« organiser l’impuissance ».'],
    neutre: ['{leader} ({acr}) ironise sur « une séquence qui ne change rien à la vie des gens ».'],
  },
  regionaliste: {
    pro: ['{leader} ({acr}) y voit « une bonne nouvelle pour les territoires ».'],
    con: ['{leader} ({acr}) déplore « un énième texte pensé depuis Paris ».'],
    neutre: ['{leader} ({acr}) réserve sa position : « Nous jugerons sur pièces. »'],
  },
  divers: {
    pro: ['Plusieurs élus non-inscrits saluent une « décision de bon sens ».'],
    con: ['Plusieurs élus non-inscrits dénoncent un « passage en force ».'],
    neutre: ['Les élus non-inscrits se disent « partagés ».'],
  },
}

const fill = (tpl: string, vars: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')

export function leaderName(s: GameState, p: Party): string {
  const l = p.leaderId ? s.persons[p.leaderId] : null
  return l?.name ?? `la direction de ${p.acronym}`
}

export function stanceOf(s: GameState, reactor: Party, subjectId: string | undefined, tone: GameEvent['tone']): 'pro' | 'con' | 'neutre' {
  if (!subjectId || !s.parties[subjectId] || tone === 'neutre') return 'neutre'
  const subj = s.parties[subjectId]
  if (reactor.id === subjectId) return 'pro'
  const rel = (reactor.relations[subjectId] ?? (prox(reactor, subj) - 0.4) * 100) / 100 // -1..1
  const inGov = s.government.partyIds.includes(reactor.id)
  const sign = tone === 'positif' ? 1 : -1
  let score = rel * sign
  if (!inGov && s.government.partyIds.includes(subjectId)) score -= 0.15 * sign
  if (Math.abs(score) < 0.15) return 'neutre'
  return score > 0 ? 'pro' : 'con'
}

export function reactionItems(s: GameState, ev: GameEvent, max = 3): NewsItem[] {
  const cands = shuffle(s, Object.values(s.parties).filter((p) => p.active && !p.pseudo && p.leaderId && !ev.partyIds.includes(p.id) && p.support > 1.2))
    .slice(0, max)
    .sort((a, b) => b.support - a.support)
  return cands.map((p) => {
    const st = stanceOf(s, p, ev.subject ?? ev.partyIds[0], ev.tone)
    const tpl = pick(s, REACT[p.family]?.[st] ?? REACT.divers[st])
    const body = fill(tpl, { leader: leaderName(s, p), acr: p.acronym })
    return { p, body, st }
  }).map(({ p, body }) =>
    addNews(s, { kind: 'reaction', outlet: 'Réactions politiques', title: `${p.acronym} réagit : « ${ev.title} »`, body, partyIds: [p.id], importance: 1 }),
  )
}

const EDITO = {
  gauche: ['Il serait naïf de n’y voir qu’une péripétie : cette séquence révèle les rapports de force réels.', 'On cherchera en vain la cohérence d’un pouvoir qui avance au gré des circonstances.'],
  droite: ['Au-delà du tumulte, une question demeure : qui assumera la responsabilité de la suite ?', 'La séquence rappelle que gouverner exige de la clarté plus que des postures.'],
  centre: ['Entre tentation du coup d’éclat et exigence de stabilité, le pays attend un cap.', 'Rien n’est joué : les prochaines semaines diront si cette séquence marque un tournant ou un feu de paille.'],
}

export function editorialItem(s: GameState, ev: GameEvent): NewsItem {
  const slant = pick(s, ['gauche', 'droite', 'centre'] as const)
  const out = OUTLETS.find((o) => o.slant === slant)!
  const subj = ev.subject && s.parties[ev.subject] ? s.parties[ev.subject].name : 'le pouvoir'
  const hook =
    ev.tone === 'positif'
      ? `${subj} marque un point, mais le plus dur reste à faire.`
      : ev.tone === 'negatif'
        ? `${subj} sort affaibli de cette séquence.`
        : `Une séquence politique à double tranchant pour ${subj}.`
  return addNews(s, { kind: 'editorial', outlet: out.name, title: `Éditorial — ${ev.title}`, body: `${hook} ${pick(s, EDITO[slant])}`, partyIds: ev.partyIds, importance: 2 })
}

const CONTEXTS = [
  (s: GameState) => {
    const p = [...s.polls].reverse()[0]
    const lead = p?.rows.find((r) => r.partyId !== 'autres')
    return lead && s.parties[lead.partyId] ? `Le dernier sondage fictif place ${s.parties[lead.partyId].acronym} en tête (${pct(lead.value)} %).` : ''
  },
  (s: GameState) => `Popularité de l’exécutif : ${Math.round(s.economy.approval)} % de jugements favorables.`,
  (s: GameState) => {
    const maj = s.government.partyIds.reduce((a, id) => a + s.deputies.filter((d) => d.partyId === id).length, 0)
    return maj >= 289 ? 'Le gouvernement dispose d’une majorité absolue à l’Assemblée.' : `Le gouvernement ne compte que ${maj} députés sur 577 : la majorité absolue est à 289.`
  },
  () => '',
]

/** Enregistre un événement dans la mémoire (chronique) ET dans le fil d'actualité. */
export function publish(s: GameState, ev: GameEvent) {
  const chron = logChronicle(s, ev.type, ev.title, ev.detail, ev.partyIds, ev.personIds ?? [])
  const ctx = pick(s, CONTEXTS)(s)
  const outlet = ev.importance === 3 ? 'Info 24' : pick(s, OUTLETS).name
  const kind: NewsKind = ev.kind ?? (ev.importance === 3 ? 'breaking' : 'headline')
  const main = addNews(s, { kind, outlet, title: ev.title, body: ev.detail + (ctx ? ' ' + ctx : ''), partyIds: ev.partyIds, importance: ev.importance })
  const extra: NewsItem[] = []
  if (ev.reactions ?? ev.importance >= 2) extra.push(...reactionItems(s, ev, ev.importance === 3 ? 3 : 2))
  if ((ev.editorial ?? ev.importance === 3) && chance(s, 0.8)) extra.push(editorialItem(s, ev))
  return { chron, main, extra }
}

export function communique(s: GameState, partyId: string, title: string, body: string) {
  const p = s.parties[partyId]
  return addNews(s, { kind: 'communique', outlet: `Communiqué — ${p?.acronym ?? ''}`, title, body, partyIds: [partyId], importance: 1 })
}

export const dateLong = fmtDate
export { rand }
