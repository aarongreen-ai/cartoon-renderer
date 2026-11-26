// Writes prompts/vocab.json from the drawing code, so the writers only use things that exist.
const fs = require('fs'); const path = require('path');
global.window = {};
require('../lib/rig.js'); require('../lib/sets.js');
const R = window.Rig, S = window.Sets;
const src = fs.readFileSync(path.join(__dirname, '../lib/rig.js'), 'utf8');
const cases = (fn) => { const a = src.indexOf('function ' + fn + '('); const b = src.indexOf('\n  }\n', a); return [...src.slice(a, b).matchAll(/case '([a-z]+)'/g)].map((m) => m[1]); };
const v = {
  poses: Object.keys(R.POSES),
  expressions: Object.keys(R.EXPR),
  set_types: Object.keys(S.SETS),
  props: Object.keys(S.PROPS),
  fx: ['dark', 'flicker', 'fog', 'red', 'spot:<character id>'],
  repo_sounds: (fs.existsSync(path.join(__dirname, '../assets/sfx')) ? fs.readdirSync(path.join(__dirname, '../assets/sfx')) : []).filter((f) => f.endsWith('.mp3')).map((f) => f.replace('.mp3', '')),
  rig: {
    body: ['m', 'f'], skin: '0 (lightest) to 6 (darkest)', age: ['adult', 'elder', 'kid'], build: ['slim', 'avg', 'big'], height: '0.9 to 1.08',
    hair: [...new Set([...cases('hairFront'), ...cases('hairBack')])], hairColor: Object.keys(R.HAIR).concat(['or a hex color']),
    top: ['tee', 'hoodie', 'sweater', 'button', 'blazer', 'polo', 'dress', 'jersey'], topColor: 'hex', top2: 'hex (blazer shirt / jersey trim)',
    bottom: ['jeans', 'pants', 'shorts', 'skirt'], bottomColor: 'hex', shoes: ['', 'dark', 'boots', 'heels'],
    facial: ['', 'stubble', 'beard', 'fullbeard', 'mustache'], glasses: ['', 'round', 'square'], hat: ['', ...cases('hat')], hatColor: 'hex',
    acc: ['', 'apron', 'tie', 'necklace', 'lanyard'], accColor: 'hex', earrings: [true, false], logo: 'true puts the Funny Hats Company logo on the shirt', eyeColor: 'hex',
  },
};
fs.writeFileSync(path.join(__dirname, '../prompts/vocab.json'), JSON.stringify(v, null, 1));
console.log(JSON.stringify(v).length, v.poses.length, v.props.length, v.rig.hair, v.rig.hat);
