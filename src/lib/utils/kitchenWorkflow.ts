import type { Project, FurnitureItem, KitchenUnitSpec } from '$lib/models/types';
import { createDefaultProject } from '$lib/stores/project';
import { defaultKitchenEquipment, kitchenLengthMm, validateKitchenEquipment, type KitchenEquipment } from './kitchenEquipment';
import { defaultStorageAppearance } from './storageAppearance';
export type KitchenSetup = { shape:'rectangle'|'l-shape'|'galley'|'open-plan';layout:'one-wall'|'galley'|'l-shaped'|'u-shaped'|'island';style:string;name:string;widthMm:number;depthMm:number;ceilingMm:number;island?:boolean;islandLengthMm?:number;equipment?:KitchenEquipment };
export const kitchenStyles = [
  { id: 'scandinavian', name: 'Scandinave', description: 'Blanc doux et bois clair', cabinet: '#e8e0d2', top: '#c79b68' },
  { id: 'modern-dark', name: 'Moderne', description: 'Graphite et pierre claire', cabinet: '#41464a', top: '#d8d5ce' },
  { id: 'farmhouse', name: 'Campagne', description: 'Vert sauge et bois naturel', cabinet: '#87917b', top: '#c5a77c' },
  { id: 'classic-navy', name: 'Bleu classique', description: 'Bleu profond et marbre', cabinet: '#263e59', top: '#e6e3dc' },
  { id: 'warm-walnut', name: 'Noyer', description: 'Bois chaleureux et pierre sombre', cabinet: '#754c31', top: '#3e3b37' },
  { id: 'cashmere-minimal', name: 'Minimal', description: 'Cachemire et béton', cabinet: '#b9ad9c', top: '#85817a' },
];

