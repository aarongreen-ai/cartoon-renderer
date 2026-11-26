# cartoon-renderer

Renders the Funny Hats Company daily "30 days, you decide" cartoon.

- `lib/rig.js`: the cast. Each character is a vector rig (body, poses, expressions, mouth).
- `lib/sets.js`: the places and props.
- `lib/engine.js`: draws one frame for any time `t`: camera, acting, lip sync, pop-ups, captions, scoreboard, vote card.
- `build.js`: turns an episode file into a HyperFrames project.
- `render_episode.js`: downloads the voice lines, tightens pauses (max 0.3 s), speeds up 1.08x, gets exact word times, adds sound effects, builds, checks and renders.
- `.github/workflows/render.yml`: n8n calls this each morning with an episode file; the finished mp4 is published as a release and n8n is told the URL.

HyperFrames is pinned to 0.9.99 in package.json. Episode files live in `episodes/`.
