import * as THREE from 'three';
import type { FurnitureDef } from './furnitureCatalog';
import { createStorageModel } from './storageModels';
import { createFinishMaterial, createPanelGeometry } from './presentationMaterials';
import { defaultStorageAppearance, storageFinish } from './storageAppearance';

/** Procedural equipped kitchen units; all dimensions are centimetres. */
export function createKitchenUnitModel(def:FurnitureDef,opened=false):THREE.Group|null{
  const unit=def.kitchenUnit;if(!unit)return null;
  const {width:w,depth:d,height:h}=def;
  const appearance=def.storageAppearance??{...defaultStorageAppearance(),carcass:'white' as const,facades:'oak' as const,top:'white' as const};
  const metal=new THREE.MeshStandardMaterial({color:'#8b9298',metalness:.72,roughness:.3});
  const black=new THREE.MeshStandardMaterial({color:'#171d25',roughness:.2,metalness:.25});
  const glass=new THREE.MeshStandardMaterial({color:'#26323d',roughness:.12,metalness:.25});
  const white=createFinishMaterial(appearance.top==='same'?appearance.carcass:appearance.top);
  let group:THREE.Group;
  if(unit.kind==='hood'||unit.kind==='microwave')group=new THREE.Group();
  else group=createStorageModel(unit.kind==='base-drawers'?'csm_drawers_3_open':unit.kind==='oven'||unit.kind==='fridge'?'csm_shelves_1_open':unit.kind==='wall'?'csm_shelves_2_doors':'csm_shelves_1_doors',{...def,storageAppearance:appearance,catalogGroup:unit.kind==='wall'?'wall':def.catalogGroup},opened)!;
  function box(width:number,height:number,depth:number,x:number,y:number,z:number,material=metal,parent=group){const mesh=new THREE.Mesh(createPanelGeometry(width,height,depth),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(radius:number,length:number,x:number,y:number,z:number,material=metal){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,18),material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
  if(unit.kind==='microwave'){
    box(w,h,d,0,h/2,0,metal);box(w-3,h-3,1,0,h/2,d/2+.5,black);
    box(w*.65,h*.6,1,-w*.09,h/2,d/2+1,glass);box(w*.12,h*.18,1,w*.37,h*.7,d/2+1.2,black);
    box(1,h*.5,2,w*.25,h/2,d/2+2,metal);
  }
  if(unit.kind==='corner'){
    // Blind corner: the fixed left facade covers the inaccessible return cavity.
    box(w*.5,h-12,2,-w*.25,(h+8)/2,d/2+2,new THREE.MeshStandardMaterial({color:storageFinish(appearance.facades).color,roughness:.6}));
  }
  if(unit.backsplashHeight>0)box(w,unit.backsplashHeight,1,0,h+unit.backsplashHeight/2,-d/2+.5,white);
  if(unit.kind==='sink'){
    box(w*.6,1,d*.6,0,h+.4,0,metal);box(w*.5,.6,d*.48,0,h+1,0,black);
    cylinder(1.2,16,0,h+8,-d*.3);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,h+15,-d*.3),new THREE.Vector3(0,h+24,-d*.25),new THREE.Vector3(0,h+24,-d*.05),new THREE.Vector3(0,h+18,0)]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,20,1,8,false),metal));
  }
  if(unit.kind==='oven'){
    box(w*.87,1,d*.68,0,h+.7,0,black);
    for(const x of [-w*.22,w*.22])for(const z of [-d*.17,d*.17])cylinder(4,.5,x,h+1.5,z,metal);
    box(w-4,8,2,0,h-6,d/2+1,metal);
    for(const x of [-w*.3,w*.3]){const knob=cylinder(1.4,1,x,h-6,d/2+2,black);knob.rotation.x=Math.PI/2;}
    const door=new THREE.Group();door.name='oven-door';door.position.set(0,11,d/2+1);door.rotation.x=opened?Math.PI/2:0;group.add(door);
    const doorHeight=Math.max(30,h-26);box(w-4,doorHeight,2,0,doorHeight/2,0,black,door);box(w-12,doorHeight*.65,.5,0,doorHeight*.43,1.3,glass,door);box(w*.6,1,2,0,doorHeight-5,2,metal,door);
  }
  if(unit.kind==='hood'){
    box(w,8,d,0,5,0,metal);box(w*.55,Math.max(10,h-8),d*.6,0,(h+8)/2,-d*.15,metal);
    box(w*.7,1,d*.65,0,.5,d*.1,black);
  }
  if(unit.kind==='fridge'){
    const fridgeMaterial=new THREE.MeshStandardMaterial({color:'#7f878b',metalness:.45,roughness:.38});
    for(const [index,from,to] of [[0,11,h*.4],[1,h*.4+1,h-2]]){
      const door=new THREE.Group();door.name=index===0?'fridge-lower':'fridge-upper';door.position.set(-w/2+2,0,d/2+1);door.rotation.y=opened?-Math.PI/2:0;group.add(door);
      box(w-4,to-from,2,(w-4)/2,(to+from)/2,0,fridgeMaterial,door);box(1,Math.min(25,(to-from)*.5),2,w-10,(to+from)/2,2,metal,door);
    }
  }
  return group;
}
