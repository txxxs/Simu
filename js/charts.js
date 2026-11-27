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
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7d866"/><stop offset="1" stop-color="#ee5fa7"/></linearGradient></defs>`;
    [25, 50, 75, 100].forEach((l, k) => {
      s += `<polygon points="${poly(vec.map(() => l), N, R, cx, cy)}" class="ring r-in${l === 50 ? ' mid' : ''}" style="animation-delay:${k * 90}ms"/>`;
    });
    vec.forEach((_, i) => { const [x, y] = pt(i, N, R, cx, cy); s += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="spoke r-in"/>`; });
    if (vs) s += `<polygon points="${poly(vs.v.map((x, i) => x == null ? vec[i] : x), N, R, cx, cy)}" fill="rgba(79,209,181,.14)" stroke="#4fd1b5" stroke-width="2.5" stroke-dasharray="7 6" stroke-linejoin="round" class="shape vs"/>`;
    s += `<polygon points="${poly(vec, N, R, cx, cy)}" fill="url(#rg)" fill-opacity=".45" stroke="url(#rg)" stroke-width="3.5" stroke-linejoin="round" class="shape"/>`;
    vec.forEach((v, i) => {
      const [x, y] = pt(i, N, R * v / 100, cx, cy);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="5.5" fill="hsl(${AXES[i].hue} 88% 68%)" stroke="#1f1030" stroke-width="2.5" class="pt" style="animation-delay:${650 + i * 45}ms"/>`;
    });
    AXES.forEach((ax, i) => {
      const [bx, by] = pt(i, N, R + 27, cx, cy), [tx, ty] = pt(i, N, R + 50, cx, cy);
      const anchor = Math.abs(tx - cx) < 10 ? 'middle' : tx > cx ? 'start' : 'end';
      const ty2 = Math.abs(tx - cx) < 10 ? (ty < cy ? ty - 2 : ty + 12) : ty + 4;
      s += `<g class="lab" style="animation-delay:${300 + i * 40}ms">
        <rect x="${f(bx - 14)}" y="${f(by - 14)}" width="28" height="28" rx="9" fill="hsl(${ax.hue} 90% 90%)" stroke="#1f1030" stroke-width="2"/>
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
      return `<g class="mk" style="animation-delay:${700 + k * 120}ms"><circle cx="${f(x)}" cy="${f(y)}" r="5" fill="hsl(${d.hue} 88% 68%)" stroke="#1f1030" stroke-width="2"/>
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
        <circle cx="${mx}" cy="${my}" r="18" fill="#f7d866" opacity=".4" class="pulse"/>
        <circle cx="${mx}" cy="${my}" r="10" fill="#f7d866" stroke="#1f1030" stroke-width="4"/>
      </g></svg>`;
  }

  /* ---------- Image de partage (1080 × 1350), même direction « autocollants » ---------- */
  /** o : {lang, vec, top (famille), title, matchText, lr:{pos,label,left,right}, facts:[{label,name,sim,hue}], footer} */
  async function shareImage(canvas, o) {
    const W = 1080, H = 1350, c = canvas.getContext('2d'), INK = '#1f1030', CREAM = '#fff4dc', Y = '#f7d866', P = '#d9438a';
    canvas.width = W; canvas.height = H;
    const top = o.top;
    const [topIco, ...axIco] = await Promise.all([Icons.image(top.id, top.hue, 260), ...AXES.map(a => Icons.image(a.id, a.hue, 64))]);
    const font = (w, s, f) => `${w} ${s}px ${f || 'Nunito'}, system-ui, -apple-system, "Segoe UI", sans-serif`;
    const DISP = '"Bricolage Grotesque"';
    const sticker = (x, y, w, h, r, fill, sh = 8) => { c.fillStyle = INK; roundRect(c, x, y + sh, w, h, r); c.fill(); c.fillStyle = fill; roundRect(c, x, y, w, h, r); c.fill(); c.lineWidth = 6; c.strokeStyle = INK; roundRect(c, x, y, w, h, r); c.stroke(); };

    c.fillStyle = '#4d2b6f'; c.fillRect(0, 0, W, H);
    // en-tête
    sticker(64, 44, 62, 62, 18, Y, 5);
    c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(95, 75, 18, 0, TAU); c.stroke();
    c.fillStyle = INK; c.beginPath(); c.moveTo(106, 64); c.lineTo(99, 79); c.lineTo(84, 86); c.lineTo(91, 71); c.closePath(); c.fill();
    c.textAlign = 'left'; c.font = font(800, 52, DISP); c.fillStyle = INK; c.fillText('Simu', 148, 96); c.fillStyle = CREAM; c.fillText('Simu', 146, 92);
    c.font = font(800, 27); c.fillStyle = '#d3c0ee'; c.textAlign = 'right'; c.fillText(o.title, W - 64, 92);

    // famille : pastille d'icône + titre en bloc jaune incliné
    sticker(W / 2 - 80, 140, 160, 160, 46, `hsl(${top.hue} 90% 88%)`, 9);
    if (topIco) c.drawImage(topIco, W / 2 - 62, 158, 124, 124);
    c.save(); c.translate(W / 2, 372); c.rotate(-0.02);
    c.font = font(800, 58, DISP); const name = top.name[o.lang].toUpperCase(), tw = Math.min(c.measureText(name).width + 56, W - 120);
    c.fillStyle = Y; c.fillRect(-tw / 2, -50, tw, 74); c.fillStyle = INK; c.textAlign = 'center'; c.fillText(name, 0, 8, tw - 40); c.restore();
    c.save(); c.translate(W / 2, 428); c.rotate(0.015); c.font = font(800, 30); const mw = c.measureText(o.matchText).width + 48;
    sticker(-mw / 2, -30, mw, 48, 24, P, 4); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(o.matchText, 0, 5); c.restore();

    // gauche – droite
    const bx = 150, bw = W - 300, by = 490;
    const gr = c.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ee5fa7'); gr.addColorStop(.5, '#c8a2ff'); gr.addColorStop(1, '#5aa9ff');
    c.fillStyle = INK; roundRect(c, bx - 4, by - 4, bw + 8, 28, 14); c.fill(); c.fillStyle = gr; roundRect(c, bx, by, bw, 20, 10); c.fill();
    const mx = bx + bw * o.lr.pos / 100; c.beginPath(); c.arc(mx, by + 10, 20, 0, TAU); c.fillStyle = Y; c.fill(); c.lineWidth = 6; c.strokeStyle = INK; c.stroke();
    c.font = font(800, 24); c.fillStyle = '#d3c0ee'; c.textAlign = 'right'; c.fillText(o.lr.left, bx - 22, by + 20); c.textAlign = 'left'; c.fillText(o.lr.right, bx + bw + 22, by + 20);
    c.textAlign = 'center'; c.fillStyle = CREAM; c.font = font(800, 30, DISP); c.fillText(o.lr.label, W / 2, by + 66);

    // radar
    const cx = W / 2, cy = 835, R = 140, N = o.vec.length;
    [25, 50, 75, 100].forEach(l => {
      c.beginPath(); o.vec.forEach((_, i) => { const [x, y] = pt(i, N, R * l / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.strokeStyle = l === 50 ? 'rgba(255,244,220,.5)' : 'rgba(255,244,220,.22)'; c.lineWidth = 2; c.stroke();
    });
    c.beginPath(); o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    const rg2 = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R); rg2.addColorStop(0, Y); rg2.addColorStop(1, '#ee5fa7');
    c.globalAlpha = .5; c.fillStyle = rg2; c.fill(); c.globalAlpha = 1; c.strokeStyle = rg2; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
    o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fillStyle = `hsl(${AXES[i].hue} 88% 68%)`; c.fill(); c.lineWidth = 4; c.strokeStyle = INK; c.stroke(); });
    AXES.forEach((ax, i) => {
      const [px, py] = pt(i, N, R + 46, cx, cy);
      sticker(px - 26, py - 26, 52, 52, 16, `hsl(${ax.hue} 90% 90%)`, 4);
      if (axIco[i]) c.drawImage(axIco[i], px - 17, py - 17, 34, 34);
      c.font = font(800, 23); c.fillStyle = CREAM;
      const mid = Math.abs(px - cx) < 12;
      if (mid) { c.textAlign = 'center'; c.fillText(ax.name[o.lang], px, py < cy ? py - 38 : py + 56); }
      else if (px > cx) { c.textAlign = 'left'; c.fillText(ax.name[o.lang], px + 38, py + 8); }
      else { c.textAlign = 'right'; c.fillText(ax.name[o.lang], px - 38, py + 8); }
    });

    // 4 affinités
    o.facts.forEach((ft, i) => {
      const x = 60 + (i % 2) * 510, y = 1110 + Math.floor(i / 2) * 104, w = 450, h = 84;
      sticker(x, y, w, h, 24, '#6c429b', 6);
      c.fillStyle = `hsl(${ft.hue} 85% 64%)`; roundRect(c, x + 16, y + 16, 8, h - 32, 4); c.fill();
      c.textAlign = 'left'; c.font = font(800, 19); c.fillStyle = '#d3c0ee'; c.fillText(ft.label, x + 40, y + 33);
      c.font = font(800, 27); c.fillStyle = CREAM;
      let nm = ft.name; while (c.measureText(nm).width > w - 160 && nm.length > 4) nm = nm.slice(0, -2);
      c.fillText(nm === ft.name ? nm : nm + '…', x + 40, y + 66);
      c.textAlign = 'right'; c.font = font(800, 32, DISP); c.fillStyle = Y; c.fillText(ft.sim + '%', x + w - 24, y + 55);
    });
    c.textAlign = 'center'; c.font = font(800, 24); c.fillStyle = '#d3c0ee'; c.fillText(o.footer, W / 2, 1330);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  window.Charts = { radar, compass, shareImage };
})();
