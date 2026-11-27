# Calibration des partis

## Principe
Chaque parti est un vecteur de 12 valeurs (0–100) dans `data/fr.js`. Le classement « parti le plus proche » est la distance (pondérée par les priorités de l'utilisateur) entre ce vecteur et les réponses du test. **La crédibilité du test dépend donc entièrement de ces vecteurs.**

## État actuel (honnête)
- **Liste des candidats** : vérifiée sur LCP (maj 23 nov. 2026) et Wikipédia (« Élection présidentielle française de 2027 »), état au 27 nov. 2026. Elle n'est pas officielle : le Conseil constitutionnel valide après 500 parrainages (avant le 12 mars 2027), 1er tour le 18 avril 2027.
- **Vecteurs des partis** : estimations documentées par les programmes et positions publiques, **pas encore calibrées** sur des données d'experts, car le jeu CHES n'était pas accessible depuis l'environnement de développement.
- **Fiabilité affichée** dans l'interface (3 points) : 3 = positions très documentées (LFI, PCF, PS, Écologistes, Renaissance, LR, RN, Reconquête, LO) ; 2 = correctement documentées ; 1 = peu documentées (partis récents ou confidentiels : Révolution permanente, Génération écologie, Parti animaliste, Nouvelle Énergie, La France humaniste, Résistons !, Nous France). **Ce sont les premiers à vérifier.**

## Calibrer sur CHES (recommandé)
1. Télécharger le jeu « means » de la dernière vague (2024) sur <https://www.chesdata.eu> et le codebook.
2. `python3 tools/ches_calibrate.py CHES_2024_means.csv --check` → affiche, parti par parti, l'écart entre l'estimation actuelle et la mesure CHES, et les partis sans correspondance (compléter avec `--map`).
3. **Vérifier avec le codebook** le sens de chaque échelle (voir l'en-tête du script) puis lancer sans `--check` : écrit `data/fr-ches.js`, qui écrase automatiquement les axes mesurés et fixe la fiabilité à 3.

Axes couverts par CHES : économie, redistribution, société, autorité, Europe, écologie, immigration, nation, laïcité (indicatif). **Non couverts** : démocratie directe, justice, technologie → restent des estimations programmatiques.

## Autres sources utiles
Manifesto Project (programmes codés), programmes officiels des candidats, votes à l'Assemblée (Scrutins/Datan), études Cevipof. Les partis absents de CHES (récents ou petits) ne peuvent être calibrés que sur leurs programmes.
