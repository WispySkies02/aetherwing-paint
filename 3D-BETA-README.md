# Aetherwing Paint Booth v87 — Complete 3D-ready collection beta

**Deploy only to paint.aetherwing.net after main-site v2.0.42 is published.** Keep v85/v86 as rollback packages.

- The existing original Paint Booth showroom stage, scenes, archive, filters, Scheme IDs, exports, drivers and garage displays are preserved.
- The old 3D MODEL LAB strip is removed. Every scheme is selectable through the existing lower paint rack, now with **search across all garages**, **3D ready only** filter, and visible 3D status chips.
- 2D RENDER and 3D MODEL share the existing stage. 3D is enabled only when a compatible real model and that exact flat livery texture have been supplied. Missing 3D assets keep their working 2D static render.
- The known five demo schemes remain in the ordinary paint collection; no special demo-only selector is required.
- 3D light exposure and ambient/key lights are reduced for **all 3D models**. Actual final appearance needs testing on desktop/mobile.
- The 3D body library includes NRRS Toyota (also compatible with Cadillac-branded visual textures), Sunoco truck, and O'Reilly Chevrolet body (also compatible with Dodge-branded visual textures), including the latest previously tested wheel-fit preset.
- The 3D engine initializes on demand and frees GPU resources when switching back to 2D. 2D remains the default for mobile/performance reasons.
- UARL Late Models remain 2D-only while their geometry/wheels/UV pipeline is repaired. iRacing and closed D2 need compatible separate models/UVs before they can work in 3D.

## Deployment checklist
1. Deploy **main Aetherwing v2.0.42** to aetherwing.net first (provides uploads, API textures, and the Admin 3D tab).
2. Deploy **Paint Booth v87** to paint.aetherwing.net.
3. In Admin 3D Viewer, upload a flat PNG onto one NRRS Toyota record; watch it turn 3D READY after confirmed publication.
4. Refresh the Paint Booth; search for that paint in the bottom picker; choose **3D MODEL** and confirm the exact scheme loads in the original stage.
5. Switch to another paint with no PNG and confirm 2D fallback. Switch between ready Toyota, Craftsman truck, and O'Reilly Chevy-body demo schemes.
6. Inspect all 3D material brightness and camera movement on desktop and mobile.

Local preview: `python -m http.server 8000` in the extracted package, then visit http://localhost:8000. The beta requires network access to import Three.js and the main-site registry.

**Source-level verification passed**, but this runner blocked interactive browser navigation and production Blob services; real-world testing is still required before replacing the public booth.
