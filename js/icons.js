/* Jeu d'icônes maison (SVG, viewBox 48×48). Chaque icône = stroke (a) + remplissage doux (b). */
(function () {
  const st = (a, b) => `stroke="${a}" fill="${b}"`;
  const ln = a => `stroke="${a}" fill="none"`;
  const dot = (a, x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${a}" stroke="none"/>`;
  const stars = a => Array.from({ length: 12 }, (_, i) => {
    const t = i / 12 * Math.PI * 2; return dot(a, (24 + 16 * Math.cos(t)).toFixed(1), (24 + 16 * Math.sin(t)).toFixed(1), 2.4);
  }).join('');

  const I = {
    /* ----- axes ----- */
    eco:  (a, b) => `<rect x="7" y="28" width="8" height="13" rx="2" ${st(a, b)}/><rect x="20" y="20" width="8" height="21" rx="2" ${st(a, b)}/><rect x="33" y="14" width="8" height="27" rx="2" ${st(a, b)}/><path d="M7 19l10-8 7 4 13-10" ${ln(a)}/><path d="M30 5h7v7" ${ln(a)}/>`,
    soc:  (a, b) => `<path d="M24 41C9 30 6 20 11 13c4-5 11-3 13 2 2-5 9-7 13-2 5 7 2 17-13 28z" ${st(a, b)}/>`,
    lib:  (a, b) => `<rect x="10" y="22" width="28" height="20" rx="5" ${st(a, b)}/><path d="M16 22v-6a8 8 0 0 1 14.500-4.600" ${ln(a)}/>${dot(a, 24, 31, 2.800)}<path d="M24 33v4" ${ln(a)}/>`,
    nat:  (a, b) => `<path d="M11 5v38" ${ln(a)}/><path d="M11 9h26l-6 8 6 8H11z" ${st(a, b)}/>`,
    eur:  (a, b) => `<circle cx="24" cy="24" r="9" ${st(a, b)}/>${stars(a)}`,
    env:  (a, b) => `<path d="M8 40C6 20 18 8 41 7c1 22-9 35-33 33z" ${st(a, b)}/><path d="M8 40L28 19" ${ln(a)}/>`,
    imm:  (a, b) => `<circle cx="24" cy="24" r="17" ${st(a, b)}/><ellipse cx="24" cy="24" rx="7.500" ry="17" ${ln(a)}/><path d="M7 24h34M9.500 15h29M9.500 33h29" ${ln(a)}/>`,
    dem:  (a, b) => `<path d="M15 26V8h18v18" ${st(a, b)}/><path d="M20 16l3 3 6-7" ${ln(a)}/><path d="M7 26h34v12a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" ${st(a, b)}/><path d="M17 32h14" ${ln(a)}/>`,
    laic: (a, b) => `<path d="M5 18L24 6l19 12z" ${st(a, b)}/><path d="M11 23v14M19 23v14M29 23v14M37 23v14" ${ln(a)}/><path d="M5 42h38" ${ln(a)}/>`,
    jus:  (a, b) => `<path d="M24 7v33M15 41h18" ${ln(a)}/><path d="M8 13h32" ${ln(a)}/><path d="M8 13L3 27h10zM40 13l-5 14h10z" ${st(a, b)}/><path d="M3 27a5 4 0 0 0 10 0M35 27a5 4 0 0 0 10 0" ${ln(a)}/>${dot(a, 24, 8, 2.600)}`,
    fisc: (a, b) => `<circle cx="24" cy="24" r="18" ${st(a, b)}/><circle cx="17" cy="17" r="3.400" ${ln(a)}/><circle cx="31" cy="31" r="3.400" ${ln(a)}/><path d="M32 15L16 33" ${ln(a)}/>`,
    tech: (a, b) => `<rect x="11" y="11" width="26" height="26" rx="6" ${st(a, b)}/><rect x="18" y="18" width="12" height="12" rx="3" ${ln(a)}/><path d="M18 5v6M30 5v6M18 37v6M30 37v6M5 18h6M5 30h6M37 18h6M37 30h6" ${ln(a)}/>`,
    /* ----- courants ----- */
    'radical-left':       (a, b) => `<path d="M8 19h8l16-10v30L16 29H8z" ${st(a, b)}/><path d="M13 29l2 11h6l-2-11" ${ln(a)}/><path d="M38 17a10 10 0 0 1 0 14M42 12a17 17 0 0 1 0 24" ${ln(a)}/>`,
    'social-democrat':    (a, b) => `<path d="M24 25v18" ${ln(a)}/><path d="M24 36c-6 0-9-3-10-7 5 0 9 2 10 7z" ${st(a, b)}/>${[0, 1, 2, 3, 4].map(i => { const t = -Math.PI / 2 + i * 1.2566; return `<circle cx="${(24 + 7.5 * Math.cos(t)).toFixed(1)}" cy="${(15 + 7.5 * Math.sin(t)).toFixed(1)}" r="6.500" ${st(a, b)}/>`; }).join('')}<circle cx="24" cy="15" r="4" ${st(a, b)}/>`,
    green:                (a, b) => `<path d="M24 5c5 0 9 3.500 9 8 4 1 7 4.500 7 9 0 5-4.500 9-10 9H18c-5.500 0-10-4-10-9 0-4.500 3-8 7-9 0-4.500 4-8 9-8z" ${st(a, b)}/><path d="M24 31v12M24 38l-5-4M24 35l5-4" ${ln(a)}/>`,
    'centrist-liberal':   (a, b) => `<circle cx="17.500" cy="24" r="13" ${st(a, b)}/><circle cx="30.500" cy="24" r="13" ${st(a, b)}/>`,
    libertarian:          (a, b) => `<path d="M24 4c4 5 9 8 9 14a9 9 0 0 1-18 0c0-3 2-5 3-8 1 2 2 3.500 3.500 3.500C22 10 22 7 24 4z" ${st(a, b)}/><path d="M17 29h14l-2.500 14h-9z" ${st(a, b)}/><path d="M16 29h16" ${ln(a)}/>`,
    'christian-democrat': (a, b) => `<path d="M7 33c0-13 8-19 17-19s17 6 17 19z" ${st(a, b)}/><path d="M14 33V25M24 33V14M34 33V25" ${ln(a)}/><path d="M4 33h40M9 40h30" ${ln(a)}/>`,
    'conservative-right': (a, b) => `<circle cx="24" cy="9" r="4.500" ${st(a, b)}/><path d="M24 14v29M16 21h16" ${ln(a)}/><path d="M8 31c1 8 8 12 16 12s15-4 16-12" ${ln(a)}/><path d="M3 31l5 2 2-5M45 31l-5 2-2-5" ${ln(a)}/>`,
    sovereigntist:        (a, b) => `<path d="M9 43V11h6v5h5v-5h8v5h5v-5h6v32z" ${st(a, b)}/><path d="M19 43v-9a5 5 0 0 1 10 0v9" ${ln(a)}/><path d="M24 22v5" ${ln(a)}/>`,
    'national-populist':  (a, b) => `<circle cx="24" cy="14" r="6.500" ${st(a, b)}/><path d="M12 39c0-8 5-13 12-13s12 5 12 13z" ${st(a, b)}/><circle cx="8.500" cy="22" r="4" ${ln(a)}/><circle cx="39.500" cy="22" r="4" ${ln(a)}/><path d="M2 38c0-5 3-8 7-8M46 38c0-5-3-8-7-8" ${ln(a)}/>`,
    identitarian:         (a, b) => `<path d="M24 5l16 5.500V22c0 10-7 17-16 21C15 39 8 32 8 22V10.500z" ${st(a, b)}/><path d="M24 14l8 3v6c0 5-3.500 9-8 11-4.500-2-8-6-8-11v-6z" ${ln(a)}/>`,
    anarchist:            (a, b) => `<circle cx="24" cy="24" r="18.500" ${st(a, b)}/><path d="M14.500 35.500L24 12l9.500 23.500" ${ln(a)}/><path d="M18 28.500h12" ${ln(a)}/>`,
    /* ----- interface ----- */
    bolt:     (a) => `<path d="M27 4L11 27h11l-3 17 18-25H26z" ${ln(a)}/>`,
    layers:   (a) => `<path d="M24 6l18 10-18 10L6 16z" ${ln(a)}/><path d="M6 25l18 10 18-10M6 33l18 10 18-10" ${ln(a)}/>`,
    lock:     (a) => `<rect x="10" y="21" width="28" height="21" rx="5" ${ln(a)}/><path d="M16 21v-5a8 8 0 0 1 16 0v5" ${ln(a)}/>${dot(a, 24, 31, 2.800)}`,
    image:    (a) => `<rect x="5" y="8" width="38" height="32" rx="7" ${ln(a)}/><circle cx="16" cy="19" r="3.500" ${ln(a)}/><path d="M5 34l12-10 9 8 6-5 11 9" ${ln(a)}/>`,
    link:     (a) => `<path d="M20 28a8 8 0 0 0 11 0l7-7a8 8 0 0 0-11-11l-3 3" ${ln(a)}/><path d="M28 20a8 8 0 0 0-11 0l-7 7a8 8 0 0 0 11 11l3-3" ${ln(a)}/>`,
    refresh:  (a) => `<path d="M40 24a16 16 0 1 1-5-11.500" ${ln(a)}/><path d="M38 5v8h-8" ${ln(a)}/>`,
    check:    (a) => `<path d="M10 25l9 9 19-20" ${ln(a)}/>`,
    back:     (a) => `<path d="M30 10L16 24l14 14" ${ln(a)}/>`,
    next:     (a) => `<path d="M18 10l14 14-14 14" ${ln(a)}/>`,
    close:    (a) => `<path d="M12 12l24 24M36 12L12 36" ${ln(a)}/>`,
    skip:     (a) => `<path d="M10 12l16 12-16 12zM34 12v24" ${ln(a)}/>`,
  };

  const colors = (hue, mono) => mono ? ['currentColor', 'none'] : [`hsl(${hue} 92% 74%)`, `hsla(${hue},92%,62%,.26)`];

  function inner(name, hue, mono) { const [a, b] = colors(hue, mono); return (I[name] || I.check)(a, b); }

  /** SVG en ligne. */
  function svg(name, o = {}) {
    const size = o.size || 24, sw = o.sw || (size < 30 ? 3.4 : 2.7);
    return `<svg class="ico ${o.cls || ''}" viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner(name, o.hue == null ? 220 : o.hue, o.mono)}</svg>`;
  }
  /** SVG imbriqué (pour insertion dans un autre <svg>). */
  function nested(name, hue, x, y, size) {
    return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${inner(name, hue)}</svg>`;
  }
  /** Image (canvas / favicon). */
  function image(name, hue, size) {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">${inner(name, hue)}</svg>`;
    return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); });
  }
  /** Pastille colorée contenant l'icône. */
  function badge(name, hue, size = 40) {
    return `<span class="bico" style="--h:${hue};--z:${size}px">${svg(name, { hue, size: Math.round(size * .62) })}</span>`;
  }
  /** Logo boussole (aiguille animable). */
  function logo(size = 24) {
    return `<svg class="logo-svg" viewBox="0 0 48 48" width="${size}" height="${size}" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="17" stroke="#fff" stroke-width="3"/>
      <path d="M24 4v5M24 39v5M4 24h5M39 24h5" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <g class="needle"><path d="M31 17l-5 10-10 5 5-10z" fill="#fff"/><circle cx="24" cy="24" r="2.400" fill="#7c3aed"/></g></svg>`;
  }
  window.Icons = { svg, nested, image, badge, logo, has: n => !!I[n] };
})();
