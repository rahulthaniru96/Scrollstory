# Scrollstory World — v3 changes (brief for Claude Code)

Project: `scrollstory-world` (Vite + three.js + GSAP + Lenis).
- Read `README.md` first.
- Feel numbers live in `FEEL` in `src/main.js`.
- Geometry is in `src/world.js`, the camera path in `src/rail.js`, room props in `src/rooms.js` and the dreamy layer in `src/dress.js`.

## Ground rules for every change
- `npm run check` must pass after each phase. After each phase, save stills with `scripts/shot.sh`, then commit.
- Reference sites and shows (Unseen, emotion, the Matt Hatter Chronicles intro): take the **idea only**. Never copy their code, models, textures or music.
- Every effect is driven by scroll progress, so scrolling up plays it backwards. The only exceptions are the intro and clicks.
- **Reduced motion:** cross-fade between hold frames.
- **Phones (low quality):** fewer particles, no live transmission or refraction (use a pre-blurred texture instead), pixel ratio 1.
- Text the visitor must read is HTML over the canvas, not text drawn in 3D.
- Do not invent facts: no fake results, reviews, client numbers or awards.
- **Performance budget:**
  - 60 fps on a mid laptop, 30 fps on phones.
  - First load under about 3 MB.
  - Compress the GLBs (meshopt or Draco).
  - Load each room's heavy parts just before the camera reaches it.

## One visual language: "holographic"
Use one shared holographic material (`src/holo.js`) for the intro build, the demo cards appearing, the secret-door shimmer and the iridescent tint of the entrance membranes. Reference image: liquid chrome with rainbow thin-film colours.
- An edge-line shader (`EdgesGeometry` → `LineSegments2`) coloured by a thin-film/iridescent ramp (cyan → violet → pink → gold) that slides with view angle and time.
- A fill shader with a `uReveal` 0→1 threshold: a noise dissolve plus a bright rim at the dissolve edge.

---

## Phase 1 — quick wins and fixes

1. **Remove the shake at the end of the demo/gallery section.**
   - Reproduce it with `?at=` around the end of "Gallery, walking backwards" and the start of "Corner into Workshop".
   - Likely suspects: the look target flipping sides at the corner, the `catchUp` boost toggling on and off, or the eye spring overshooting.
   - Fix it so the camera settles with no oscillation. Add a check to `check.mjs` that fails if yaw velocity changes sign more than once within 10 vh anywhere on the rail.
2. **Plaque and logo on the building.**
   - Put the "scrollstory" wordmark and the Doorway-S mark (an arch with an S inside, clay `#C9733F` on ink `#1E2A26`) on the parapet plaque. Build it as real geometry with a soft glow; it must be readable when the camera tilts up at the gate.
   - The gate push-in already tilts up to where the plaque goes.
3. **Rooftop desk → application form.** Clicking the desk (or a "Start your project" button that appears there) opens an HTML panel:
   - Fields: name, business name, what you need (Starter / Signature / Signature + Admin / not sure), budget range, preferred contact (Call / WhatsApp / Email), a message.
   - Validate the fields.
   - Submit builds a WhatsApp link to `+91 99490 88659` with the answers pre-filled (`https://wa.me/919949088659?text=…`). Also show the number as text, because some viewers block `wa.me`.
   - Show a short privacy line: "We only use this to reply to you."
   - Success state: "Opening WhatsApp… if nothing happens, call +91 99490 88659."
   - Nothing is stored. Close returns the visitor to the same spot.
4. **TV room: give it a meaning and a tagline.**
   - Frame the box TV as **"Scrollstory TV"**. Each STORY line is a channel: "CH 01 · Our story" … "CH 06".
   - Scrolling flips channels with a CRT static blip.
   - Last channel: **"CH 07 · Your story?"** with Call / WhatsApp buttons in HTML.
   - Tagline over the room (chosen): **"Stories used to live on TV. Now they live on your website."**

## Phase 2 — the look

