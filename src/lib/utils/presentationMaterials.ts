import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ownTexture } from './furnitureModelResources';
import { storageFinish } from './storageAppearance';

// Shared CPU images, instance-owned GPU textures: rebuilding a model releases its maps.
const surfaces = new Map<string, {color:HTMLCanvasElement;height:HTMLCanvasElement}>();
function finishCanvases(id:string){
  const finish=storageFinish(id),cached=surfaces.get(finish.id);if(cached)return cached;
  const color=document.createElement('canvas'),height=document.createElement('canvas');
  color.width=color.height=height.width=height.height=512;
  const context=color.getContext('2d'),heightContext=height.getContext('2d');if(!context||!heightContext)return null;
  const image=context.createImageData(512,512),bump=heightContext.createImageData(512,512);
  const rgb=finish.color.slice(1).match(/../g)!.map(channel=>parseInt(channel,16));
  // Periodic grain avoids seams at repeat boundaries; bounded variation avoids striped wood.
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
    const u=x/512,v=y/512,wave=Math.sin(v*Math.PI*2)*.45+Math.sin(v*Math.PI*6)*.16;
      const grain=Math.sin((u*8+wave*.7)*Math.PI*2)*.024+Math.sin((u*38+wave)*Math.PI*2)*.014+Math.sin((u*117+wave*.6)*Math.PI*2)*.006;
    const noise=(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
    const variation=finish.grain==='wood'?grain+noise*.009:Math.sin(u*18+Math.sin(v*11))*.014+noise*.018;
    const index=(y*512+x)*4;
    for(let channel=0;channel<3;channel++)image.data[index+channel]=Math.max(0,Math.min(255,rgb[channel]*(1+variation)));
    image.data[index+3]=255;
    const value=Math.round(128+variation*750);
    bump.data[index]=bump.data[index+1]=bump.data[index+2]=value;bump.data[index+3]=255;
  }
  context.putImageData(image,0,0);heightContext.putImageData(bump,0,0);
  const result={color,height};surfaces.set(finish.id,result);return result;
}

export function createFinishMaterial(id:string,gloss=false):THREE.MeshPhysicalMaterial{
  const finish=storageFinish(id);
  const material=new THREE.MeshPhysicalMaterial({color:finish.color,roughness:gloss?.22:.58,metalness:0,clearcoat:gloss?.65:.08,clearcoatRoughness:gloss?.16:.5});
  if(finish.grain&&typeof document!=='undefined'){
    const images=finishCanvases(finish.id);
    if(images){
      const color=ownTexture(new THREE.CanvasTexture(images.color));color.colorSpace=THREE.SRGBColorSpace;
      const height=ownTexture(new THREE.CanvasTexture(images.height));
      for(const texture of [color,height]){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=4;}
      material.color.set('#ffffff');material.map=color;material.bumpMap=height;material.bumpScale=finish.grain==='wood'?.01:.018;
    }
  }
  return material;
}

/** Small real bevels preserve the exact dimensions and catch highlights at panel edges. */
export function createPanelGeometry(width:number,height:number,depth:number){
  const radius=Math.min(.12,width/5,height/5,depth/5);
  const geometry=new RoundedBoxGeometry(width,height,depth,2,radius);
  const uv=geometry.attributes.uv,index=geometry.index;
  for(const group of geometry.groups){
    const face=group.materialIndex??0;
    const scaleU=(face<2?depth:width)/60,scaleV=(face===2||face===3?depth:height)/180;
    for(let n=group.start;n<group.start+group.count;n++){
      const i=index?index.getX(n):n;uv.setXY(i,uv.getX(i)*scaleU,uv.getY(i)*scaleV);
    }
  }
  uv.needsUpdate=true;return geometry;
}

export function presentationQuality(pixelRatio:number,compact:boolean,maxTextureSize=2048){
  return {pixelRatio:Math.min(Number.isFinite(pixelRatio)&&pixelRatio>0?pixelRatio:1,compact?1.5:1.75),shadowSize:Math.min(compact?1024:2048,maxTextureSize)};
}
