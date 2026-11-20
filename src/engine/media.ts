// Génération hors-ligne d'interviews, débats et discours (questions/réponses cohérentes avec l'idéologie).
import type { GameState, NewsItem, Person } from './types'
import { chance, pick, rand } from './rng'
import { OUTLETS, addNews, logChronicle } from './narrate'
import { pct } from './util'
import { seatsOf } from './parliament'

type Bucket = 'xg' | 'g' | 'c' | 'd' | 'xd'
const bucket = (lr: number): Bucket => (lr < -0.7 ? 'xg' : lr < -0.2 ? 'g' : lr < 0.35 ? 'c' : lr < 0.7 ? 'd' : 'xd')

export const TOPICS = ['économie', 'sécurité', 'écologie', 'institutions', 'social'] as const
type Topic = (typeof TOPICS)[number]

const QUESTIONS: Record<Topic, string[]> = {
  économie: ['La dette dépasse les 110 % du PIB. Concrètement, où comptez-vous trouver les économies ou les recettes ?', 'Le pouvoir d’achat est la première préoccupation des Français. Qu’avez-vous à leur répondre ?'],
  sécurité: ['Sécurité et immigration : que feriez-vous de différent, très concrètement ?', 'Beaucoup de Français disent ne plus se sentir en sécurité. Que leur dites-vous ?'],
  écologie: ['Transition écologique : qui paie, et à quel rythme ?', 'Comment concilier fins de mois et fin du monde, pour reprendre la formule consacrée ?'],
  institutions: ['Faut-il changer les institutions, introduire une dose de proportionnelle, supprimer le 49.3 ?', 'La Ve République est-elle à bout de souffle ?'],
  social: ['Retraites, travail, services publics : quel est votre cap social ?', 'Les services publics se dégradent. Quelle est votre réponse ?'],
}

const ANSWERS: Record<Topic, Record<Bucket, string>> = {
  économie: {
    xg: 'La question n’est pas la dette, c’est qui en profite. Nous taxerons les superprofits et les grandes fortunes, nous relancerons l’investissement public et nous planifierons la production.',
    g: 'Il faut de la justice fiscale : faire contribuer davantage les plus hauts patrimoines, protéger les salaires et investir dans l’industrie verte. On ne redresse pas un pays en sacrifiant ses services publics.',
    c: 'Il faut tenir deux lignes : maîtriser la dépense publique sans casser la croissance. Plein-emploi, simplification, investissement, et un effort partagé, sans dogmatisme.',
    d: 'Il faut baisser la dépense publique et les impôts de production, récompenser le travail et en finir avec l’assistanat. Ce qui n’est pas financé aujourd’hui sera payé demain par nos enfants.',
    xd: 'Il faut protéger les Français : priorité nationale, fin des dépenses injustifiées, baisse de la TVA sur l’énergie et relocalisation. L’argent des Français doit d’abord aller aux Français.',
  },
  sécurité: {
    xg: 'La sécurité commence par l’égalité : police de proximité, moyens pour la justice et la prévention. Je refuse les surenchères qui divisent les Français.',
    g: 'Nous voulons une police formée et présente sur le terrain, une justice dotée de moyens et une vraie politique de prévention, avec des sanctions rapides et effectives.',
    c: 'Il faut de l’autorité et de l’humanité : fermeté face aux délinquants, intégration pour ceux qui respectent nos règles, coopération européenne sur les frontières.',
    d: 'Il faut rétablir l’ordre : peines plancher, maîtrise stricte de l’immigration, expulsion des étrangers délinquants, et des moyens pour nos forces de l’ordre.',
    xd: 'Il faut un tournant à 180 degrés : arrêt de l’immigration de masse, double peine, fin des régularisations et priorité nationale. Cela s’appelle de la souveraineté.',
  },
  écologie: {
    xg: 'La planification écologique est une urgence sociale : rénovation massive, gratuité de l’essentiel, et les pollueurs paient d’abord. Ce n’est pas aux classes populaires de porter la facture.',
    g: 'La transition doit être juste : aides pour la rénovation et les mobilités, investissement dans les énergies renouvelables, et refus d’une écologie punitive.',
    c: 'Nous avons un cap : décarboner l’économie, miser sur le nucléaire et les renouvelables, avec des mesures progressives et des aides ciblées.',
    d: 'L’écologie ne doit pas être punitive : pas de nouvelles taxes, du nucléaire, de l’innovation, et la confiance dans les territoires plutôt que dans la contrainte.',
    xd: 'Je refuse l’écologie punitive : défendons nos agriculteurs, notre industrie et le nucléaire, et ne laissons pas Bruxelles dicter nos normes.',
  },
  institutions: {
    xg: 'Il faut une VIe République : plus de pouvoir au peuple, référendum d’initiative citoyenne, fin du pouvoir personnel et du 49.3.',
    g: 'Nous voulons rééquilibrer les pouvoirs : plus de proportionnelle, un Parlement qui vote vraiment, et des élus plus proches des citoyens.',
    c: 'Il faut adapter nos institutions sans les fragiliser : une dose de proportionnelle, un Parlement renforcé, mais sans casser la stabilité de la Ve République.',
    d: 'La Ve République a fait ses preuves ; il faut la protéger, réduire le nombre de parlementaires et garantir l’efficacité de l’exécutif.',
    xd: 'Il faut redonner la parole au peuple : référendum sur les grandes questions, proportionnelle intégrale et fin du gouvernement des juges.',
  },
  social: {
    xg: 'Retraite à 60 ans, SMIC à 1 600 euros, services publics refinancés. Le travail doit payer et la vie ne doit pas se résumer à travailler.',
    g: 'Il faut protéger le modèle social : revaloriser les salaires, soutenir l’hôpital et l’école, et garantir une retraite digne sans reculer l’âge de départ.',
    c: 'Il faut une réforme équilibrée : mieux rémunérer le travail, moderniser les services publics, et trouver un compromis pour sauver notre système de retraite.',
    d: 'Il faut valoriser le travail : plus d’heures, moins de charges, des retraites financées par l’effort de tous, et un État qui dépense mieux.',
    xd: 'Il faut défendre les Français qui travaillent : retraite à 60 ans pour ceux qui ont commencé tôt, pouvoir d’achat d’abord et fin des dépenses inutiles.',
  },
}

