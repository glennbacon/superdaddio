# Super Daddio — Three.js port

A JavaScript port of the 2012 Corona SDK platformer. Rendering is [Three.js](https://threejs.org/);
physics is [planck.js](https://piqnt.com/planck.js/), a JavaScript port of Box2D — the same engine
Corona used, so forces, masses and collisions behave as they did in the original.

All 60 levels (worlds 1–8 with seven stages each, world 9 with four) are included.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

```sh
npm run build      # static site in dist/ — host it anywhere
npm run preview    # serve dist/ locally
npm test           # headless tests of physics, game rules and level data
```

Add `?level=level3_2` to the URL to start directly in a level.

## Controls

| | Keyboard | Touch / mouse |
|---|---|---|
| Run | ← → or A D | left edge of the screen / the area right of it |
| Jump (hold for height) | Space, ↑, W or Z | bottom-right button |
| Action: run faster, throw fireballs, release to throw a carried block | X, K or Shift | button left of jump |
| Pause | Esc or P | pause button |
| In the pause menu | P/Esc/Enter resume, R restart, M menu | tap the buttons |

The on-screen buttons and their touch zones are the original's.

## How it is organised

```
src/
  engine/        small, game-agnostic layer
    display.js     2D display list (groups, images, sprite sheets, text) — no Three.js in here
    renderer.js    draws the display list with Three.js (orthographic camera, one quad per object)
    physics.js     planck.js world with the original engine's conventions (100 px/m, 1/60 s steps…)
    clock.js       frame-based timers and tweens
    audio.js, input.js, save.js, assets.js
  game/
    App.js         scene switching and the fixed 60 Hz frame: physics → game logic → timers and tweens
    state.js       shared game state, level progression, music table
    level/
      LevelScene.js  builds a level from data; camera, HUD, pause menu, controls
      hero.js        small and big hero
      spawn.js       enemies, bosses, items, platforms, bridge, effects
      collisions.js  every collision rule, in the original order
    scenes/        title, world select, level complete
  levels/        level data, one JSON file per level (generated — see below)
  assets/        images, sounds, font (copied from the original project)
tests/           run in Node with no browser: the game logic does not depend on rendering
tools/extract/   the level extractor
```

The game runs at a fixed 60 frames per second of game time whatever the display's refresh rate, so
it plays the same on a 144 Hz monitor.

Within a frame things happen in the original engine's order: one physics step (collision rules run
inside it), then the level's per-frame logic, then timers and tweens. The game depends on it — for
example the camera's glide up to a higher platform is a tween that must overrule the per-frame
camera code. Engine behaviour of this kind (frame order, solver iterations, material defaults,
units) was checked against the engine's source, which is public as
[Solar2D](https://github.com/coronalabs/corona), rather than its documentation.

## Where the levels come from

The original levels are 55,000 lines of generated Lua code inside `thelevel.lua`. Rather than
re-typing or pattern-matching them, `tools/extract/extract.lua` **runs the original level loader**
under a stand-in for the Corona API and records everything it creates — each piece of terrain with
its position, anchor, rotation, names and physics body, and each call to a spawn function — in
order. The port replays that record, which also reproduces the original draw order.

To regenerate (needs Lua 5.1 and the original `thelevel.lua` one directory up):

```sh
npm run extract-levels
```

`npm test` checks the result a second way, by counting objects straight from the Lua source text.

## Faithfulness

Physics values (shapes, densities, friction, forces, speeds), scores, timings and collision rules
are the original's. Several quirks are kept on purpose because they are part of how the game plays,
for example:

- the exit door's trigger is a triangle (a typo in the original shape list);
- three seconds after a jump the hero may jump again even in mid-air (the original's safety net);
- the score starts from zero in every level, and again after each lost life.

Deliberate differences:

- **Checkpoints work.** Once the flag is green, losing a life brings the hero back above it. The
  original contains the code for this but cleared the checkpoint on every level load before
  looking at it, so there the hero always went back to the start. "Restart" in the pause menu,
  leaving for the menu, and finishing the level forget the checkpoint.
- **Keyboard**: releasing one direction while holding the other keeps the hero running (the
  original stopped him, which only made sense for touch buttons).
- **Background**: one tile of each scrolling backdrop was missing in the original because of a
  copy-paste slip, leaving a hole; the port draws it.
- **"New" button** on the world-select screen (an advert linking to an old app-store page) is gone.
- **Ambient weather loops** (`trackrain.ogg` etc.) were referenced by the original but are not in
  the project, so there is nothing to play when music is switched off.
- Progress and sound settings are saved in the browser's localStorage.

## Licence

The code is MIT-licensed. The artwork, sound effects and music in `src/assets/` belong to Glenn
Bacon and are for non-commercial use only, and the font is someone else's work. See the
[README](../README.md#licence) at the top of the repository.
