/* Moteur de calcul : pur, sans DOM (testable avec Node). */
(function (root) {
  const AX = () => root.AXES;
  // Ordre d'alternance des thèmes (évite d'enchaîner 5 questions sur le même sujet)
  const ORDER = ['eco', 'soc', 'imm', 'env', 'lib', 'nat', 'fisc', 'laic', 'eur', 'jus', 'dem', 'tech'];
  const LEVEL = { short: 1, full: 2, deep: 3 };
  const CODE = { short: 's', full: 'f', deep: 'd' }, DECODE = { s: 'short', f: 'full', d: 'deep' };

  /** Liste des questions selon le mode ('short' | 'full' | 'deep'), alternées entre thèmes. */
  function questionList(country, mode) {
    const max = LEVEL[mode] || 2, cnt = {};
    return root.COUNTRIES[country].questions
      .filter(q => q.lvl <= max)
      .map(q => ({ q, k: (cnt[q.axis] = (cnt[q.axis] || 0) + 1) }))
      .sort((a, b) => a.k - b.k || ORDER.indexOf(a.q.axis) - ORDER.indexOf(b.q.axis))
      .map(x => x.q);
  }

  /** answers[i] : 0..4 (désaccord → accord) ou null. Valeur 0..100 par axe (50 = neutre). */
  function scores(list, answers) {
    const sum = {}, cnt = {};
    list.forEach((q, i) => {
      const a = answers[i];
      if (a == null) return;
      sum[q.axis] = (sum[q.axis] || 0) + (a - 2) * q.dir;
      cnt[q.axis] = (cnt[q.axis] || 0) + 1;
    });
    return AX().map(ax => cnt[ax.id] ? 50 + 50 * sum[ax.id] / (2 * cnt[ax.id]) : 50);
  }

  /** Classe des éléments {v:[12]} par proximité avec vec. weights : poids par axe (priorités). */
  function rank(items, vec, weights) {
    const w0 = weights || vec.map(() => 1);
    return items.map(item => {
      // Un thème non documenté (valeur null) est ignoré, plutôt que deviné.
      const known = item.v.map(x => x != null && !Number.isNaN(x));
      const w = w0.map((x, i) => known[i] ? x : 0), W = w.reduce((s, x) => s + x, 0) || 1;
      const diffs = item.v.map((x, i) => known[i] ? Math.abs(x - vec[i]) : null);
      const d = Math.sqrt(diffs.reduce((s, x, i) => s + (known[i] ? w[i] * x * x : 0), 0) / W);
      const cov = known.filter(Boolean).length / item.v.length;
      const idx = diffs.map((x, i) => i).filter(i => known[i]).sort((a, b) => diffs[a] - diffs[b]);
      return {
        item, cov,
        // moins de thèmes documentés => proximité réduite (on ne peut pas affirmer une forte proximité)
        sim: Math.max(0, Math.round(100 - d * 1.4 - (1 - cov) * 20)),
        close: idx.slice(0, 2).filter(i => diffs[i] <= 18),
        far: idx.slice(-2).reverse().filter(i => diffs[i] >= 30),
      };
    }).sort((a, b) => b.sim - a.sim);
  }

  // Position gauche-droite : [axe, gauche = pôle A ?, poids]
  const LR = [['eco', true, 1.1], ['fisc', true, 1.1], ['soc', false, 1.3], ['imm', false, 1.3], ['jus', false, .8], ['env', false, .6], ['nat', false, .5]];
  /** 0 = extrême gauche … 100 = extrême droite */
  function leftRight(vec) {
    const ids = AX().map(a => a.id); let s = 0, W = 0;
    LR.forEach(([id, leftIsA, w]) => { const v = vec[ids.indexOf(id)]; s += w * (leftIsA ? 100 - v : v); W += w; });
    return Math.round(100 - s / W);
  }
  const lrLevel = p => p < 10 ? 0 : p < 26 ? 1 : p < 42 ? 2 : p < 58 ? 3 : p < 71 ? 4 : p < 86 ? 5 : 6;
  /** Intensité des convictions 0..100 */
  const intensity = vec => Math.round(vec.reduce((s, v) => s + Math.abs(v - 50), 0) / vec.length * 2);
  /** Axes triés du plus tranché au plus nuancé : [{i, dev}] */
  const byStrength = vec => vec.map((v, i) => ({ i, dev: Math.abs(v - 50) })).sort((a, b) => b.dev - a.dev);

  // Format de lien compatible avec les pages publiées : lettres, chiffres et tirets uniquement ("fr-s-0123x4").
  // Le format historique "fr.s.0123-4" (points, tiret = question passée) reste lu.
  function encode(country, mode, answers) { return `${country}-${CODE[mode]}-` + answers.map(a => a == null ? 'x' : a).join(''); }
  function decode(str) {
    const m = /^([a-z]{2})[.-]([sfd])[.-]([0-4x-]+)$/.exec(str || '');
    if (!m || !root.COUNTRIES[m[1]]) return null;
    const mode = DECODE[m[2]], list = questionList(m[1], mode);
    if (m[3].length !== list.length) return null;
    return { country: m[1], mode, answers: [...m[3]].map(c => c === '-' || c === 'x' ? null : +c) };
  }

  const api = { questionList, scores, rank, leftRight, lrLevel, intensity, byStrength, encode, decode };
  if (typeof module !== 'undefined') module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
