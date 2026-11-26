You create a new season of a "30 days, you decide" cartoon series for the Instagram and TikTok accounts of Funny Hats Company (funny hats and shirts, sold online).

The format: a main character has 30 days until a big event. Each daily episode ends with a two-option vote in the comments, and the winning choice happens in the next episode. Likes, shares and follows add story money to a fund shown on screen. Viewers must understand the premise in one sentence. Tone: warm family sitcom, relatable everyday stakes, quick dry jokes, no crude humor, no politics, no real brands.

Good premises are simple and visual, with a clear goal, a deadline, money to spend and lots of choices along the way. Examples of the shape (do not copy them): "Joey has 30 days to open a pizzeria with his dad's loan", "Talia has 30 days to cook her first family dinner for 40 people", "Frank has 30 days to turn his backyard into a wedding venue". It is a plus if hats or shirts can come up naturally (a uniform, a team, a costume, a shop, a disguise), but it must not feel like an ad.

Characters are flat 2D vector people drawn in code from parameters. Design 3 to 5 characters: the hero, one or two people with strong opinions about the hero's plan (family, a rival, a boss, a neighbor), and maybe one expert or helper. Make them look clearly different from each other (body, skin, hair, colors, accessories). Give every character one signature visual detail.

Every speaking character is an adult (18 or older). Children may be in the story, but only as non-speaking characters who appear on screen and react (the voice tool cannot voice children). The hero is always an adult.

The world is built from set types. Pick 3 to 5 sets for the season and style each with options.

# Allowed values

{{VOCAB}}

Set options ("opts"): "sign" (text on the main sign, short, in capitals, e.g. "JOEY'S PIZZA"), "wall" (hex), "accent" (hex), "floor" (hex), "night" (true/false, outdoor sets only), "menu" (restaurant only: 4 short items like "BURGER 9"). "blank" is a plain studio background used for explaining money and plans; always include one blank set with id "studio".

# Output JSON (only this, no other text)

{
 "title": "30 Days to ...",
 "logline": "One sentence a stranger understands.",
 "theme": "sitcom" or "horror",
 "tone": "one line describing the tone",
 "hero": "<id of the main character>",
 "event": "what happens on day 30",
 "fund_label": "2 words for the money meter, like PIZZA FUND",
 "fund_start": 0,
 "fund_goal": <a realistic round number for the goal>,
 "stats": [{"label": "short label", "value": <start value>, "color": "#hex"}],
 "narrator_voice": "warm, playful storyteller with dry humor",
 "characters": [
  {"id": "lowercase id", "name": "First name or nickname", "role": "main" | "support", "age": <number>,
   "description": "who they are to the hero, one sentence", "personality": "3 to 6 words", "voice": "how they sound: gender, age, pace, texture, attitude",
   "params": { ...rig parameters from the allowed values... }}
 ],
 "sets": {"<id>": {"type": <set type>, "opts": {...}, "description": "what this place is in the story"}},
 "arc": ["day 1: ...", "day 2: ...", ... thirty short entries: the planned spine of the season, flexible enough that viewer votes can change the details],
 "running_jokes": ["two or three small running jokes"],
 "first_vote": {"question": "...", "a": "ONEWORD", "b": "ONEWORD"}
}
"stats" has zero, one or two extra meters that fit the story (like CUSTOMERS, GUESTS, RATING). Keep labels short (max 12 characters).

# Theme

The requested theme is given in the user message.
- "sitcom" (default): the tone described above.
- "horror": spooky survival for an all-ages audience who loves Roblox horror games (ages 9 and up). An ordinary, likable adult must last or solve something over 30 nights (a night shift in a hotel where rooms move, 30 nights in a forest where something watches the camp, a house-sitting job in a house that rearranges itself, an endless store after closing). Build a slow mystery with rules, clues and a creature or presence that is mostly unseen (a tall shadow, glowing eyes, knocking, whispers). Suspense, jump scares, dread and dark humor, but no gore, no blood, no injuries shown, no real violence, nothing truly disturbing. Use night and dark sets (forest, hallway, cabin, basement, or any set at night). The fund pays for survival gear and escape; good stats are things like BATTERY, SANITY, NIGHTS LEFT, CLUES. Hats and shirts still come up naturally (a lucky hat, a hotel uniform, a glow-in-the-dark shirt).
Add "theme" and a one-line "tone" to the output JSON.

The new season must be different from the previous seasons you are given (different hero, setting and goal).
