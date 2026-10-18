> **Static render mode:** Paints without usable 3D assets display their original image with a charcoal **STATIC RENDER** credential and **SAVE RENDER** control. Failed 3D loads use the same fallback; working models retain orbit controls, scenes and 3D PNG export. Saving a static render downloads the original image bytes with a descriptive filename. **RENDER UNAVAILABLE** appears only if the static image is missing or cannot load.

## Stage browser regression checks

Run `npm run check` for the static-site validation. The optional `npm run test:stage` uses Chromium to exercise original-image downloads, actual Three.js rendering/export, model/image failures, delayed selection requests, synchronized metadata, and stable desktop/mobile controls in both app shells. It mocks remote content and uses local assets; it does not publish or deploy.

Keep the browser test dependencies outside this site's published directory:

```sh
npm install --prefix /tmp/aetherwing-browser-tests --cache /tmp/aetherwing-npm-cache --no-package-lock --no-audit --no-fund playwright-core three@0.169.0
PAINT_TEST_MODULES=/tmp/aetherwing-browser-tests/node_modules npm run test:stage
```

Chromium defaults to `/usr/bin/chromium`; set `CHROMIUM_PATH` for another installation. Set `PAINT_TEST_ARTIFACTS` to a directory outside the repository to save stage screenshots. Software WebGL is enabled for headless environments.

# Aetherwing Paint Booth v85 — Non-starter identity correction

- No #42 GK3R active bay or former-team-driver identity: he never raced for Aetherwing.
- Drop only the obsolete per-driver #42 override; preserve original files and independent history.
- Keep six active garages and 23 active slots, and all Paint Booth controls.

# Aetherwing Paint Booth v84 — GK3R Active Roster Exit

- Removes GK3R / @sealsntags from the active UARL D1 driver bay after leaving the league.
- Does not invent a #42 OPEN replacement; historical paint/override metadata remains available for archive use.
- Active-slot totals derive from the roster and now fall by one.
- Keeps all v83.1 deploy-size, roster, stage-state, accessibility, ENDURANCE, and historical-paint fixes.

# Aetherwing Paint Booth v83.1 — Deploy Size Fix

- Keeps all v83 roster, historical-paint, render-state, accessibility, ENDURANCE, and counter fixes unchanged.
- Removes an unused 35 MB local RIDGID/Home Depot PNG that was not referenced by the live Paint Booth; that paint continues to use its existing hosted image URL.
- Reduces the expanded deploy from roughly 51 MB to roughly 17 MB and leaves no individual bundled file above 10 MB.
- Intended specifically to make Netlify Drop/manual deployment reliable again.

# Aetherwing Paint Booth v83 — Roster + Stage State

- Current UARL D1 roster/manufacturer synchronized to Toyota canon.
- #32 Mobil 1 Cadillac preserved as historical instead of relabeled.
- Jaxon removed from active Kmart competition slots while historical paints remain available.
- Render state is now LOADING → RENDER READY or RENDER UNAVAILABLE + Retry.
- Stage alt text is generated from the selected paint in the same render cycle.
- Numberless McLaren uses ENDURANCE, never #TEAM.
- Facility counters derive from current roster/paint state.
- Main-site `/api/site-content` is used as the preferred live roster source with the bundled v83 canon as an offline fallback.

# Paint Booth v82 — Anniversary Attribute Activation Fix

Critical fix: Anniversary Week now sets the exact `data-anniversary-2015="true"` attribute used by the visual CSS. Prior v76–v81 builds could swap logos/timer/HUD while leaving the main Paint Booth shell in its standard black/red state because JavaScript wrote `data-anniversary2015` instead. The unified main-site blue/teal/green Anniversary shell can now actually activate. Timer remains Oct. 1–7 ET with automatic standard-UI return Oct. 8.

# v82 — Blue-Flow Anniversary Shell

Paint Booth Anniversary Week now uses blue as the full environment color instead of reading as a blackout app with blue trim. The utility/header shell, mobile drawer, Anniversary banner, facility framing, archive, garage rails, controls, and footer use the same deep navy / electric blue / teal / green flow as the main Aetherwing site. The actual render bay remains deliberately dark/neutral so car paint colors stay accurate. The annual Oct. 1–7 Eastern Time timer and automatic Oct. 8 return to standard Paint Booth UI remain unchanged.

# Aetherwing Paint Booth v75

