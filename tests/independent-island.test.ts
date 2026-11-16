import {expect,it} from 'vitest';
import {createKitchenProject,KitchenRoomFitError,type KitchenSetup} from '$lib/utils/kitchenWorkflow';
import {readProject} from '$lib/utils/projectValidation';
const setup=(layout:KitchenSetup['layout']):KitchenSetup=>({shape:'rectangle',layout,style:'scandinavian',name:'Cuisine',widthMm:7000,depthMm:6000,ceilingMm:2400,islandLengthMm:1200});
it.each(['one-wall','galley','l-shaped','u-shaped'] as const)('adds an independent island to %s without replacing the original cabinets',layout=>{
  const without=createKitchenProject({...setup(layout),island:false}).floors[0].furniture;
  const project=createKitchenProject({...setup(layout),island:true}),items=project.floors[0].furniture;
  const shape=(list:typeof items)=>list.map(({catalogId,position,rotation,width,depth,height,kitchenUnit})=>({catalogId,position,rotation,width,depth,height,kitchenUnit}));
  expect(without.some(item=>item.kitchenUnit?.run==='island')).toBe(false);
  expect(shape(items.filter(item=>item.kitchenUnit?.run!=='island'))).toEqual(shape(without));
  const island=items.filter(item=>item.kitchenUnit?.run==='island');
  expect(island.reduce((sum,item)=>sum+item.width!,0)).toBe(120);
  expect(island.every(item=>item.kitchenUnit?.floorOffset===0)).toBe(true);
  expect(readProject(JSON.parse(JSON.stringify(project))).floors[0].furniture).toHaveLength(items.length);
});
it('requires enough room and rejects invalid island dimensions',()=>{
  expect(()=>createKitchenProject({...setup('u-shaped'),island:true,depthMm:3400})).toThrow('nécessite');
  expect(()=>createKitchenProject({...setup('one-wall'),island:true,islandLengthMm:NaN})).toThrow('longueur');
});
it('keeps the preview visible in a larger room while the actual project remains blocked until the room is adapted',()=>{
  const input={...setup('u-shaped'),widthMm:4200,depthMm:3400,island:true,islandLengthMm:2000};
  const before=structuredClone(input);
  expect(()=>createKitchenProject(input)).toThrow(KitchenRoomFitError);
  const preview=createKitchenProject(input,{preview:true});
  expect(preview.floors[0].furniture.some(item=>item.kitchenUnit?.run==='island')).toBe(true);
  expect(Math.max(...preview.floors[0].walls.flatMap(wall=>[wall.start.y,wall.end.y]))).toBe(510);
  expect(input).toEqual(before);
  expect(()=>createKitchenProject({...input,depthMm:5100})).not.toThrow();
  expect(()=>createKitchenProject({...input,islandLengthMm:NaN},{preview:true})).toThrow('longueur');
});
