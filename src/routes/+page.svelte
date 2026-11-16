<script lang="ts">
  import { branding } from "$lib/stores/branding";
  import { ui } from '$lib/i18n';
  import { t, locale, translate, type Locale } from '$lib/i18n';
  import { projectServiceMessage } from '$lib/i18n/projectServiceMessages';
  import { modalDialog, reconcileNativeClose } from '$lib/utils/modalDialog';
  import { onMount, onDestroy, tick } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { localStore, storageErrorMessage, downloadLibraryBackup } from '$lib/services/datastore';
  import { openProject } from '$lib/services/projectOpening';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import WelcomeScreen from '$lib/components/WelcomeScreen.svelte';
  import ProjectPreview from '$lib/components/ProjectPreview.svelte';
  import type { Project } from '$lib/models/types';
  import LibraryRestoreDialog from '$lib/components/LibraryRestoreDialog.svelte';
  import LibraryStorageNote from '$lib/components/LibraryStorageNote.svelte';
  import ProjectActionsMenu from '$lib/components/ProjectActionsMenu.svelte';
  import { createCreationProject, type CreationSetup } from '$lib/utils/creationWorkflow';

  const openingLifetime = new AbortController();
  onDestroy(() => openingLifetime.abort());


  let projects = $state<{ id: string; name: string; updatedAt: string }[]>([]);
  let thumbnails = $state<Record<string, string | null>>({});
  let previews = $state.raw<Record<string, Project | null>>({});
  let projectFilter = $state('all');
  function projectKind(id: string, name: string) { return previews[id]?.creationKind ?? (/cuisine/i.test(name) ? 'kitchen' : /dressing/i.test(name) ? 'dressing' : 'furniture'); }
  const filteredProjects = $derived(projects.filter(item => projectFilter === 'all' || projectKind(item.id,item.name) === projectFilter));
  let showWelcome = $state(false);
  let restoreOpen = $state(false);
  let restoreFile = $state.raw<File | null>(null);
  let loading = $state(true);
  let actionDialog = $state<{ type: 'rename' | 'delete'; id: string; name: string } | null>(null);
  let renameValue = $state('');
  let actionError = $state<string | null>(null);
  let actionBusy = $state(false);
  let duplicating = $state(false);
  let newProjectButton = $state<HTMLButtonElement>();
  let kitchenBusy = $state(false);

  let libraryError = $state<string | null>(null);

  async function withLibraryError(action: () => Promise<void>) {
    try { await action(); libraryError = null; }
    catch (error) { libraryError = storageErrorMessage(error); }
  }

  async function backupLibrary() {
    try { await downloadLibraryBackup(); }
    catch (error) { libraryError = storageErrorMessage(error); }
  }


  async function refreshProjects() {
    loading = true;
    try {
      projects = await localStore.list();
      projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      thumbnails = await localStore.getThumbnails();
      const loaded = await Promise.allSettled(projects.map(item => localStore.load(item.id)));
      previews = Object.fromEntries(projects.map((item,index) => [item.id, loaded[index].status === 'fulfilled' ? loaded[index].value : null]));
    } finally { loading = false; }
  }

  /** `file` is a library backup the welcome's Import a Plan was given. */
  function openRestore(file?: File) { showWelcome = false; restoreFile = file ?? null; restoreOpen = true; }
  async function afterRestore() {
    await refreshProjects();
    libraryError = null;
  }

  onMount(() => {
    void withLibraryError(async () => {
      await refreshProjects();
      if (projects.length === 0) {
        showWelcome = true;
      }
    });
  });

  async function createProject(create: () => unknown) {
    await withLibraryError(async () => {
      const project = await openProject(create, 'new', openingLifetime.signal);
      if (!project) return;
      goto(`${base}/editor?id=${encodeURIComponent(project.id)}`);
    });
  }

  async function createKitchen(setup: CreationSetup) {
    kitchenBusy = true;
    await createProject(() => createCreationProject(setup));
    kitchenBusy = false;
  }
  function newProject() { showWelcome = true; }

  /** The last copy Duplicate made: named in a status line and outlined in the list. */
  let duplicatedId = $state<string | null>(null);
  let duplicateStatus = $state<HTMLElement>(), libraryAlert = $state<HTMLElement>();

  async function duplicateProject(id: string) {
    if (duplicating) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    duplicating = true; duplicatedId = null;
    let copyId: string | null = null;
    await withLibraryError(async () => {
      const dup = await localStore.duplicate(id);
      if (!dup) throw new Error($t('library.gone'));
      copyId = dup.id;
    });
    // Refresh errors must not turn a completed copy into a retryable mutation.
    if (!libraryError) await withLibraryError(refreshProjects);
    duplicating = false; duplicatedId = copyId;
    await tick();
    if (document.activeElement === document.body && previous?.isConnected) previous.focus();
    // The copy is listed first, often above the card that was used: show the outcome there.
    (libraryError ? libraryAlert : duplicateStatus)?.scrollIntoView?.({ block: 'nearest' });
  }

  function openAction(type: 'rename' | 'delete', project: { id: string; name: string }) {
    actionDialog = { type, id: project.id, name: project.name || 'Untitled Project' };
    renameValue = project.name;
    actionError = null;
  }
  function closeAction() { if (!actionBusy) actionDialog = null; }
  async function submitAction() {
    const action = actionDialog, name = renameValue.trim();
    if (!action || actionBusy || (action.type === 'rename' && !name)) return;
    actionBusy = true; actionError = null;
    try {
      if (action.type === 'delete') await localStore.delete(action.id);
      else {
        const project = await localStore.load(action.id);
        if (!project) throw new Error($t('library.goneAction'));
        project.name = name;
        project.updatedAt = new Date();
        await localStore.save(project);
      }
    } catch (error) {
      actionError = storageErrorMessage(error);
      actionBusy = false;
      return;
    }
    actionBusy = false;
    actionDialog = null;
    // Close only after the transaction commits, then refresh separately so a
    // failed list read cannot repeat a successful rename or delete.
    await withLibraryError(refreshProjects);
    await tick();
    if (action.type === 'delete' && document.activeElement === document.body) newProjectButton?.focus();
  }

  function formatDate(d: string, language: Locale) {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return translate(language, 'library.justNow');
    if (diffMin < 60) return translate(language, 'library.minutes', { count: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return translate(language, 'library.hours', { count: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return translate(language, 'library.days', { count: diffDay });
    return date.toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'fr' ? 'fr-FR' : 'en');
  }
</script>

<svelte:head><title>{$branding.companyName} · Création — Mes projets</title><meta name="description" content={"Concevez votre cuisine, votre dressing et vos meubles sur mesure avec " + $branding.companyName + "."} /></svelte:head>

{#if showWelcome}
  <WelcomeScreen onCreate={createKitchen} busy={kitchenBusy} error={libraryError} onDismiss={() => { showWelcome = false; void withLibraryError(refreshProjects); }} />
{/if}

{#if restoreOpen}<LibraryRestoreDialog file={restoreFile} onclose={() => restoreOpen = false} onrestored={afterRestore} />{/if}

{#if !showWelcome}
<div class="library-shell min-h-screen">
  <header class="library-header">
    <a class="library-brand" href={$branding.logoLink}><span class="logo-window" class:custom={$branding.logoUrl !== "/branding/csm-taksit-logo.png"}><img src={$branding.logoUrl} alt={$branding.companyName} /></span><span><strong>{$branding.companyName} · Création</strong><small>{$ui("CUISINES · DRESSINGS · MEUBLES")}</small></span></a>
    <div class="header-right"><a href={$branding.shopLink}>{$ui("← La boutique")}</a><LanguageSwitcher inverse /></div>
  </header>
  <div class="library-title"><div><p class="library-eyebrow">{$ui("MON ATELIER")}</p><h1>{$ui("Mes projets")}</h1><p>{$ui("Vos idées prennent forme. Reprenez un projet ou imaginez le prochain.")}</p></div><button bind:this={newProjectButton} class="new-project" onclick={newProject} aria-label={$ui("Nouveau projet")}><span aria-hidden="true">＋</span> {$ui("Créer un projet")}</button></div>
  <div class="library-navigation"><div class="library-filters">{#each [{id:'all',label:'Tous mes projets'},{id:'kitchen',label:'Cuisines'},{id:'dressing',label:'Dressings'},{id:'furniture',label:'Meubles'}] as filter}<button class:active={projectFilter === filter.id} aria-pressed={projectFilter === filter.id} onclick={() => projectFilter = filter.id}>{$ui(filter.label)}</button>{/each}</div><details class="library-backup"><summary>{$ui("Sauvegardes")}</summary><div>{#if !libraryError}<button onclick={backupLibrary}>{$ui("Télécharger une sauvegarde")}</button>{/if}<button onclick={() => openRestore()}>{$ui("Restaurer une sauvegarde")}</button></div></details></div>

  <main class="library-main">
    {#if duplicating}<p role="status" class="mb-4 text-sm text-gray-500">{$t('library.duplicating')}</p>
    {:else}
      {@const copy = projects.find(project => project.id === duplicatedId)}
      {#if copy}<p role="status" bind:this={duplicateStatus} class="mb-4 text-sm text-gray-600">{$t('library.duplicated', { name: copy.name || $t('library.untitled') })}</p>{/if}
    {/if}
    <LibraryStorageNote active={projects.length > 0 && !libraryError} />
    {#if libraryError}
      <div role="alert" bind:this={libraryAlert} class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p>{projectServiceMessage(libraryError, $locale)}</p>
        <div class="mt-3 flex gap-4">
          <button class="font-semibold underline" onclick={() => withLibraryError(refreshProjects)}>{$t('library.retry')}</button>
          <button class="font-semibold underline" onclick={backupLibrary}>{$t('library.backup')}</button>
        </div>
      </div>
    {/if}
    {#if loading && projects.length === 0}
      <p role="status" class="py-12 text-center text-gray-500">{$t('library.loadingSaved')}</p>
    {:else if projects.length === 0 && !libraryError}
      <div class="text-center py-24">
        <div class="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        </div>
        <p class="text-lg text-gray-400 font-medium">{$t('library.empty')}</p>
        <p class="text-sm text-gray-300 mt-1">{$t('library.emptyHelp')}</p>
        <div class="mt-6 flex items-center gap-3 justify-center">
          <button onclick={newProject} class="px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold text-sm">
            {$t('library.create')}
          </button>
          <button onclick={() => showWelcome = true} class="px-5 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-100 font-semibold text-sm border border-gray-200">
            {$t('library.fromTemplate')}
          </button>
        </div>
      </div>
    {:else}
      {#if filteredProjects.length === 0}<p class="filter-empty">{$ui("Aucun projet dans cette catégorie pour le moment.")}</p>{/if}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {#each filteredProjects as project (project.id)}
          <div class="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 relative {project.id === duplicatedId ? 'ring-2 ring-blue-400' : ''}">
            <!-- Thumbnail -->
            <a href={`${base}/editor?id=${encodeURIComponent(project.id)}`} aria-label={$t('library.openName', { name: project.name || $t('library.untitled') })} class="block">
              <div class="project-picture relative overflow-hidden">
                {#if previews[project.id]}
                  <ProjectPreview project={previews[project.id]!} />
                {:else if Object.hasOwn(thumbnails, project.id) && thumbnails[project.id]}
                  <img src={thumbnails[project.id]} alt="" class="w-full h-full object-contain" />
                {:else}
                  {#if previews[project.id]}<ProjectPreview project={previews[project.id]!} />{:else}<div class="preview-fallback"><span>{$branding.companyName} · Création</span><strong>{$ui(projectKind(project.id,project.name) === 'kitchen' ? 'Cuisine' : projectKind(project.id,project.name) === 'dressing' ? 'Dressing' : 'Meuble sur mesure')}</strong><small>{$ui("Aperçu disponible après ouverture")}</small></div>{/if}
                {/if}
              </div>
            </a>

            <!-- Info -->
            <div class="p-4">
              <a href={`${base}/editor?id=${encodeURIComponent(project.id)}`} class="block">
                <h3 class="font-semibold text-gray-800 text-sm truncate">{project.name || $t('library.untitled')}</h3>
              </a>
              <p class="project-date">{formatDate(project.updatedAt, $locale)}</p>
              <a class="resume-project" href={`${base}/editor?id=${encodeURIComponent(project.id)}`}>{$ui("Reprendre mon projet")} <span aria-hidden="true">↗</span></a>
            </div>

            <ProjectActionsMenu name={project.name} disabled={duplicating}
              onaction={(action) => {
                if (action === 'open') goto(`${base}/editor?id=${encodeURIComponent(project.id)}`);
                else if (action === 'duplicate') void duplicateProject(project.id);
                else openAction(action, project);
              }} />
          </div>
        {/each}
      </div>
    {/if}
  </main>

  {#if actionDialog}
    <dialog use:modalDialog aria-labelledby="library-action-title" aria-describedby="library-action-description"
      oncancel={(event) => { event.preventDefault(); closeAction(); }}
      onclose={(event) => reconcileNativeClose(event, actionBusy, closeAction)}
      class="m-auto w-[28rem] max-w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 text-gray-800 shadow-2xl backdrop:bg-black/50">
      <form onsubmit={(event) => { event.preventDefault(); void submitAction(); }}>
        <h2 id="library-action-title" class="text-lg font-semibold">{actionDialog.type === 'rename' ? $t('library.renameTitle') : $t('library.deleteTitle')}</h2>
        <p id="library-action-description" class="mt-2 break-words text-sm text-gray-500">
          {#if actionDialog.type === 'rename'}{$t('library.renameHelp', { name: actionDialog.name })}
          {:else}{$t('library.deleteHelp', { name: actionDialog.name })}{/if}
        </p>
        {#if actionDialog.type === 'rename'}
          <label for="library-project-name" class="mt-4 block text-sm font-medium">{$t('library.name')}</label>
          <input id="library-project-name" type="text" bind:value={renameValue} disabled={actionBusy} required
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-blue-500" />
        {/if}
        {#if actionError}<p role="alert" class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{projectServiceMessage(actionError, $locale)}</p>{/if}
        {#if actionBusy}<p role="status" class="mt-4 text-sm text-gray-500">{actionDialog.type === 'rename' ? $t('library.saving') : $t('library.deleting')}</p>{/if}
        <div class="mt-5 flex justify-end gap-3">
          <button type="button" onclick={closeAction} disabled={actionBusy} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40">{$t('library.cancel')}</button>
          <button type="submit" disabled={actionBusy || (actionDialog.type === 'rename' && !renameValue.trim())}
            class="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 {actionDialog.type === 'rename' ? 'bg-blue-600' : 'bg-red-600'}">
            {actionDialog.type === 'rename' ? $t('library.saveName') : $t('library.deleteTitle')}
          </button>
        </div>
      </form>
    </dialog>
  {/if}


</div>

{/if}

<style>
  .logo-window.custom img{width:100%;height:100%;object-fit:contain;max-width:100%}

  .library-shell{--ink:#1e2447;--muted:#687087;background:#f4f5f9;color:var(--ink);padding-bottom:40px;font-family:inherit}.library-header{flex-wrap:wrap;max-width:none;margin:0;padding:14px max(28px,calc((100vw - 1184px)/2));background:#1e2447;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #dce0eb}.library-brand{display:flex;align-items:center;gap:12px;text-decoration:none;font-size:21px;line-height:1.2}.library-brand strong{font-weight:500}.logo-window{display:block;width:92px;height:72px;overflow:hidden;flex-shrink:0}.logo-window img{height:72px;width:auto;max-width:none}.library-brand small{display:block;font-size:8px;letter-spacing:.18em;margin-top:6px;color:#b6bfd6}.header-right{display:flex;gap:24px;align-items:center;font-size:13px}.header-right a{color:#ffffff}.library-title{max-width:1240px;margin:auto;padding:42px 28px 28px;display:flex;justify-content:space-between;align-items:center;gap:24px}.library-eyebrow{font-size:10px;letter-spacing:.18em;color:#58648a;font-weight:700;margin-bottom:8px}.library-title h1{font-size:38px;line-height:1.15;font-weight:650;letter-spacing:-.03em}.library-title p:last-child{margin-top:12px;font-size:14px;color:var(--muted)}.new-project{display:flex;gap:10px;align-items:center;padding:13px 21px;border-radius:9px;background:#1e2447;color:#fff;font-size:14px;font-weight:600;white-space:nowrap;min-height:46px}.new-project span{font-size:22px;line-height:1}.library-navigation{max-width:1240px;padding:0 28px;display:flex;justify-content:space-between;gap:20px;align-items:center;margin:0 auto 12px}.library-filters{display:flex;flex-wrap:wrap;gap:5px}.library-filters button{font-size:13px;padding:10px 16px;border-radius:7px;color:#5d6680;min-height:40px}.library-filters button.active{background:#e5e8f2;color:#1e2447;font-weight:650}.library-backup{position:relative;font-size:12px;color:#56627d}.library-backup summary{cursor:pointer;min-height:40px;display:flex;align-items:center}.library-backup>div{position:absolute;right:0;top:100%;z-index:10;min-width:230px;padding:8px;background:white;border:1px solid #d9deec;border-radius:10px;box-shadow:0 12px 28px #26382c15}.library-backup button{display:block;width:100%;text-align:left;padding:11px 12px;border-radius:6px}.library-backup button:hover{background:#edf0f7}.library-main{max-width:1240px;margin:auto;padding:12px 28px 40px}.project-picture{aspect-ratio:16/10;background:linear-gradient(145deg,#eff1f7,#e5e9f2);border-bottom:1px solid #dce0eb}.project-picture img{padding:18px;mix-blend-mode:multiply}.project-date{font-size:11px;color:#6a748c;margin-top:6px}.resume-project{display:flex;align-items:center;justify-content:space-between;color:#1e2447;font-size:12px;font-weight:650;padding-top:18px;margin-top:14px;border-top:1px solid #e5e8f0}.preview-fallback{height:100%;display:flex;flex-direction:column;justify-content:center;padding:30px;gap:12px}.preview-fallback span{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#68738d}.preview-fallback strong{font-size:24px;font-weight:500}.preview-fallback small{font-size:11px;color:#68738d}.filter-empty{padding:32px 0;color:#68738d;font-size:14px}:global(.library-shell .group){border-color:#dce0eb;border-radius:14px;box-shadow:0 4px 10px #52613b04;transition:box-shadow .18s,transform .18s}:global(.library-shell .group:hover){box-shadow:0 14px 28px #49593712;transform:translateY(-2px)}:global(.library-shell :focus-visible){outline:3px solid #5266ac;outline-offset:3px}button{cursor:pointer}@media(max-width:680px){.library-header{padding:18px}.library-brand{font-size:18px}.header-right{gap:12px}.header-right a{display:none}.library-title{padding:28px 18px 20px;align-items:flex-start;flex-direction:column;gap:18px}.library-title h1{font-size:32px}.library-title p:last-child{line-height:1.55}.library-navigation{padding:0 18px;align-items:flex-start;gap:8px}.library-filters{gap:0}.library-filters button{padding:9px 10px;font-size:12px}.library-main{padding:12px 18px}.library-backup{font-size:11px}.logo-window{width:76px;height:60px}.logo-window img{height:60px}.project-picture{aspect-ratio:16/9}}
  :global(.library-header option){color:#1e2447;background:white}
</style>
