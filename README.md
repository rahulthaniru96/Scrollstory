# Scrollstory world v2: walkthrough

Step 2a of `D:\rahul-context\scrollstory\world-v2-build-plan.md`: the whole world as a blockout with the real camera rail, with the dreamy layer and furnished rooms on both floors. Nothing here is final art.

## Run

```
npm run dev      # open the address it prints, then scroll
npm run check    # rail check: clearance, eye height, doors, bridges, speed limits
npm run build    # runs the check first and stops if it fails
```

Keys: `H` hides the readout, `R` tests reduced motion, `Esc` closes the floor plan.

## Files

| File | What it holds |
|---|---|
| `src/world.js` | Every wall, floor, counter, card and floating object, in metres. The scene and the check both read it. |
| `src/rail.js` | The camera path: where it stands and where it looks for every bit of scroll. Total length is `TOTAL_VH`. |
| `src/main.js` | The scene, scroll, springs, speed caps, mist cut, floor plan and readout. Feel numbers are in `FEEL` at the top. |
| `src/spring.js` | The frame-rate independent spring. |
| `src/dress.js` | The dreamy layer: sky, mirror water, cloud sea, portal windows, drifting lamps, paper birds, dust and petals. |
| `src/rooms.js` | Every room's props and what they do: things hover, turn, come apart and drift. Loads the models from `public/models`. |
| `blender/components.py` | Builds the 22 props in Blender, exports `public/models/*.glb` and renders `blender/renders/` (`all-components.jpg` shows them all). Run: `"D:\Blender\blender.exe" -b --python blender/components.py`, or add `-- sofa box_tv` for only some. |
| `scripts/check.mjs` | The build-time check from section 4 of the design. |
| `scripts/shot.sh` | Saves still frames at given scroll positions: `npx vite build --base=./`, then `sh scripts/shot.sh <folder> 700 1040`. Any page address also takes `?at=1040` to freeze the walk there. |

## Limits of this step

- The check measures against the blockout's boxes, cylinders and the stair's sampled points. Each prop has a box or sphere around it in `world.js`; the check does not read the models' own meshes.
- Walls, floors, counters and fragment slabs are still blockout boxes. The props are low-poly models from the script, not hand-modelled.
- No card clicks or sound yet. The gate has no plaque yet, though the camera tilts up to where it goes.
- Card sites are placeholders labelled "Demo".
