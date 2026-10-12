# Aetherwing Paint Booth v88 — 3D-first showroom + render fallback

Deploy this ZIP to **paint.aetherwing.net** after **main website v2.0.42** (the Admin 3D Viewer tab and uploader). No additional main-site release is needed to enable this fallback behavior.

- The original showroom architecture, scene picker, garages, drivers, bottom paint rack, search/filters and Scheme IDs remain.
- Selecting a paint automatically attempts its own assigned 3D body and flat livery texture. There is no 2D/3D switch and no separate Model Lab strip.
- If the model or PNG has not been uploaded, the selected paint's existing database render appears with the small public label **3D unavailable**. The same fallback applies if a 3D load fails.
- All detailed missing-PNG/body statuses stay inside the main site's Admin → 3D Viewer tab; the public stage does not instruct visitors to use Admin.
- The original static render fields are preserved because they support this fallback. No fallback images are substituted from other paints.
- On supported paints, the interactive 3D car loads into the exact same original stage, and the 3D PNG button saves its current camera view.
- Late Models, iRacing, and any other missing 3D geometry continue displaying their own static renders until compatible models and UV-ready paint PNGs are provided.
- 3D models load on demand; browser/WebGL failures are handled by the existing static render.

## Deployment
1. Keep main website v2.0.42 or newer, which supplies Admin → 3D Viewer.
2. Deploy this Paint Booth v88 ZIP to paint.aetherwing.net.
3. Add each missing paint's original flat livery PNG and compatible body assignment in the main-site Admin.
4. Check that each paint from the normal bottom picker either displays 3D or its own correct database render plus **3D unavailable**.

This release is a test build; production upload/sync and browser behavior should still be verified on the deployed Netlify environment.