const DEFLECT = [
  'Je vais vous répondre sur le fond, mais permettez-moi d’abord de rappeler ce que vivent les Français au quotidien…',
  'Ce n’est pas la bonne question. La vraie question, c’est de savoir dans quel pays nous voulons vivre.',
  'Je ne me laisserai pas enfermer dans ce débat d’appareils : ce qui compte, ce sont les résultats.',
]

function difficult(s: GameState, p: Person): { q: string; a: string; follow?: { q: string; a: string } } {
  const party = p.partyId ? s.parties[p.partyId] : null
  const poll = [...s.polls].reverse()[0]
  const row = poll?.rows.find((r) => r.partyId === p.partyId)
  const b = bucket(p.lr)
  const evasive = p.mediaSkill > 68 && p.pragmatism > 62
  if (party && party.cohesion < 45)
    return { q: `Votre parti est secoué par des tensions : on parle de fronde, voire de scission. Contrôlez-vous encore ${party.acronym} ?`, a: 'Un parti vivant est un parti qui débat. Je regarde l’avenir, pas les rumeurs.', follow: { q: 'Vous n’avez pas répondu : certains de vos cadres demandent votre départ. Allez-vous leur répondre ?', a: 'Je réponds : j’ai un mandat, une équipe et un projet. Les procès d’intention ne font pas une stratégie.' } }
  if (row && poll && (row.delta ?? 0) < -1.5)
    return { q: `Les derniers sondages donnent ${party?.acronym} à ${pct(row.value)} %, en recul. Est-ce que votre ligne ne fait plus recette ?`, a: 'Les sondages vont et viennent. Ce qui compte, c’est la confiance que nous construisons dans la durée.', follow: { q: 'Mais ce recul est-il le signe d’un désaveu ?', a: 'Je ne commente pas des fluctuations. Je sais que nos idées progressent dans le pays réel.' } }
  if (p.integrity < 55)
    return { q: 'Des révélations de presse mettent en cause certains de vos choix passés. Que répondez-vous ?', a: 'Je réponds devant la justice si elle me le demande ; pour le reste, je n’ai rien à cacher.', follow: { q: 'Vous contestez les faits ou leur interprétation ?', a: 'Je conteste la méthode, qui consiste à condamner avant d’avoir établi les faits.' } }
  const al = party ? s.alliances.find((a) => !a.dissolved && a.partyIds.includes(party.id)) : null
  if (al)
    return { q: `Vous êtes membre de l’alliance « ${al.name} », mais vos partenaires vous reprochent des positions contradictoires. Qui a raison ?`, a: 'Nous avons des sensibilités différentes ; c’est une richesse tant que nous restons loyaux sur l’essentiel.', follow: evasive ? { q: 'Vous contournez la question. Qui a tort, selon vous ?', a: 'Personne n’a tort : il y a un cap commun et des nuances. J’assume cet équilibre.' } : undefined }
  return { q: `Vous avez changé de position sur plusieurs sujets ces dernières années. N’est-ce pas du calcul ${b === 'c' ? 'centriste' : 'politique'} ?`, a: 'Ceux qui ne changent jamais d’avis ne regardent pas le monde. L’important, c’est la cohérence des valeurs.' }
}

