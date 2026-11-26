// Adds theme + demo support to POD 6 v2 and POD 7, and the sound-maker tool. Run inside the n8n editor page.
window.__patchTheme = async function () {
  const p = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia;
  const wl = [...p._s.values()].find((s) => typeof s.fetchWorkflow === 'function');
  const ws = p._s.get('workflows');
  const out = [];
  const save = async (w) => { const r = await ws.updateWorkflow(w.id, { nodes: w.nodes, connections: w.connections, versionId: w.versionId, name: w.name, settings: w.settings }); return r.versionId; };
  const node = (w, n) => { const x = w.nodes.find((y) => y.name === n); if (!x) throw new Error('missing node ' + n + ' in ' + w.name); return x; };

  // ---------- POD 6 v2: THEME and DEMO switches
  const w6 = await wl.fetchWorkflow('iM5SivjCRnvYfKud');
  const sb = node(w6, 'Season brief');
  if (!sb.parameters.jsCode.includes('const THEME')) {
    sb.parameters.jsCode = "// THEME: 'sitcom' or 'horror'. DEMO: true makes a season you can preview without it going live.\nconst THEME = 'sitcom';\nconst DEMO = false;\n" + sb.parameters.jsCode
      .replace("const user = 'Create season ' + next + '.", "const user = 'Theme: ' + THEME + '.\\nCreate season ' + next + '.")
      .replace('return [{ json: { next, body:', 'return [{ json: { next, theme: THEME, demo: DEMO, body:');
  }
  const ps = node(w6, 'Parse season');
  if (!ps.parameters.jsCode.includes('b.theme =')) {
    ps.parameters.jsCode = ps.parameters.jsCode.replace("b.version = 2;", "b.theme = $('Season brief').first().json.theme || b.theme || 'sitcom'; b.tone = b.tone || '';\nb.version = 2;");
  }
  const ac = node(w6, 'Activate season');
  if (!ac.parameters.jsCode.includes('demo')) {
    ac.parameters.jsCode = ac.parameters.jsCode.replace("return [{ json: { id: row.id, status: 'active',", "return [{ json: { id: row.id, status: $('Season brief').first().json.demo ? 'demo' : 'active',");
  }
  out.push('POD 6 v2 ' + await save(w6));

  // ---------- POD 7: season_override (preview a demo season), theme sounds
  const w7 = await wl.fetchWorkflow('BBROF1XcYAtZP8ZJ');
  const st = node(w7, 'Settings');
  if (!st.parameters.jsCode.includes('SEASON_OVERRIDE')) {
    st.parameters.jsCode = st.parameters.jsCode
      .replace('const POST', '// SEASON_OVERRIDE: a season number to preview (a demo season). Never posts while set.\nconst SEASON_OVERRIDE = null;\nconst POST')
      .replace('return [{ json: { post: POST,', 'return [{ json: { season_override: SEASON_OVERRIDE, post: POST && !SEASON_OVERRIDE,');
  }
  const sc = node(w7, 'Season check');
  if (!sc.parameters.jsCode.includes('season_override')) {
    sc.parameters.jsCode = "if ($('Settings').first().json.season_override) return [{ json: { new_season: false, season_id: null } }];\n" + sc.parameters.jsCode;
  }
  const ep = node(w7, 'Episode plan');
  if (!ep.parameters.jsCode.includes('season_override')) {
    ep.parameters.jsCode = ep.parameters.jsCode
      .replace("let season = seasons.filter(s => s.status === 'active').sort((a, b) => b.season_no - a.season_no)[0];",
        "let season = seasons.filter(s => s.status === 'active').sort((a, b) => b.season_no - a.season_no)[0];\nconst ov = settings.season_override; if (ov) season = seasons.find(s => Number(s.season_no) === Number(ov));")
      .replace('const preview = !season;', 'const preview = !season || !!ov;');
  }
  const br = node(w7, 'Script brief');
  if (!br.parameters.jsCode.includes('repo_sounds')) {
    br.parameters.jsCode = br.parameters.jsCode
      .replace("const sfx = $('Get sound effects').all().map(i => i.json && i.json.name).filter(Boolean);", "const sfx = $('Get sound effects').all().map(i => i.json && i.json.name).filter(Boolean).concat(vocab.repo_sounds || []).filter(n => !/^ambience_/.test(n) && n !== 'pop' && n !== 'ding');")
      .replace("const allowed = Object.assign({}, vocab, { rig: undefined, set_types: undefined,", "const allowed = Object.assign({}, vocab, { rig: undefined, set_types: undefined, repo_sounds: undefined,")
      .replace("season: { title: b.title, logline: b.logline,", "season: { title: b.title, theme: b.theme || 'sitcom', tone: b.tone || '', logline: b.logline,");
  }
  const bd = node(w7, 'Build the episode');
  if (!bd.parameters.jsCode.includes('ambience')) {
    bd.parameters.jsCode = bd.parameters.jsCode
      .replace("const cast = { narrator:", "let vocab = $('GitHub: vocab').first().json; if (vocab.data) vocab = JSON.parse(vocab.data);\n(vocab.repo_sounds || []).forEach(n => { if (!sfxLib[n]) sfxLib[n] = 'assets/sfx/' + n + '.mp3'; });\nconst amb = (b.theme === 'horror') ? 'ambience_horror' : 'ambience_sitcom';\nconst cast = { narrator:")
      .replace("lines, beats: s.beats,", "ambience: (vocab.repo_sounds || []).includes(amb) ? { url: 'assets/sfx/' + amb + '.mp3', vol: b.theme === 'horror' ? 0.24 : 0.07 } : null,\n  lines, beats: s.beats,");
  }
  out.push('POD 7 ' + await save(w7));
  return out;
};

