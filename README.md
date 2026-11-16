# Scrollstory world v2: walkthrough

Step 2a of `D:\rahul-context\scrollstory\world-v2-build-plan.md`: the whole world as a blockout with the real camera rail, with the dreamy layer and furnished rooms on both floors. Nothing here is final art.

The v3 changes are listed in `world-v3-changes.md`. Phases 1 to 3 and the room clarity fixes (items 1 to 10, 15 and 16) are built; phases 4 and 5 are not.

## Run

```
npm run dev      # open the address it prints, then scroll
npm run check    # rail check: clearance, eye height, doors, bridges, speed limits
npm run build    # runs the check first and stops if it fails
```

Keys: `H` hides the readout, `R` tests reduced motion, `Esc` closes the floor plan.
Addresses: `?at=1040` freezes the walk at 1040 vh, `?p=1040` opens it there, and `?at=1&intro=3.2` holds the intro at 3.2 seconds.

## Files

| File | What it holds |
|---|---|
| `src/world.js` | Every wall, floor, counter, card and floating object, in metres. The scene and the check both read it. |
| `src/rail.js` | The camera path: where it stands and where it looks for every bit of scroll. Total length is `TOTAL_VH`. |
| `src/main.js` | The scene, scroll, springs, speed caps, mist cut, floor plan and readout. Feel numbers are in `FEEL` at the top. Also the HTML over the canvas: captions, the shop and counter cards (`PLANS`, `WORTH`), the plan chooser, the TV channels and the front desk's form. |
| `src/spring.js` | The frame-rate independent spring. |
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
- No card clicks or sound yet.
- The plaque's wordmark is a texture on a raised panel; only the Doorway S mark is modelled.
- The form stores nothing. Submit opens WhatsApp with the answers filled in.
- The shops have no "Try it live" button yet: the demo sites have no public address. Each shop's button opens the form with that plan chosen.
- Prices on the plan cards are the launch prices from the rate card of 13 Nov 2026. Change them in `PLANS` in `src/main.js`.
- The rail check's "no shake" rule fails when the authored yaw reverses twice within 20 vh.
- Card sites are placeholders labelled "Demo".
- The walk is 4065 vh long, so `?at=` positions from before v3 no longer match.
- Each Gallery card appears when the backward walk brings it into the frame (about 39 vh apart), not 8 vh apart as the brief says, because a card behind the camera cannot be seen appearing.
- Phones get a frosted tint in the doorways instead of live refraction.
- When the intro ends, the materials recompile once, which can cause a short hitch.
- Not checked: motion and frame rate (only still frames from software rendering were looked at), a real phone, and the lake drop with the rock roots (no frame on the rail looks down at them).