export type KitchenRoomSize={widthMm:number;depthMm:number;heightMm:number};
export class KitchenRoomFitError extends Error {
 constructor(public required:KitchenRoomSize){super('La cuisine équipée nécessite au moins '+required.widthMm/10+' cm de largeur, '+required.depthMm/10+' cm de profondeur et '+required.heightMm/10+' cm de hauteur dans la pièce. Ajustez la pièce ou les éléments.');this.name='KitchenRoomFitError';}
}
export function createKitchenProject(setup:KitchenSetup,options:{preview?:boolean}={}):Project {
 const e=setup.equipment??defaultKitchenEquipment();validateKitchenEquipment(e);
 if(![setup.widthMm,setup.depthMm,setup.ceilingMm].every(v=>Number.isFinite(v)&&v>0))throw new Error('Vérifiez les dimensions de la pièce.');
 const mainWidth=kitchenLengthMm(e)/10,baseDepth=e.baseDepthMm/10,upperDepth=e.upperDepthMm/10;
 const totalHeight=e.totalHeightMm/10,baseHeight=e.baseHeightMm/10,upperHeight=e.upperHeightMm/10,upperOffset=totalHeight-upperHeight;
 let w=setup.widthMm/10,d=setup.depthMm/10,h=setup.ceilingMm/10;
 const hasIsland=setup.island===true||setup.layout==='island';
 const islandLength=(setup.islandLengthMm??(setup.layout==='island'?e.returnLengthMm:2000))/10;
 if(setup.island!==undefined&&typeof setup.island!=='boolean')throw new Error('Vérifiez les options de cuisine.');
 if(hasIsland&&(!Number.isFinite(islandLength)||islandLength<90||islandLength>500))throw new Error('La longueur de l’îlot doit être comprise entre 90 et 500 cm.');
 const sideReturn=['l-shaped','u-shaped'].includes(setup.layout);
 const minDepth=hasIsland?(sideReturn?baseDepth*2+e.returnLengthMm/10+190:setup.layout==='galley'?baseDepth*3+190:baseDepth*2+190):sideReturn?baseDepth+e.returnLengthMm/10+40:setup.layout==='galley'?baseDepth*2+90:baseDepth+90;
 const required={widthMm:Math.ceil(Math.max(mainWidth+40,hasIsland?islandLength+180:0)*10),depthMm:Math.ceil(minDepth*10),heightMm:e.totalHeightMm};
 if(setup.widthMm<required.widthMm||setup.depthMm<required.depthMm||setup.ceilingMm<required.heightMm){
   if(!options.preview)throw new KitchenRoomFitError(required);
   w=Math.max(w,required.widthMm/10);d=Math.max(d,required.depthMm/10);h=Math.max(h,required.heightMm/10);
 }
 const project=createDefaultProject(setup.name.trim()||'Ma cuisine');project.creationKind='kitchen';const floor=project.floors[0];floor.name='Cuisine';
 const points=setup.shape==='l-shape'?[{x:0,y:0},{x:w,y:0},{x:w,y:d*.55},{x:w*.55,y:d*.55},{x:w*.55,y:d},{x:0,y:d}]:[{x:0,y:0},{x:w,y:0},{x:w,y:d},{x:0,y:d}];floor.walls=points.map((start,i)=>({id:crypto.randomUUID(),start,end:points[(i+1)%points.length],thickness:10,height:h,color:'#f3f4f6'}));
 const defaultAppearance={...defaultStorageAppearance(),carcass:'white' as const,facades:'oak' as const,top:'white' as const};
 const add=(kind:KitchenUnitSpec['kind'],run:KitchenUnitSpec['run'],offset:number,width:number,x:number,y:number,rotation:number,upper=false):void=>{
  const spec:KitchenUnitSpec={kind,run,offset,floorOffset:upper?upperOffset:0,backsplashHeight:upper||kind==='fridge'||run==='island'?0:upperOffset-baseHeight};
  const item:FurnitureItem={id:crypto.randomUUID(),catalogId:'csm_kitchen_'+kind,position:{x,y},rotation,scale:{x:1,y:1,z:1},width,depth:upper?upperDepth:baseDepth,height:kind==='fridge'?totalHeight:upper?upperHeight:baseHeight,color:'#bd9865',storageAppearance:{...defaultAppearance},kitchenUnit:spec};floor.furniture.push(item);
 };
 const fridgeWidth=e.fridge?e.fridgeWidthMm/10:0;let offset=e.fridge&&e.fridgeSide==='left'?fridgeWidth:0;
 const kinds=['base-doors','base-drawers','sink','oven','base-doors'] as const;
 e.widthsMm.forEach((widthMm,i)=>{const width=widthMm/10;add(kinds[i],'main',offset,width,40+offset+width/2,5+baseDepth/2,0);add(kinds[i]==='oven'?'hood':'wall','main',offset,width,40+offset+width/2,5+upperDepth/2,0,true);offset+=width;});
 if(e.fridge){const at=e.fridgeSide==='left'?0:mainWidth-fridgeWidth;add('fridge','main',at,fridgeWidth,40+at+fridgeWidth/2,5+baseDepth/2,0);}
 const addReturn=(run:'left'|'right'|'island',parallel=false)=>{const length=run==='island'?islandLength:e.returnLengthMm/10,count=Math.max(2,Math.ceil(length/70)),unitWidth=length/count;
  for(let i=0;i<count;i++){const at=i*unitWidth;let x:number,y:number,rotation:number;
   if(parallel){x=40+at+unitWidth/2;y=d-5-baseDepth/2;rotation=180;}
   else if(run==='island'){x=w/2-length/2+at+unitWidth/2;y=5+baseDepth+(sideReturn?e.returnLengthMm/10:0)+90+baseDepth/2;rotation=0;}
   else{x=run==='left'?40+baseDepth/2:40+mainWidth-baseDepth/2;y=5+baseDepth+at+unitWidth/2;rotation=run==='left'?270:90;}
   add(i===0?'base-drawers':'base-doors',run,at,unitWidth,x,y,rotation);
   if(run!=='island'){const ux=parallel?x:run==='left'?40+upperDepth/2:40+mainWidth-upperDepth/2;const uy=parallel?d-5-upperDepth/2:y;add('wall',run,at,unitWidth,ux,uy,rotation,true);}
  }
 };
 if(setup.layout==='l-shaped')addReturn(e.returnSide);if(setup.layout==='u-shaped'){addReturn('left');addReturn('right');}if(setup.layout==='galley')addReturn('right',true);if(hasIsland)addReturn('island');
 return project;
}
