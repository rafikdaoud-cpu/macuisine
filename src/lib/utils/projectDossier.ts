import { get } from 'svelte/store';
import { branding } from '$lib/stores/branding';
import type {Project} from '$lib/models/types';
import type {Locale} from '$lib/i18n';
import {furnitureName} from '$lib/i18n/furnitureNames';
import {getFurnitureSize} from './furnitureCatalog';
import {storageAppearanceSummary} from './storageAppearance';
import type {jsPDF} from 'jspdf';

const cm=(value:number)=>String(Math.round(value*10)/10);
export function projectDetailLines(project:Project,language:Locale='fr',finishes=true):string[]{
  const lines=[project.name,'Dimensions : largeur × profondeur × hauteur (cm)',''];
  for(const floor of project.floors){
    lines.push('Étage : '+floor.name);
    if(floor.furniture.length){
      const boxes=floor.furniture.map(item=>{const size=getFurnitureSize(item),angle=item.rotation*Math.PI/180;const x=Math.abs(Math.cos(angle))*size.width/2+Math.abs(Math.sin(angle))*size.depth/2,y=Math.abs(Math.sin(angle))*size.width/2+Math.abs(Math.cos(angle))*size.depth/2;return{left:item.position.x-x,right:item.position.x+x,front:item.position.y-y,back:item.position.y+y,height:size.height+(item.kitchenUnit?.floorOffset??0)};});
      lines.push('Encombrement des meubles : '+cm(Math.max(...boxes.map(box=>box.right))-Math.min(...boxes.map(box=>box.left)))+' × '+cm(Math.max(...boxes.map(box=>box.back))-Math.min(...boxes.map(box=>box.front)))+' × '+cm(Math.max(...boxes.map(box=>box.height)))+' cm');
    }
    floor.furniture.forEach((item,index)=>{const size=getFurnitureSize(item);lines.push(`${index+1}. ${furnitureName(item.catalogId,language)} — ${cm(size.width)} × ${cm(size.depth)} × ${cm(size.height)} cm`);if(finishes&&item.storageAppearance)lines.push('FINITIONS — '+storageAppearanceSummary(item.storageAppearance));});
    if(!floor.furniture.length)lines.push('Aucun meuble sur cet étage.');
    floor.walls.forEach((wall,index)=>lines.push(`Mur ${index+1} : ${cm(Math.hypot(wall.end.x-wall.start.x,wall.end.y-wall.start.y))} cm`));
    lines.push('');
  }
  const identity=get(branding);
  lines.push([identity.companyName,identity.phone,identity.contactEmail].filter(Boolean).join(' — '));
  if(identity.website)lines.push(identity.website);
  lines.push('Dessin indicatif. Dimensions et finitions à valider avant fabrication.');return lines;
}
function wrapped(ctx:CanvasRenderingContext2D,lines:string[],width:number):string[]{
  return lines.flatMap(line=>{const result:string[]=[];let current='';for(const word of line.split(' ')){if(current&&ctx.measureText(current+' '+word).width>width){result.push(current);current=word;}else current+=(current?' ':'')+word;}result.push(current);return result;});
}
function context(width:number,height:number){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Création du récapitulatif impossible.');ctx.direction='ltr';ctx.textAlign='left';ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.font='20px Arial, sans-serif';ctx.fillStyle=get(branding).primaryColor;return{canvas,ctx};}
export async function projectSheetPNG(project:Project,preview:Blob,language:Locale):Promise<Blob>{
  const url=URL.createObjectURL(preview),image=new Image();
  try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Aperçu PNG illisible.'));image.src=url;});
    const measure=context(1400,100),all=wrapped(measure.ctx,projectDetailLines(project,language,false),1320),lines=all.slice(0,70);
    if(all.length>70)lines.push('Suite des éléments et détails complets dans le PDF et le récapitulatif joint.');
    const imageHeight=Math.min(800,1320*image.height/image.width),{canvas,ctx}=context(1400,Math.ceil(150+imageHeight+lines.length*30+50));
    ctx.font='bold 30px Arial, sans-serif';ctx.fillText(get(branding).companyName+' — Votre projet',40,55);
    const imageWidth=imageHeight*image.width/image.height;ctx.drawImage(image,(1400-imageWidth)/2,95,imageWidth,imageHeight);
    ctx.font='20px Arial, sans-serif';let y=135+imageHeight;for(const line of lines){ctx.fillText(line,40,y);y+=30;}
    return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Création du PNG impossible.')),'image/png'));
  }finally{URL.revokeObjectURL(url);}
}
/** Rasterized detail pages also preserve Arabic names with the browser's Unicode fonts. */
export function appendProjectDetails(pdf:jsPDF,project:Project,language:Locale):void{
  const lines=projectDetailLines(project,language),measure=context(1600,100),wrappedLines=wrapped(measure.ctx,lines,1500);
  for(let start=0;start<wrappedLines.length;start+=27){const {canvas,ctx}=context(1600,1000);ctx.font='bold 30px Arial, sans-serif';ctx.fillText(get(branding).companyName+' — Éléments, dimensions et finitions',50,55);ctx.font='20px Arial, sans-serif';let y=110;for(const line of wrappedLines.slice(start,start+27)){ctx.fillText(line,50,y);y+=30;}pdf.addPage('a4','landscape');pdf.addImage(canvas.toDataURL('image/png'),'PNG',10,10,277,173);}
}
