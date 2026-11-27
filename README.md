# 🧭 Simu — Test politique

Test politique en **HTML/CSS/JS pur** (aucun build, aucune dépendance) : 12 axes, boussole, radar, courants les plus proches, image de partage. Interface **FR / EN**.

## Lancer en local

```bash
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

Déployable tel quel sur GitHub Pages, Vercel ou Netlify (dossier racine).

## Structure

| Fichier | Rôle |
|---|---|
| `data/axes.js` | Les 12 axes (communs à tous les pays) |
| `data/fr.js` | Questions + profils/courants **France** |
| `js/engine.js` | Calcul des scores, proximité, encodage de l'URL (sans DOM) |
| `js/charts.js` | Radar, boussole (SVG) et image de partage (canvas) |
| `js/app.js` / `js/i18n.js` | Interface et traductions |

## Ajouter un pays

1. Copier `data/fr.js` en `data/xx.js`, adapter `window.COUNTRIES.xx` (questions + profils).
2. Ajouter `<script src="data/xx.js"></script>` dans `index.html`.
3. Le sélecteur de pays apparaît automatiquement dès qu'il y en a au moins deux.

## Méthode

Chaque question appartient à un axe et a un sens (`+1` / `-1`). Réponse sur 5 niveaux → score 0–100 par axe (50 = neutre).
La proximité avec un courant = `100 − 1,5 × distance quadratique moyenne` entre le vecteur de l'utilisateur et le profil-type.
Les profils sont **indicatifs** et à calibrer. Tout est calculé côté navigateur ; le résultat est encodé dans l'URL (`#r=…`).
