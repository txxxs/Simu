// Situations de départ « France réelle » (approximatives, à vérifier avant tout usage hors jeu).
// Les profils psychologiques des personnalités sont des paramètres de SIMULATION, pas des affirmations factuelles.
import type { Economy, Family, Party, Person } from '../types'

export type BaseYear = 2022 | 2024

interface PSeed {
  id: string
  name: string
  acronym: string
  color: string
  family: Family
  lr: number
  cult: number
  ideology: string
  members: number
  budget: number
  territorial: number
  cohesion: number
  rejection: number
  transfer: number
  opp: number
  regional?: boolean
  pseudo?: boolean
  real?: boolean
  objective: string
  factions: { name: string; share: number; lrShift: number }[]
  seats: { 2022: number; 2024: number }
  support: { 2022: number; 2024: number }
  leader: { 2022: string | null; 2024: string | null }
  congress: { 2022: string; 2024: string }
}

const PARTIES: PSeed[] = [
  {
    id: 'lfi', name: 'La France insoumise', acronym: 'LFI', color: '#d1203a', family: 'extreme-gauche', lr: -0.88, cult: -0.7,
    ideology: 'Gauche de rupture : VIe République, planification écologique, redistribution, anti-libéralisme, souveraineté populaire.',
    members: 80000, budget: 11, territorial: 62, cohesion: 72, rejection: 0.5, transfer: 0.4, opp: 0.95,
    objective: 'Devenir la première force de gauche et conquérir Matignon puis l’Élysée.',
    factions: [{ name: 'Ligne historique', share: 0.7, lrShift: 0 }, { name: 'Sensibilité populiste-sociale', share: 0.3, lrShift: 0.12 }],
    seats: { 2022: 75, 2024: 72 }, support: { 2022: 12, 2024: 11 }, leader: { 2022: 'melenchon', 2024: 'melenchon' }, congress: { 2022: '2023-06-10', 2024: '2025-11-15' },
  },
  {
    id: 'ps', name: 'Parti socialiste', acronym: 'PS', color: '#e45a84', family: 'gauche', lr: -0.5, cult: -0.45,
    ideology: 'Social-démocratie : justice sociale, services publics, construction européenne, écologie réformiste.',
    members: 40000, budget: 14, territorial: 82, cohesion: 58, rejection: 0.3, transfer: 0.7, opp: 0.5,
    objective: 'Redevenir le pivot de la gauche et reprendre des villes et des régions.',
    factions: [{ name: 'Direction', share: 0.5, lrShift: 0 }, { name: 'Aile gauche', share: 0.2, lrShift: -0.15 }, { name: 'Sociaux-démocrates', share: 0.3, lrShift: 0.15 }],
    seats: { 2022: 31, 2024: 66 }, support: { 2022: 4.5, 2024: 9 }, leader: { 2022: 'faure', 2024: 'faure' }, congress: { 2022: '2023-01-27', 2024: '2025-06-14' },
  },
  {
    id: 'eelv', name: 'Les Écologistes', acronym: 'LÉ', color: '#2f9e5f', family: 'ecologiste', lr: -0.55, cult: -0.65,
    ideology: 'Écologie politique : transition énergétique, sobriété, justice climatique, démocratie participative.',
    members: 12000, budget: 6, territorial: 58, cohesion: 55, rejection: 0.3, transfer: 0.6, opp: 0.6,
    objective: 'Peser dans la gauche et conserver ses grandes villes.',
    factions: [{ name: 'Direction', share: 0.55, lrShift: 0 }, { name: 'Aile radicale', share: 0.25, lrShift: -0.15 }, { name: 'Aile pragmatique', share: 0.2, lrShift: 0.15 }],
    seats: { 2022: 23, 2024: 38 }, support: { 2022: 4.5, 2024: 4.5 }, leader: { 2022: 'bayou', 2024: 'tondelier' }, congress: { 2022: '2022-12-03', 2024: '2025-06-01' },
  },
  {
    id: 'pcf', name: 'Parti communiste français', acronym: 'PCF', color: '#9d1f24', family: 'extreme-gauche', lr: -0.8, cult: -0.45,
    ideology: 'Communisme républicain : défense des services publics, du monde du travail et de la souveraineté industrielle.',
    members: 45000, budget: 4, territorial: 60, cohesion: 62, rejection: 0.3, transfer: 0.5, opp: 0.85,
    objective: 'Préserver ses bastions locaux et retrouver une voix nationale.',
    factions: [{ name: 'Direction', share: 0.65, lrShift: 0 }, { name: 'Courant unitaire', share: 0.35, lrShift: -0.08 }],
    seats: { 2022: 22, 2024: 17 }, support: { 2022: 2, 2024: 2 }, leader: { 2022: 'roussel', 2024: 'roussel' }, congress: { 2022: '2023-04-07', 2024: '2026-04-03' },
  },
  {
    id: 'ren', name: 'Renaissance', acronym: 'RE', color: '#f2a516', family: 'centre', lr: 0.15, cult: -0.1,
    ideology: 'Centrisme libéral et pro-européen : « en même temps », réformes de l’offre, plein-emploi, souveraineté européenne.',
    members: 40000, budget: 18, territorial: 60, cohesion: 62, rejection: 0.35, transfer: 0.9, opp: 0.05,
    objective: 'Préserver l’héritage présidentiel et préparer la succession.',
    factions: [{ name: 'Fidèles du président', share: 0.55, lrShift: 0 }, { name: 'Aile droite', share: 0.25, lrShift: 0.15 }, { name: 'Aile gauche', share: 0.2, lrShift: -0.15 }],
    seats: { 2022: 170, 2024: 95 }, support: { 2022: 19, 2024: 14 }, leader: { 2022: 'guerini', 2024: 'attal' }, congress: { 2022: '2023-02-04', 2024: '2025-12-06' },
  },
  {
    id: 'modem', name: 'Mouvement démocrate', acronym: 'MoDem', color: '#ef7f1a', family: 'centre', lr: 0.0, cult: -0.15,
    ideology: 'Centrisme humaniste et européen, attaché à la proportionnelle et à l’équilibre des institutions.',
    members: 25000, budget: 5, territorial: 50, cohesion: 72, rejection: 0.25, transfer: 0.85, opp: 0.1,
    objective: 'Conserver son poids de partenaire et obtenir une dose de proportionnelle.',
    factions: [{ name: 'Direction', share: 0.8, lrShift: 0 }, { name: 'Centristes indépendants', share: 0.2, lrShift: 0.1 }],
    seats: { 2022: 51, 2024: 36 }, support: { 2022: 5, 2024: 3.5 }, leader: { 2022: 'bayrou', 2024: 'bayrou' }, congress: { 2022: '2023-05-20', 2024: '2025-10-11' },
  },
  {
    id: 'hor', name: 'Horizons', acronym: 'HOR', color: '#3aa6d8', family: 'centre', lr: 0.3, cult: 0.05,
    ideology: 'Centre-droit réformateur : gestion rigoureuse, décentralisation, pro-européen, autorité de l’État.',
    members: 30000, budget: 4, territorial: 50, cohesion: 70, rejection: 0.25, transfer: 0.85, opp: 0.15,
    objective: 'Porter la candidature de son fondateur à la présidentielle.',
    factions: [{ name: 'Direction', share: 0.85, lrShift: 0 }, { name: 'Élus locaux', share: 0.15, lrShift: -0.05 }],
    seats: { 2022: 30, 2024: 31 }, support: { 2022: 3.5, 2024: 3 }, leader: { 2022: 'philippe', 2024: 'philippe' }, congress: { 2022: '2023-09-16', 2024: '2025-09-20' },
  },
  {
    id: 'lr', name: 'Les Républicains', acronym: 'LR', color: '#1f4e9c', family: 'droite', lr: 0.55, cult: 0.5,
    ideology: 'Droite libérale-conservatrice : baisse des dépenses et des impôts, autorité, maîtrise de l’immigration, ancrage local.',
    members: 70000, budget: 17, territorial: 85, cohesion: 50, rejection: 0.2, transfer: 0.75, opp: 0.35,
    objective: 'Rester le pivot de la droite et empêcher l’absorption par le RN ou le centre.',
    factions: [{ name: 'Direction', share: 0.4, lrShift: 0 }, { name: 'Droite dure', share: 0.3, lrShift: 0.15 }, { name: 'Droite sociale et centriste', share: 0.3, lrShift: -0.15 }],
    seats: { 2022: 61, 2024: 47 }, support: { 2022: 11, 2024: 9 }, leader: { 2022: 'jacob', 2024: 'ciotti' }, congress: { 2022: '2022-12-04', 2024: '2025-05-17' },
  },
  {
    id: 'rn', name: 'Rassemblement national', acronym: 'RN', color: '#1a2d5a', family: 'extreme-droite', lr: 0.82, cult: 0.9,
    ideology: 'Droite nationale et populiste : priorité nationale, réduction de l’immigration, autorité, protection économique, souverainisme.',
    members: 100000, budget: 22, territorial: 72, cohesion: 76, rejection: 0.55, transfer: 0.15, opp: 0.8,
    objective: 'Conquérir le pouvoir par les urnes et obtenir une majorité absolue.',
    factions: [{ name: 'Direction', share: 0.8, lrShift: 0 }, { name: 'Aile identitaire', share: 0.2, lrShift: 0.1 }],
    seats: { 2022: 89, 2024: 126 }, support: { 2022: 19, 2024: 33 }, leader: { 2022: 'lepen', 2024: 'bardella' }, congress: { 2022: '2022-11-05', 2024: '2027-01-30' },
  },
  {
    id: 'rec', name: 'Reconquête', acronym: 'REC', color: '#6e4630', family: 'extreme-droite', lr: 0.92, cult: 0.98,
    ideology: 'Droite identitaire : remigration, conservatisme culturel, souveraineté, libéralisme économique sélectif.',
    members: 100000, budget: 5, territorial: 35, cohesion: 55, rejection: 0.7, transfer: 0.1, opp: 0.7,
    objective: 'Exister face au RN et rallier les électeurs de la droite dure.',
    factions: [{ name: 'Direction', share: 0.8, lrShift: 0 }, { name: 'Aile conservatrice-libérale', share: 0.2, lrShift: -0.1 }],
    seats: { 2022: 0, 2024: 0 }, support: { 2022: 4.2, 2024: 2.5 }, leader: { 2022: 'zemmour', 2024: 'zemmour' }, congress: { 2022: '2023-12-09', 2024: '2026-03-14' },
  },
  {
    id: 'liot', name: 'Libertés, Indépendants, Outre-mer et Territoires', acronym: 'LIOT', color: '#8a7fb4', family: 'regionaliste', lr: -0.02, cult: 0.0,
    ideology: 'Indépendants et régionalistes : décentralisation, ruralité, défense des territoires et des outre-mer.',
    members: 8000, budget: 2, territorial: 55, cohesion: 45, rejection: 0.15, transfer: 0.8, opp: 0.5, regional: true,
    objective: 'Être l’arbitre des majorités sans en dépendre.',
    factions: [{ name: 'Indépendants du centre', share: 0.5, lrShift: 0.1 }, { name: 'Régionalistes et ultramarins', share: 0.5, lrShift: -0.1 }],
    seats: { 2022: 20, 2024: 22 }, support: { 2022: 1.8, 2024: 1.6 }, leader: { 2022: 'pancher', 2024: 'pancher' }, congress: { 2022: '2024-01-20', 2024: '2026-01-24' },
  },
  {
    id: 'ni', name: 'Divers et non-inscrits', acronym: 'DIV', color: '#9aa0a6', family: 'divers', lr: 0.1, cult: 0.1,
    ideology: 'Élus sans étiquette nationale, divers gauche, divers droite et dissidents.',
    members: 0, budget: 0, territorial: 30, cohesion: 20, rejection: 0.2, transfer: 0.5, opp: 0.6, pseudo: true,
    objective: '—',
    factions: [], seats: { 2022: 5, 2024: 27 }, support: { 2022: 3, 2024: 4 }, leader: { 2022: null, 2024: null }, congress: { 2022: '2099-01-01', 2024: '2099-01-01' },
  },
]