5. **Front building: designer, not simple.** Keep the 1940s Secunderabad art deco language, but compose it like an architect would:
   - asymmetric massing: a tall rounded corner tower on one side with porthole windows and circular sunburst grills, and a long low wing on the other
   - a stepped parapet with vertical fins rising to the plaque
   - wrap-around sunshade bands that continue around the curved corner and throw crisp shadows
   - a grand entrance: a stepped deco arch, double teal doors, terrazzo steps going **down into the water**, and a brass handrail
   - colour bands in limewash, pista and deco pink, with red-oxide trim
   - warm uplights in the evening, so the facade glows on the water
   - a mirror reflection in the water. The silhouette must read in one glance, even as a thumbnail.
6. **Building aesthetic: between reality and imagination.**
   The building must look like it belongs in both worlds at once — solid enough to feel like a real Secunderabad structure, dreamlike enough that you'd never mistake it for a photograph. This is the core visual identity.
   - **The bottom half is grounded:** real materials (limewash, terrazzo, red-oxide, brass), casting real shadows, with wear and texture. The entrance steps go into real water.
   - **The top half dissolves into dream.** As the eye travels up, edges begin to shimmer — the holographic edge lines from `holo.js` appear on cornices, fins, and the parapet, as if the building is still being imagined into existence at the top. The uppermost elements (the water tanks, the plaque fins) have a faint transparency and iridescent tint, so the sky bleeds through them.
   - **Transition zone (mid-height):** a soft gradient where solid geometry meets holographic edges. Some bricks are fully real; others next to them are wireframe outlines filled with the iridescent dissolve. This band slowly breathes (the boundary drifts up and down about 0.3 m over 8 s, scroll-independent).
   - **At night / purple-sky time (rooftop section):** the balance flips — the lower half picks up more holographic glow reflected from the water, and the upper half becomes more solid against the dark sky. The building looks like it only fully exists when you're looking at it.
   - **The reflection in the water** shows the fully-imagined version — complete holographic outlines for the whole building, even the parts that are solid above. So the reflection is always slightly more "dream" than the real thing. This ties to the courtyard-mirror secret.
   - **Performance:** the holographic edges on the building are the same `EdgesGeometry → LineSegments2` from `holo.js`, so no new shader. The transparency on upper elements uses `MeshStandardMaterial` with `opacity` and `alphaMap` keyed to world-Y height, computed once. The breathing is a uniform, not per-frame geometry.

7. **Environment behind the building** (Rahul picks; recommendation in bold):
   - **A. The building stands on an endless mirror lake that runs to the horizon, with small broken islands drifting far off. Schools of paper-kite "fish" swim through the air.** Hyderabad kites (the `kite.glb` already exists) move as flocks with boids. Over the water they dip, and they scatter from the cursor. *(recommended: local, surreal, and it uses what we have)*
   - B. Slow sky whales made of cloud and paper.
   - C. The building itself floats slightly above the water, with roots of stone and drips falling back into the lake.
   - A + C together also work. A for the street-level arrival, then C revealed when the camera rises up the stairs and sees the building from outside.
7. **Last section (rooftop) sky: purple twilight with golden light.** Use Rahul's photo as the reference.
   - Gradient sky shader:
     - Zenith: deep violet `#5E5A8E`.
     - Upper: lavender `#9C8FC4`.
     - Mid: mauve `#B58DB8`.
     - Horizon: pink `#E79AA3`.
     - Glow: orange `#F2A36B`.
   - Layered cloud billboards in lavender-grey, with **golden rim light** `#F6C66A` only where the sun breaks through.
   - Two or three soft god rays through the gaps.
   - Tint the fog to match, and add a few warm lamp points below the clouds.

## Phase 3 — signature effects

8. **Intro: the building builds itself in front of the visitor.** This doubles as the loader: tie the stages to real asset-loading progress, with a minimum time per stage.
   1. *Water only.* Dark mirror water and a faint horizon.
   2. *Holographic outlines rise out of the water.* Each component (plinth, walls, steps one by one, windows, parapet, fins, tanks) rises from below the surface as glowing iridescent edge-lines, with ripples where it breaks the surface.
   3. *Fit.* Each piece drifts up and snaps into its place in the structure with a small overshoot. The steps stack one after another.
   4. *Plain structure.* The holographic fill fades in, so the building is a clean iridescent model.
   5. *Real building.* The material dissolves from holographic to real, from the bottom up, along a scan line.
   6. *Logo plaque lights last.* "scrollstory" and the Doorway S, then the caption and "Scroll to walk".

   Other requirements:
   - Total about 6–8 s.
   - Any scroll, click or key skips to the end.
   - Plays once per session (`sessionStorage`, wrapped in try/catch).
   - Reduced motion: a 1 s fade.
