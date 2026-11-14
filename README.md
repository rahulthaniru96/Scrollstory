# Scrollstory world v2: walkthrough

Step 2a of `D:\rahul-context\scrollstory\world-v2-build-plan.md`: the whole world as a grey blockout with the real camera rail. Nothing here is final art.

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
| `scripts/check.mjs` | The build-time check from section 4 of the design. |

## Limits of this step

- The check measures against the blockout's boxes, cylinders and the stair's sampled points. When Blender models arrive it has to test real meshes.
- No water mirror, cursor air, card clicks or sound yet. Those come with the feel-test room and the dressing step.
- Card sites are placeholders labelled "Demo".
