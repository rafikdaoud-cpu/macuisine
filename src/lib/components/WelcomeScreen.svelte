<script lang="ts">
  import { branding } from "$lib/stores/branding";
  import { ui } from '$lib/i18n';
  import { KitchenRoomFitError, type KitchenSetup } from '$lib/utils/kitchenWorkflow';
  import { creationLabels, createCreationProject, validateStorageSetup, type CreationKind, type CreationSetup, type StorageColumn } from '$lib/utils/creationWorkflow';
  import CreationPreview from './CreationPreview.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
  import StorageFinishFields from './StorageFinishFields.svelte';
  import KitchenEquipmentFields from './KitchenEquipmentFields.svelte';
  import { defaultKitchenEquipment } from '$lib/utils/kitchenEquipment';
  import { storagePresets,storagePreset } from '$lib/utils/storagePresets';
  import { defaultStorageAppearance, storageFinish } from '$lib/utils/storageAppearance';
  type Props = { onCreate: (setup: CreationSetup) => void | Promise<void>; onDismiss?: () => void; busy?: boolean; error?: string | null };
  let { onCreate, onDismiss, busy = false, error = null }: Props = $props();
  let kind = $state<CreationKind>('kitchen');
  let step = $state(0), name = $state('Ma cuisine'), submitError = $state('');
  let shape = $state<KitchenSetup['shape']>('rectangle');
  let layout = $state<KitchenSetup['layout']>('one-wall');
  let style = $state('scandinavian');
  let island=$state(false),islandLengthMm=$state(2000);
  let width = $state(4200), depth = $state(3400), ceiling = $state(2400);
  let storageWidth = $state(2400), storageDepth = $state(600), storageHeight = $state(2200);
  let columns = $state<StorageColumn[]>([{ type: 'hanging', count: 1, doors: false }, { type: 'shelves', count: 4, doors: false }, { type: 'drawers', count: 3, doors: false }]);
  let saving = $state(false);
  let appearance = $state(defaultStorageAppearance());
  let equipment = $state(defaultKitchenEquipment());
  let presetId=$state('dressing-classic');
  function applyStoragePreset(id:string){const setup=storagePreset(id);presetId=id;name=$ui(setup.name);storageWidth=setup.widthMm;storageDepth=setup.depthMm;storageHeight=setup.heightMm;columns=setup.columns;appearance=setup.appearance??defaultStorageAppearance();}
  const kinds: { id: CreationKind; title: string; description: string; icon: string }[] = [
    { id: 'kitchen', title: 'Ma cuisine', description: 'Dessinez la pièce et composez votre cuisine en 2D et 3D.', icon: 'M4 12h24v15H4zM4 4h10v6H4zM18 4h10v6H18zM12 12v15M21 12v15M7 16h2M15 16h3M24 16h2' },
    { id: 'dressing', title: 'Mon dressing', description: 'Organisez vos penderies, étagères et tiroirs selon votre espace.', icon: 'M5 3h22v26H5zM16 3v26M8 9h5M8 16h5M19 9h5M19 22h5M19 25h5' },
    { id: 'furniture', title: 'Mon meuble sur mesure', description: 'Composez un rangement, une bibliothèque ou un meuble bas.', icon: 'M4 8h24v18H4zM12 8v18M20 8v18M4 17h8M20 14h8M20 20h8M6 26v3M26 26v3' },
  ];
  const shapes = [{ id: 'rectangle', label: 'Rectangulaire' }, { id: 'l-shape', label: 'En L' }, { id: 'galley', label: 'En couloir' }, { id: 'open-plan', label: 'Ouverte' }] as const;
  const layouts = [{ id: 'one-wall', label: 'Linéaire' }, { id: 'galley', label: 'Parallèle' }, { id: 'l-shaped', label: 'En L' }, { id: 'u-shaped', label: 'En U' }] as const;
  const steps = $derived(kind === 'kitchen' ? ['La pièce', 'L’implantation', 'Les finitions', 'Les options'] : ['Les dimensions', 'La composition', 'Les finitions', 'Les options']);
  const invalidDimensions = $derived(kind === 'kitchen'
    ? ![width, depth, ceiling].every(Number.isFinite) || width < 2000 || width > 12000 || depth < 2000 || depth > 12000 || ceiling < 2000 || ceiling > 4000
    : ![storageWidth, storageDepth, storageHeight].every(Number.isFinite) || storageWidth < 400 || storageWidth > 6000 || storageDepth < 250 || storageDepth > 900 || storageHeight < 400 || storageHeight > 2800);
  const preview = $derived.by(() => {
    if (step === 0 || invalidDimensions) return null;
    const setup:CreationSetup=kind === 'kitchen'
      ? {kind,kitchen:{shape,layout,style,island,islandLengthMm,name:name.trim()||'Cuisine',widthMm:width,depthMm:depth,ceilingMm:ceiling,equipment},appearance}
      : {kind,name:name.trim()||'Meuble',widthMm:storageWidth,depthMm:storageDepth,heightMm:storageHeight,color:storageFinish(appearance.carcass).color,columns,appearance};
    try {
      return {project:createCreationProject(setup),required:null};
    } catch(error) {
      if(error instanceof KitchenRoomFitError)return {project:createCreationProject(setup,{preview:true}),required:error.required};
      return null;
    }
  });

  function chooseKind(value: CreationKind) {
    if(value === 'kitchen') appearance = { ...defaultStorageAppearance(), carcass:'white', facades:'oak', top:'white' };
    kind = value; name = value === 'kitchen' ? 'Ma cuisine' : value === 'dressing' ? 'Mon dressing' : 'Mon meuble';
    if (value === 'furniture') { storageWidth = 1800; storageHeight = 900; storageDepth = 400; columns = [{ type: 'shelves', count: 2, doors: true }, { type: 'drawers', count: 3, doors: false }, { type: 'shelves', count: 2, doors: true }]; }
    else if (value === 'dressing') { storageWidth = 2400; storageHeight = 2200; storageDepth = 600; columns = [{ type: 'hanging', count: 1, doors: false }, { type: 'shelves', count: 4, doors: false }, { type: 'drawers', count: 3, doors: false }]; }
    if(value!=='kitchen')applyStoragePreset(value==='dressing'?'dressing-classic':'furniture-low');
    step = 1; submitError = '';
  }
  function resizeColumns(count: number) {
    if (!Number.isInteger(count) || count < 1 || count > 8) return;
    columns = Array.from({ length: count }, (_, index) => columns[index] ?? { type: 'shelves', count: 3, doors: false });
  }
  function changeColumn(index: number, type: StorageColumn['type']) {
    columns = columns.map((column, i) => i === index ? { type, count: type === 'hanging' ? 1 : 3, doors: type === 'drawers' ? false : column.doors } : column);
  }
  async function finish(event: SubmitEvent) {
    event.preventDefault(); submitError = '';
    if (invalidDimensions || !name.trim()) { submitError = 'Vérifiez les dimensions et le nom du projet.'; return; }
    saving = true;
    try {
      const setup: CreationSetup = kind === 'kitchen'
        ? { kind, kitchen: { shape, layout, style, island, islandLengthMm, name: name.trim(), widthMm: width, depthMm: depth, ceilingMm: ceiling, equipment: structuredClone($state.snapshot(equipment)) }, appearance: { ...appearance } }
        : { kind, name: name.trim(), widthMm: storageWidth, depthMm: storageDepth, heightMm: storageHeight, color: storageFinish(appearance.carcass).color, columns: columns.map(column => ({ ...column })), appearance: { ...appearance } };
      if (setup.kind !== 'kitchen') validateStorageSetup(setup);
      await onCreate(setup);
    } catch (cause) { submitError = cause instanceof Error ? cause.message : 'Impossible de créer le projet.'; }
    finally { saving = false; }
  }