Render-export update built directly on the v66 visual redesign. The interaction model is intentionally preserved: garage rail, driver stalls, paint rack, active stage, scene/showroom picker, lighting/environment types, scheme info, mobile booth controls, live registry, archive search/filtering, Next Race reveal, and reload-safe direct paint routes all keep their existing behavior.

The v66 pass changes presentation only. The Paint Booth now uses a cleaner motorsports design-studio shell with a slimmer branded HUD, glassier rail surfaces, a larger visual emphasis on the center stage, compact driver/garage controls, a refined scene drawer, and a gallery-style archive. Responsive rules keep the stage first on tablet/mobile while the same garage/driver/paint controls follow below it.

The 35 seed paints live in `data/paint-seed.json`. On Netlify, `/api/paints` forwards to the main site's public paint registry, so admin updates continue to appear in the booth. Without that API, the seed catalog remains usable.

Direct paint URLs continue to use the reload-safe app-shell route (`/<paint-slug>/`): Netlify rewrites a single-segment paint path to `index.html`, where the booth resolves the slug against the bundled and live registries.

Run `npm run check` to verify the archive or `npm run preview` for a local static preview. Deploy the ZIP as a Netlify site rooted at this directory.


## v67 render export

The active stage now includes an **Export Render** control. It opens a dedicated output panel without changing the existing scene/showroom picker or paint-selection workflow. Exports are composited from the active paint and selected environment, so navigation, garage controls, driver controls, scene controls, and scheme UI are never baked into the finished image.

Available output settings:

- Scene Only or Scene + Info Plaque
- Landscape 1600×900, Square 1080×1080, or Portrait 1080×1350
- Standard or High Resolution (2× selected dimensions)
- Current Scene or Clean Studio background
- Open Preview and Save PNG

Remote paint images are reloaded with anonymous CORS for canvas export. The existing i.ibb.co render pipeline already uses the same CORS-safe path for dynamic Neon Stage color sampling.


## v68 mobile stability + scene library

- Export Render was rebuilt as a compact low-memory sheet. On phones/tablets the stage is paused while the export sheet is open, backdrop blur is disabled, High Resolution is disabled, Quick Preview is capped to 800px wide, and temporary canvases are immediately released after PNG creation.
- The active paint label is now a one-line mobile strip and the large side-wall geometry is narrowed so it no longer covers the render.
- Scheme IDs are available directly on the active stage as a tap-to-copy chip whenever the selected Roblox paint has an ID.
- The Scene drawer is categorized into Studio, Race Day, Celebration and Special groups, including Studio Clean/Dark, Showroom White/Black, Pit Road, Trackside Day/Sunset/Night, Victory Lane/Night/Confetti, Retro Photo Set and Rainy Pit Lane while preserving the existing scenes.
- Victory Confetti overlays confetti in front of the car and the export compositor understands the new scene types.


## v69 numberless endurance cards

- Numberless endurance schemes now use an `ENDURANCE` classification rather than an empty number prefix.
- The Aetherwing Endurance Team McLaren card renders `ENDURANCE · MONSTER ENERGY (LANDO NORRIS)` with a charcoal distressed credential, Frost White type and a thin Aether Blue accent.
- Numbered paint cards keep their existing number/sponsor hierarchy.
- Search/filter datasets and paint-loading/full-render controls are unchanged.


## v70 mobile paint-name stage clearance

- The active paint name strip on phones now has a dedicated lane above the car render instead of stretching through the stage.
- The mobile rule explicitly clears the inherited bottom anchor (`bottom: auto`) so the label cannot become a tall overlay over the car.
- Active paint names no longer use ellipsis on mobile; the full title can wrap naturally when needed.
- The car render begins below the identity strip, preserving the render as the visual priority.
- Desktop stage treatment, Scheme ID controls, scene picker, export system, search/filter behavior, live registry, and reload-safe direct paint routes are unchanged.


## v71 export plaque typography + tags

- Scene + Info Plaque exports now render the paint name in the hosted **Road Rage** display font. The export compositor waits for the font to load before rasterizing the canvas.
- Paint tags (the same `special` tags shown in the Scheme Dossier, including Chase, Dash4Cash, Throwback, Special, Crown Jewel and related labels) now render as compact Aether Blue-accented credentials on the info plaque.
- Plaque spacing/reserved canvas area was adjusted so the added tags do not crowd the car render.
- Opening the Render Export menu no longer auto-focuses the format/resolution picker. Focus moves to the close control instead, preventing mobile Safari from immediately summoning the native picker.
- v70 mobile paint-name clearance, v69 numberless endurance card support, Scheme ID behavior, scene export, filters/search, and reload-safe direct paint URLs remain intact.