9. **Demo sites appear out of thin air** (5 demo cards). Driven by scroll, per card:
   1. nothing
   2. faint particles in the card's rectangle
   3. a holographic edge outline plus a ghost of the screenshot at about 15% opacity with a chromatic offset
   4. more solid: about 60%, lines brighter
   5. fully opaque, outline fades, a soft settle bounce

   Cards stagger by about 8 vh. Reverses on scroll up.
10. **Entrance membranes (passing through a gel).** At every room entrance, a vertical "liquid" sheet fills the doorway.
    - **Before entering:** the next room is visible only blurred, with faint lines of its shapes (draw its edges as dim holographic lines behind the sheet).
      - Desktop: `MeshPhysicalMaterial` with `transmission: 1`, `roughness` about 0.6, `thickness` 0.4, `ior` 1.33, light `iridescence`.
      - Phones: a pre-blurred render texture.
    - **Crossing:** a vertex-wave ripple bulges toward the camera, then a full-screen post pass adds a radial refraction wobble, a little chromatic aberration and a brief bright rim, lasting about 0.4–0.6 s of scroll. Soft "gloop" sound if sound is on.
    - **After:** the sheet bursts into a few droplets that fall into the floor water, and the room is sharp.
    - Scrolling back reverses it.

## Phase 4 — stairs, books, secrets, the way up

11. **Stairs: visuals and detail.**
    - **Things travel along both handrails.** Small brass beads of light run up the rails like a funicular, one on each side, out of step with each other. In the darker parts of the stair, add a slow pulse of light along the rail. The beads leave a short trail.
    - **A wall of milestones as you climb.** Framed pictures on the stair wall, lit as the camera passes: the first website, Rishi Care Hospital, Bhumi Insurance, G-Thriftz, the 5 demo sites, Scrollstory. **Facts only**, no invented numbers.
    - Detail: terrazzo treads with red-oxide nosings, a grill window with the Clock Tower outside, hanging lanterns, a potted plant on the landing, dust in the light, and step numbers on the risers.
12. **Books: give them a meaning.** Recommendation: the books are **"How we work" in five volumes**:

    | Volume | Title | Line |
    |---|---|---|
    | 1 | Story | We learn your business and find its story |
    | 2 | Design | You see every screen before code |
    | 3 | Build | Hand-checked code, fast on phones |
    | 4 | Launch | Domain, hosting, Google profile |
    | 5 | Care | Backups, updates, small changes |

    - Hovering pulls a book half out. Clicking opens it in the air: pages turn and a short HTML card explains that step in plain words.
    - The fifth book is also a **secret switch** (see 13).
