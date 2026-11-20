// Régions (cartogramme en tuiles) — populations approximatives (millions) pour répartir les circonscriptions.
export interface Region {
  id: string
  name: string
  short: string
  col: number
  row: number
  pop: number
  lr: number // sensibilité locale (décalage idéologique de l'électorat)
  cult: number
}

export const REGIONS: Region[] = [
  { id: 'hdf', name: 'Hauts-de-France', short: 'HdF', col: 3, row: 0, pop: 6.0, lr: 0.05, cult: 0.35 },
  { id: 'nor', name: 'Normandie', short: 'Nor', col: 2, row: 1, pop: 3.3, lr: 0.1, cult: 0.1 },
  { id: 'idf', name: 'Île-de-France', short: 'IdF', col: 3, row: 1, pop: 12.3, lr: -0.05, cult: -0.3 },
  { id: 'ge', name: 'Grand Est', short: 'GE', col: 4, row: 1, pop: 5.6, lr: 0.15, cult: 0.35 },
  { id: 'bre', name: 'Bretagne', short: 'Bre', col: 0, row: 2, pop: 3.4, lr: -0.15, cult: -0.25 },
  { id: 'pdl', name: 'Pays de la Loire', short: 'PdL', col: 1, row: 2, pop: 3.8, lr: 0.05, cult: -0.05 },
  { id: 'cvl', name: 'Centre-Val de Loire', short: 'CVL', col: 2, row: 2, pop: 2.6, lr: 0.05, cult: 0.1 },
  { id: 'bfc', name: 'Bourgogne-Franche-Comté', short: 'BFC', col: 3, row: 2, pop: 2.8, lr: 0.0, cult: 0.15 },
  { id: 'naq', name: 'Nouvelle-Aquitaine', short: 'NAq', col: 1, row: 3, pop: 6.1, lr: -0.1, cult: -0.05 },
  { id: 'ara', name: 'Auvergne-Rhône-Alpes', short: 'ARA', col: 3, row: 3, pop: 8.1, lr: 0.12, cult: 0.0 },
  { id: 'occ', name: 'Occitanie', short: 'Occ', col: 2, row: 4, pop: 6.0, lr: -0.12, cult: 0.0 },
  { id: 'paca', name: "Provence-Alpes-Côte d'Azur", short: 'PACA', col: 4, row: 4, pop: 5.1, lr: 0.18, cult: 0.35 },
  { id: 'cor', name: 'Corse', short: 'Cor', col: 5, row: 5, pop: 0.35, lr: 0.1, cult: 0.25 },
  { id: 'om', name: 'Outre-mer', short: 'OM', col: 0, row: 5, pop: 2.2, lr: -0.2, cult: 0.0 },
  { id: 'etr', name: 'Français de l’étranger', short: 'Étr.', col: 1, row: 5, pop: 0.0, lr: 0.05, cult: -0.3 },
]
export const ETRANGER_SEATS = 11
