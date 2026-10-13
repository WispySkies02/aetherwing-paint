/* Aetherwing Paint Booth v88: 3D-first showroom with selected render fallback.
   Missing asset diagnostics belong in Admin, not the public showroom. */
import { createLandedConfetti } from './victory-confetti-v89.js';
const root=document.querySelector('[data-paint-facility]');
const shell=root?.querySelector('[data-booth-shell]');
const stage=root?.querySelector('[data-3d-stage]');
const canvas=stage?.querySelector('[data-3d-canvas]');
const status=root?.querySelector('[data-booth-state]');
const fallback=stage?.querySelector('[data-3d-fallback]');
const fallbackImage=stage?.querySelector('[data-3d-fallback-image]');
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
  const excluded=p=>(p?.leagues||[]).some(l=>['uarl-open','uarl-d2','iracing'].includes(l));
  const ready=p=>!!(p && !excluded(p) && bodies[p.bodyModel] && validTexture(p.liveryTexture));
  let chosen=paints.find(p=>p.slug===root.dataset.currentPaintSlug)||paints[0]||null;
  let api=null,THREE=null,renderer=null,scene=null,camera=null,controls=null,viewerModel=null,activeTexture=null;
  let modelKey='',token=0,active=false,observer=null,landedConfetti=null;
  shell.dataset.viewMode='3d';
  stage.hidden=false;
  const showText=t=>{if(status)status.textContent=t;};
  // The visitor sees either their selected 3D car or the same paint's existing render.
  // Do not expose missing-asset or Admin instructions here.
  const showFallback=paint=>{
    const url=typeof paint?.image==='string' ? paint.image.trim() : '';
    if(fallbackImage){
      fallbackImage.alt=paint ? `${paint.sponsor||'Selected paint'} — static paint render` : 'Selected paint render';
      fallbackImage.hidden=!url;
      if(url)fallbackImage.src=url;
      else fallbackImage.removeAttribute('src');
    }
    if(fallback)fallback.hidden=false;
    canvas.hidden=true;
    if(hint)hint.hidden=true;
    if(export3d){export3d.disabled=true;export3d.title='3D unavailable';}
    showText('SHOWROOM');
  };
  const markLoading=()=>{
    if(fallback)fallback.hidden=true;
    canvas.hidden=false;
    if(hint)hint.hidden=true;
    if(export3d){export3d.disabled=true;export3d.title='Loading 3D';}
    showText('LOADING 3D');
  };
  const markReady=()=>{
    if(fallback)fallback.hidden=true;
    canvas.hidden=false;
    if(hint)hint.hidden=false;
    if(export3d){export3d.disabled=false;export3d.title='Save an image of the current 3D car';}
    showText('3D READY');
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
  function destroy(){++token;active=false;releaseModel();observer?.disconnect();observer=null;controls?.dispose();controls=null;renderer?.dispose();renderer?.forceContextLoss();renderer=null;camera=null;scene=null;}
  function draw(){if(!active||document.hidden||!renderer||!scene||!camera)return;renderer.render(scene,camera);}
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
    draw();markReady();
  }
  async function present(p){
    chosen=p;
    const current=++token;
    if(!ready(p)){releaseModel();showFallback(p);return;}
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
      releaseModel();showFallback(p);
    }
  }
  export3d?.addEventListener('click',()=>{
    if(!ready(chosen)||!renderer||!viewerModel||export3d.disabled)return;
    draw();canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(chosen.slug||'paint')+'-3d.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);},'image/png');
  });
  document.addEventListener('aetherwing:paint-change',e=>present(e.detail?.paint||null));
  document.addEventListener('aetherwing:scene-change',syncLandedConfetti);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw();});
  addEventListener('pagehide',destroy);
  present(chosen);
}