13. **Secret rooms and hidden entrances** (Rahul loves these). These are optional side trips off the main walk. The rail stays linear: a click flies the camera into the secret, and "Back to the walk" flies it back to the same spot. The floor plan shows each secret once it's found ("4 of 11 secrets found"). Finding all 11 triggers a brief firework of holographic particles and a "You found every secret" badge on the floor plan.

    **v1 secrets (Phase 4):**
    - **Bookshelf door:** pull volume 5, the shelf swings open → **The Lab**: experiments, Blender renders, the kids' "brush it clean" game prototype.
    - **The water courtyard mirror:** step into the reflection → an upside-down copy of the room, where the sky is underwater.
    - **Door 201 on the stair landing:** a door that was locked opens to a tiny 2012 bedroom, the "where it started" desk.

    **v1.1 secrets (Phase 5):**
    - **A loose floor tile (Lobby):** it drops to reveal a passage under the water. Glowing fish lead to the stair foot (a shortcut).
    - **The rooftop water tank:** a hatch opens and holds the Contact form as a hidden "VIP desk" easter egg.
    - **The Renovation time machine:** on the "template" (old) side of the Renovation room, a dusty clock on the wall can be clicked. Its hands spin backwards and the camera flies into a sepia-toned **"2015 web"** parody: marquee text, hit counters, "under construction" GIF placeholders, a guestbook. Click the guestbook's last entry ("— Scrollstory, we'll fix this") to fly back. It's funny and it proves how far web design has come.
    - **The Drafting Room blueprint vault:** one of the floating blueprints has a wax seal instead of a title block. Click the seal → it cracks open and the camera falls through the blueprint into a small **hidden portfolio** of three rejected/experimental design concepts that never shipped, displayed on easels in a dark room with spotlights. Shows the team's creative range. Each easel has a one-line reason it was shelved.
    - **The Signal Cabin logbook:** an old logbook sits on the cabin desk. Click it → the pages flip and the camera zooms into a page that becomes a full-screen **timeline** of Scrollstory's journey: the first enquiry, the first site launched, the first admin system, the first ₹1 lakh month. All fictional/demo data, labelled "Demo timeline". A rubber stamp at the bottom says "Still writing…"
    - **The Greenhouse seed vault:** behind the tallest plant is a glowing seed vault door (like a mini bank vault). Click it → inside is a tiny room with shelves of labelled seed packets, each one a **future feature idea** ("Multilingual sites", "AI chatbot for bookings", "Dark-mode toggle for clients"). Visitors can click a seed to "plant" it — it pops into a tiny sprout with a heart animation. No data stored; it's purely delightful. Line: "Some ideas are still growing."
    - **The Clock Tower's hidden room:** the clock face has a small keyhole. It only glows if the visitor has found at least 7 other secrets. Click the keyhole → the clock opens like a door and inside is a tiny **watchmaker's workshop**: gears, springs, and a desk with a handwritten note: "Every story has moving parts. Thanks for finding them all." This is the final-boss secret — the reward for the curious.
    - **Kite-fish whisper:** during the kite lift to the rooftop, one kite in the flock has a slightly different colour (a golden shimmer). Clicking it mid-flight makes it unfurl into a banner: "You noticed. That's exactly what we do — we notice the details others miss." Then it folds back. Subtle, quick, and it ties the mystery theme to the studio's value proposition.

    Secret entrances shimmer with the holographic edge **only when the cursor is near them**. Secrets added in v1.1 should not block the main walk — they're click-to-enter side trips only.

    ### Hints and the easter-egg trail
    Visitors won't find 11 secrets by accident. The building itself drops **breadcrumbs** — small visual and audio cues that reward attention without spelling out where the secrets are.

    **Visual hints (always on):**
    - **Holographic fireflies.** Tiny iridescent particles (3–5 at a time, reusing the `holo.js` edge colour ramp) drift near a secret entrance. They are small enough to miss if you're not looking, but once you spot the pattern you start scanning for them. Each secret has its own cluster; found secrets stop emitting fireflies.
    - **The floor plan "radar".** Once the first secret is found, the floor plan gains a faint pulse ring around the visitor's current position. When a secret is within about 200 vh of the camera, a tiny dot blinks at its direction on the ring — like a compass, not a GPS pin. It says "something is nearby", not "click here".
    - **Wall scratches.** Near each ground-floor secret, a small scratched symbol appears on a nearby wall or floor tile — an S inside a circle (Scrollstory mark, simplified). It's the kind of thing you'd walk past ten times before noticing. Each symbol is different enough to be collectible (S-circle, S-arch, S-key, S-gear, S-leaf, etc.).
    - **Water reflections lie.** In rooms with water on the floor, the reflection occasionally shows a door, a glow, or an object that isn't in the "real" room above the water. This only happens near secrets and lasts about 2 s before fading. Scroll-driven, so it replays.

    **Audio hints (only when sound is ON, off by default):**
    - **Proximity whisper.** When the camera is within about 100 vh of an unfound secret, a faint, breathy sound plays — like wind through a keyhole. Gets slightly louder as you get closer. Different pitch per secret so repeat visitors can tell them apart.
    - **Secret-found chime.** Each discovery plays a short crystalline chime (pitch rises with the count: secret 1 is low, secret 11 is high). The chimes form a scale, so finding all 11 plays a melody in retrospect.
    - **The building hums.** A very low ambient drone that shifts in timbre room by room (warm in the Lobby, metallic in the Signal Cabin, airy in the Greenhouse). Not a hint per se, but it makes the whole building feel alive and rewards having sound on.

    **Sound across the whole website (off by default, toggle in a floating speaker icon):**
    - Intro: holographic hum rising in pitch as the building assembles, a soft "lock" click when each piece snaps in, a water surface break for each component.
    - Membranes: a soft "gloop" on crossing.
    - Stairs: brass bead ticks on the rails, echoing footsteps that slow on landings.
    - Books: a page flutter on hover, a spine creak on open.
    - TV: CRT static blip on channel flip.
    - Rooftop: wind, distant kite flutter, birdsong.
    - Sky Quarter transitions: rope bridge creak, funicular rattle, water rush for the canal, kite fabric flap.
    - Cursor over water: faint ripple.
    - All sounds are short, spatial (panned to source position), and compressed to under 20 KB each. Load lazily per room. `AudioContext` created only on first user gesture after toggling sound on.
