#!/usr/bin/env node
// Builds a HyperFrames project from an episode file.
// usage: node build.js episode.json outDir [--fake-timing]
// episode.json = { season, day, lines:[{who,text,key?,audio?,start?,end?,words?}], beats, reacts, pops, hud, hud_events, vote, rates, sfx:[{at,src,vol}], music:{src,vol}, voice:{src} }
const fs = require('fs');
const path = require('path');
const [, , epFile, outDir] = process.argv;
const fake = process.argv.includes('--fake-timing');
const ep = JSON.parse(fs.readFileSync(epFile, 'utf8'));
const here = __dirname;

fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(outDir, 'lib'), { recursive: true });
for (const f of ['rig.js', 'sets.js', 'engine.js', 'fonts.css']) fs.copyFileSync(path.join(here, 'lib', f), path.join(outDir, 'lib', f));
fs.cpSync(path.join(here, 'assets'), path.join(outDir, 'assets'), { recursive: true });

if (fake) {
  // ~2.9 words/sec with small gaps between lines
  let t = 0.25;
  ep.lines.forEach((ln) => {
    ln.start = t;
    ln.words = ln.text.split(/\s+/).filter(Boolean).map((w) => { const d = 0.16 + Math.min(0.5, w.length * 0.045); const o = { w, s: t, e: t + d }; t += d + 0.05; return o; });
    ln.end = t; t += 0.2;
  });
  ep.duration = Math.round((t + 2.6) * 100) / 100;
}
if (!ep.duration) ep.duration = Math.round((ep.lines[ep.lines.length - 1].end + 2.6) * 100) / 100;
const D = ep.duration;

const audio = [];
if (ep.voice && ep.voice.src) audio.push(`<audio id="voice" src="${ep.voice.src}" data-start="0" data-volume="1"></audio>`);
if (ep.music && ep.music.src) audio.push(`<audio id="music" src="${ep.music.src}" data-start="0" data-duration="${D}" data-volume="${ep.music.vol || 0.1}" data-fade-out="1.5"></audio>`);
if (ep.ambience && ep.ambience.src && ep.ambience.len) { const n = Math.ceil(D / ep.ambience.len); for (let k = 0; k < n; k++) audio.push(`<audio id="amb${k}" src="${ep.ambience.src}" data-start="${(k * ep.ambience.len).toFixed(3)}" data-volume="${ep.ambience.vol || 0.18}"${k === n - 1 ? ' data-fade-out="1.5"' : ''}></audio>`); }
(ep.sfx_resolved || []).forEach((s, i) => audio.push(`<audio id="sfx${i}" src="${s.src}" data-start="${s.t.toFixed(3)}" data-volume="${s.vol || 0.5}"></audio>`));

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="stylesheet" href="lib/fonts.css">
<style>html,body{margin:0;background:#000}#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:#f4eee2}#stage{position:absolute;left:0;top:0}</style>
</head><body>
<div id="root" data-composition-id="root" data-width="1080" data-height="1920" data-start="0" data-duration="${D}" data-no-timeline>
<svg id="stage" width="1080" height="1920" viewBox="0 0 1080 1920" data-layout-allow-overflow data-layout-allow-overlap data-layout-allow-safe-zone></svg>
${audio.join('\n')}
</div>
<script>window.EP = ${JSON.stringify(ep)};</script>
<script src="lib/rig.js"></script>
<script src="lib/sets.js"></script>
<script>
// wait for fonts before first draw so text measures right
window.__hf = window.__hf || {}; window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.fonts = document.fonts.ready;
</script>
<script src="lib/engine.js"></script>
</body></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
fs.writeFileSync(path.join(outDir, 'episode.resolved.json'), JSON.stringify(ep, null, 1));
console.log(JSON.stringify({ ok: true, duration: D, lines: ep.lines.length }));
