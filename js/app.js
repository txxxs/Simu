(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

  const state = { lang: 'fr', country: 'fr', mode: 'short', list: [], answers: [], idx: 0, showAll: false, busy: false };

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
    renderAnswers();
    if ($('#quiz').classList.contains('active')) renderQuestion();
    if ($('#results').classList.contains('active')) renderResults(false);
  }
  function setLang(l) { state.lang = l; LS.set('simu.lang', l); applyLang(); }

  /* ---------- Icônes statiques ---------- */
  function initIcons() {
    $('#logo').innerHTML = Icons.logo(26);
    $('#calcLogo').innerHTML = Icons.logo(64);
    $$('[data-icon]').forEach(el => { el.innerHTML = Icons.svg(el.dataset.icon, el.dataset.hue ? { hue: +el.dataset.hue, size: 26 } : { mono: true, size: 20 }); });
    // anneau d'icônes autour du titre
    $('#orbit').innerHTML = AXES.map((ax, i) => {
      const a = i * 30;
      return `<div class="o" style="--a:${a}deg"><div class="oi" style="--a:${a}deg;--d:${i * -.35}s">${Icons.badge(ax.id, ax.hue, 52)}</div></div>`;
    }).join('');
    $('#calcIcons').innerHTML = AXES.map(ax => Icons.badge(ax.id, ax.hue, 44)).join('');
  }

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
    state.idx = 0; state.busy = false; state.pending = null;
    history.replaceState(null, '', location.pathname + location.search);
    show('quiz');
    renderQuestion(1);
  }

  function renderAnswers() {
    const sizes = [62, 48, 38, 48, 62], cols = ['#f43f5e', '#fb923c', '#94a3b8', '#4ade80', '#10b981'];
    $('#answers').innerHTML = [0, 1, 2, 3, 4].map(i => `
      <button class="ans" data-v="${i}" style="--s:${sizes[i]}px;--c:${cols[i]}" aria-label="${t('ans.' + i)} (${i + 1})" title="${t('ans.' + i)} (${i + 1})">
        <span class="dot">${Icons.svg('check', { mono: true, size: 22, sw: 4.5 })}</span><span class="lbl">${t('ans.' + i)}</span>
      </button>`).join('');
  }

  /** dir : 1 = suivant, -1 = précédent, 0/undefined = pas d'animation d'entrée */
  function renderQuestion(dir) {
    const q = state.list[state.idx], ax = AXES.find(a => a.id === q.axis);
    $('#qCount').textContent = t('q.of', { n: state.idx + 1, t: state.list.length });
    $('#barFill').style.width = (state.idx / state.list.length * 100) + '%';
    $('#qChip').innerHTML = `${Icons.svg(ax.id, { hue: ax.hue, size: 20 })}<span>${ax.name[state.lang]}</span>`;
    $('#qChip').style.setProperty('--h', ax.hue);
    $('#qText').textContent = q.text[state.lang];
    $('#backBtn').style.visibility = state.idx ? 'visible' : 'hidden';
    const sel = state.answers[state.idx];
    $$('#answers .ans').forEach(b => b.classList.toggle('sel', sel != null && +b.dataset.v === sel));
    $('#ansLabel').textContent = sel != null ? t('ans.' + sel) : '';
    if (dir) {
      const c = $('#qCard'); c.style.setProperty('--dx', 46 * dir + 'px');
      c.classList.remove('enter'); void c.offsetWidth; c.classList.add('enter');
    }
  }

  async function slide(dir, update) {
    const c = $('#qCard');
    if (reduce) return update();
    const a = c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-46 * dir}px) scale(.97)` }], { duration: 190, easing: 'ease-in', fill: 'forwards' });
    await a.finished; update(); a.cancel();
  }

  async function answer(v) {
    if (!$('#quiz').classList.contains('active')) return;
    if (state.busy) { state.pending = { v }; return; }   // appui pendant une transition : mis en file
    state.busy = true;
    state.answers[state.idx] = v;
    $$('#answers .ans').forEach(b => b.classList.toggle('sel', v != null && +b.dataset.v === v));
    $('#ansLabel').textContent = v != null ? t('ans.' + v) : '';
    await wait(v == null ? 0 : 330);
    if (state.idx + 1 >= state.list.length) { $('#barFill').style.width = '100%'; await wait(250); state.busy = false; return finish(); }
    await slide(1, () => { state.idx++; renderQuestion(1); });
    state.busy = false;
    if (state.pending) { const q = state.pending; state.pending = null; answer(q.v); }
  }
  async function prev() {
    if (state.idx === 0 || state.busy) return;
    state.busy = true; await slide(-1, () => { state.idx--; renderQuestion(-1); }); state.busy = false;
  }

  async function finish() {
    history.replaceState(null, '', '#r=' + Engine.encode(state.country, state.mode, state.answers));
    show('calc');
    const ic = $$('#calcIcons .bico'); ic.forEach(e => e.classList.remove('on'));
    $('#calc').classList.remove('run'); void $('#calc').offsetWidth; $('#calc').classList.add('run');
    for (const e of ic) { e.classList.add('on'); await wait(120); }
    await wait(450);
    show('results'); renderResults(true);
  }

  /* ---------- Résultats ---------- */
  function compute() {
    const vec = Engine.scores(state.list, state.answers);
    return { vec, rank: Engine.ranking(state.country, vec) };
  }

  let io;
  function reveal(animated) {
    const cards = $$('#results .reveal');
    $('#results').classList.toggle('no-anim', !animated);
    if (io) io.disconnect();
    if (!animated || !('IntersectionObserver' in window)) { cards.forEach(c => c.classList.add('in')); return; }
    cards.forEach(c => c.classList.remove('in'));
    io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); countUp(e.target); }
    }), { threshold: .18 });
    cards.forEach(c => io.observe(c));
  }
  function countUp(root) {
    root.querySelectorAll('[data-count]').forEach(el => {
      const to = +el.dataset.count, suf = el.dataset.suf || '%', t0 = performance.now(), D = reduce ? 1 : 1100;
      const tick = now => { const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }

  function renderResults(animated) {
    const { vec, rank } = compute(), top = rank[0], p = top.profile, L = state.lang;
    const hero = $('#heroRes');
    hero.style.setProperty('--h', p.hue);
    hero.innerHTML = `
      <div class="hero-ico"><span class="halo"></span>${Icons.svg(p.id, { hue: p.hue, size: 92, sw: 2.4 })}</div>
      <div class="hero-txt">
        <small>${t('res.closest')}</small>
        <h2>${p.name[L]}</h2>
        <span class="pill"><b data-count="${top.sim}" data-suf="%">${top.sim}%</b> ${t('res.word')}</span>
        <p>${p.desc[L]}</p>
        <em>${p.examples[L]}</em>
      </div>`;

    $('#compass').innerHTML = Charts.compass(vec, L, { auth: t('res.auth'), lib: t('res.lib'), state: L === 'fr' ? 'État' : 'State', market: L === 'fr' ? 'Marché' : 'Market' });
    $('#radar').innerHTML = Charts.radar(vec, L);

    $('#axesBars').innerHTML = AXES.map((ax, i) => {
      const v = vec[i], a = Math.round(100 - v), b = Math.round(v), neutral = Math.abs(v - 50) < 6;
      const lean = v < 50 ? ax.a[L] : ax.b[L], pct = v < 50 ? a : b;
      const l = Math.min(50, v), w = Math.abs(v - 50);
      return `<div class="axrow" style="--h:${ax.hue};--v:${v}%;--l:${l}%;--w:${w}%;--k:${i}">
        <div class="axhead"><span class="axname">${Icons.badge(ax.id, ax.hue, 32)}<b>${ax.name[L]}</b></span>
          <span class="lean">${neutral ? t('neutral') : t('leaning', { p: pct, pole: lean })}</span></div>
        <div class="axbar"><span class="fill"></span><i></i></div>
        <div class="axpoles"><span>${ax.a[L]} ${a}%</span><span>${b}% ${ax.b[L]}</span></div>
      </div>`;
    }).join('');

    const shown = state.showAll ? rank : rank.slice(0, 5);
    $('#ranking').innerHTML = shown.map((r, i) => `
      <div class="rk" style="--h:${r.profile.hue};--k:${i}">
        <span class="rk-n">${Icons.badge(r.profile.id, r.profile.hue, 34)}<span>${r.profile.name[L]}</span></span>
        <div class="rk-bar"><i style="width:${r.sim}%"></i></div>
        <b data-count="${r.sim}">${r.sim}%</b>
      </div>`).join('');
    $('#moreBtn').textContent = t(state.showAll ? 'res.less' : 'res.more');
    reveal(animated);
  }

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200);
  }

  async function downloadImage() {
    const { vec, rank } = compute(), canvas = document.createElement('canvas');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    await Charts.shareImage(canvas, {
      lang: state.lang, vec, rank, top: rank[0], title: t('hero.badge').split('•')[0].trim(),
      matchText: t('res.match', { p: rank[0].sim }), footer: location.host ? location.host + location.pathname : 'simu',
    });
    canvas.toBlob(b => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = t('dl.name');
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
  }

  function copyLink() {
    const url = location.href, done = () => toast(t('share.copied'));
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, fallback); else fallback();
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
  $('#moreBtn').addEventListener('click', () => { state.showAll = !state.showAll; renderResults(false); });
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
    show('results'); renderResults(true); return true;
  }
  const saved = LS.get('simu.lang');
  state.lang = saved && I18N[saved] ? saved : ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
  initIcons();
  applyLang();
  loadFromHash();
  window.addEventListener('hashchange', () => { if (!loadFromHash() && !location.hash) show('home'); });
})();
