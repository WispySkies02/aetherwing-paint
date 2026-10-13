import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Runs on paint.aetherwing.net, beside the existing GLB files. Uploaded PNGs
// are never sent to a server: createObjectURL and TextureLoader remain local.
const $ = selector => document.querySelector(selector);
const bodySelect = $('[data-body]');
const fileInput = $('[data-file]');
const stage = $('[data-stage]');
const canvas = $('[data-canvas]');
const statusElement = $('[data-status]');
const exportButton = $('[data-export]');
const models = Object.freeze({
  'nrrs-toyota': {path:'/assets/3d/nrrs-toyota.glb', mesh:'Paint1Mtl', camera:[-34,19,34], range:[16,85]},
  'oreilly-chevy': {path:'/assets/3d/oreilly-chevy.glb', mesh:'Body1Mtl', camera:[-31,15,-34], range:[15,75]},
  'sunoco-truck': {path:'/assets/3d/sunoco-truck.glb', mesh:'Body21Mtl', camera:[-34,19,34], range:[16,85]}
});
const maxBytes = 16 * 1024 * 1024;
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.93;
renderer.setClearColor(0x000000,0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(37,1,0.1,700);
scene.add(new THREE.HemisphereLight(0xffffff,0x8c9aa8,1.1));
scene.add(new THREE.AmbientLight(0xffffff,0.18));
for(const [position,intensity] of [[[-35,44,34],1.05],[[33,22,-27],0.48],[[22,37,35],0.4]]){
  const light = new THREE.DirectionalLight(0xffffff,intensity);
  light.position.set(...position);
  scene.add(light);
}
const controls = new OrbitControls(camera,canvas);
controls.target.set(0,0,0);
controls.enableDamping = false;
controls.enablePan = true;
controls.panSpeed = 0.52;
controls.rotateSpeed = 0.48;
controls.zoomSpeed = 0.72;
controls.minPolarAngle = 0.30;
controls.maxPolarAngle = Math.PI * 0.73;
controls.addEventListener('change',draw);

let modelScene = null, paintMesh = null, originalMaterial = null;
let previewMaterial = null, previewTexture = null;
let selectedFile = null, currentBody = '', modelVersion = 0, textureVersion = 0;

function notify(message,kind=''){
  statusElement.textContent = message;
  statusElement.className = 'status' + (kind ? ' '+kind : '');
}
function draw(){
  if(document.hidden) return;
  renderer.render(scene,camera);
}
function resize(){
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if(width < 1 || height < 1)return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,window.innerWidth<640?1.2:1.5));
  renderer.setSize(width,height,false);
  camera.aspect = width/height;
  camera.updateProjectionMatrix();
  draw();
}
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(stage);

