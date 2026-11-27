/* Visualisations : radar, boussoles (SVG) et image de partage (canvas). */
(function () {
  const TAU = Math.PI * 2;
  const pt = (i, n, r, cx, cy) => { const a = -Math.PI / 2 + (i / n) * TAU; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const f = n => n.toFixed(1);
  const poly = (vec, n, R, cx, cy) => vec.map((v, i) => pt(i, n, R * v / 100, cx, cy).map(f).join(',')).join(' ');

  /** Radar. vs (optionnel) : {v:[12]} dessiné en pointillés pour comparer. */
  function radar(vec, lang, vs) {
    const N = vec.length, cx = 300, cy = 272, R = 150;
    let s = `<svg viewBox="0 0 600 544" role="img" aria-label="Radar" style="--cx:${cx}px;--cy:${cy}px">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff7849"/><stop offset="1" stop-color="#ffb347"/></linearGradient></defs>`;
    [25, 50, 75, 100].forEach((l, k) => {
      s += `<polygon points="${poly(vec.map(() => l), N, R, cx, cy)}" class="ring r-in${l === 50 ? ' mid' : ''}" style="animation-delay:${k * 90}ms"/>`;
    });
    vec.forEach((_, i) => { const [x, y] = pt(i, N, R, cx, cy); s += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="spoke r-in"/>`; });
    if (vs) s += `<polygon points="${poly(vs.v.map((x, i) => x == null ? vec[i] : x), N, R, cx, cy)}" fill="rgba(56,217,192,.12)" stroke="#38d9c0" stroke-width="2.5" stroke-dasharray="7 6" stroke-linejoin="round" class="shape vs"/>`;
    s += `<polygon points="${poly(vec, N, R, cx, cy)}" fill="url(#rg)" fill-opacity=".28" stroke="url(#rg)" stroke-width="2.5" stroke-linejoin="round" class="shape"/>`;
    vec.forEach((v, i) => {
      const [x, y] = pt(i, N, R * v / 100, cx, cy);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="4.5" fill="var(--bg)" stroke="hsl(${AXES[i].hue} 92% 70%)" stroke-width="2.5" class="pt" style="animation-delay:${650 + i * 45}ms"/>`;
    });
    AXES.forEach((ax, i) => {
      const [bx, by] = pt(i, N, R + 27, cx, cy), [tx, ty] = pt(i, N, R + 50, cx, cy);
      const anchor = Math.abs(tx - cx) < 10 ? 'middle' : tx > cx ? 'start' : 'end';
      const ty2 = Math.abs(tx - cx) < 10 ? (ty < cy ? ty - 2 : ty + 12) : ty + 4;
      s += `<g class="lab" style="animation-delay:${300 + i * 40}ms">
        <rect x="${f(bx - 14)}" y="${f(by - 14)}" width="28" height="28" rx="8" fill="hsla(${ax.hue},90%,60%,.14)" stroke="hsla(${ax.hue},90%,68%,.55)" stroke-width="1.2"/>
        ${Icons.nested(ax.id, ax.hue, bx - 9.5, by - 9.5, 19)}
        <text x="${f(tx)}" y="${f(ty2)}" text-anchor="${anchor}" class="rl rr">${ax.name[lang]}</text></g>`;
    });
    return s + '</svg>';
  }


  /** Boussole décorative : bezel gradué, 12 axes sur l'anneau, aiguille. */
  function dial() {
    const C = 160; let s = '<svg viewBox="0 0 320 320" role="img" aria-label="Boussole politique">';
    s += `<circle cx="${C}" cy="${C}" r="150" class="ring"/><circle cx="${C}" cy="${C}" r="98" class="ring mid"/><circle cx="${C}" cy="${C}" r="50" class="ring"/>`;
    s += '<g class="rot">';
    for (let i = 0; i < 72; i++) {
      const a = i * 5 * Math.PI / 180, major = i % 6 === 0, r1 = 150, r2 = major ? 136 : 143;
      s += `<line x1="${f(C + r1 * Math.sin(a))}" y1="${f(C - r1 * Math.cos(a))}" x2="${f(C + r2 * Math.sin(a))}" y2="${f(C - r2 * Math.cos(a))}" stroke="${major ? '#38d9c0' : 'var(--line2)'}" stroke-width="${major ? 1.6 : 1}"/>`;
    }
    s += '</g>';
    AXES.forEach((ax, i) => {
      const a = i * 30 * Math.PI / 180, x = C + 118 * Math.sin(a), y = C - 118 * Math.cos(a);
      s += `<g class="lab" style="animation-delay:${300 + i * 60}ms"><rect x="${f(x - 15)}" y="${f(y - 15)}" width="30" height="30" rx="8" fill="var(--surface)" stroke="hsla(${ax.hue},90%,68%,.55)"/>${Icons.nested(ax.id, ax.hue, x - 10, y - 10, 20)}</g>`;
    });
    s += `<g class="needle"><path d="M${C} ${C - 58} L${C + 13} ${C} L${C} ${C + 58} L${C - 13} ${C} Z" fill="none" stroke="var(--line2)" stroke-width="1.5"/><path d="M${C} ${C - 58} L${C + 13} ${C} L${C - 13} ${C} Z" fill="#ff7849"/><path d="M${C} ${C + 58} L${C + 13} ${C} L${C - 13} ${C} Z" fill="#38d9c0" opacity=".85"/><circle cx="${C}" cy="${C}" r="4.5" fill="var(--bg)" stroke="var(--txt)" stroke-width="2"/></g>`;
    return s + '</svg>';
  }

  /** Boussole x (axe xi) × y (axe yi). dots : [{x,y,label,hue}] repères (partis proches). */
  function compass(vec, lang, xi, yi, dots) {
    const x0 = 40, y0 = 36, W = 240, mx = x0 + W / 2, my = y0 + W / 2;
    const X = AXES[xi], Y = AXES[yi];
    const dx = x0 + W * vec[xi] / 100 - mx, dy = y0 + W * vec[yi] / 100 - my;
    const q = (x, y, c) => `<rect x="${x}" y="${y}" width="${W / 2}" height="${W / 2}" fill="${c}"/>`;
    const marks = (dots || []).filter(d => d.v[xi] != null && d.v[yi] != null).map((d, k) => {
      const x = x0 + W * d.v[xi] / 100, y = y0 + W * d.v[yi] / 100;
      return `<g class="mk" style="animation-delay:${700 + k * 120}ms"><circle cx="${f(x)}" cy="${f(y)}" r="5" fill="hsl(${d.hue} 88% 66%)" stroke="var(--surface)" stroke-width="2"/>
        <text x="${f(x)}" y="${f(k % 2 ? y + 17 : y - 9)}" text-anchor="middle" class="mt">${d.label}</text></g>`;
    }).join('');
    return `<svg viewBox="0 0 320 330" role="img" aria-label="Compass">
      <defs><clipPath id="cc"><rect x="${x0}" y="${y0}" width="${W}" height="${W}" rx="16"/></clipPath></defs>
      <g clip-path="url(#cc)">
        ${q(x0, y0, 'rgba(244,63,94,.20)')}${q(mx, y0, 'rgba(59,130,246,.20)')}${q(x0, my, 'rgba(34,197,94,.20)')}${q(mx, my, 'rgba(234,179,8,.20)')}
        <circle cx="${mx}" cy="${my}" r="${W / 4}" class="ring"/><circle cx="${mx}" cy="${my}" r="${W / 2 - 1}" class="ring"/>
        <line x1="${mx}" y1="${y0}" x2="${mx}" y2="${y0 + W}" class="ring mid"/><line x1="${x0}" y1="${my}" x2="${x0 + W}" y2="${my}" class="ring mid"/>
      </g>
      <rect x="${x0}" y="${y0}" width="${W}" height="${W}" rx="16" fill="none" class="ring"/>
      <text x="${mx}" y="24" text-anchor="middle" class="rl">${Y.a[lang]}</text>
      <text x="${mx}" y="${y0 + W + 24}" text-anchor="middle" class="rl">${Y.b[lang]}</text>
      <text x="${x0 - 14}" y="${my}" text-anchor="middle" class="rl" transform="rotate(-90 ${x0 - 14} ${my})">${X.a[lang]}</text>
      <text x="${x0 + W + 16}" y="${my}" text-anchor="middle" class="rl" transform="rotate(90 ${x0 + W + 16} ${my})">${X.b[lang]}</text>
      ${marks}
      <g class="cdot" style="transform:translate(${f(dx)}px,${f(dy)}px)">
        <circle cx="${mx}" cy="${my}" r="18" fill="#ff7849" opacity=".35" class="pulse"/>
        <circle cx="${mx}" cy="${my}" r="8" fill="#ff7849" stroke="var(--bg)" stroke-width="3"/><circle cx="${mx}" cy="${my}" r="8" fill="none" stroke="#ff7849" stroke-width="1.5" opacity=".6" transform="scale(1)"/>
      </g></svg>`;
  }

  /* ---------- Image de partage (1080 × 1350), identité cartographique ---------- */
  /** o : {lang, vec, top (famille), title, matchText, lr:{pos,label,left,right}, facts:[{label,name,sim,hue}], footer} */
  async function shareImage(canvas, o) {
    const W = 1080, H = 1350, c = canvas.getContext('2d'), BG = '#0a1b2e', SURF = '#0f2640', SURF2 = '#143251', LINE = '#25476a', LINE2 = '#3a6590', TXT = '#e8f0f7', MUT = '#8fa6bd', OR = '#ff7849', AQ = '#38d9c0';
    canvas.width = W; canvas.height = H;
    const top = o.top;
    const [topIco, ...axIco] = await Promise.all([Icons.image(top.id, top.hue, 260), ...AXES.map(a => Icons.image(a.id, a.hue, 64))]);
    const font = (w, s, f) => `${w} ${s}px ${f || 'Figtree'}, system-ui, -apple-system, "Segoe UI", sans-serif`;
    const DISP = 'Syne', MONO = '"IBM Plex Mono", ui-monospace, monospace';
    const box = (x, y, w, h, r, fill, stroke) => { roundRect(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = 2; c.strokeStyle = stroke; c.stroke(); } };
    const corners = (x, y, w, h, L = 22) => { c.strokeStyle = AQ; c.lineWidth = 3; c.beginPath();
      [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([px, py, sx, sy]) => { c.moveTo(px + sx * L, py); c.lineTo(px, py); c.lineTo(px, py + sy * L); }); c.stroke(); };

    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    // courbes de niveau décoratives
    c.lineWidth = 1.5; for (let r = 40; r < 900; r += 56) { c.strokeStyle = 'rgba(56,217,192,.07)'; c.beginPath(); c.arc(W - 60, 60, r, 0, TAU); c.stroke(); }
    for (let r = 50; r < 700; r += 64) { c.strokeStyle = 'rgba(255,120,73,.05)'; c.beginPath(); c.arc(40, H - 40, r, 0, TAU); c.stroke(); }

    // en-tête
    box(64, 48, 56, 56, 12, SURF, LINE2);
    c.strokeStyle = AQ; c.lineWidth = 4; c.beginPath(); c.arc(92, 76, 15, 0, TAU); c.stroke();
    c.fillStyle = OR; c.beginPath(); c.moveTo(102, 66); c.lineTo(96, 80); c.lineTo(82, 86); c.lineTo(88, 72); c.closePath(); c.fill();
    c.textAlign = 'left'; c.fillStyle = TXT; c.font = font(800, 34, DISP); c.fillText('S I M U', 142, 90);
    c.font = font(500, 24, MONO); c.fillStyle = OR; c.textAlign = 'right'; c.fillText('2027', W - 64, 88);

    // famille
    box(64, 150, W - 128, 250, 16, SURF, LINE); corners(64, 150, W - 128, 250);
    box(96, 182, 186, 186, 18, `hsla(${top.hue},90%,60%,.14)`, `hsla(${top.hue},90%,68%,.6)`);
    if (topIco) c.drawImage(topIco, 126, 212, 126, 126);
    c.textAlign = 'left'; c.fillStyle = MUT; c.font = font(500, 22, MONO); c.fillText(o.eyebrow, 318, 222);
    c.fillStyle = TXT; const nm = top.name[o.lang]; let fz = 56; c.font = font(700, fz, DISP); while (c.measureText(nm).width > W - 400 && fz > 28) { fz -= 2; c.font = font(700, fz, DISP); } c.fillText(nm, 318, 296);
    c.font = font(500, 28, MONO); c.fillStyle = AQ; c.fillText(o.matchText, 318, 350);

    // gauche – droite
    const bx = 170, bw = W - 340, by = 456;
    const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ff7849'); gr.addColorStop(.5, '#8e7bff'); gr.addColorStop(1, '#38b6ff');
    c.fillStyle = gr; roundRect(c, bx, by, bw, 12, 6); c.fill();
    const mx = bx + bw * o.lr.pos / 100; c.beginPath(); c.arc(mx, by + 6, 16, 0, TAU); c.fillStyle = BG; c.fill(); c.lineWidth = 6; c.strokeStyle = TXT; c.stroke();
    c.font = font(500, 22, MONO); c.fillStyle = MUT; c.textAlign = 'right'; c.fillText(o.lr.left.toUpperCase(), bx - 20, by + 17); c.textAlign = 'left'; c.fillText(o.lr.right.toUpperCase(), bx + bw + 20, by + 17);
    c.textAlign = 'center'; c.fillStyle = TXT; c.font = font(700, 30, DISP); c.fillText(o.lr.label, W / 2, by + 62);

    // radar
    const cx = W / 2, cy = 835, R = 140, N = o.vec.length;
    [25, 50, 75, 100].forEach(l => {
      c.beginPath(); o.vec.forEach((_, i) => { const [x, y] = pt(i, N, R * l / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.strokeStyle = l === 50 ? LINE2 : LINE; c.lineWidth = 2; c.stroke();
    });
    c.beginPath(); o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath(); c.globalAlpha = .28; c.fillStyle = OR; c.fill(); c.globalAlpha = 1; c.strokeStyle = OR; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
    o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fillStyle = BG; c.fill(); c.lineWidth = 4; c.strokeStyle = `hsl(${AXES[i].hue} 92% 70%)`; c.stroke(); });
    AXES.forEach((ax, i) => {
      const [px, py] = pt(i, N, R + 46, cx, cy);
      box(px - 26, py - 26, 52, 52, 12, `hsla(${ax.hue},90%,60%,.14)`, `hsla(${ax.hue},90%,68%,.55)`);
      if (axIco[i]) c.drawImage(axIco[i], px - 17, py - 17, 34, 34);
      c.font = font(600, 22); c.fillStyle = TXT;
      const mid = Math.abs(px - cx) < 12;
      if (mid) { c.textAlign = 'center'; c.fillText(ax.name[o.lang], px, py < cy ? py - 38 : py + 56); }
      else if (px > cx) { c.textAlign = 'left'; c.fillText(ax.name[o.lang], px + 38, py + 8); }
      else { c.textAlign = 'right'; c.fillText(ax.name[o.lang], px - 38, py + 8); }
    });

    // 4 affinités
    o.facts.forEach((ft, i) => {
      const x = 64 + (i % 2) * 508, y = 1110 + Math.floor(i / 2) * 100, w = 448, h = 84;
      box(x, y, w, h, 12, SURF2, LINE);
      c.fillStyle = `hsl(${ft.hue} 85% 64%)`; c.fillRect(x, y + 14, 5, h - 28);
      c.textAlign = 'left'; c.font = font(500, 17, MONO); c.fillStyle = MUT; c.fillText(ft.label.toUpperCase(), x + 24, y + 30);
      c.font = font(700, 27, DISP); c.fillStyle = TXT;
      let n2 = ft.name; while (c.measureText(n2).width > w - 150 && n2.length > 4) n2 = n2.slice(0, -2);
      c.fillText(n2 === ft.name ? n2 : n2 + '…', x + 24, y + 64);
      c.textAlign = 'right'; c.font = font(600, 28, MONO); c.fillStyle = AQ; c.fillText(ft.sim + '%', x + w - 22, y + 54);
    });
    c.textAlign = 'center'; c.font = font(500, 20, MONO); c.fillStyle = MUT; c.fillText(o.footer, W / 2, 1326);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  window.Charts = { radar, compass, dial, shareImage };
})();
