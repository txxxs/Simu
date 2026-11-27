(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  const state = { lang: 'fr', country: 'fr', mode: 'short', list: [], answers: [], idx: 0, showAll: false };

  /* ---------- i18n ---------- */
  const t = (k, vars) => {
    let s = (I18N[state.lang] && I18N[state.lang][k]) || I18N.fr[k] || k;
    if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]);
    return s;
  };
  function applyLang() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === state.lang));
    fillCountries();
    $('#moreBtn').textContent = t(state.showAll ? 'res.less' : 'res.more');
    renderAnswers();
    if ($('#quiz').classList.contains('active')) renderQuestion(false);
    if ($('#results').classList.contains('active')) renderResults();
  }
  function setLang(l) { state.lang = l; LS.set('simu.lang', l); applyLang(); }

  /* ---------- Navigation ---------- */
  function show(id) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
    window.scrollTo({ top: 0 });
  }

  function fillCountries() {
    const keys = Object.keys(COUNTRIES), sel = $('#country');
    $('#countryRow').hidden = keys.length < 2;
    sel.innerHTML = keys.map(k => `<option value="${k}"${k === state.country ? ' selected' : ''}>${COUNTRIES[k].flag} ${COUNTRIES[k].name[state.lang]}</option>`).join('');
  }

  /* ---------- Quiz ---------- */
  function start() {
    state.list = Engine.questionList(state.country, state.mode);
    state.answers = new Array(state.list.length).fill(null);
    state.idx = 0;
    history.replaceState(null, '', location.pathname + location.search);
    show('quiz');
    renderQuestion(true);
  }

  function renderAnswers() {
    const sizes = [64, 50, 40, 50, 64], cols = ['#ef4444', '#fb923c', '#94a3b8', '#4ade80', '#10b981'];
    $('#answers').innerHTML = [0, 1, 2, 3, 4].map(i => `
      <button class="ans" data-v="${i}" style="--s:${sizes[i]}px;--c:${cols[i]}" aria-label="${t('ans.' + i)}" title="${t('ans.' + i)} (${i + 1})">
        <span class="dot"></span><span class="lbl">${t('ans.' + i)}</span>
      </button>`).join('');
  }

  function renderQuestion(animate) {
    const q = state.list[state.idx], ax = AXES.find(a => a.id === q.axis);
    $('#qCount').textContent = t('q.of', { n: state.idx + 1, t: state.list.length });
    $('#barFill').style.width = (state.idx / state.list.length * 100) + '%';
    $('#qChip').innerHTML = `${ax.icon} ${ax.name[state.lang]}`;
    $('#qChip').style.setProperty('--h', ax.hue);
    $('#qText').textContent = q.text[state.lang];
    $('#backBtn').style.visibility = state.idx ? 'visible' : 'hidden';
    const sel = state.answers[state.idx];
    $$('#answers .ans').forEach(b => b.classList.toggle('sel', sel != null && +b.dataset.v === sel));
    $('#ansLabel').innerHTML = sel != null ? t('ans.' + sel) : '&nbsp;';
    if (animate) { const c = $('#qCard'); c.classList.remove('enter'); void c.offsetWidth; c.classList.add('enter'); }
  }

  function answer(v) {
    state.answers[state.idx] = v;
    $$('#answers .ans').forEach(b => b.classList.toggle('sel', +b.dataset.v === v));
    $('#ansLabel').textContent = v == null ? '' : t('ans.' + v);
    setTimeout(next, 220);
  }
  function next() {
    if (!$('#quiz').classList.contains('active')) return;
    if (state.idx + 1 >= state.list.length) return finish();
    state.idx++; renderQuestion(true);
  }
  function prev() { if (state.idx > 0) { state.idx--; renderQuestion(true); } }
  function finish() {
    history.replaceState(null, '', '#r=' + Engine.encode(state.country, state.mode, state.answers));
    show('results'); renderResults();
  }

  /* ---------- Résultats ---------- */
  function compute() {
    const vec = Engine.scores(state.list, state.answers);
    return { vec, rank: Engine.ranking(state.country, vec) };
  }

  function renderResults() {
    const { vec, rank } = compute(), top = rank[0], p = top.profile, L = state.lang;
    $('#heroRes').style.setProperty('--h', p.hue);
    $('#heroRes').innerHTML = `
      <div class="hero-emoji">${p.emoji}</div>
      <div class="hero-txt">
        <small>${t('res.closest')}</small>
        <h2>${p.name[L]}</h2>
        <span class="pill">${t('res.match', { p: top.sim })}</span>
        <p>${p.desc[L]}</p>
        <em>${p.examples[L]}</em>
      </div>`;

    $('#compass').innerHTML = Charts.compass(vec, L, { auth: t('res.auth'), lib: t('res.lib'), state: L === 'fr' ? 'État' : 'State', market: L === 'fr' ? 'Marché' : 'Market' });
    $('#radar').innerHTML = Charts.radar(vec, L);

    $('#axesBars').innerHTML = AXES.map((ax, i) => {
      const v = vec[i], a = Math.round(100 - v), b = Math.round(v);
      const lean = Math.abs(v - 50) < 6 ? t('neutral') : (v < 50 ? ax.a[L] : ax.b[L]);
      const pct = v < 50 ? a : b;
      return `<div class="axrow" style="--h:${ax.hue}">
        <div class="axhead"><span>${ax.icon} <b>${ax.name[L]}</b></span><span class="lean">${Math.abs(v - 50) < 6 ? lean : t('leaning', { p: pct, pole: lean })}</span></div>
        <div class="axbar"><i style="left:${v}%"></i></div>
        <div class="axpoles"><span>${ax.a[L]} ${a}%</span><span>${b}% ${ax.b[L]}</span></div>
      </div>`;
    }).join('');

    const shown = state.showAll ? rank : rank.slice(0, 5);
    $('#ranking').innerHTML = shown.map(r => `
      <div class="rk" style="--h:${r.profile.hue}">
        <span class="rk-n">${r.profile.emoji} ${r.profile.name[L]}</span>
        <div class="rk-bar"><i style="width:${r.sim}%"></i></div>
        <b>${r.sim}%</b>
      </div>`).join('');
    $('#moreBtn').textContent = t(state.showAll ? 'res.less' : 'res.more');
  }

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200);
  }

  function downloadImage() {
    const { vec, rank } = compute(), canvas = document.createElement('canvas');
    const draw = () => {
      Charts.shareImage(canvas, {
        lang: state.lang, vec, rank, top: rank[0], title: t('hero.badge').split('•')[0].trim(),
        matchText: t('res.match', { p: rank[0].sim }), footer: location.host ? location.host + location.pathname : 'simu',
      });
      canvas.toBlob(b => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = t('dl.name');
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(draw);
  }

  function copyLink() {
    const url = location.href;
    const done = () => toast(t('share.copied'));
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); }
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lang) setLang(b.dataset.lang);
    else if (b.classList.contains('mode')) { state.mode = b.dataset.mode; $$('.mode').forEach(m => m.setAttribute('aria-pressed', m === b)); }
    else if (b.classList.contains('ans')) answer(+b.dataset.v);
  });
  $('#country').addEventListener('change', e => { state.country = e.target.value; });
  $('#startBtn').addEventListener('click', start);
  $('#backBtn').addEventListener('click', prev);
  $('#skipBtn').addEventListener('click', () => answer(null));
  $('#quitBtn').addEventListener('click', () => show('home'));
  $('#retakeBtn').addEventListener('click', () => { history.replaceState(null, '', location.pathname); show('home'); });
  $('#imgBtn').addEventListener('click', downloadImage);
  $('#linkBtn').addEventListener('click', copyLink);
  $('#moreBtn').addEventListener('click', () => { state.showAll = !state.showAll; renderResults(); });
  $('#brand').addEventListener('click', e => { e.preventDefault(); history.replaceState(null, '', location.pathname); show('home'); });
  document.addEventListener('keydown', e => {
    if (!$('#quiz').classList.contains('active')) return;
    if (e.key >= '1' && e.key <= '5') answer(+e.key - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') prev();
  });

  /* ---------- Init ---------- */
  function loadFromHash() {
    const m = /^#r=(.+)$/.exec(location.hash), d = m && Engine.decode(m[1]);
    if (!d) return false;
    Object.assign(state, { country: d.country, mode: d.mode, answers: d.answers, list: Engine.questionList(d.country, d.mode) });
    show('results'); renderResults(); return true;
  }
  const saved = LS.get('simu.lang');
  state.lang = saved && I18N[saved] ? saved : ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
  applyLang();
  loadFromHash();
  window.addEventListener('hashchange', () => { if (!loadFromHash() && !location.hash) show('home'); });
})();
