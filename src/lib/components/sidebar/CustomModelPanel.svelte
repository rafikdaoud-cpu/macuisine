<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { currentProject, commitItemDetails, canvasCamX, canvasCamY, selectedElementId, selectedElementIds, selectedTool } from '$lib/stores/project';
  import { getSnapshots } from '$lib/stores/versionHistory';
  import { placeCustomModel } from '$lib/services/customModels';
  import type { PreparedCustomModel } from '$lib/services/customModelImport';

  type SharedModel = { id: string; name: string; sourceFilename: string; sha256: string; byteLength: number; width: number; depth: number; height: number };
  let models = $state<SharedModel[]>([]);
  let loading = $state(false), addingId = $state<string | null>(null), error = $state(''), status = $state('');
  let lifetime: AbortController | undefined;
  onMount(() => { void load(); });
  onDestroy(() => lifetime?.abort());

  async function load() {
    lifetime?.abort(); lifetime = new AbortController(); loading = true; error = '';
    try {
      const response = await fetch('/api/models.php', { cache: 'no-store', signal: lifetime.signal });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Le catalogue de modèles est indisponible.');
      models = Array.isArray(payload.items) ? payload.items : [];
    } catch (e) { if (!lifetime.signal.aborted) error = e instanceof Error ? e.message : 'Chargement impossible.'; }
    finally { if (!lifetime.signal.aborted) loading = false; }
  }

  function place(id: string) {
    const project = get(currentProject); if (!project) return;
    try {
      const next = placeCustomModel(project, id, { x: get(canvasCamX), y: get(canvasCamY) });
      const floor = next.floors.find(f => f.id === next.activeFloorId)!;
      const item = floor.furniture.at(-1)!;
      commitItemDetails(project, next, 'Placed shared model');
      selectedTool.set('select'); selectedElementId.set(item.id); selectedElementIds.set(new Set());
      status = 'Modèle placé dans le plan.'; error = '';
    } catch (e) { error = e instanceof Error ? e.message : 'Placement impossible.'; }
  }

  async function addToProject(model: SharedModel) {
    const project = get(currentProject); if (!project || addingId) return;
    addingId = model.id; error = ''; status = '';
    let prepared: PreparedCustomModel | undefined;
    try {
      const response = await fetch('/api/models.php?id=' + encodeURIComponent(model.id), { cache: 'no-store' });
      if (!response.ok) throw new Error('Téléchargement du modèle impossible.');
      const blob = await response.blob();
      const file = new File([blob], model.sourceFilename || model.id + '.glb', { type: 'model/gltf-binary' });
      const { prepareCustomModel } = await import('$lib/services/customModelImport');
      prepared = await prepareCustomModel(file);
      const { attachCustomModel } = await import('$lib/services/customModelImport');
      const history = await getSnapshots(project.id);
      const attached = attachCustomModel(project, prepared, { name: model.name }, history);
      let next = attached.project;
      const definition = next.customModels?.find(entry => entry.sha256 === model.sha256);
      if (!definition) throw new Error('Le modèle n’a pas été ajouté au projet.');
      definition.name = model.name;
      next = placeCustomModel(next, definition.id, { x: get(canvasCamX), y: get(canvasCamY) });
      const floor = next.floors.find(f => f.id === next.activeFloorId)!;
      const item = floor.furniture.at(-1)!;
      commitItemDetails(project, next, 'Added shared model to project');
      selectedTool.set('select'); selectedElementId.set(item.id); selectedElementIds.set(new Set());
      status = 'Modèle ajouté au projet et placé dans le plan.';
    } catch (e) { error = e instanceof Error ? e.message : 'Ajout au projet impossible.'; }
    finally { prepared?.dispose(); addingId = null; }
  }


</script>
<section class="space-y-2 rounded-lg border border-gray-200 p-2" aria-label="Catalogue partagé des modèles 3D">
  <h3 class="text-sm font-semibold">Modèles 3D du catalogue</h3>
  <p class="text-xs text-gray-500">Les modèles sont publiés par l’administrateur.</p>
  {#if loading}<p role="status" class="text-xs text-gray-500">Chargement du catalogue…</p>{/if}
  {#if error}<p role="alert" class="text-xs text-red-700">{error}</p>{/if}
  {#each models as model (model.id)}
    <article class="rounded border border-gray-200 p-2 text-xs">
      <strong class="break-words">{model.name}</strong>
      <p>{model.width.toFixed(1)} × {model.depth.toFixed(1)} × {model.height.toFixed(1)} cm</p>
      {#if $currentProject?.customModels?.some(own => own.sha256 === model.sha256)}
        <button class="mt-1 text-blue-700 underline" onclick={() => place($currentProject!.customModels!.find(own => own.sha256 === model.sha256)!.id)}>Placer</button>
      {:else}
        <button class="mt-1 text-blue-700 underline disabled:opacity-50" disabled={!!addingId || !$currentProject} onclick={() => addToProject(model)}>{addingId === model.id ? 'Ajout…' : 'Ajouter au projet'}</button>
      {/if}
    </article>
  {:else}{#if !loading}<p class="text-xs text-gray-500">Aucun modèle publié.</p>{/if}{/each}
  {#if status}<p role="status" class="text-xs text-teal-700">{status}</p>{/if}
</section>
