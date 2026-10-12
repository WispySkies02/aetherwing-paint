/* Aetherwing Paint Booth v87: optional and lazy 3D mode using existing stage.
   3D lab entries have explicit bodyModel AND matching liveryTexture, so a
   static render from a different scheme can never accidentally acquire 3D. */
const root = document.querySelector('[data-paint-facility]');
const shell = root?.querySelector('[data-booth-shell]');
const stage = root?.querySelector('[data-3d-stage]');
const canvas = stage?.querySelector('[data-3d-canvas]');
const button2d = root?.querySelector('[data-view-2d]');
const button3d = root?.querySelector('[data-view-3d]');
const screenshot = root?.querySelector('[data-3d-save]');
const stateLabel = root?.querySelector('[data-booth-state]');
const raw = document.querySelector('#aw-paint-booth-data');
if (root && shell && stage && canvas && button2d && button3d && raw) {
  const paintData=JSON.parse(raw.textContent||'{}');
  const paints=paintData.paints||[];
  const bodies={
    'nrrs-toyota':{model:'/assets/3d/nrrs-toyota.glb',mesh:'Paint1Mtl',camera:[-34,19,34],distance:[16,85]},
    'sunoco-truck':{model:'/assets/3d/sunoco-truck.glb',mesh:'Body21Mtl',camera:[-34,19,34],distance:[16,85]},
    'oreilly-chevy':{model:'/assets/3d/oreilly-chevy.glb',mesh:'Body1Mtl',camera:[-31,15,-34],distance:[15,75]}
  };
  const validTexture=url=>typeof url==='string' && (/^\/assets\/3d\/[a-z0-9-]+\.(?:webp|png)$/.test(url)||/^https:\/\/aetherwing\.net\/api\/paint-3d-texture\/[a-f0-9]{64}\.png$/.test(url)||/^https:\/\/paint\.aetherwing\.net\/assets\/3d\/[a-z0-9-]+\.(?:webp|png)$/.test(url));
  const isSupported = p => !!(p && bodies[p.bodyModel] && validTexture(p.liveryTexture) && !(p.leagues||[]).some(l=>['uarl-open','uarl-d2','iracing'].includes(l)));
  let chosen = paints.find(p=>p.slug===root.dataset.currentPaintSlug)||paints[0]||null;
  let mode='2d';
  let api=null,renderer=null,scene=null,camera=null,controls=null,viewerModel=null,texture=null,THREE=null;
  let modelKey='', requestId=0, rotationRequest=0, spin=false, busy=false, resizeObserver=null, active=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const announce = label => { if (stateLabel) stateLabel.textContent=label; };
  const updateControls=()=>{
    const available=isSupported(chosen);
    button3d.disabled=!available;
    button3d.title=available?'Load 3D body and this scheme’s flat PNG':'This paint needs a compatible body and flat PNG in Aetherwing Admin';
    if(availability) availability.textContent=available?'3D READY':(chosen?.leagues||[]).some(l=>['uarl-open','uarl-d2','iracing'].includes(l))?'2D ONLY · BODY NEEDED':chosen?.bodyModel?'PNG NEEDED IN ADMIN':'3D BODY NEEDED';
    button2d.classList.toggle('is-active',mode==='2d');
    button3d.classList.toggle('is-active',mode==='3d');
    button2d.setAttribute('aria-pressed',String(mode==='2d'));
    button3d.setAttribute('aria-pressed',String(mode==='3d'));
    if(screenshot) screenshot.hidden=mode!=='3d';
    shell.dataset.viewMode=mode;
    stage.hidden=mode!=='3d';
  };
  const disposeMap = map=>{if(map){map.dispose?.();}};
  const disposeModel =()=>{
    if(viewerModel){scene?.remove(viewerModel);viewerModel.traverse(n=>{if(n.isMesh){n.geometry?.dispose();const mats=Array.isArray(n.material)?n.material:[n.material];mats.forEach(m=>{if(!m)return;for(const val of Object.values(m)){if(val?.isTexture)val.dispose();}m.dispose();});}});viewerModel=null;}
    if(texture){disposeMap(texture);texture=null;}modelKey='';
  };
  function release(){
    ++requestId; busy=false;active=false;spin=false;
    if(rotationRequest){cancelAnimationFrame(rotationRequest);rotationRequest=0;}
    disposeModel();resizeObserver?.disconnect();resizeObserver=null;
    controls?.dispose();controls=null;
    if(renderer){renderer.dispose();renderer.forceContextLoss();renderer=null;}
    scene=null;camera=null;
  }
  function show2d(){mode='2d';release();updateControls();announce('RENDER READY');}
  function draw(){if(!active||document.hidden||!renderer||!scene||!camera)return;renderer.render(scene,camera);}
  function resize(){if(!renderer || !camera || !active)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1:1.45));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
  async function ensureEngine(){
    if(api)return api;
    const [T,L,C]=await Promise.all([import('three'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/controls/OrbitControls.js')]);
    api={THREE:T,GLTFLoader:L.GLTFLoader,OrbitControls:C.OrbitControls};return api;
  }
  function setupEngine(body){
    ({THREE}=api);
    renderer=new THREE.WebGLRenderer({canvas,antialias:innerWidth>700,preserveDrawingBuffer:true,powerPreference:'low-power',alpha:true});
    renderer.setClearColor(0x000000,0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.93;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(37,1,0.1,700);camera.position.set(...body.camera);
    scene.add(new THREE.HemisphereLight(0xffffff,0x8c9aa8,1.1));
    const ambient=new THREE.AmbientLight(0xffffff,.18);scene.add(ambient);
    for(const [pos,intensity] of [[[-35,44,34],1.05],[[33,22,-27],.48],[[22,37,35],.4]]){const light=new THREE.DirectionalLight(0xffffff,intensity);light.position.set(...pos);scene.add(light);}
    controls=new api.OrbitControls(camera,renderer.domElement);
    controls.target.set(0,0,0);controls.enableDamping=false;controls.enablePan=true;controls.panSpeed=.52;controls.rotateSpeed=.48;controls.zoomSpeed=.72;
    controls.minDistance=body.distance[0];controls.maxDistance=body.distance[1];controls.minPolarAngle=.30;controls.maxPolarAngle=Math.PI*.73;
    controls.addEventListener('change',draw);
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
  }
  function setPreset(body){
    if(!camera||!controls)return;
    camera.position.set(...body.camera);controls.target.set(0,0,0);
    controls.minDistance=body.distance[0];controls.maxDistance=body.distance[1];controls.update();draw();
  }
  async function setTexture(paint,token){
    const conf=bodies[paint.bodyModel];
    if(!viewerModel)return;
    const mesh=viewerModel.getObjectByName(conf.mesh) || viewerModel.getObjectByName(conf.mesh.replace(/Mtl$/,''));
    if(!mesh || !mesh.isMesh)throw new Error('Missing paintable mesh '+conf.mesh);
    const map=await new THREE.TextureLoader().loadAsync(paint.liveryTexture);
    if(token!==requestId||mode!=='3d'){map.dispose();return;}
    map.colorSpace=THREE.SRGBColorSpace;map.flipY=false;map.needsUpdate=true;
    const mat=mesh.material;
    if(!mat){map.dispose();throw new Error('Missing paint material');}
    const next=mat.clone();next.color.set(0xffffff);next.map=map;next.transparent=false;next.metalness=0.0;next.roughness=.85;next.side=THREE.DoubleSide;next.needsUpdate=true;
    // GLB's original baked texture is released when its material is replaced.
    const old=mesh.material;mesh.material=next;
    if(texture && texture!==map)texture.dispose();texture=map;
    if(old && old!==next){old.map?.dispose?.();old.dispose?.();}
    announce('3D READY · '+paint.number+' '+paint.manufacturer.toUpperCase());draw();
  }
  async function present(paint){
    if(!isSupported(paint)||mode!=='3d')return;
    const token=++requestId;busy=true;announce('LOADING 3D');
    try{
      await ensureEngine();if(token!==requestId||mode!=='3d')return;
      const conf=bodies[paint.bodyModel];
      if(!renderer){setupEngine(conf);active=true;}
      if(modelKey!==paint.bodyModel){
        disposeModel();
        const gltf=await new api.GLTFLoader().loadAsync(conf.model);
        if(token!==requestId||mode!=='3d'){
          gltf.scene.traverse(n=>{if(n.isMesh){n.geometry?.dispose();n.material?.map?.dispose?.();n.material?.dispose?.();}});
          return;
        }
        viewerModel=gltf.scene;scene.add(viewerModel);modelKey=paint.bodyModel;setPreset(conf);
      }
      await setTexture(paint,token);
      if(token===requestId){busy=false;resize();}
    }catch(err){
      if(token!==requestId)return;
      console.error('Aetherwing 3D viewer:',err);
      show2d();announce('3D UNAVAILABLE · 2D READY');
    }
  }
  button2d.addEventListener('click',()=>{if(mode==='3d')show2d();});
  button3d.addEventListener('click',()=>{if(!isSupported(chosen)||mode==='3d')return;mode='3d';updateControls();present(chosen);});
  screenshot?.addEventListener('click',()=>{if(!renderer||mode!=='3d'||!chosen)return;draw();canvas.toBlob(b=>{if(!b)return;const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=`${chosen.slug}-3d.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)},'image/png');});
  // Whenever the original 2D rack changes, use the same paint record for 3D.
  document.addEventListener('aetherwing:paint-change',e=>{
    const paint=e.detail?.paint||null;chosen=paint;
    if(mode==='3d'){
      if(isSupported(paint))present(paint);
      else show2d();
    }
    updateControls();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(rotationRequest)cancelAnimationFrame(rotationRequest);rotationRequest=0;}else if(mode==='3d'){draw();}});
  // Do not animate continuously; render only during direct user interactions.
  addEventListener('pagehide',release);
  updateControls();
}
