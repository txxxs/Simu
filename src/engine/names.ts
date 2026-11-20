import type { GameState } from './types'
import { pick, rand } from './rng'

const PRENOMS_F = ['Camille', 'Claire', 'Sophie', 'Nathalie', 'Isabelle', 'Léa', 'Anne', 'Marie', 'Laure', 'Sandrine', 'Hélène', 'Aurélie', 'Émilie', 'Véronique', 'Juliette', 'Élodie', 'Céline', 'Agnès', 'Mathilde', 'Pauline']
const PRENOMS_M = ['Julien', 'Thomas', 'Nicolas', 'Antoine', 'Pierre', 'Laurent', 'Mathieu', 'François', 'Olivier', 'Vincent', 'Sébastien', 'Guillaume', 'Romain', 'Xavier', 'Cédric', 'Benoît', 'Hugo', 'Étienne', 'Damien', 'Fabrice']
const NOMS = ['Lefèvre', 'Moreau', 'Girard', 'Roussel', 'Fontaine', 'Chevalier', 'Mercier', 'Blanc', 'Garnier', 'Faure', 'Rousseau', 'Boyer', 'Lambert', 'Morel', 'Perrin', 'Barbier', 'Dupuis', 'Marchand', 'Colin', 'Renard', 'Vidal', 'Caron', 'Leroux', 'Guerin', 'Meunier', 'Brunet', 'Gaillard', 'Charpentier', 'Bertrand', 'Lacroix', 'Picard', 'Delmas', 'Joly', 'Maillard', 'Aubert', 'Carpentier', 'Navarro', 'Besson', 'Lemoine', 'Collet', 'Pons', 'Rey', 'Tessier', 'Vasseur', 'Descamps', 'Bouvier', 'Sauvage', 'Hamon']

export function randomName(s: Pick<GameState, 'rng'>) {
  const female = pick(s, [true, false])
  return `${pick(s, female ? PRENOMS_F : PRENOMS_M)} ${pick(s, NOMS)}`
}

const PARTY_WORDS: Record<string, { names: string[]; acr: string[] }> = {
  'extreme-gauche': { names: ['Gauche Révolutionnaire', 'Front des Travailleurs', 'Parti de la Rupture', 'Alternative Anticapitaliste'], acr: ['GR', 'FDT', 'PDR', 'AA'] },
  gauche: { names: ['Gauche Citoyenne', 'Mouvement Social Républicain', 'Renouveau Socialiste', 'Gauche Unie'], acr: ['GC', 'MSR', 'RS', 'GU'] },
  ecologiste: { names: ['Écologie Solidaire', 'Terre Commune', 'Les Verts Indépendants', 'Alliance Écologique'], acr: ['ES', 'TC', 'LVI', 'AE'] },
  centre: { names: ['Mouvement Réformiste', 'Centre Moderne', 'Les Progressistes', 'Union des Modérés'], acr: ['MR', 'CM', 'LP', 'UDM'] },
  droite: { names: ['Droite Républicaine Libre', 'Les Conservateurs Français', 'Union pour la Tradition', 'Renouveau Gaulliste'], acr: ['DRL', 'LCF', 'UPT', 'RG'] },
  'extreme-droite': { names: ['Front Patriote', 'Mouvement Souverainiste', 'Identité Nationale', 'Rassemblement Populaire Français'], acr: ['FP', 'MS', 'IN', 'RPF'] },
  regionaliste: { names: ['Union des Territoires', 'Autonomie et Libertés', 'Mouvement des Régions'], acr: ['UDT', 'AL', 'MDR'] },
  divers: { names: ['Mouvement Citoyen', 'Les Indépendants Unis', 'Nouvelle Voie'], acr: ['MC', 'LIU', 'NV'] },
}

export function randomPartyName(s: Pick<GameState, 'rng'>, family: string, taken: Set<string>) {
  const w = PARTY_WORDS[family] ?? PARTY_WORDS.divers
  for (let i = 0; i < 12; i++) {
    const k = Math.floor(rand(s) * w.names.length)
    const name = w.names[k]
    if (!taken.has(name)) return { name, acronym: w.acr[k] }
  }
  const n = w.names[0] + ' ' + (taken.size + 2)
  return { name: n, acronym: w.acr[0] + (taken.size + 2) }
}
