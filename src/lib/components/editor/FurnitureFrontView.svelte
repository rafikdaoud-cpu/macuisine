<script lang="ts">
  import { ui } from '$lib/i18n';
  import { activeFloor, currentProject, selectedElementId, addStorageModule } from '$lib/stores/project';
  import { furnitureFrontLayout } from '$lib/utils/furnitureFrontLayout';
  import { furnitureName } from '$lib/i18n/furnitureNames';
  import { locale } from '$lib/i18n';
  import { storageFinish } from '$lib/utils/storageAppearance';
  let interior = $state(true);
  let selectedOnly = $state(false);
  let zoom = $state(1);
  let run=$state('main');
  let adding = $state(false);
  const runs=$derived([...new Set(($activeFloor?.furniture??[]).flatMap(item=>item.kitchenUnit?[item.kitchenUnit.run]:[]))]);
  const layout = $derived(furnitureFrontLayout($activeFloor?.furniture ?? [], selectedOnly ? $selectedElementId : null,run));
  const padding = $derived(Math.max(24, Math.max(layout.width, layout.height) * 0.12));
  const stroke = $derived(Math.max(0.5, Math.max(layout.width, layout.height) / 600));
  const font = $derived(Math.max(5, Math.max(layout.width, layout.height) / 42));
</script>

