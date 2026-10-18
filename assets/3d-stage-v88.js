/* Aetherwing Paint Booth v88: 3D-first showroom with selected render fallback.
   Missing asset diagnostics belong in Admin, not the public showroom. */
import { createLandedConfetti } from './victory-confetti-v89.js';
const root=document.querySelector('[data-paint-facility]');
const shell=root?.querySelector('[data-booth-shell]');
const stage=root?.querySelector('[data-3d-stage]');
const canvas=stage?.querySelector('[data-3d-canvas]');
const status=root?.querySelector('[data-booth-state]');
const fallback=stage?.querySelector('[data-3d-fallback]');
let fallbackImage=stage?.querySelector('[data-3d-fallback-image]');
const renderMessage=stage?.querySelector('[data-render-message]');
const modeLabel=root?.querySelector('[data-stage-mode-label]');
const retry=root?.querySelector('[data-render-retry]');
const saveStatus=root?.querySelector('[data-render-save-status]');
const hint=stage?.querySelector('[data-3d-hint]');
const export3d=root?.querySelector('[data-3d-export-trigger]');
const raw=document.querySelector('#aw-paint-booth-data');
if(root && shell && stage && canvas && raw){
  const registry=JSON.parse(raw.textContent||'{}');
  const paints=registry.paints||[];
  const bodies={
    'nrrs-toyota':{model:'/assets/3d/nrrs-toyota.glb',mesh:'Paint1Mtl',camera:[-34,19,34],distance:[16,85]},
    'sunoco-truck':{model:'/assets/3d/sunoco-truck.glb',mesh:'Body21Mtl',camera:[-34,19,34],distance:[16,85]},
    'oreilly-chevy':{model:'/assets/3d/oreilly-chevy.glb',mesh:'Body1Mtl',camera:[-31,15,-34],distance:[15,75]}
  };
  const validTexture=url=>typeof url==='string' && (
    /^\/assets\/3d\/[a-z0-9-]+\.(?:webp|png)$/.test(url)||
    /^https:\/\/aetherwing\.net\/api\/paint-3d-texture\/[a-f0-9]{64}\.png$/.test(url)||
    /^https:\/\/paint\.aetherwing\.net\/assets\/3d\/[a-z0-9-]+\.(?:webp|png)$/.test(url)
  );
  const ready=p=>!!(p && bodies[p.bodyModel] && validTexture(p.liveryTexture));
  let chosen=paints.find(p=>p.slug===root.dataset.currentPaintSlug)||paints[0]||null;
  let api=null,THREE=null,renderer=null,scene=null,camera=null,controls=null,viewerModel=null,activeTexture=null;
  let modelKey='',token=0,active=false,observer=null,landedConfetti=null;
  shell.dataset.viewMode='3d';
  stage.hidden=false;
  let mode='empty',downloadRequest=null;
  const showText=t=>{if(status)status.textContent=t;if(retry)retry.hidden=t!=='RENDER UNAVAILABLE';};
  const setMode=(value,label)=>{mode=value;shell.dataset.renderMode=value;if(modeLabel)modeLabel.textContent=label;};
  const exportLabel=(text,enabled,title)=>{
    if(!export3d)return;
    export3d.disabled=!enabled;export3d.title=title;export3d.setAttribute('aria-label',text);
    const prefix=export3d.querySelector('span'),label=export3d.querySelector('strong');
    if(prefix)prefix.hidden=text!=='EXPORT 3D PNG';
    if(label)label.textContent=text==='EXPORT 3D PNG'?'3D PNG':text;
  };
  const clearSaveStatus=()=>{if(saveStatus){saveStatus.hidden=true;saveStatus.textContent='';}};
  const markUnavailable=()=>{
    setMode('unavailable','RENDER UNAVAILABLE');
    if(fallbackImage)fallbackImage.hidden=true;
    if(renderMessage)renderMessage.hidden=false;
    exportLabel('SAVE RENDER',false,'The selected render could not be loaded');
    showText('RENDER UNAVAILABLE');
  };
  const showFallback=(paint,current)=>{
    const url=typeof paint?.image==='string'?paint.image.trim():'';
    setMode('static-loading','STATIC RENDER');
    if(fallback)fallback.hidden=false;
    canvas.hidden=true;if(hint)hint.hidden=true;
    exportLabel('SAVE RENDER',false,'Loading the selected original render');
    showText('LOADING RENDER');
    // Each request gets its own element and callbacks: a late load/error from
    // a previous image must never change the latest selection or its mode.
    const image=new Image();
    image.setAttribute('data-3d-fallback-image','');image.hidden=true;
    image.alt=`${paint?.driver||'Selected driver'} — ${paint?.sponsor||'Paint'} static render`;
    image.decoding='async';image.fetchPriority='high';
    fallbackImage?.replaceWith(image);fallbackImage=image;
    image.onload=()=>{
      if(current!==token)return;
      if(!image.naturalWidth){markUnavailable();return;}
      image.hidden=false;setMode('static','STATIC RENDER');
      exportLabel('SAVE RENDER',true,'Download the selected paint’s original image');
      showText('STATIC RENDER');
    };
    image.onerror=()=>{if(current===token)markUnavailable();};
    if(url)image.src=url;else markUnavailable();
  };
  const markLoading=()=>{
    setMode('3d-loading','3D SHOWROOM');
    if(fallback)fallback.hidden=true;
    canvas.hidden=true;if(hint)hint.hidden=true;
    exportLabel('EXPORT 3D PNG',false,'Loading 3D');showText('LOADING 3D');
  };
  const markReady=()=>{
    setMode('3d','3D SHOWROOM');
    if(fallback)fallback.hidden=true;
    canvas.hidden=false;if(hint)hint.hidden=false;
    exportLabel('EXPORT 3D PNG',true,'Save an image of the current 3D car');showText('3D READY');
  };
  const disposeMaterial=material=>{
    if(!material)return;
    const mats=Array.isArray(material)?material:[material];
    for(const mat of mats){if(!mat)continue;for(const value of Object.values(mat)){if(value?.isTexture)value.dispose();}mat.dispose();}
  };
  const clearLandedConfetti=()=>{
    if(!landedConfetti)return;
    landedConfetti.parent?.remove(landedConfetti);
    landedConfetti.geometry.dispose();
    landedConfetti.material.dispose();
    landedConfetti=null;
  };
  const releaseModel=()=>{
    clearLandedConfetti();
    if(viewerModel){scene?.remove(viewerModel);viewerModel.traverse(n=>{if(n.isMesh){n.geometry?.dispose();disposeMaterial(n.material);}});viewerModel=null;}
    activeTexture?.dispose();activeTexture=null;modelKey='';
  };
  function destroy(){++token;downloadRequest?.abort();active=false;releaseModel();observer?.disconnect();observer=null;controls?.dispose();controls=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;camera=null;scene=null;}
  function draw(){if(!active||mode!=='3d'||document.hidden||!renderer||!scene||!camera)return;renderer.render(scene,camera);}
  function resize(){if(!active||!renderer||!camera)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1:1.45));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
  async function engine(){if(api)return api;const [T,L,C]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js')]);api={THREE:T,GLTFLoader:L.GLTFLoader,OrbitControls:C.OrbitControls};return api;}
  function setup(conf){
    THREE=api.THREE;
    renderer=new THREE.WebGLRenderer({canvas,antialias:innerWidth>700,preserveDrawingBuffer:true,powerPreference:'low-power',alpha:true});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.93;
    scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(37,1,.1,700);camera.position.set(...conf.camera);
    scene.add(new THREE.HemisphereLight(0xffffff,0x8c9aa8,1.1));scene.add(new THREE.AmbientLight(0xffffff,.18));
    for(const [pos,power] of [[[-35,44,34],1.05],[[33,22,-27],.48],[[22,37,35],.4]]){const light=new THREE.DirectionalLight(0xffffff,power);light.position.set(...pos);scene.add(light);}
    controls=new api.OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=false;controls.enablePan=true;controls.panSpeed=.52;controls.rotateSpeed=.48;controls.zoomSpeed=.72;controls.minDistance=conf.distance[0];controls.maxDistance=conf.distance[1];controls.minPolarAngle=.30;controls.maxPolarAngle=Math.PI*.73;controls.addEventListener('change',draw);
    active=true;observer=new ResizeObserver(resize);observer.observe(stage);
  }
  function cameraPreset(conf){if(!camera||!controls)return;camera.position.set(...conf.camera);controls.target.set(0,0,0);controls.minDistance=conf.distance[0];controls.maxDistance=conf.distance[1];controls.update();}
  function syncLandedConfetti(){
    clearLandedConfetti();
    const preset=shell.dataset.lighting||'showroom';
    if(!viewerModel||!THREE||!chosen||!ready(chosen))return;
    if(!['victory','victory-night','victory-confetti'].includes(preset)){draw();return;}
    const conf=bodies[chosen.bodyModel];
    const mesh=viewerModel.getObjectByName(conf.mesh)||viewerModel.getObjectByName(conf.mesh.replace(/Mtl$/,''));
    if(!mesh?.isMesh)return;
    try{
      landedConfetti=createLandedConfetti(THREE,mesh,preset,chosen.slug||'');
      if(landedConfetti)mesh.add(landedConfetti);
    }catch(err){
      // Celebration decorations are optional; never affect the working 3D paint.
      console.warn('[Aetherwing Victory Lane]',err);
    }
    draw();
  }
  async function applyTexture(paint,current){
    const conf=bodies[paint.bodyModel],mesh=viewerModel?.getObjectByName(conf.mesh)||viewerModel?.getObjectByName(conf.mesh.replace(/Mtl$/,''));
    if(!mesh?.isMesh)throw new Error('Expected paintable body '+conf.mesh+' not found');
    const map=await new THREE.TextureLoader().loadAsync(paint.liveryTexture);
    if(current!==token){map.dispose();return;}
    map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.needsUpdate=true;
    const old=mesh.material;if(!old){map.dispose();throw new Error('Missing body material');}
    const mat=old.clone();mat.color.set(0xffffff);mat.map=map;mat.transparent=false;mat.metalness=0;mat.roughness=.85;mat.side=THREE.DoubleSide;mat.needsUpdate=true;
    mesh.material=mat;disposeMaterial(old);activeTexture=map;
    syncLandedConfetti();
    markReady();draw();
  }
  async function present(p){
    chosen=p;
    const current=++token;
    downloadRequest?.abort();downloadRequest=null;clearSaveStatus();
    if(renderMessage)renderMessage.hidden=true;
    if(!p){releaseModel();setMode('empty','PAINT PENDING');if(fallback)fallback.hidden=true;canvas.hidden=true;if(hint)hint.hidden=true;exportLabel('SAVE RENDER',false,'Select a paint to save its render');showText('PAINT PENDING');return;}
    if(!ready(p)){releaseModel();showFallback(p,current);return;}
    markLoading();
    try{
      await engine();if(current!==token)return;
      const conf=bodies[p.bodyModel];
      if(!renderer)setup(conf);
      if(modelKey!==p.bodyModel){
        releaseModel();
        const gltf=await new api.GLTFLoader().loadAsync(conf.model);
        if(current!==token){gltf.scene.traverse(n=>{if(n.isMesh){n.geometry?.dispose();disposeMaterial(n.material);}});return;}
        viewerModel=gltf.scene;scene.add(viewerModel);modelKey=p.bodyModel;cameraPreset(conf);
      }
      await applyTexture(p,current);
      if(current===token)resize();
    }catch(err){
      if(current!==token)return;
      console.error('[Aetherwing 3D]',err);
      releaseModel();showFallback(p,current);
    }
  }
  const download=(blob,filename)=>{
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  };
  const renderFilename=(paint,blob)=>{
    const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','image/avif':'avif','image/svg+xml':'svg'};
    const extension=extensions[blob.type.split(';')[0]]||new URL(paint.image,location.href).pathname.match(/\.(png|jpe?g|webp|gif|avif|svg)$/i)?.[1]||'png';
    const name=[paint.driver,paint.number,paint.sponsor,paint.slug,'render'].filter(Boolean).join('-').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,160);
    return `${name||'aetherwing-render'}.${extension}`;
  };
  export3d?.addEventListener('click',async()=>{
    if(export3d.disabled)return;
    const paint=chosen,current=token;
    clearSaveStatus();
    if(mode==='static'){
      const controller=new AbortController();downloadRequest=controller;
      exportLabel('SAVING…',false,'Saving the original render');
      try{
        // Download the original bytes, without canvas recompression, cropping,
        // scene effects or a screenshot of the displayed stage.
        const response=await fetch(paint.image,{signal:controller.signal,credentials:'omit'});
        if(!response.ok)throw new Error('Image download failed');
        const blob=await response.blob();
        if(!blob.size||blob.type&& !/^image\//.test(blob.type)&&blob.type!=='application/octet-stream')throw new Error('The host did not return an image');
        if(current!==token||controller.signal.aborted)return;
        download(blob,renderFilename(paint,blob));
      }catch(error){
        if(current!==token||controller.signal.aborted)return;
        if(saveStatus){saveStatus.hidden=false;saveStatus.textContent='Could not save the render. Please try again.';}
      }finally{
        if(current===token){downloadRequest=null;exportLabel('SAVE RENDER',true,'Download the selected paint’s original image');}
      }
      return;
    }
    if(mode!=='3d'||!renderer||!viewerModel)return;
    draw();canvas.toBlob(blob=>{if(blob&&current===token)download(blob,(paint.slug||'paint')+'-3d.png');},'image/png');
  });
  retry?.addEventListener('click',()=>{if(mode==='unavailable')present(chosen);});
  document.addEventListener('aetherwing:paint-change',e=>present(e.detail?.paint||null));
  document.addEventListener('aetherwing:scene-change',syncLandedConfetti);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
  addEventListener('pagehide',destroy);
  present(chosen);
}
