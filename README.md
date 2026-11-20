# L'Hémicycle — simulateur politique français (mode narrateur)

Jeu de simulation politique sur navigateur. **Vous êtes le narrateur** : vous écrivez des événements
(« Le président annonce une dissolution », « Un nouveau parti communiste est créé… »), le moteur met à jour
les données et simule les conséquences : partis et dirigeants autonomes, sondages dynamiques, Parlement,
médias, élections incertaines, crises, économie.

## Lancer le jeu

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
npm run dev
```

Ouvrez **http://localhost:5173**, choisissez l'année, France réelle ou alternative, le réalisme, puis
« Lancer la simulation ».

Version « production » (un seul serveur) : `npm run build && npm start`, puis http://localhost:8787.

## Activer l'IA (facultatif)

Sans clé, le jeu fonctionne en **mode hors-ligne** (interprétation par règles + textes générés localement).
Avec une clé, Claude interprète n'importe quelle formulation du narrateur et rédige articles, interviews,
débats et discours.

```bash
cp .env.example .env      # puis renseignez ANTHROPIC_API_KEY dans .env
npm run dev
```

La clé reste **uniquement côté serveur** (`server/index.js`) : le navigateur n'appelle que `/api/*`.
Le serveur limite le débit, valide les requêtes ; les réponses de l'IA sont validées par le moteur
(`src/engine/bridge.ts`) avant toute modification de la partie.

## Tester

```bash
npm test           # invariants du moteur (577 sièges, sondages = 100 %, déterminisme, parser…)
npm run typecheck
```

## Fonctionnalités de cette première version

- **Tableau de bord**, **fil d'actualité**, **calendrier**, **console du narrateur** (toujours accessible en bas).
- **Partis & personnages** : fiches détaillées (idéologie, dirigeant, courants internes, relations, personnalité).
- **Hémicycle interactif de 577 députés** (fictifs), Sénat (348), lois et votes.
- **Sondages dynamiques** : un « niveau réel » caché évolue par dérive lente et par événements (effet durable +
  effet transitoire) ; chaque sondage ajoute un bruit d'échantillonnage. L'interface distingue variation
  *significative* (●) et *fluctuation statistique* (○), avec moyenne glissante et « vue du MJ ».
  Tous les instituts sont **fictifs**.
- **Élections** : législatives (dissolution comprise), présidentielle à deux tours, européennes, municipales,
  régionales, départementales, sénatoriales, référendum. **Carte** en cartogramme des régions.
- **Autonomie** : congrès, changements de direction, alliances et ruptures, scissions, fusions, nouveaux mouvements,
  motions de censure, 49.3, dissolution décidée par le président, scandales, mobilisations, crises.
- **Mémoire** : chronique datée complète, lois, élections, crises, interventions ; **sauvegarde** locale
  (IndexedDB, auto-sauvegarde), **export/import JSON**, copie de la sauvegarde.
- Responsive (ordinateur/téléphone), thème clair/sombre automatique.

## Architecture

```
server/index.js        Proxy Claude (clé côté serveur), limite de débit, sert le build en production
src/engine/            Moteur déterministe (TypeScript pur, testé) : état, sondages, parlement,
                       élections, lois, IA des acteurs, opérations, interprétation hors-ligne
src/engine/data/       Situations de départ (2022, 2024) ; autres années = transposition approximative
src/store/             État de l'application (Zustand) + sauvegardes IndexedDB
src/api/               Client des endpoints /api
src/ui/                Pages et composants (SVG pour hémicycle, courbes et carte, sans dépendance de graphiques)
tests/                 Vitest
```

Principe : le **moteur** est la source de vérité chiffrée (somme des sièges = 577, sondages = 100 %, chronologie,
graine aléatoire sauvegardée). L'**IA** ne fait que traduire le texte du narrateur en *opérations* validées et
rédiger du texte ; elle ne modifie jamais directement les données.

## Limites connues (v0.1)

- Données « France réelle » approximatives (2022 et 2024 seulement) ; les profils de personnalités sont des
  paramètres de simulation, pas des faits. Les députés sont fictifs.
- Le Sénat est simplifié ; le gouvernement est modélisé par sa coalition et son Premier ministre (pas de ministres individuels).
- Carte par régions (cartogramme), pas encore par départements/circonscriptions.
- Changements de régime et révisions constitutionnelles : à développer.

## Feuille de route

1. Ministres et portefeuilles, remaniements détaillés.
2. Carte par départements, municipales ville par ville.
3. Constitution et changements de régime (procédures, oppositions).
4. Diplomatie (UE, ONU, OTAN), dirigeants étrangers autonomes.
5. Presets historiques supplémentaires (1981, 2002, 2017…).

*Œuvre de fiction : personnages réels présentés avec des profils simulés ; événements, résultats et sondages inventés.*
