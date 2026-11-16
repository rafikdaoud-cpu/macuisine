import type { FurnitureItem } from '$lib/models/types';
import { getFurnitureSize, getCatalogItem } from './furnitureCatalog';

export function furnitureFrontLayout(items: FurnitureItem[], selectedId: string | null = null, run='main') {
  const selected = items.find(item => item.id === selectedId);
  const hasKitchen=items.some(item=>item.kitchenUnit);
  const source = selected ? [selected] : hasKitchen?items.filter(item=>item.kitchenUnit?.run===run):items;
  let x = 0;
  const columns = [...source].sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y).flatMap(item => {
    const size = getFurnitureSize(item);
    if (![size.width, size.height].every(value => Number.isFinite(value) && value > 0)) return [];
    const unit=item.kitchenUnit??getCatalogItem(item.catalogId)?.kitchenUnit;
    const catalogId=unit?unit.kind==='base-drawers'?'csm_drawers_3_open':['base-doors','sink','wall'].includes(unit.kind)?'csm_shelves_2_doors':item.catalogId:item.storageAppearance && item.catalogId === 'counter' ? 'csm_shelves_2_doors' : item.catalogId;
    const match = /^csm_(shelves|hanging|drawers)_([1-6])_(open|doors)$/.exec(catalogId);
    const column = { item, x:hasKitchen?unit?.offset??x:x, width: size.width, height: size.height, floorOffset:selected?0:unit?.floorOffset??0,
      type: match?.[1] ?? 'other', count: Number(match?.[2] ?? 0), doors: match?.[3] === 'doors' };
    x = hasKitchen?Math.max(x,column.x+size.width):x+size.width;
    return [column];
  });
  return { columns, width: x, height: Math.max(0, ...columns.map(column => column.height+column.floorOffset)) };
}