interface PersSeed {
  id: string
  name: string
  party: string
  role: Record<number, string>
  age: number
  bio: string
  t: [number, number, number, number, number, number] // ambition, pragmatisme, loyauté, charisme, intégrité, médias
  pop: number
  strategy: string
  dlr?: number
  dcult?: number
  convictions: string[]
}

const PERSONS: PersSeed[] = [
  { id: 'macron', name: 'Emmanuel Macron', party: 'ren', role: { 2022: 'Président de la République', 2024: 'Président de la République' }, age: 46, bio: 'Chef de l’État, issu du centre libéral.', t: [85, 85, 60, 85, 65, 88], pop: 38, strategy: 'arbitre', convictions: ['Europe', 'Réformes', 'Ni droite ni gauche'] },
  { id: 'attal', name: 'Gabriel Attal', party: 'ren', role: { 2022: 'Ministre', 2024: 'Premier ministre démissionnaire' }, age: 35, bio: 'Ancien Premier ministre, figure montante du camp présidentiel.', t: [88, 78, 62, 82, 68, 90], pop: 42, strategy: 'conquérant', convictions: ['Autorité', 'École', 'Réformes'] },
  { id: 'borne', name: 'Élisabeth Borne', party: 'ren', role: { 2022: 'Première ministre', 2024: 'Ancienne Première ministre' }, age: 61, bio: 'Haute fonctionnaire devenue Première ministre.', t: [55, 88, 80, 45, 80, 50], pop: 33, strategy: 'consolidateur', dlr: -0.1, convictions: ['Écologie planifiée', 'Dialogue social'] },
  { id: 'guerini', name: 'Stanislas Guerini', party: 'ren', role: { 2022: 'Délégué général de Renaissance', 2024: 'Ministre' }, age: 41, bio: 'Cadre du parti présidentiel.', t: [55, 80, 85, 50, 70, 55], pop: 28, strategy: 'consolidateur', convictions: ['Modernisation', 'Fonction publique'] },
  { id: 'darmanin', name: 'Gérald Darmanin', party: 'ren', role: { 2022: 'Ministre de l’Intérieur', 2024: 'Ministre de l’Intérieur' }, age: 41, bio: 'Ministre ambitieux issu de la droite.', t: [92, 82, 45, 70, 55, 85], pop: 40, strategy: 'conquérant', dlr: 0.2, dcult: 0.3, convictions: ['Sécurité', 'Ordre', 'Ambition personnelle'] },
  { id: 'braunpivet', name: 'Yaël Braun-Pivet', party: 'ren', role: { 2022: 'Présidente de l’Assemblée nationale', 2024: 'Présidente de l’Assemblée nationale' }, age: 53, bio: 'Présidente de l’Assemblée.', t: [60, 80, 75, 50, 75, 55], pop: 34, strategy: 'arbitre', convictions: ['Institutions', 'Parlementarisme'] },
  { id: 'melenchon', name: 'Jean-Luc Mélenchon', party: 'lfi', role: { 2022: 'Fondateur de La France insoumise', 2024: 'Fondateur de La France insoumise' }, age: 72, bio: 'Tribun de la gauche radicale.', t: [90, 40, 55, 92, 70, 90], pop: 30, strategy: 'conquérant', convictions: ['VIe République', 'Rupture', 'Planification'] },
  { id: 'bompard', name: 'Manuel Bompard', party: 'lfi', role: { 2022: 'Coordinateur', 2024: 'Coordinateur' }, age: 38, bio: 'Organisateur du mouvement.', t: [55, 65, 90, 55, 75, 60], pop: 20, strategy: 'consolidateur', convictions: ['Organisation', 'Fidélité'] },
  { id: 'ruffin', name: 'François Ruffin', party: 'lfi', role: { 2022: 'Député', 2024: 'Député' }, age: 49, bio: 'Député populiste-social, voix indépendante.', t: [82, 70, 35, 82, 78, 85], pop: 41, strategy: 'outsider', dlr: 0.15, dcult: 0.2, convictions: ['Classes populaires', 'Ruralité', 'Indépendance'] },
  { id: 'faure', name: 'Olivier Faure', party: 'ps', role: { 2022: 'Premier secrétaire', 2024: 'Premier secrétaire' }, age: 55, bio: 'Chef du Parti socialiste.', t: [65, 80, 70, 52, 78, 58], pop: 24, strategy: 'bâtisseur d’alliances', convictions: ['Union de la gauche', 'Social-démocratie'] },
  { id: 'glucksmann', name: 'Raphaël Glucksmann', party: 'ps', role: { 2022: 'Eurodéputé', 2024: 'Eurodéputé' }, age: 44, bio: 'Essayiste et eurodéputé social-démocrate.', t: [80, 82, 40, 78, 82, 85], pop: 38, strategy: 'outsider', dlr: 0.12, convictions: ['Europe', 'Ligne sociale-démocrate', 'Défense des droits'] },
  { id: 'bayou', name: 'Julien Bayou', party: 'eelv', role: { 2022: 'Secrétaire national', 2024: '' }, age: 42, bio: 'Ancien responsable écologiste.', t: [55, 70, 70, 55, 70, 60], pop: 18, strategy: 'consolidateur', convictions: ['Climat', 'Justice sociale'] },
  { id: 'tondelier', name: 'Marine Tondelier', party: 'eelv', role: { 2022: 'Élue locale', 2024: 'Secrétaire nationale' }, age: 37, bio: 'Dirigeante des écologistes.', t: [72, 78, 70, 78, 82, 88], pop: 33, strategy: 'bâtisseur d’alliances', convictions: ['Climat', 'Unité de la gauche', 'Démocratie locale'] },
  { id: 'rousseau', name: 'Sandrine Rousseau', party: 'eelv', role: { 2022: 'Députée', 2024: 'Députée' }, age: 52, bio: 'Députée écologiste, aile radicale.', t: [75, 40, 40, 70, 78, 82], pop: 18, strategy: 'purificateur', dlr: -0.1, convictions: ['Écoféminisme', 'Radicalité', 'Sobriété'] },
  { id: 'roussel', name: 'Fabien Roussel', party: 'pcf', role: { 2022: 'Secrétaire national', 2024: 'Secrétaire national' }, age: 54, bio: 'Chef du Parti communiste.', t: [75, 65, 70, 65, 80, 70], pop: 28, strategy: 'outsider', dcult: 0.25, convictions: ['Travail', 'Industrie', 'Laïcité'] },
  { id: 'bardella', name: 'Jordan Bardella', party: 'rn', role: { 2022: 'Président par intérim du RN', 2024: 'Président du RN' }, age: 28, bio: 'Président du Rassemblement national.', t: [85, 80, 75, 80, 65, 90], pop: 40, strategy: 'conquérant', convictions: ['Priorité nationale', 'Pouvoir d’achat', 'Sécurité'] },
  { id: 'lepen', name: 'Marine Le Pen', party: 'rn', role: { 2022: 'Présidente du groupe RN', 2024: 'Présidente du groupe RN' }, age: 53, bio: 'Figure historique du RN.', t: [90, 78, 70, 78, 60, 82], pop: 36, strategy: 'conquérant', convictions: ['Souveraineté', 'Immigration', 'Protection'] },
  { id: 'zemmour', name: 'Éric Zemmour', party: 'rec', role: { 2022: 'Président de Reconquête', 2024: 'Président de Reconquête' }, age: 65, bio: 'Polémiste devenu chef de parti.', t: [85, 35, 60, 75, 50, 85], pop: 16, strategy: 'purificateur', convictions: ['Identité', 'Remigration', 'Autorité'] },
  { id: 'maréchal', name: 'Marion Maréchal', party: 'rec', role: { 2022: 'Vice-présidente de Reconquête', 2024: 'Ancienne figure de Reconquête' }, age: 34, bio: 'Figure de la droite identitaire.', t: [85, 70, 35, 78, 65, 80], pop: 25, strategy: 'outsider', dlr: -0.05, convictions: ['Union des droites', 'Conservatisme'] },
  { id: 'jacob', name: 'Christian Jacob', party: 'lr', role: { 2022: 'Président des Républicains', 2024: '' }, age: 62, bio: 'Ancien président du parti.', t: [50, 75, 80, 50, 75, 55], pop: 20, strategy: 'consolidateur', convictions: ['Ruralité', 'Indépendance de LR'] },
  { id: 'ciotti', name: 'Éric Ciotti', party: 'lr', role: { 2022: 'Député', 2024: 'Président des Républicains' }, age: 59, bio: 'Chef de la droite, partisan d’une alliance avec le RN en 2024.', t: [80, 60, 45, 60, 65, 70], pop: 26, strategy: 'outsider', dlr: 0.15, dcult: 0.2, convictions: ['Union des droites', 'Autorité'] },
  { id: 'wauquiez', name: 'Laurent Wauquiez', party: 'lr', role: { 2022: 'Député', 2024: 'Président du groupe LR' }, age: 49, bio: 'Président du groupe de droite.', t: [88, 72, 50, 65, 62, 72], pop: 34, strategy: 'conquérant', dcult: 0.1, convictions: ['Droite assumée', 'Ordre', 'Territoires'] },
  { id: 'retailleau', name: 'Bruno Retailleau', party: 'lr', role: { 2022: 'Président du groupe LR au Sénat', 2024: 'Président du groupe LR au Sénat' }, age: 63, bio: 'Chef de file des sénateurs de droite.', t: [75, 65, 72, 55, 78, 62], pop: 30, strategy: 'conquérant', dlr: 0.05, dcult: 0.2, convictions: ['Autorité', 'Institutions', 'Conservatisme'] },
  { id: 'bayrou', name: 'François Bayrou', party: 'modem', role: { 2022: 'Président du MoDem', 2024: 'Président du MoDem' }, age: 73, bio: 'Chef du MoDem, centriste de longue date.', t: [75, 85, 65, 60, 75, 65], pop: 29, strategy: 'arbitre', convictions: ['Rassemblement', 'Proportionnelle', 'Dette'] },
  { id: 'philippe', name: 'Édouard Philippe', party: 'hor', role: { 2022: 'Président d’Horizons', 2024: 'Président d’Horizons' }, age: 53, bio: 'Ancien Premier ministre, fondateur d’Horizons.', t: [90, 85, 55, 65, 82, 75], pop: 44, strategy: 'conquérant', convictions: ['Gestion rigoureuse', 'Européen', 'Droite modérée'] },
  { id: 'pancher', name: 'Bertrand Pancher', party: 'liot', role: { 2022: 'Président du groupe LIOT', 2024: 'Président du groupe LIOT' }, age: 61, bio: 'Chef du groupe d’indépendants.', t: [50, 90, 60, 45, 80, 45], pop: 12, strategy: 'arbitre', convictions: ['Décentralisation', 'Indépendance'] },
]

