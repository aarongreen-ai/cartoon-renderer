// Sets and props. World units = pixels at camera zoom 1 in a 1080x1920 frame.
// Floor line (where feet stand) is FLOOR. Sets are drawn from x=-320 to x=1400 so the camera can pan.
(function () {
  const OL = '#2a2730', W = 4;
  const FLOOR = 1560;
  const X0 = -320, X1 = 1400, WW = X1 - X0;
  const sh = (h, f) => window.Rig.shade(h, f);
  const st = (w) => `stroke="${OL}" stroke-width="${w || W}" stroke-linejoin="round"`;
  const rect = (x, y, w, h, fill, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${st()} ${extra || ''}/>`;
  const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // seeded rng
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- reusable pieces
  function woodFloor(c) {
    c = c || '#e3c497';
    let s = `<rect x="${X0}" y="${FLOOR - 40}" width="${WW}" height="${1920 - FLOOR + 80}" fill="${c}"/>`;
    for (let y = FLOOR - 10; y < 1960; y += 46) s += `<path d="M${X0} ${y} H${X1}" stroke="${sh(c, -0.14)}" stroke-width="3"/>`;
    const r = rng(7);
    for (let y = FLOOR - 10, i = 0; y < 1960; y += 46, i++) for (let x = X0 + (i % 2) * 120; x < X1; x += 240 + Math.floor(r() * 60)) s += `<path d="M${x} ${y} v46" stroke="${sh(c, -0.14)}" stroke-width="3"/>`;
    return s + `<path d="M${X0} ${FLOOR - 40} H${X1}" stroke="${OL}" stroke-width="${W}"/>`;
  }
  function tileFloor(c1, c2) {
    let s = `<rect x="${X0}" y="${FLOOR - 40}" width="${WW}" height="420" fill="${c1}"/>`;
    for (let y = FLOOR - 40, i = 0; y < 1960; y += 70, i++) for (let x = X0 + (i % 2) * 70; x < X1; x += 140) s += `<rect x="${x}" y="${y}" width="70" height="70" fill="${c2}"/>`;
    return s + `<path d="M${X0} ${FLOOR - 40} H${X1}" stroke="${OL}" stroke-width="${W}"/>`;
  }
  function wall(c, y1) { return `<rect x="${X0}" y="-200" width="${WW}" height="${(y1 || FLOOR - 40) + 200}" fill="${c}"/>`; }
  function windowSky(x, y, w, h, opt) {
    opt = opt || {};
    const night = opt.night;
    let s = `<g><rect x="${x - 14}" y="${y - 14}" width="${w + 28}" height="${h + 28}" rx="6" fill="#ffffff" ${st()}/>`;
    s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${night ? '#1d2a55' : '#9fd8f5'}" ${st()}/>`;
    if (!night) s += `<circle cx="${x + w * 0.78}" cy="${y + h * 0.28}" r="${Math.min(w, h) * 0.14}" fill="#ffe27a"/><path d="M${x} ${y + h * 0.78} Q${x + w * 0.3} ${y + h * 0.6} ${x + w * 0.55} ${y + h * 0.75} T${x + w} ${y + h * 0.7} V${y + h} H${x} Z" fill="#7cc576"/>` +
      `<circle cx="${x + w * 0.25}" cy="${y + h * 0.55}" r="${h * 0.2}" fill="#4f9e4c" ${st(3)}/><rect x="${x + w * 0.24}" y="${y + h * 0.7}" width="10" height="${h * 0.3}" fill="#7a5233"/>`;
    else s += `<circle cx="${x + w * 0.75}" cy="${y + h * 0.3}" r="${Math.min(w, h) * 0.12}" fill="#f4f1d0"/>` + [0.2, 0.4, 0.15, 0.55].map((f, i) => `<circle cx="${x + w * f + i * 20}" cy="${y + h * (0.2 + i * 0.12)}" r="3" fill="#fff"/>`).join('');
    s += `<path d="M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}" stroke="#ffffff" stroke-width="12"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" ${st()}/>`;
    return s + '</g>';
  }
  function frame(x, y, w, h, inner) {
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f6efe0" ${st()}/><rect x="${x + 10}" y="${y + 10}" width="${w - 20}" height="${h - 20}" fill="${inner || '#a8d4c9'}" ${st(3)}/></g>`;
  }
  function plant(x, y, s) {
    s = s || 1;
    return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 0 L-32 -70 L32 -70 L40 0 Z" fill="#d8744a" ${st()}/><path d="M0 -70 Q-70 -120 -60 -190 Q-10 -150 0 -70 Q10 -170 50 -200 Q60 -120 0 -70 Q60 -110 90 -120 Q70 -70 0 -70" fill="#4e9f57" ${st()}/></g>`;
  }
  function door(x, y, w, h, c, opt) {
    opt = opt || {};
    let s = `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 12}" fill="#f6f2ea" ${st()}/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c || '#8a5a3c'}" ${st()}/>`;
    if (!opt.plain) s += `<rect x="${x + 22}" y="${y + 24}" width="${w - 44}" height="${h * 0.36}" fill="${sh(c || '#8a5a3c', -0.12)}" ${st(3)}/><rect x="${x + 22}" y="${y + h * 0.48}" width="${w - 44}" height="${h * 0.44}" fill="${sh(c || '#8a5a3c', -0.12)}" ${st(3)}/>`;
    if (opt.glass) s += `<rect x="${x + 22}" y="${y + 24}" width="${w - 44}" height="${h * 0.45}" fill="#bfe6f7" ${st(3)}/>`;
    s += `<circle cx="${x + w - 24}" cy="${y + h * 0.52}" r="9" fill="#f0c34a" ${st(3)}/>`;
    return s;
  }
  function sign(x, y, w, h, text, bg, fg, opt) {
    opt = opt || {};
    const fs = opt.fs || Math.min(h * 0.62, (w * 1.7) / Math.max(4, String(text).length));
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${opt.r || 10}" fill="${bg || '#c0392b'}" ${st(5)}/>` +
      `<text x="${x + w / 2}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" font-family="${opt.font || 'Archivo Black'}" font-size="${fs}" fill="${fg || '#fff'}">${esc(text)}</text></g>`;
  }
  function logoImg(x, y, w) { return `<image href="assets/logo.png" x="${x}" y="${y}" width="${w}" height="${w * 0.913}"/>`; }
  function shelfItems(x, y, w, seed, palette) {
    const r = rng(seed); let s = ''; let cx = x;
    palette = palette || ['#e2584d', '#f2b440', '#4b8fd6', '#6dbb6a', '#b06ad1', '#f08a5d'];
    while (cx < x + w - 30) {
      const bw = 28 + r() * 34, bh = 50 + r() * 50;
      s += `<rect x="${cx}" y="${y - bh}" width="${bw}" height="${bh}" rx="4" fill="${palette[Math.floor(r() * palette.length)]}" ${st(3)}/>`;
      cx += bw + 6;
    }
    return s;
  }
  function tree(x, y, s, c) {
    c = c || '#4f9e4c';
    return `<g transform="translate(${x} ${y}) scale(${s || 1})"><rect x="-18" y="-220" width="36" height="220" fill="#7a5233" ${st()}/><circle cx="0" cy="-300" r="120" fill="${c}" ${st()}/><circle cx="-70" cy="-240" r="80" fill="${c}" ${st()}/><circle cx="80" cy="-240" r="80" fill="${c}" ${st()}/><path d="M-90 -250 Q-60 -200 -20 -230 M40 -330 Q70 -300 100 -320" stroke="${sh(c, -0.2)}" stroke-width="6" fill="none"/></g>`;
  }
  function fence(y, c) {
    c = c || '#ffffff'; let s = `<rect x="${X0}" y="${y - 160}" width="${WW}" height="26" fill="${c}" ${st()}/><rect x="${X0}" y="${y - 70}" width="${WW}" height="26" fill="${c}" ${st()}/>`;
    for (let x = X0; x < X1; x += 56) s += `<path d="M${x} ${y} V${y - 200} L${x + 21} ${y - 225} L${x + 42} ${y - 200} V${y} Z" fill="${c}" ${st()}/>`;
    return s;
  }
  function house(x, y, w, h, c, roof, opt) {
    opt = opt || {};
    let s = `<g><path d="M${x - 40} ${y - h} L${x + w / 2} ${y - h - h * 0.45} L${x + w + 40} ${y - h} Z" fill="${roof || '#7b4b3a'}" ${st()}/>` +
      `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${c || '#f1e3c6'}" ${st()}/>`;
    for (let yy = y - h + 30; yy < y; yy += 36) s += `<path d="M${x} ${yy} H${x + w}" stroke="${sh(c || '#f1e3c6', -0.08)}" stroke-width="3"/>`;
    s += door(x + w * 0.42, y - h * 0.55, w * 0.16, h * 0.55, opt.door || '#c0574a');
    s += windowSky(x + w * 0.1, y - h * 0.75, w * 0.2, h * 0.3, { night: opt.night }) + windowSky(x + w * 0.7, y - h * 0.75, w * 0.2, h * 0.3, { night: opt.night });
    if (opt.number) s += `<text x="${x + w * 0.5}" y="${y - h * 0.6}" text-anchor="middle" font-family="Archivo Black" font-size="26" fill="${OL}">${esc(opt.number)}</text>`;
    return s + '</g>';
  }
  function sky(night, y1) {
    const c1 = night ? '#18224a' : '#8fd0f2', c2 = night ? '#2f3f78' : '#d6f0fb';
    return `<defs><linearGradient id="skyg${night ? 'n' : 'd'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
      `<rect x="${X0}" y="-200" width="${WW}" height="${(y1 || 1200) + 200}" fill="url(#skyg${night ? 'n' : 'd'})"/>` +
      (night ? [80, 300, 520, 760, 980, 1200, -150].map((x, i) => `<circle cx="${x}" cy="${120 + (i % 3) * 90}" r="4" fill="#fff"/>`).join('') + `<circle cx="860" cy="260" r="60" fill="#f4f1d0"/>`
        : `<g fill="#fff" ${st(3)}><path d="M60 300 q20 -50 70 -40 q30 -40 80 -10 q50 0 40 50 Z"/><path d="M700 200 q20 -50 70 -40 q30 -40 80 -10 q50 0 40 50 Z"/></g>`);
  }

  // ---------- SETS. Each returns an SVG string. o = options from the season bible (colors, sign text, night)
  const SETS = {
    blank(o) {
      const c = o.wall || '#f6ecd9';
      return wall(c) + `<rect x="${X0}" y="${FLOOR - 40}" width="${WW}" height="420" fill="${o.floor || '#e9d3ad'}"/><path d="M${X0} ${FLOOR - 40} H${X1}" stroke="${sh(o.floor || '#e9d3ad', -0.15)}" stroke-width="6"/>`;
    },
    kitchen(o) {
      const cab = o.accent || '#3f6b3c', wl = o.wall || '#f4eee2';
      let s = wall(wl);
      // tiles backsplash
      for (let y = 760; y < 1180; y += 40) for (let x = X0 + ((y / 40) % 2) * 40; x < X1; x += 80) s += `<rect x="${x}" y="${y}" width="80" height="40" fill="#ffffff" stroke="#d9d4ca" stroke-width="2"/>`;
      // upper cabinets
      [[-300, 380], [90, 380], [860, 380]].forEach(([x, w]) => {
        s += rect(x, 420, w, 300, cab);
        for (let k = 0; k < w; k += w / 2) s += rect(x + k + 14, 438, w / 2 - 28, 264, sh(cab, 0.1)) + `<rect x="${x + k + w / 2 - 34}" y="640" width="10" height="44" rx="4" fill="#d8c08a" ${st(2)}/>`;
      });
      s += windowSky(500, 450, 300, 260);
      // counter
      s += rect(X0, 1180, WW, 36, '#d9d2c4') + rect(X0, 1216, WW, 304, cab);
      for (let x = X0 + 20; x < X1; x += 200) s += rect(x, 1240, 176, 250, sh(cab, 0.08)) + `<rect x="${x + 70}" y="1260" width="36" height="10" rx="4" fill="#d8c08a" ${st(2)}/>`;
      // sink + faucet
      s += `<path d="M600 1180 V1100 Q600 1060 640 1060 H680 V1080" fill="none" stroke="${OL}" stroke-width="18" stroke-linecap="round"/><path d="M600 1180 V1100 Q600 1060 640 1060 H680 V1080" fill="none" stroke="#c9ced6" stroke-width="10" stroke-linecap="round"/>`;
      // stove
      s += rect(-200, 1180, 300, 340, '#e6e7ea') + rect(-180, 1290, 260, 190, '#3a3d45') + [-160, -100, -40, 20].map((x) => `<circle cx="${x + 15}" cy="1225" r="13" fill="#d94b3d" ${st(3)}/>`).join('');
      s += `<rect x="-190" y="1160" width="280" height="20" fill="#2f3138" ${st()}/>`;
      // fridge
      s += rect(1060, 700, 260, 820, '#e9ecef', 'rx="16"') + `<path d="M1060 1000 H1320" stroke="${OL}" stroke-width="${W}"/><rect x="1080" y="820" width="12" height="120" rx="5" fill="#b8bec7" ${st(2)}/><rect x="1080" y="1040" width="12" height="160" rx="5" fill="#b8bec7" ${st(2)}/>`;
      s += `<g transform="rotate(-4 1200 880)">${frame(1150, 820, 110, 130, '#f3c6c6')}</g>`;
      // cereal box + plant + shelf
      s += `<g transform="translate(920 1180)"><rect x="0" y="-150" width="96" height="150" fill="#f2c542" ${st()}/><text x="48" y="-110" text-anchor="middle" font-family="Archivo Black" font-size="20" fill="#b03a2e">CEREAL</text><circle cx="48" cy="-60" r="26" fill="#fff" ${st(3)}/></g>`;
      s += plant(380, 1180, 0.7);
      s += woodFloor(o.floor);
      return s;
    },
    living(o) {
      const wl = o.wall || '#e9d9f0', ac = o.accent || '#d86a5a';
      let s = wall(wl) + `<rect x="${X0}" y="1300" width="${WW}" height="220" fill="${sh(wl, -0.06)}"/><path d="M${X0} 1300 H${X1}" stroke="${OL}" stroke-width="3"/>`;
      s += windowSky(-200, 520, 300, 380) + windowSky(1000, 520, 300, 380);
      s += frame(300, 560, 200, 150, '#f3d38a') + frame(560, 520, 160, 200, '#a8c8f0');
      // lamp
      s += `<path d="M880 1520 V1080" stroke="${OL}" stroke-width="10"/><path d="M820 1080 L940 1080 L910 980 L850 980 Z" fill="#f6d77a" ${st()}/><ellipse cx="880" cy="1520" rx="50" ry="10" fill="${OL}"/>`;
      // sofa
      s += `<g><rect x="160" y="1180" width="600" height="200" rx="40" fill="${ac}" ${st()}/><rect x="120" y="1260" width="100" height="220" rx="30" fill="${sh(ac, -0.1)}" ${st()}/><rect x="700" y="1260" width="100" height="220" rx="30" fill="${sh(ac, -0.1)}" ${st()}/><rect x="200" y="1320" width="540" height="140" rx="20" fill="${sh(ac, 0.1)}" ${st()}/><path d="M470 1330 V1450" stroke="${OL}" stroke-width="3"/></g>`;
      s += plant(-40, 1520, 1.2);
      s += woodFloor(o.floor || '#c99a6b') + `<ellipse cx="470" cy="1640" rx="420" ry="70" fill="${sh(ac, 0.35)}" ${st()}/>`;
      return s;
    },
    bedroom(o) {
      const wl = o.wall || '#d9e8f5', ac = o.accent || '#5a7fc4';
      let s = wall(wl) + windowSky(640, 480, 300, 340, { night: o.night });
      s += `<g><rect x="-60" y="1080" width="40" height="440" fill="#8a5a3c" ${st()}/><rect x="-60" y="1300" width="620" height="140" fill="${ac}" ${st()}/><rect x="-40" y="1240" width="160" height="70" rx="30" fill="#fff" ${st()}/><path d="M140 1300 Q340 1260 560 1300 L560 1440 L140 1440 Z" fill="${sh(ac, 0.15)}" ${st()}/><rect x="540" y="1250" width="30" height="270" fill="#8a5a3c" ${st()}/></g>`;
      s += `<rect x="980" y="1180" width="180" height="340" fill="#c9a27a" ${st()}/><rect x="1000" y="1200" width="140" height="140" fill="${sh('#c9a27a', -0.1)}" ${st(3)}/><rect x="1000" y="1360" width="140" height="140" fill="${sh('#c9a27a', -0.1)}" ${st(3)}/>`;
      s += frame(250, 600, 220, 170, '#f7c0c0');
      s += woodFloor(o.floor || '#d6b88c');
      return s;
    },
    office(o) {
      const wl = o.wall || '#e6ebef', ac = o.accent || '#4a6fa5';
      let s = wall(wl) + windowSky(-260, 420, 360, 460) + windowSky(940, 420, 360, 460);
      s += sign(260, 480, 520, 120, o.sign || 'MEETING ROOM', ac, '#fff', { fs: 52 });
      s += `<rect x="160" y="1240" width="760" height="30" fill="#b98a5e" ${st()}/><rect x="200" y="1270" width="24" height="250" fill="#8a6545" ${st()}/><rect x="856" y="1270" width="24" height="250" fill="#8a6545" ${st()}/>`;
      s += `<g transform="translate(420 1240)"><rect x="-80" y="-130" width="160" height="110" rx="8" fill="#2f3440" ${st()}/><rect x="-70" y="-120" width="140" height="90" fill="#8fd0f2"/><rect x="-100" y="-20" width="200" height="20" rx="6" fill="#c9ced6" ${st()}/></g>`;
      s += `<g transform="translate(720 1240)"><rect x="-30" y="-60" width="50" height="60" rx="6" fill="#fff" ${st()}/><path d="M20 -45 q20 0 20 18 q0 18 -20 18" fill="none" stroke="${OL}" stroke-width="5"/></g>`;
      s += plant(1060, 1520, 1.3);
      s += tileFloor('#c9cfd6', '#bfc6ce');
      return s;
    },
    shop(o) { // store interior with counter + shelves; o.sign = store name
      const wl = o.wall || '#f7e8d0', ac = o.accent || '#c0392b';
      let s = wall(wl);
      s += sign(160, 300, 760, 150, o.sign || 'THE SHOP', ac, '#fff');
      [560, 800, 1040].forEach((y) => { s += `<rect x="${X0 + 20}" y="${y}" width="420" height="20" fill="#8a5a3c" ${st()}/>` + shelfItems(X0 + 40, y, 380, y) + `<rect x="${X1 - 440}" y="${y}" width="420" height="20" fill="#8a5a3c" ${st()}/>` + shelfItems(X1 - 420, y, 380, y + 9); });
      // hat rack with our products
      s += `<g transform="translate(540 1180)"><rect x="-6" y="-560" width="12" height="560" fill="#8a5a3c" ${st(3)}/></g>`;
      s += `<rect x="120" y="1200" width="840" height="320" fill="${sh(ac, 0.1)}" ${st()}/><rect x="100" y="1170" width="880" height="40" fill="#e3c497" ${st()}/><rect x="140" y="1240" width="800" height="240" fill="none" stroke="${sh(ac, -0.2)}" stroke-width="6"/>`;
      s += `<g transform="translate(820 1170)"><rect x="-70" y="-90" width="140" height="90" rx="8" fill="#5c6270" ${st()}/><rect x="-55" y="-78" width="110" height="40" fill="#9be59b" ${st(3)}/></g>`;
      s += logoImg(240, 1250, 200);
      s += tileFloor('#efe3cf', '#e2d1b6');
      return s;
    },
    restaurant(o) { // diner / pizzeria / burger joint interior
      const wl = o.wall || '#b8483b', ac = o.accent || '#2f7d4f';
      let s = wall(wl);
      for (let y = 200; y < 1200; y += 50) for (let x = X0 + ((y / 50) % 2) * 50; x < X1; x += 100) s += `<rect x="${x}" y="${y}" width="96" height="46" fill="${sh(wl, -0.06)}" stroke="${sh(wl, -0.2)}" stroke-width="2"/>`;
      s += sign(220, 250, 640, 130, o.sign || 'SINCE 1987', '#2b2b30', '#f4d35e');
      s += `<rect x="200" y="420" width="680" height="300" fill="#2b2b30" ${st()}/>` + ['MENU', '', ''].map((t, i) => '').join('');
      const items = o.menu || ['BURGER 9', 'FRIES 4', 'SHAKE 6', 'COMBO 15'];
      items.slice(0, 4).forEach((t, i) => { s += `<text x="${240 + (i % 2) * 330}" y="${520 + Math.floor(i / 2) * 110}" font-family="Oswald" font-weight="700" font-size="46" fill="#ffffff">${esc(t)}</text>`; });
      s += `<rect x="${X0}" y="1160" width="${WW}" height="40" fill="#d9d2c4" ${st()}/><rect x="${X0}" y="1200" width="${WW}" height="320" fill="#f2f2f2" ${st()}/>`;
      for (let x = X0; x < X1; x += 80) s += `<rect x="${x}" y="1200" width="40" height="320" fill="${ac}"/>`;
      s += `<path d="M${X0} 1200 H${X1}" stroke="${OL}" stroke-width="${W}"/>`;
      s += tileFloor('#ffffff', '#c23b3b');
      return s;
    },
    backyard(o) {
      let s = sky(o.night, 1200);
      s += house(-300, 1180, 620, 520, o.wall || '#f1e3c6', o.accent || '#7b4b3a', { night: o.night });
      s += tree(1150, 1150, 1.2);
      s += fence(1260, '#ffffff');
      // grass with stripes
      s += `<rect x="${X0}" y="1250" width="${WW}" height="800" fill="#59b84f"/>`;
      for (let x = X0; x < X1; x += 160) s += `<path d="M${x} 1250 L${x + 80} 1250 L${x + 260} 2000 L${x + 180} 2000 Z" fill="#62c457"/>`;
      s += `<path d="M${X0} 1250 H${X1}" stroke="${OL}" stroke-width="${W}"/>`;
      if (o.patio !== false) s += `<path d="M320 1380 L900 1380 L1000 1600 L220 1600 Z" fill="#cfc8bd" ${st()}/>` + [1430, 1480, 1540].map((y) => `<path d="M${300 - (y - 1380) * 0.4} ${y} H${920 + (y - 1380) * 0.45}" stroke="#b5ada1" stroke-width="3"/>`).join('');
      return s;
    },
    street(o) { // storefront exterior, o.sign. Building base at 1380, sidewalk to 1660, road below
      let s = sky(o.night, 1300);
      const c = o.wall || '#e7d3b4', ac = o.accent || '#c0392b';
      s += `<rect x="${X0}" y="260" width="${WW}" height="1120" fill="${c}" ${st()}/>`;
      for (let y = 300; y < 1380; y += 44) for (let x = X0 + ((y / 44) % 2) * 50; x < X1; x += 100) s += `<rect x="${x}" y="${y}" width="98" height="42" fill="none" stroke="${sh(c, -0.12)}" stroke-width="2"/>`;
      s += sign(40, 300, 1000, 170, o.sign || 'GRAND OPENING', ac, '#fff');
      s += `<path d="M20 500 H1060 L1100 600 H-20 Z" fill="#fff" ${st()}/>`;
      for (let x = -20, i = 0; x < 1100; x += 80, i++) if (i % 2 === 0) s += `<path d="M${x + 40} 500 H${x + 80} L${x + 120} 600 H${x + 40} Z" fill="${ac}"/>`;
      s += `<path d="M-20 600 H1100" stroke="${OL}" stroke-width="${W}"/>`;
      s += `<rect x="40" y="640" width="440" height="560" fill="#bfe6f7" ${st()}/><rect x="40" y="1200" width="440" height="180" fill="${sh(c, -0.1)}" ${st()}/><path d="M80 640 L240 1200 M330 640 L470 1150" stroke="#fff" stroke-width="18" opacity="0.6"/>`;
      s += door(600, 640, 260, 740, '#2f5d8a', { glass: true });
      s += plant(960, 1380, 1.3);
      s += `<rect x="${X0}" y="1380" width="${WW}" height="280" fill="#d6d1c8" ${st()}/>`;
      for (let x = X0; x < X1; x += 200) s += `<path d="M${x} 1380 L${x - 40} 1660" stroke="#bdb6ab" stroke-width="3"/>`;
      s += `<rect x="${X0}" y="1660" width="${WW}" height="400" fill="#55565c"/><rect x="${X0}" y="1650" width="${WW}" height="16" fill="#9a958c" ${st(3)}/>`;
      for (let x = X0; x < X1; x += 160) s += `<rect x="${x}" y="1820" width="90" height="16" fill="#f2d35b"/>`;
      return s;
    },
    park(o) {
      let s = sky(o.night, 1300);
      s += tree(-120, 1320, 1.4, '#4f9e4c') + tree(1200, 1300, 1.2, '#5aa955') + tree(560, 1250, 0.8, '#6cb865');
      s += `<rect x="${X0}" y="1250" width="${WW}" height="800" fill="#6cc25f"/><path d="M${X0} 1250 H${X1}" stroke="${OL}" stroke-width="${W}"/>`;
      s += `<path d="M300 1250 Q540 1400 400 2000 L800 2000 Q760 1400 620 1250 Z" fill="#e3cf9f" ${st()}/>`;
      s += `<g transform="translate(900 1420)"><rect x="-150" y="-70" width="300" height="24" rx="6" fill="#b5764a" ${st()}/><rect x="-150" y="-130" width="300" height="24" rx="6" fill="#b5764a" ${st()}/><rect x="-130" y="-46" width="16" height="70" fill="${OL}"/><rect x="114" y="-46" width="16" height="70" fill="${OL}"/></g>`;
      return s;
    },
    garage(o) {
      const wl = o.wall || '#cfd5db';
      let s = wall(wl) + `<rect x="${X0}" y="300" width="${WW}" height="80" fill="${sh(wl, -0.1)}"/>`;
      s += `<rect x="-200" y="700" width="500" height="380" fill="#9aa3ad" ${st()}/>` + [760, 840, 920, 1000].map((y) => `<path d="M-200 ${y} H300" stroke="#7e8790" stroke-width="4"/>`).join('');
      s += `<rect x="600" y="620" width="600" height="40" fill="#8a5a3c" ${st()}/>` + shelfItems(620, 620, 560, 3, ['#c0392b', '#7f8c8d', '#e67e22', '#34495e']);
      s += `<rect x="600" y="860" width="600" height="40" fill="#8a5a3c" ${st()}/>` + shelfItems(620, 860, 560, 11, ['#16a085', '#7f8c8d', '#d35400', '#2c3e50']);
      s += `<rect x="560" y="1200" width="680" height="40" fill="#b98a5e" ${st()}/><rect x="600" y="1240" width="30" height="280" fill="#8a6545" ${st()}/><rect x="1170" y="1240" width="30" height="280" fill="#8a6545" ${st()}/>`;
      s += `<rect x="${X0}" y="1520" width="${WW}" height="500" fill="#a7aaae"/><path d="M${X0} 1520 H${X1}" stroke="${OL}" stroke-width="${W}"/><ellipse cx="200" cy="1700" rx="160" ry="30" fill="#8c8f93"/>`;
      return s;
    },
  };

  // ---------- PROPS (drawn with base at y=0, centered x=0, in world px at character scale ~0.52)
  const PROPS = {
    grill: (o) => `<g><path d="M-70 0 L-40 -180 M70 0 L40 -180" stroke="${OL}" stroke-width="10"/><path d="M-110 -180 Q-110 -80 0 -80 Q110 -80 110 -180 Z" fill="${o.color || '#2f3138'}" ${st()}/><path d="M-110 -180 Q-110 -290 0 -290 Q110 -290 110 -180 Z" fill="${sh(o.color || '#2f3138', 0.15)}" ${st()}/><rect x="-16" y="-305" width="32" height="18" rx="6" fill="#999" ${st(3)}/>${o.smoke ? '<g fill="#ddd" opacity="0.8"><circle cx="-10" cy="-340" r="22"/><circle cx="20" cy="-380" r="28"/><circle cx="-6" cy="-430" r="34"/></g>' : ''}</g>`,
    table: (o) => `<g><rect x="-160" y="-190" width="320" height="26" rx="6" fill="${o.color || '#b98a5e'}" ${st()}/><rect x="-140" y="-164" width="20" height="164" fill="${sh(o.color || '#b98a5e', -0.2)}" ${st()}/><rect x="120" y="-164" width="20" height="164" fill="${sh(o.color || '#b98a5e', -0.2)}" ${st()}/></g>`,
    chair: (o) => `<g><rect x="-50" y="-280" width="100" height="160" rx="10" fill="${o.color || '#ffffff'}" ${st()}/><rect x="-56" y="-130" width="112" height="20" fill="${o.color || '#ffffff'}" ${st()}/><path d="M-46 -110 L-50 0 M46 -110 L50 0" stroke="${OL}" stroke-width="10"/></g>`,
    box: (o) => `<g><rect x="-70" y="-120" width="140" height="120" fill="#c99a62" ${st()}/><path d="M-70 -120 L-90 -150 L50 -150 L70 -120 M-16 -120 V-60 H16 V-120" fill="none" stroke="${OL}" stroke-width="3"/>${o.text ? `<text x="0" y="-40" text-anchor="middle" font-family="Archivo Black" font-size="20" fill="${OL}">${esc(o.text)}</text>` : ''}</g>`,
    sign: (o) => `<g><rect x="-6" y="-200" width="12" height="200" fill="#8a5a3c" ${st(3)}/>${sign(-130, -320, 260, 130, o.text || 'OPEN', o.color || '#f2c542', o.fg || OL, { fs: 40 })}</g>`,
    money: (o) => `<g>${[0, 1, 2, 3, 4].map((i) => `<rect x="-60" y="${-24 - i * 18}" width="120" height="18" rx="3" fill="#7ac36a" ${st(3)}/>`).join('')}<rect x="-14" y="-114" width="28" height="96" fill="#f2c542" opacity="0.9"/></g>`,
    burger: (o) => `<g transform="scale(${o.s || 1})"><path d="M-60 -10 Q-60 0 0 0 Q60 0 60 -10 Z" fill="#e0a458" ${st()}/><rect x="-64" y="-34" width="128" height="24" rx="10" fill="#6b3b22" ${st()}/><path d="M-70 -34 L70 -34 L60 -46 L-60 -46 Z" fill="#7cc576" ${st(3)}/><path d="M-62 -46 Q-62 -110 0 -110 Q62 -110 62 -46 Z" fill="#e8a44f" ${st()}/><g fill="#fff">${[-30, -6, 20, 36].map((x, i) => `<ellipse cx="${x}" cy="${-80 + (i % 2) * 14}" rx="5" ry="3"/>`).join('')}</g></g>`,
    pizza: (o) => `<g><ellipse cx="0" cy="-20" rx="120" ry="40" fill="#e8b25e" ${st()}/><ellipse cx="0" cy="-24" rx="100" ry="30" fill="#e0533d"/>${[[-40, -24], [20, -30], [50, -16], [-10, -12]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#9b2c22"/>`).join('')}</g>`,
    cake: (o) => `<g><rect x="-80" y="-120" width="160" height="120" rx="10" fill="#f7c0d4" ${st()}/><path d="M-80 -90 q20 20 40 0 t40 0 t40 0 t40 0" fill="none" stroke="#fff" stroke-width="10"/><rect x="-4" y="-170" width="8" height="50" fill="#5aa6e8" ${st(2)}/><path d="M0 -190 q8 10 0 18 q-8 -8 0 -18" fill="#f5a623"/></g>`,
    car: (o) => `<g><path d="M-260 -60 L-240 -140 Q-200 -220 -100 -230 L100 -230 Q180 -220 220 -140 L270 -120 Q290 -100 290 -60 Z" fill="${o.color || '#7b4fa0'}" ${st()}/><path d="M-180 -140 L-150 -200 L-20 -205 L-20 -140 Z M10 -140 L10 -205 L110 -200 L160 -140 Z" fill="#bfe6f7" ${st(3)}/><rect x="-280" y="-70" width="580" height="40" rx="18" fill="${sh(o.color || '#7b4fa0', -0.15)}" ${st()}/><circle cx="-160" cy="-30" r="52" fill="#2b2b30" ${st()}/><circle cx="-160" cy="-30" r="22" fill="#c9ced6"/><circle cx="170" cy="-30" r="52" fill="#2b2b30" ${st()}/><circle cx="170" cy="-30" r="22" fill="#c9ced6"/></g>`,
    plant: () => plant(0, 0, 1),
    tv: (o) => `<g><rect x="-180" y="-360" width="360" height="220" rx="10" fill="#2b2b30" ${st()}/><rect x="-166" y="-346" width="332" height="192" fill="${o.screen || '#3a6fd8'}"/><rect x="-120" y="-140" width="240" height="140" fill="#8a5a3c" ${st()}/></g>`,
    laptop: () => `<g><rect x="-80" y="-120" width="160" height="110" rx="8" fill="#2f3440" ${st()}/><rect x="-70" y="-110" width="140" height="90" fill="#8fd0f2"/><rect x="-100" y="-12" width="200" height="12" rx="4" fill="#c9ced6" ${st()}/></g>`,
    hatrack: (o) => `<g><rect x="-8" y="-460" width="16" height="460" fill="#8a5a3c" ${st(3)}/><ellipse cx="0" cy="-4" rx="90" ry="14" fill="#8a5a3c" ${st(3)}/>${['#e8743b', '#3f6fd1', '#f2d36b'].map((c, i) => `<g transform="translate(${(i - 1) * 70} ${-470 + i * 40})"><path d="M-46 0 Q-46 -50 0 -54 Q46 -50 46 0 Z" fill="${c}" ${st(3)}/><path d="M-60 0 H60" stroke="${OL}" stroke-width="8" stroke-linecap="round"/></g>`).join('')}</g>`,
    shirtrack: (o) => `<g><path d="M-200 -420 H200 M-180 -420 V0 M180 -420 V0" stroke="${OL}" stroke-width="10"/>${['#ef5a5a', '#3f6fd1', '#f2d36b', '#2fa58a'].map((c, i) => `<g transform="translate(${-130 + i * 85} -410)"><path d="M0 0 L0 14" stroke="${OL}" stroke-width="3"/><path d="M-36 14 L36 14 L52 40 L38 50 L34 40 L34 150 L-34 150 L-34 40 L-38 50 L-52 40 Z" fill="${c}" ${st(3)}/></g>`).join('')}</g>`,
    trophy: () => `<g><rect x="-40" y="-30" width="80" height="30" fill="#8a5a3c" ${st()}/><path d="M-50 -170 H50 Q50 -80 0 -70 Q-50 -80 -50 -170 Z" fill="#f2c542" ${st()}/><rect x="-8" y="-70" width="16" height="40" fill="#f2c542" ${st()}/></g>`,
    balloon: (o) => `<g><path d="M0 0 Q10 -80 0 -160" stroke="${OL}" stroke-width="3" fill="none"/><ellipse cx="0" cy="-210" rx="50" ry="60" fill="${o.color || '#ef5a5a'}" ${st()}/></g>`,
    dumpster: () => `<g><rect x="-200" y="-200" width="400" height="200" fill="#2f7d4f" ${st()}/><path d="M-210 -200 L210 -200 L190 -240 L-190 -240 Z" fill="#256b42" ${st()}/></g>`,
    cone: () => `<g><path d="M-40 0 L-14 -110 L14 -110 L40 0 Z" fill="#f28c28" ${st()}/><rect x="-26" y="-70" width="52" height="16" fill="#fff"/><rect x="-50" y="-12" width="100" height="12" fill="#f28c28" ${st(3)}/></g>`,
    mic: () => `<g><path d="M0 0 V-260" stroke="${OL}" stroke-width="10"/><ellipse cx="0" cy="-290" rx="22" ry="32" fill="#5c6270" ${st()}/><ellipse cx="0" cy="-4" rx="60" ry="10" fill="${OL}"/></g>`,
    stall: (o) => `<g><rect x="-220" y="-260" width="440" height="260" fill="${o.color || '#e3c497'}" ${st()}/><rect x="-240" y="-280" width="480" height="30" fill="#8a5a3c" ${st()}/><path d="M-220 -420 V-280 M220 -420 V-280" stroke="${OL}" stroke-width="10"/><path d="M-250 -420 H250 L230 -360 H-230 Z" fill="${o.accent || '#c0392b'}" ${st()}/>${o.text ? `<text x="0" y="-150" text-anchor="middle" font-family="Archivo Black" font-size="44" fill="${OL}">${esc(o.text)}</text>` : ''}</g>`,
  };

  window.Sets = { SETS, PROPS, FLOOR, X0, X1, OL, sign, logoImg, rng, esc };
})();