14. **Getting upstairs.** Recommendation: a hybrid. Keep the stairs, but turn the upper half of the stairwell into a **library shaft**.
    - The walls become towering bookshelves, and books lift off the shelves and **arrange themselves into the next steps under the camera**, echoing the intro build.
    - At the top, the shelves fold open like a pop-up book onto the upper floor.
    - Rahul liked the library transition in the Matt Hatter Chronicles intro. Use it as a **feeling** reference only; describe or screen-record the parts he liked.
    - Option B: drop the stairs and use only the library transition. Higher risk, because visitors lose the "climbing" feeling.

## Room clarity fixes (do in Phase 1 if they are quick)

15. **Workshop (3 shops: phone, laptop, dashboard)**
    - **Framing:** pull the camera back and widen it so all three shops are in view at the start. No tight zoom; keep at least 1.5 m from each device.
    - **Three equal beats:**
      1. Highlight Starter: light up, device floats forward, HTML label with name, one-line what you get, "Try it live".
      2. The same for Signature.
      3. The same for Signature + Admin.
    - **Then a clear chooser:** "Choose one", with a small comparison card for each of the three: name, launch price, 3 bullets, button.
    - Fix the bug where only 2 shops get highlighted before "choose one" appears.
16. **Worth it (4 counters)**
    - Give it more room: a wider camera, more space between counters, slower beats.
    - Each counter gets an HTML card with a heading and 2 plain lines:

      | Counter | Heading | Lines |
      |---|---|---|
      | Custom | Made for you, not a template | Your story, your design, built around how your customers think. |
      | Secure | Safe by default | SSL, safe forms, backups, logins locked down. |
      | Legal | The paperwork done right | Privacy note, cookie note, terms, licences for fonts and music. |
      | **Income** (the ledger book with coins and paper birds) | Built to bring you customers | Calls, WhatsApp messages, bookings and walk-ins, not just a pretty page. |

    - Label the ledger clearly. It is the "book with no meaning" Rahul noticed.

## More ideas (Claude's suggestions, optional)
- **Sound pack:** now a full section under Phase 4 item 13 (hints). Off by default, toggle via floating speaker icon. Covers every room and transition.
- **The floor plan as a treasure map:** rooms and found secrets, with a jump-to for each.
- **Time of day follows the walk:** golden hour on the ground floor, then purple twilight at the rooftop. The sky slowly shifts as you climb, so the finale feels earned.
- **Cursor mist trail** (already in the brief) only over water and in the sky, not over text.
- **Mobile portrait:** add a separate rail framing pass. A wider FOV alone is not enough.
- **The last frame:** after the form, the camera pulls back and up, and the visitor sees the whole building on the purple lake with the kites. Fade to the logo and "We tell your story and build its world."

