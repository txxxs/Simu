import type { GameState, Law, LawDomain } from './types'
import { chance, pick, rand } from './rng'
import { addDays, clamp, uid } from './util'
import { MAJORITY, censureVote, fallOfGovernment, seatMap, voteOnLaw } from './parliament'
import { impact, prox } from './polls'
import { logChronicle, publish } from './narrate'

export const DOMAINS: Record<LawDomain, { label: string; lr: number; cult: number; titles: string[] }> = {
  retraites: { label: 'Retraites', lr: 0.45, cult: 0, titles: ['réforme des retraites', 'projet de loi sur l’âge de départ à la retraite'] },
  immigration: { label: 'Immigration', lr: 0.5, cult: 0.8, titles: ['projet de loi sur l’immigration et l’intégration', 'proposition de loi sur la maîtrise des flux migratoires'] },
  fiscalite: { label: 'Fiscalité', lr: 0.3, cult: 0, titles: ['projet de loi de finances', 'réforme de la fiscalité des ménages'] },
  securite: { label: 'Sécurité', lr: 0.5, cult: 0.7, titles: ['loi de programmation sécurité intérieure', 'proposition de loi contre la délinquance'] },
  ecologie: { label: 'Écologie et énergie', lr: -0.35, cult: -0.6, titles: ['loi sur la transition écologique', 'plan de rénovation énergétique'] },
  sante: { label: 'Santé', lr: -0.2, cult: -0.1, titles: ['loi de financement de l’hôpital public', 'plan contre les déserts médicaux'] },
  education: { label: 'Éducation', lr: 0.1, cult: 0.3, titles: ['loi sur l’école et le niveau des élèves', 'réforme du lycée et de l’orientation'] },
  travail: { label: 'Travail', lr: 0.25, cult: 0, titles: ['réforme de l’assurance-chômage', 'loi sur le partage de la valeur'] },
  institutions: { label: 'Institutions', lr: 0, cult: -0.2, titles: ['projet de réforme institutionnelle (dose de proportionnelle)', 'loi organique sur le mandat unique'] },
  autre: { label: 'Autre', lr: 0, cult: 0, titles: ['texte portant diverses dispositions'] },
}

export function fileLaw(s: GameState, o: { title?: string; domain?: LawDomain; byGov: boolean; partyId?: string | null; lr?: number; cult?: number }): Law {
  const domain = o.domain ?? pick(s, Object.keys(DOMAINS).filter((d) => d !== 'autre') as LawDomain[])
  const dd = DOMAINS[domain]
  const authorParty = o.partyId ? s.parties[o.partyId] : null
  // orientation du texte : domaine, infléchie par l'auteur
  const lr = clamp(o.lr ?? (authorParty && !o.byGov ? dd.lr * 0.3 + authorParty.lr * 0.7 : dd.lr * 0.5 + (s.parties[s.president.partyId ?? '']?.lr ?? 0) * 0.5), -1, 1)
  const cult = clamp(o.cult ?? (authorParty && !o.byGov ? dd.cult * 0.4 + authorParty.cult * 0.6 : dd.cult), -1, 1)
  const law: Law = {
    id: uid(s, 'l'),
    title: o.title ?? pick(s, dd.titles),
    domain,
    lr,
    cult,
    authorPartyId: o.byGov ? null : o.partyId ?? null,
    government: o.byGov,
    stage: 'dépôt',
    status: 'en cours',
    filed: s.date,
    votes: [],
    summary: '',
  }
  s.laws.push(law)
  const stages: [string, number][] = [['commission', 10], ['vote-an', 24], ['senat', 44], ['final', 60]]
  for (const [stage, d] of stages) s.calendar.push({ id: uid(s, 'c'), date: addDays(s.date, d), kind: 'loi-etape', title: `${law.title} — ${stage}`, payload: { lawId: law.id, stage } })
  const by = o.byGov ? 'le gouvernement' : authorParty?.name ?? 'un groupe parlementaire'
  publish(s, {
    type: 'loi', title: `Dépôt : ${law.title}`, detail: `${by[0].toUpperCase() + by.slice(1)} dépose ${o.byGov ? 'un projet' : 'une proposition'} de loi (« ${law.title} », thème : ${dd.label.toLowerCase()}). L’examen en commission est prévu dans les prochains jours.`,
    partyIds: authorParty ? [authorParty.id] : s.government.partyIds, importance: o.byGov ? 2 : 1, tone: 'neutre', subject: authorParty?.id ?? s.government.partyIds[0],
  })
  return law
}

function lawImpact(s: GameState, law: Law) {
  for (const p of Object.values(s.parties)) {
    if (!p.active || p.pseudo) continue
    const closeness = prox(p, law)
    const sign = closeness - 0.35
    const inGov = s.government.partyIds.includes(p.id)
    impact(s, p.id, sign * 0.5 * (inGov && law.government ? 1.2 : 0.7), { durable: 0.5, halfLife: 30, reason: `Adoption de « ${law.title} »` })
  }
  const e = s.economy
  const d = law.domain
  if (d === 'retraites' || d === 'fiscalite') { e.deficit = clamp(e.deficit - 0.15, 0, 12); e.approval = clamp(e.approval - 2, 5, 80) }
  if (d === 'travail') { e.unemployment = clamp(e.unemployment - 0.08, 3, 20); e.inequality += 0.3 }
  if (d === 'securite') e.insecurity = clamp(e.insecurity - 1.5, 0, 100)
  if (d === 'sante') { e.publicServices = clamp(e.publicServices + 1.5, 0, 100); e.deficit = clamp(e.deficit + 0.05, 0, 12) }
  if (d === 'education') e.publicServices = clamp(e.publicServices + 1, 0, 100)
  if (d === 'ecologie') { e.growth += 0.02; e.purchasing -= 0.2 }
  if (d === 'immigration') e.approval = clamp(e.approval + (law.cult > 0 ? 0.5 : -0.5), 5, 80)
}

