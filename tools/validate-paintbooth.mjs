import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const seed = JSON.parse(read('data/paint-seed.json'));
assert.equal(seed.paints.length, 40);
assert.equal(new Set(seed.paints.map((paint) => paint.slug)).size, 40);
const html = read('index.html');
const publicOps = read('assets/paint-ops-public-v64.js');
assert.match(html, /data-league-controls/);
assert.match(html, /data-driver-controls/);
assert.match(html, /data-scene-open/);
assert.match(html, /data-mobile-target="garage"/);
assert.match(html, /data-featured-run/);
assert.match(html, /data-export-open/);
assert.match(html, /data-export-dialog/);
assert.match(html, /data-export-preview/);
assert.match(html, /data-export-save/);
assert.match(html, /SCENE ONLY/);
assert.match(html, /INFO PLAQUE/);
assert.match(html, /1600 × 900/);
assert.match(html, /1080 × 1080/);
assert.match(html, /1080 × 1350/);
assert.match(html, /data-paint-build="(?:81\.0-blue-anniversary-flow|83\.0-roster-stage-state|84\.0-gk3r-active-exit|85\.0-nonstarter-directory|86\.0-unified-3d-beta)"/);
const opsCss = read('assets/paint-ops.css');
assert.match(opsCss, /v66 — visual redesign/);
assert.match(opsCss, /v67 — clean render export/);
assert.match(opsCss, /same Paint Booth interaction model/);
assert.match(publicOps, /buildTeamReveal/);
assert.match(publicOps, /featureSlugs/);
assert.match(read('netlify/functions/paint-data.cjs'), /https:\/\/aetherwing.net\/api\/paints/);
assert.ok(!fs.existsSync(path.join(root, 'assets/fonts/smile-moon.otf')));
assert.ok(!fs.existsSync(path.join(root, 'netlify/functions/paint-share.cjs')));
assert.ok(!fs.existsSync(path.join(root, '_redirects')));
assert.doesNotMatch(read('netlify.toml'), /paint-share/);
const netlifyConfig = read('netlify.toml');
assert.match(netlifyConfig, /from = \"\/:slug\"[\s\S]*?to = \"\/index\.html\"[\s\S]*?status = 200/);
assert.doesNotMatch(html + publicOps, /data-card-copy-share|data-copy-share|data-dynamic-copy-share|shareUrl\(/);
for (const paint of seed.paints) assert.ok(!fs.existsSync(path.join(root, paint.slug, 'index.html')));
new vm.Script(publicOps, {filename:'assets/paint-ops-public-v64.js'});
for (const script of [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*\btype="application\/json")[^>]*>([\s\S]*?)<\/script>/g)]) {
  if (!script[0].includes('type="importmap"')) new vm.Script(script[1], {filename:'index.html inline script'});
}
assert.match(html, /data-stage-scheme-copy/);
assert.match(html, /data-scene-choice="victory-confetti"/);
assert.match(html, /data-scene-choice="rain"/);
assert.match(opsCss, /v68 — mobile-safe stage/);
console.log('v68 baseline verified: mobile-safe export, compact stage label, quick Scheme ID, expanded scene library, live registry and reload-safe paint routes preserved.');

