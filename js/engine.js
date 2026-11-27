/* Moteur de calcul : pur, sans DOM (testable avec Node). */
(function (root) {
  const AX = () => root.AXES;

  /** Liste des questions selon le mode ('short' | 'full'). */
  function questionList(country, mode) {
    const qs = root.COUNTRIES[country].questions;
    return mode === 'short' ? qs.filter(q => q.short) : qs.slice();
  }

  /** answers[i] : 0..4 (désaccord → accord) ou null (passée). Retourne une valeur 0..100 par axe (50 = neutre). */
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

  /** Proximité 0..100 avec chaque profil (distance quadratique moyenne). */
  function ranking(country, vec) {
    return root.COUNTRIES[country].profiles.map(p => {
      const d = Math.sqrt(p.v.reduce((s, x, i) => s + (x - vec[i]) ** 2, 0) / p.v.length);
      return { profile: p, sim: Math.max(0, Math.round(100 - d * 1.5)) };
    }).sort((a, b) => b.sim - a.sim);
  }

  /** Encodage dans l'URL : "fr.s.0123-4…" */
  function encode(country, mode, answers) {
    return `${country}.${mode === 'short' ? 's' : 'f'}.` + answers.map(a => a == null ? '-' : a).join('');
  }
  function decode(str) {
    const m = /^([a-z]{2})\.([sf])\.([0-4-]+)$/.exec(str || '');
    if (!m || !root.COUNTRIES[m[1]]) return null;
    const mode = m[2] === 's' ? 'short' : 'full';
    const list = questionList(m[1], mode);
    if (m[3].length !== list.length) return null;
    return { country: m[1], mode, answers: [...m[3]].map(c => c === '-' ? null : +c) };
  }

  const api = { questionList, scores, ranking, encode, decode };
  if (typeof module !== 'undefined') module.exports = api; else root.Engine = api;
})(typeof window !== 'undefined' ? window : globalThis);