function resetCamera(){
  const conf = models[bodySelect.value];
  if(!conf)return;
  camera.position.set(...conf.camera);
  controls.target.set(0,0,0);
  controls.minDistance = conf.range[0];
  controls.maxDistance = conf.range[1];
  controls.update();
  draw();
}
function disposeMaterial(material){
  if(!material)return;
  for(const item of (Array.isArray(material)?material:[material])){
    if(!item)continue;
    for(const property of Object.values(item))if(property?.isTexture)property.dispose();
    item.dispose();
  }
}
function clearPreviewMaterial(){
  ++textureVersion;
  if(previewMaterial && paintMesh)paintMesh.material = originalMaterial;
  previewMaterial?.dispose();
  previewTexture?.dispose();
  previewMaterial = null;
  previewTexture = null;
  exportButton.disabled = !selectedFile || !paintMesh;
  draw();
}
function unloadModel(){
  clearPreviewMaterial();
  if(!modelScene)return;
  scene.remove(modelScene);
  modelScene.traverse(node=>{
    if(!node.isMesh)return;
    node.geometry?.dispose();
    disposeMaterial(node.material);
  });
  modelScene=null;
  paintMesh=null;
  originalMaterial=null;
  currentBody='';
  exportButton.disabled=true;
}
async function validatePng(file){
  if(!file || file.size < 100 || file.size > maxBytes || !/\.png$/i.test(file.name))
    throw new Error('Choose an original PNG texture between 100 bytes and 16 MiB.');
  const header = new Uint8Array(await file.slice(0,24).arrayBuffer());
  if(header.length !== 24 || ![137,80,78,71,13,10,26,10].every((byte,index)=>header[index]===byte))
    throw new Error('This file is not a real PNG. A renamed JPEG will not work.');
  const view = new DataView(header.buffer);
  const width = view.getUint32(16),height=view.getUint32(20);
  if(width < 64 || height < 64 || width > 8192 || height > 8192)
    throw new Error('PNG dimensions must be between 64 and 8192 pixels per side.');
  return {width,height};
}
async function applyPreview(){
  const file=selectedFile;
  if(!file || !paintMesh)return;
  const version=++textureVersion;
  notify('Applying '+file.name+' to the '+bodySelect.selectedOptions[0].textContent+' body…');
  const url=URL.createObjectURL(file);
  let map=null;
  try{
    map=await textureLoader.loadAsync(url);
    if(version!==textureVersion || file!==selectedFile || !paintMesh){map.dispose();return;}
    map.colorSpace=THREE.SRGBColorSpace;
    map.flipY=false; // Must match the live Paint Booth's GLTF paint mapping.
    map.needsUpdate=true;
    const replacement=originalMaterial.clone();
    replacement.color.set(0xffffff);
    replacement.map=map;
    replacement.transparent=false;
    replacement.metalness=0;
    replacement.roughness=0.85;
    replacement.side=THREE.DoubleSide;
    replacement.needsUpdate=true;
    const previousMaterial=previewMaterial,previousTexture=previewTexture;
    paintMesh.material=replacement;
    previewMaterial=replacement;
    previewTexture=map;
    previousMaterial?.dispose();
    previousTexture?.dispose();
    exportButton.disabled=false;
    notify('PREVIEW READY · '+file.name+' · Drag to rotate. Nothing has been uploaded.','good');
    draw();
  }catch(error){
    map?.dispose();
    if(version===textureVersion)notify('Unable to preview the PNG: '+(error?.message||'Texture loading failed.'),'error');
  }finally{
    URL.revokeObjectURL(url);
  }
}
async function loadBody(){
  const key=bodySelect.value,conf=models[key];
  if(!conf)return;
  const version=++modelVersion;
  unloadModel();
  notify('Loading '+bodySelect.selectedOptions[0].textContent+' 3D body…');
  try{
    const gltf=await loader.loadAsync(conf.path);
    if(version!==modelVersion){
      gltf.scene.traverse(node=>{if(node.isMesh){node.geometry?.dispose();disposeMaterial(node.material)}});
      return;
    }
    const paintable=gltf.scene.getObjectByName(conf.mesh)||gltf.scene.getObjectByName(conf.mesh.replace(/Mtl$/,''));
    if(!paintable?.isMesh)throw new Error('Paintable mesh '+conf.mesh+' was not found.');
    modelScene=gltf.scene;
    paintMesh=paintable;
    originalMaterial=paintable.material;
    currentBody=key;
    scene.add(modelScene);
    resetCamera();
    resize();
    if(selectedFile)await applyPreview();
    else notify('BODY READY · Choose your original flat PNG to preview it.','good');
  }catch(error){
    if(version!==modelVersion)return;
    notify('3D model could not load: '+(error?.message||'Unknown error.'),'error');
  }
}
bodySelect.addEventListener('change',()=>{
  if(selectedFile)notify('Changing bodies: PNG UV layouts may differ between models.');
  loadBody();
});
fileInput.addEventListener('change',async()=>{
  const file=fileInput.files?.[0];
  if(!file)return;
  try{
    const dimensions=await validatePng(file);
    selectedFile=file;
    if(!paintMesh){
      notify('Valid '+dimensions.width+'×'+dimensions.height+' PNG selected. Loading body…');
      return;
    }
    await applyPreview();
  }catch(error){
    notify(error?.message||'Could not read PNG file.','error');
    fileInput.value='';
  }
});
$('[data-reset]').addEventListener('click',resetCamera);
$('[data-clear]').addEventListener('click',()=>{
  selectedFile=null;
  fileInput.value='';
  clearPreviewMaterial();
  notify(paintMesh?'PNG cleared. Choose another paint to preview.':'PNG cleared. Loading body…');
});
exportButton.addEventListener('click',()=>{
  if(exportButton.disabled || !paintMesh || !selectedFile)return;
  draw();
  canvas.toBlob(blob=>{
    if(!blob){notify('Could not export preview image.','error');return;}
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=(selectedFile.name.replace(/\.png$/i,'')||'aetherwing-paint')+'-3d-preview.png';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
  },'image/png');
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)draw()});
window.addEventListener('pagehide',()=>{
  ++modelVersion;
  unloadModel();
  resizeObserver.disconnect();
  controls.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
});
loadBody();