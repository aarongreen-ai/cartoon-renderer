#!/usr/bin/env node
// Runs on the render machine (GitHub Actions). Turns an episode file into an mp4.
// usage: node render_episode.js episodes/s1d1.json out.mp4
// Each line in the episode has: who, text, audio (URL of the ElevenLabs mp3), words: [{w, s, e}] relative to that mp3.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [, , epPath, outMp4] = process.argv;
const here = __dirname;
const ep = JSON.parse(fs.readFileSync(epPath, 'utf8'));
const work = path.join(here, 'work');
fs.rmSync(work, { recursive: true, force: true });
fs.mkdirSync(path.join(work, 'dl'), { recursive: true });
const TEMPO = ep.tempo || 1.08;      // light speed-up, like the friend's 1.15x but gentler for ElevenLabs v3
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const dur = (f) => parseFloat(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]));

async function dl(url, file) {
  if (!/^https?:/i.test(url)) { fs.copyFileSync(path.join(here, url), file); return file; }  // file kept in this repo (assets/sfx/...)
  // Shopify can take a minute to finish processing freshly uploaded files, so keep retrying for about 2.5 minutes.
  let last = '';
  for (let i = 0; i < 9; i++) {
    try { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); return file; }
    catch (e) { last = e.message; console.log('download retry', i + 1, url, last); await new Promise((r) => setTimeout(r, 5000 + i * 2500)); }
  }
  throw new Error('download failed ' + url + ' ' + last);
}


// ---------- 0. clean up the writer's directions so nothing unknown reaches the drawing code
function sanitize(ep) {
  global.window = global.window || {};
  require('./lib/rig.js'); require('./lib/sets.js');
  const R = window.Rig, S = window.Sets;
  const cast = ep.season.cast || {}, sets = ep.season.sets || {};
  const setIds = Object.keys(sets); const firstSet = setIds.find((k) => sets[k].type !== 'blank') || setIds[0] || 'studio';
  const nL = ep.lines.length;
  const fixA = (a) => { if (!a || typeof a !== 'object') return { line: 0 }; if (a.line != null) a.line = Math.max(0, Math.min(nL - 1, a.line | 0)); return a; };
  const okPose = (p) => (R.POSES[p] ? p : 'idle'), okExpr = (e) => (R.EXPR[e] ? e : 'neutral');
  ep.beats = (ep.beats || []).filter((b) => b && b.at).map((b) => {
    b.at = fixA(b.at);
    if (!sets[b.set]) b.set = firstSet;
    b.cast = (b.cast || []).filter((c) => c && cast[c.id] && cast[c.id].params).slice(0, 4).map((c) => Object.assign(c, { pose: okPose(c.pose), expr: okExpr(c.expr), x: c.x == null ? null : Math.max(0.08, Math.min(0.92, +c.x)), item: S.PROPS[c.item] ? c.item : null }));
    const [k, who] = String(b.cam || 'wide').split(':');
    if (!['wide', 'two', 'med', 'close', 'set'].includes(k) || ((k === 'med' || k === 'close') && !b.cast.some((c) => c.id === who))) b.cam = 'wide';
    if (!['push', 'pull', 'pan_left', 'pan_right', 'drift'].includes(b.move)) b.move = null;
    b.props = (b.props || []).filter((p) => p && S.PROPS[p.prop]);
    if (b.shake) b.shake = fixA(b.shake);
    const blank = sets[b.set] && sets[b.set].type === 'blank';
    b.fx = [].concat(b.fx || []).filter((f) => !(blank && (f === 'dark' || /^spot:/.test(f)))).filter((f) => /^(dark|flicker|fog|red)$/.test(f) || (/^spot:/.test(f) && b.cast.some((c) => 'spot:' + c.id === f)));
    return b;
  });
  if (!ep.beats.length) ep.beats = [{ at: { line: 0 }, set: firstSet, cam: 'wide', cast: [{ id: ep.season.hero, expr: 'neutral', pose: 'idle' }] }];
  ep.reacts = (ep.reacts || []).filter((r) => r && r.at && cast[r.id]).map((r) => Object.assign(r, { at: fixA(r.at), expr: r.expr ? okExpr(r.expr) : undefined, pose: r.pose ? okPose(r.pose) : undefined }));
  const TYPES = ['scare', 'tag', 'price', 'money', 'big', 'stamp', 'stats', 'receipt', 'comment', 'vote', 'phone', 'face', 'product', 'arrow'];
  ep.pops = (ep.pops || []).filter((p) => p && p.at).map((p) => { p.at = fixA(p.at); if (p.until) p.until = fixA(p.until); if (!TYPES.includes(p.type)) p.type = 'tag'; if (p.type === 'face' && !cast[p.id]) p.type = 'tag'; if (p.near && !cast[p.near]) delete p.near; if (p.dur) p.dur = Math.max(0.8, Math.min(4, +p.dur || 2)); return p; }).slice(0, 45);
  ep.hud_events = (ep.hud_events || []).filter((h) => h && h.at).map((h) => Object.assign(h, { at: fixA(h.at) }));
  ep.sfx = (ep.sfx || []).filter((x) => x && x.at && x.name).map((x) => Object.assign(x, { at: fixA(x.at) })).slice(0, 8);
  if (ep.vote && ep.vote.at) ep.vote.at = fixA(ep.vote.at);
  return ep;
}

