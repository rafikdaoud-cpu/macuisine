import {expect,it} from 'vitest';
import {get} from 'svelte/store';
import {createCreationProject} from '$lib/utils/creationWorkflow';
import {storagePreset} from '$lib/utils/storagePresets';
import {addStorageModule,addKitchenModule,activeFloor,loadProject,undo,redo,currentProject} from '$lib/stores/project';
import {readProject} from '$lib/utils/projectValidation';
import {getCatalogItem} from '$lib/utils/furnitureCatalog';
import {createKitchenUnitModel} from '$lib/utils/kitchenModels';

it('appends a usable hanging column without changing previous modules and undoes in one step',()=>{
  loadProject(createCreationProject(storagePreset('furniture-low')));
  const before=structuredClone(get(activeFloor)!.furniture);
  const id=addStorageModule('hanging');
  const items=get(activeFloor)!.furniture;
  expect(items.slice(0,-1)).toEqual(before);
  expect(items.at(-1)).toMatchObject({id,catalogId:'csm_hanging_1_open'});
  expect(items.at(-1)!.height).toBeGreaterThanOrEqual(120);
  expect(items.at(-1)!.depth).toBeGreaterThanOrEqual(55);
  expect(items.at(-1)!.position.x-items.at(-1)!.width!/2).toBeGreaterThanOrEqual(Math.max(...before.map(item=>item.position.x+item.width!/2)));
  readProject(get(currentProject));undo();expect(get(activeFloor)!.furniture).toEqual(before);redo();expect(get(activeFloor)!.furniture.at(-1)!.id).toBe(id);
});
it('adds kitchen cabinets and appliances with model support, elevation and validated saved metadata',()=>{
  loadProject(createCreationProject({kind:'kitchen',kitchen:{shape:'rectangle',layout:'l-shaped',style:'scandinavian',name:'Cuisine',widthMm:5000,depthMm:4000,ceilingMm:2400}}));
  for(const kind of ['wall','base-doors','corner','tall','oven','microwave','fridge'] as const){
    const id=addKitchenModule(kind,'right');const item=get(activeFloor)!.furniture.find(item=>item.id===id)!;
    expect(item.kitchenUnit).toMatchObject({kind,run:'right'});expect(item.rotation).toBe(90);
    expect(createKitchenUnitModel({...getCatalogItem(item.catalogId)!,kitchenUnit:item.kitchenUnit})!.children.length).toBeGreaterThan(0);
    readProject(get(currentProject));
  }
  const microwave=get(activeFloor)!.furniture.find(item=>item.kitchenUnit?.kind==='microwave')!;
  expect(microwave.kitchenUnit!.floorOffset).toBe(88);
});