</script>

<svelte:head><title>{$branding.companyName} · Création — Cuisine, dressing et meubles sur mesure</title></svelte:head>
<div class="creation-screen">
  <main class="creation-card">
    <header>
      <a class="creation-brand" href={$branding.logoLink}><span class="logo-window" class:custom={$branding.logoUrl !== "/branding/csm-taksit-logo.png"}><img src={$branding.logoUrl} alt={$branding.companyName} /></span><span>{$branding.companyName} · Création<small>{$ui("CUISINES · DRESSINGS · MEUBLES")}</small></span></a>
      <div class="welcome-language"><LanguageSwitcher /></div>
      <a href={$branding.shopLink} class="shop-link">{$ui("← Retour à la boutique")}</a>
      <p class="eyebrow">{$branding.companyName} · {$ui("Création sur mesure")}</p>
      <h1>{$ui(step === 0 ? 'Votre espace, vos idées.' : creationLabels[kind])}</h1>
      <p class="intro">{$ui(step === 0 ? 'Imaginez votre cuisine, votre dressing ou votre meuble. Donnez forme à votre projet et partagez-le avec notre équipe.' : 'Préparez votre projet, puis ajustez-le dans le planificateur 2D et 3D.')}</p>
    </header>
    {#if step === 0}
      <div class="kind-grid">
        {#each kinds as item}
          <button class="kind-card" onclick={() => chooseKind(item.id)}>
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d={item.icon} fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <strong>{$ui(item.title)}</strong><span>{$ui(item.description)}</span><span class="start">{$ui("Commencer →")}</span>
          </button>
        {/each}
      </div>
      <p class="notice">{$ui("Commencez librement. Vos coordonnées vous seront demandées uniquement si vous souhaitez envoyer votre projet à notre équipe.")}</p>
      <button class="secondary" onclick={onDismiss}>{$ui("Voir mes projets enregistrés")}</button>
    {:else}
      <nav aria-label="Étapes de création"><ol>{#each steps as label, index}<li aria-current={step === index + 1 ? 'step' : undefined}>{index + 1}. {$ui(label)}</li>{/each}</ol></nav>
      <div class="setup-layout">
      <form onsubmit={finish}>
        {#if step === 1}
          <h2>{$ui(kind === 'kitchen' ? 'Décrivez votre pièce' : 'Définissez les dimensions extérieures')}</h2>
          {#if kind === 'kitchen'}
            <div class="choices">{#each shapes as item}<button type="button" class:chosen={shape === item.id} aria-pressed={shape === item.id} onclick={() => shape = item.id}>{$ui(item.label)}</button>{/each}</div>
            <div class="fields"><label>{$ui("Largeur de la pièce (cm)")}<input type="number" min="200" max="1200" step="1" bind:value={() => (width) / 10, value => width = value == null ? NaN : value * 10} /></label><label>{$ui("Profondeur de la pièce (cm)")}<input type="number" min="200" max="1200" step="1" bind:value={() => (depth) / 10, value => depth = value == null ? NaN : value * 10} /></label><label>{$ui("Hauteur sous plafond (cm)")}<input type="number" min="200" max="400" step="1" bind:value={() => (ceiling) / 10, value => ceiling = value == null ? NaN : value * 10} /></label></div>
          {:else}
            <div class="preset-grid" aria-label={$ui("Modèles de départ")}>{#each storagePresets.filter(preset=>preset.setup.kind===kind) as preset}<button type="button" class:chosen={presetId===preset.id} aria-pressed={presetId===preset.id} onclick={()=>applyStoragePreset(preset.id)}><strong>{$ui(preset.title)}</strong><span>{$ui(preset.description)}</span></button>{/each}</div>
            <div class="fields"><label>{$ui("Largeur totale (cm)")}<input type="number" min="40" max="600" step="1" bind:value={() => (storageWidth) / 10, value => storageWidth = value == null ? NaN : value * 10} /></label><label>{$ui("Profondeur (cm)")}<input type="number" min="25" max="90" step="1" bind:value={() => (storageDepth) / 10, value => storageDepth = value == null ? NaN : value * 10} /></label><label>{$ui("Hauteur (cm)")}<input type="number" min="40" max="280" step="1" bind:value={() => (storageHeight) / 10, value => storageHeight = value == null ? NaN : value * 10} /></label></div>
            <p class="help">{$ui("Les colonnes ont la même largeur. Pour une penderie, prévoyez au moins 55 cm de profondeur et 120 cm de hauteur.")}</p>
          {/if}
          {#if invalidDimensions}<p role="alert" class="error">{$ui("Complétez les trois dimensions dans les limites indiquées.")}</p>{/if}
        {:else if step === 2}
          <h2>{$ui(kind === 'kitchen' ? 'Choisissez une implantation' : 'Composez vos rangements')}</h2>
          {#if kind === 'kitchen'}
            <div class="choices">{#each layouts as item}<button type="button" class:chosen={layout === item.id} aria-pressed={layout === item.id} onclick={() => layout = item.id}>{$ui(item.label)}</button>{/each}</div>
            <fieldset class="island-choice"><legend>{$ui('Îlot central')}</legend><div class="choices"><button type="button" class:chosen={!island} aria-pressed={!island} onclick={()=>island=false}>{$ui('Sans îlot')}</button><button type="button" class:chosen={island} aria-pressed={island} onclick={()=>island=true}>{$ui('Avec îlot')}</button></div>{#if island}<label>{$ui('Longueur de l’îlot (cm)')}<input type="number" min="90" max="500" step="1" bind:value={() => (islandLengthMm) / 10, value => islandLengthMm = value == null ? NaN : value * 10} /></label><p class="help">{$ui('Prévoyez de la place pour circuler autour de l’îlot. Les dimensions de la pièce doivent être adaptées.')}</p>{/if}</fieldset>
            <KitchenEquipmentFields bind:equipment {layout} />
            <p class="help">{$ui("L’implantation crée un point de départ à ajuster aux mesures et aux contraintes de votre pièce.")}</p>
          {:else}
            <label>{$ui("Nombre de colonnes")}<select value={columns.length} onchange={event => resizeColumns(Number(event.currentTarget.value))}>{#each [1,2,3,4,5,6,7,8] as n}<option value={n}>{n}</option>{/each}</select></label>
            <p class="help">{$ui("Largeur par colonne :")} {Math.round(storageWidth / columns.length / 10)} cm.</p>
            <div class="column-grid">{#each columns as column, index}<fieldset><legend>{$ui("Colonne")} {index + 1}</legend>
              <label>{$ui("Rangement")}<select value={column.type} onchange={event => changeColumn(index, event.currentTarget.value as StorageColumn['type'])}><option value="shelves">{$ui("Étagères")}</option><option value="hanging">{$ui("Penderie")}</option><option value="drawers">{$ui("Tiroirs")}</option></select></label>
              {#if column.type !== 'hanging'}<label>{$ui("Nombre")} {$ui(column.type === 'shelves' ? 'd’étagères' : 'de tiroirs')}<select bind:value={column.count}>{#each [1,2,3,4,5,6] as n}<option value={n}>{n}</option>{/each}</select></label>{/if}
              {#if column.type !== 'drawers'}<label class="check"><input type="checkbox" bind:checked={column.doors} /> {$ui("Ajouter des portes battantes")}</label>{/if}
            </fieldset>{/each}</div>
            <p class="help">{$ui("Les portes fermées masquent l’intérieur dans la vue 3D. L’aménagement reste décrit dans votre dossier.")}</p>
          {/if}
        {:else if step === 3}
          <h2>{$ui("Choisissez votre ambiance")}</h2>
          <StorageFinishFields bind:appearance section="finishes" />
          <p class="help">{$ui("Les teintes et veinages sont indicatifs. Les matériaux et finitions seront confirmés avec notre équipe.")}</p>
          <label class="project-name">{$ui("Nom du projet")}<input bind:value={name} maxlength="80" required /></label>
        {:else}
          <h2>{$ui("Complétez votre meuble")}</h2>
          <StorageFinishFields bind:appearance section="options" />
        {/if}
        {#if submitError || error}<p role="alert" class="error">{submitError || error}</p>{/if}
        <footer><button type="button" class="secondary" disabled={saving || busy} onclick={() => { step--; submitError = ''; }}>← {$ui(step === 1 ? 'Changer de projet' : 'Précédent')}</button>
          {#if step < 4}<button type="button" class="primary" disabled={invalidDimensions || (step === 3 && !name.trim())} onclick={() => step++}>{$ui("Continuer →")}</button>{:else}<button type="submit" class="primary" disabled={saving || busy || !name.trim()}>{$ui(saving || busy ? 'Création…' : 'Ouvrir mon projet →')}</button>{/if}
        </footer>
      </form>
      <CreationPreview project={preview?.project??null} {kind} required={preview?.required??null} onFit={()=>{const required=preview?.required;if(required){width=Math.max(width,required.widthMm);depth=Math.max(depth,required.depthMm);ceiling=Math.max(ceiling,required.heightMm);}}} />
      </div>
    {/if}
    <p class="disclaimer">{$ui("Dessin indicatif. Les dimensions, la faisabilité et le devis sont confirmés avec CSM Taksit avant fabrication.").replace("CSM Taksit", $branding.companyName)}</p>
  </main>
</div>

<style>
  .logo-window.custom img{width:100%;height:100%;object-fit:contain;max-width:100%}

  .island-choice{margin-top:20px}.island-choice>label{margin-top:16px}

  .setup-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:28px;align-items:start}.setup-layout form{min-width:0}.setup-layout .fields,.setup-layout .column-grid{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}@media(max-width:850px){.setup-layout{grid-template-columns:minmax(0,1fr)}}
  .welcome-language{display:flex;justify-content:flex-end;margin:12px 0 20px}
  .creation-screen{position:relative;z-index:10;min-height:100vh;background:#f4f5f9;padding:32px 20px;color:#1e2447;font-family:inherit}
  .creation-card{max-width:1050px;margin:auto;background:#ffffff;border:1px solid #dce0eb;border-radius:24px;padding:36px}
  .creation-brand{display:flex;align-items:center;gap:16px;margin-bottom:22px;background:#1e2447;color:white;border-radius:12px;padding:8px 16px;font-size:24px}.creation-brand small{display:block;font-size:9px;letter-spacing:.15em;margin-top:5px;color:#c5cce0}.logo-window{display:block;width:92px;height:72px;overflow:hidden;flex-shrink:0}.logo-window img{height:72px;width:auto;max-width:none}header{max-width:none}.shop-link{font-size:14px;text-decoration:underline;color:#566587}.eyebrow{font-size:12px;letter-spacing:.16em;font-weight:700;margin:36px 0 12px;color:#56627b}
  h1{font-size:clamp(30px,5vw,48px);line-height:1.12;font-weight:700;margin:0 0 18px}h2{font-size:23px;font-weight:650;margin:28px 0 20px}.intro{font-size:17px;line-height:1.7;color:#56627b}
  .kind-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:32px 0}.kind-card{display:flex;flex-direction:column;align-items:flex-start;text-align:left;border:1px solid #dce0eb;border-radius:16px;padding:26px;gap:15px;background:#f3f5fa;transition:background .15s}.kind-card:hover{background:#e7ebf5}.kind-card svg{width:72px;height:72px;color:#1e2447}.kind-card strong{font-size:21px}.kind-card span{color:#56627b;line-height:1.55;font-size:14px}.kind-card .start{color:#1e2447;font-weight:700;margin-top:auto;padding-top:12px}
  .notice,.help,.disclaimer{font-size:13px;color:#56627b;line-height:1.65}.notice{margin-bottom:20px}.disclaimer{margin-top:32px;padding-top:20px;border-top:1px solid #dce0eb}
  nav ol{display:flex;gap:10px;list-style:none;padding:0;margin:26px 0;flex-wrap:wrap}nav li{padding:10px 16px;background:#e9ecf5;border-radius:8px;font-size:14px}nav li[aria-current]{background:#1e2447;color:white}
  .choices{display:flex;flex-wrap:wrap;gap:12px}.choices button{padding:16px 20px;border:1px solid #d2d8e8;border-radius:12px;background:white;text-align:left}.chosen{outline:2px solid #5266ac;outline-offset:2px;background:#eef1f8!important}
  .fields,.column-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:24px 0}label{display:block;font-size:14px;font-weight:600}input:not([type=checkbox]),select{display:block;width:100%;padding:11px 12px;margin-top:8px;border:1px solid #bdc7df;border-radius:8px;background:#fff;color:#1e2447}fieldset{min-width:0;border:1px solid #d2d8e8;padding:16px;border-radius:12px}legend{font-weight:700;padding:0 5px}fieldset label{margin-bottom:15px}.check{display:flex;align-items:flex-start;gap:8px;font-weight:400}.check input{margin-top:4px}.project-name{max-width:520px;margin-top:26px}
  .preset-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:20px 0}.preset-grid button{border:1px solid #d4dbea;border-radius:10px;padding:16px;background:#fff;text-align:left}.preset-grid strong{display:block;font-size:14px}.preset-grid span{display:block;font-size:12px;color:#56627b;line-height:1.5;margin-top:6px}
  footer{display:flex;justify-content:space-between;gap:12px;margin-top:32px}.primary,.secondary{padding:12px 18px;border-radius:9px;font-weight:650}.primary{background:#1e2447;color:#fff}.secondary{border:1px solid #cbd2e3;color:#1e2447;background:transparent}.error{padding:14px;background:#fff0ec;color:#9b3226;border-radius:8px;margin-top:20px}button{cursor:pointer}button:disabled{opacity:.45;cursor:default}:global(.creation-screen :focus-visible){outline:3px solid #b16e26;outline-offset:4px}
  @media(max-width:760px){.creation-card{padding:24px 18px}.kind-grid{grid-template-columns:1fr}.kind-card{padding:20px}.kind-card svg{width:48px;height:48px}.fields,.column-grid{grid-template-columns:1fr}.creation-screen{padding:14px 10px}.eyebrow{margin-top:24px}footer{flex-wrap:wrap}.primary,.secondary{min-height:44px}}
</style>