(async () => {
  sanitize(ep);
  // ---------- 1. voice track
  const segs = [];
  let cursor = 0.2;
  const sil = (s, name) => { const f = path.join(work, name); sh('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', s.toFixed(3), '-y', f]); return f; };
  segs.push(sil(0.2, 'lead.wav'));
  for (let i = 0; i < ep.lines.length; i++) {
    const ln = ep.lines[i];
    const src = await dl(ln.audio, path.join(work, 'dl', `l${i}.mp3`));
    const d = dur(src);
    const ws = (ln.words || []).filter((w) => w.e > w.s);
    const a = ws.length ? Math.max(0, ws[0].s - 0.05) : 0;
    const b = ws.length ? Math.min(d, ws[ws.length - 1].e + 0.12) : d;
    const out = path.join(work, `l${i}.wav`);
    sh('ffmpeg', ['-v', 'error', '-ss', a.toFixed(3), '-to', b.toFixed(3), '-i', src, '-ac', '1', '-ar', '44100', '-af', 'afade=t=in:d=0.02,areverse,afade=t=in:d=0.04,areverse', '-y', out]);
    const len = dur(out);
    ln.start = cursor;
    ln.words = ws.map((w) => ({ w: w.w, s: cursor + (w.s - a), e: cursor + (w.e - a) }));
    if (!ln.words.length) { // no timings: spread words evenly
      const parts = ln.text.split(/\s+/).filter(Boolean); const step = len / Math.max(1, parts.length);
      ln.words = parts.map((w, k) => ({ w, s: cursor + k * step, e: cursor + (k + 0.85) * step }));
    }
    cursor += len;
    ln.end = cursor;
    segs.push(out);
    const next = ep.lines[i + 1];
    if (next) {
      // pauses never longer than 0.3 s; quick back-and-forth gets less
      const gap = ln.gap != null ? ln.gap : next.who === ln.who ? 0.14 : 0.24;
      segs.push(sil(Math.min(0.3, gap), `g${i}.wav`));
      cursor += Math.min(0.3, gap);
    }
  }
  const list = path.join(work, 'concat.txt');
  fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join('\n'));
  const proj = path.join(here, 'proj');
  fs.rmSync(proj, { recursive: true, force: true });
  fs.mkdirSync(path.join(proj, 'assets'), { recursive: true });
  const voice = path.join(work, 'voice_raw.wav');
  sh('ffmpeg', ['-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-y', voice]);
  sh('ffmpeg', ['-v', 'error', '-i', voice, '-af', `atempo=${TEMPO},loudnorm=I=-15:TP=-1.5:LRA=9`, '-ar', '44100', '-b:a', '160k', '-y', path.join(work, 'voice.mp3')]);
  // scale all timings by tempo
  ep.lines.forEach((ln) => { ln.start /= TEMPO; ln.end /= TEMPO; ln.words.forEach((w) => { w.s /= TEMPO; w.e /= TEMPO; }); delete ln.audio; });
  const vlen = dur(path.join(work, 'voice.mp3'));
  const vote = ep.vote ? 2.8 : 0.8;
  ep.duration = Math.round((Math.max(vlen, ep.lines[ep.lines.length - 1].end) + vote) * 100) / 100;
  ep.voice = { src: 'assets/voice.mp3' };

  // ---------- 2. sound effects
  const L = ep.lines;
  const norm = (w) => String(w || '').toLowerCase().replace(/[^a-z0-9$%']/g, '').replace(/'/g, '');
  const anchor = (a, fb) => {
    if (a == null) return fb || 0; if (typeof a === 'number') return a; if (a.t != null) return a.t;
    const ln = L[Math.max(0, Math.min(L.length - 1, a.line | 0))]; if (!ln) return fb || 0;
    let t = ln.start; if (a.end) t = ln.end;
    else if (a.word) { const tg = norm(a.word); let n = a.n || 1; for (const w of ln.words) { const nw = norm(w.w); if (nw === tg || (tg.length > 2 && nw.startsWith(tg))) { n--; if (n === 0) { t = a.after_word ? w.e : w.s; break; } } } }
    return t + (a.after || 0);
  };
  const lib = ep.sfx_library || {};
  const want = [];
  (ep.sfx || []).forEach((s) => want.push({ name: s.name, t: anchor(s.at, 0) + (s.offset || 0), vol: s.vol || 0.45 }));
  // automatic: soft pop on pop-ins, cash on money, whoosh on set changes, ding on the vote card
  (ep.pops || []).forEach((p) => { const t = anchor(p.at, 0); if (p.type === 'scare') { want.push({ name: 'jump_scare', t, vol: 0.7 }); return; } const name = p.type === 'money' ? 'cash_register' : p.type === 'comment' || p.type === 'phone' ? 'phone_ding' : 'pop'; want.push({ name, t, vol: name === 'pop' ? 0.28 : 0.35, auto: true }); });
  let lastSet = null;
  (ep.beats || []).forEach((b, i) => { if (i > 0 && b.set !== lastSet) want.push({ name: 'whoosh', t: Math.max(0, anchor(b.at, 0) - 0.12), vol: 0.22, auto: true }); lastSet = b.set; });
  if (ep.vote) want.push({ name: 'ding', t: anchor(ep.vote.at, ep.duration - 3), vol: 0.4, auto: true });
  want.sort((a, b) => a.t - b.t);
  const res = []; let lastAuto = -9;
  for (const w of want) {
    if (!lib[w.name]) continue;
    if (w.auto && w.t - lastAuto < 0.35) continue;
    if (w.auto) lastAuto = w.t;
    res.push(w);
  }
  const got = {};
  for (const w of res) {
    if (!got[w.name]) { got[w.name] = `assets/sfx_${w.name}.mp3`; await dl(lib[w.name], path.join(proj, got[w.name])); }
    w.src = got[w.name];
  }
  ep.sfx_resolved = res.slice(0, 60).map((w) => ({ src: w.src, t: Math.max(0, w.t), vol: w.vol }));
  if (ep.ambience && ep.ambience.url) { await dl(ep.ambience.url, path.join(proj, 'assets', 'ambience.mp3')); ep.ambience = { src: 'assets/ambience.mp3', len: dur(path.join(proj, 'assets', 'ambience.mp3')), vol: ep.ambience.vol || 0.18 }; }
  if (ep.music && ep.music.url) { await dl(ep.music.url, path.join(proj, 'assets', 'music.mp3')); ep.music = { src: 'assets/music.mp3', vol: ep.music.vol || 0.09 }; }

  // ---------- 3. images used by pops (product photos, profile pics)
  let k = 0;
  for (const p of ep.pops || []) {
    if (p.img && /^https?:/.test(p.img)) { const f = `assets/img${k++}${/\.png/i.test(p.img) ? '.png' : '.jpg'}`; try { await dl(p.img, path.join(proj, f)); p.img = f; } catch (e) { p.img = 'assets/logo.png'; } }
  }

  // ---------- 4. build, check, render
  fs.copyFileSync(path.join(work, 'voice.mp3'), path.join(proj, 'assets', 'voice.mp3'));
  const epOut = path.join(work, 'episode.json');
  fs.writeFileSync(epOut, JSON.stringify(ep));
  const assetsKeep = fs.readdirSync(path.join(proj, 'assets'));
  const tmpAssets = path.join(work, 'keep'); fs.mkdirSync(tmpAssets, { recursive: true });
  assetsKeep.forEach((f) => fs.copyFileSync(path.join(proj, 'assets', f), path.join(tmpAssets, f)));
  console.log(sh('node', [path.join(here, 'build.js'), epOut, proj]));
  assetsKeep.forEach((f) => fs.copyFileSync(path.join(tmpAssets, f), path.join(proj, 'assets', f)));
  const hf = path.join(here, 'node_modules', '.bin', 'hyperframes');
  let check = '';
  try { check = sh(hf, ['check', proj, '--json']); } catch (e) { check = (e.stdout || '').toString(); }
  fs.writeFileSync(path.join(here, 'check.json'), check);
  execFileSync(hf, ['render', proj, '--output', outMp4, '--quality', 'looks', '--quiet'], { stdio: 'inherit' });
  fs.writeFileSync(path.join(here, 'timing.json'), JSON.stringify({ duration: ep.duration, lines: ep.lines.map((l) => ({ who: l.who, start: l.start, end: l.end })) }));
  console.log('done', outMp4, ep.duration);
})().catch((e) => { console.error(e); process.exit(1); });
