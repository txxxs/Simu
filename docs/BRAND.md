# Azimut — identité de marque

## Le logo
Le **A** est un **compas à pointes sèches** : deux branches s'ouvrent depuis une charnière (orange). L'angle entre elles est matérialisé par une **graduation en éventail** (turquoise), dont le trait central, plus long, marque le cap : c'est l'**azimut**, l'angle qui dit dans quelle direction on se situe. Les lettres **ZIMUT** sont dessinées au même trait fin, à bouts ronds, et ne dépendent d'aucune police.

## Fichiers (`assets/logo/`)
| Fichier | Usage |
|---|---|
| `azimut-logo.svg` / `.png` | Logo complet, **sur fond sombre** |
| `azimut-logo-light.svg` / `.png` | Logo complet, **sur fond clair** |
| `azimut-mark.svg`, `azimut-mark-light.svg` | Le « A » seul (avatar, petit format) |
| `azimut-icon.svg`, `azimut-icon-512.png`, `azimut-icon-192.png` | Icône d'application (tuile arrondie) |
| `favicon.svg`, `apple-touch-icon.png` | Onglet du navigateur, écran d'accueil iOS |

Les fichiers sont **générés** par `node tools/make-logo.js` à partir des tracés de `js/icons.js` : c'est la source unique. Les PNG demandent Playwright (`npm i playwright`) ; sans lui, seuls les SVG sont écrits. Le site utilise le même tracé en ligne et suit donc le thème clair/sombre.

## Couleurs
| Rôle | Sombre | Clair |
|---|---|---|
| Traits du logo | `#e8f0f7` | `#0b1f33` |
| Graduation (cap) | `#38d9c0` | `#0b8f7d` |
| Charnière | `#ff7849` | `#e8541f` |
| Fond de l'icône | `#0a1b2e` | `#eef3f8` |

## Typographie
Titres : **Syne** 700–800 · Texte : **Figtree** · Étiquettes et chiffres : **IBM Plex Mono** (toutes sur Google Fonts).

## Règles d'usage
- **Zone de protection** : au moins la hauteur du « A » autour du logo.
- **Taille minimale** : 24 px de haut pour le logo complet, 16 px pour le « A » seul (la graduation disparaît en dessous de ~20 px : utiliser alors la version sans détail, ou l'icône).
- À ne pas faire : déformer, pivoter, changer les couleurs de la charnière ou de la graduation, ajouter des ombres ou des contours, placer le logo sur un fond de contraste insuffisant, redessiner les lettres dans une autre police.