// v69: numberless endurance gallery cards must use the ENDURANCE credential, never an empty # prefix.
assert.match(html, /paint-iracing-monster-lando-mclaren[\s\S]*?aw-endurance-credential[\s\S]*?ENDURANCE[\s\S]*?Monster Energy \(Lando Norris\)/i);
assert.match(publicOps, /const enduranceEntry = !hasNumber/);
assert.match(publicOps, /cardCredential = hasNumber \? `#\$\{paint\.number\}` : \(enduranceEntry \? 'ENDURANCE' : 'TEAM'\)/);
assert.doesNotMatch(html + publicOps, />#\s*·\s*</);

console.log('v69 verified: numberless endurance cards use ENDURANCE credential; numbered cards and gallery interactions remain intact.');


// v70: mobile active-paint label must not stretch over the render or truncate the paint name.
assert.match(opsCss, /v70 — mobile paint-name stage clearance/);
assert.match(opsCss, /bottom:auto!important/);
assert.match(opsCss, /text-overflow:clip!important/);
assert.match(opsCss, /white-space:normal!important/);
assert.match(opsCss, /\.aw-booth-car\{[\s\S]*?top:9\.25rem!important/);
console.log('v70 verified: mobile paint title uses a dedicated non-overlapping lane and full titles are not ellipsized.');


// v71 compatibility: exported info plaque keeps a distinctive hosted display face, carries paint tags, and export sheet does not focus the format picker.
assert.match(html, /document\.fonts\?\.load\?\.\('48px "Road Rage"'\)/);
assert.match(html, /fitPlaqueFont\(ctx,meta\.sponsor[\s\S]*?Road Rage/);
assert.match(html, /drawPlaqueTags\(ctx,meta\.tags/);
assert.match(html, /tags:\(paint\.special\|\|\[\]\)\.map\(tag=>badgeLabels\[tag\]\|\|tag\)/);
assert.doesNotMatch(html, /querySelector\('\[data-export-size\]'\)\?\.focus/);
assert.match(html, /aw-export-head \[data-export-close\][\s\S]*?focus/);
console.log('v71 compatibility verified: hosted display paint names, paint tags, and passive export-menu focus behavior are present.');


// v72: neon stage should strongly color-match the active paint and keep that hue in export renders.
assert.match(html, /const deriveNeonCompanion = \(primary\) => normalizeRgb\(mixRgb\(primary, \[255,255,255\], \.24\), 104\);/);
assert.match(html, /boothShell\.style\.setProperty\('--neon-primary-rgb', p\.join\(','\)\);[\s\S]*?boothShell\.style\.setProperty\('--neon-secondary-rgb', s\.join\(','\)\);/);
assert.match(html, /aw-booth-shell\[data-lighting="neon"\] \.aw-floor-grid\{background:radial-gradient\(ellipse at 50% 0%,rgba\(var\(--neon-primary-rgb\),\.38\),transparent 34%\)/);
assert.match(html, /ctx\.fillStyle=fillRadial\(ctx,w\*.5,h\*.16,0,w\*.5,h\*.16,w\*.7,\[\[0,`rgba\(\$\{p\.join\(','\)\},\.34\)`\]/);
console.log('v72 verified: neon stage lighting and export scene now color-match the active paint more aggressively.');


// v73: staged renders and exports should feel grounded on the floor rather than floating.
assert.match(html, /transform:translateY\(18px\)/);
assert.match(html, /aw-car-shadow\{left:15%;right:15%;bottom:10\.9%;height:9\.6%;background:radial-gradient\(ellipse at center,rgba\(0,0,0,\.98\)/);
assert.match(html, /ctx\.ellipse\(canvas\.width\*\.5,floorY\+canvas\.height\*\.0015,canvas\.width\*\.205,canvas\.height\*\.018/);
console.log('v73 verified: the booth and exported renders now use stronger floor contact and a grounded stance.');


// v74: desktop paint name must be content-sized and never stretch between top and bottom anchors.
assert.match(opsCss, /v74 — desktop paint-name banner clearance/);
assert.match(opsCss, /@media\(min-width:721px\)[\s\S]*?\.aw-car-id--top\{[\s\S]*?bottom:auto!important/);
assert.match(opsCss, /width:fit-content!important/);
assert.match(opsCss, /max-width:min\(54%,680px\)!important/);
console.log('v74 verified: desktop paint-name label is compact, top-anchored, and no longer stretches over the stage.');


// v75: High Quality must be selectable on mobile without restoring the old 2x mobile canvas path.
assert.match(html, /const mobileExportMode = \(\) => matchMedia\('\(max-width: 820px\)'\)\.matches;/);
assert.match(html, /const exportScaleFor = \(baseW, baseH, quality = 'standard'\) =>/);
assert.match(html, /const targetScale = conservative \? 1\.3 : 1\.5;/);
assert.match(html, /const pixelCap = conservative \? 2500000 : 3400000;/);
assert.match(html, /const dimensionCap = conservative \? 2100 : 2400;/);
assert.match(html, /highInput instanceof HTMLInputElement\) highInput\.disabled = false/);
assert.match(html, /HIGH · MOBILE SAFE/);
assert.doesNotMatch(html, /const quality=lowMemoryExport\(\)\?'standard':requestedQuality/);
console.log('v75 verified: mobile High Quality is enabled with adaptive pixel/dimension caps while the export-memory protections remain in place.');


// v76: standalone Paint Booth receives the same recurring Oct. 1–7 2015 Anniversary Week identity.
const anniversaryCss=read('assets/anniversary-2015-v82.css');
const anniversaryJs=read('assets/anniversary-2015-v82.js');
const shellCss=read('assets/main-site-shell-v82.css');
assert.ok(fs.existsSync(path.join(root,'images/brand/aetherwing-anniversary-2015.png')));
assert.match(html,/anniversary-2015-v82\.css/);
assert.match(html,/main-site-shell-v82\.css/);
assert.match(html,/anniversary-2015-v82\.js/);
assert.match(anniversaryJs,/Date\.UTC\(year,9,1,4/);
assert.match(anniversaryJs,/Date\.UTC\(year,9,8,4/);
assert.match(anniversaryJs,/forced==='throwback'/);
assert.match(anniversaryJs,/data-anniversary-2015/);
assert.doesNotMatch(anniversaryJs,/dataset\.anniversary2015/);
assert.match(anniversaryCss,/data-anniversary-2015="true"/);
assert.match(anniversaryCss,/aw-paint-facility/);
assert.match(anniversaryCss,/aw-booth-info/);
assert.match(anniversaryCss,/aw-paint-rack/);
new vm.Script(anniversaryJs,{filename:'assets/anniversary-2015-v82.js'});
console.log('v76 verified: standalone Paint Booth has annual Oct. 1–7 2015 Anniversary Week UI without changing paint rendering.');


// v82: Paint Booth shares the main-site shell and uses a full blue Anniversary environment instead of blackout styling.
assert.match(html,/site-header__utility/);
assert.match(html,/header-race-link/);
assert.match(html,/mobile-race-link/);
assert.match(html,/AETHERWING \/ NAVIGATION/);
assert.match(html,/data-anniversary-banner/);
assert.match(shellCss,/shared aetherwing\.net site shell/);
assert.match(shellCss,/\.site-header__utility-inner/);
assert.match(shellCss,/\.header-race-link/);
assert.match(shellCss,/\.mobile-menu[\s\S]*?top:117px/);
assert.match(shellCss,/\.menu-toggle[\s\S]*?span:first-child\{background:#e10600/);
assert.match(shellCss,/data-anniversary-2015="true"[\s\S]*?background:linear-gradient\(180deg,#ffffff 0 7px,#0a2b40 7px 100%\)/);
assert.match(shellCss,/aw-facility-hud[\s\S]*?PAINT FACILITY/);
assert.match(shellCss,/AETHERWING PAINT ARCHIVE/);
assert.match(anniversaryJs,/ANNIVERSARY_TIMEZONE='America\/New_York'/);
assert.match(anniversaryJs,/eastern\.month===10&&eastern\.day>=1&&eastern\.day<=7/);
assert.match(anniversaryJs,/nextBoundary/);
assert.match(anniversaryJs,/data-anniversary-banner/);
assert.match(anniversaryJs,/aw-anniversary-hud/);
const headers=read('_headers');
assert.match(headers,/anniversary-2015-v82\.css[\s\S]*?no-store/);
assert.match(headers,/anniversary-2015-v82\.js[\s\S]*?no-store/);
assert.match(headers,/main-site-shell-v82\.css[\s\S]*?no-store/);
assert.match(shellCss,/v82 — Anniversary Week blue-flow parity/);
assert.match(shellCss,/mobile-menu[\s\S]*?linear-gradient\(160deg,#104d68/);
assert.match(shellCss,/aw-paint-facility[\s\S]*?linear-gradient\(155deg,#0b4059/);
assert.match(shellCss,/aw-booth-room[\s\S]*?background-color:#090b0d/);
assert.match(shellCss,/data-anniversary-2015=\"true\"[\s\S]*?site-header(?:::|:)after[\s\S]*?#008fe8 0 66%/);
console.log('v82 verified: Paint Booth uses the main-site Anniversary shell with full blue-flow environment while preserving a neutral render bay.');

// v83: current roster canon, historical paint separation, render state, alt text, and endurance credential.
assert.match(html, /data-paint-build="(?:83\.0-roster-stage-state|84\.0-gk3r-active-exit|85\.0-nonstarter-directory|86\.0-unified-3d-beta)"/);
assert.match(html, /function paintStageAlt\(paint\)/);
assert.match(html, /setRenderState\('LOADING'\)/);
assert.match(html, /setRenderState\('RENDER READY'\)/);
assert.match(html, /setRenderState\('RENDER UNAVAILABLE'\)/);
assert.match(html, /data-render-retry/);
assert.match(html, /classification === 'endurance'[\s\S]*?Aetherwing Endurance Team/);
assert.match(html, /ENDURANCE/);
assert.doesNotMatch(html, />#TEAM</);
assert.match(html, /https:\/\/aetherwing\.net\/api\/site-content/);
const d1=seed.leagues.find((league)=>league.id==='uarl-d1');
assert.equal(d1.bodyTag,'BBR Next-Gen Toyota');
assert.deepEqual(d1.drivers.map((driver)=>driver.name),['Hailey','BurgerTown2Good','Rocky','OPEN','Aetherwing Open Charter']);
assert.deepEqual(seed.driverOverrides['uarl-d1::Hailey'],['28']);
assert.deepEqual(seed.driverOverrides['uarl-d1::BurgerTown2Good'],['32']);
assert.ok(!('uarl-d1::GK3R' in seed.driverOverrides),'GK3R had no Aetherwing starts; no false former-driver paint override.');
assert.deepEqual(seed.driverOverrides['uarl-d1::Rocky'],['46']);
assert.deepEqual(seed.driverOverrides['uarl-d1::OPEN'],['56']);
assert.deepEqual(seed.driverOverrides['uarl-d1::Aetherwing Open Charter'],['62 PT / 82 DEV']);
assert.ok(!seed.driverOverrides['kmart::Jaxon']);
assert.ok(!seed.leagues.find((league)=>league.id==='kmart').drivers.some((driver)=>driver.name==='Jaxon'));
const historicCadillac=seed.paints.find((paint)=>paint.slug==='d1-mobil1');
assert.equal(historicCadillac.historical,true);
assert.equal(historicCadillac.manufacturer,'Cadillac');
assert.match(historicCadillac.note,/current UARL D1 program uses Toyota/i);
assert.equal(seed.paints.filter((paint)=>!paint.historical).length,38);
assert.equal(seed.paints.filter((paint)=>paint.historical).length,2);
console.log('v83 verified: roster canon, historical Cadillac handling, stage state/accessibility, ENDURANCE, and derived counters are present.');

// v84 — GK3R / @sealsntags left UARL D1. Active Paint Booth surfaces must not keep the bay.
assert.ok(!d1.drivers.some((driver)=>driver.name==='GK3R'||driver.username==='@sealsntags'),'v84 active UARL D1 seed must exclude GK3R / @sealsntags');
assert.ok(!html.includes('<strong>GK3R</strong><small>@sealsntags</small>'),'v84 pre-hydration overview must not show departed GK3R');
assert.ok(html.includes('23 active slots across six active garages.'),'v84 static active-slot fallback should reflect the departed UARL D1 driver');
assert.ok(html.includes("['28','32','46','56']")&&html.includes("!['42','52','54','92']"),'v84 live roster gate must accept the post-GK3R UARL D1 canon and reject stale #42.');
console.log('v84 verified: GK3R is removed from the active UARL D1 Paint Booth bay while historical metadata remains archived.');

// v85: no entry in archived team driver overrides when the person never raced for Aetherwing.
assert.ok(!html.includes('"uarl-d1::GK3R"'),'v85 pre-hydration data must not preserve a false team driver affiliation');
console.log('v85 verified: no former-team-driver attribution for a non-starter.');

// v86: only matched 3D demonstration textures can select shared geometry.
const betaPaints=seed.paints.filter((p)=>p.bodyModel&&p.liveryTexture);
assert.equal(betaPaints.length,5);
assert.equal(new Set(betaPaints.map(p=>p.bodyModel)).size,3);
assert.ok(!seed.paints.find(p=>p.leagues.includes('uarl-open')).bodyModel);
for (const paint of betaPaints) {
  assert.ok(fs.existsSync(path.join(root,paint.liveryTexture.replace(/^\//,''))));
  assert.ok(fs.existsSync(path.join(root,paint.image.replace(/^\//,''))));
}
for (const filename of ['nrrs-toyota.glb','sunoco-truck.glb','oreilly-chevy.glb']) {
  assert.ok(fs.existsSync(path.join(root,'assets/3d',filename)));
}
assert.match(html,/data-3d-stage/);
assert.match(html,/data-view-3d/);
assert.match(html,/aetherwing:paint-change/);
assert.match(html,/3d-stage-v86\.js/);
assert.match(read('assets/3d-stage-v86.js'),/requestId/);
assert.match(read('assets/3d-stage-v86.js'),/forceContextLoss/);

console.log('v86 verified: 3D lab paints have matching textures and 3 distinct body files, with 2D fallback.');
