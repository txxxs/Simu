/* Données France. Pour ajouter un pays : copier ce fichier en data/xx.js,
   adapter questions + profils, puis l'ajouter dans index.html. */
(function () {
  // [axe, sens, texte FR, texte EN, mode court ?]
  // sens +1 : "d'accord" pousse vers le pôle B ; -1 : vers le pôle A.
  const Q = [
    // ÉCONOMIE (A = étatisme, B = libre marché)
    ['eco', -1, "L'État devrait nationaliser les secteurs stratégiques (énergie, transports, banques).", "The state should nationalise strategic sectors (energy, transport, banks).", 1],
    ['eco', +1, "Les entreprises créent plus de richesse quand l'État les laisse tranquilles.", "Businesses create more wealth when the state leaves them alone.", 1],
    ['eco', -1, "Le salaire minimum devrait être fortement augmenté par la loi.", "The minimum wage should be sharply raised by law.", 0],
    ['eco', +1, "Il faut faciliter les licenciements pour encourager les embauches.", "Dismissals should be made easier to encourage hiring.", 0],
    ['eco', -1, "Les services publics devraient rester gérés par l'État plutôt que privatisés.", "Public services should stay state-run rather than be privatised.", 0],
    // SOCIÉTÉ (A = conservateur, B = progressiste)
    ['soc', +1, "Le mariage et l'adoption devraient être ouverts à tous les couples, sans distinction.", "Marriage and adoption should be open to all couples without distinction.", 1],
    ['soc', -1, "La famille traditionnelle est le socle de la société.", "The traditional family is the foundation of society.", 1],
    ['soc', +1, "L'euthanasie devrait être légalisée dans un cadre strict.", "Euthanasia should be legalised within a strict framework.", 0],
    ['soc', -1, "Certaines évolutions sociétales récentes sont allées trop loin et il faut revenir en arrière.", "Some recent social changes have gone too far and should be rolled back.", 0],
    ['soc', +1, "La société doit reconnaître et protéger toutes les identités de genre.", "Society must recognise and protect all gender identities.", 0],
    // AUTORITÉ (A = autoritaire, B = libertaire)
    ['lib', -1, "La sécurité justifie une surveillance accrue des communications.", "Security justifies increased surveillance of communications.", 1],
    ['lib', +1, "Le cannabis devrait être légalisé.", "Cannabis should be legalised.", 1],
    ['lib', -1, "Il faut plus d'ordre et de discipline à l'école et dans la société.", "We need more order and discipline in schools and in society.", 0],
    ['lib', +1, "Le droit de manifester ne doit pas être restreint, même quand il perturbe l'ordre public.", "The right to protest must not be restricted, even when it disrupts public order.", 0],
    ['lib', -1, "Un pouvoir fort vaut mieux que trop de débats et de contre-pouvoirs.", "A strong government is better than too much debate and too many checks and balances.", 0],
    // NATION (A = souverainiste, B = internationaliste)
    ['nat', -1, "La France doit garder la maîtrise de ses décisions, même si cela l'isole parfois.", "France must keep control of its own decisions, even if that sometimes isolates it.", 1],
    ['nat', +1, "Les frontières sont un concept dépassé : l'avenir est à la coopération mondiale.", "Borders are outdated: the future lies in global cooperation.", 1],
    ['nat', -1, "Nous devrions réduire notre dépendance au commerce international, même si les prix augmentent.", "We should reduce our reliance on international trade, even if prices rise.", 0],
    ['nat', +1, "Les grandes décisions (climat, pandémies) doivent être prises au niveau mondial.", "Major decisions (climate, pandemics) should be made at the global level.", 0],
    ['nat', -1, "L'intérêt national doit passer avant les engagements internationaux.", "The national interest must come before international commitments.", 0],
    // EUROPE (A = eurosceptique, B = fédéraliste)
    ['eur', -1, "La France devrait quitter l'Union européenne ou renégocier radicalement les traités.", "France should leave the European Union or radically renegotiate the treaties.", 1],
    ['eur', +1, "L'UE devrait avoir sa propre armée et une politique étrangère commune.", "The EU should have its own army and a common foreign policy.", 1],
    ['eur', -1, "Les lois européennes ne devraient pas primer sur les lois françaises.", "European laws should not take precedence over French laws.", 0],
    ['eur', +1, "La monnaie unique est un atout pour la France.", "The single currency is an asset for France.", 0],
    ['eur', +1, "Le Parlement européen devrait avoir plus de pouvoir au détriment des États.", "The European Parliament should have more power at the expense of member states.", 0],
    // ÉCOLOGIE (A = productivisme, B = écologisme)
    ['env', +1, "Il faut limiter la croissance économique pour préserver l'environnement.", "Economic growth must be limited in order to protect the environment.", 1],
    ['env', -1, "La priorité est de relancer la production industrielle, même au prix de quelques entorses environnementales.", "The priority is to boost industrial production, even at some environmental cost.", 1],
    ['env', +1, "Les produits polluants devraient être lourdement taxés, même si cela réduit le pouvoir d'achat.", "Polluting products should be heavily taxed, even if it reduces purchasing power.", 0],
    ['env', -1, "La protection de l'environnement sert souvent de prétexte pour freiner l'économie.", "Environmental protection is often used as a pretext to hold back the economy.", 0],
    ['env', +1, "Il faut interdire les pesticides les plus nocifs, même si les rendements agricoles baissent.", "The most harmful pesticides should be banned, even if crop yields fall.", 0],
    // IMMIGRATION (A = fermeté, B = ouverture)
    ['imm', -1, "Le nombre d'immigrés accueillis chaque année devrait être fortement réduit.", "The number of immigrants admitted each year should be sharply reduced.", 1],
    ['imm', +1, "Les personnes sans-papiers installées depuis longtemps devraient être régularisées.", "Long-settled undocumented people should be granted legal status.", 1],
    ['imm', -1, "Les étrangers devraient s'assimiler pleinement à la culture française.", "Foreigners should fully assimilate into French culture.", 0],
    ['imm', +1, "L'immigration est globalement une chance pour la France.", "Immigration is, overall, an opportunity for France.", 0],
    ['imm', -1, "Le droit du sol devrait être restreint.", "Birthright citizenship (droit du sol) should be restricted.", 0],
    // DÉMOCRATIE (A = représentative, B = directe)
    ['dem', +1, "Les citoyens devraient pouvoir proposer et voter des lois par référendum d'initiative citoyenne.", "Citizens should be able to propose and pass laws via citizen-initiated referendums.", 1],
    ['dem', -1, "Les décisions complexes sont mieux prises par des experts que par le vote populaire.", "Complex decisions are better made by experts than by popular vote.", 1],
    ['dem', +1, "Le vote blanc devrait être reconnu comme un suffrage exprimé.", "Blank votes should count as votes cast.", 0],
    ['dem', +1, "Des assemblées de citoyens tirés au sort devraient pouvoir contraindre le Parlement.", "Assemblies of randomly selected citizens should be able to bind Parliament.", 0],
    ['dem', -1, "Un exécutif fort et stable vaut mieux que des consultations permanentes.", "A strong, stable executive is better than constant consultations.", 0],
    // LAÏCITÉ (A = stricte, B = ouverte)
    ['laic', -1, "Les signes religieux devraient être interdits dans tout l'espace public.", "Religious symbols should be banned throughout the public space.", 1],
    ['laic', +1, "Chacun doit pouvoir afficher sa religion dans l'espace public sans restriction.", "Everyone should be free to display their religion in public without restriction.", 1],
    ['laic', -1, "La laïcité est avant tout un rempart contre l'influence des religions sur la vie publique.", "Secularism is above all a bulwark against religious influence on public life.", 0],
    ['laic', +1, "Les cantines scolaires devraient proposer des menus adaptés aux convictions religieuses.", "School canteens should offer menus adapted to religious beliefs.", 0],
    ['laic', -1, "Les religions devraient rester strictement cantonnées à la sphère privée.", "Religion should remain strictly confined to the private sphere.", 0],
    // JUSTICE (A = répressive, B = réhabilitative)
    ['jus', -1, "Les peines de prison devraient être plus longues et plus systématiques.", "Prison sentences should be longer and more systematic.", 1],
    ['jus', +1, "La prison devrait être un dernier recours ; il faut privilégier les peines alternatives.", "Prison should be a last resort; alternative sentences should be favoured.", 1],
    ['jus', -1, "Les mineurs délinquants devraient être jugés comme des adultes à partir d'un certain âge.", "Juvenile offenders should be tried as adults from a certain age.", 0],
    ['jus', +1, "La police devrait être davantage contrôlée par des instances indépendantes.", "The police should be more closely overseen by independent bodies.", 0],
    ['jus', -1, "La peine de mort devrait être rétablie pour les crimes les plus graves.", "The death penalty should be reinstated for the most serious crimes.", 0],
    // REDISTRIBUTION (A = forte, B = faible)
    ['fisc', -1, "Les impôts sur les très hauts revenus et patrimoines devraient être nettement relevés.", "Taxes on very high incomes and wealth should be raised significantly.", 1],
    ['fisc', +1, "Il y a trop de prélèvements obligatoires en France.", "There are too many compulsory levies in France.", 1],
    ['fisc', +1, "Les allocations devraient être conditionnées à une recherche active d'emploi.", "Benefits should be conditional on actively seeking work.", 0],
    ['fisc', -1, "Un revenu universel versé à tous devrait être instauré.", "A universal basic income paid to everyone should be introduced.", 0],
    ['fisc', -1, "La protection sociale doit rester financée solidairement, quelle que soit la contribution de chacun.", "Social protection should remain solidarity-funded, regardless of individual contributions.", 0],
    // TECHNOLOGIE (A = sceptique, B = enthousiaste)
    ['tech', +1, "Le progrès technologique résoudra l'essentiel de nos problèmes.", "Technological progress will solve most of our problems.", 1],
    ['tech', -1, "Nous devrions ralentir le développement de l'intelligence artificielle et de l'automatisation.", "We should slow down the development of AI and automation.", 1],
    ['tech', +1, "Les biotechnologies (OGM, édition génétique) devraient être encouragées.", "Biotechnologies (GMOs, gene editing) should be encouraged.", 0],
    ['tech', -1, "Le numérique et les réseaux sociaux ont fait globalement plus de mal que de bien.", "Digital technology and social media have done more harm than good overall.", 0],
    ['tech', +1, "L'exploration spatiale mérite des investissements publics importants.", "Space exploration deserves significant public investment.", 0],

    /* ===== Niveau 3 : test approfondi (6e valeur = 3) ===== */
    ['eco', +1, "La concurrence entre entreprises profite davantage aux consommateurs que la régulation de l'État.", "Competition between firms benefits consumers more than state regulation does.", 0, 3],
    ['eco', -1, "L'État devrait contrôler les prix des produits de première nécessité (énergie, alimentation).", "The state should control the prices of essentials (energy, food).", 0, 3],
    ['eco', +1, "Les syndicats ont trop de pouvoir dans l'économie.", "Trade unions have too much power in the economy.", 0, 3],
    ['soc', +1, "Chacun devrait pouvoir choisir librement son mode de vie sans jugement moral de la société.", "Everyone should be free to choose their way of life without moral judgement from society.", 0, 3],
    ['soc', -1, "La religion et les traditions sont indispensables pour transmettre des valeurs morales solides.", "Religion and traditions are essential to pass on strong moral values.", 0, 3],
    ['soc', +1, "La gestation pour autrui (GPA) devrait être légalisée et encadrée.", "Surrogacy should be legalised and regulated.", 0, 3],
    ['lib', -1, "Il est acceptable de limiter certaines libertés individuelles pour protéger la sécurité nationale.", "It is acceptable to limit some individual freedoms to protect national security.", 0, 3],
    ['lib', +1, "La liberté d'expression doit être protégée même pour des opinions choquantes ou offensantes.", "Free speech must be protected even for shocking or offensive opinions.", 0, 3],
    ['lib', -1, "Les forces de l'ordre devraient disposer de pouvoirs élargis, même au détriment de certaines garanties.", "Law enforcement should have expanded powers, even at the expense of some safeguards.", 0, 3],
    ['nat', +1, "Les institutions internationales (ONU, OMC, CPI) devraient pouvoir imposer leurs décisions aux États.", "International institutions (UN, WTO, ICC) should be able to bind states.", 0, 3],
    ['nat', -1, "La préférence nationale devrait s'appliquer à l'emploi et au logement.", "National preference should apply to jobs and housing.", 0, 3],
    ['nat', +1, "Un citoyen a autant de devoirs envers l'humanité qu'envers son propre pays.", "A citizen has as many duties to humanity as to their own country.", 0, 3],
    ['eur', +1, "La France devrait accepter de transférer davantage de souveraineté budgétaire à l'UE.", "France should accept transferring more budgetary sovereignty to the EU.", 0, 3],
    ['eur', -1, "L'élargissement de l'UE à de nouveaux pays est une erreur.", "Enlarging the EU to new countries is a mistake.", 0, 3],
    ['eur', +1, "Les élections européennes devraient se faire sur des listes transnationales.", "European elections should be held on transnational lists.", 0, 3],
    ['env', +1, "Le prix de l'énergie devrait refléter son coût climatique, même s'il augmente fortement.", "Energy prices should reflect their climate cost, even if they rise sharply.", 0, 3],
    ['env', -1, "Il faut continuer à exploiter les énergies fossiles tant que c'est rentable.", "We should keep exploiting fossil fuels as long as it is profitable.", 0, 3],
    ['env', +1, "Il faut réduire fortement la consommation de viande pour protéger le climat.", "Meat consumption must be sharply reduced to protect the climate.", 0, 3],
    ['imm', +1, "Les demandeurs d'asile devraient avoir le droit de travailler dès leur arrivée.", "Asylum seekers should have the right to work as soon as they arrive.", 0, 3],
    ['imm', -1, "Les expulsions d'étrangers en situation irrégulière devraient être systématiques.", "Deportations of irregular migrants should be systematic.", 0, 3],
    ['imm', +1, "Un pays n'a pas le droit de refuser l'entrée à des personnes qui fuient la misère.", "A country has no right to turn away people fleeing poverty.", 0, 3],
    ['dem', +1, "Les élus devraient pouvoir être révoqués par les citoyens en cours de mandat.", "Elected officials should be recallable by citizens during their term.", 0, 3],
    ['dem', -1, "Tout le monde n'est pas assez informé pour bien voter : le suffrage universel a ses limites.", "Not everyone is informed enough to vote well: universal suffrage has its limits.", 0, 3],
    ['dem', +1, "Une partie des budgets publics devrait être décidée par des votes citoyens.", "Part of public budgets should be decided by citizen votes.", 0, 3],
    ['laic', -1, "Les aménagements religieux (menus, horaires) n'ont pas leur place dans le service public.", "Religious accommodations (menus, schedules) have no place in the public service.", 0, 3],
    ['laic', +1, "Les jours fériés devraient refléter la diversité religieuse du pays.", "Public holidays should reflect the country's religious diversity.", 0, 3],
    ['laic', -1, "L'enseignement religieux ne devrait recevoir aucun financement public.", "Religious schooling should receive no public funding.", 0, 3],
    ['jus', +1, "La prison devrait avant tout viser la réinsertion des détenus.", "Prisons should above all aim at rehabilitating inmates.", 0, 3],
    ['jus', -1, "Les peines planchers (minimum obligatoire) devraient être généralisées.", "Mandatory minimum sentences should be widespread.", 0, 3],
    ['jus', +1, "Dépénaliser l'usage des drogues réduirait la délinquance.", "Decriminalising drug use would reduce crime.", 0, 3],
    ['fisc', -1, "L'héritage devrait être beaucoup plus taxé pour réduire les inégalités.", "Inheritance should be taxed much more to reduce inequality.", 0, 3],
    ['fisc', +1, "Les aides sociales encouragent parfois l'inactivité.", "Welfare benefits sometimes discourage work.", 0, 3],
    ['fisc', -1, "La santé et l'éducation devraient être entièrement gratuites, financées par l'impôt.", "Health and education should be entirely free, funded by taxes.", 0, 3],
    ['tech', +1, "Les voitures autonomes et la robotisation amélioreront globalement nos vies.", "Self-driving cars and robotics will improve our lives overall.", 0, 3],
    ['tech', -1, "La collecte de données personnelles doit être strictement limitée, même si cela freine l'innovation.", "Personal data collection must be strictly limited, even if it slows innovation.", 0, 3],
    ['tech', +1, "Prolonger la vie humaine grâce à la médecine de pointe est un objectif légitime.", "Extending human life through cutting-edge medicine is a legitimate goal.", 0, 3],
  ];

  // Vecteurs : [eco, soc, lib, nat, eur, env, imm, dem, laic, jus, fisc, tech]  (0 = pôle A, 100 = pôle B)
  const P = [
    ['radical-left', 350, 'Gauche radicale', 'Radical left', 'ex. : LFI, PCF, NPA', 'e.g. LFI, PCF, NPA',
      "Rupture avec le capitalisme, forte redistribution, services publics, droits sociaux et démocratie participative.", "Break with capitalism, strong redistribution, public services, social rights and participatory democracy.",
      [8, 85, 65, 40, 35, 85, 90, 90, 50, 85, 5, 40]],
    ['social-democrat', 335, 'Social-démocratie', 'Social democracy', 'ex. : PS, Place publique', 'e.g. PS, Place publique',
      "Économie de marché encadrée, protection sociale solide, ancrage européen et progrès sociétal.", "Regulated market economy, strong welfare state, pro-European and socially progressive.",
      [30, 78, 65, 65, 78, 65, 70, 55, 55, 70, 25, 55]],
    ['green', 140, 'Écologisme', 'Green politics', 'ex. : Les Écologistes', 'e.g. Les Écologistes',
      "L'urgence écologique guide tout : sobriété, justice sociale, démocratie locale et prudence technologique.", "Ecological urgency comes first: sobriety, social justice, local democracy and technological caution.",
      [30, 88, 72, 70, 80, 95, 80, 75, 60, 80, 25, 25]],
    ['centrist-liberal', 45, 'Libéralisme centriste', 'Centrist liberalism', 'ex. : Renaissance, MoDem', 'e.g. Renaissance, MoDem',
      "Réformes pro-marché, Europe forte, ouverture, avec un État qui protège et investit.", "Pro-market reforms, strong Europe and openness, with a state that protects and invests.",
      [70, 68, 55, 75, 90, 50, 55, 35, 45, 45, 65, 80]],
    ['libertarian', 55, 'Libéralisme classique', 'Classical liberalism', 'ex. : libéraux, libertariens', 'e.g. classical liberals, libertarians',
      "Liberté individuelle et économique maximale, État minimal, impôts bas et ouverture au monde.", "Maximum personal and economic freedom, minimal state, low taxes and openness to the world.",
      [92, 70, 92, 75, 60, 30, 70, 55, 50, 55, 92, 85]],
    ['christian-democrat', 210, 'Centre-droit social', 'Christian democracy', 'ex. : centristes, démocrates-chrétiens', 'e.g. centrists, Christian democrats',
      "Équilibre entre économie sociale de marché, valeurs traditionnelles modérées et construction européenne.", "Balance between social market economy, moderate traditional values and European integration.",
      [55, 38, 50, 65, 85, 50, 50, 40, 70, 55, 50, 55]],
    ['conservative-right', 225, 'Droite conservatrice', 'Conservative right', 'ex. : LR', 'e.g. LR',
      "Économie libérale, ordre et autorité, immigration maîtrisée, valeurs traditionnelles.", "Liberal economics, law and order, controlled immigration and traditional values.",
      [68, 28, 35, 40, 55, 35, 28, 40, 30, 25, 72, 65]],
    ['sovereigntist', 25, 'Souverainisme', 'Sovereigntism', 'ex. : gaullistes, souverainistes', 'e.g. Gaullists, sovereigntists',
      "Indépendance nationale, État stratège, méfiance envers l'UE et la mondialisation.", "National independence, strategic state, wary of the EU and globalisation.",
      [45, 35, 40, 12, 18, 40, 30, 50, 25, 30, 45, 55]],
    ['national-populist', 235, 'Droite nationale populiste', 'National populism', 'ex. : RN', 'e.g. RN',
      "Priorité nationale, fermeté migratoire et sécuritaire, protection économique du peuple, référendum.", "National priority, tough on immigration and crime, economic protection of ordinary people, referendums.",
      [42, 25, 28, 8, 10, 30, 8, 70, 22, 12, 55, 50]],
    ['identitarian', 255, 'Droite identitaire', 'Identitarian right', 'ex. : Reconquête et mouvances proches', 'e.g. Reconquête and similar movements',
      "Défense de l'identité civilisationnelle, conservatisme social, immigration quasi nulle.", "Defence of civilisational identity, social conservatism, near-zero immigration.",
      [55, 8, 18, 5, 5, 30, 3, 50, 25, 8, 60, 45]],
    ['anarchist', 0, 'Anarchisme / libertaire de gauche', 'Anarchism / left-libertarian', 'ex. : mouvances libertaires', 'e.g. libertarian-left movements',
      "Abolition des hiérarchies, autogestion, liberté totale, solidarité et horizontalité.", "Abolition of hierarchies, self-management, total freedom, solidarity and horizontality.",
      [10, 95, 98, 95, 70, 80, 98, 98, 40, 95, 30, 40]],
  ];

  /* Partis français et candidatures à la présidentielle 2027.
     Candidatures : état au 27 nov. 2026, d'après LCP (maj 23 nov. 2026) et Wikipédia (« Élection présidentielle
     française de 2027 »). Liste NON officielle : validation par le Conseil constitutionnel après 500 parrainages
     (date limite 12 mars 2027) ; 1er tour le 18 avril 2027.
     Ligne : [sigle, teinte, nom, famille FR, famille EN, vecteur, fiabilité 1-3, candidat, statut FR, statut EN]
     Vecteurs = ESTIMATIONS documentées par les programmes, pas encore calibrées sur l'enquête d'experts CHES
     (voir tools/ches_calibrate.py). Fiabilité : 3 = positions très documentées, 2 = correctement documentées,
     1 = peu documentées (parti récent/confidentiel) → à affiner en priorité. */
  const PARTIES = [
    // --- Gauche radicale / extrême gauche
    ['LO',   350, 'Lutte ouvrière',            'Extrême gauche', 'Far left',            [3, 82, 70, 90, 35, 55, 90, 60, 45, 80, 3, 50], 3, 'Nathalie Arthaud', 'Candidate déclarée (8 déc. 2025)', 'Declared candidate (8 Dec 2025)'],
    ['NPAR', 345, 'NPA – Révolutionnaires',    'Extrême gauche', 'Far left',            [3, 85, 75, 92, 30, 60, 92, 65, 45, 82, 3, 45], 2, 'Selma Labib', 'Candidature annoncée (17 juin 2026)', 'Candidacy announced (17 Jun 2026)'],
    ['RP',   340, 'Révolution permanente',     'Extrême gauche', 'Far left',            [3, 85, 75, 92, 30, 55, 92, 60, 40, 82, 3, 45], 1, 'Anasse Kazib', 'Candidature annoncée (1er juin 2026)', 'Candidacy announced (1 Jun 2026)'],
    ['LFI',  5,   'La France insoumise',       'Gauche radicale', 'Radical left',       [10, 85, 65, 40, 30, 88, 85, 90, 45, 85, 5, 35], 3, 'Jean-Luc Mélenchon', 'Candidat déclaré (3 mai 2026)', 'Declared candidate (3 May 2026)'],
    ['PCF',  355, 'Parti communiste français', 'Gauche radicale', 'Radical left',       [8, 80, 60, 45, 40, 70, 75, 70, 40, 75, 5, 50], 3, 'Fabien Roussel', 'Désigné par son parti (6 sept. 2026)', 'Chosen by his party (6 Sep 2026)'],
    // --- Gauche sociale-démocrate et écologiste
    ['PS',   335, 'Parti socialiste',          'Social-démocratie', 'Social democracy', [30, 78, 60, 65, 78, 62, 68, 50, 55, 68, 28, 55], 3, 'Raphaël Glucksmann (soutien)', 'Primaire PS–PP–GRS remportée le 11 oct. 2026 ; Karim Bouamrane s’est aussi déclaré', 'PS–PP–GRS primary won on 11 Oct 2026; Karim Bouamrane also declared'],
    ['PP',   325, 'Place publique',            'Social-démocratie', 'Social democracy', [38, 80, 60, 72, 92, 75, 68, 48, 50, 68, 30, 60], 2, 'Raphaël Glucksmann', 'Vainqueur de la primaire (11 oct. 2026, 66 %)', 'Primary winner (11 Oct 2026, 66%)'],
    ['LÉ',   140, 'Les Écologistes',           'Écologie politique', 'Green politics',  [28, 88, 72, 70, 80, 95, 82, 78, 62, 82, 22, 25], 3, 'Marine Tondelier', 'Désignée (21 sept. 2026) ; vote des militants prévu le 13 déc.', 'Chosen (21 Sep 2026); members’ vote due 13 Dec'],
    ['GE',   120, 'Génération écologie',       'Écologie politique', 'Green politics',  [30, 82, 62, 65, 75, 95, 70, 55, 35, 75, 25, 25], 1, 'Delphine Batho', 'Candidate déclarée (25 nov. 2025)', 'Declared candidate (25 Nov 2025)'],
    ['PA',   100, 'Parti animaliste',          'Animalisme', 'Animal rights',           [35, 85, 70, 70, 65, 88, 75, 60, 60, 80, 25, 35], 1, 'Mira Markovic', 'Candidature annoncée (2 oct. 2026)', 'Candidacy announced (2 Oct 2026)'],
    ['VOLT', 275, 'Volt France',               'Fédéralisme progressiste', 'Progressive federalism', [55, 85, 72, 95, 98, 80, 80, 70, 70, 70, 40, 65], 2, null, 'Pas de candidat déclaré', 'No declared candidate'],
    // --- Centre et bloc central
    ['RE',   45,  'Renaissance',               'Centre libéral', 'Liberal centre',      [70, 68, 52, 75, 90, 52, 55, 35, 45, 45, 65, 82], 3, 'Gabriel Attal', 'Candidat déclaré (22 mai 2026)', 'Declared candidate (22 May 2026)'],
    ['MD',   30,  'MoDem',                     'Centre', 'Centre',                      [58, 65, 55, 75, 92, 55, 58, 45, 50, 55, 55, 65], 2, null, 'Pas de candidat déclaré', 'No declared candidate'],
    ['HOR',  200, 'Horizons',                  'Centre droit', 'Centre-right',          [72, 55, 45, 70, 82, 45, 45, 35, 40, 38, 65, 75], 2, 'Édouard Philippe', 'Candidat déclaré (depuis sept. 2024)', 'Declared candidate (since Sep 2024)'],
    ['UDI',  185, 'UDI',                       'Centre droit', 'Centre-right',          [62, 55, 48, 68, 85, 48, 50, 40, 45, 45, 58, 65], 2, null, 'Pas de candidat déclaré', 'No declared candidate'],
    ['LFH',  170, 'La France humaniste',       'Gaullisme humaniste', 'Humanist Gaullism', [50, 60, 58, 60, 62, 55, 60, 50, 45, 60, 45, 55], 1, 'Dominique de Villepin', 'Candidat déclaré (20 nov. 2026)', 'Declared candidate (20 Nov 2026)'],
    // --- Droite
    ['LR',   220, 'Les Républicains',          'Droite conservatrice', 'Conservative right', [68, 28, 35, 40, 55, 35, 28, 40, 30, 25, 72, 65], 3, 'Bruno Retailleau', 'Désigné par les adhérents (19 avr. 2026)', 'Chosen by members (19 Apr 2026)'],
    ['NE',   210, 'Nouvelle Énergie',          'Droite libérale', 'Liberal right',      [80, 35, 40, 45, 50, 40, 35, 45, 35, 35, 80, 70], 1, 'David Lisnard', 'Candidat déclaré (31 mars 2026), a quitté LR', 'Declared candidate (31 Mar 2026), left LR'],
    ['NF',   215, 'Nous France',               'Droite sociale', 'Social right',        [58, 38, 42, 48, 60, 40, 38, 40, 35, 35, 55, 60], 1, 'Xavier Bertrand', 'Candidature annoncée ; décision finale attendue d’ici fin 2026', 'Candidacy announced; final decision due by end-2026'],
    // --- Souverainistes et droite nationale
    ['DLF',  230, 'Debout la France',          'Souverainisme', 'Sovereigntism',        [50, 28, 40, 8, 8, 32, 20, 60, 25, 22, 48, 50], 2, 'Nicolas Dupont-Aignan', 'Candidat déclaré (19 sept. 2026)', 'Declared candidate (19 Sep 2026)'],
    ['UPR',  25,  'Union populaire républicaine', 'Souverainisme (Frexit)', 'Sovereigntism (Frexit)', [45, 45, 45, 8, 1, 40, 30, 70, 35, 35, 45, 55], 2, 'François Asselineau', 'Candidat déclaré', 'Declared candidate'],
    ['LP',   15,  'Les Patriotes',             'Souverainisme (Frexit)', 'Sovereigntism (Frexit)', [35, 25, 35, 5, 2, 35, 12, 70, 25, 15, 45, 55], 2, 'Florian Philippot', 'Candidat déclaré (9 mai 2026)', 'Declared candidate (9 May 2026)'],
    ['RES',  35,  'Résistons !',               'Populisme rural', 'Rural populism',     [40, 35, 40, 25, 30, 45, 30, 80, 40, 35, 45, 45], 1, 'Jean Lassalle', 'Candidature annoncée', 'Candidacy announced'],
    ['RN',   240, 'Rassemblement national',    'Droite nationale', 'National right',    [42, 28, 28, 8, 12, 28, 10, 70, 22, 12, 55, 50], 3, 'Marine Le Pen', 'Candidature confirmée (7 juil. 2026) ; pourvoi en cassation en attente', 'Candidacy confirmed (7 Jul 2026); appeal to the Court of Cassation pending'],
    ['REC',  260, 'Reconquête',                'Droite identitaire', 'Identitarian right', [58, 8, 15, 6, 6, 28, 3, 50, 25, 8, 62, 45], 3, 'Éric Zemmour', 'Candidat déclaré (17 sept. 2026)', 'Declared candidate (17 Sep 2026)'],
  ];

  window.COUNTRIES.fr = {
    flag: 'FR',
    name: { fr: 'France', en: 'France' },
    parties: PARTIES.map(p => ({
      code: p[0], hue: p[1], name: { fr: p[2], en: p[2] }, sub: { fr: p[3], en: p[4] }, v: p[5].slice(), conf: p[6],
      cand: p[7] ? { name: p[7], status: { fr: p[8], en: p[9] } } : { name: null, status: { fr: p[8], en: p[9] } },
    })),
    questions: Q.map(q => ({ axis: q[0], dir: q[1], text: { fr: q[2], en: q[3] }, lvl: q[4] ? 1 : (q[5] || 2) })),
    profiles: P.map(p => ({
      id: p[0], hue: p[1],
      name: { fr: p[2], en: p[3] }, examples: { fr: p[4], en: p[5] }, desc: { fr: p[6], en: p[7] },
      v: p[8],
    })),
  };

  // Calibrage CHES (optionnel) : data/fr-ches.js, généré par tools/ches_calibrate.py, écrase les axes mesurés.
  const ches = window.CHES_FR || {};
  window.COUNTRIES.fr.parties.forEach(p => {
    const o = ches[p.code]; if (!o) return;
    window.AXES.forEach((ax, i) => { if (typeof o[ax.id] === 'number') p.v[i] = Math.round(o[ax.id]); });
    p.ches = Object.keys(o).filter(k => typeof o[k] === 'number');
    p.conf = 3;
  });
})();