export interface BaseScenario {
  date: string
  parties: Party[]
  persons: Person[]
  alliances: { id: string; name: string; partyIds: string[]; purpose: 'electoral' | 'gouvernementale' | 'parlementaire' }[]
  seats: Record<string, number>
  senate: Record<string, number>
  presidentId: string
  pmId: string
  govParties: string[]
  govName: string
  caretaker: boolean
  assemblyPresidentId: string
  lastLegislative: string
  lastPresidential: string
  economy: Omit<Economy, 'series'>
  note: string
}

const SENATE: Record<string, number> = { lr: 129, ps: 64, modem: 58, ren: 23, hor: 18, pcf: 18, liot: 15, eelv: 16, ni: 7 } // 348

const BASE_PARTY_STATE = {
  active: true,
  history: [] as { date: string; text: string }[],
  relations: {} as Record<string, number>,
}

export function buildBase(base: BaseYear): BaseScenario {
  const date = base === 2022 ? '2022-06-28' : '2024-07-19'
  const parties: Party[] = PARTIES.map((p) => ({
    id: p.id,
    name: p.name,
    acronym: p.acronym,
    color: p.color,
    family: p.family,
    lr: p.lr,
    cult: p.cult,
    ideology: p.ideology,
    leaderId: p.leader[base],
    members: p.members,
    budget: p.budget,
    support: p.support[base],
    territorial: p.territorial,
    cohesion: p.cohesion,
    rejection: p.rejection,
    transfer: p.transfer,
    oppositionStyle: p.opp,
    regional: !!p.regional,
    pseudo: !!p.pseudo,
    real: true,
    founded: '—',
    factions: p.factions.map((f) => ({ ...f })),
    objective: p.objective,
    nextCongress: p.congress[base],
    ...BASE_PARTY_STATE,
    history: [],
    relations: {},
  }))
  const total = parties.reduce((a, p) => a + p.support, 0)
  parties.forEach((p) => (p.support = (p.support / total) * 100))

  const persons: Person[] = PERSONS.map((s) => {
    const party = PARTIES.find((p) => p.id === s.party)!
    return {
      id: s.id,
      name: s.name,
      partyId: s.party,
      role: s.role[base] || 'Ancienne figure politique',
      age: s.age + (base === 2024 ? 2 : 0),
      bio: s.bio,
      ambition: s.t[0],
      pragmatism: s.t[1],
      loyalty: s.t[2],
      charisma: s.t[3],
      integrity: s.t[4],
      mediaSkill: s.t[5],
      lr: Math.max(-1, Math.min(1, party.lr + (s.dlr ?? 0))),
      cult: Math.max(-1, Math.min(1, party.cult + (s.dcult ?? 0))),
      popularity: s.pop,
      strategy: s.strategy,
      relations: {},
      fictional: false,
      active: !(base === 2022 ? false : s.role[2024] === ''),
      convictions: s.convictions,
    }
  })

  const seats: Record<string, number> = {}
  PARTIES.forEach((p) => (seats[p.id] = p.seats[base]))

  const alliances =
    base === 2022
      ? [
          { id: 'al-nupes', name: 'Nouvelle Union populaire écologique et sociale (NUPES)', partyIds: ['lfi', 'ps', 'eelv', 'pcf'], purpose: 'electoral' as const },
          { id: 'al-ens', name: 'Ensemble', partyIds: ['ren', 'modem', 'hor'], purpose: 'gouvernementale' as const },
        ]
      : [
          { id: 'al-nfp', name: 'Nouveau Front populaire (NFP)', partyIds: ['lfi', 'ps', 'eelv', 'pcf'], purpose: 'electoral' as const },
          { id: 'al-ens', name: 'Ensemble pour la République', partyIds: ['ren', 'modem', 'hor'], purpose: 'gouvernementale' as const },
        ]

  const economy: Omit<Economy, 'series'> =
    base === 2022
      ? { growth: 2.5, unemployment: 7.3, inflation: 5.2, debt: 111, deficit: 4.7, purchasing: 100, insecurity: 52, inequality: 48, publicServices: 52, approval: 38 }
      : { growth: 1.1, unemployment: 7.4, inflation: 2.3, debt: 112, deficit: 5.5, purchasing: 100, insecurity: 54, inequality: 49, publicServices: 47, approval: 28 }

  return {
    date,
    parties,
    persons,
    alliances,
    seats,
    senate: { ...SENATE },
    presidentId: 'macron',
    pmId: base === 2022 ? 'borne' : 'attal',
    govParties: ['ren', 'modem', 'hor'],
    govName: base === 2022 ? 'Gouvernement Borne' : 'Gouvernement Attal (démissionnaire)',
    caretaker: base === 2024,
    assemblyPresidentId: 'braunpivet',
    lastLegislative: base === 2022 ? '2022-06-19' : '2024-07-07',
    lastPresidential: '2022-04-24',
    economy,
    note:
      base === 2022
        ? 'Situation de départ approximative : lendemain des législatives de juin 2022 (majorité relative du camp présidentiel).'
        : 'Situation de départ approximative : ouverture de la XVIIe législature, juillet 2024 (Assemblée sans majorité).',
  }
}