## Decisions (locked by Rahul, 16 Nov 2026)
1. **Environment: A + C.** An endless mirror lake with kite-fish flocks. The building floats slightly above the water with stone roots and drips, and the camera sees this from outside once it rises up the stairs.
2. **Way upstairs: the hybrid.** Stairs, then a library shaft where books become steps, and the shelves open like a pop-up book.
3. **TV tagline:** "Stories used to live on TV. Now they live on your website."
4. **Secrets in v1 (3):** bookshelf → Lab, the courtyard mirror, door 201. **Secrets in v1.1 (8 more, 11 total):** loose-tile shortcut, water-tank VIP desk, Renovation time machine, Drafting Room blueprint vault, Signal Cabin logbook, Greenhouse seed vault, Clock Tower watchmaker's workshop (needs 7 found first), kite-fish whisper. Finding all 11 triggers a holographic firework and a badge.
5. **More rooms with meaning, and a more complex upper floor:** see Phase 5.
6. **Each room rendering in front of the visitor's eyes: NO.** The intro already does this for the whole building (Phase 3, item 8), demo cards materialise from thin air (item 9), and entrance membranes give a reveal at every doorway (item 10). Adding a full holographic build-up for each room would (a) dilute the intro's impact — it's special because it happens once, (b) add ~15 render-to-texture passes, blowing the performance budget on phones, and (c) slow the walk with repetitive 3–4 s animations at every room. The entrance membranes already say "you're entering something new"; the building's reality-to-imagination gradient (item 6) already makes the whole place feel like it's being dreamed into existence. Keep the room-build idea in reserve for a single dramatic moment if needed (e.g. a future v2 feature room), but not for every room.
7. **Building between reality and imagination:** see Phase 2, item 6. The building is solid at the bottom, dissolves into holographic edges at the top, and the water reflection always shows the dream version. The balance flips at purple-sky time.
8. **Hints and sound across the site:** holographic fireflies near secrets, floor-plan radar, wall scratches, water reflections that lie. Full sound pack (off by default) with spatial audio per room. See Phase 4, item 13 (hints section).

---

## Phase 5 — more meaning: new rooms and the Sky Quarter (upper floor)

Every room should prove one thing we do. Today the walk shows *what we built* and *what it costs*, but not *how we work*, *the admin systems* or *care*. These rooms fill the gaps.

| Room | Floor | What it proves | The idea |
|---|---|---|---|
| **The Renovation** (new) | Ground, between Gallery and Workshop | We can fix your old site | One room split down the middle. The left half is a dusty, grey "template" shop: flat stock photos, a broken marquee, cobwebs on a "Welcome to our website" banner. As the camera crosses the room, a vertical **wipe line** (holographic edge) sweeps across, and everything behind it turns into the Scrollstory version: colour, light, moving parts. Use the fictional demo café, never a real business. HTML line: "Your old site isn't the end of your story." |
| **The Drafting Room** (new) | Upper | Design comes first; you see it before code | Drafting tables and blueprints hang in the air. A giant wireframe of a website page floats in front of the camera, and as the camera passes through it, the wireframe **paints itself** in colour, then becomes a live, scrolling page. Line: "You see every screen before a line of code." |
| **The Signal Cabin** (new) | Upper | It runs the business too (admin systems) | An old Secunderabad railway signal cabin. Each brass lever is an admin action. Enquiry cards slide in on little rails from the windows, then "New" → lever pull → "Booked", and a lamp turns green. Click opens the live Admin panel demo (fake data, labelled "Demo data"). Line: "Bookings, enquiries and staff, all in one panel." |
| **The Map Room** (merged into Extras) | Upper | Being found: Google Business Profile, Maps, QR | A brass relief map of Hyderabad on a big table, next to the departures board. As the board flips each service, pins rise on the map, and a QR code unfolds in the air like origami. No real business names on the map. |
| **The Greenhouse** (new) | Upper, before the Rooftop | Care plans (AMC): backups, updates, small changes | A deco glasshouse floating in the sky. Every potted plant is a site that keeps growing. A watering can tips by itself ("updates"), a seed vault glows ("backups"), and a small gardener's ledger turns its pages ("small changes each month"). Line: "We don't launch and leave. We look after it." |

Keep facts honest: no invented results, client names or numbers in any of these.

### The Sky Quarter: a more complex upper floor
Today the upper floor is fragments joined by straight bridges. Make it a **floating archipelago around a central landmark**, with a different way of travelling between each pair of fragments and real height changes.

