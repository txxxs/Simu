# 🧭 Simu — Test politique

Test politique en **HTML/CSS/JS pur** (aucun build, aucune dépendance) — interface **FR / EN**.

## Ce que fait le test
- **3 modes** : rapide (24 questions), complet (60), approfondi (96) ; questions alternées entre thèmes.
- **12 axes** : économie, société, autorité, nation, Europe, écologie, immigration, démocratie, laïcité, justice, redistribution, technologie.
- **Résultats** : famille politique, **parti**, **idéologie**, **pays** et **personnalité historique** les plus proches ; placement **gauche–droite** ; intensité des convictions ; résumé et étiquettes ; **3 boussoles** (avec les partis proches placés dessus) ; radar comparé au parti le plus proche ; détail par axe.
- **Priorités** : l'utilisateur choisit jusqu'à 3 thèmes qui comptent double dans les classements.
- **Partage** : image 1080×1350 et lien contenant le résultat (`#r=…`). Tout est calculé dans le navigateur.

## Lancer en local

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

Déployable tel quel sur GitHub Pages, Vercel ou Netlify (dossier racine).

## Structure

| Fichier | Rôle |
|---|---|
| `data/axes.js` | Les 12 axes (communs à tous les pays) |
| `data/fr.js` | Questions, **partis** et familles politiques de la **France** |
| `data/world.js` | **Idéologies**, **pays**, **personnalités** (communs à tous les pays) |
| `js/engine.js` | Calcul : scores, classement pondéré, gauche–droite, encodage URL (sans DOM) |
| `js/icons.js` | Jeu d'icônes maison en SVG (aucun emoji système) |
| `js/charts.js` | Radar, boussoles (SVG) et image de partage (canvas) |
| `js/app.js` / `js/i18n.js` | Interface et traductions |

## Ajouter un pays
1. Copier `data/fr.js` en `data/xx.js`, adapter `window.COUNTRIES.xx` (questions + partis + familles).
2. Ajouter `<script src="data/xx.js"></script>` dans `index.html`.
3. Le sélecteur de pays apparaît dès qu'il y en a au moins deux ; l'onglet « Partis » est masqué si le pays n'en définit pas.

## Méthode
Chaque question appartient à un axe et a un sens (`+1` / `-1`). Réponse sur 5 niveaux → score 0–100 par axe (50 = neutre).
Proximité = `100 − 1,4 × distance quadratique moyenne (pondérée)` entre l'utilisateur et chaque profil.

> ⚠️ Les vecteurs des **partis, pays, idéologies et personnalités** sont des **estimations indicatives** à relire/calibrer avant publication (idéalement sur des sources comme les enquêtes d'experts CHES ou le Manifesto Project).