// Creates the "TOOL · Make sounds for the cartoon" workflow (ElevenLabs sound effects saved into this repo).
window.__makeSoundTool = async function () {
  const p = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia; const ws = p._s.get('workflows'); const uid = () => crypto.randomUUID();
  const GH = { httpHeaderAuth: { id: 'kyvlD4WnSOvuH0Tw', name: 'Git Hub' } }, EL = { httpHeaderAuth: { id: 'Yp9qq0P3pEZkYhmU', name: 'ElevenLabs API' } };
  const list = [['pop', 'soft cartoon UI pop, short and clean', 0.5], ['ding', 'bright single bell ding, game show correct answer', 1.2], ['ambience_sitcom', 'light cheerful acoustic sitcom background music, ukulele and soft hand claps, gentle and loopable, no vocals', 22, true], ['ambience_horror', 'dark eerie ambient drone, low wind, distant wooden creaks, suspenseful horror atmosphere, loopable, no melody', 22, true], ['heartbeat', 'slow loud tense heartbeat', 3], ['door_creak', 'old wooden door creaking open slowly', 3], ['jump_scare', 'sudden loud horror sting, sharp orchestral stab with whoosh', 2], ['whisper', 'creepy distant whisper, unintelligible', 3], ['creepy_footsteps', 'slow footsteps on an old wooden floor in an empty hallway', 4], ['thunder', 'thunder crack and rumble', 4], ['flashlight_click', 'flashlight switch click', 0.5], ['owl', 'owl hooting at night in a quiet forest', 2.5], ['music_box', 'creepy slow music box melody, slightly out of tune', 8], ['lights_buzz', 'fluorescent lights buzzing and flickering electrical hum', 4]];
  const listCode = 'const L = ' + JSON.stringify(list) + ';\nreturn L.map(([name, text, d, loop]) => ({ json: { name, body: Object.assign({ text, duration_seconds: d, prompt_influence: 0.45, model_id: "eleven_text_to_sound_v2" }, loop ? { loop: true } : {}) } }));';
  const commitCode = "const buf = await this.helpers.getBinaryDataBuffer(0, 'audio');\nconst name = $('Loop sounds').first().json.name;\nreturn [{ json: { path: 'assets/sfx/' + name + '.mp3', body: { message: 'Add sound: ' + name, content: buf.toString('base64') } } }];";
  const ghH = { sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: 'application/vnd.github+json' }, { name: 'User-Agent', value: 'n8n-funnyhats' }, { name: 'X-GitHub-Api-Version', value: '2022-11-28' }] } };
  const nodes = [
    { id: uid(), name: 'Run (manual)', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
    { id: uid(), name: 'Sound list', type: 'n8n-nodes-base.code', typeVersion: 2, position: [220, 0], parameters: { jsCode: listCode } },
    { id: uid(), name: 'Loop sounds', type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, position: [440, 0], parameters: { batchSize: 1, options: {} } },
    { id: uid(), name: 'ElevenLabs: make sound', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [660, 100], credentials: EL, parameters: { method: 'POST', url: 'https://api.elevenlabs.io/v1/sound-generation', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 120000, response: { response: { responseFormat: 'file', outputPropertyName: 'audio' } } } } },
    { id: uid(), name: 'To commit', type: 'n8n-nodes-base.code', typeVersion: 2, position: [880, 100], parameters: { jsCode: commitCode } },
    { id: uid(), name: 'GitHub: save sound', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [1100, 100], credentials: GH, parameters: Object.assign({ method: 'PUT', url: "={{ 'https://api.github.com/repos/aarongreen-ai/cartoon-renderer/contents/' + $json.path }}", authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth', sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 60000 } }, ghH) }];
  const L = (a, b) => ({ [a]: { main: [[{ node: b, type: 'main', index: 0 }]] } });
  const con = Object.assign({}, L('Run (manual)', 'Sound list'), L('Sound list', 'Loop sounds'), { 'Loop sounds': { main: [[], [{ node: 'ElevenLabs: make sound', type: 'main', index: 0 }]] } }, L('ElevenLabs: make sound', 'To commit'), L('To commit', 'GitHub: save sound'), L('GitHub: save sound', 'Loop sounds'));
  const r = await ws.createNewWorkflow({ name: 'TOOL · Make sounds for the cartoon', nodes, connections: con, settings: { executionOrder: 'v1' }, projectId: 'AhY3j7S8SJBoBS6V' });
  return r.id;
};