export function lawStage(s: GameState, lawId: string, stage: string) {
  const law = s.laws.find((l) => l.id === lawId)
  if (!law || law.status !== 'en cours') return
  const acr = law.authorPartyId ? s.parties[law.authorPartyId]?.acronym : 'gouvernement'
  if (stage === 'commission') {
    law.stage = 'commission'
    void acr
    return
  }
  if (stage === 'vote-an') {
    law.stage = 'Assemblée'
    const v = voteOnLaw(s, law, 'Assemblée nationale')
    const ok = v.pour > v.contre
    if (!ok && law.government && !s.government.caretaker && chance(s, law.domain === 'fiscalite' ? 0.9 : 0.55)) {
      // 49.3 : la responsabilité du gouvernement est engagée
      const opp = Object.values(s.parties).filter((p) => !s.government.partyIds.includes(p.id) && p.active).sort((a, b) => (seatMap(s)[b.id] ?? 0) - (seatMap(s)[a.id] ?? 0))
      const author = opp[0]?.id
      publish(s, { type: 'crise', title: `49.3 sur « ${law.title} »`, detail: `Faute de majorité, le Premier ministre engage la responsabilité du gouvernement. Une motion de censure est aussitôt déposée par ${s.parties[author ?? '']?.acronym ?? 'l’opposition'}.`, partyIds: author ? [author] : [], importance: 3, tone: 'negatif', subject: s.government.partyIds[0] })
      const c = censureVote(s, author)
      if (c.passes) {
        law.status = 'rejetée'
        law.summary = 'Texte tombé avec la censure du gouvernement.'
        publish(s, { type: 'censure', title: `Motion de censure adoptée (${c.yes} voix)`, detail: `La motion recueille ${c.yes} voix (majorité requise : ${MAJORITY}). Le texte « ${law.title} » est caduc.`, partyIds: Object.keys(c.byParty), importance: 3, tone: 'negatif', subject: s.government.partyIds[0] })
        fallOfGovernment(s, 'Le gouvernement est renversé par l’Assemblée nationale.')
      } else {
        law.stage = 'Sénat'
        law.votes.push({ label: '49.3 — motion de censure rejetée', date: s.date, pour: 0, contre: c.yes, abst: 0 })
        s.government.stability = clamp(s.government.stability - 8, 3, 100)
        publish(s, { type: 'censure', title: `La motion de censure échoue (${c.yes} voix)`, detail: `Il manquait ${MAJORITY - c.yes} voix : le texte « ${law.title} » est considéré comme adopté en première lecture.`, partyIds: [], importance: 2, tone: 'positif', subject: s.government.partyIds[0] })
      }
      return
    }
    publish(s, { type: 'loi', title: ok ? `L’Assemblée adopte « ${law.title} »` : `L’Assemblée rejette « ${law.title} »`, detail: `Vote solennel : ${v.pour} pour, ${v.contre} contre, ${v.abst} abstentions.`, partyIds: Object.entries(v.byParty).sort((a, b) => b[1].pour - a[1].pour).slice(0, 2).map(([k]) => k), importance: law.government ? 2 : 1, tone: ok ? 'positif' : 'negatif', subject: law.authorPartyId ?? s.government.partyIds[0] })
    if (!ok) {
      law.status = 'rejetée'
      law.summary = `Rejeté par l’Assemblée (${v.pour}–${v.contre}).`
      if (law.government) s.economy.approval = clamp(s.economy.approval - 1.5, 5, 80)
    }
    return
  }
  if (stage === 'senat') {
    law.stage = 'Sénat'
    // Sénat à majorité de droite : vote selon la proximité pondérée par les effectifs sénatoriaux
    let pour = 0
    let tot = 0
    for (const [id, n] of Object.entries(s.senate)) {
      const p = s.parties[id]
      if (!p) continue
      const pr = clamp(0.1 + 0.85 * prox(p, law) + (law.government && s.government.partyIds.includes(id) ? 0.3 : 0), 0.03, 0.97)
      pour += n * pr
      tot += n
    }
    const ok = pour / tot > 0.5 || rand(s) < 0.1
    law.votes.push({ label: 'Sénat', date: s.date, pour: Math.round(pour), contre: Math.round(tot - pour), abst: 0 })
    if (!ok) logChronicle(s, 'loi', `Le Sénat rejette « ${law.title} »`, 'Le texte repart à l’Assemblée (commission mixte paritaire, puis lecture définitive).')
    return
  }
  if (stage === 'final') {
    law.stage = 'promulgation'
    const cc = chance(s, 0.12 + Math.abs(law.cult) * 0.1)
    if (cc) {
      law.status = chance(s, 0.5) ? 'censurée' : 'adoptée'
      law.summary = law.status === 'censurée' ? 'Censuré en totalité par le Conseil constitutionnel.' : 'Promulguée après censure partielle par le Conseil constitutionnel.'
    } else {
      law.status = 'adoptée'
      law.summary = 'Promulguée.'
    }
    if (law.status === 'adoptée') lawImpact(s, law)
    publish(s, { type: 'loi', title: law.status === 'censurée' ? `Le Conseil constitutionnel censure « ${law.title} »` : `« ${law.title} » promulguée`, detail: law.summary, partyIds: law.authorPartyId ? [law.authorPartyId] : s.government.partyIds, importance: law.government ? 2 : 1, tone: law.status === 'censurée' ? 'negatif' : 'neutre', subject: law.authorPartyId ?? s.government.partyIds[0] })
  }
}
