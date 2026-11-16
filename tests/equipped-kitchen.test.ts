import {describe,expect,it} from 'vitest';
import {createKitchenProject,type KitchenSetup} from '$lib/utils/kitchenWorkflow';
import {defaultKitchenEquipment,kitchenLengthMm} from '$lib/utils/kitchenEquipment';
import {readProject} from '$lib/utils/projectValidation';
import {storagePresets} from '$lib/utils/storagePresets';
import {createCreationProject} from '$lib/utils/creationWorkflow';
import {furnitureFrontLayout} from '$lib/utils/furnitureFrontLayout';
import {createPlacedFurnitureModel} from '$lib/utils/furnitureModelLoader';

const setup=(layout:KitchenSetup['layout']='one-wall'):KitchenSetup=>({shape:'rectangle',layout,style:'scandinavian',name:'Cuisine équipée',widthMm:4200,depthMm:3400,ceilingMm:2400});
describe('ready made kitchens and storage',()=>{
 it('creates the main 340 cm kitchen with 275 cm of base and wall units plus a refrigerator',()=>{
  const project=createKitchenProject(setup()),items=project.floors[0].furniture;
  expect(kitchenLengthMm(defaultKitchenEquipment())).toBe(3400);expect(items).toHaveLength(11);
  expect(items.some(item=>item.kitchenUnit?.kind==='sink')).toBe(true);expect(items.some(item=>item.kitchenUnit?.kind==='oven')).toBe(true);expect(items.some(item=>item.kitchenUnit?.kind==='hood')).toBe(true);
  const upper=items.filter(item=>item.kitchenUnit?.floorOffset!>0);
  expect(upper).toHaveLength(5);expect(upper.every(item=>item.height===70&&item.depth===35&&item.kitchenUnit?.floorOffset===155)).toBe(true);
  expect(readProject(JSON.parse(JSON.stringify(project))).floors[0].furniture).toHaveLength(11);
  const front=furnitureFrontLayout(items);expect(front.width).toBe(340);expect(front.height).toBe(225);
 });
 it.each(['l-shaped','u-shaped','galley','island'] as const)('creates filled %s returns without an empty starting plan',layout=>{
  const project=createKitchenProject(setup(layout)),items=project.floors[0].furniture;
  expect(items.length).toBeGreaterThan(11);expect(new Set(items.map(item=>item.id)).size).toBe(items.length);
  const runs=new Set(items.map(item=>item.kitchenUnit?.run));expect(runs.size).toBe(layout==='u-shaped'?3:2);
 });
 it('removes the refrigerator and rejects a kitchen larger than the room',()=>{
  const equipment={...defaultKitchenEquipment(),fridge:false};expect(createKitchenProject({...setup(),equipment}).floors[0].furniture).toHaveLength(10);
  expect(()=>createKitchenProject({...setup(),widthMm:2000})).toThrow('nécessite');
 });
 it('places wall cabinets above the worktop in the 3D model',()=>{
  const project=createKitchenProject(setup()),unit=project.floors[0].furniture.find(item=>item.kitchenUnit?.kind==='wall')!;
  expect(createPlacedFurnitureModel(unit,undefined,project)!.position.y).toBe(156.5);
 });
 it.each(storagePresets.map(preset=>[preset.title,preset.setup] as const))('starts %s with real validated furniture',(_,preset)=>{
  const project=createCreationProject(structuredClone(preset));expect(project.floors[0].furniture.length).toBeGreaterThan(0);
  expect(readProject(JSON.parse(JSON.stringify(project))).creationKind).toBe(preset.kind);
 });
});