function journalist(s: GameState, outletName?: string) {
  const o = OUTLETS.find((x) => x.name === outletName) ?? pick(s, OUTLETS)
  const names = ['Claire Vasseur', 'Antoine Delattre', 'Sophie Marchetti', 'Karim Benali', 'Hélène Rochard', 'Julien Maury']
  return { outlet: o, name: pick(s, names) + ` (${o.name})` }
}

export function generateInterview(s: GameState, personId: string, outletName?: string, topic?: string): NewsItem {
  const p = s.persons[personId]
  const party = p?.partyId ? s.parties[p.partyId] : null
  const j = journalist(s, outletName)
  const t: Topic = (TOPICS as readonly string[]).includes(topic ?? '') ? (topic as Topic) : pick(s, TOPICS)
  const b = bucket(p.lr)
  const dialog: NonNullable<NewsItem['dialog']> = []
  const me = { speaker: p.name, partyId: p.partyId }
  const jr = (text: string) => dialog.push({ speaker: j.name, partyId: null, text })
  const pr = (text: string) => dialog.push({ ...me, text })
  jr(`Bonsoir ${p.name}. ${pick(s, QUESTIONS[t])}`)
  pr((p.mediaSkill > 75 && chance(s, 0.35) ? pick(s, DEFLECT) + ' ' : '') + ANSWERS[t][b])
  const d = difficult(s, p)
  jr(d.q)
  pr(d.a)
  if (d.follow) { jr(d.follow.q); pr(d.follow.a) }
  const t2 = pick(s, TOPICS.filter((x) => x !== t))
  jr(`Un dernier mot : ${pick(s, QUESTIONS[t2])}`)
  pr(ANSWERS[t2][b])
  const item = addNews(s, {
    kind: 'interview', outlet: j.outlet.name, importance: 2, partyIds: party ? [party.id] : [],
    title: `Interview — ${p.name} face à ${j.name.split(' (')[0]}`,
    body: `${p.name}${party ? ` (${party.acronym})` : ''} est l’invité(e) de ${j.outlet.name}. Entretien marqué par des questions serrées sur ${t} et sur la situation de ${party?.acronym ?? 'son camp'}.`,
    dialog,
  })
  logChronicle(s, 'media', `Interview de ${p.name} sur ${j.outlet.name}`, item.body, party ? [party.id] : [], [p.id])
  return item
}

