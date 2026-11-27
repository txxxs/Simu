# Calibration des partis

## Principe
Chaque parti est un vecteur de 12 valeurs (0–100) dans `data/fr-parties.js`. Le classement « parti le plus proche » est la distance (pondérée par les priorités de l'utilisateur) entre ce vecteur et ses réponses. **La crédibilité du test dépend de ces vecteurs.**

## Méthode actuelle (programmes 2026) — état au 27 novembre 2026
Chaque position a été **dérivée des programmes et déclarations de 2026** des candidats, puis rattachée à une source visible dans l'interface (« Sur quoi repose cette estimation »). Règles :
1. **Un thème non documenté n'est pas noté** (`null`) : il sort du calcul au lieu d'être deviné. La proximité est en plus réduite quand moins de 12 thèmes sont notés.
2. **Fiabilité à 3 niveaux** affichée par parti : 3 = programme 2027 détaillé et recoupé par la presse (LFI, LR, RN, Les Écologistes) ; 2 = positions documentées mais partielles ou issues d'agrégateurs ; 1 = peu documenté (NPA-R, Révolution permanente, Génération écologie, Parti animaliste, La France humaniste, Nouvelle Énergie, Nous France, Résistons !).
3. **Les en-têtes** des résultats (carte « parti le plus proche », radar, boussole, image de partage) ne retiennent que les partis de fiabilité ≥ 2.

### Sources lues
- **Candidatures** : LCP « La liste des candidats déclarés et potentiels » (maj 23 nov. 2026) et Wikipédia « Élection présidentielle française de 2027 ».
- **Programmes** : LCP (retraites, héritages, nouveau programme de J.-L. Mélenchon, débat devant le Medef, premières lignes du programme de R. Glucksmann, projet du PS), Public Sénat (retraites du RN, plan d'économies et référendum sur l'immigration de B. Retailleau, Attal et la fonction publique), CNews (programme d'É. Philippe), franceinfo, Poligraph, Wikipédia (pages des candidats).
- **Agrégateurs** (MonVote2027, Votons-2027, etc.) : utilisés seulement pour les petits candidats faute de mieux, et signalés comme tels. Ils se contredisent souvent (ex. retraite de Marine Le Pen, nucléaire de Fabien Roussel) : les points contradictoires n'ont été retenus que s'ils étaient confirmés par une source de presse.

### Contradictions et incertitudes relevées
- **Tondelier** : Wikipédia la dit désignée le 21 sept. 2026 ; LCP (23 nov.) indique qu'elle attend un vote des militants le 13 déc.
- **Lassalle** : LCP le compte parmi les candidatures annoncées ; d'autres sources indiquent qu'il n'a pas formellement déclaré (cagnotte lancée en juillet 2026).
- **Bertrand** : annoncé en 2024 mais LCP indique qu'il doit trancher d'ici fin 2026.
- **Philippe** : en septembre, LCP le disait hostile à l'abandon de l'âge légal ; CNews (15 nov.) rapporte « retraite à 65 ans / 45 annuités ».
- **Marine Le Pen** : candidature confirmée le 7 juil. 2026 ; pourvoi en cassation en attente.
- **Parti animaliste** : programme final annoncé pour le congrès du 14 nov. 2026, non lu ; le parti n'est noté que sur l'écologie.
- **Zemmour, Asselineau, Philippot** : programme 2027 complet non publié selon plusieurs sources ; positions reprises de leurs lignes constantes.

### Candidatures non intégrées (pas de parti ou aucune position documentée)
Francis Lalanne (France Libre / Front antirépublicain), Natacha Polony, Teddy Riner, Gilles Platret (divers droite), Karim Bouamrane (couvert par le PS), Olivier Becht (Renaissance/Agir), Benoît Mathieu, et les micro-mouvements Solution démocratique, Equinoxe, Les Ruches, La France adulte, À nous maintenant, Trajectoire, Mouvement écologiste indépendant, Elvita. François Ruffin (Debout !) s'est retiré le 21 nov. 2026.

## Limites connues
- Ce sont des **lectures de programmes**, pas des mesures d'experts. Elles restent discutables : à relire par quelqu'un de chaque sensibilité avant publication.
- Un même thème couvre plusieurs mesures (ex. « Société » : mariage, fin de vie, GPA…) ; le vecteur en donne une position moyenne.
- Les trotskistes (LO / NPA-R / Révolution permanente) sont quasi indiscernables sur ces 12 axes.

## Étape suivante : calibrer sur CHES (enquête d'experts)
L'accès à `chesdata.eu` était bloqué depuis l'environnement de développement. Dès que le fichier est disponible :
1. Télécharger le jeu « means » de la dernière vague sur <https://www.chesdata.eu> (+ codebook).
2. `python3 tools/ches_calibrate.py CHES_2024_means.csv --check` : écart, parti par parti, entre l'estimation actuelle et la mesure CHES.
3. **Vérifier avec le codebook** le sens de chaque échelle (voir l'en-tête du script), puis relancer sans `--check` : écrit `data/fr-ches.js`, qui écrase les axes mesurés et fixe la fiabilité à 3.

CHES couvre : économie, redistribution, société, autorité, Europe, écologie, immigration, nation, laïcité (indicatif). **Pas** : démocratie directe, justice, technologie.
