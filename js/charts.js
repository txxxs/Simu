/* Visualisations : radar, boussole (SVG) et image de partage (canvas). */
(function () {
  const TAU = Math.PI * 2;
  const pt = (i, n, r, cx, cy) => { const a = -Math.PI / 2 + (i / n) * TAU; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const f = n => n.toFixed(1);

  function radar(vec, lang) {
    const N = vec.length, cx = 300, cy = 272, R = 150;
    let s = `<svg viewBox="0 0 600 544" role="img" aria-label="Radar" style="--cx:${cx}px;--cy:${cy}px">
      <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>`;
    [25, 50, 75, 100].forEach((l, k) => {
      const p = vec.map((_, i) => pt(i, N, R * l / 100, cx, cy).map(f).join(',')).join(' ');
      s += `<polygon points="${p}" class="ring r-in${l === 50 ? ' mid' : ''}" style="animation-delay:${k * 90}ms"/>`;
    });
    vec.forEach((_, i) => { const [x, y] = pt(i, N, R, cx, cy); s += `<line x1="${cx}" y1="${cy}" x2="${f(x)}" y2="${f(y)}" class="spoke r-in"/>`; });
    const poly = vec.map((v, i) => pt(i, N, R * v / 100, cx, cy).map(f).join(',')).join(' ');
    s += `<polygon points="${poly}" fill="url(#rg)" fill-opacity=".32" stroke="url(#rg)" stroke-width="2.5" stroke-linejoin="round" class="shape"/>`;
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

  function compass(vec, lang, labels) {
    const x0 = 40, y0 = 34, W = 240, mx = x0 + W / 2, my = y0 + W / 2;
    const dx = x0 + W * vec[0] / 100 - mx, dy = y0 + W * vec[2] / 100 - my;
    const q = (x, y, c) => `<rect x="${x}" y="${y}" width="${W / 2}" height="${W / 2}" fill="${c}"/>`;
    return `<svg viewBox="0 0 320 320" role="img" aria-label="Compass">
      <defs><clipPath id="cc"><rect x="${x0}" y="${y0}" width="${W}" height="${W}" rx="16"/></clipPath></defs>
      <g clip-path="url(#cc)">
        ${q(x0, y0, 'rgba(244,63,94,.20)')}${q(mx, y0, 'rgba(59,130,246,.20)')}${q(x0, my, 'rgba(34,197,94,.20)')}${q(mx, my, 'rgba(234,179,8,.20)')}
        <circle cx="${mx}" cy="${my}" r="${W / 4}" class="ring"/><circle cx="${mx}" cy="${my}" r="${W / 2 - 1}" class="ring"/>
        <line x1="${mx}" y1="${y0}" x2="${mx}" y2="${y0 + W}" class="ring mid"/><line x1="${x0}" y1="${my}" x2="${x0 + W}" y2="${my}" class="ring mid"/>
      </g>
      <rect x="${x0}" y="${y0}" width="${W}" height="${W}" rx="16" fill="none" class="ring"/>
      <text x="${mx}" y="22" text-anchor="middle" class="rl">${labels.auth}</text>
      <text x="${mx}" y="${y0 + W + 22}" text-anchor="middle" class="rl">${labels.lib}</text>
      <text x="${x0 - 12}" y="${my}" text-anchor="middle" class="rl" transform="rotate(-90 ${x0 - 12} ${my})">${labels.state}</text>
      <text x="${x0 + W + 14}" y="${my}" text-anchor="middle" class="rl" transform="rotate(90 ${x0 + W + 14} ${my})">${labels.market}</text>
      <g class="cdot" style="transform:translate(${f(dx)}px,${f(dy)}px)">
        <circle cx="${mx}" cy="${my}" r="18" fill="#8b5cf6" opacity=".35" class="pulse"/>
        <circle cx="${mx}" cy="${my}" r="9" fill="#fff" stroke="#8b5cf6" stroke-width="4.500"/>
      </g></svg>`;
  }

  /* ---------- Image de partage (1080 × 1350) ---------- */
  async function shareImage(canvas, o) {
    const W = 1080, H = 1350, c = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    const top = o.top.profile;
    const [topIco, ...rest] = await Promise.all([
      Icons.image(top.id, top.hue, 260),
      ...AXES.map(a => Icons.image(a.id, a.hue, 64)), ...o.rank.slice(0, 3).map(r => Icons.image(r.profile.id, r.profile.hue, 64)),
    ]);
    const axIco = rest.slice(0, 12), rkIco = rest.slice(12);
    const font = (w, s) => `${w} ${s}px Poppins, system-ui, -apple-system, "Segoe UI", sans-serif`;

    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a0e27'); g.addColorStop(1, '#1b1048');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    [[150, 180, 460, '#8b5cf6'], [1000, 560, 400, '#22d3ee'], [300, 1260, 460, '#ec4899']].forEach(([x, y, r, col]) => {
      const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col + '55'); rg.addColorStop(1, col + '00');
      c.fillStyle = rg; c.fillRect(0, 0, W, H);
    });

    // logo
    const lg = c.createLinearGradient(70, 50, 130, 110); lg.addColorStop(0, '#8b5cf6'); lg.addColorStop(1, '#22d3ee');
    c.fillStyle = lg; roundRect(c, 70, 52, 62, 62, 18); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 4.5; c.beginPath(); c.arc(101, 83, 19, 0, TAU); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(112, 72); c.lineTo(105, 87); c.lineTo(90, 94); c.lineTo(97, 79); c.closePath(); c.fill();
    c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = font(800, 50); c.fillText('Simu', 150, 99);
    c.font = font(500, 28); c.fillStyle = '#a5b0d6'; c.textAlign = 'right'; c.fillText(o.title, W - 70, 96);

    // courant
    const hue = top.hue;
    const gl = c.createRadialGradient(W / 2, 255, 0, W / 2, 255, 190); gl.addColorStop(0, `hsla(${hue},90%,60%,.5)`); gl.addColorStop(1, `hsla(${hue},90%,60%,0)`);
    c.fillStyle = gl; c.fillRect(W / 2 - 200, 60, 400, 400);
    c.fillStyle = `hsla(${hue},90%,60%,.16)`; roundRect(c, W / 2 - 80, 165, 160, 160, 48); c.fill();
    c.strokeStyle = `hsla(${hue},90%,72%,.5)`; c.lineWidth = 3; roundRect(c, W / 2 - 80, 165, 160, 160, 48); c.stroke();
    if (topIco) c.drawImage(topIco, W / 2 - 65, 180, 130, 130);
    c.textAlign = 'center'; c.fillStyle = '#fff'; c.font = font(800, 60); c.fillText(top.name[o.lang], W / 2, 398);
    c.font = font(600, 32); c.fillStyle = '#22d3ee'; c.fillText(o.matchText, W / 2, 446);

    // radar
    const cx = W / 2, cy = 790, R = 172, N = o.vec.length;
    [25, 50, 75, 100].forEach(l => {
      c.beginPath(); o.vec.forEach((_, i) => { const [x, y] = pt(i, N, R * l / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.closePath(); c.strokeStyle = l === 50 ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.12)'; c.lineWidth = 2; c.stroke();
    });
    c.beginPath(); o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    const rg2 = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R); rg2.addColorStop(0, '#a78bfa'); rg2.addColorStop(1, '#22d3ee');
    c.globalAlpha = .36; c.fillStyle = rg2; c.fill(); c.globalAlpha = 1; c.strokeStyle = rg2; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
    o.vec.forEach((v, i) => { const [x, y] = pt(i, N, R * v / 100, cx, cy); c.beginPath(); c.arc(x, y, 8, 0, TAU); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 4; c.strokeStyle = `hsl(${AXES[i].hue} 90% 66%)`; c.stroke(); });
    AXES.forEach((ax, i) => {
      const [bx, by] = pt(i, N, R + 50, cx, cy);
      c.fillStyle = `hsla(${ax.hue},90%,62%,.18)`; roundRect(c, bx - 28, by - 28, 56, 56, 17); c.fill();
      c.strokeStyle = `hsla(${ax.hue},90%,72%,.55)`; c.lineWidth = 2; roundRect(c, bx - 28, by - 28, 56, 56, 17); c.stroke();
      if (axIco[i]) c.drawImage(axIco[i], bx - 19, by - 19, 38, 38);
      c.font = font(500, 24); c.fillStyle = '#d6dcf5';
      const mid = Math.abs(bx - cx) < 12;
      if (mid) { c.textAlign = 'center'; c.fillText(ax.name[o.lang], bx, by < cy ? by - 40 : by + 58); }
      else if (bx > cx) { c.textAlign = 'left'; c.fillText(ax.name[o.lang], bx + 40, by + 8); }
      else { c.textAlign = 'right'; c.fillText(ax.name[o.lang], bx - 40, by + 8); }
    });

    // top 3
    o.rank.slice(0, 3).forEach((r, i) => {
      const y = 1160 + i * 56;
      c.fillStyle = `hsla(${r.profile.hue},90%,62%,.2)`; roundRect(c, 90, y - 34, 46, 46, 14); c.fill();
      if (rkIco[i]) c.drawImage(rkIco[i], 98, y - 26, 30, 30);
      c.textAlign = 'left'; c.font = font(600, 29); c.fillStyle = '#fff'; c.fillText(r.profile.name[o.lang], 152, y);
      c.fillStyle = 'rgba(255,255,255,.12)'; roundRect(c, 600, y - 24, 320, 20, 10); c.fill();
      c.fillStyle = `hsl(${r.profile.hue} 85% 62%)`; roundRect(c, 600, y - 24, Math.max(20, 320 * r.sim / 100), 20, 10); c.fill();
      c.textAlign = 'right'; c.fillStyle = '#fff'; c.font = font(700, 28); c.fillText(r.sim + '%', 990, y);
    });
    c.textAlign = 'center'; c.font = font(500, 25); c.fillStyle = '#7f89b3'; c.fillText(o.footer, W / 2, 1322);
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }

  window.Charts = { radar, compass, shareImage };
})();
