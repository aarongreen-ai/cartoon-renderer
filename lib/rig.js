// Character rig. Flat 2D vector, thin dark outlines, Bitmoji-like proportions.
// Local units: feet at (0,0), top of head near y=-1000. Everything is a pure function of (params, state).
(function () {
  const OL = '#2a2730';       // outline
  const W = 6;                // outline width

  const SKIN = ['#f7d7bb', '#efc4a2', '#e2ad86', '#c98d63', '#a96c45', '#7e4b2e', '#5b3522'];
  const HAIR = { black: '#2b2321', dark: '#45291d', brown: '#6b4230', auburn: '#8c4426', blonde: '#d8ad5f', ginger: '#b65a2c', grey: '#b9b4ad', white: '#ebe8e2', blue: '#3f6fd1', pink: '#e477a8' };

  const shade = (hex, f) => {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const k = f < 0 ? 0 : 255, a = Math.abs(f);
    r = Math.round(r + (k - r) * a); g = Math.round(g + (k - g) * a); b = Math.round(b + (k - b) * a);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  const f1 = (n) => Math.round(n * 10) / 10;
  const P = (pts) => pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' ');

  // Outlined thick limb: dark stroke then colored stroke on top
  function limb(pts, w, color, cap) {
    const d = 'M' + pts.map((p) => f1(p[0]) + ' ' + f1(p[1])).join(' L');
    cap = cap || 'round';
    return `<path d="${d}" fill="none" stroke="${OL}" stroke-width="${w + W * 2}" stroke-linecap="${cap}" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
  }

  // 2-bone IK. Returns both elbow solutions; caller picks.
  function ik(sx, sy, hx, hy, l1, l2) {
    let dx = hx - sx, dy = hy - sy;
    let d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.5;
    if (d > max) { hx = sx + dx / d * max; hy = sy + dy / d * max; dx = hx - sx; dy = hy - sy; d = max; }
    d = Math.max(d, Math.abs(l1 - l2) + 1);
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const base = Math.atan2(dy, dx);
    const e1 = { ex: sx + Math.cos(base + a) * l1, ey: sy + Math.sin(base + a) * l1, hx, hy };
    const e2 = { ex: sx + Math.cos(base - a) * l1, ey: sy + Math.sin(base - a) * l1, hx, hy };
    return [e1, e2];
  }

  // Poses: hand targets relative to body. side: -1 = character's right (screen left), +1 = screen right
  // h: hand shape, e: elbow bend sign multiplier (1 = outward)
  const POSES = {
    idle:      { L: [-162, -350, 'rest'], R: [162, -350, 'rest'] },
    together:  { L: [-16, -505, 'fist'], R: [16, -500, 'fist'] },
    phone:     { L: [-162, -350, 'rest'], R: [52, -598, 'phone'] },
    phone2:    { L: [-26, -585, 'grip'], R: [26, -585, 'phone'] },
    wave:      { L: [-162, -350, 'rest'], R: [212, -905, 'open'] },
    point:     { L: [-162, -350, 'rest'], R: [292, -660, 'point'] },
    pointL:    { L: [-292, -660, 'point'], R: [162, -350, 'rest'] },
    shrug:     { L: [-218, -560, 'open'], R: [218, -560, 'open'] },
    hips:      { L: [-112, -430, 'fist', 1.6], R: [112, -430, 'fist', 1.6] },
    panic:     { L: [-190, -1010, 'open'], R: [190, -1010, 'open'] },
    headhold:  { L: [-128, -900, 'open'], R: [128, -900, 'open'] },
    facepalm:  { L: [-162, -350, 'rest'], R: [26, -858, 'open', 'd'] },
    think:     { L: [-162, -350, 'rest'], R: [30, -738, 'fist', 'd'] },
    hold:      { L: [-70, -560, 'grip'], R: [70, -560, 'grip'] },
    present:   { L: [-162, -350, 'rest'], R: [238, -600, 'open'] },
    presentL:  { L: [-238, -600, 'open'], R: [162, -350, 'rest'] },
    cheer:     { L: [-150, -980, 'fist'], R: [150, -980, 'fist'] },
    fist:      { L: [-162, -350, 'rest'], R: [128, -880, 'fist'] },
    cross:     { L: [78, -548, 'fist'], R: [-78, -560, 'fist'] },
    explain:   { L: [-170, -560, 'open'], R: [96, -600, 'open'] },
    count:     { L: [-162, -350, 'rest'], R: [150, -760, 'point', 'd'] },
    beg:       { L: [-22, -640, 'open'], R: [22, -640, 'open'] },
  };

  // Expressions: brows (inner, outer y offsets + tilt), lids, eye scale, base mouth
  const EXPR = {
    neutral:  { bi: 0, bo: 0, top: 0, bot: 0, es: 1, mouth: 'smile', pup: 1 },
    happy:    { bi: -8, bo: -6, top: 0, bot: 0.22, es: 1, mouth: 'grin', pup: 1 },
    laugh:    { bi: -10, bo: -8, top: 0, bot: 0, es: 1, mouth: 'laugh', arcs: true, pup: 1 },
    worried:  { bi: -14, bo: 6, top: 0, bot: 0, es: 1.02, mouth: 'wobble', sweat: true, pup: 0.92 },
    nervous:  { bi: -12, bo: 4, top: 0, bot: 0, es: 1.05, mouth: 'tight', sweat: true, pup: 0.85 },
    shocked:  { bi: -22, bo: -20, top: 0, bot: 0, es: 1.18, mouth: 'o', pup: 0.7 },
    angry:    { bi: 14, bo: -6, top: 0.34, bot: 0, es: 1, mouth: 'gritted', pup: 1 },
    sad:      { bi: -12, bo: 8, top: 0.3, bot: 0, es: 1, mouth: 'frown', pup: 1 },
    smug:     { bi: 2, bo: -2, top: 0.42, bot: 0, es: 1, mouth: 'smirk', brow1: -14, pup: 1 },
    thinking: { bi: -4, bo: 0, top: 0.15, bot: 0, es: 1, mouth: 'flat', brow1: -12, look: [0.5, -0.6], pup: 1 },
    excited:  { bi: -14, bo: -12, top: 0, bot: 0, es: 1.12, mouth: 'laugh', pup: 1, sparkle: true },
    tired:    { bi: -2, bo: 6, top: 0.5, bot: 0, es: 1, mouth: 'flat', pup: 1 },
    scared:   { bi: -26, bo: -8, top: 0, bot: 0, es: 1.22, mouth: 'wobble', sweat: true, pup: 0.5 },
    sly:      { bi: 6, bo: -4, top: 0.36, bot: 0.1, es: 1, mouth: 'smirk', look: [0.7, 0], pup: 1 },
  };

  function mouthPath(kind, open, x, y, w) {
    // open: 0..1 talking amount (0 = shape at rest)
    const lip = OL, inside = '#7a2433', tongue = '#e46d78', teeth = '#ffffff';
    w = w || 44;
    if (open > 0.05 || kind === 'o' || kind === 'laugh' || kind === 'grin' || kind === 'gritted') {
      let mw, mh, top;
      if (kind === 'o') { mw = 15 + open * 5; mh = 22 + open * 8; return `<ellipse cx="${x}" cy="${y + 4}" rx="${mw}" ry="${mh}" fill="${inside}" stroke="${lip}" stroke-width="${W - 1}"/><ellipse cx="${x}" cy="${y + 4 + mh * 0.55}" rx="${mw * 0.6}" ry="${mh * 0.3}" fill="${tongue}"/>`; }
      if (kind === 'gritted' && open < 0.05) { return `<rect x="${x - 26}" y="${y - 8}" width="52" height="18" rx="7" fill="#fff" stroke="${lip}" stroke-width="${W - 1}"/><path d="M${x - 26} ${y + 1} H${x + 26} M${x - 9} ${y - 8} V${y + 10} M${x + 9} ${y - 8} V${y + 10}" stroke="${lip}" stroke-width="2.5"/>`; }
      if (kind === 'frown' || kind === 'wobble' || kind === 'tight') { mw = 18 + open * 6; mh = 6 + open * 20; }
      else if (kind === 'laugh') { mw = 30; mh = 28 + open * 6; }
      else if (kind === 'grin') { mw = 30 + open * 2; mh = 16 + open * 16; }
      else { mw = 20 + open * 8; mh = 6 + open * 24; }
      top = y - 4;
      const d = kind === 'laugh' || kind === 'grin'
        ? `M${x - mw} ${top} Q${x} ${top + 6} ${x + mw} ${top} Q${x + mw * 0.8} ${top + mh * 1.25} ${x} ${top + mh * 1.25} Q${x - mw * 0.8} ${top + mh * 1.25} ${x - mw} ${top} Z`
        : `M${x - mw} ${top + 3} Q${x} ${top - 2} ${x + mw} ${top + 3} Q${x + mw * 0.9} ${top + mh + 4} ${x} ${top + mh + 4} Q${x - mw * 0.9} ${top + mh + 4} ${x - mw} ${top + 3} Z`;
      const clip = 'm' + Math.round(x * 7 + y * 3 + mw * 11 + mh * 13);
      const tH = Math.min(9, mh * 0.35);
      return `<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>` +
        `<path d="${d}" fill="${inside}"/>` +
        `<g clip-path="url(#${clip})"><rect x="${x - mw}" y="${top - 6}" width="${mw * 2}" height="${tH + 6}" fill="${teeth}"/>` +
        (mh > 14 ? `<ellipse cx="${x}" cy="${top + mh * 1.2}" rx="${mw * 0.62}" ry="${mh * 0.38}" fill="${tongue}"/>` : '') + `</g>` +
        `<path d="${d}" fill="none" stroke="${lip}" stroke-width="${W - 1}" stroke-linejoin="round"/>`;
    }
    // closed shapes
    const sw = W - 0.5;
    switch (kind) {
      case 'frown': return `<path d="M${x - 18} ${y + 6} Q${x} ${y - 8} ${x + 18} ${y + 6}" fill="none" stroke="${lip}" stroke-width="${sw}" stroke-linecap="round"/>`;
      case 'wobble': return `<path d="M${x - 20} ${y + 3} q6 -7 12 0 t12 0 t12 0" fill="none" stroke="${lip}" stroke-width="${sw}" stroke-linecap="round"/>`;
      case 'tight': return `<path d="M${x - 16} ${y + 2} L${x + 16} ${y}" fill="none" stroke="${lip}" stroke-width="${sw}" stroke-linecap="round"/>`;
      case 'flat': return `<path d="M${x - 14} ${y + 2} L${x + 18} ${y + 1}" fill="none" stroke="${lip}" stroke-width="${sw}" stroke-linecap="round"/>`;
      case 'smirk': return `<path d="M${x - 16} ${y + 3} Q${x + 4} ${y + 8} ${x + 22} ${y - 6}" fill="none" stroke="${lip}" stroke-width="${sw}" stroke-linecap="round"/>`;
      default: return `<path d="M${x - w / 2} ${y - 2} Q${x} ${y + 16} ${x + w / 2} ${y - 2}" fill="none" stroke="${lip}" stroke-width="${sw}" stroke-linecap="round"/>`;
    }
  }

  function hand(x, y, kind, skin, ang, side) {
    // ang: forearm direction (radians), side: -1/1
    const r = 27;
    let s = `<g transform="translate(${f1(x)} ${f1(y)})">`;
    const deg = (ang * 180) / Math.PI;
    if (kind === 'open') {
      s += `<g transform="rotate(${f1(deg - 90)})"><path d="M-22 -6 Q-26 26 -10 34 Q8 40 20 26 Q28 10 22 -8 Z" fill="${skin}" stroke="${OL}" stroke-width="${W - 1}" stroke-linejoin="round"/>` +
        `<path d="M-20 18 Q-34 10 -36 -2" fill="none" stroke="${OL}" stroke-width="${W - 1}" stroke-linecap="round"/>` +
        `<path d="M-6 30 L-6 46 M6 32 L7 48 M17 25 L20 40" stroke="${OL}" stroke-width="${W + 7}" stroke-linecap="round"/>` +
        `<path d="M-6 30 L-6 46 M6 32 L7 48 M17 25 L20 40" stroke="${skin}" stroke-width="7.5" stroke-linecap="round"/></g>`;
    } else if (kind === 'point') {
      s += `<g transform="rotate(${f1(deg - 90)})"><circle r="${r}" fill="${skin}" stroke="${OL}" stroke-width="${W - 1}"/>` +
        `<path d="M2 18 L2 64" stroke="${OL}" stroke-width="${W + 10}" stroke-linecap="round"/><path d="M2 18 L2 64" stroke="${skin}" stroke-width="10" stroke-linecap="round"/>` +
        `<circle r="${r - 3}" fill="${skin}"/><path d="M-14 4 q8 6 18 2" fill="none" stroke="${OL}" stroke-width="3"/></g>`;
    } else if (kind === 'phone' ) {
      s += `<g transform="rotate(${side < 0 ? 8 : -8})"><rect x="-26" y="-58" width="52" height="92" rx="9" fill="#2f3440" stroke="${OL}" stroke-width="${W - 1}"/><rect x="-20" y="-50" width="40" height="72" rx="4" fill="#7fc6f5"/>` +
        `<circle cx="${side * 4}" cy="22" r="${r - 2}" fill="${skin}" stroke="${OL}" stroke-width="${W - 1}"/><path d="M${-side * 22} 8 q${side * 10} -14 ${side * 22} -6" fill="none" stroke="${OL}" stroke-width="${W - 1}" stroke-linecap="round"/></g>`;
    } else {
      // rest / fist / grip
      s += `<circle r="${r}" fill="${skin}" stroke="${OL}" stroke-width="${W - 1}"/>`;
      if (kind === 'fist' || kind === 'grip') s += `<path d="M-14 -6 q6 -4 12 0 M-2 -6 q6 -4 12 0" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round" transform="rotate(${f1(deg - 90)})"/>`;
      else s += `<path d="M${-side * 4} 8 q${side * 10} 8 ${side * 20} -2" fill="none" stroke="${OL}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return s + '</g>';
  }

  function hairBack(style, c) {
    const d = shade(c, -0.18);
    switch (style) {
      case 'long': return `<path d="M-128 -880 Q-150 -700 -130 -600 Q-60 -585 0 -598 Q60 -585 130 -600 Q150 -700 128 -880 Q100 -985 0 -988 Q-100 -985 -128 -880 Z" fill="${d}" stroke="${OL}" stroke-width="${W}"/>`;
      case 'ponytail': return `<path d="M60 -940 Q190 -930 170 -780 Q160 -700 120 -660 Q130 -760 92 -840 Z" fill="${d}" stroke="${OL}" stroke-width="${W}"/>`;
      case 'bob': return `<path d="M-132 -870 Q-142 -760 -118 -712 Q-60 -700 0 -712 Q60 -700 118 -712 Q142 -760 132 -870 Q110 -985 0 -990 Q-110 -985 -132 -870 Z" fill="${d}" stroke="${OL}" stroke-width="${W}"/>`;
      case 'curlylong': return `<path d="M-140 -880 q-30 40 -10 80 q-30 40 0 80 q-20 50 20 70 q40 20 70 0 q30 10 60 0 q30 20 60 0 q40 -20 30 -70 q30 -40 0 -80 q20 -40 -10 -80 Q110 -995 0 -995 Q-110 -995 -140 -880 Z" fill="${d}" stroke="${OL}" stroke-width="${W}"/>`;
      default: return '';
    }
  }

  function hairFront(style, c) {
    const hl = shade(c, 0.18);
    const s = `stroke="${OL}" stroke-width="${W}" stroke-linejoin="round"`;
    switch (style) {
      case 'short': return `<path d="M-120 -842 Q-128 -960 -40 -985 Q40 -1005 104 -960 Q130 -930 120 -842 Q112 -892 86 -905 Q30 -880 -40 -918 Q-80 -900 -100 -880 Q-114 -862 -120 -842 Z" fill="${c}" ${s}/><path d="M-50 -968 Q10 -985 70 -962" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round"/>`;
      case 'quiff': return `<path d="M-120 -842 Q-130 -960 -50 -990 Q-20 -1035 50 -1020 Q120 -1000 120 -930 L120 -842 Q110 -895 80 -905 Q40 -935 -10 -925 Q-60 -905 -100 -880 Z" fill="${c}" ${s}/><path d="M-20 -1000 Q40 -1010 90 -975" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round"/>`;
      case 'buzz': return `<path d="M-116 -850 Q-118 -965 0 -975 Q118 -965 116 -850 Q100 -905 0 -918 Q-100 -905 -116 -850 Z" fill="${c}" ${s} opacity="0.95"/>`;
      case 'curly': {
        let d = 'M-124 -846 ';
        const pts = [[-138, -900], [-120, -955], [-80, -990], [-30, -1008], [25, -1008], [75, -992], [115, -960], [135, -905], [124, -846]];
        pts.forEach((p) => { d += `Q${p[0] * 1.08} ${p[1] - 18} ${p[0]} ${p[1]} `; });
        d += 'Q100 -900 60 -905 Q20 -880 -20 -905 Q-60 -880 -100 -895 Z';
        return `<path d="${d}" fill="${c}" ${s}/>`;
      }
      case 'bun': return `<circle cx="0" cy="-1010" r="48" fill="${c}" ${s}/><path d="M-30 -1040 q30 -12 60 4" fill="none" stroke="${hl}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M-118 -850 Q-124 -968 0 -978 Q124 -968 118 -850 Q104 -920 40 -932 Q10 -905 -20 -930 Q-90 -925 -118 -850 Z" fill="${c}" ${s}/><path d="M-40 -955 Q0 -965 50 -952" fill="none" stroke="${hl}" stroke-width="5" stroke-linecap="round"/>`;
      case 'long': case 'curlylong': return `<path d="M-128 -800 Q-138 -980 0 -990 Q138 -980 128 -800 Q120 -900 60 -922 Q0 -905 -30 -935 Q-110 -910 -128 -800 Z" fill="${c}" ${s}/><path d="M-60 -960 Q0 -975 60 -958" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round"/>`;
      case 'bob': return `<path d="M-132 -800 Q-140 -985 0 -992 Q140 -985 132 -800 Q118 -880 100 -905 L-40 -915 Q-100 -900 -132 -800 Z" fill="${c}" ${s}/><path d="M-60 -965 Q0 -978 60 -962" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round"/>`;
      case 'ponytail': return `<path d="M-118 -850 Q-124 -970 0 -980 Q124 -970 118 -850 Q100 -915 30 -928 Q-60 -915 -118 -850 Z" fill="${c}" ${s}/>`;
      case 'side': return `<path d="M-122 -830 Q-132 -975 0 -985 Q128 -975 120 -860 Q110 -910 40 -930 Q-40 -890 -90 -900 Q-114 -870 -122 -830 Z" fill="${c}" ${s}/><path d="M-40 -960 Q20 -975 80 -950" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round"/>`;
      case 'balding': return `<path d="M-122 -830 Q-126 -890 -104 -905 Q-112 -860 -116 -830 Z M122 -830 Q126 -890 104 -905 Q112 -860 116 -830 Z" fill="${c}" ${s}/><path d="M-30 -950 q30 -10 55 0" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="7" stroke-linecap="round"/>`;
      case 'bald': return `<path d="M-30 -950 q30 -10 55 0" fill="none" stroke="#ffffff" stroke-opacity="0.5" stroke-width="7" stroke-linecap="round"/>`;
      default: return '';
    }
  }

  function hat(kind, c) {
    const s = `stroke="${OL}" stroke-width="${W}" stroke-linejoin="round"`;
    const d = shade(c, -0.2);
    switch (kind) {
      case 'cap': return `<path d="M-126 -888 Q-128 -1010 0 -1018 Q128 -1010 126 -888 Z" fill="${c}" ${s}/><path d="M60 -900 Q170 -905 200 -878 Q150 -868 60 -880 Z" fill="${d}" ${s}/><circle cx="0" cy="-1018" r="9" fill="${d}" ${s}/>`;
      case 'beanie': return `<path d="M-128 -870 Q-132 -1030 0 -1035 Q132 -1030 128 -870 Z" fill="${c}" ${s}/><rect x="-134" y="-905" width="268" height="44" rx="14" fill="${d}" ${s}/><circle cx="0" cy="-1042" r="22" fill="${d}" ${s}/>`;
      case 'bucket': return `<path d="M-100 -900 Q-104 -1010 0 -1015 Q104 -1010 100 -900 Z" fill="${c}" ${s}/><path d="M-160 -880 Q0 -930 160 -880 L120 -905 Q0 -935 -120 -905 Z" fill="${d}" ${s}/><path d="M-100 -950 Q0 -970 100 -950" stroke="#fff" stroke-width="10" fill="none"/>`;
      case 'chef': return `<rect x="-90" y="-990" width="180" height="70" fill="#fff" ${s}/><path d="M-100 -990 q-40 -60 20 -90 q20 -50 80 -30 q60 -20 80 30 q60 30 20 90 Z" fill="#fff" ${s}/>`;
      case 'cowboy': return `<path d="M-90 -930 Q-90 -1050 0 -1040 Q90 -1050 90 -930 Z" fill="${c}" ${s}/><path d="M-200 -930 Q-170 -880 0 -895 Q170 -880 200 -930 Q170 -905 0 -915 Q-170 -905 -200 -930 Z" fill="${d}" ${s}/>`;
      case 'tophat': return `<rect x="-80" y="-1110" width="160" height="200" rx="6" fill="${c}" ${s}/><rect x="-80" y="-960" width="160" height="34" fill="${d}"/><ellipse cx="0" cy="-912" rx="150" ry="22" fill="${c}" ${s}/>`;
      case 'party': return `<path d="M-60 -950 L0 -1120 L60 -950 Z" fill="${c}" ${s}/><circle cx="0" cy="-1124" r="14" fill="#fff" ${s}/>`;
      case 'fedora': return `<path d="M-96 -905 Q-100 -1030 -40 -1036 Q0 -1010 40 -1036 Q100 -1030 96 -905 Z" fill="${c}" ${s}/><rect x="-98" y="-945" width="196" height="30" fill="${d}" ${s}/><path d="M-190 -900 Q0 -950 190 -900 Q160 -880 0 -905 Q-160 -880 -190 -900 Z" fill="${c}" ${s}/>`;
      case 'headset': return `<path d="M-128 -850 Q-130 -1000 0 -1004 Q130 -1000 128 -850" fill="none" stroke="${OL}" stroke-width="14"/><rect x="-146" y="-880" width="30" height="64" rx="12" fill="${c}" ${s}/><rect x="116" y="-880" width="30" height="64" rx="12" fill="${c}" ${s}/>`;
      default: return '';
    }
  }

  function top(p, shoulderW, waistW, bodyLen) {
    const c = p.topColor || '#8fb27a', d = shade(c, -0.16), y0 = -665, y1 = y0 + bodyLen;
    const sw = shoulderW, ww = waistW;
    const s = `stroke="${OL}" stroke-width="${W}" stroke-linejoin="round"`;
    const body = `M${-sw} ${y0 + 30} Q${-sw} ${y0} ${-sw + 40} ${y0 - 4} L${sw - 40} ${y0 - 4} Q${sw} ${y0} ${sw} ${y0 + 30} L${ww} ${y1} Q0 ${y1 + 10} ${-ww} ${y1} Z`;
    let out = `<path d="${body}" fill="${c}" ${s}/>`;
    const kind = p.top || 'tee';
    if (kind === 'hoodie') {
      out += `<path d="M-60 ${y0 - 4} Q0 ${y0 + 46} 60 ${y0 - 4}" fill="${d}" ${s}/>` +
        `<path d="M-22 ${y0 + 30} L-26 ${y0 + 110} M22 ${y0 + 30} L26 ${y0 + 110}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="M${-ww + 30} ${y1 - 80} L${ww - 30} ${y1 - 80} L${ww - 50} ${y1 - 18} L${-ww + 50} ${y1 - 18} Z" fill="${d}" stroke="${OL}" stroke-width="4"/>`;
    } else if (kind === 'button') {
      out += `<path d="M0 ${y0 + 8} L0 ${y1 + 4}" stroke="${OL}" stroke-width="3"/>` +
        [40, 100, 160, 220].filter((v) => y0 + v < y1 - 10).map((v) => `<circle cx="10" cy="${y0 + v}" r="4.5" fill="${OL}"/>`).join('') +
        `<path d="M-52 ${y0 - 6} L-8 ${y0 + 40} L-30 ${y0 + 56} Z M52 ${y0 - 6} L8 ${y0 + 40} L30 ${y0 + 56} Z" fill="${shade(c, 0.25)}" ${s}/>`;
    } else if (kind === 'blazer') {
      const sh = p.top2 || '#ffffff';
      out += `<path d="M-46 ${y0 - 4} L46 ${y0 - 4} L22 ${y1 - 60} L-22 ${y1 - 60} Z" fill="${sh}" ${s}/>` +
        `<path d="M-46 ${y0 - 4} L-4 ${y0 + 130} L-60 ${y0 + 60} Z M46 ${y0 - 4} L4 ${y0 + 130} L60 ${y0 + 60} Z" fill="${d}" ${s}/>` +
        `<path d="M0 ${y0 + 130} L0 ${y1}" stroke="${OL}" stroke-width="4"/><circle cx="-10" cy="${y0 + 170}" r="5" fill="${OL}"/>`;
    } else if (kind === 'sweater') {
      out += `<path d="M-48 ${y0 - 6} Q0 ${y0 + 26} 48 ${y0 - 6}" fill="${d}" ${s}/><path d="M${-ww + 4} ${y1 - 22} L${ww - 4} ${y1 - 22}" stroke="${d}" stroke-width="16"/>`;
    } else if (kind === 'polo') {
      out += `<path d="M-46 ${y0 - 6} L-4 ${y0 + 34} L-34 ${y0 + 46} Z M46 ${y0 - 6} L4 ${y0 + 34} L34 ${y0 + 46} Z" fill="${shade(c, 0.2)}" ${s}/><path d="M0 ${y0 + 34} L0 ${y0 + 90}" stroke="${OL}" stroke-width="3"/>`;
    } else if (kind === 'dress') {
      out += `<path d="M${-ww} ${y1 - 2} L${-ww - 50} ${y1 + 190} Q0 ${y1 + 210} ${ww + 50} ${y1 + 190} L${ww} ${y1 - 2} Z" fill="${c}" ${s}/>`;
    } else if (kind === 'jersey') {
      out += `<path d="M-50 ${y0 - 6} Q0 ${y0 + 30} 50 ${y0 - 6}" fill="none" stroke="${p.top2 || '#fff'}" stroke-width="10"/><text x="0" y="${y0 + 150}" font-family="Oswald" font-weight="700" font-size="90" text-anchor="middle" fill="${p.top2 || '#fff'}" stroke="${OL}" stroke-width="3">${p.number || 7}</text>`;
    } else { // tee
      out += `<path d="M-46 ${y0 - 6} Q0 ${y0 + 30} 46 ${y0 - 6}" fill="${d}" ${s}/>`;
    }
    if (p.logo) out += `<image href="assets/logo.png" x="-52" y="${y0 + 52}" width="104" height="95" preserveAspectRatio="xMidYMid meet"/>`;
    if (p.graphic) out += `<g transform="translate(0 ${y0 + 110})">${p.graphic}</g>`;
    if (p.acc === 'apron') {
      const ac = p.accColor || '#ffffff';
      out += `<path d="M-74 ${y0 + 70} L74 ${y0 + 70} L${ww - 6} ${y1 + 120} L${-ww + 6} ${y1 + 120} Z" fill="${ac}" ${s}/><path d="M-74 ${y0 + 70} L-40 ${y0} M74 ${y0 + 70} L40 ${y0}" stroke="${OL}" stroke-width="5"/>` +
        `<rect x="-46" y="${y1 - 40}" width="92" height="60" rx="6" fill="${shade(ac, -0.08)}" stroke="${OL}" stroke-width="4"/>`;
    }
    if (p.acc === 'tie') out += `<path d="M-10 ${y0} L10 ${y0} L16 ${y0 + 140} L0 ${y0 + 162} L-16 ${y0 + 140} Z" fill="${p.accColor || '#c0392b'}" ${s}/>`;
    if (p.acc === 'necklace') out += `<path d="M-40 ${y0} Q0 ${y0 + 60} 40 ${y0}" fill="none" stroke="#f0c34a" stroke-width="5"/><circle cx="0" cy="${y0 + 30}" r="8" fill="#f0c34a" stroke="${OL}" stroke-width="3"/>`;
    if (p.acc === 'lanyard') out += `<path d="M-36 ${y0} L-8 ${y0 + 130} M36 ${y0} L8 ${y0 + 130}" stroke="#3a6fd8" stroke-width="7"/><rect x="-26" y="${y0 + 126}" width="52" height="64" rx="5" fill="#fff" stroke="${OL}" stroke-width="4"/>`;
    return out;
  }

  // Seeded hash for deterministic per-character variation
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  // params: see README. state: {expr, pose, talk (0..1), blink (0..1), look [x,y], tilt, breath (0..1 phase), sway, walk(phase|null), item}
  function draw(p, st) {
    st = st || {};
    const skin = p.skin && p.skin[0] === '#' ? p.skin : SKIN[p.skin == null ? 1 : p.skin] || SKIN[1];
    const hairC = HAIR[p.hairColor] || p.hairColor || HAIR.brown;
    const ex = EXPR[st.expr] || EXPR.neutral;
    const isF = p.body === 'f';
    const build = p.build || 'avg';
    const bw = build === 'slim' ? -12 : build === 'big' ? 26 : 0;
    const shoulderW = (isF ? 98 : 110) + bw;
    const waistW = (isF ? 82 : 96) + bw * 1.4;
    const bodyLen = isF ? 270 : 275;
    const hipY = -665 + bodyLen;
    const elder = p.age === 'elder';
    const breath = Math.sin((st.breath || 0) * Math.PI * 2);

    let g = '';
    // ---- legs
    const legC = p.bottomColor || '#3f5f9e';
    const legW = (isF ? 58 : 64) + (build === 'big' ? 10 : 0);
    const walk = st.walk;
    const lx = isF ? 36 : 42;
    let footL = [-lx, -16], footR = [lx, -16];
    if (walk != null) {
      const ph = walk * Math.PI * 2;
      footL = [-lx + Math.sin(ph) * 46, -16 - Math.max(0, Math.cos(ph)) * 30];
      footR = [lx - Math.sin(ph) * 46, -16 - Math.max(0, -Math.cos(ph)) * 30];
    }
    const pantsShort = p.bottom === 'shorts' || p.bottom === 'skirt';
    const legPart = (hx, f) => {
      if (pantsShort) {
        return limb([[hx, hipY], [hx * 0.9 + f[0] * 0.1, hipY + 130]], legW, legC, 'butt') + limb([[hx * 0.9 + f[0] * 0.1, hipY + 120], [f[0], f[1] - 20]], legW - 18, skin);
      }
      return limb([[hx, hipY - 10], [f[0], f[1] - 24]], legW, legC, 'butt');
    };
    g += legPart(-lx, footL) + legPart(lx, footR);
    if (p.bottom === 'jeans') g += `<path d="M${-lx} ${hipY + 40} L${footL[0]} ${footL[1] - 40} M${lx} ${hipY + 40} L${footR[0]} ${footR[1] - 40}" stroke="${shade(legC, 0.18)}" stroke-width="3" stroke-dasharray="2 16" opacity="0.6"/>`;
    if (p.bottom === 'skirt') g += `<path d="M${-waistW} ${hipY - 6} L${-waistW - 34} ${hipY + 150} Q0 ${hipY + 166} ${waistW + 34} ${hipY + 150} L${waistW} ${hipY - 6} Z" fill="${legC}" stroke="${OL}" stroke-width="${W}" stroke-linejoin="round"/>`;
    // hips block to join legs
    if (!pantsShort || p.bottom === 'shorts') g += `<path d="M${-waistW + 2} ${hipY - 30} L${waistW - 2} ${hipY - 30} L${waistW - 4} ${hipY + 40} L${-waistW + 4} ${hipY + 40} Z" fill="${legC}" stroke="${OL}" stroke-width="${W}" stroke-linejoin="round"/>` +
      `<path d="M0 ${hipY + 4} L0 ${hipY + 40}" stroke="${OL}" stroke-width="3"/>`;
    // shoes
    const shoeC = p.shoes === 'boots' ? '#4a3426' : p.shoes === 'dark' ? '#2d2d33' : p.shoes === 'heels' ? (p.shoeColor || '#c0392b') : '#ffffff';
    const shoe = (f, side) => `<path d="M${f[0] - 40} ${f[1] + 14} Q${f[0] - 42} ${f[1] - 26} ${f[0] - 4} ${f[1] - 30} Q${f[0] + 34 * 1} ${f[1] - 28} ${f[0] + 44} ${f[1] + 2} L${f[0] + 44} ${f[1] + 14} Z" fill="${shoeC}" stroke="${OL}" stroke-width="${W}" stroke-linejoin="round" transform="${side < 0 ? `scale(-1 1) translate(${-2 * f[0]} 0)` : ''}"/>` +
      (p.shoes ? '' : `<path d="M${f[0] - 40} ${f[1] + 4} L${f[0] + 44} ${f[1] + 4}" stroke="#cfd3da" stroke-width="5"/>`);
    g += shoe(footL, -1) + shoe(footR, 1);

    // ---- torso (with breathing)
    const by = breath * 3;
    g += `<g transform="translate(0 ${f1(by * 0.7)}) rotate(${f1(st.tilt || 0)} 0 -700)">${hairBack(p.hair, hairC)}</g>`;
    g += `<g transform="translate(0 ${f1(by * 0.4)})">`;
    g += `<rect x="-24" y="-720" width="48" height="70" fill="${skin}" stroke="${OL}" stroke-width="${W}"/>`;
    g += `<path d="M-24 -690 Q0 -676 24 -690" fill="none" stroke="${shade(skin, -0.15)}" stroke-width="8"/>`;
    g += top(p, shoulderW, waistW, bodyLen);
    g += '</g>';

    // ---- arms
    const pose = POSES[st.pose] || POSES.idle;
    const sleeveLong = !(p.top === 'tee' || p.top === 'polo' || p.top === 'jersey' || p.sleeves === 'short');
    const armC = p.topColor || '#8fb27a';
    const armW = (isF ? 44 : 50) + (build === 'big' ? 8 : 0);
    const armsOut = [];
    ['L', 'R'].forEach((side) => {
      const sg = side === 'L' ? -1 : 1;
      let [hx, hy, hk, eb] = pose[side];
      const gx = (st.gesture && st.gesture[side]) || [0, 0];
      hx += gx[0]; hy += gx[1];
      if (st.item && hk === 'grip') hk = 'grip';
      const sx = sg * (shoulderW - 20), sy = -638 + by * 0.4;
      const sols = ik(sx, sy, hx, hy, 156, 150);
      const outward = (e) => sg * e.ex + 1.25 * e.ey;
      sols.sort((a, b) => outward(b) - outward(a));
      const j = eb === 'd' ? (sols[0].ey > sols[1].ey ? sols[0] : sols[1]) : (eb != null && eb < 0) ? sols[1] : sols[0];
      const ang = Math.atan2(j.hy - j.ey, j.hx - j.ex);
      let a = '';
      if (sleeveLong) {
        a += limb([[sx, sy], [j.ex, j.ey], [j.hx - Math.cos(ang) * 14, j.hy - Math.sin(ang) * 14]], armW, armC);
        a += `<path d="M${f1(j.hx - Math.cos(ang) * 22 + Math.sin(ang) * armW * 0.5)} ${f1(j.hy - Math.sin(ang) * 22 - Math.cos(ang) * armW * 0.5)} L${f1(j.hx - Math.cos(ang) * 22 - Math.sin(ang) * armW * 0.5)} ${f1(j.hy - Math.sin(ang) * 22 + Math.cos(ang) * armW * 0.5)}" stroke="${shade(armC, -0.18)}" stroke-width="6"/>`;
      } else {
        const mx = sx + (j.ex - sx) * 0.55, my = sy + (j.ey - sy) * 0.55;
        a += limb([[mx, my], [j.ex, j.ey], [j.hx, j.hy]], armW - 10, skin);
        a += limb([[sx, sy - 6], [mx, my]], armW + 8, armC, 'round');
      }
      a += hand(j.hx, j.hy, hk, skin, ang, sg);
      armsOut.push(a);
    });

    // ---- head
    const tilt = st.tilt || 0;
    const look = st.look || ex.look || [0, 0];
    let h = '';
    // ears
    h += `<ellipse cx="-114" cy="-838" rx="19" ry="27" fill="${skin}" stroke="${OL}" stroke-width="${W}"/><ellipse cx="114" cy="-838" rx="19" ry="27" fill="${skin}" stroke="${OL}" stroke-width="${W}"/>`;
    if (p.earrings) h += `<circle cx="-116" cy="-806" r="7" fill="#f0c34a" stroke="${OL}" stroke-width="3"/><circle cx="116" cy="-806" r="7" fill="#f0c34a" stroke="${OL}" stroke-width="3"/>`;
    const jaw = isF ? 80 : 88;
    h += `<path d="M0 -965 C72 -965 116 -918 116 -852 C116 -790 ${jaw} -728 0 -706 C${-jaw} -728 -116 -790 -116 -852 C-116 -918 -72 -965 0 -965 Z" fill="${skin}" stroke="${OL}" stroke-width="${W}"/>`;
    // facial hair (under features)
    const fh = p.facial;
    if (fh === 'beard' || fh === 'fullbeard') h += `<path d="M-112 -840 Q-110 -740 -60 -712 Q0 -680 60 -712 Q110 -740 112 -840 Q100 -770 60 -765 Q0 -790 -60 -765 Q-100 -770 -112 -840 Z" fill="${hairC}" stroke="${OL}" stroke-width="${W - 1}"/>`;
    if (fh === 'stubble') h += `<path d="M-100 -800 Q-80 -722 0 -712 Q80 -722 100 -800 Q60 -760 0 -760 Q-60 -760 -100 -800 Z" fill="${shade(skin, -0.22)}" opacity="0.45"/>`;
    // blush
    h += `<ellipse cx="-66" cy="-800" rx="17" ry="9" fill="#f08a8a" opacity="${isF ? 0.5 : 0.32}"/><ellipse cx="66" cy="-800" rx="17" ry="9" fill="#f08a8a" opacity="${isF ? 0.5 : 0.32}"/>`;
    if (elder) h += `<path d="M-82 -880 q14 6 26 0 M56 -880 q14 6 26 0 M-90 -790 q10 16 4 30 M90 -790 q-10 16 -4 30" fill="none" stroke="${shade(skin, -0.3)}" stroke-width="3" stroke-linecap="round"/>`;
    // eyes
    const es = ex.es || 1;
    const blink = st.blink || 0;
    const eyeC = p.eyeColor || '#4a2f22';
    [-1, 1].forEach((sg) => {
      const cx = sg * 43, cy = -850;
      const rx = 25 * es, ry = 29 * es;
      if (ex.arcs || blink > 0.85) {
        const up = ex.arcs ? -1 : 1;
        h += `<path d="M${cx - 22} ${cy + 4} Q${cx} ${cy + 4 + up * 20} ${cx + 22} ${cy + 4}" fill="none" stroke="${OL}" stroke-width="${W}" stroke-linecap="round"/>`;
        return;
      }
      const clipId = `e${sg > 0 ? 'r' : 'l'}${Math.round(hash(JSON.stringify(p)) * 1e6)}`;
      h += `<defs><clipPath id="${clipId}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath></defs>`;
      h += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/>`;
      const px = cx + look[0] * 9, py = cy + 4 + look[1] * 9;
      const pr = 15 * (ex.pup || 1);
      h += `<g clip-path="url(#${clipId})"><circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(pr)}" fill="${eyeC}"/><circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(pr * 0.55)}" fill="#1b1416"/><circle cx="${f1(px + 5)}" cy="${f1(py - 6)}" r="5" fill="#fff"/>`;
      // lids
      const topLid = Math.max(ex.top || 0, blink);
      if (topLid > 0) h += `<rect x="${cx - rx - 2}" y="${cy - ry - 2}" width="${rx * 2 + 4}" height="${f1((ry * 2 + 4) * topLid)}" fill="${skin}"/>`;
      if (ex.bot) h += `<ellipse cx="${cx}" cy="${cy + ry * 1.25}" rx="${rx * 1.2}" ry="${ry * (0.35 + ex.bot)}" fill="${skin}"/>`;
      h += `</g>`;
      h += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${OL}" stroke-width="${W - 1}"/>`;
      if (topLid > 0) { const ly = cy - ry + (ry * 2) * topLid; h += `<path d="M${cx - rx} ${f1(ly)} Q${cx} ${f1(ly - 4)} ${cx + rx} ${f1(ly)}" fill="none" stroke="${OL}" stroke-width="${W}" stroke-linecap="round"/>`; }
      else h += `<path d="M${cx - rx - 2} ${cy - ry * 0.35} Q${cx - rx * 0.6} ${cy - ry - 4} ${cx + rx * 0.4} ${cy - ry - 2}" fill="none" stroke="${OL}" stroke-width="${W + 1.5}" stroke-linecap="round" transform="${sg > 0 ? `scale(-1 1) translate(${-2 * cx} 0)` : ''}"/>`;
      if (isF && topLid < 0.5) h += `<path d="M${cx + sg * (rx - 2)} ${cy - ry * 0.6} l${sg * 12} -8" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`;
    });
    if (ex.sparkle) h += `<path d="M-150 -940 l8 18 l18 8 l-18 8 l-8 18 l-8 -18 l-18 -8 l18 -8 Z" fill="#ffd84a" stroke="${OL}" stroke-width="3"/>`;
    // brows
    const browC = p.hair === 'bald' || p.hair === 'balding' ? shade(hairC, -0.1) : shade(hairC, -0.12);
    [-1, 1].forEach((sg) => {
      const cx = sg * 43;
      let yi = -893 + (ex.bi || 0), yo = -895 + (ex.bo || 0);
      if (ex.brow1 && sg > 0) { yi += ex.brow1; yo += ex.brow1; }
      const xi = cx - sg * 22, xo = cx + sg * 24;
      h += `<path d="M${xi} ${yi} Q${cx} ${Math.min(yi, yo) - 8} ${xo} ${yo}" fill="none" stroke="${browC}" stroke-width="${isF ? 7 : 9}" stroke-linecap="round"/>`;
    });
    // nose
    h += `<path d="M-4 -828 Q-14 -806 -2 -800 Q8 -798 12 -804" fill="none" stroke="${OL}" stroke-width="4" stroke-linecap="round"/>`;
    if (fh === 'mustache' || fh === 'fullbeard') h += `<path d="M-46 -778 Q-30 -800 0 -790 Q30 -800 46 -778 Q30 -770 0 -780 Q-30 -770 -46 -778 Z" fill="${hairC}" stroke="${OL}" stroke-width="4"/>`;
    // mouth
    const talk = st.talk || 0;
    let mk = ex.mouth;
    h += mouthPath(mk, talk, 0, -772, 44);
    if (p.lipstick && !(talk > 0.05)) h = h; // reserved
    // glasses
    if (p.glasses) {
      const gc = p.glassesColor || OL;
      const shp = p.glasses === 'round'
        ? `<circle cx="-43" cy="-850" r="36"/><circle cx="43" cy="-850" r="36"/>`
        : `<rect x="-84" y="-882" width="78" height="62" rx="16"/><rect x="6" y="-882" width="78" height="62" rx="16"/>`;
      h += `<g fill="#ffffff" fill-opacity="0.18" stroke="${gc}" stroke-width="7">${shp}</g><path d="M-8 -856 Q0 -864 8 -856 M-84 -856 L-114 -862 M84 -856 L114 -862" stroke="${gc}" stroke-width="6" fill="none"/>`;
    }
    if (ex.sweat) h += `<path d="M118 -930 Q132 -900 128 -888 A12 12 0 1 1 108 -892 Q110 -905 118 -930 Z" fill="#8fd3ff" stroke="${OL}" stroke-width="3.5"/>`;
    h += hairFront(p.hair, hairC);
    if (p.hat) h += hat(p.hat, p.hatColor || '#e8743b');

    const headG = `<g transform="translate(0 ${f1(by * 0.7)}) rotate(${f1(tilt)} 0 -700)">${h}</g>`;

    // order: arms that go behind? keep in front for clarity, except crossed pose draws L behind
    let body = g + headG + armsOut.join('');
    if (st.item) body += `<g transform="translate(0 -560)">${st.item}</g>`;
    // ground shadow
    const shadow = `<ellipse cx="0" cy="6" rx="${isF ? 120 : 132}" ry="18" fill="#000" opacity="0.14"/>`;
    const scale = p.age === 'kid' ? 0.68 : (p.height || 1);
    const sway = st.sway || 0;
    const sq = st.squash || 0;
    return `<g transform="scale(${f1((1 + sq * 0.05) * scale * 1000) / 1000} ${f1((1 - sq * 0.07) * scale * 1000) / 1000})">${shadow}<g transform="rotate(${f1(sway)} 0 0)">${body}</g></g>`;
  }

  // head-only (for circle insets / face bubbles)
  function face(p, st) {
    const full = draw(p, Object.assign({}, st, { pose: 'idle' }));
    return full;
  }

  window.Rig = { draw, face, POSES, EXPR, SKIN, HAIR, shade, OL, W, hash };
})();
