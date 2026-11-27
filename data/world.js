/* Données internationales : idéologies, pays, personnalités.
   Vecteurs : [eco, soc, lib, nat, eur, env, imm, dem, laic, jus, fisc, tech]  (0 = pôle A, 100 = pôle B)
   Ce sont des ESTIMATIONS indicatives, à relire / affiner. */
(function () {
  const mk = (rows, f) => rows.map(f);

  // [icône, teinte, nom FR, nom EN, desc FR, desc EN, vecteur]
  window.IDEOLOGIES = mk([
    ['radical-left', 355, 'Communisme / marxisme', 'Communism / Marxism', "Abolition du capitalisme, propriété collective des moyens de production, égalité radicale.", "Abolition of capitalism, collective ownership of the means of production, radical equality.", [3, 80, 50, 85, 40, 55, 85, 60, 45, 70, 3, 60]],
    ['radical-left', 340, 'Socialisme démocratique', 'Democratic socialism', "Transformation de l'économie par les urnes : nationalisations, planification, forte redistribution.", "Transforming the economy through elections: nationalisation, planning, strong redistribution.", [15, 85, 70, 60, 55, 75, 80, 75, 50, 80, 8, 45]],
    ['anarchist', 0, 'Anarcho-communisme', 'Anarcho-communism', "Société sans État ni hiérarchie, organisée en communes autogérées.", "A stateless, hierarchy-free society organised in self-managed communes.", [5, 95, 98, 98, 60, 80, 98, 98, 40, 95, 15, 40]],
    ['green', 150, 'Écosocialisme', 'Eco-socialism', "Le capitalisme est la cause de la crise écologique : planification écologique et justice sociale.", "Capitalism drives the ecological crisis: ecological planning and social justice.", [12, 90, 72, 70, 60, 95, 85, 80, 55, 85, 10, 25]],
    ['social-democrat', 335, 'Social-démocratie', 'Social democracy', "Économie de marché encadrée, syndicats forts, protection sociale universelle.", "Regulated market economy, strong unions, universal social protection.", [32, 78, 62, 65, 78, 62, 68, 50, 55, 68, 28, 55]],
    ['green', 140, 'Écologisme politique', 'Political ecology', "L'écologie comme boussole : sobriété, démocratie locale, justice climatique.", "Ecology as a compass: sobriety, local democracy, climate justice.", [35, 85, 72, 70, 75, 95, 78, 75, 60, 78, 25, 22]],
    ['green', 120, 'Décroissance', 'Degrowth', "Réduire la production et la consommation pour rester dans les limites planétaires.", "Reduce production and consumption to stay within planetary limits.", [20, 75, 60, 60, 60, 98, 75, 85, 50, 75, 15, 8]],
    ['centrist-liberal', 195, 'Social-libéralisme', 'Social liberalism', "Marché + filet de sécurité : libertés individuelles, ouverture, réformes pragmatiques.", "Market plus safety net: individual freedoms, openness, pragmatic reform.", [55, 80, 68, 72, 82, 58, 68, 45, 55, 65, 48, 72]],
    ['centrist-liberal', 45, 'Centrisme technocratique', 'Technocratic centrism', "Gouverner par l'expertise et le compromis, loin des clivages idéologiques.", "Governing through expertise and compromise, beyond ideological divides.", [60, 62, 50, 72, 90, 50, 55, 15, 45, 45, 60, 85]],
    ['eur', 225, 'Fédéralisme européen', 'European federalism', "Une Europe politique intégrée, avec un vrai pouvoir démocratique commun.", "An integrated political Europe with real common democratic power.", [48, 85, 72, 98, 98, 78, 82, 68, 65, 72, 35, 65]],
    ['libertarian', 55, 'Libéralisme classique', 'Classical liberalism', "Libertés individuelles et économiques, État de droit, marché libre.", "Individual and economic freedoms, rule of law, free markets.", [85, 72, 85, 75, 60, 30, 70, 55, 50, 55, 92, 85]],
    ['libertarian', 60, 'Libertarianisme', 'Libertarianism', "L'État réduit au minimum : propriété privée, liberté totale, impôts quasi nuls.", "A minimal state: private property, total freedom, near-zero taxes.", [96, 75, 98, 78, 40, 25, 75, 60, 55, 55, 98, 90]],
    ['tech', 175, 'Techno-progressisme', 'Techno-progressivism', "La technologie, bien orientée, émancipe : IA, biotechnologies, longévité.", "Well-directed technology emancipates: AI, biotech, longevity.", [60, 90, 85, 85, 65, 45, 85, 55, 60, 70, 45, 98]],
    ['christian-democrat', 210, 'Démocratie chrétienne', 'Christian democracy', "Économie sociale de marché, subsidiarité, valeurs humanistes et construction européenne.", "Social market economy, subsidiarity, humanist values and European integration.", [52, 38, 50, 65, 85, 50, 50, 40, 70, 55, 50, 55]],
    ['conservative-right', 225, 'Libéralisme conservateur', 'Conservative liberalism', "Libre marché, autorité de l'État de droit, valeurs traditionnelles modérées.", "Free markets, firm rule of law, moderate traditional values.", [72, 40, 50, 55, 62, 35, 40, 40, 35, 35, 72, 65]],
    ['conservative-right', 235, 'Conservatisme traditionnel', 'Traditional conservatism', "Défense des institutions, de la famille et des traditions face aux changements rapides.", "Defending institutions, family and tradition against rapid change.", [60, 15, 30, 40, 50, 35, 25, 35, 35, 25, 60, 50]],
    ['sovereigntist', 25, 'Gaullisme / républicanisme', 'Gaullism / republicanism', "État fort et stratège, indépendance nationale, laïcité, unité de la République.", "A strong, strategic state, national independence, secularism, republic unity.", [45, 38, 42, 30, 25, 40, 35, 50, 25, 32, 45, 60]],
    ['sovereigntist', 15, 'Souverainisme', 'Sovereigntism', "Le peuple et la nation doivent garder la maîtrise de leurs décisions.", "The people and the nation must keep control of their decisions.", [48, 30, 38, 10, 15, 38, 30, 55, 28, 28, 52, 52]],
    ['radical-left', 5, 'Populisme de gauche', 'Left-wing populism', "Le peuple contre les élites : redistribution, démocratie directe, rupture institutionnelle.", "The people against elites: redistribution, direct democracy, institutional rupture.", [18, 80, 55, 35, 25, 80, 78, 92, 45, 75, 8, 40]],
    ['national-populist', 235, 'Populisme de droite', 'Right-wing populism', "Le peuple contre les élites : priorité nationale, fermeté migratoire, référendum.", "The people against elites: national priority, tough on immigration, referendums.", [42, 22, 25, 8, 10, 28, 8, 72, 22, 12, 55, 50]],
    ['identitarian', 255, 'Nationalisme identitaire', 'Identitarian nationalism', "Défense de l'identité culturelle et civilisationnelle, immigration quasi nulle.", "Defence of cultural and civilisational identity, near-zero immigration.", [55, 8, 18, 5, 5, 30, 3, 48, 25, 8, 60, 45]],
    ['jus', 20, 'Autoritarisme conservateur', 'Conservative authoritarianism', "Ordre, hiérarchie, discipline et valeurs traditionnelles imposées par un pouvoir fort.", "Order, hierarchy, discipline and traditional values enforced by strong authority.", [50, 10, 5, 20, 15, 25, 15, 20, 40, 8, 50, 60]],
    ['tech', 30, 'Capitalisme autoritaire', 'Authoritarian capitalism', "Croissance et technologie sous contrôle d'un État fort, libertés politiques limitées.", "Growth and technology under a strong state, limited political freedoms.", [75, 35, 8, 50, 20, 30, 30, 15, 40, 10, 65, 95]],
    ['dem', 170, 'Démocratie directe', 'Direct democracy', "Le pouvoir au peuple : référendums d'initiative citoyenne, tirage au sort, révocation.", "Power to the people: citizen-initiated referendums, sortition, recall.", [45, 60, 70, 55, 40, 55, 60, 98, 50, 60, 40, 55]],
    ['laic', 280, 'Républicanisme civique', 'Civic republicanism', "Citoyenneté commune, laïcité, service public et vertu civique.", "Shared citizenship, secularism, public service and civic virtue.", [42, 55, 50, 55, 55, 50, 50, 60, 25, 50, 35, 55]],
  ], r => ({ icon: r[0], hue: r[1], name: { fr: r[2], en: r[3] }, desc: { fr: r[4], en: r[5] }, v: r[6] }));

  // [code, teinte, nom FR, nom EN, desc FR, desc EN, vecteur]
  window.WORLD = mk([
    ['DK', 5, 'Danemark', 'Denmark', "Modèle nordique : État-providence généreux, forte confiance, immigration encadrée.", "Nordic model: generous welfare state, high trust, tightly managed immigration.", [35, 82, 70, 68, 65, 72, 45, 55, 55, 75, 22, 65]],
    ['SE', 210, 'Suède', 'Sweden', "Social-démocratie historique, économie ouverte, fiscalité élevée.", "Long-standing social democracy, open economy, high taxes.", [35, 85, 72, 75, 65, 72, 60, 55, 60, 75, 25, 70]],
    ['NO', 350, 'Norvège', 'Norway', "État-providence financé par le pétrole, hors de l'UE, forte démocratie locale.", "Oil-funded welfare state, outside the EU, strong local democracy.", [30, 85, 75, 68, 45, 70, 60, 55, 60, 78, 22, 65]],
    ['DE', 45, 'Allemagne', 'Germany', "Économie sociale de marché, fédéralisme, rôle moteur dans l'UE.", "Social market economy, federalism, driving force of the EU.", [52, 70, 58, 72, 88, 68, 60, 40, 55, 60, 42, 65]],
    ['NL', 25, 'Pays-Bas', 'Netherlands', "Libéralisme social, tolérance, économie très ouverte.", "Social liberalism, tolerance, highly open economy.", [62, 80, 70, 78, 75, 60, 50, 45, 65, 65, 45, 70]],
    ['CH', 0, 'Suisse', 'Switzerland', "Démocratie directe, neutralité, fiscalité légère, hors de l'UE.", "Direct democracy, neutrality, light taxation, outside the EU.", [72, 50, 68, 40, 25, 55, 40, 95, 55, 50, 70, 70]],
    ['FR', 225, 'France', 'France', "Modèle républicain : État fort, laïcité stricte, protection sociale étendue.", "Republican model: strong state, strict secularism, extensive welfare.", [38, 65, 50, 60, 78, 55, 55, 35, 25, 55, 30, 60]],
    ['GB', 345, 'Royaume-Uni', 'United Kingdom', "Libéralisme de marché, souveraineté parlementaire, sorti de l'UE.", "Market liberalism, parliamentary sovereignty, outside the EU.", [62, 68, 48, 55, 30, 55, 48, 35, 60, 45, 55, 65]],
    ['US', 215, 'États-Unis', 'United States', "Libre entreprise, individualisme, faible redistribution, liberté d'expression maximale.", "Free enterprise, individualism, low redistribution, maximal free speech.", [80, 45, 50, 45, 25, 25, 40, 60, 70, 25, 80, 85]],
    ['CA', 0, 'Canada', 'Canada', "Libéralisme social, multiculturalisme, santé publique universelle.", "Social liberalism, multiculturalism, universal public healthcare.", [55, 78, 62, 75, 45, 55, 75, 45, 75, 60, 50, 65]],
    ['NZ', 190, 'Nouvelle-Zélande', 'New Zealand', "Réformes de marché, État-providence modéré, progressisme sociétal.", "Market reforms, moderate welfare state, socially progressive.", [60, 78, 65, 72, 45, 60, 60, 50, 70, 60, 48, 68]],
    ['JP', 350, 'Japon', 'Japan', "Capitalisme coordonné, conservatisme social, immigration très limitée.", "Coordinated capitalism, social conservatism, very limited immigration.", [60, 35, 45, 45, 40, 45, 15, 30, 60, 40, 55, 85]],
    ['SG', 15, 'Singapour', 'Singapore', "Marché ouvert sous un État fort et pragmatique, libertés politiques limitées.", "Open market under a strong, pragmatic state, limited political freedoms.", [70, 40, 12, 70, 40, 45, 45, 15, 55, 10, 70, 95]],
    ['CN', 5, 'Chine', 'China', "Parti unique, capitalisme d'État, contrôle social et technologique poussé.", "One-party rule, state capitalism, extensive social and technological control.", [30, 25, 3, 40, 10, 40, 20, 10, 30, 5, 40, 95]],
    ['RU', 260, 'Russie', 'Russia', "Pouvoir centralisé, nationalisme d'État, conservatisme moral.", "Centralised power, state nationalism, moral conservatism.", [50, 10, 10, 15, 5, 20, 30, 25, 40, 10, 60, 55]],
    ['HU', 130, 'Hongrie', 'Hungary', "Démocratie dite illibérale, souverainisme, conservatisme social.", "So-called illiberal democracy, sovereigntism, social conservatism.", [50, 12, 25, 12, 15, 25, 5, 40, 35, 15, 55, 55]],
    ['IN', 30, 'Inde', 'India', "Plus grande démocratie du monde, nationalisme culturel, forte diversité religieuse.", "World's largest democracy, cultural nationalism, great religious diversity.", [50, 30, 45, 35, 10, 35, 35, 45, 70, 30, 55, 70]],
    ['BR', 145, 'Brésil', 'Brazil', "Démocratie présidentielle, forte polarisation, inégalités marquées.", "Presidential democracy, strong polarisation, marked inequality.", [55, 50, 55, 50, 15, 45, 55, 50, 70, 35, 55, 60]],
    ['IT', 160, 'Italie', 'Italy', "Démocratie parlementaire instable, conservatisme culturel, europhile pragmatique.", "Unstable parliamentary democracy, cultural conservatism, pragmatic pro-Europeanism.", [50, 40, 45, 60, 75, 45, 35, 40, 40, 40, 50, 55]],
    ['PL', 350, 'Pologne', 'Poland', "Conservatisme catholique, atlantiste, économie de marché.", "Catholic conservatism, Atlanticist, market economy.", [60, 28, 40, 35, 55, 35, 20, 45, 45, 30, 55, 60]],
  ], r => ({ code: r[0], hue: r[1], name: { fr: r[2], en: r[3] }, desc: { fr: r[4], en: r[5] }, v: r[6] }));

  // [initiales, teinte, nom, rôle FR, rôle EN, vecteur]  — estimations rétrospectives, anachroniques par nature
  window.FIGURES = mk([
    ['KM', 355, 'Karl Marx', "Philosophe, théoricien du socialisme", "Philosopher, theorist of socialism", [2, 75, 55, 95, 50, 40, 85, 70, 40, 60, 2, 75]],
    ['RL', 345, 'Rosa Luxemburg', "Révolutionnaire marxiste", "Marxist revolutionary", [3, 80, 75, 98, 40, 55, 85, 85, 40, 85, 3, 60]],
    ['JJ', 335, 'Jean Jaurès', "Socialiste, pacifiste, fondateur de L'Humanité", "Socialist, pacifist, founder of L'Humanité", [12, 75, 70, 80, 60, 55, 70, 75, 20, 80, 8, 70]],
    ['LB', 320, 'Léon Blum', "Chef du Front populaire (1936)", "Leader of the Popular Front (1936)", [20, 75, 65, 70, 60, 55, 65, 55, 25, 72, 12, 65]],
    ['FM', 340, 'François Mitterrand', "Président socialiste (1981-1995)", "Socialist president (1981-1995)", [25, 70, 55, 65, 78, 55, 60, 40, 35, 65, 18, 60]],
    ['FR', 215, 'Franklin D. Roosevelt', "Président américain, New Deal", "US president, New Deal", [28, 60, 52, 55, 50, 45, 55, 45, 60, 55, 15, 75]],
    ['NM', 140, 'Nelson Mandela', "Combattant de l'apartheid, président", "Anti-apartheid leader, president", [30, 75, 62, 70, 40, 55, 78, 60, 70, 80, 22, 50]],
    ['MG', 35, 'Mahatma Gandhi', "Leader de l'indépendance indienne, non-violence", "Leader of Indian independence, non-violence", [30, 40, 70, 70, 35, 80, 70, 70, 75, 90, 25, 10]],
    ['SV', 190, 'Simone Veil', "Magistrate, ministre, pionnière de l'Europe", "Magistrate, minister, European pioneer", [45, 75, 60, 85, 92, 50, 70, 40, 40, 65, 40, 60]],
    ['GC', 25, 'Georges Clemenceau', "Républicain radical, « le Tigre »", "Radical republican, \"the Tiger\"", [60, 50, 35, 35, 40, 45, 40, 35, 15, 25, 60, 70]],
    ['CG', 225, 'Charles de Gaulle', "Chef de la France libre, fondateur de la Ve République", "Leader of Free France, founder of the Fifth Republic", [42, 38, 35, 22, 28, 45, 40, 50, 35, 35, 40, 70]],
    ['AT', 45, 'Alexis de Tocqueville', "Penseur libéral de la démocratie", "Liberal thinker of democracy", [68, 45, 70, 50, 40, 45, 55, 55, 40, 55, 70, 55]],
    ['WC', 240, 'Winston Churchill', "Premier ministre britannique, conservateur", "British prime minister, conservative", [60, 30, 35, 35, 35, 40, 35, 30, 55, 35, 55, 65]],
    ['MT', 215, 'Margaret Thatcher', "Première ministre britannique, libérale-conservatrice", "British prime minister, free-market conservative", [92, 35, 40, 40, 25, 30, 35, 30, 45, 25, 92, 70]],
    ['FH', 55, 'Friedrich Hayek', "Économiste libéral, Prix Nobel", "Liberal economist, Nobel laureate", [96, 50, 88, 60, 50, 25, 60, 40, 55, 50, 95, 70]],
  ], r => ({ code: r[0], hue: r[1], name: { fr: r[2], en: r[2] }, desc: { fr: r[3], en: r[4] }, v: r[5] }));
})();
