(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const LS = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const IDS = AXES.map(a => a.id);
  const COMPASSES = [['eco', 'lib'], ['soc', 'nat'], ['eco', 'env']];

  const state = { lang: 'fr', country: 'fr', mode: 'short', list: [], answers: [], idx: 0, showAll: false, busy: false, pending: null, tab: 'parties', cmp: 0, prio: [] };

  /* ---------- i18n ---------- */
  const t = (k, vars) => {
    let s = (I18N[state.lang] && I18N[state.lang][k]) || I18N.fr[k] || k;
    if (vars) for (const v in vars) s = s.split('{' + v + '}').join(vars[v]);
    return s;
  };
  function applyLang() {
    document.documentElement.lang = state.lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', b.dataset.lang === state.lang));
    fillCountries(); renderAnswers();
    if ($('#quiz').classList.contains('active')) renderQuestion();
    if ($('#results').classList.contains('active')) renderResults(false);
  }
  function setLang(l) { state.lang = l; LS.set('simu.lang', l); applyLang(); }

  /* ---------- Icônes statiques ---------- */
  function initIcons() {
    $('#logo').innerHTML = Icons.logo(26);
    $('#calcLogo').innerHTML = Icons.logo(64);
    $$('[data-icon]').forEach(el => { el.innerHTML = Icons.svg(el.dataset.icon, el.dataset.hue ? { hue: +el.dataset.hue, size: 26 } : { mono: true, size: 20 }); });
    $('#orbit').innerHTML = AXES.map((ax, i) => `<div class="o" style="--a:${i * 30}deg"><div class="oi" style="--a:${i * 30}deg">${Icons.badge(ax.id, ax.hue, 52)}</div></div>`).join('');
    $('#calcIcons').innerHTML = AXES.map(ax => Icons.badge(ax.id, ax.hue, 44)).join('');
  }

  /* ---------- Navigation ---------- */
  /** Met à jour le hash (sans recharger) ; tolère les environnements où l'API history est restreinte. */
  function setHash(h) {
    try { history.replaceState(null, '', h ? '#' + h : location.pathname + location.search); }
    catch (e) { try { location.hash = h; } catch (_) {} }
  }
  function show(id) { $$('.view').forEach(v => v.classList.toggle('active', v.id === id)); window.scrollTo({ top: 0 }); }
  function fillCountries() {
    const keys = Object.keys(COUNTRIES), sel = $('#country');
    $('#countryRow').hidden = keys.length < 2;
    sel.innerHTML = keys.map(k => `<option value="${k}"${k === state.country ? ' selected' : ''}>${COUNTRIES[k].flag} ${COUNTRIES[k].name[state.lang]}</option>`).join('');
  }

  /* ---------- Quiz ---------- */
  function start() {
    state.list = Engine.questionList(state.country, state.mode);
    state.answers = new Array(state.list.length).fill(null);
    state.idx = 0; state.busy = false; state.pending = null; state.prio = []; state.showAll = false; state.cmp = 0;
    setHash('');
    show('quiz'); renderQuestion(1);
  }
  function renderAnswers() {
    const sizes = [62, 48, 38, 48, 62], cols = ['#f43f5e', '#fb923c', '#94a3b8', '#4ade80', '#10b981'];
    $('#answers').innerHTML = [0, 1, 2, 3, 4].map(i => `
      <button class="ans" data-v="${i}" style="--s:${sizes[i]}px;--c:${cols[i]}" aria-label="${t('ans.' + i)} (${i + 1})" title="${t('ans.' + i)} (${i + 1})">
        <span class="dot">${Icons.svg('check', { mono: true, size: 22, sw: 4.5 })}</span><span class="lbl">${t('ans.' + i)}</span>
      </button>`).join('');
  }
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
    if (dir) { const c = $('#qCard'); c.style.setProperty('--dx', 46 * dir + 'px'); c.classList.remove('enter'); void c.offsetWidth; c.classList.add('enter'); }
  }
  async function slide(dir, update) {
    const c = $('#qCard');
    if (reduce) return update();
    const a = c.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-46 * dir}px) scale(.97)` }], { duration: 190, easing: 'ease-in', fill: 'forwards' });
    await a.finished; update(); a.cancel();
  }
  async function answer(v) {
    if (!$('#quiz').classList.contains('active')) return;
    if (state.busy) { state.pending = { v }; return; }
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
    setHash('r-' + Engine.encode(state.country, state.mode, state.answers));
    show('calc');
    const ic = $$('#calcIcons .bico'); ic.forEach(e => e.classList.remove('on'));
    $('#calc').classList.remove('run'); void $('#calc').offsetWidth; $('#calc').classList.add('run');
    for (const e of ic) { e.classList.add('on'); await wait(120); }
    await wait(450);
    show('results'); renderResults(true);
  }

  /* ---------- Jeux de données comparables ---------- */
  function datasets() {
    const C = COUNTRIES[state.country], D = [];
    if (C.parties && C.parties.length) D.push({ id: 'parties', fact: 'fact.party', items: C.parties, badge: (x, z) => Icons.text(x.code, x.hue, z), sub: x => x.sub });
    D.push({ id: 'ideologies', fact: 'fact.ideo', items: IDEOLOGIES, badge: (x, z) => Icons.badge(x.icon, x.hue, z), sub: x => x.desc });
    D.push({ id: 'countries', fact: 'fact.country', items: WORLD, badge: (x, z) => Icons.text(x.code, x.hue, z), sub: x => x.desc });
    D.push({ id: 'figures', fact: 'fact.figure', items: FIGURES, badge: (x, z) => Icons.text(x.code, x.hue, z), sub: x => x.desc });
    D.push({ id: 'families', fact: null, items: C.profiles, badge: (x, z) => Icons.badge(x.id, x.hue, z), sub: x => x.desc });
    return D;
  }
  /** Pour les en-têtes : écarte les estimations peu fiables (conf 1) tant qu'il en reste de plus solides. */
  const reliable = list => { const ok = list.filter(r => !r.item.conf || r.item.conf >= 2); return ok.length ? ok : list; };
  const weights = () => IDS.map(id => state.prio.includes(id) ? 2 : 1);
  const axName = i => AXES[i].name[state.lang];

  function compute() {
    const vec = Engine.scores(state.list, state.answers), data = datasets();
    const tops = {}; data.forEach(d => { tops[d.id] = Engine.rank(d.items, vec); });
    return { vec, data, tops };
  }

  /* ---------- Résultats ---------- */
  let io;
  function reveal(animated) {
    const cards = $$('#results .reveal');
    $('#results').classList.toggle('no-anim', !animated);
    if (io) io.disconnect();
    if (!animated || !('IntersectionObserver' in window)) { cards.forEach(c => c.classList.add('in')); return; }
    cards.forEach(c => c.classList.remove('in'));
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); countUp(e.target); } }), { threshold: .12 });
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
    const R = compute(), { vec, data, tops } = R, L = state.lang;
    const fam = tops.families[0], fp = fam.item;

    /* Hero : famille + 4 affinités */
    const facts = data.filter(d => d.fact).map(d => ({ d, r: reliable(tops[d.id])[0] }));
    const hero = $('#heroRes');
    hero.style.setProperty('--h', fp.hue);
    hero.innerHTML = `
      <div class="hero-top">
        <div class="hero-ico"><span class="halo"></span>${Icons.svg(fp.id, { hue: fp.hue, size: 92, sw: 2.4 })}</div>
        <div class="hero-txt">
          <small>${t('res.closest')}</small>
          <h2>${fp.name[L]}</h2>
          <span class="pill"><b data-count="${fam.sim}" data-suf="%">${fam.sim}%</b> ${t('res.word')}</span>
          <p>${fp.desc[L]}</p>
        </div>
      </div>
      <div class="facts">${facts.map(({ d, r }, i) => `
        <div class="fact" style="--h:${r.item.hue};--k:${i}">
          ${d.badge(r.item, 40)}
          <div class="fact-t"><small>${t(d.fact)}</small><b>${r.item.name[L]}</b></div>
          <span class="fact-p" data-count="${r.sim}" data-suf="%">${r.sim}%</span>
        </div>`).join('')}</div>`;

    /* Résumé : gauche-droite, intensité, convictions */
    const pos = Engine.leftRight(vec), lvl = Engine.lrLevel(pos), inten = Engine.intensity(vec);
    const il = inten < 20 ? 0 : inten < 38 ? 1 : inten < 55 ? 2 : 3;
    const order = Engine.byStrength(vec), strong = order.filter(o => o.dev >= 12).slice(0, 5), nuance = order.slice(-3).reverse();
    const pole = i => vec[i] < 50 ? AXES[i].a[L] : AXES[i].b[L];
    const tag = o => { const ax = AXES[o.i], pct = Math.round(vec[o.i] < 50 ? 100 - vec[o.i] : vec[o.i]); return `<span class="tag" style="--h:${ax.hue}">${Icons.svg(ax.id, { hue: ax.hue, size: 18 })}<b>${pct}%</b> ${pole(o.i)}</span>`; };
    $('#sumCard').innerHTML = `
      <h3>${t('sum.title')}</h3>
      <div class="sum-grid">
        <div class="meters">
          <div class="meter">
            <div class="m-head"><span>${t('sum.lr')}</span><b>${t('lr.' + lvl)}</b></div>
            <div class="lr-bar"><span class="lr-mark" style="--p:${pos}%"></span></div>
            <div class="m-ends"><span>${t('lr.l')}</span><span>${t('lr.r')}</span></div>
          </div>
          <div class="meter">
            <div class="m-head"><span>${t('sum.int')}</span><b>${t('int.' + il)} · <span data-count="${inten}" data-suf="%">${inten}%</span></b></div>
            <div class="int-bar"><i style="--w:${inten}%"></i></div>
          </div>
        </div>
        <div class="convs">
          <div class="m-head"><span>${t('sum.strong')}</span></div>
          <div class="tags">${strong.map(tag).join('') || `<span class="tag">${t('neutral')}</span>`}</div>
          <p class="sum-text">${t('sum.text', { a: strong.slice(0, 3).map(o => pole(o.i)).join(', ') || t('neutral'), b: nuance.map(o => axName(o.i)).join(', ') })}</p>
        </div>
      </div>`;

    renderCompass(R);

    /* Radar : toi vs. 1er parti (ou 1re idéologie) */
    const vsD = tops.parties || tops.ideologies, vs = reliable(vsD)[0].item;
    $('#radar').innerHTML = Charts.radar(vec, L, vs);
    $('#radarLegend').innerHTML = `<span><i class="lg you"></i>${t('radar.you')}</span><span><i class="lg vs"></i>${vs.name[L]}</span>`;

    /* Détail par axe */
    $('#axesBars').innerHTML = AXES.map((ax, i) => {
      const v = vec[i], a = Math.round(100 - v), b = Math.round(v), neutral = Math.abs(v - 50) < 6;
      return `<div class="axrow" style="--h:${ax.hue};--v:${v}%;--l:${Math.min(50, v)}%;--w:${Math.abs(v - 50)}%;--k:${i}">
        <div class="axhead"><span class="axname">${Icons.badge(ax.id, ax.hue, 32)}<b>${ax.name[L]}</b></span>
          <span class="lean">${neutral ? t('neutral') : t('leaning', { p: v < 50 ? a : b, pole: pole(i) })}</span></div>
        <div class="axbar"><span class="fill"></span><i></i></div>
        <div class="axpoles"><span>${ax.a[L]} ${a}%</span><span>${b}% ${ax.b[L]}</span></div>
      </div>`;
    }).join('');

    renderMatch(R);
    reveal(animated);
  }

  function renderCompass(R) {
    const { vec, tops } = R, L = state.lang;
    $('#compassTabs').innerHTML = COMPASSES.map((c, k) => `<button class="tab" data-cmp="${k}" aria-pressed="${k === state.cmp}">${axName(IDS.indexOf(c[0]))} × ${axName(IDS.indexOf(c[1]))}</button>`).join('');
    const [xi, yi] = COMPASSES[state.cmp].map(id => IDS.indexOf(id));
    const dots = tops.parties ? reliable(tops.parties).slice(0, 4).map(r => ({ v: r.item.v, hue: r.item.hue, label: r.item.code })) : [];
    $('#compass').innerHTML = Charts.compass(vec, L, xi, yi, dots) + (dots.length ? `<div class="legend"><span><i class="lg you"></i>${t('radar.you')}</span><span><i class="lg dotp"></i>${t('compass.parties')}</span></div>` : '');
  }

  function renderMatch(R) {
    R = R || compute();
    const { vec, data } = R, L = state.lang;
    if (!data.find(d => d.id === state.tab)) state.tab = data[0].id;
    $('#matchTabs').innerHTML = data.map(d => `<button class="tab" data-tab="${d.id}" aria-pressed="${d.id === state.tab}">${t('tab.' + d.id)}</button>`).join('');
    $('#prioChips').innerHTML = AXES.map(ax => `<button class="chip-b${state.prio.includes(ax.id) ? ' on' : ''}" data-prio="${ax.id}" style="--h:${ax.hue}" aria-pressed="${state.prio.includes(ax.id)}">${Icons.svg(ax.id, { hue: ax.hue, size: 18 })}${ax.name[L]}</button>`).join('');
    const d = data.find(x => x.id === state.tab), rank = Engine.rank(d.items, vec, weights());
    const shown = state.showAll ? rank : rank.slice(0, 6);
    const list = (a, label) => a.length ? `<span class="${label === 'close' ? 'ok' : 'no'}">${t('why.' + label)} ${a.map(axName).join(', ')}</span>` : '';
    const dots = n => `<span class="conf c${n}" title="${t('conf.t')} : ${t('conf.' + n)}" aria-label="${t('conf.t')} : ${t('conf.' + n)}"><i></i><i></i><i></i></span>`;
    const candLine = x => !x.cand ? '' : `<small class="cand${x.cand.name ? ' on' : ''}">${x.cand.name ? t('cand') + ' <b>' + x.cand.name + '</b> · ' : ''}${x.cand.status[L]}</small>`;
    const note = d.id === 'parties' ? `<p class="cand-note">${t('cand.note')}</p>` : '';
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const basis = (x, r) => !x.basis ? '' : `<details class="basis"><summary>${t('basis.t')}</summary>
        <p>${esc(x.basis[L])}</p>
        ${r.cov < 1 ? `<p class="cov">${t('cov', { n: Math.round(r.cov * 12) })}</p>` : ''}
        ${x.src && x.src.length ? `<ul>${x.src.map(s => `<li><a href="${esc(s[1])}" target="_blank" rel="noopener noreferrer">${esc(s[0])}</a></li>`).join('')}</ul>` : ''}
      </details>`;
    $('#matchList').innerHTML = note + shown.map((r, i) => {
      const x = r.item, sub = d.sub(x);
      return `<div class="rk" style="--h:${x.hue};--k:${i}">
        <span class="rk-n">${d.badge(x, 40)}<span class="rk-t"><b>${x.name[L]}${x.conf ? dots(x.conf) : ''}</b>${sub ? `<small>${sub[L]}</small>` : ''}${candLine(x)}</span></span>
        <div class="rk-bar"><i style="width:${r.sim}%"></i></div><b class="rk-p">${r.sim}%</b>
        <div class="rk-why">${list(r.close, 'close')}${list(r.far, 'far')}</div>
        ${basis(x, r)}
      </div>`;
    }).join('');
    $('#moreBtn').textContent = t(state.showAll ? 'res.less' : 'res.more');
    $('#moreBtn').style.display = rank.length > 6 ? '' : 'none';
  }

  /* ---------- Partage ---------- */
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200);
  }
  async function downloadImage() {
    const { vec, data, tops } = compute(), L = state.lang, canvas = document.createElement('canvas'), pos = Engine.leftRight(vec);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const fam = tops.families[0];
    await Charts.shareImage(canvas, {
      lang: L, vec, top: fam.item, title: t('hero.badge').split('•')[0].trim(), matchText: t('res.match', { p: fam.sim }),
      lr: { pos, label: t('lr.' + Engine.lrLevel(pos)), left: t('lr.l'), right: t('lr.r') },
      facts: data.filter(d => d.fact).map(d => { const r = reliable(tops[d.id])[0]; return { label: t(d.fact), name: r.item.name[L], sim: r.sim, hue: r.item.hue }; }),
      footer: t('share.footer'),
    });
    // Affichée dans la page : un téléchargement déclenché par script est bloqué dans certains hébergements
    // (pages publiées) ; clic droit / appui long enregistre l'image, le lien « Télécharger » marche ailleurs.
    const url = canvas.toDataURL('image/png');
    $('#shareImg').src = url;
    const dl = $('#shareDl'); dl.href = url; dl.download = t('dl.name');
    $('#shareModal').hidden = false; $('#shareClose').focus();
  }
  function closeModal() { $('#shareModal').hidden = true; }
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
    else if (b.dataset.tab) { state.tab = b.dataset.tab; state.showAll = false; renderMatch(); }
    else if (b.dataset.cmp) { state.cmp = +b.dataset.cmp; renderCompass(compute()); }
    else if (b.dataset.prio) {
      const id = b.dataset.prio, i = state.prio.indexOf(id);
      if (i >= 0) state.prio.splice(i, 1); else { state.prio.push(id); if (state.prio.length > 3) state.prio.shift(); }
      renderMatch();
    }
  });
  $('#country').addEventListener('change', e => { state.country = e.target.value; });
  $('#startBtn').addEventListener('click', start);
  $('#backBtn').addEventListener('click', prev);
  $('#skipBtn').addEventListener('click', () => answer(null));
  $('#quitBtn').addEventListener('click', () => show('home'));
  $('#retakeBtn').addEventListener('click', () => { setHash(''); show('home'); });
  $('#imgBtn').addEventListener('click', downloadImage);
  $('#shareClose').addEventListener('click', closeModal);
  // Hébergement « page publiée » : le lien de téléchargement direct est bloqué, on passe par sa capacité `downloads`.
  // Ailleurs (hébergement classique), window.claude n'existe pas et le lien <a download> fonctionne normalement.
  $('#shareDl').addEventListener('click', async e => {
    if (!(window.claude && window.claude.use)) return;
    e.preventDefault();
    try {
      const dl = await window.claude.use('downloads');
      if (!dl) { toast(t('share.modal.h')); return; }
      const bin = atob($('#shareImg').src.split(',')[1]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      await dl.save({ filename: t('dl.name'), data: blob });
    } catch (err) { if (!err || err.code !== 'declined') toast(t('share.modal.h')); }
  });
  $('#shareModal').addEventListener('click', e => { if (e.target.id === 'shareModal') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#shareModal').hidden) closeModal(); });
  $('#linkBtn').addEventListener('click', copyLink);
  $('#moreBtn').addEventListener('click', () => { state.showAll = !state.showAll; renderMatch(); });
  $('#brand').addEventListener('click', e => { e.preventDefault(); setHash(''); show('home'); });
  document.addEventListener('keydown', e => {
    if (!$('#quiz').classList.contains('active')) return;
    if (e.key >= '1' && e.key <= '5') answer(+e.key - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'Backspace') prev();
  });

  /* ---------- Init ---------- */
  function loadFromHash() {
    const m = /^#r[=-](.+)$/.exec(location.hash), d = m && Engine.decode(m[1]);
    if (!d) return false;
    Object.assign(state, { country: d.country, mode: d.mode, answers: d.answers, list: Engine.questionList(d.country, d.mode) });
    show('results'); renderResults(true); return true;
  }
  const saved = LS.get('simu.lang');
  state.lang = saved && I18N[saved] ? saved : ((navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
  initIcons(); applyLang(); loadFromHash();
  window.addEventListener('hashchange', () => { if (!loadFromHash() && !location.hash) show('home'); });
})();
