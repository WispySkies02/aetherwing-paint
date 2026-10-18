import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

// Keep browser tooling outside this static site's published directory. See
// README for the temporary install command; no production dependencies change.
const require=createRequire(process.env.PAINT_TEST_MODULES?path.resolve(process.env.PAINT_TEST_MODULES,'playwright-core/package.json'):import.meta.url);
const {chromium}=require('playwright-core');
const threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const root=path.resolve(import.meta.dirname,'..');
const seed=JSON.parse(fs.readFileSync(path.join(root,'data/paint-seed.json'),'utf8'));
const pngA=fs.readFileSync(path.join(root,'assets/3d/lab-nrrs-palmetto-32-preview.png'));
const pngB=fs.readFileSync(path.join(root,'assets/3d/lab-sunoco-craftsman-54-preview.png'));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');let filename=path.resolve(root,`.${url.pathname}`);
  if(url.pathname.endsWith('/'))filename=path.join(filename,'index.html');
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename)||!fs.statSync(filename).isFile())filename=path.join(root,'index.html');
  res.writeHead(200,{'content-type':types[path.extname(filename)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(filename).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const started=gate=>Promise.race([gate.started.promise,new Promise((_,reject)=>{setTimeout(()=>reject(new Error('Expected delayed request was not started')),15000).unref();})]);
try{
  for(const [name,viewport,file] of [['desktop',{width:1440,height:1000},'index.html'],['mobile',{width:390,height:844},'index.html'],['small-mobile',{width:320,height:740},'index.html'],['fallback-page',{width:390,height:844},'404.html']]){
    console.log(`Checking ${name}…`);
    const page=await browser.newPage({viewport,acceptDownloads:true});
    const errors=[],downloads=[],diagnostics=[];let failModel=false,failImage=false,failDownload=false,imageGate=null,modelGate=null,textureGate=null,downloadGate=null;
    page.on('console',message=>{if(message.type()==='error')diagnostics.push(message.text());});
    page.on('pageerror',error=>errors.push(error.message));page.on('download',download=>downloads.push(download));
    await page.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname==='cdn.jsdelivr.net'&&url.pathname.startsWith('/npm/three@0.169.0/')){
        const filename=path.resolve(threeRoot,url.pathname.slice('/npm/three@0.169.0/'.length));
        assert.ok(filename.startsWith(threeRoot+path.sep));
        return route.fulfill({body:fs.readFileSync(filename),contentType:'text/javascript',headers:{'access-control-allow-origin':'*'}});
      }
      if(url.origin===base){
        if(url.pathname==='/__test/a.png'||url.pathname==='/__test/b.png'){
          if(url.pathname==='/__test/a.png'&&request.resourceType()==='fetch'&&downloadGate){const gate=downloadGate;downloadGate=null;gate.started.resolve();await gate.release.promise;}
          if(url.pathname==='/__test/a.png'&&request.resourceType()==='image'&&imageGate){const gate=imageGate;imageGate=null;gate.started.resolve();await gate.release.promise;}
          const failed=failImage||failDownload&&request.resourceType()==='fetch';
          try{return await route.fulfill({status:failed?503:200,body:failed?'Image unavailable':url.pathname.endsWith('a.png')?pngA:pngB,contentType:failed?'text/plain':'image/png',headers:{'cache-control':'no-store'}});}catch{return;}
        }
        if(url.pathname==='/assets/3d/nrrs-toyota.glb'&&modelGate){const gate=modelGate;modelGate=null;gate.started.resolve();await gate.release.promise;}
        if(url.pathname==='/assets/3d/slow-fixture.webp'){
          if(textureGate){const gate=textureGate;textureGate=null;gate.started.resolve();await gate.release.promise;}
          return route.fulfill({body:fs.readFileSync(path.join(root,'assets/3d/lab-nrrs-palmetto-32.webp')),contentType:'image/webp'});
        }
        if(failModel&&url.pathname.endsWith('sunoco-truck.glb'))return route.fulfill({status:404,body:'Missing model'});
        return route.continue();
      }
      if(url.hostname==='i.ibb.co')return route.fulfill({body:pngA,contentType:'image/png',headers:{'access-control-allow-origin':'*'}});
      if(url.pathname.includes('/api/'))return route.fulfill({json:{datasets:{},paints:[]}});
      // Fonts/analytics are not needed to exercise the stage's assets and
      // controls. Keep this regression deterministic and free of live writes.
      return route.fulfill({status:200,body:'',contentType:'text/css'});
    });
    try{
      await page.goto(`${base}/${file}`,{waitUntil:'load'});
      await page.waitForFunction(()=>window.AetherwingBooth&&document.querySelector('[data-booth-shell]').dataset.renderMode);
      const fixtures=[
        {...seed.paints[0],slug:'fixture-static-a',sponsor:'STATIC A',driver:'Fixture A',number:'71',schemeId:'123456701',image:'/__test/a.png',bodyModel:'',liveryTexture:''},
        {...seed.paints[0],slug:'fixture-static-b',sponsor:'STATIC B',driver:'Fixture B',number:'72',schemeId:'123456702',image:'/__test/b.png',bodyModel:'',liveryTexture:''},
        {...seed.paints.find(p=>p.bodyModel==='nrrs-toyota'&&p.liveryTexture),slug:'fixture-3d',sponsor:'MODEL READY',schemeId:'123456703'},
        {...seed.paints.find(p=>p.bodyModel==='sunoco-truck'&&p.liveryTexture),slug:'fixture-failed-model',sponsor:'MODEL FALLBACK',image:'/__test/b.png'},
        {...seed.paints.find(p=>p.bodyModel==='nrrs-toyota'&&p.liveryTexture),slug:'fixture-slow-texture',sponsor:'SLOW TEXTURE',liveryTexture:'/assets/3d/slow-fixture.webp'},
        {...seed.paints.find(p=>p.bodyModel==='nrrs-toyota'&&p.liveryTexture),slug:'fixture-iracing-3d',sponsor:'ASSET BASED',leagues:['iracing'],image:'/__test/b.png'}
      ];
      await page.evaluate(fixtures=>window.AetherwingBooth.addPaints(fixtures),fixtures);
      const select=slug=>page.evaluate(slug=>window.AetherwingBooth.selectPaint(slug,true),slug);
      const mode=async value=>{try{await page.waitForFunction(value=>document.querySelector('[data-booth-shell]').dataset.renderMode===value,value,{timeout:25000});}catch(error){console.error(name,await page.evaluate(()=>{const root=document.querySelector('[data-paint-facility]');return {mode:document.querySelector('[data-booth-shell]').dataset.renderMode,slug:root.dataset.currentPaintSlug,paint:window.AetherwingBooth.paints.find(p=>p.slug===root.dataset.currentPaintSlug)};}),diagnostics.slice(-5),errors);throw error;}};
      const exportButton=page.locator('[data-3d-export-trigger]');
      const geometry=()=>page.evaluate(async()=>{await Promise.allSettled(document.querySelector('[data-booth-car]').getAnimations().filter(animation=>animation.effect.getTiming().iterations!==Infinity).map(animation=>animation.finished));return Object.fromEntries(['[data-booth-room]','[data-3d-stage]','[data-3d-export-trigger]','[data-scene-open]'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return [selector,{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height}];}));});
      await select('fixture-static-a');await mode('static');
      assert.equal(await page.locator('[data-stage-mode-label]').textContent(),'STATIC RENDER');
      assert.equal(await page.locator('[data-booth-state]').textContent(),'');
      assert.equal(await page.locator('.aw-booth-signal').isVisible(),false,'Only the mode credential should persist');
      assert.equal(await exportButton.isEnabled(),true);assert.match(await exportButton.innerText(),/SAVE RENDER/);
      const staticGeometry=await geometry();
      const assertClearControls=async()=>{
        const boxes=await page.evaluate(()=>['[data-stage-modes]','[data-scene-open]','[data-3d-export-trigger]','.aw-car-id--top'].map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};}));
        for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
          const a=boxes[i],b=boxes[j];assert.ok(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y,`${name}: ${a.selector} must not overlap ${b.selector}`);
        }
        for(const box of boxes)assert.ok(box.x>=0&&box.right<=viewport.width,`${box.selector} must fit the viewport`);
      };
      await assertClearControls();
      if(process.env.PAINT_TEST_ARTIFACTS){fs.mkdirSync(process.env.PAINT_TEST_ARTIFACTS,{recursive:true});await page.locator('[data-booth-room]').screenshot({path:path.join(process.env.PAINT_TEST_ARTIFACTS,`${name}-initial.png`)});}
      const [saved]=await Promise.all([page.waitForEvent('download'),exportButton.click()]);
      assert.match(saved.suggestedFilename(),/fixture-a-71-static-a-fixture-static-a-render\.png$/);
      assert.deepEqual(fs.readFileSync(await saved.path()),pngA,'SAVE RENDER must preserve exact original image bytes');
      await select('fixture-static-b');await mode('static');
      const [savedB]=await Promise.all([page.waitForEvent('download'),exportButton.click()]);
      assert.deepEqual(fs.readFileSync(await savedB.path()),pngB,'Download must follow the newly selected paint');
      const labelStyle=await page.locator('[data-stage-modes]').evaluate(el=>({radius:getComputedStyle(el).borderRadius,bg:getComputedStyle(el).backgroundColor}));
      assert.equal(labelStyle.radius,'0px');assert.equal(labelStyle.bg,'rgb(37, 41, 45)');

      await select('fixture-3d');await mode('3d');
      assert.equal(await page.locator('[data-3d-canvas]').isVisible(),true);
      assert.equal(await page.locator('[data-3d-hint]').isVisible(),true);
      assert.equal(await exportButton.getAttribute('aria-label'),'EXPORT 3D PNG');
      await assertClearControls();
      const renderedBefore = await page.locator('[data-3d-canvas]').evaluate(canvas=>canvas.toDataURL());
      const canvasBox = await page.locator('[data-3d-canvas]').boundingBox();
      await page.mouse.move(canvasBox.x+canvasBox.width*.5,canvasBox.y+canvasBox.height*.5);
      await page.mouse.down();await page.mouse.move(canvasBox.x+canvasBox.width*.65,canvasBox.y+canvasBox.height*.55,{steps:5});await page.mouse.up();
      await page.mouse.wheel(0,-80);
      const renderedAfter = await page.locator('[data-3d-canvas]').evaluate(canvas=>canvas.toDataURL());
      assert.notEqual(renderedAfter,renderedBefore,'Working 3D orbit/zoom controls must change the rendered pixels');
      const modelGeometry=await geometry();
      assert.deepEqual(modelGeometry,staticGeometry,'Stage and controls must not move or resize between static and 3D');
      const [modelSaved]=await Promise.all([page.waitForEvent('download'),exportButton.click()]);
      assert.equal(modelSaved.suggestedFilename(),'fixture-3d-3d.png');assert.equal(fs.readFileSync(await modelSaved.path()).subarray(1,4).toString(),'PNG');
      await page.locator('[data-scene-open]').click();assert.equal(await page.locator('[data-scene-drawer]').isVisible(),true);
      await page.locator('.aw-scene-panel [data-scene-close]').click();

      failModel=true;await select('fixture-failed-model');await mode('static');
      assert.match(await page.locator('[data-3d-fallback-image]').getAttribute('src'),/b.png/);
      assert.equal(await exportButton.isEnabled(),true);
      failModel=false;await select('fixture-failed-model');await mode('3d');
      await select('fixture-iracing-3d');await mode('3d');assert.equal(await exportButton.isVisible(),true,'Usable assets take precedence over hard-coded league restrictions');

      // Older model, texture and image requests cannot win against selection B.
      await select('fixture-static-b');await mode('static');
      const modelWait={started:deferred(),release:deferred()};modelGate=modelWait;
      await select('fixture-3d');await started(modelWait);await select('fixture-static-b');await mode('static');modelWait.release.resolve();
      const textureWait={started:deferred(),release:deferred()};textureGate=textureWait;
      await select('fixture-slow-texture');await started(textureWait);await select('fixture-static-b');await mode('static');textureWait.release.resolve();
      const imageWait={started:deferred(),release:deferred()};imageGate=imageWait;
      // A cache-busting source forces an independent old image request.
      await page.evaluate(()=>window.AetherwingBooth.addPaints([{...window.AetherwingBooth.paints.find(p=>p.slug==='fixture-static-a'),image:'/__test/a.png?slow=1'}]));
      await select('fixture-static-a');await started(imageWait);await select('fixture-static-b');await mode('static');imageWait.release.resolve();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('[data-stage-mode-label]').textContent(),'STATIC RENDER');
      assert.equal(await page.locator('[data-active-sponsor]').textContent(),'STATIC B');
      assert.equal(await page.locator('[data-active-number]').textContent(),'#72');
      assert.match(await page.locator('[data-active-driver]').textContent(),/Fixture B/);
      assert.equal(await page.locator('[data-stage-scheme-id]').textContent(),'123456702');
      assert.equal(await page.locator('[data-info-sponsor]').textContent(),'STATIC B');
      assert.match(page.url(),/fixture-static-b/);
      const [afterRace]=await Promise.all([page.waitForEvent('download'),exportButton.click()]);assert.deepEqual(fs.readFileSync(await afterRace.path()),pngB);

      failImage=true;await page.evaluate(()=>window.AetherwingBooth.addPaints([{...window.AetherwingBooth.paints.find(p=>p.slug==='fixture-static-a'),image:'/__test/a.png?failure=1'}]));await select('fixture-static-a');await mode('unavailable');
      assert.equal(await page.locator('[data-stage-mode-label]').textContent(),'RENDER UNAVAILABLE');await assertClearControls();assert.equal(await exportButton.isEnabled(),false);
      failImage=false;await page.locator('[data-render-retry]').click();await mode('static');
      failDownload=true;await exportButton.click();await page.waitForFunction(()=>!document.querySelector('[data-render-save-status]').hidden);
      assert.equal(await exportButton.isEnabled(),true);assert.equal(await page.locator('[data-stage-mode-label]').textContent(),'STATIC RENDER','Download failure must not misreport the displayed image as missing');failDownload=false;
      const downloadWait={started:deferred(),release:deferred()};downloadGate=downloadWait;
      const count=downloads.length;await exportButton.click();await started(downloadWait);await select('fixture-static-b');await mode('static');downloadWait.release.resolve();await page.waitForTimeout(150);
      assert.equal(downloads.length,count,'A superseded download must not save a previous paint under the current selection');
      assert.equal(await exportButton.isEnabled(),true);
      if(process.env.PAINT_TEST_ARTIFACTS){fs.mkdirSync(process.env.PAINT_TEST_ARTIFACTS,{recursive:true});await page.locator('[data-booth-room]').screenshot({path:path.join(process.env.PAINT_TEST_ARTIFACTS,`${name}-static.png`)});}
      await page.evaluate(()=>window.AetherwingBooth.addPaints([{...window.AetherwingBooth.paints.find(p=>p.slug==='fixture-static-b'),sponsor:'UPDATED B',number:'73',schemeId:'123456704'}]));await mode('static');
      assert.equal(await page.locator('[data-active-sponsor]').textContent(),'UPDATED B');
      assert.equal(await page.locator('[data-info-sponsor]').textContent(),'UPDATED B');
      assert.equal(await page.locator('[data-active-number]').textContent(),'#73');
      assert.equal(await page.locator('[data-stage-scheme-id]').textContent(),'123456704');
      assert.deepEqual(errors,[],'No uncaught browser errors');
      console.log(`PASS: ${name}: original downloads, real 3D/export, failed-model fallback, image/model/texture/download races, labels, metadata, retry and stable layout.`);
    }finally{await page.close();}
  }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
