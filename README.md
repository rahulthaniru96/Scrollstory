# Scrollstory world v2: walkthrough

Step 2a of `D:\rahul-context\scrollstory\world-v2-build-plan.md`: the whole world as a blockout with the real camera rail, with the dreamy layer and furnished rooms on both floors. Nothing here is final art.

The v3 changes are listed in `world-v3-changes.md`. Phases 1 to 3 are built. On 17 Nov 2026 Rahul's ten modifications were built on top (story order, short stair and hat portal, scroll to checkpoint, clearer membranes, the TV, demo sites that open, the Extras board, room themes, typography, his name), then most of Phase 4 (books, three secrets, sound). Phase 5 is not built. A second round of Rahul's feedback was built on 17 Nov too (see below), plus part of Phase 5: three small secrets on the walk and phone portrait framing. The Sky Quarter and the new Phase 5 rooms are not built.

The walk in order: Arrival, Lobby (the founder's plaque), Gallery (five demo sites), Worth it, Workshop (plans and prices), the Hatter's stair and the top hat, Landing (bookshelf and Door 201), HOME (Scrollstory TV), Extras, Rooftop desk.

## Run

```
npm run dev      # open the address it prints, then scroll
npm run check    # rail check: clearance, eye height, doors, bridges, speed limits
npm run build    # runs the check first and stops if it fails
```

One scroll gesture, swipe, arrow key, Page Up/Down or Space moves the walk exactly one stop (`rail.stops`, 35 of them). Nothing queues: input during a travel is dropped, and a trackpad's coasting tail counts as the same gesture. The floor plan and far pips jump behind a room card and land exactly on the room's first stop.

Keys: `H` hides the readout, `R` tests reduced motion, `M` turns sound on or off, left and right change the TV channel (seated or not), `Esc` closes the floor plan, leaves a secret, stands up from the sofa or puts a book back.
Addresses: `?at=1040` freezes the walk at 1040 vh, `?p=1040` opens it there, `?at=1&intro=3.2` holds the intro at 3.2 seconds, `?free=1` gives the old free scroll for tuning, and `?debug=1` puts the scene on `window.__world`.

## Files

| File | What it holds |
|---|---|
| `src/world.js` | Every wall, floor, counter, card and floating object, in metres. The scene and the check both read it. |
| `src/rail.js` | The camera path: where it stands and where it looks for every bit of scroll. Total length is `TOTAL_VH`. |
| `src/main.js` | The scene, scroll, springs, speed caps, mist cut, floor plan and readout. Feel numbers are in `FEEL` at the top. Also the HTML over the canvas: captions, the shop and counter cards (`PLANS`, `WORTH`), the plan chooser, the TV channels and the front desk's form. |
| `src/spring.js` | The frame-rate independent spring. |
| `src/stepper.js` | Scroll to checkpoint: one gesture, one stop, with one queued step. Pure logic, tested by the check. |
| `src/stairs.js` | The Hatter's stair: checkered treads, the backwards watch, teacups, playing-card milestones, the top hat and its swirl. |
| `src/gallery.js` | The demo sites' "domain expansion": dome, floor disc, page layers and trade props, by one focus value per site. |
| `src/secrets.js` | The Landing's bookshelf (`BOOKS`), Door 201, the mirror ring, and the secret rooms (`SECRETS`), which are built 60 m under the lake. |
| `src/sound.js` | Sound synthesised in code. Off until the visitor turns it on. |
| `src/portal.js` | The things that tumble past inside the top hat (cards, teacups, watches, keys, books, little web pages), drawn over the swirl. |
| `src/dress.js` | The dreamy layer: sky, mirror water, cloud sea, portal windows, the plaque with the logo, drifting lamps, paper birds, dust and petals. |
| `src/rooms.js` | Every room's props and what they do: things hover, turn, come apart and drift. Loads the models from `public/models`. |
| `src/holo.js` | The one holographic look: iridescent edge lines (`holoEdges`) and a dissolving fill (`holoFill`). Shared uniforms are in `HOLO`. |
| `src/facade.js` | The street front: corner tower, sunshade bands, stepped parapet and fins, the entrance. Solid below `HOLO.boundary`, outlined above it. |
| `src/lake.js` | Outside the building: far islands, the kite-fish flocks, and the plinth, rock roots and drips that show when the lake drops. |
| `src/membrane.js` | The gel sheets in the lobby's three doorways. The full-screen crossing effect is `gelPass` in `src/main.js`. |
| `src/intro.js` | The intro where the building builds itself. Plays once per session. |
| `blender/components.py` | Builds the 22 props in Blender, exports `public/models/*.glb` and renders `blender/renders/` (`all-components.jpg` shows them all). Run: `"D:\Blender\blender.exe" -b --python blender/components.py`, or add `-- sofa box_tv` for only some. |
| `scripts/check.mjs` | The build-time check from section 4 of the design. |
| `scripts/shot.sh` | Saves still frames at given scroll positions: `npx vite build --base=./`, then `sh scripts/shot.sh <folder> 700 1040`. Any page address also takes `?at=1040` to freeze the walk there. |

## Limits of this step

- The check measures against the blockout's boxes, cylinders and the stair's sampled points. Each prop has a box or sphere around it in `world.js`; the check does not read the models' own meshes.
- Walls, floors, counters and fragment slabs are still blockout boxes. The props are low-poly models from the script, not hand-modelled.
- Sound is a few oscillators and noise bursts made in code, not recorded audio, and it is not panned to its source.
- Secrets fade in and out; the camera does not fly into them. Found secrets are kept in the browser's localStorage only.
- Not built from Phase 4: the floor plan radar, wall scratches, reflections that lie, and the library shaft (the hat portal replaced the upper stairwell). The firework for finding everything is built.
- The one-line descriptions of the four add-ons (`EXTRAS` in `src/world.js`) and the demo-site card line are plain wording written for the build. Rahul to confirm.
- The fonts (Fraunces, Familjen Grotesk, Martian Mono) load from Google Fonts. The scene waits up to 2 s for them, then uses fallbacks.
- The plaque's wordmark is a texture on a raised panel; only the Doorway S mark is modelled.
- The form stores nothing. Submit opens WhatsApp with the answers filled in.
- The shops have no "Try it live" button yet: the demo sites have no public address. Each shop's button opens the form with that plan chosen.
- Prices on the plan cards are the launch prices from the rate card of 13 Nov 2026. Change them in `PLANS` in `src/main.js`.
- The rail check's "no shake" rule fails when the authored yaw reverses twice within 20 vh.
- Card sites are placeholders labelled "Demo".
- The walk is 4090 vh long, so `?at=` positions from before 17 Nov no longer match.
- Each Gallery card appears when the backward walk brings it into the frame, not 8 vh apart as the brief says, because a card behind the camera cannot be seen appearing.
- Phones get a frosted tint in the doorways instead of live refraction.
- When the intro ends, the materials recompile once, which can cause a short hitch.
- Not checked: motion feel and frame rate (stills and a scripted headless Chrome run with software rendering were looked at, not a real GPU), a real phone or touch swipes, how the sound actually sounds, reduced motion after the checkpoint change, and the lake drop with the rock roots.

## Second round of feedback (17 Nov 2026)

- Scroll: one gesture is one stop, nothing queues; floor plan jumps show a room card and stop exactly on the room.
- Membranes are plain again: no colour film or rim, halfway between clear and frosted.
- Secrets have hints: each hidden one has a clue and a "Take me near" button on the floor plan, a nudge appears at a stop where one is in view, and the ways in show a faint outline.
- The Gallery demos run their site on a phone inside each dome, scrolling, with a sample enquiry bubble and people walking round. The wording on those phones is sample text, not real businesses.
- The hat portal has things tumbling past.
- The Landing books: a click pulls a volume out, its neighbours lean into the gap, it flies to the reader and opens on two pages. The pages quote only the rate card of 13 Nov 2026. "Put it back" or Esc reverses it.
- The TV: the floating picture is gone. "Sit to view" (or a click on the set) sits the camera on the sofa and leans it in to the screen; channel tiles float beside it, with a remote bar and "Tell Rahul yours" on the last channel.
- Rooftop: the look up at the sky is gone, so the last step is one level glide to the desk. Both rooftop stops have captions. The visitor can type their business name and the desk front shows it as a neon sign; the name also fills the form's business field. Nothing is stored.
- The front is modern: glass behind slim fins, a deep charcoal portal and a cantilevered canopy, jali screens on the wings, a louvred tower with glass ribbons. Same massing, so the colliders did not change.
- Door 201 is now the sketch room: colour chips, typefaces and layouts on a desk sketch a homepage on its screen (the rooftop name is used if typed). The Lab's tablet can be brushed clean with the cursor.
- Phase 5, part: three small secrets on the walk (a loose Lobby tile that is a shortcut to the stairs, a golden kite with a banner over the roof, a hatch in a rooftop water tank that opens the form as the "VIP desk"), so there are six in all; a burst of diamonds when all six are found; phone portrait framing (a wider view in portrait, bottom buttons no longer overlap).
- Not built from Phase 5: the Sky Quarter, the Renovation, Drafting Room, Signal Cabin and Greenhouse rooms, their secrets, the travel set-pieces, and the clock-tower hub.
- Not checked: motion feel and frame rate on a real GPU, a real phone and touch, how sounds sound, reduced motion for the new pieces. On a phone in portrait the founder plaque is still cut off at its stop.

## Third round of feedback (17 Nov 2026, evening)

- Gallery: the five demo worlds have different shapes and are spread through the room: domes on the floor, spheres in the air, a portal in the west wall. The page sits at the heart of each, a small phone inside it, and the others dim while one is open. Where the Lobby turn ends, the west wall carries the Gallery's sign with five small live screens.
- 3D cards: on a desktop each room's card stands in the room beside what it explains (counters, shops, demo worlds, add-ons) and folds away as the walk moves on (`CSS3DRenderer` in `src/main.js`). The three plans hang on cords in the Workshop. Phones keep the flat cards.
- TV: "Sit & watch" is a control hovering over the set, turned to the viewer. The corner button stays on phones.
- Extras: a click on a carriage goes to that add-on, and its card steps out of the carriage.
- The Lab: a page builder replaces the brushing game. Tap blocks to stack a page on a phone, change its colours, undo, launch. Nothing is sent or kept.
- The mirror: the room sways with slow crossing waves and caustic light, as if under water.
- Lobby lights: small paper lanterns over the courtyard instead of bright glowing bulbs, smaller rail sparks, and the lone door opens on a night sky.
- Paint and furniture: each ground room has its own wall colour with a darker dado and a brass line; Worth it has terrazzo plinths with lit glass tops and number plates; the Workshop has fluted timber counters with stone tops and brass rails.
- The Sky Quarter is planned, not built: four layout drawings are in `D:ahul-context\scrollstory\sky-quarter-layouts\` (sky map, side view, the four new rooms, the ground floor and the new order).
- Not checked: motion feel and frame rate on a real GPU, a real phone, how the 3D cards read on a small laptop screen, and reduced motion for the new pieces.

