import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

const require=createRequire(process.env.PAINT_TEST_MODULES?path.resolve(process.env.PAINT_TEST_MODULES,'playwright-core/package.json'):import.meta.url);
const {chromium}=require('playwright-core');
const threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const root=path.resolve(import.meta.dirname,'..');
const seed=JSON.parse(fs.readFileSync(path.join(root,'data/paint-seed.json'),'utf8'));
const original=fs.readFileSync(path.join(root,'assets/3d/lab-nrrs-palmetto-32-preview.png'));
const cacheKey='aetherwing-published-paint-catalog-v1';
// Reproduce the audited catalog shape without changing registry/seed data:
// 40 bundled + seven Hailey paints and one other owner, without the optional
// McLaren classification that is absent from the published catalog.
const published=structuredClone(seed.paints);
delete published.find(paint=>paint.slug==='iracing-monster-lando-mclaren').classification;
for(let i=0;i<8;i++)published.push({...published[0],slug:`published-addition-${i}`,sponsor:`Published addition ${i}`,driver:i===7?'Hailey-Bell':['Hailey','Hailey Bell','Wispy','Nicholas Waggoner'][i%4],bodyModel:'',liveryTexture:'',image:`/__test/published.png?paint=${i}`});
assert.equal(published.length,48);
const registry={paints:published,feature:null};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');let filename=path.resolve(root,`.${url.pathname}`);
  if(url.pathname.endsWith('/'))filename=path.join(filename,'index.html');
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile())filename=path.join(root,'index.html');
  res.writeHead(200,{'content-type':types[path.extname(filename)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(filename).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
assert.ok(!process.env.PAINT_TEST_CASE||['desktop','mobile','small-mobile','fallback-page'].includes(process.env.PAINT_TEST_CASE),'Unknown browser test case');
try{
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  for(const [name,viewport,file] of [['desktop',{width:1440,height:1000},'index.html'],['mobile',{width:390,height:844},'index.html'],['small-mobile',{width:320,height:740},'index.html'],['fallback-page',{width:390,height:844},'404.html']]){
    if(process.env.PAINT_TEST_CASE&&process.env.PAINT_TEST_CASE!==name)continue;
    console.log(`Checking catalog: ${name}…`);
    const page=await browser.newPage({viewport,acceptDownloads:true});
    let release;const catalogGate=new Promise(resolve=>release=resolve);
    let failure=false,empty=false,invalid=false,delay=true,networkDelay=0;
    const errors=[],requests=[];page.on('pageerror',error=>errors.push(error.stack||error.message));
    page.on('response',async response=>{if(response.url().includes('/.netlify/functions/paint-data')){try{requests.push({status:response.status(),body:(await response.text()).slice(0,160)});}catch(error){requests.push({bodyError:String(error)});}}});
    page.on('requestfailed',request=>{if(request.url().includes('/.netlify/functions/paint-data'))requests.push({failed:request.failure()});});
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/__test/published.png')return route.fulfill({body:original,contentType:'image/png'});
      if(url.pathname==='/.netlify/functions/paint-data'){
        if(delay)await catalogGate;
        if(networkDelay)await new Promise(resolve=>setTimeout(resolve,networkDelay));
        requests.push({failure,invalid,empty,networkDelay});
        try{return await route.fulfill(failure?{status:503,body:'Registry unavailable'}:{json:invalid?{error:'Invalid catalog'}:empty?{paints:[]}:registry});}catch{return;}
      }
      if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/three@0.169.0/'))return route.fulfill({body:fs.readFileSync(path.join(threeRoot,url.pathname.slice('/npm/three@0.169.0/'.length))),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
      if(url.origin===base)return route.continue();
      if(url.hostname==='i.ibb.co')return route.fulfill({body:original,contentType:'image/png',headers:{'access-control-allow-origin':'*'}});
      if(url.pathname.includes('/api/'))return route.fulfill({json:{datasets:{},paints:[]}});
      return route.fulfill({status:200,body:'',contentType:'text/css'});
    });
    const state=async value=>{try{await page.waitForFunction(value=>document.documentElement.dataset.catalogState===value,value);}catch(error){console.error(name,{expected:value},await page.evaluate(()=>({state:document.documentElement.dataset.catalogState,status:document.querySelector('[data-catalog-status]')?.textContent,total:window.AetherwingBooth?.paints.length})),errors,requests.slice(-5));throw error;}};
    const mode=value=>page.waitForFunction(value=>document.querySelector('[data-booth-shell]').dataset.renderMode===value,value);
    const select=slug=>page.evaluate(slug=>window.AetherwingBooth.selectPaint(slug,true),slug);
    const total=async(count,hailey)=>{
      assert.equal(await page.locator('[data-total-paints]').textContent(),String(count));
      assert.equal(await page.locator('[data-collection-card]').count(),count);
      assert.equal(await page.locator('[data-collection-filter="all"]').textContent(),`ALL ${count}`);
      assert.equal(await page.locator('[data-collection-filter="wispy-all"]').textContent(),`HAILEY ${hailey}`);
      assert.equal(await page.locator('[data-driver-name="Hailey"] em').textContent(),`${hailey} PAINTS`);
      assert.match(await page.locator('[data-league-id="all"] small').textContent(),new RegExp(`^${count} TOTAL`));
    };
    try{
      await page.goto(`${base}/${file}#paint-d1-ironmouse`,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.AetherwingBooth);
      assert.equal(await page.locator('html').getAttribute('data-catalog-state'),'loading');
      assert.match(await page.locator('[data-catalog-status]').textContent(),/Loading published catalog/);
      for(const selector of ['[data-total-paints]','[data-league-id="all"] small','[data-driver-count]','[data-paint-count]','[data-collection-status]','[data-driver-controls]','[data-paint-controls]','[data-collection-grid]']){
        assert.equal(await page.locator(selector).isVisible(),false,`${selector} must not flash stale counts/catalog while pending`);
      }
      assert.equal(await page.locator('[data-total-paints]').evaluate(el=>getComputedStyle(el,'::after').content),'"…"');
      delay=false;release();await state('published');
      await page.locator('[data-league-id="all"]').click();await total(48,45);
      assert.equal(await page.locator('[data-driver-name="__all__"] em').textContent(),'48 PAINTS');
      assert.match(await page.locator('[data-paint-count]').textContent(),/^48 paints$/);
      assert.equal(await page.locator('[data-active-paint-summary]').textContent(),'46 ACTIVE · 2 HISTORICAL');
      await page.locator('[data-collection-filter="wispy-all"]').click();
      assert.equal(await page.locator('[data-collection-status]').textContent(),'45 of 48 paints shown');
      await page.locator('[data-driver-name="Hailey"]').click();
      assert.equal(await page.locator('[data-paint-count]').textContent(),'45 paints');
      assert.equal(await page.locator('[data-paint-controls] [data-rack-paint]').count(),45);

      const additions=[' Wispy ','HAILEY BELL','Nicholas Waggoner'].map((driver,i)=>({...published[0],slug:`publication-delta-${i}`,sponsor:'Publication Delta',driver,bodyModel:'',liveryTexture:''}));
      await page.locator('[data-paint-search]').fill('Publication Delta');
      await page.evaluate(additions=>window.AetherwingBooth.addPaints(additions),additions);
      await total(51,48);
      assert.equal(await page.locator('[data-collection-status]').textContent(),'3 of 51 paints shown');
      assert.equal(await page.locator('[data-paint-count]').textContent(),'48 paints');
      await page.evaluate(paints=>window.AetherwingBooth.replacePaints([...paints,{...paints[0],slug:'draft-fixture',status:'draft'},{...paints[0],slug:'archived-fixture',archived:true}]),published);
      await total(48,45);
      assert.equal(await page.locator('[data-collection-status]').textContent(),'0 of 48 paints shown');
      assert.equal(await page.locator('[data-slug="draft-fixture"],[data-slug="archived-fixture"],[data-slug="publication-delta-0"]').count(),0);
      await page.locator('[data-collection-reset]').click();

      await select('iracing-monster-lando-mclaren');await mode('static');
      assert.equal(await page.locator('[data-active-number]').textContent(),'ENDURANCE');
      assert.equal(await page.locator('[data-info-number]').textContent(),'ENDURANCE');
      assert.equal(await page.locator('[data-info-driver]').textContent(),'Aetherwing Endurance Team');
      assert.equal(await page.locator('[data-active-driver]').textContent(),'Aetherwing Endurance Team');
      assert.match(await page.locator('[data-rack-paint="iracing-monster-lando-mclaren"] small').textContent(),/^ENDURANCE ·/);
      assert.match(await page.locator('[data-driver-name="Aetherwing Endurance Team"]').textContent(),/iRACING ENDURANCE/);
      assert.equal(await page.locator('#paint-iracing-monster-lando-mclaren .aw-endurance-credential').textContent(),'ENDURANCE');
      assert.match(await page.locator('#paint-iracing-monster-lando-mclaren .aw-collection-actions').textContent(),/iRACING CUSTOM LIVERY/);
      assert.equal(await page.locator('[data-booth-state]').textContent(),'');
      assert.equal(await page.locator('.aw-booth-signal').isVisible(),false);
      const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-3d-export-trigger]').click()]);
      assert.deepEqual(fs.readFileSync(await download.path()),original);

      for(const paint of published.filter(p=>p.slug.startsWith('lab-'))){
        const card=page.locator(`#paint-${paint.slug}`);
        assert.match(await card.locator('.aw-collection-actions').textContent(),/3D DEMONSTRATION · NO SCHEME ID/);
        assert.doesNotMatch(await card.textContent(),/iRACING CUSTOM LIVERY/);
        assert.equal(await card.locator('[data-dynamic-copy-id]').count(),0);
        assert.equal(await card.locator('.aw-collection-specs').textContent(),paint.manufacturer+paint.body);
      }
      await page.locator('[data-league-id="all"]').click();
      for(const query of ['Sinder Dodge','132350921119875']){
        await page.locator('[data-rack-search]').fill(query);
        assert.equal(await page.locator('[data-paint-controls] [data-rack-paint]').count(),1,`${query} must find exactly Sinder Dodge`);
        assert.equal(await page.locator('[data-rack-paint="kmart-clutch-sinder"] strong').textContent(),'Sinder Dodge');
      }
      await page.locator('[data-rack-search]').fill('Published addition');assert.equal(await page.locator('[data-paint-count]').textContent(),'08 paints');
      await page.locator('[data-rack-search-clear]').click();
      await page.locator('[data-rack-only-3d]').check();assert.equal(await page.locator('[data-paint-count]').textContent(),'05 paints');
      await page.locator('[data-rack-only-3d]').uncheck();
      await select('d1-ironmouse');await mode('static');
      assert.equal(await page.locator('[data-active-number]').textContent(),'#32');
      await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:base});
      await page.locator('[data-stage-scheme-copy]').click();
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),published.find(p=>p.slug==='d1-ironmouse').schemeId);
      await page.locator('#paint-d1-ironmouse [data-dynamic-copy-id]').click();
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),published.find(p=>p.slug==='d1-ironmouse').schemeId);
      if(viewport.width<821){
        await page.locator('.aw-mobile-booth-console').scrollIntoViewIfNeeded();
        for(const button of await page.locator('.aw-mobile-booth-console button').all()){
          const hit=await button.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));});
          if(!hit){
            console.error(name,await button.evaluate(el=>{const r=el.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {button:el.outerHTML,rect:r.toJSON(),top:top?.outerHTML?.slice(0,1200),scrollY};}));
            if(process.env.PAINT_TEST_ARTIFACTS)await page.screenshot({path:path.join(process.env.PAINT_TEST_ARTIFACTS,`${name}-obstruction.png`)});
          }
          assert.equal(hit,true,'Every bottom mobile control, including the last one, must be unobstructed');
        }
        await page.locator('[data-mobile-info]').click();
        await page.locator('[data-info-dock]').evaluate(async el=>Promise.allSettled(el.getAnimations().filter(animation=>animation.effect.getTiming().iterations!==Infinity).map(animation=>animation.finished)));
        const infoBox=await page.locator('[data-info-number]').boundingBox();
        assert.ok(infoBox.y>=0&&infoBox.y+infoBox.height<=viewport.height,'Opened mobile dossier must be inside the viewport');
        assert.equal(await page.locator('[data-info-number]').isVisible(),true);
        assert.equal(await page.locator('[data-info-number]').textContent(),'#32');
      }
      if(process.env.PAINT_TEST_ARTIFACTS){fs.mkdirSync(process.env.PAINT_TEST_ARTIFACTS,{recursive:true});await page.screenshot({path:path.join(process.env.PAINT_TEST_ARTIFACTS,`${name}-catalog.png`)});}
      // A published-only direct paint URL must survive startup and reload.
      await select('published-addition-6');assert.match(page.url(),/published-addition-6/);
      await page.reload({waitUntil:'domcontentloaded'});await state('published');await mode('static');
      assert.equal(await page.locator('[data-active-sponsor]').textContent(),'Published addition 6');
      failure=true;await page.reload({waitUntil:'domcontentloaded'});await state('cached');await mode('static');
      assert.match(await page.locator('[data-catalog-status]').textContent(),/Cached catalog/);
      await page.locator('[data-league-id="all"]').click();await total(48,45);
      await page.evaluate(key=>localStorage.removeItem(key),cacheKey);
      await page.reload({waitUntil:'domcontentloaded'});await state('bundled');
      assert.match(await page.locator('[data-catalog-status]').textContent(),/Bundled catalog/);
      await page.locator('[data-league-id="all"]').click();await total(40,38);
      await select('d1-ironmouse');await mode('static');assert.equal(await page.locator('[data-3d-export-trigger]').isEnabled(),true);
      failure=false;invalid=true;await page.reload({waitUntil:'domcontentloaded'});await state('bundled');
      invalid=false;empty=true;await page.reload({waitUntil:'domcontentloaded'});await state('published');
      assert.equal(await page.locator('[data-total-paints]').textContent(),'0');
      assert.equal(await page.locator('[data-collection-card]').count(),0);
      assert.equal(await page.locator('[data-collection-filter="wispy-all"]').textContent(),'HAILEY 0');
      assert.equal(await page.locator('[data-3d-export-trigger]').isEnabled(),false);
      if(name==='desktop'){
        // Exercise repeated empty snapshots too: no stale seed selection may
        // interrupt completion of an otherwise successful catalog load.
        for(let i=0;i<Number(process.env.PAINT_TEST_EMPTY_RELOADS||8);i++){await page.reload({waitUntil:'domcontentloaded'});await state('published');assert.equal(await page.locator('[data-total-paints]').textContent(),'0');}
        await page.evaluate(key=>localStorage.removeItem(key),cacheKey);
        empty=false;networkDelay=4000;await page.reload({waitUntil:'domcontentloaded'});await state('bundled');
        assert.match(await page.locator('[data-catalog-status]').textContent(),/Bundled catalog/);
      }
      assert.deepEqual(errors,[],'No uncaught browser errors');
      console.log(`PASS: ${name}: loading placeholders; 48/45 counts; additions, removals and drafts; endurance/demo labels; search, filters, copying, mobile controls; direct URLs; cached/bundled/invalid/empty catalogs.`);
    }finally{release();await page.close();}
  }
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
