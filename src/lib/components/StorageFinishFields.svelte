<script lang="ts">
  import { ui } from '$lib/i18n';
  import { defaultStorageAppearance, finishBackground, storageFinish, storageFinishes, type StorageAppearance } from '$lib/utils/storageAppearance';
  let { appearance = $bindable(defaultStorageAppearance()), section = 'all', onchange }: { appearance?: StorageAppearance; section?: 'finishes' | 'options' | 'all'; onchange?: (value: StorageAppearance) => void } = $props();
  const id = $props.id();
  function set<K extends keyof StorageAppearance>(key: K, value: StorageAppearance[K]) { appearance = { ...appearance, [key]: value }; onchange?.(appearance); }
</script>
<div class="storage-settings">
  {#if section !== 'options'}
    {#each [{ key: 'carcass', label: 'Caisson' }, { key: 'facades', label: 'Façades' }, { key: 'top', label: 'Plateau du dessus' }] as field}
      <fieldset><legend>{$ui(field.label)} <span>{$ui(appearance[field.key as 'carcass' | 'facades' | 'top'] === 'same' ? 'Comme le caisson' : storageFinish(appearance[field.key as 'carcass' | 'facades' | 'top']).name)}</span></legend>
        <div class="swatches">{#if field.key === 'top'}<button type="button" class="same" class:active={appearance.top === 'same'} aria-pressed={appearance.top === 'same'} onclick={() => set('top','same')}>{$ui("Comme le caisson")}</button>{/if}
          {#each storageFinishes as finish}<button type="button" class="swatch" class:active={appearance[field.key as 'carcass' | 'facades' | 'top'] === finish.id} style:background={finishBackground(finish.id)} title={$ui(finish.name)} aria-label={`${$ui(field.label)} : ${$ui(finish.name)}`} aria-pressed={appearance[field.key as 'carcass' | 'facades' | 'top'] === finish.id} onclick={() => set(field.key as 'carcass' | 'facades' | 'top',finish.id)}></button>{/each}
        </div>
      </fieldset>
    {/each}
    <fieldset><legend>{$ui("Aspect des façades")}</legend><div class="choices">{#each [{ value:false, label:'Mat' },{ value:true, label:'Brillant' }] as item}<button type="button" class:active={appearance.gloss === item.value} aria-pressed={appearance.gloss === item.value} onclick={() => set('gloss',item.value)}>{$ui(item.label)}</button>{/each}</div></fieldset>
    <fieldset><legend>{$ui("Poignées")}</legend><div class="choices">{#each [{value:'bar',label:'Barre'},{value:'knob',label:'Bouton'},{value:'integrated',label:'Prise intégrée'},{value:'none',label:'Sans poignée'}] as item}<button type="button" class:active={appearance.handle === item.value} aria-pressed={appearance.handle === item.value} onclick={() => set('handle',item.value as StorageAppearance['handle'])}>{$ui(item.label)}</button>{/each}</div></fieldset>
    <fieldset disabled={appearance.handle === 'none'}><legend>{$ui("Couleur des poignées")}</legend><div class="choices">{#each [{value:'black',label:'Noir'},{value:'inox',label:'Inox'},{value:'gold',label:'Doré'}] as item}<button type="button" class:active={appearance.handleColor === item.value} aria-pressed={appearance.handleColor === item.value} onclick={() => set('handleColor',item.value as StorageAppearance['handleColor'])}>{$ui(item.label)}</button>{/each}</div></fieldset>
  {/if}
  {#if section !== 'finishes'}
    <fieldset><legend>{$ui("Base")}</legend><div class="choices">{#each [{value:'plinth',label:'Socle'},{value:'feet',label:'Pieds'},{value:'wall',label:'Suspendu'}] as item}<button type="button" class:active={appearance.base === item.value} aria-pressed={appearance.base === item.value} onclick={() => set('base',item.value as StorageAppearance['base'])}>{$ui(item.label)}</button>{/each}</div></fieldset>
    {#each [{key:'back',label:'Panneau de fond'},{key:'sliding',label:'Portes coulissantes'},{key:'led',label:'Éclairage LED dans les niches'},{key:'softClose',label:'Fermeture douce (portes et tiroirs)'}] as option}
      <label class="option" for={`${id}-${option.key}`}>{$ui(option.label)}<input id={`${id}-${option.key}`} type="checkbox" checked={appearance[option.key as 'back' | 'sliding' | 'led' | 'softClose']} onchange={event => set(option.key as 'back' | 'sliding' | 'led' | 'softClose',event.currentTarget.checked)} /></label>
    {/each}
    <p class="option-help">{$ui("Les portes coulissantes concernent les colonnes avec portes. La fermeture douce est une option à confirmer au devis.")}</p>
  {/if}
</div>
<style>
:global(html.dark) .storage-settings{color:#f1f5f9}:global(html.dark) legend span,:global(html.dark) .option-help{color:#cbd5e1}:global(html.dark) .choices button,:global(html.dark) .same{background:#334155;color:#f1f5f9;border-color:#94a3b8}:global(html.dark) .choices .active,:global(html.dark) .same.active{background:#dce4ff;color:#1e2447;border-color:#dce4ff}:global(html.dark) .option{border-color:#64748b}:global(html.dark) .option input{accent-color:#a5b4fc}

  .storage-settings{display:grid;gap:22px;color:#1e2447}fieldset{margin:0;padding:0;border:0;min-width:0}legend{font-size:14px;font-weight:700;margin-bottom:10px}legend span{font-weight:400;color:#66738e;margin-left:5px}.swatches,.choices{display:flex;flex-wrap:wrap;gap:8px}.swatch{height:40px;width:40px;border:1px solid #bdb7a4;border-radius:5px}.choices button,.same{background:#ffffff;border:1px solid #c6cee1;border-radius:7px;padding:9px 12px;font-size:13px;min-height:40px}.swatch.active{outline:3px solid #a67c39;outline-offset:2px}.choices .active,.same.active{background:var(--brand-primary,#1e2447);color:white;border-color:#1e2447}.option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid #e2e6f0;font-size:14px}.option input{accent-color:#1e2447;width:20px;height:20px}.option-help{font-size:12px;line-height:1.5;color:#69728a}button{cursor:pointer}fieldset:disabled{opacity:.45}:global(.storage-settings :focus-visible){outline:3px solid #a87529;outline-offset:3px}
</style>