<section class="front-view" aria-label={$ui("Vue de face du meuble")}>
  <header>
    <div><h2>{$ui("Vue de face")}</h2><p>{$ui("Vos façades et vos rangements, vus à hauteur du meuble.")}</p></div>
    <div class="view-controls">
      {#if ['furniture','dressing'].includes($currentProject?.creationKind ?? '')}
        <button class="add-module" aria-expanded={adding} onclick={()=>adding=!adding}>+ {$ui('Ajouter un élément')}</button>
        {#if adding}<div class="add-choices">{#each [{id:'column',label:'Colonne avec portes'},{id:'shelves',label:'Étagères'},{id:'hanging',label:'Penderie'},{id:'drawers',label:'Tiroirs'}] as option}<button onclick={()=>{addStorageModule(option.id as 'column'|'shelves'|'hanging'|'drawers');adding=false;}}>{$ui(option.label)}</button>{/each}</div>{/if}
      {/if}
      {#if runs.length>1}<label>{$ui("Côté")}<select bind:value={run}>{#each runs as side}<option value={side}>{$ui({main:'Linéaire principal',left:'Retour gauche',right:'Retour droit',island:'Îlot'}[side])}</option>{/each}</select></label>{/if}
      <label><input type="checkbox" bind:checked={interior} /> {$ui("Voir l’intérieur")}</label>
      <label><input type="checkbox" bind:checked={selectedOnly} disabled={!($activeFloor?.furniture.some(item => item.id === $selectedElementId))} /> {$ui("Meuble sélectionné")}</label>
      <button aria-label={$ui("Réduire la vue de face")} disabled={zoom <= 0.5} onclick={() => zoom = Math.max(0.5, zoom - 0.25)}>−</button>
      <button aria-label={$ui("Ajuster la vue de face")} onclick={() => zoom = 1}>{$ui("Ajuster")}</button>
      <button aria-label={$ui("Agrandir la vue de face")} disabled={zoom >= 3} onclick={() => zoom = Math.min(3, zoom + 0.25)}>+</button>
    </div>
  </header>
  {#if !layout.columns.length}<p class="empty">{$ui("Ajoutez un meuble depuis le catalogue pour voir sa façade.")}</p>
  {:else}
    <div class="drawing">
      <svg style:width={`${zoom * 100}%`} style:min-width={`${zoom * 100}%`} viewBox={`${-padding} ${-padding} ${layout.width + 2 * padding} ${layout.height + 2 * padding}`} role="img" aria-label={`Meuble vu de face, largeur ${(Math.round(layout.width * 10) / 10)} cm, hauteur ${(Math.round(layout.height * 10) / 10)} cm`}>
        <line x1="0" y1={layout.height} x2={layout.width} y2={layout.height} stroke="#929e94" stroke-width={stroke} />
        {#each layout.columns as column (column.item.id)}
          {@const y = layout.height - column.height-column.floorOffset}
          {@const panel = Math.min(1.8, column.width / 12, column.height / 12)}
          {@const appearance = column.item.storageAppearance}
          {@const fill = appearance ? storageFinish(appearance.carcass).color : column.item.color ?? '#c6a16e'}
          {@const facade = appearance ? storageFinish(appearance.facades).color : fill}
          {@const baseHeight = column.floorOffset>0?0:appearance ? Math.min(appearance.base === 'wall' ? 20 : 10, column.height/4) : 0}
          {@const bodyHeight = column.height-baseHeight}
          {@const handleColor = appearance ? { black:'#202525', inox:'#a4a7ab', gold:'#bb9448' }[appearance.handleColor] : '#626f72'}
          <g transform={`translate(${column.x},${y})`} role="button" tabindex="0" aria-label={`${$ui('Choisir un élément')} ${furnitureName(column.item.catalogId,$locale)}`} onclick={()=>selectedElementId.set(column.item.id)} onkeydown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();selectedElementId.set(column.item.id);}}}>
            <rect width={column.width} height={bodyHeight} fill={fill} stroke={$selectedElementId === column.item.id ? '#2563eb' : '#5c6157'} stroke-width={$selectedElementId === column.item.id ? stroke * 3 : stroke} />
            {#if ['oven','hood','fridge'].includes(column.item.kitchenUnit?.kind??'')}
              <rect x={panel} y={panel} width={column.width-panel*2} height={bodyHeight-panel*2} fill={column.item.kitchenUnit?.kind==='oven'?'#242c35':'#939b9f'} stroke="#616c77" stroke-width={stroke} />
              {#if column.item.kitchenUnit?.kind==='fridge'}<line x1={panel} x2={column.width-panel} y1={bodyHeight*.6} y2={bodyHeight*.6} stroke="#4b5661" stroke-width={stroke*2} />{:else if column.item.kitchenUnit?.kind==='oven'}<rect x={column.width*.15} y={bodyHeight*.25} width={column.width*.7} height={bodyHeight*.5} fill="#3d4b58" />{/if}
            {:else if interior || !column.doors}
              <rect x={panel} y={panel} width={column.width - panel * 2} height={bodyHeight - panel * 2} fill={appearance?.back === false ? '#f4f5f9' : '#fffdf5'} fill-opacity="0.76" />
              {#if column.type === 'shelves'}
                {#each Array.from({ length: column.count }) as _, i}<rect x={panel} y={(bodyHeight - panel * 2) * (i + 1) / (column.count + 1)} width={column.width - 2 * panel} height={panel} fill={fill} stroke="#7f7d68" stroke-width={stroke * 0.5} />{/each}
              {:else if column.type === 'hanging'}
                <rect x={panel} y="24" width={column.width - 2 * panel} height={panel} fill={fill} />
                <line x1={panel * 2} y1="35" x2={column.width - panel * 2} y2="35" stroke="#7b8387" stroke-width={stroke * 2} />
              {:else if column.type === 'drawers'}
                {#each Array.from({ length: column.count }) as _, i}
                  {@const drawerHeight = (bodyHeight - panel * 2) / column.count}
                  <rect x={panel} y={panel + i * drawerHeight} width={column.width - 2 * panel} height={drawerHeight - 0.4} fill={facade} stroke="#7d786a" stroke-width={stroke} />
                  {#if appearance?.handle !== 'none'}{#if appearance?.handle === 'knob'}<circle cx={column.width/2} cy={panel+i*drawerHeight+Math.min(4,drawerHeight/4)} r={stroke*1.7} fill={handleColor} />{:else}<line x1={column.width * 0.35} y1={panel + i * drawerHeight + Math.min(4, drawerHeight / 4)} x2={column.width * 0.65} y2={panel + i * drawerHeight + Math.min(4, drawerHeight / 4)} stroke={handleColor} stroke-width={stroke * 2} />{/if}{/if}
                {/each}
              {/if}
            {:else}
              <rect x="0" y="0" width={column.width} height={bodyHeight} fill={facade} stroke="#6f6c5c" stroke-width={stroke} />
              <line x1={column.width / 2} y1="0" x2={column.width / 2} y2={bodyHeight} stroke="#6f6c5c" stroke-width={stroke} />
              {#if appearance?.handle !== 'none'}{#each [-1,1] as side}{#if appearance?.handle === 'knob'}<circle cx={column.width/2+side*3} cy={bodyHeight/2} r={stroke*1.7} fill={handleColor} />{:else}<line x1={column.width / 2 + side * 3} y1={bodyHeight / 2 - 7} x2={column.width / 2 + side * 3} y2={bodyHeight / 2 + 7} stroke={handleColor} stroke-width={stroke * 2} />{/if}{/each}{/if}
            {/if}
            {#if appearance?.led}<line x1={panel*2} y1={panel*2} x2={column.width-panel*2} y2={panel*2} stroke="#f3c76a" stroke-width={stroke*3} />{/if}
            {#if appearance}<rect width={column.width} height={panel} fill={storageFinish(appearance.top === 'same' ? appearance.carcass : appearance.top).color} />{/if}
            {#if appearance?.base === 'plinth'}<rect x={panel} y={bodyHeight} width={column.width-2*panel} height={baseHeight} fill={fill} stroke="#6f6c5c" stroke-width={stroke} />{:else if appearance?.base === 'feet'}{#each [5,column.width-8] as foot}<rect x={foot} y={bodyHeight} width="3" height={baseHeight} fill="#59665e" />{/each}{/if}
          </g>
        {/each}
        <g fill="#344a40" stroke="#65766b" stroke-width={stroke}>
          <line x1="0" y1={-padding * 0.4} x2={layout.width} y2={-padding * 0.4} />
          <line x1="0" y1={-padding * 0.55} x2="0" y2={-padding * 0.25} />
          <line x1={layout.width} y1={-padding * 0.55} x2={layout.width} y2={-padding * 0.25} />
          <text x={layout.width / 2} y={-padding * 0.58} text-anchor="middle" stroke="none" font-size={font}>{(Math.round(layout.width * 10) / 10)} {$ui("cm")}</text>
          <line x1={-padding * 0.4} y1="0" x2={-padding * 0.4} y2={layout.height} />
          <text x={-padding * 0.58} y={layout.height / 2} text-anchor="middle" transform={`rotate(-90,${-padding * 0.58},${layout.height / 2})`} stroke="none" font-size={font}>{(Math.round(layout.height * 10) / 10)} {$ui("cm")}</text>
        </g>
      </svg>
    </div>
    <div class="module-list" aria-label="Meubles représentés">{#each layout.columns as column, index}<button class:chosen={$selectedElementId === column.item.id} onclick={() => selectedElementId.set(column.item.id)}>{index + 1}. {furnitureName(column.item.catalogId, $locale)} · {(Math.round(column.width * 10) / 10)} × {(Math.round(column.height * 10) / 10)} {$ui("cm")}</button>{/each}</div>
    <p class="note">{$ui("Les façades sont présentées côte à côte. Pour voir leur position dans la pièce, utilisez le plan 2D ou la vue 3D.")}</p>
  {/if}
</section>

<style>
.add-choices{display:flex;flex-wrap:wrap;gap:8px;width:100%}.view-controls .add-module{background:#1e2447;color:white;border-color:#1e2447}.drawing g[role=button]{cursor:pointer}.drawing g[role=button]:focus-visible{outline:2px solid #2563eb}

  .front-view{position:absolute;inset:0;display:flex;flex-direction:column;background:#f4f5f9;color:#1e2447;overflow:hidden}header{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;padding:16px 20px;background:white;border-bottom:1px solid #dce0eb}h2{font-size:22px;font-weight:700}header p,.note{font-size:12px;color:#68738d}.view-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.view-controls label{display:flex;align-items:center;gap:6px;font-size:14px}.view-controls button{border:1px solid #c6cee1;padding:6px 10px;border-radius:6px;background:white;font-size:14px;min-height:42px}.view-controls button:disabled{opacity:.4}.drawing{flex:1;min-height:120px;overflow:auto;display:flex;align-items:flex-start;justify-content:flex-start;padding:20px}.drawing svg{height:100%;flex-shrink:0;min-height:160px}.module-list{display:flex;flex-wrap:wrap;gap:6px;padding:8px 16px;max-height:100px;overflow:auto}.module-list button{font-size:12px;padding:7px 10px;background:#fff;border:1px solid #c6cee1;border-radius:7px}.module-list button.chosen{outline:2px solid #2563eb}.note{padding:8px 16px 14px}.empty{padding:24px}button{cursor:pointer}:global(.front-view :focus-visible){outline:3px solid #ad6e21;outline-offset:2px}@media(max-width:600px){header{padding:12px}.drawing{padding:8px}.view-controls{gap:8px}.view-controls button{min-height:44px}.module-list{max-height:120px}}
</style>
