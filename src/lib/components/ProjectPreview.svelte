<script lang="ts">
  import type { Project } from '$lib/models/types';
  import { furnitureFrontLayout } from '$lib/utils/furnitureFrontLayout';
  import { getFurnitureSize } from '$lib/utils/furnitureCatalog';
  import { storageFinish } from '$lib/utils/storageAppearance';
  let { project }: { project: Project } = $props();
  const floor = $derived(project.floors.find(item => item.id === project.activeFloorId) ?? project.floors[0]);
  const layout = $derived(furnitureFrontLayout(floor?.furniture ?? []));
  const kitchen = $derived(project.creationKind === 'kitchen' || (!project.creationKind && /cuisine/i.test(project.name)));
  const bounds = $derived.by(() => {
    const points = [...(floor?.walls.flatMap(wall => [wall.start,wall.end]) ?? []), ...(floor?.furniture.flatMap(item => { const size = getFurnitureSize(item); return [{x:item.position.x-size.width/2,y:item.position.y-size.depth/2},{x:item.position.x+size.width/2,y:item.position.y+size.depth/2}]; }) ?? [])];
    const minX = Math.min(0,...points.map(p=>p.x)), minY = Math.min(0,...points.map(p=>p.y));
    return { x:minX-35,y:minY-35,w:Math.max(100,...points.map(p=>p.x))-minX+70,h:Math.max(100,...points.map(p=>p.y))-minY+70 };
  });
</script>
{#if kitchen}
  <svg viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`} aria-hidden="true" class="preview">
    {#each floor?.walls ?? [] as wall}<line x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} stroke="#354e44" stroke-width={Math.max(5,wall.thickness)} stroke-linecap="square" />{/each}
    {#each floor?.furniture ?? [] as item}{@const size = getFurnitureSize(item)}<rect x={item.position.x-size.width/2} y={item.position.y-size.depth/2} width={size.width} height={size.depth} transform={`rotate(${item.rotation},${item.position.x},${item.position.y})`} rx="2" fill={item.storageAppearance ? storageFinish(item.storageAppearance.facades).color : item.color ?? '#d4ba8c'} stroke="#7e806c" stroke-width="2" />{/each}
  </svg>
{:else}
  <svg viewBox={`-16 -16 ${Math.max(100,layout.width)+32} ${Math.max(100,layout.height)+32}`} aria-hidden="true" class="preview">
    {#each layout.columns as column}
      {@const fill = column.item.storageAppearance ? storageFinish(column.item.storageAppearance.carcass).color : column.item.color ?? '#bb9a65'}
      <g transform={`translate(${column.x},${layout.height-column.height})`}>
        <rect width={column.width} height={column.height} fill={fill} stroke="#6c715a" stroke-width="1" />
        <rect x="2" y="2" width={Math.max(0,column.width-4)} height={Math.max(0,column.height-4)} fill="#f5edda" />
        {#if column.type === 'shelves'}{#each Array.from({length:column.count}) as _,i}<rect x="2" y={column.height*(i+1)/(column.count+1)} width={Math.max(0,column.width-4)} height="2" fill={fill} />{/each}
        {:else if column.type === 'drawers'}{#each Array.from({length:column.count}) as _,i}<rect x="2" y={i*column.height/column.count+2} width={Math.max(0,column.width-4)} height={Math.max(0,column.height/column.count-3)} fill={column.item.storageAppearance ? storageFinish(column.item.storageAppearance.facades).color : fill} stroke="#8b876e" stroke-width="0.6" /><line x1={column.width*.35} x2={column.width*.65} y1={i*column.height/column.count+8} y2={i*column.height/column.count+8} stroke="#505d55" stroke-width="1.2" />{/each}
        {:else if column.type === 'hanging'}<line x1="3" y1="30" x2={column.width-3} y2="30" stroke="#6d7a72" stroke-width="2" />{/if}
      </g>
    {/each}
  </svg>
{/if}
<style>.preview{width:100%;height:100%;padding:20px;filter:drop-shadow(0 8px 7px #5b58351a)}</style>
