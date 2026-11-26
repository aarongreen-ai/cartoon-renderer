// Episode engine: renderAt(t) draws the whole frame from the episode data (window.EP) and time t.
// Everything is a pure function of t. Timing comes from spoken word timings, never typed seconds.
(function () {
  const R = window.Rig, S = window.Sets;
  const OL = R.OL;
  const CW = 1080, CH = 1920;
  const CS = 0.62;                 // standard character scale in world px
  const FLOOR = S.FLOOR;
  const ep = window.EP;
  const esc = S.esc;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const easeOut = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.pow(1 - u, 3));
  const backOut = (u) => { if (u <= 0) return 0; if (u >= 1) return 1; const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
  const h01 = (s) => R.hash(String(s));
  const f1 = (n) => Math.round(n * 10) / 10;
  const norm = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9$%']/g, '').replace(/'/g, '');

  // ---------- time anchors
  const L = ep.lines;
  function anchor(a, fallback) {
    if (a == null) return fallback || 0;
    if (typeof a === 'number') return a;
    if (a.t != null) return a.t;
    const ln = L[clamp(a.line | 0, 0, L.length - 1)];
    if (!ln) return fallback || 0;
    let t = ln.start;
    if (a.end) t = ln.end;
    else if (a.word) {
      const target = norm(a.word);
      let n = a.n || 1, hit = null;
      for (const w of ln.words) { const nw = norm(w.w); if (nw === target || (target.length > 2 && nw.startsWith(target))) { n--; if (n === 0) { hit = w; break; } } }
      if (!hit) for (const w of ln.words) { if (norm(w.w).includes(target) && target.length > 2) { hit = w; break; } }
      if (hit) t = a.after_word ? hit.e : hit.s;
    }
    return t + (a.after || 0);
  }
  const DUR = ep.duration;

  // ---------- beats (shots)
  const beats = (ep.beats || []).map((b, i) => Object.assign({}, b, { _i: i, start: anchor(b.at, 0) }));
  beats.sort((a, b) => a.start - b.start);
  if (beats.length) beats[0].start = 0;
  beats.forEach((b, i) => { b.end = i + 1 < beats.length ? beats[i + 1].start : DUR; });
  const beatAt = (t) => { let cur = beats[0]; for (const b of beats) if (b.start <= t + 1e-6) cur = b; return cur; };

  // reactions: [{at, id, expr, pose, look}] global
  const reacts = (ep.reacts || []).map((r) => Object.assign({}, r, { t: anchor(r.at, 0) })).sort((a, b) => a.t - b.t);

  // who speaks when
  function speakingAt(t) {
    for (const ln of L) if (t >= ln.start - 0.02 && t <= ln.end + 0.05) return ln;
    return null;
  }
  function mouthFor(id, t) {
    const ln = speakingAt(t);
    if (!ln || ln.who !== id) return 0;
    for (const w of ln.words) {
      if (t >= w.s && t <= w.e) {
        const u = (t - w.s) / Math.max(0.05, w.e - w.s);
        const syl = Math.max(1, Math.round(norm(w.w).length / 3));
        const v = Math.abs(Math.sin(Math.PI * syl * u));
        return 0.18 + 0.82 * v * (0.75 + 0.25 * h01(w.w + w.s));
      }
    }
    return 0;
  }
  const cast = ep.season.cast;

  // ---------- character state at t
  function charState(id, c, b, t) {
    const hid = h01(id);
    let expr = c.expr || 'neutral', pose = c.pose || 'idle', look = c.look;
    let lastChange = b.start;
    for (const r of reacts) { if (r.id === id && r.t <= t && r.t >= b.start - 0.001) { if (r.expr) expr = r.expr; if (r.pose) pose = r.pose; if (r.look) look = r.look; lastChange = r.t; } }
    const talk = mouthFor(id, t);
    const ln = speakingAt(t);
    const speaking = ln && ln.who === id;
    // blink
    const per = 2.8 + hid * 1.9, ph = ((t + hid * 7) % per) / per;
    const blink = ph > 0.955 ? 1 : 0;
    // take: squash on expression/pose change
    const since = t - lastChange;
    const squash = since < 0.3 ? Math.sin(Math.PI * since / 0.3) * 0.8 : 0;
    // talking gestures + head
    let gesture = null, tilt = Math.sin(t * 1.1 + hid * 9) * 1.5;
    if (speaking) {
      tilt += Math.sin(t * 6.3 + hid) * 2.2;
      const amp = (pose === 'idle' || pose === 'explain' || pose === 'shrug' || pose === 'present') ? 1 : 0.35;
      gesture = { R: [Math.sin(t * 4.1 + hid) * 22 * amp, Math.sin(t * 5.7) * 30 * amp], L: [Math.sin(t * 3.3 + 2) * 14 * amp, Math.cos(t * 4.4) * 20 * amp] };
      if (pose === 'idle') { pose = (Math.floor((t - (ln ? ln.start : 0)) / 1.6 + hid * 3) % 3 === 1) ? 'explain' : 'idle'; }
    }
    // look at the speaker
    if (!look) {
      if (ln && ln.who !== id && b._pos && b._pos[ln.who] != null && b._pos[id] != null) look = [b._pos[ln.who] > b._pos[id] ? 0.8 : -0.8, 0];
      else if (speaking) look = [0, 0.1];
      else look = [Math.sin(t * 0.7 + hid * 5) * 0.3, 0];
    }
    if (typeof look === 'string') look = look === 'left' ? [-0.9, 0] : look === 'right' ? [0.9, 0] : look === 'up' ? [0, -0.9] : look === 'down' ? [0, 0.8] : [0, 0];
    return { expr, pose, talk, blink, look, tilt, breath: t / 3.4 + hid, sway: Math.sin(t * 1.3 + hid * 4) * 0.6, gesture, squash };
  }

  // ---------- positions and camera
  function layout(b) {
    const ids = (b.cast || []).map((c) => c.id);
    const n = ids.length;
    const pos = {};
    (b.cast || []).forEach((c, i) => {
      const x = c.x != null ? c.x : (n === 1 ? 0.5 : 0.22 + (0.56 * i) / Math.max(1, n - 1));
      pos[c.id] = 540 + (x - 0.5) * 980;
    });
    b._pos = pos;
    return pos;
  }
  beats.forEach(layout);

  function camFor(b, t) {
    const pos = b._pos, ids = Object.keys(pos);
    const cam = b.cam || 'wide';
    const headY = FLOOR - 0.86 * 1000 * CS;
    let cx = 540, cy, z;
    const xs = ids.map((k) => pos[k]);
    const minx = xs.length ? Math.min(...xs) : 540, maxx = xs.length ? Math.max(...xs) : 540;
    const [kind, who] = String(cam).split(':');
    if (kind === 'close' && pos[who] != null) { z = 2.6; cx = pos[who]; cy = headY + 40; }
    else if (kind === 'med' && pos[who] != null) { z = 1.75; cx = pos[who]; cy = headY + 260; }
    else if (kind === 'two') { const span = maxx - minx; z = clamp(CW / (span + 640), 1.2, 1.7); cx = (minx + maxx) / 2; cy = FLOOR - 0.52 * 1000 * CS; }
    else if (kind === 'set') { z = 1.0; cx = 540; cy = 960; }
    else { // wide: feet near bottom, everyone in
      const span = maxx - minx; z = clamp(CW / (span + 700), 1.0, 1.45); cx = (minx + maxx) / 2; cy = FLOOR - (1650 - 960) / z;
    }
    if (b.zoom) z *= b.zoom;
    // moves across the beat
    const u = ease((t - b.start) / Math.max(0.5, b.end - b.start));
    const mv = b.move;
    if (mv === 'push') z *= 1 + 0.12 * u;
    else if (mv === 'pull') z *= 1.12 - 0.12 * u;
    else if (mv === 'pan_left') cx += (60 - 120 * u) / z * 1.5;
    else if (mv === 'pan_right') cx += (-60 + 120 * u) / z * 1.5;
    else if (mv === 'drift') { z *= 1 + 0.05 * u; cx += 25 * Math.sin(u * 2) / z; }
    // cut punch: quick settle at shot start
    const since = t - b.start;
    if (since < 0.25 && b._i > 0) z *= 1 + 0.07 * (1 - easeOut(since / 0.25));
    // shake on shocks
    if (b.shake) { const s2 = anchor(b.shake, b.start); const d = t - s2; if (d >= 0 && d < 0.45) { const k = (1 - d / 0.45) * 14; cx += Math.sin(d * 90) * k / z; cy += Math.cos(d * 77) * k / z; } }
    // keep inside the set
    const halfW = CW / 2 / z, halfH = CH / 2 / z;
    cx = clamp(cx, S.X0 + halfW, S.X1 - halfW);
    cy = clamp(cy, -200 + halfH, 2080 - halfH);
    return { cx, cy, z };
  }

  // ---------- world
  const setCache = {};
  function setSvg(id) {
    if (setCache[id]) return setCache[id];
    const def = (ep.season.sets && ep.season.sets[id]) || { type: id };
    const fn = S.SETS[def.type] || S.SETS.blank;
    return (setCache[id] = fn(def.opts || {}));
  }
  function charSvg(id, c, b, t) {
    const def = cast[id];
    if (!def) return '';
    let x = b._pos[id];
    const st = charState(id, c, b, t);
    let walk = null, alpha = 1;
    // enter / exit
    if (c.enter) {
      const t0 = anchor(c.enter_at, b.start), d = t - t0, dur = 0.8;
      const from = c.enter === 'left' ? S.X0 - 200 : S.X1 + 200;
      if (d < 0) x = from; else if (d < dur) { x = from + (x - from) * easeOut(d / dur); walk = d * 2.2; }
    }
    if (c.exit) {
      const t0 = anchor(c.exit_at, b.end - 0.8), d = t - t0, dur = 0.8;
      const to = c.exit === 'left' ? S.X0 - 300 : S.X1 + 300;
      if (d > 0) { x = x + (to - x) * ease(Math.min(1, d / dur)); walk = d * 2.2; }
    }
    if (c.jump) { const j = t - anchor(c.jump, b.start); if (j >= 0 && j < 0.45) st.lift = Math.sin(Math.PI * j / 0.45) * 90; }
    st.walk = walk;
    if (c.item && S.PROPS[c.item]) st.item = `<g transform="scale(0.9)">${S.PROPS[c.item]({})}</g>`;
    const flip = c.facing === 'left' ? -1 : 1;
    const sc = CS * (def.scale || 1);
    return `<g transform="translate(${f1(x)} ${f1(FLOOR - (st.lift || 0))}) scale(${sc * flip} ${sc})" opacity="${alpha}">${R.draw(def.params, st)}</g>`;
  }
  function propsSvg(b, layer) {
    return (b.props || []).filter((p) => (p.layer || 'back') === layer).map((p) => {
      const fn = S.PROPS[p.prop]; if (!fn) return '';
      const x = 540 + ((p.x != null ? p.x : 0.5) - 0.5) * 980;
      const y = p.y != null ? p.y : FLOOR;
      return `<g transform="translate(${f1(x)} ${y}) scale(${(p.s || 1) * CS / 0.62})">${fn(p.opts || {})}</g>`;
    }).join('');
  }

  // ---------- overlay helpers (screen space)
  const Y = '#f5d33b', GREEN = '#6fd34a', RED = '#ff4b3e';
  function popScale(t, t0, t1) {
    const a = t - t0, d = t1 - t;
    if (a < 0 || d < 0) return 0;
    const inn = a < 0.22 ? backOut(a / 0.22) : 1;
    const out = d < 0.15 ? easeOut(d / 0.15) : 1;
    return inn * out;
  }
  function tw(text, size, font) { // rough text width
    const k = font === 'Anton' ? 0.5 : font === 'League Gothic' ? 0.42 : font === 'Oswald' ? 0.52 : 0.6;
    return String(text).length * size * k;
  }
  function tagSvg(p) {
    const text = String(p.text || '').toUpperCase(), sub = p.sub ? String(p.sub).toUpperCase() : '';
    const fs = p.size || 54, w = Math.max(tw(text, fs, 'Oswald'), tw(sub, 26, 'Oswald')) + 56, h = sub ? fs + 54 : fs + 30;
    return `<g transform="rotate(${p.rot != null ? p.rot : -3})"><rect x="${-w / 2 + 6}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="10" fill="#000" opacity="0.25"/>` +
      `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="10" fill="${p.color || Y}" stroke="${OL}" stroke-width="5"/>` +
      `<text x="0" y="${sub ? -h / 2 + fs * 0.98 + 6 : fs * 0.36}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="${fs}" fill="${p.fg || OL}">${esc(text)}</text>` +
      (sub ? `<text x="0" y="${h / 2 - 16}" text-anchor="middle" font-family="Oswald" font-weight="500" font-size="26" fill="${p.fg || OL}">${esc(sub)}</text>` : '') + `</g>`;
  }
  function bigText(text, size, fill, rot) {
    return `<g transform="rotate(${rot || 0})"><text x="0" y="${size * 0.35}" text-anchor="middle" font-family="Anton" font-size="${size}" fill="${fill}" stroke="${OL}" stroke-width="${size * 0.14}" stroke-linejoin="round" paint-order="stroke">${esc(text)}</text>` +
      `<text x="0" y="${size * 0.35}" text-anchor="middle" font-family="Anton" font-size="${size}" fill="${fill}" stroke="#ffffff" stroke-width="${size * 0.045}" stroke-linejoin="round" paint-order="stroke">${esc(text)}</text></g>`;
  }
  function avatar(name, r) {
    const hue = Math.floor(h01(name) * 360);
    return `<circle r="${r}" fill="hsl(${hue},60%,62%)" stroke="${OL}" stroke-width="3"/><text y="${r * 0.36}" text-anchor="middle" font-family="Inter" font-weight="900" font-size="${r}" fill="#fff">${esc(String(name || '?').replace('@', '')[0].toUpperCase())}</text>`;
  }
  function wrap(text, max) {
    const words = String(text).split(/\s+/); const out = []; let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > max) { if (cur) out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
    if (cur) out.push(cur); return out;
  }
  function commentSvg(p) {
    const lines = wrap(p.text || '', 30).slice(0, 3), w = 620, h = 110 + lines.length * 40;
    return `<g><rect x="${-w / 2 + 6}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="26" fill="#000" opacity="0.22"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="26" fill="#fff" stroke="${OL}" stroke-width="4"/>` +
      `<g transform="translate(${-w / 2 + 56} ${-h / 2 + 56})">${avatar(p.user, 30)}</g>` +
      `<text x="${-w / 2 + 104}" y="${-h / 2 + 50}" font-family="Inter" font-weight="900" font-size="28" fill="${OL}">${esc(p.user || '@viewer')}</text>` +
      `<text x="${-w / 2 + 104}" y="${-h / 2 + 80}" font-family="Inter" font-weight="700" font-size="20" fill="#8a8f98">${esc(p.when || 'Day ' + (ep.day - 1) + ' comment')}</text>` +
      lines.map((l, i) => `<text x="${-w / 2 + 40}" y="${-h / 2 + 130 + i * 40}" font-family="Inter" font-weight="700" font-size="32" fill="${OL}">${esc(l)}</text>`).join('') +
      (p.likes != null ? `<g transform="translate(${w / 2 - 70} ${-h / 2 + 52})"><path d="M0 8 C-18 -6 -14 -22 0 -12 C14 -22 18 -6 0 8 Z" fill="${RED}" stroke="${OL}" stroke-width="2.5"/><text x="24" y="10" font-family="Inter" font-weight="900" font-size="24" fill="${OL}">${esc(p.likes)}</text></g>` : '') + `</g>`;
  }
  function phoneSvg(p) {
    const lines = wrap(p.text || '', 16).slice(0, 6);
    return `<g><rect x="-170" y="-300" width="340" height="600" rx="44" fill="#1f2229" stroke="${OL}" stroke-width="6"/><rect x="-150" y="-270" width="300" height="540" rx="26" fill="#f4f6fa"/>` +
      `<rect x="-150" y="-270" width="300" height="80" rx="26" fill="${p.color || '#3a6fd8'}"/><rect x="-150" y="-215" width="300" height="25" fill="${p.color || '#3a6fd8'}"/>` +
      `<text x="0" y="-218" text-anchor="middle" font-family="Inter" font-weight="900" font-size="28" fill="#fff">${esc(p.title || 'MESSAGES')}</text>` +
      `<rect x="-130" y="-170" width="260" height="${40 + lines.length * 40}" rx="20" fill="#e3e8f0" stroke="#c9d0db" stroke-width="2"/>` +
      lines.map((l, i) => `<text x="-112" y="${-128 + i * 40}" font-family="Inter" font-weight="700" font-size="28" fill="${OL}">${esc(l)}</text>`).join('') +
      (p.big ? `<text x="0" y="180" text-anchor="middle" font-family="Anton" font-size="72" fill="${p.bigColor || RED}">${esc(p.big)}</text>` : '') + `</g>`;
  }
  function faceSvg(p, t) {
    const def = cast[p.id]; if (!def) return '';
    const r = p.r || 120;
    const st = { expr: p.expr || 'neutral', pose: 'idle', talk: mouthFor(p.id, t), blink: 0, look: [0, 0], breath: t / 3 };
    const cid = 'fc' + Math.floor(h01(p.id + p.t0) * 1e6);
    return `<g><defs><clipPath id="${cid}"><circle r="${r}"/></clipPath></defs><circle r="${r + 8}" fill="#fff" stroke="${OL}" stroke-width="5"/><circle r="${r}" fill="${p.bg || '#f7b6c8'}"/>` +
      `<g clip-path="url(#${cid})"><g transform="translate(0 ${r * 2.35}) scale(${r / 150})">${R.draw(def.params, st)}</g></g><circle r="${r}" fill="none" stroke="${OL}" stroke-width="5"/>` +
      (p.label ? `<g transform="translate(0 ${r + 34})">${tagSvg({ text: p.label, size: 34, rot: 0 })}</g>` : '') + `</g>`;
  }
  function statsSvg(p) {
    const rows = p.rows || [], w = 560;
    return `<g>` + rows.map((r, i) => `<g transform="translate(0 ${i * 74})"><rect x="${-w / 2}" y="-30" width="${w}" height="62" rx="8" fill="#fff8e8" stroke="${OL}" stroke-width="4"/><text x="${-w / 2 + 22}" y="12" font-family="Oswald" font-weight="700" font-size="30" fill="${OL}">${esc(String(r[0]).toUpperCase())}</text><text x="${w / 2 - 22}" y="14" text-anchor="end" font-family="Anton" font-size="38" fill="${r[2] || RED}">${esc(String(r[1]).toUpperCase())}</text></g>`).join('') + `</g>`;
  }
  function receiptSvg(p) {
    const rows = p.rows || [], w = 600, h = 90 + rows.length * 54 + (p.total ? 70 : 0);
    let s = `<g><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="14" fill="#23252d" stroke="${OL}" stroke-width="5"/>`;
    rows.forEach((r, i) => { s += `<text x="${-w / 2 + 30}" y="${-h / 2 + 70 + i * 54}" font-family="Oswald" font-weight="500" font-size="32" fill="#e6e8ee">${esc(String(r[0]).toUpperCase())}</text><text x="${w / 2 - 30}" y="${-h / 2 + 70 + i * 54}" text-anchor="end" font-family="Anton" font-size="36" fill="${String(r[1]).trim().startsWith('+') ? GREEN : RED}">${esc(r[1])}</text>`; });
    if (p.total) s += `<path d="M${-w / 2 + 24} ${h / 2 - 78} H${w / 2 - 24}" stroke="#555" stroke-width="3"/><text x="${-w / 2 + 30}" y="${h / 2 - 26}" font-family="Oswald" font-weight="700" font-size="36" fill="#fff">${esc(String(p.total[0]).toUpperCase())}</text><text x="${w / 2 - 30}" y="${h / 2 - 22}" text-anchor="end" font-family="Anton" font-size="48" fill="${Y}">${esc(p.total[1])}</text>`;
    return s + '</g>';
  }
  function voteResultSvg(p) {
    const a = clamp(p.pct || 50, 1, 99), w = 720;
    return `<g><rect x="${-w / 2}" y="-170" width="${w}" height="340" rx="24" fill="#20222a" stroke="${OL}" stroke-width="6"/>` +
      `<text x="0" y="-100" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="44" fill="#fff">YOU PICKED</text>` +
      `<text x="0" y="20" text-anchor="middle" font-family="Anton" font-size="${Math.min(120, 1100 / Math.max(3, String(p.winner).length))}" fill="${Y}">${esc(String(p.winner || '').toUpperCase())}</text>` +
      `<rect x="${-w / 2 + 40}" y="54" width="${w - 80}" height="34" rx="17" fill="#b6834f"/><rect x="${-w / 2 + 40}" y="54" width="${(w - 80) * a / 100}" height="34" rx="17" fill="#7da04a"/>` +
      `<text x="${-w / 2 + 40}" y="138" font-family="Oswald" font-weight="700" font-size="32" fill="#fff">${esc(String(p.a || 'A').toUpperCase())} ${Math.round(a)}%</text>` +
      `<text x="${w / 2 - 40}" y="138" text-anchor="end" font-family="Oswald" font-weight="700" font-size="32" fill="#fff">${esc(String(p.b || 'B').toUpperCase())} ${Math.round(100 - a)}%</text></g>`;
  }
  function productSvg(p) {
    const w = 560, h = 700;
    return `<g><rect x="${-w / 2 + 8}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="30" fill="#000" opacity="0.25"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="30" fill="#fffaf0" stroke="${OL}" stroke-width="6"/>` +
      `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="90" rx="30" fill="#1f3f9a"/><rect x="${-w / 2}" y="${-h / 2 + 50}" width="${w}" height="40" fill="#1f3f9a"/>` +
      `<text x="0" y="${-h / 2 + 60}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="40" fill="#fff">FUNNY HATS COMPANY</text>` +
      (p.img ? `<image href="${esc(p.img)}" x="${-w / 2 + 40}" y="${-h / 2 + 110}" width="${w - 80}" height="400" preserveAspectRatio="xMidYMid meet"/>` : '') +
      `<text x="0" y="${h / 2 - 120}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="${Math.min(44, 980 / Math.max(10, String(p.name || '').length))}" fill="${OL}">${esc(String(p.name || '').toUpperCase())}</text>` +
      (p.price ? `<g transform="translate(${w / 2 - 70} ${-h / 2 + 150}) rotate(10)"><circle r="70" fill="${RED}" stroke="${OL}" stroke-width="5"/><text y="16" text-anchor="middle" font-family="Anton" font-size="46" fill="#fff">${esc(p.price)}</text></g>` : '') +
      `<rect x="-150" y="${h / 2 - 90}" width="300" height="62" rx="31" fill="${Y}" stroke="${OL}" stroke-width="4"/><text x="0" y="${h / 2 - 47}" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="34" fill="${OL}">LINK IN BIO</text></g>`;
  }
  function arrowSvg(p) { return `<g transform="rotate(${p.rot || 0})"><path d="M-90 -18 H30 V-46 L96 0 L30 46 V18 H-90 Z" fill="${p.color || Y}" stroke="${OL}" stroke-width="6" stroke-linejoin="round"/></g>`; }

  // pops: resolve times + default positions
  const pops = (ep.pops || []).map((p, i) => {
    const t0 = anchor(p.at, 0);
    let t1 = p.until ? anchor(p.until, t0 + 2) : t0 + (p.dur || 2.2);
    return Object.assign({}, p, { t0, t1, _i: i });
  });
  function popPos(p, b) {
    if (p.x != null && p.y != null) return [p.x, p.y];
    const defaults = { tag: [500, 560], price: [500, 700], money: [500, 640], comment: [520, 620], phone: [540, 820], face: [250, 620], stats: [500, 1180], receipt: [520, 820], vote: [520, 700], product: [520, 860], big: [520, 640], stamp: [520, 700], arrow: [700, 900] };
    let xy = (defaults[p.type] || [540, 700]).slice();
    if (p.near && b && b._pos[p.near] != null) { const cam = camFor(b, p.t0); const sx = (b._pos[p.near] - cam.cx) * cam.z + 540; const sy = (FLOOR - 1000 * CS - 40 - cam.cy) * cam.z + 960; xy = [clamp(sx, 260, 800), clamp(sy - 60, 380, 1100)]; }
    if (p.x != null) xy[0] = p.x; if (p.y != null) xy[1] = p.y;
    return xy;
  }
  function popSvg(p, t, b) {
    const k = popScale(t, p.t0, p.t1);
    if (k <= 0) return '';
    const [x, y] = popPos(p, b);
    let inner = '';
    switch (p.type) {
      case 'tag': inner = tagSvg(p); break;
      case 'price': inner = bigText(p.text, p.size || 120, p.color || RED, p.rot || -4); break;
      case 'money': { const rise = (t - p.t0) * 40; inner = `<g transform="translate(0 ${-rise})">${bigText(p.text, p.size || 110, String(p.text).trim().startsWith('-') ? RED : GREEN, -3)}</g>`; break; }
      case 'big': inner = bigText(p.text, p.size || 150, p.color || Y, p.rot || 0); break;
      case 'stamp': inner = `<g transform="rotate(${p.rot || -6})"><rect x="-230" y="-95" width="460" height="190" rx="10" fill="#fff" stroke="${RED}" stroke-width="12"/><rect x="-206" y="-71" width="412" height="142" rx="6" fill="${RED}"/><text y="40" text-anchor="middle" font-family="Anton" font-size="120" fill="#fff">${esc(p.text)}</text></g>`; break;
      case 'comment': inner = commentSvg(p); break;
      case 'phone': inner = phoneSvg(p); break;
      case 'face': inner = faceSvg(p, t); break;
      case 'stats': inner = statsSvg(p); break;
      case 'receipt': inner = receiptSvg(p); break;
      case 'vote': inner = voteResultSvg(p); break;
      case 'product': inner = productSvg(p); break;
      case 'arrow': inner = arrowSvg(p); break;
      default: inner = tagSvg(p);
    }
    const wob = p.type === 'tag' || p.type === 'price' ? Math.sin((t - p.t0) * 3) * 1.2 : 0;
    return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(wob)}) scale(${f1(k * 1000) / 1000})">${inner}</g>`;
  }

  // ---------- HUD
  const hudEvents = (ep.hud_events || []).map((e) => Object.assign({}, e, { t: anchor(e.at, 0) })).sort((a, b) => a.t - b.t);
  function hudVal(key, t) {
    let v = ep.hud[key], prev = v, tc = -9;
    for (const e of hudEvents) if (e[key] != null) { if (e.t <= t) { prev = v; v = e[key]; tc = e.t; } }
    const d = t - tc;
    if (d >= 0 && d < 0.8 && typeof v === 'number' && typeof prev === 'number') return { v: prev + (v - prev) * easeOut(d / 0.8), flash: 1 - d / 0.8 };
    return { v, flash: 0 };
  }
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  function hudSvg(t) {
    const h = ep.hud; if (!h || ep.hide_hud) return '';
    const days = hudVal('days_left', t), fund = hudVal('fund', t);
    const goal = h.fund_goal || 0;
    let s = `<g transform="translate(40 150)">`;
    const card = (x, w, label, val, color, extra, flash) => `<g transform="translate(${x} 0)"><rect width="${w}" height="112" rx="14" fill="#1f2128" stroke="#3a3d47" stroke-width="3"/>${flash > 0 ? `<rect width="${w}" height="112" rx="14" fill="${Y}" opacity="${f1(flash * 0.5 * 10) / 10}"/>` : ''}<text x="${w / 2}" y="32" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="22" fill="#cfd3dc">${esc(label)}</text><text x="${w / 2}" y="84" text-anchor="middle" font-family="Anton" font-size="${val.length > 7 ? 40 : 48}" fill="${color}">${esc(val)}</text>${extra || ''}</g>`;
    s += card(0, 150, 'DAYS LEFT', String(Math.round(days.v)), Y, '', days.flash);
    const fv = fund.v || 0;
    const bar = goal ? `<rect x="22" y="94" width="216" height="8" rx="4" fill="#3a3d47"/><rect x="22" y="94" width="${f1(216 * clamp(fv / goal, 0, 1))}" height="8" rx="4" fill="${GREEN}"/>` : '';
    s += card(164, 260, String(h.fund_label || 'FUND').toUpperCase(), money(fv), fv < 0 ? RED : '#ffffff', bar, fund.flash);
    let x = 438;
    (h.stats || []).slice(0, 2).forEach((st, i) => { const v = hudVal('stat' + i, t); const val = v.v != null ? String(v.v) : String(st.value); s += card(x, 180, String(st.label).toUpperCase(), val, st.color || GREEN, '', v.flash); x += 194; });
    // rate chips
    const r = ep.rates || { like: 1, share: 5, follow: 10 };
    const chips = [['♥', `1 LIKE = $${r.like}`, RED], ['↗', `1 SHARE = $${r.share}`, '#5aa9ff'], ['+', `1 FOLLOW = $${r.follow}`, GREEN]];
    let cx = 0;
    chips.forEach(([ic, tx, c]) => { const w = tw(tx, 22, 'Oswald') + 58; s += `<g transform="translate(${cx} 128)"><rect width="${w}" height="40" rx="20" fill="#1f2128" stroke="#3a3d47" stroke-width="2"/><circle cx="20" cy="20" r="13" fill="${c}"/><text x="20" y="27" text-anchor="middle" font-family="Inter" font-weight="900" font-size="18" fill="#fff">${ic}</text><text x="40" y="28" font-family="Oswald" font-weight="700" font-size="22" fill="#fff">${esc(tx)}</text></g>`; cx += w + 10; });
    return s + '</g>';
  }

  // ---------- captions
  const KEY_POS = /^(\$|\+|money|win|won|yes|love|best|free|fund|cash|profit|sold|deal|gold|perfect|great)/i;
  const KEY_NEG = /^(-|no|not|never|lose|lost|broke|burn|burnt|fire|die|dead|zero|worst|disaster|fail|wrong|late|bad|hate|ruin)/i;
  const groups = [];
  L.forEach((ln, li) => {
    const keys = (ln.key || []).map(norm);
    let cur = [];
    const flush = () => { if (cur.length) { groups.push({ li, words: cur }); cur = []; } };
    ln.words.forEach((w, wi) => {
      cur.push(w);
      const txt = cur.map((x) => x.w).join(' ');
      const endPunct = /[.,!?;:]$/.test(w.w);
      if (cur.length >= 3 || txt.length > 13 || endPunct) flush();
    });
    flush();
    groups.forEach((g) => { if (g.li === li && !g.key) { let k = g.words.findIndex((w) => keys.includes(norm(w.w))); if (k < 0 && !ln.key) { k = g.words.findIndex((w) => /\d/.test(w.w) || KEY_POS.test(norm(w.w)) || KEY_NEG.test(norm(w.w))); if (k < 0 && (groups.indexOf(g) % 2 === 0)) { let best = -1, bl = 4; g.words.forEach((w, i) => { const n = norm(w.w).length; if (n > bl) { bl = n; best = i; } }); k = best; } } g.key = k; } });
  });
  groups.forEach((g, i) => { g.s = g.words[0].s; const nx = groups[i + 1]; g.e = nx && nx.s - g.words[g.words.length - 1].e < 0.6 ? nx.s : g.words[g.words.length - 1].e + 0.35; });
  function capSvg(t) {
    if (ep.hide_captions) return '';
    const g = groups.find((x) => t >= x.s && t < x.e);
    if (!g) return '';
    const k = backOut(Math.min(1, (t - g.s) / 0.1)) * 0.15 + 0.85;
    const words = g.words.map((w) => String(w.w).toUpperCase().replace(/[^A-Z0-9$%'!?.,\-+&]/g, '').replace(/[.,;:]+$/, ''));
    const fs = clamp(860 / Math.max(6, words.join(' ').length * 0.5), 64, 104);
    const tsp = words.map((w, i) => {
      const nw = norm(g.words[i].w);
      const color = i === g.key ? (KEY_NEG.test(nw) || nw.startsWith('-') ? RED : KEY_POS.test(nw) || /^\$/.test(g.words[i].w) ? GREEN : Y) : '#ffffff';
      return `<tspan fill="${color}">${esc(w)}${i < words.length - 1 ? ' ' : ''}</tspan>`;
    }).join('');
    const y = ep.caption_y || 1380;
    return `<g transform="translate(520 ${y}) scale(${f1(k * 100) / 100})"><text x="0" y="0" text-anchor="middle" font-family="Anton" font-size="${f1(fs)}" stroke="${OL}" stroke-width="${f1(fs * 0.2)}" stroke-linejoin="round" paint-order="stroke" fill="#fff">${tsp}</text></g>`;
  }

  // ---------- special full-screen cards (vote end card, title card)
  function voteCard(t) {
    const v = ep.vote; if (!v) return '';
    const t0 = anchor(v.at, DUR - 4);
    if (t < t0) return '';
    const u = easeOut((t - t0) / 0.35);
    const a = v.a || {}, b = v.b || {};
    const panel = (y, letter, label, sub, bg, from) => {
      const off = (1 - u) * 1100 * from;
      return `<g transform="translate(${f1(off)} ${y})"><rect x="0" y="0" width="1080" height="560" fill="${bg}"/>` +
        Array.from({ length: 12 }, (_, i) => `<path d="M540 280 L${540 + Math.cos(i / 12 * Math.PI * 2) * 1200} ${280 + Math.sin(i / 12 * Math.PI * 2) * 1200} L${540 + Math.cos((i + 0.5) / 12 * Math.PI * 2) * 1200} ${280 + Math.sin((i + 0.5) / 12 * Math.PI * 2) * 1200} Z" fill="#fff" opacity="0.07"/>`).join('') +
        `<text x="${letter === 'A' ? 700 : 300}" y="250" text-anchor="middle" font-family="Anton" font-size="230" fill="${Y}" stroke="${OL}" stroke-width="12" paint-order="stroke">${letter}</text>` +
        `<text x="${letter === 'A' ? 700 : 300}" y="350" text-anchor="middle" font-family="Anton" font-size="${Math.min(78, 900 / Math.max(6, String(label).length))}" fill="#fff" stroke="${OL}" stroke-width="10" paint-order="stroke">${esc(String(label).toUpperCase())}</text>` +
        (sub ? `<text x="${letter === 'A' ? 700 : 300}" y="410" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="36" fill="#fff">${esc(String(sub).toLowerCase())}</text>` : '') +
        (() => { const o = letter === 'A' ? a : b; const pr = o.prop || v[letter === 'A' ? 'a_prop' : 'b_prop']; return pr && S.PROPS[pr] ? `<g transform="translate(${letter === 'A' ? 250 : 830} 520) scale(1.05)">${S.PROPS[pr](o.opts || {})}</g>` : ''; })() + `</g>`;
    };
    const hero = cast[v.hero || ep.season.hero];
    const pulse = 1 + Math.sin((t - t0) * 6) * 0.03;
    return `<g><rect width="1080" height="1920" fill="#2a2140"/>` +
      `<g transform="translate(540 230) scale(${f1(pulse * 100) / 100})">${bigText('YOU DECIDE!', 120, Y, -2)}</g>` +
      (v.q ? `<text x="540" y="350" text-anchor="middle" font-family="Oswald" font-weight="700" font-size="${Math.min(46, 1500 / Math.max(20, v.q.length))}" fill="#fff">${esc(v.q.toUpperCase())}</text>` : '') +
      panel(400, 'A', a.label || 'A', a.sub, '#c8323b', -1) + panel(980, 'B', b.label || 'B', b.sub, '#2f5fc4', 1) +
      `<g transform="translate(340 1760)">${bigText('COMMENT', 84, '#fff', 0)}</g><g transform="translate(340 1860)"><text text-anchor="middle" font-family="Anton" font-size="84" fill="${Y}" stroke="${OL}" stroke-width="14" paint-order="stroke"><tspan fill="${RED}">A</tspan> OR <tspan fill="#5aa9ff">B</tspan></text></g>` +
      (hero ? `<g transform="translate(800 1960) scale(0.55)">${R.draw(hero.params, { expr: 'nervous', pose: 'headhold', talk: mouthFor(v.hero || ep.season.hero, t), blink: 0, breath: t / 3, tilt: Math.sin(t * 3) * 3 })}</g>` : '') + `</g>`;
  }

  // ---------- main draw
  const stage = () => document.getElementById('stage');
  function renderAt(t) {
    t = clamp(t, 0, DUR);
    const b = beatAt(t);
    const cam = camFor(b, t);
    let world = setSvg(b.set) + propsSvg(b, 'back');
    // draw characters back-to-front by x distance from center (furthest first)
    const order = (b.cast || []).slice().sort((p, q) => (p.z || 0) - (q.z || 0));
    world += order.map((c) => charSvg(c.id, c, b, t)).join('');
    world += propsSvg(b, 'front');
    let s = `<g transform="translate(540 960) scale(${f1(cam.z * 1000) / 1000}) translate(${f1(-cam.cx)} ${f1(-cam.cy)})">${world}</g>`;
    // flash cut
    if (b.flash) { const d = t - b.start; if (d < 0.12) s += `<rect width="1080" height="1920" fill="#fff" opacity="${f1((1 - d / 0.12) * 10) / 10}"/>`; }
    if (b.dim) s += `<rect width="1080" height="1920" fill="#10131c" opacity="${b.dim}"/>`;
    s += hudSvg(t);
    s += pops.map((p) => popSvg(p, t, b)).join('');
    const vc = voteCard(t);
    if (vc) s = vc; else s += capSvg(t);
    stage().innerHTML = s;
  }
  window.renderAt = renderAt;
  window.addEventListener('hf-seek', (e) => renderAt(e.detail.time));
  renderAt(0);
})();
