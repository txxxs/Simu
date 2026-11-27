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
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>`;
    [25, 50, 75, 100].forEach((l, k) => {
      s += `<polygon points="${poly(vec.map(() => l), N, R, cx, cy)}" class="ring r-in${l === 50 ? ' mid' : ''}" style="animation-delay:${k * 90}ms"/>`;
    });
    vec.forEach((_, i) => { const [x, y] = pt(i, N, R, cx, cy); s += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="spoke r-in"/>`; });
    if (vs) s += `<polygon points="${poly(vs.v.map((x, i) => x == null ? vec[i] : x), N, R, cx, cy)}" fill="rgba(244,114,182,.10)" stroke="#f472b6" stroke-width="2.5" stroke-dasharray="7 6" stroke-linejoin="round" class="shape vs"/>`;
    s += `<polygon points="${poly(vec, N, R, cx, cy)}" fill="url(#rg)" fill-opacity=".32" stroke="url(#rg)" stroke-width="2.5" stroke-linejoin="round" class="shape"/>`;
    vec.forEach((v, i) => {
      const [x, y] = pt(i, N, R * v / 100, cx, cy);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="4.5" fill="#fff" stroke="hsl(${AXES[i].hue} 92% 66%)" stroke-width="2.5" class="pt" style="animation-delay:${650 + i * 45}ms"/>`;
    });
    AXES.forEach((ax, i) => {
      const [bx, by] = pt(i, N, R + 27, cx, cy), [tx, ty] = pt(i, N, R + 50, cx, cy);
      const anchor = Math.abs(tx - cx) < 10 ? 'middle' : tx > cx ? 'start' : 'end';
      const ty2 = Math.abs(tx - cx) < 10 ? (ty < cy ? ty - 2 : ty + 12) : ty + 4;
      s += `<g class="lab" style="animation-delay:${300 + i * 40}ms">
        <rect x="${f(bx - 14)}" y="${f(by - 14)}" width="28" height="28" rx="9" fill="hsla(${ax.hue},90%,62%,.16)" stroke="hsla(${ax.hue},90%,72%,.5)"/>
        ${Icons.nested(ax.id, ax.hue, bx - 9.5, by - 9.5, 19)}
        <text x="${f(tx)}" y="${f(ty2)}" text-anchor="${anchor}" class="rl rr">${ax.name[lang]}</text></g>`;
    });
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
      return `<g class="mk" style="animation-delay:${700 + k * 120}ms"><circle cx="${f(x)}" cy="${f(y)}" r="5" fill="hsl(${d.hue} 90% 62%)" stroke="#fff" stroke-width="1.5"/>
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
        <circle cx="${mx}" cy="${my}" r="18" fill="#8b5cf6" opacity=".35" class="pulse"/>
        <circle cx="${mx}" cy="${my}" r="9" fill="#fff" stroke="#8b5cf6" stroke-width="4.500"/>
      </g></svg>`;
  }

  /* ---------- Image de partage (1080 × 1350) ---------- */
  /** o : {lang, vec, top (famille), title, matchText, lr:{pos,label,left,right}, facts:[{label,name,sim,hue}], footer} */
  async function shareImage(canvas, o) {
    const W = 1080, H = 1350, c = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    const top = o.top;
    const [topIco, ...axIco] = await Promise.all([Icons.image(top.id, top.hue, 260), ...AXES.map(a => Icons.image(a.id, a.hue, 64))]);
    const font = (w, s) => `${w} ${s}px Poppins, system-ui, -apple-system, "Segoe UI", sans-serif`;

    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a0e27'); g.addColorStop(1, '#1b1048');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    [[150, 180, 460, '#8b5cf6'], [1000, 560, 400, '#22d3ee'], [300, 1260, 460, '#ec4899']].forEach(([x, y, r, col]) => {
      const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col + '55'); rg.addColorStop(1, col + '00');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
    });

    // en-tête
    const lg = c.createLinearGradient(70, 50, 130, 110); lg.addColorStop(0, '#8b5cf6'); lg.addColorStop(1, '#22d3ee');
    c.fillStyle = lg; roundRect(c, 70, 44, 58, 58, 17); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 4.5; c.beginPath(); c.arc(99, 73, 18, 0, TAU); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(110, 62); c.lineTo(103, 77); c.lineTo(88, 84); c.lineTo(95, 69); c.closePath(); c.fill();
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = font(800, 48); c.fillText('Simu', 146, 88);
    c.font = font(500, 27); c.fillStyle = '#a5b0d6'; c.textAlign = 'right'; c.fillText(o.title, W - 70, 86);

    // famille
    const hue = top.hue;
    const gl = c.createRadialGradient(W / 2, 220, 0, W / 2, 220, 170); gl.addColorStop(0, `hsla(${hue},90%,60%,.5)`); gl.addColorStop(1, `hsla(${hue},90%,60%,0)`);
    c.fillStyle = gl; c.fillRect(W / 2 - 200, 40, 400, 360);
    c.fillStyle = `hsla(${hue},90%,60%,.16)`; roundRect(c, W / 2 - 66, 135, 132, 132, 40); c.fill();
    c.strokeStyle = `hsla(${hue},90%,72%,.5)`; c.lineWidth = 3; roundRect(c, W / 2 - 66, 135, 132, 132, 40); c.stroke();
    if (topIco) c.drawImage(topIco, W / 2 - 53, 148, 106, 106);
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = font(800, 56); c.fillText(top.name[o.lang], W / 2, 335);
    c.font = font(600, 30); c.fillStyle = '#22d3ee'; c.fillText(o.matchText, W / 2, 380);

    // gauche – droite
    const bx = 150, bw = W - 300, by = 440;
    const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#f43f5e'); gr.addColorStop(.5, '#a78bfa'); gr.addColorStop(1, '#3b82f6');
    c.fillStyle = 'rgba(255,255,255,.1)'; roundRect(c, bx, by, bw, 14, 7); c.fill();
    c.fillStyle = gr; c.globalAlpha = .9; roundRect(c, bx, by, bw, 14, 7); c.fill(); c.globalAlpha = 1;
    c.beginPath(); c.arc(bx + bw * o.lr.pos / 100, by + 7, 15, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 5; c.strokeStyle = '#8b5cf6'; c.stroke();
    c.font = font(500, 24); c.fillStyle = '#a5b0d6'; c.textAlign = 'right'; c.fillText(o.lr.left, bx - 20, by + 14); c.textAlign = 'left'; c.fillText(o.lr.right, bx + bw + 20, by + 14);
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = font(700, 28); c.fillText(o.lr.label, W / 2, by + 56);

    // radar
    const cx = W / 2, cy = 800, R = 150, N = o.vec.length;
    [25, 50, 75, 100].forEach(l => {
      c.beginPath(); o.vec.forEach((_, i) => { const [x, y] = pt(i, N, R * l / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.strokeStyle = l === 50 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.stroke();
    });
    c.beginPath(); o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    const rg2 = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R); rg2.addColorStop(0, '#a78bfa'); rg2.addColorStop(1, '#22d3ee');
    c.globalAlpha = .36; c.fillStyle = rg2; c.fill(); c.globalAlpha = 1; c.strokeStyle = rg2; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
    o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = `hsl(${AXES[i].hue} 90% 66%)`; c.stroke(); });
    AXES.forEach((ax, i) => {
      const [px, py] = pt(i, N, R + 46, cx, cy);
      c.fillStyle = `hsla(${ax.hue},90%,62%,.18)`; roundRect(c, px - 26, py - 26, 52, 52, 16); c.fill();
      c.strokeStyle = `hsla(${ax.hue},90%,72%,.55)`; c.lineWidth = 2; roundRect(c, px - 26, py - 26, 52, 52, 16); c.stroke();
      if (axIco[i]) c.drawImage(axIco[i], px - 17, py - 17, 34, 34);
      c.font = font(500, 22); c.fillStyle = '#d6dcf5';
      const mid = Math.abs(px - cx) < 12;
      if (mid) { c.textAlign = 'center'; c.fillText(ax.name[o.lang], px, py < cy ? py - 36 : py + 52); }
      else if (px > cx) { c.textAlign = 'left'; c.fillText(ax.name[o.lang], px + 36, py + 8); }
      else { c.textAlign = 'right'; c.fillText(ax.name[o.lang], px - 36, py + 8); }
    });

    // 4 affinités
    o.facts.forEach((ft, i) => {
      const x = 60 + (i % 2) * 510, y = 1100 + Math.floor(i / 2) * 100, w = 450, h = 88;
      c.fillStyle = 'rgba(255,255,255,.07)'; roundRect(c, x, y, w, h, 22); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 2; roundRect(c, x, y, w, h, 22); c.stroke();
      c.fillStyle = `hsl(${ft.hue} 85% 62%)`; roundRect(c, x + 14, y + 16, 7, h - 32, 4); c.fill();
      c.textAlign = 'left'; c.font = font(500, 19); c.fillStyle = '#a5b0d6'; c.fillText(ft.label, x + 38, y + 33);
      c.font = font(700, 27); c.fillStyle = '#fff';
      let name = ft.name; while (c.measureText(name).width > w - 150 && name.length > 4) name = name.slice(0, -2);
      c.fillText(name === ft.name ? name : name + '…', x + 38, y + 66);
      c.textAlign = 'right'; c.font = font(800, 30); c.fillStyle = `hsl(${ft.hue} 90% 72%)`; c.fillText(ft.sim + '%', x + w - 24, y + 55);
    });
    c.textAlign = 'center'; c.font = font(500, 24); c.fillStyle = '#7f89b3'; c.fillText(o.footer, W / 2, 1326);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  window.Charts = { radar, compass, shareImage };
})();
