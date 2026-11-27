/* Visualisations : radar, boussole (SVG) et image de partage (canvas). */
(function () {
  const TAU = Math.PI * 2;
  const pt = (i, n, r, cx, cy) => {
    const a = -Math.PI / 2 + (i / n) * TAU;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const f = n => n.toFixed(1);

  function radar(vec, lang) {
    const N = vec.length, cx = 230, cy = 230, R = 135;
    let s = `<svg viewBox="0 0 460 460" role="img" aria-label="Radar">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>`;
    [25, 50, 75, 100].forEach(l => {
      const p = vec.map((_, i) => pt(i, N, R * l / 100, cx, cy).map(f).join(',')).join(' ');
      s += `<polygon points="${p}" class="ring${l === 50 ? ' mid' : ''}"/>`;
    });
    vec.forEach((_, i) => { const [x, y] = pt(i, N, R, cx, cy); s += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="spoke"/>`; });
    const poly = vec.map((v, i) => pt(i, N, R * v / 100, cx, cy).map(f).join(',')).join(' ');
    s += `<polygon points="${poly}" fill="url(#rg)" fill-opacity=".35" stroke="url(#rg)" stroke-width="2.5" stroke-linejoin="round" class="shape"/>`;
    vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); s += `<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="#fff" stroke="hsl(${AXES[i].hue} 90% 65%)" stroke-width="2.5"/>`; });
    AXES.forEach((ax, i) => {
      const [x, y] = pt(i, N, R + 30, cx, cy);
      const anchor = Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end';
      s += `<text x="${f(x)}" y="${f(y - 3)}" text-anchor="${anchor}" class="rl">${ax.icon} ${ax.name[lang]}</text>`;
    });
    return s + '</svg>';
  }

  function compass(vec, lang, labels) {
    const x0 = 36, y0 = 36, W = 248, x = x0 + W * vec[0] / 100, y = y0 + W * vec[2] / 100;
    return `<svg viewBox="0 0 320 320" role="img" aria-label="Compass">
      <rect x="${x0}" y="${y0}" width="${W / 2}" height="${W / 2}" fill="#ef4444" opacity=".14"/>
      <rect x="${x0 + W / 2}" y="${y0}" width="${W / 2}" height="${W / 2}" fill="#3b82f6" opacity=".14"/>
      <rect x="${x0}" y="${y0 + W / 2}" width="${W / 2}" height="${W / 2}" fill="#22c55e" opacity=".14"/>
      <rect x="${x0 + W / 2}" y="${y0 + W / 2}" width="${W / 2}" height="${W / 2}" fill="#eab308" opacity=".14"/>
      <rect x="${x0}" y="${y0}" width="${W}" height="${W}" fill="none" class="ring"/>
      <line x1="${x0 + W / 2}" y1="${y0}" x2="${x0 + W / 2}" y2="${y0 + W}" class="ring"/>
      <line x1="${x0}" y1="${y0 + W / 2}" x2="${x0 + W}" y2="${y0 + W / 2}" class="ring"/>
      <text x="160" y="22" text-anchor="middle" class="rl">⬆ ${labels.auth}</text>
      <text x="160" y="311" text-anchor="middle" class="rl">⬇ ${labels.lib}</text>
      <text x="${x0 - 8}" y="164" text-anchor="middle" class="rl" transform="rotate(-90 ${x0 - 8} 164)">${labels.state}</text>
      <text x="${x0 + W + 14}" y="164" text-anchor="middle" class="rl" transform="rotate(90 ${x0 + W + 14} 164)">${labels.market}</text>
      <circle cx="${f(x)}" cy="${f(y)}" r="16" fill="#8b5cf6" opacity=".3" class="pulse"/>
      <circle cx="${f(x)}" cy="${f(y)}" r="8" fill="#fff" stroke="#8b5cf6" stroke-width="4"/>
    </svg>`;
  }

  /* ---------- Image de partage (1080 × 1350) ---------- */
  function shareImage(canvas, o) {
    const W = 1080, H = 1350, c = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    const font = (w, s) => `${w} ${s}px Poppins, system-ui, -apple-system, "Segoe UI", sans-serif`;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0a0e27'); g.addColorStop(1, '#1b1048');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    [[150, 180, 420, '#8b5cf6'], [980, 520, 380, '#22d3ee'], [300, 1250, 420, '#ec4899']].forEach(([x, y, r, col]) => {
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, col + '55'); rg.addColorStop(1, col + '00');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
    });
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#fff'; c.font = font(800, 54); c.textAlign = 'left';
    c.fillText('🧭 Simu', 70, 100);
    c.font = font(500, 30); c.fillStyle = '#a5b0d6'; c.textAlign = 'right';
    c.fillText(o.title, W - 70, 98);

    // carte courant
    c.textAlign = 'center';
    c.font = font(400, 120); c.fillStyle = '#fff'; c.fillText(o.top.profile.emoji, W / 2, 270);
    c.font = font(800, 62); c.fillText(o.top.profile.name[o.lang], W / 2, 360);
    c.font = font(500, 32); c.fillStyle = '#22d3ee'; c.fillText(o.matchText, W / 2, 410);

    // radar
    const cx = W / 2, cy = 735, R = 215, N = o.vec.length;
    [25, 50, 75, 100].forEach(l => {
      c.beginPath();
      o.vec.forEach((_, i) => { const [x, y] = pt(i, N, R * l / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.strokeStyle = l === 50 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.stroke();
    });
    c.beginPath();
    o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    const rg2 = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    rg2.addColorStop(0, '#8b5cf6'); rg2.addColorStop(1, '#22d3ee');
    c.globalAlpha = .38; c.fillStyle = rg2; c.fill(); c.globalAlpha = 1;
    c.strokeStyle = rg2; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
    c.font = font(500, 25); c.fillStyle = '#d6dcf5';
    AXES.forEach((ax, i) => {
      const [x, y] = pt(i, N, R + 52, cx, cy);
      c.textAlign = Math.abs(x - cx) < 10 ? 'center' : x > cx ? 'left' : 'right';
      c.fillText(`${ax.icon} ${ax.name[o.lang]}`, x + (c.textAlign === 'left' ? -18 : c.textAlign === 'right' ? 18 : 0), y + 8);
    });

    // top 3
    c.textAlign = 'left';
    o.rank.slice(0, 3).forEach((r, i) => {
      const y = 1100 + i * 62;
      c.font = font(600, 29); c.fillStyle = '#fff';
      c.fillText(`${r.profile.emoji} ${r.profile.name[o.lang]}`, 90, y);
      c.fillStyle = 'rgba(255,255,255,.12)'; roundRect(c, 560, y - 26, 360, 22, 11); c.fill();
      c.fillStyle = `hsl(${r.profile.hue} 85% 62%)`; roundRect(c, 560, y - 26, Math.max(22, 360 * r.sim / 100), 22, 11); c.fill();
      c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = font(700, 28); c.fillText(r.sim + '%', 990, y); c.textAlign = 'left';
    });
    c.textAlign = 'center'; c.font = font(500, 26); c.fillStyle = '#7f89b3';
    c.fillText(o.footer, W / 2, 1310);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  window.Charts = { radar, compass, shareImage };
})();