- **The hub: a floating Clock Tower.** A Secunderabad-style clock tower hangs in the middle of the sky, rooted in stone, with water dripping from its base into the lake far below. Its **clock face is the progress indicator**: the hands move as the visitor scrolls, and the floor plan button sits on it. The walk spirals **up around the tower**, so every fragment is visible from every other one.
- **The order upstairs (rising level by level):**
  1. **Library shaft exit → Landing ("core memory").** Existing. Door 201 is here (a secret).
  2. **HOME: Scrollstory TV.** Existing, with the tagline and channels.
  3. **The Drafting Room.** New.
  4. **The Signal Cabin.** New.
  5. **Extras + Map Room.** The existing board and clock, plus the map.
  6. **The Greenhouse.** New.
  7. **Rooftop front desk.** Purple sky finale, application form, and the final pull-back.
- **A different journey between every pair:**

  | From → To | How the camera travels |
  |---|---|
  | Landing → HOME | Walk through door frames standing alone in the air. Each one changes the time of day a little |
  | HOME → Drafting Room | A rope bridge that sways with the scroll |
  | Drafting Room → Signal Cabin | **A funicular car on a rail** (station theme). The camera sits inside and looks out sideways |
  | Signal Cabin → Extras | Through an entrance membrane. The camera **falls a short way** onto a lower fragment, for a real height change |
  | Extras → Greenhouse | **A sky canal.** Water flows *upward* out of the lake in a waterfall that runs in reverse, and a paper boat carries the camera along it |
  | Greenhouse → Rooftop | **Kites lift the camera** for the last climb. The kite-fish flock gathers under it, which ties back to environment A |

- **Underside detail (environment C):** every fragment has rough stone roots, hanging plants and slow drips that fall all the way to the mirror lake. When the camera looks down from bridges, the lake shows the reflection of the whole archipelago.
- **The sky changes as you climb:** golden hour at the landing, then deeper, then purple twilight with golden rims at the rooftop.

### Rail, length and the floor plan
- Adding the new rooms makes the walk longer. Keep each room's hold short (about 60–90 vh) and let travel segments carry the feeling. **Target total about 4,200 vh**; tune `TOTAL_VH`.
- Update `world.js` colliders and bridges for every new piece. `check.mjs` must check the funicular, the boat and the kite lift as moving platforms (eye height and clearance along their paths).
- The floor plan becomes two layers: a ground-floor plan, and a top-down "sky map" of the archipelago around the clock tower. It shows found secrets, and every room is a jump target.
- The full order of the walk:
  1. Arrival (intro build)
  2. Lobby
  3. Gallery
  4. **Renovation**
  5. Workshop
  6. Worth it
  7. Stairs → library shaft
  8. Landing
  9. HOME / Scrollstory TV
  10. **Drafting Room**
  11. **Signal Cabin**
  12. Extras + Map Room
  13. **Greenhouse**
  14. Rooftop desk
  15. Final pull-back

### Phase 5 order of work
1. Sky Quarter layout in `world.js` plus the rail (blockout only), and `npm run check` passes.
2. Clock-tower hub with the progress clock.
3. The new rooms as blockouts: Renovation, Drafting Room, Signal Cabin, Greenhouse.
4. The travel set-pieces: rope bridge, funicular, fall, sky canal, kite lift.
5. Props in Blender (`blender/components.py`):
   - levers, signal lamps, drafting table, watering can
   - a paper boat, a funicular car
   - greenhouse frames, a brass map
   - Renovation: dusty clock, 2015-web props (marquee, guestbook)
   - Drafting Room: wax-sealed blueprint, easels for the vault
   - Signal Cabin: logbook, rubber stamp
   - Greenhouse: seed vault door, seed packets, sprout animation
   - Clock Tower: keyhole, watchmaker desk, gears and springs
6. Secret rooms and interactions (Phase 4 secrets first, then v1.1 secrets). Implement the "secrets found" counter on the floor plan and the holographic firework for finding all 11. The Clock Tower keyhole needs a gate: check `>=7` secrets found before it glows.
7. Hint system: holographic fireflies, floor-plan radar, wall scratches, lying water reflections. All tied to the unfound-secrets list.
8. Building reality-to-imagination gradient: height-based opacity + holo edges on upper geometry, breathing transition zone, flipped balance at purple-sky, dream reflection in water.
9. Sound system: `src/sound.js`. Lazy-loaded per room, spatial panning, `AudioContext` on first gesture. The floating speaker toggle with `localStorage` (try/catch). Proximity whispers for secrets, chimes on find, ambient drone per room, and the full transition/interaction sound set.
10. Dress, light and final passes.