## v72 neon stage color match

- Neon stage now keys much harder off the active paint's dominant sampled color.
- The stage glow, wall wash, floor beam, and export neon scene all lean into that same primary hue.
- Secondary neon color is now a same-family companion tint instead of drifting to a totally different accent.


## v73 grounded render stance

- Lowered the staged render slightly and strengthened the under-car contact shadow so the car feels planted instead of floating.
- Added a tighter contact patch plus a broader floor reflection/read so the render looks like it is sitting on the stage surface.
- Upgraded the export canvas floor shadow too, so saved renders feel grounded the same way the live booth does.


## v74 desktop paint-name banner clearance

- Fixed the desktop active-paint label inheriting both top and bottom anchors and stretching into a giant vertical panel.
- Desktop now uses a compact upper-left paint label sized to its content.
- Long paint names remain readable and may wrap naturally without covering the render.
- Mobile v70 paint-name behavior is unchanged.
- Mobile High Quality export behavior is unchanged.


## v75 mobile-safe High Quality export

- High Quality is selectable on phones and tablets again.
- Mobile High uses an adaptive ~1.5× export scale with hard pixel and maximum-dimension caps instead of the old desktop 2× allocation.
- Devices that explicitly report very low memory use a more conservative ~1.3× cap rather than disabling High entirely.
- Quick Preview remains Standard/800px-capped, the live stage remains paused while the export sheet is open, and temporary export canvases are destroyed immediately after use.
- The v74 desktop paint-name banner anchoring fix remains included.


## v76 — Anniversary Week
- Annual Oct. 1–7 ET 2015 throwback UI using the Aetherwing EST. 2015 logo.
- Header, facility HUD, garage directory, control bench, info drawer, scene picker, and paint collection receive the heritage blue/teal treatment.
- Paint/render imagery is not recolored by the anniversary UI.
- `?anniversary=throwback` forces the takeover for QA; `?anniversary=off` disables it.
- Preserves v75 mobile-safe High Quality render limits.

## v78 — Anniversary UI parity
- Brings Paint Booth Anniversary Week into the same visual family as the main Aetherwing site instead of only sharing its colors.
- Adds the matching EST. 2015 utility strip, glossy 2015 header chrome, Race Control treatment, and main-site Anniversary bottom HUD/ticker.
- Facility HUD, garage/driver rails, paint rack, scene picker, info drawer, collection toolbar/cards, and footer now use the same blue/teal/green debut-era panel language as aetherwing.net.
- The transparent Anniversary Week logo now swaps in the header, facility HUD, and footer together.
- The actual paint/car render is never recolored by the anniversary skin.
- Preserves the Oct. 1–7 ET schedule plus `?anniversary=throwback` and `?anniversary=off` QA overrides.
- Preserves all v75 mobile-safe High Quality export safeguards.


## v78 — Anniversary timer synchronization
- Anniversary Week uses the same recurring America/New_York rule as the main site: Oct. 1 12:00 AM ET through Oct. 7 11:59:59 PM ET.
- At exactly Oct. 8 12:00 AM ET, the anniversary data state turns off and the normal Paint Booth UI returns automatically; no redeploy is required.
- `?anniversary=throwback` / `?anniversary=retro` force the takeover for QA; `?anniversary=off` forces the standard UI.
- Anniversary CSS and JS use versioned v78 filenames and explicit no-store headers to prevent an older anniversary skin from surviving a deployment in browser/CDN cache.


## v80 — Unified Main-Site Shell
- Paint Booth now uses the same public-site shell as aetherwing.net year-round: utility bar, header proportions, logo placement, desktop navigation, Race Control block, hamburger button, and mobile drawer hierarchy.
- Anniversary Week now uses the same deep-blue 2015 header, blue/teal/green race stripe, anniversary banner, navigation drawer treatment, and bottom ticker as the main site.
- The Paint Booth facility flows directly out of that shell with a main-site-style Anniversary hero/HUD instead of dropping immediately into the old black standalone-app look.
- The actual car render stage and paint imagery remain color-neutral so scheme colors stay accurate.
- Anniversary Week remains automatic every Oct. 1–7 in America/New_York and returns to the standard shared shell at midnight ET on Oct. 8.
- v75 mobile-safe High Quality render/export safeguards remain intact.
