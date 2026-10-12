# Aetherwing Paint Booth v86 — Unified 3D Beta

**Separate Netlify site:** paint.aetherwing.net. Do not deploy this over the main aetherwing.net website.

## What's in the release

- The full original v85 Paint Booth stage, scene picker, garage rail, driver stalls, paint rack, information rail, archive, 2D export, Scheme IDs, and historical roster logic are retained.
- A new `3D MODEL LAB` strip is located immediately above the original showroom stage.
- Select one of five test paints to load that paint into the existing booth. When 3D is available, click `3D MODEL` to rotate and zoom; `2D RENDER` switches back.
- Five beta selections: NRRS Mobil 1 Toyota #32; NRRS Palmetto Gaming Toyota #32; NRRS Cadillac-branded paint on Toyota #32; Craftsman RAM #54 truck; O’Reilly Mobil 1 Dodge-branded #15 on the Chevrolet body.
- 3 reusable 3D bodies: NRRS D1 Toyota, Sunoco CWS15 truck, O’Reilly D2 Chevrolet with the v6 prototype wheel positions.
- Each beta paint record explicitly stores `bodyModel`, `liveryTexture`, and `manufacturer` separately. The model is never inferred from painted logos.
- The former 35 Paint Booth records remain intact. Five 3D beta test records are appended (total 40). The beta records have no Scheme ID; no ID is fabricated.
- UARL Late Models remain available in static 2D only. iRacing and every untested livery also remain 2D only. No incorrect texture is substituted.
- WebGL only initializes when the visitor selects 3D. No continuous animation runs; rendering is event-driven. Switching to 2D releases GPU resources, and low-power devices keep the original 2D alternative.

## Local test

1. Extract this ZIP to a NEW folder.
2. In that folder, run `python -m http.server 8000` (if port 8000 is already in use, try 8001).
3. Open http://localhost:8000 (or the port you selected).
4. Under `3D MODEL LAB`, choose one of the five example paints. It selects that paint in the existing stage and starts 3D automatically. Drag to rotate; scroll/pinch to zoom; use `2D RENDER` to return to standard Paint Booth mode.
5. Test the original scenes and 2D render export separately. `3D PNG` captures just the model canvas, **not** the composite 2D scene.
6. Test at narrow mobile widths, and especially check color/UV correctness of the three body families.

## Deployment and technical notes

- This is a **beta test package**. Structural checks pass, but interactive browser end-to-end verification could not be completed in the packaging environment; review in your own browser before replacing a public deployment.
- The 3D viewer imports Three.js from jsDelivr on the first 3D request and requires internet access. If it fails, the booth falls back to 2D.
- The current 3D data lives in the bundled `data/paint-seed.json`; matching per-paint 3D fields are consumed by the beta controller. A dedicated editable 3D CMS model uploader/field UI is **not yet implemented**; adding models to the Admin remains a later phase.
- This package embeds the five user-provided textures as WebP and uses the supplied exported meshes. The O’Reilly wheel preset remains provisional, based on the approved v6 prototype screenshot.
- Inspect permission/ownership for Roblox source assets before publishing models on a public website.
- Keep your v85 ZIP as a rollback; no main-site files are included.

## Validation

Run `npm run check` with Node.js 22. Output covers original Paint Booth compatibility and new 3D library files.