export function generateDebate(s: GameState, personIds: string[], topic?: string, outletName?: string): NewsItem {
  const people = personIds.map((i) => s.persons[i]).filter(Boolean).slice(0, 3)
  const j = journalist(s, outletName)
  const t: Topic = (TOPICS as readonly string[]).includes(topic ?? '') ? (topic as Topic) : pick(s, TOPICS)
  const dialog: NonNullable<NewsItem['dialog']> = []
  dialog.push({ speaker: j.name, partyId: null, text: `Bonsoir à tous. Ce soir, ${people.map((p) => p.name).join(', ')} s’affrontent. Premier thème : ${t}. ${pick(s, QUESTIONS[t])}` })
  people.forEach((p) => dialog.push({ speaker: p.name, partyId: p.partyId, text: ANSWERS[t][bucket(p.lr)] }))
  const attacks = [(a: Person, b: Person) => `${b.name}, permettez-moi de vous interrompre : ce que vous proposez ne tient pas devant la réalité du budget.`, (a: Person, b: Person) => `Vous parlez de cohérence, ${b.name}, mais votre camp a voté l’inverse il y a deux ans.`, (a: Person, b: Person) => `On ne peut pas gouverner avec des slogans, ${b.name}. Les Français attendent des actes.`]
  const rebuts = [(a: Person) => 'C’est faux, et vous le savez. Les chiffres que vous citez sont détournés de leur contexte.', (a: Person) => 'Je note que vous évitez la question. Les Français jugeront.', (a: Person) => 'Vous caricaturez nos positions pour éviter de défendre les vôtres.']
  for (let i = 0; i < people.length; i++) {
    const a = people[i]
    const b = people[(i + 1) % people.length]
    if (a === b) continue
    dialog.push({ speaker: a.name, partyId: a.partyId, text: pick(s, attacks)(a, b) })
    dialog.push({ speaker: b.name, partyId: b.partyId, text: pick(s, rebuts)(b) })
  }
  dialog.push({ speaker: j.name, partyId: null, text: 'Question aux deux camps : si vous deviez conclure en une phrase, quel est votre message aux Français ?' })
  people.forEach((p) => dialog.push({ speaker: p.name, partyId: p.partyId, text: `Mon message : ${p.convictions[0] ?? 'le courage'}, et une France plus juste, selon nos valeurs.` }))
  const winner = [...people].sort((a, b) => b.mediaSkill * 0.6 + b.charisma * 0.4 + rand(s) * 20 - (a.mediaSkill * 0.6 + a.charisma * 0.4 + rand(s) * 20))[0]
  const item = addNews(s, {
    kind: 'debate', outlet: j.outlet.name, importance: 2, partyIds: people.map((p) => p.partyId).filter(Boolean) as string[],
    title: `Débat — ${people.map((p) => p.name.split(' ').slice(-1)[0]).join(' / ')}`,
    body: `Débat télévisé sur ${j.outlet.name}. Selon notre sondage express fictif, ${winner.name} est jugé(e) le/la plus convaincant(e) par une courte majorité de téléspectateurs.`,
    dialog,
  })
  logChronicle(s, 'media', `Débat télévisé : ${people.map((p) => p.name).join(' / ')}`, item.body, [], people.map((p) => p.id))
  return item
}

export function generateSpeech(s: GameState, personId: string, topic?: string): NewsItem {
  const p = s.persons[personId]
  const party = p?.partyId ? s.parties[p.partyId] : null
  const b = bucket(p.lr)
  const isPres = s.president.personId === personId
  const intro = isPres
    ? 'Françaises, Français, mes chers compatriotes, je m’adresse à vous dans un moment où notre pays est mis à l’épreuve.'
    : `Mes chers amis, mes chers concitoyens, je veux vous parler avec franchise ce soir${party ? ` au nom de ${party.name}` : ''}.`
  const ctx = s.crises.filter((c) => c.ongoing)[0]
    ? `Nous traversons une crise — « ${s.crises.filter((c) => c.ongoing)[0].title.toLowerCase()} » — qui nous oblige à nous rassembler.`
    : s.economy.unemployment > 8
      ? `Le chômage, à ${pct(s.economy.unemployment)} %, reste une blessure ouverte.`
      : `L’inflation (${pct(s.economy.inflation)} %) et le chômage (${pct(s.economy.unemployment)} %) pèsent sur le quotidien des Français.`
  const body: Record<Bucket, string> = {
    xg: 'Le temps de la résignation est fini. Nous voulons rendre le pouvoir au peuple, partager les richesses et planifier la bifurcation écologique.',
    g: 'Notre boussole, c’est la justice : justice sociale, justice fiscale, justice écologique. Nous défendrons le modèle social que le monde nous envie.',
    c: 'Je crois à la force du compromis, à la réforme sans brutalité et à une Europe qui protège. Gardons la tête froide et avançons ensemble.',
    d: 'Rétablissons l’autorité, valorisons le travail et libérons l’initiative. Un pays qui se tient droit est un pays qui regagne la confiance.',
    xd: 'La France ne se résigne pas : nous défendrons nos frontières, notre identité et le pouvoir d’achat de ceux qui travaillent.',
  }
  const close = 'Je vous remercie. Vive la République, vive la France !'
  const text = [intro, ctx, topic ? `Sur le sujet « ${topic} », ma position est claire.` : '', body[b], close].filter(Boolean).join('\n\n')
  const item = addNews(s, {
    kind: 'speech', outlet: isPres ? 'Allocution — Palais de l’Élysée' : `Discours — ${party?.acronym ?? p.name}`, importance: isPres ? 3 : 2,
    partyIds: party ? [party.id] : [], title: `Discours de ${p.name}`, body: text,
  })
  logChronicle(s, 'media', `Discours de ${p.name}`, topic ?? 'Discours', party ? [party.id] : [], [p.id])
  return item
}

void seatsOf
