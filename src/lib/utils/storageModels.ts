import * as THREE from 'three';
import type { FurnitureDef } from './furnitureCatalog';
import { createFinishMaterial as finishMaterial, createPanelGeometry } from './presentationMaterials';

/** Furniture front states are presentation only: saved dimensions never change when opened. */
export function createStorageModel(catalogId: string, def: FurnitureDef, opened = false): THREE.Group | null {
  const mapped = def.storageAppearance && catalogId === 'counter' ? 'csm_shelves_2_doors' : catalogId;
  const match = /^csm_(shelves|hanging|drawers)_([1-6])_(open|doors)$/.exec(mapped);
  if (!match) return null;
  const [, type, rawCount, front] = match, count = Number(rawCount);
  const options = def.storageAppearance;
  const w = def.width, d = def.depth;
  const baseHeight = def.catalogGroup==='wall'?0:options ? Math.min(options.base === 'wall' ? 20 : 10, def.height / 4) : 0;
  const h = def.height - baseHeight;
  const group = new THREE.Group(), body = new THREE.Group(); body.position.y = baseHeight; group.add(body);
  const finishes=new Map<string,THREE.MeshPhysicalMaterial>();
  function finish(id:string,gloss=false){const key=id+':'+gloss;let material=finishes.get(key);if(!material){material=finishMaterial(id,gloss);finishes.set(key,material);}return material;}
  const material = options ? finish(options.carcass) : new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.75 });
  const facade = options ? finish(options.facades,options.gloss) : material;
  const top = options ? finish(options.top === 'same' ? options.carcass : options.top) : material;
  const metal = new THREE.MeshStandardMaterial({ color: options ? { black:'#202525', inox:'#a4a7ab', gold:'#bb9448' }[options.handleColor] : '#a4a7ab', metalness: 0.7, roughness: 0.3 });
  const t = Math.min(1.8,w/12,h/12,d/12);
  const geometries=new Map<string,THREE.BufferGeometry>();
  function panel(width:number,height:number,depth:number,x:number,y:number,z:number,surface=material,parent=body) {
    const key=[width,height,depth].join(':');let geometry=geometries.get(key);if(!geometry){geometry=createPanelGeometry(width,height,depth);geometries.set(key,geometry);}
    const mesh=new THREE.Mesh(geometry,surface);
    mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh);
  }
  function handle(x:number,y:number,z:number,vertical=false,parent=body) {
    const kind = options?.handle ?? 'bar';
    if(kind==='none')return;
    if(kind==='knob') {const mesh=new THREE.Mesh(new THREE.SphereGeometry(1.3,12,8),metal);mesh.position.set(x,y,z+0.7);parent.add(mesh);}
    else if(kind==='integrated') panel(vertical?0.8:Math.min(18,w/3),vertical?14:0.8,0.5,x,y,z-0.3,metal,parent);
    else panel(vertical?0.8:Math.min(16,w/3),vertical?Math.min(16,h/3):0.8,1,x,y,z,metal,parent);
  }
  panel(t,h,d,-w/2+t/2,h/2,0);panel(t,h,d,w/2-t/2,h/2,0);
  panel(w-2*t,t,d,0,t/2,0);panel(w-2*t,t,d,0,h-t/2,0,top);
  if(options?.back!==false)panel(w-2*t,h-2*t,t/3,0,h/2,-d/2+t/6);
  if(options?.base==='plinth'&&baseHeight>0)panel(w-t*2,baseHeight,d-t*2,0,baseHeight/2,0,material,group);
  if(options?.base==='feet'&&baseHeight>0)for(const sx of [-1,1])for(const sz of [-1,1])panel(3,baseHeight,3,sx*(w/2-5),baseHeight/2,sz*(d/2-5),metal,group);
  if(type==='shelves')for(let i=1;i<=count;i++)panel(w-2*t,t,d-t,0,t+(h-2*t)*i/(count+1),0);
  else if(type==='hanging'){panel(w-2*t,t,d-t,0,h-25,0);panel(w-2*t,2,2,0,h-35,0,metal);}
  else {
    const drawerHeight=(h-2*t)/count;
    for(let i=0;i<count;i++){
      const extension=opened?d*0.65:0;
      panel(w-2*t,drawerHeight-0.3,t,0,t+drawerHeight*(i+0.5),d/2-t/2+extension,facade);
      handle(0,t+drawerHeight*(i+1)-4,d/2+0.5+extension);
      if(opened){const bottomY=t+i*drawerHeight+t,boxDepth=d-t*3;
        panel(w-t*4,t/2,boxDepth,0,bottomY,extension);
        for(const side of [-1,1])panel(t/2,drawerHeight*0.65,boxDepth,side*(w/2-t*2),bottomY+drawerHeight*0.325,extension);
        panel(w-t*4,drawerHeight*0.65,t/2,0,bottomY+drawerHeight*0.325,-boxDepth/2+extension);
      }
    }
  }
  if(front==='doors'&&type!=='drawers'){
    const leafWidth=(w-0.6)/2;
    for(const side of [-1,1]){
      const hinge=new THREE.Group();hinge.name=side<0?'door-left':'door-right';
      const sliding=options?.sliding===true;
      hinge.position.set(side*w/2+(sliding&&opened&&side<0?leafWidth*0.92:0),0,d/2+t/2+(sliding&&side>0?t:0));
      hinge.rotation.y=opened&&!sliding?side*Math.PI/2:0;body.add(hinge);
      panel(leafWidth,h-0.4,t,-side*leafWidth/2,h/2,0,facade,hinge);
      handle(-side*(w/2-3),h/2,t/2+0.5,true,hinge);
    }
  }
  if(options?.led){
    const led=new THREE.MeshStandardMaterial({color:'#fff3cd',emissive:'#ffd885',emissiveIntensity:2});
    panel(w-t*4,0.6,1,0,h-t-1,d/2-3,led);
  }
  return group;
}
