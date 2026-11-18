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

The wheel, a trackpad or a swipe scrolls the walk freely; the wheel slows coming up to each stop (`rail.stops`, 46 of them) and never stops the walk. Arrow keys, Page Up/Down and Space go to the next stop ahead or behind. The floor plan and far pips jump behind a room card and land exactly on the room's first stop.

Keys: `H` hides the readout, `R` tests reduced motion, `M` turns sound on or off, left and right change the TV channel (seated or not), `Esc` closes the floor plan, leaves a secret, stands up from the sofa or puts a book back.
Addresses: `?at=1040` freezes the walk at 1040 vh, `?p=1040` opens it there, `?at=1&intro=3.2` holds the intro at 3.2 seconds, `?free=1` turns off the slow-down at stops, for tuning, and `?debug=1` puts the scene on `window.__world`.

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
- The Sky Quarter is planned, not built: four layout drawings are in `D:/rahul-context/scrollstory/sky-quarter-layouts/` (sky map, side view, the four new rooms, the ground floor and the new order).
- Not checked: motion feel and frame rate on a real GPU, a real phone, how the 3D cards read on a small laptop screen, and reduced motion for the new pieces.


## Sky Quarter (17 Nov 2026, night)

- Walk: now about 5874 vh and 47 stops, more than the brief's 4200 vh (5834 before the slower funicular in round four).
- Heights: Rooftop raised to +38 m. Landing 26 m, HOME 28 m, Drafting 30.5 m, Extras 31.5 m (lowered), Signal 33 m, Greenhouse 35 m, Rooftop 38 m.
- Renovation: a pavilion in the courtyard, between the Gallery and Worth it.
- Layout: the order and heights follow plan 02. The positions do not follow plan 01's ring: the Signal Cabin and the Greenhouse sit east of Extras, so the falls and rides could land on real floors. The walk is about 5874 vh, not the drawing's 5150.
- Files:
  - `src/renovation.js`: the Renovation pavilion, the old and new versions of the demo café site, and its clock secret.
  - `src/drafting.js`: the Drafting Room, its tables, blueprints and wax-sealed secret.
  - `src/signal.js`: the Signal Cabin, its four levers and admin cards (all demo data).
  - `src/maproom.js`: the map room table on Extras, with the Hyderabad relief map and the sample QR code.
  - `src/greenhouse.js`: the Greenhouse and its care plan tools.
  - `src/journeys.js`: the door frames, rope bridge, funicular, sky canal and kites between the rooms.
  - `src/tower.js`: the clock tower in the middle of the Sky Quarter.
- Secrets: three new ones, nine in all. The Renovation clock, the Drafting Room blueprint, and a keyhole on the clock tower that opens once six others are found.
- Draw calls, measured headless: Lobby about 450 (as before), the Renovation about 650, the map room about 400.
- Not checked: real GPU frame rate with all the new rooms; a real phone; reduced motion through the new rooms; how the new 3D pieces read on a small laptop screen; `scripts/board.mjs` still uses the old bridge format and was not updated.

## Fourth round of feedback (18 Nov 2026)

- Sit & watch: it stands beside the TV at screen height and stays for the whole TV stretch, fading slowly in and out instead of blinking between channels. It turns slowly to face the walk. Its bobbing animation was removed: a margin animation made the CSS 3D layer draw it far below its real place (this was the "popup at the bottom" in the screenshot).
- 3D cards: each card casts a soft shadow, card-shaped, on the floor under it and on the wall behind it, and on the ground floor's water a faint reflection. The shadows draw before the glows and sit 8 cm off the wall, or the wall hides them.
- Landing: the floating terracotta tiles are now loose pages from the five How we work books (Story, Design, Build, Launch, Care), drifting out of the sun beam toward the shelf.
- Workshop: the pages coming out of each device now mean something. Starter's 3 pages (Home, About, Contact) and Signature's 7 (Home, Our story, Menu, Gallery, Reviews, Enquiry, Legal) fan out of the screen one by one on the shop's beat, each labelled. The page names are examples. The devices' screens show the Home page, and the admin laptop its dashboard; the models' screens have no UVs, so the picture is a sheet laid on the glass.
- Drafting Room: the page frame is smaller (4.6 by 2.9 m, was 6.2 by 3.6) and stands 0.6 m further back, so it is whole in view from the stop. The page is redrawn as a desktop layout at 1280 wide: hero and picture side by side, three cards in a row, a Find us band and the footer. It shows 1280 by 800 at a time and scrolls once painted. The return path through the page moved 0.55 m west to keep clear of the smaller frame.
- Funicular: the view faces the way the car goes, with the Signal Cabin ahead, instead of sideways. The ride is slower (190 vh, was 150).
- Not checked: real GPU or phone; how strong the card shadows look on a real screen (they are subtle in headless frames); reduced motion for the new page fan. The tank egg's "Take me near" lands with the tank above the screen; this was already so before this round.

## Fifth round of feedback (18 Nov 2026)

- Scroll: the wheel scrolls freely again. It slows as it comes up to each stop (to 0.3 of its speed within 45 vh) and speeds up again leaving it. It never stops the walk or needs a new gesture. Touch scrolls natively. The keys go to the next stop ahead or behind, and the pips go to theirs. Fullscreen or a resized window keeps the place in the walk.
- Landing books: the five How we work volumes float open in the sun beam, a page turning in each, instead of a shelf on the west wall and a stop of their own. Click one at the Landing hold and it floats to the reader and opens flat beside its card. Volume five's last page is the door to the Lab. The drifting pages are gone; Door 201 and the Lab are still found from their clues.
- Story: the captions follow STORYBOARD.md in one order. The four parts are the ground floor (what we make), the stairs and Landing (where it comes from), upstairs (the five chapters of How we work: Story, Design, Build, Launch, Care, one a room) and the roof (the ask). Lines said twice are said once now: the Drafting page and pinboard no longer repeat the arrival line, the book summaries no longer repeat the room captions, Worth it and the founder no longer repeat their counters and label, and each demo site card says what that business needs instead of the same line.
- Not checked: real phone touch scroll; real trackpad feel of the slow-down; the new copy has not been reviewed by Rahul.

## Sixth round of feedback (18 Nov 2026)

- Intro: the dusk lifts in the first 1.4 s, so the building is seen rising out of the water. It plays every time the walk opens at its start (the page no longer restores an old scroll position), and its first 3.5 s cannot be skipped or scrolled away.
- Renovation: the cursor compares old and new only after the walk has crossed the line.
- TV: one channel for the seat and the scroll. The remote moves the walk to that channel's stop, the wheel changes channel while seated, scrolling out of the room stands up, and standing up keeps the channel.
- Captions: on a desktop each caption is a card standing in the room, 2.6 m ahead of where it is read and a little to the left, beside what it talks about, with a soft shadow; it turns slowly to the reader. Phones keep the caption at the bottom.
- Rooftop: the desk's card is a 3D card like the others and holds the ending: the name field, Start your project, and Rahul's number. The neon warms up with two stutters as the walk arrives and flickers on each new letter. The plan cards over the desk carry their names.
- Not checked: a real phone; how the caption cards sit in every room on a small laptop (some cover part of the room's subject).

