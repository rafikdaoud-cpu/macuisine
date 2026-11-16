<script lang="ts">
  import {ui} from '$lib/i18n';
  import {activeFloor,addKitchenModule} from '$lib/stores/project';
  import type {KitchenUnitSpec} from '$lib/models/types';
  let open=$state(false),run=$state<KitchenUnitSpec['run']>('main');
  const runs=$derived([...new Set(['main',...($activeFloor?.furniture??[]).flatMap(item=>item.kitchenUnit?[item.kitchenUnit.run]:[])])] as KitchenUnitSpec['run'][]);
  const options=[{kind:'base-doors',label:'Meuble bas à portes'},{kind:'base-drawers',label:'Meuble bas à tiroirs'},{kind:'wall',label:'Meuble haut'},{kind:'corner',label:'Meuble d’angle bas'},{kind:'tall',label:'Colonne de rangement'},{kind:'oven',label:'Four et plaque'},{kind:'microwave',label:'Micro-ondes'},{kind:'fridge',label:'Colonne réfrigérateur'},{kind:'sink',label:'Meuble évier'},{kind:'hood',label:'Hotte'}] as const;
</script>
<div class="kitchen-add-bar">
  <button class="add-trigger" aria-expanded={open} onclick={()=>open=!open}>+ {$ui('Ajouter un élément')}</button>
  {#if open}<div class="kitchen-choices"><label>{$ui('Côté')}<select bind:value={run}>{#each runs as side}<option value={side}>{$ui({main:'Linéaire principal',left:'Retour gauche',right:'Retour droit',island:'Îlot'}[side])}</option>{/each}</select></label>
    {#each options as option}<button onclick={()=>{addKitchenModule(option.kind,run);open=false;}}>{$ui(option.label)}</button>{/each}
  </div>{/if}
</div>
<style>.kitchen-add-bar{flex-shrink:0;padding:8px 12px;border-bottom:1px solid #dce0eb;background:#fff;color:#1e2447}.add-trigger{background:#1e2447;color:white;border-radius:7px;padding:10px 14px;font-size:13px;font-weight:600}.kitchen-choices{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;max-height:220px;overflow:auto}.kitchen-choices button,.kitchen-choices select{background:white;color:#1e2447;border:1px solid #9ca9c5;border-radius:6px;padding:9px;font-size:13px;min-height:40px}.kitchen-choices label{display:flex;align-items:center;gap:8px;font-size:13px}button{cursor:pointer}</style>
