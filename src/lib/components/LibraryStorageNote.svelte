<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '$lib/i18n';
  import { checkStoragePersistence, dismissStorageNote, showStorageNote, storageNoteDismissed, storagePersistence } from '$lib/services/storagePersistence';

  /** True while the library lists saved projects without a storage error. */
  let { active }: { active: boolean } = $props();
  // Hidden until the browser has been checked, so the note never flashes or renders on the server.
  let dismissed = $state(true);

  onMount(() => {
    dismissed = storageNoteDismissed();
    void checkStoragePersistence();
  });

  function dismiss() {
    dismissStorageNote();
    dismissed = true;
  }
</script>

{#if showStorageNote($storagePersistence, dismissed, active)}
  <div role="note" class="mb-5 flex items-center justify-between gap-3 px-1 py-1 text-xs text-slate-600">
    <p class="min-w-0">{$t('library.storageNote', { backup: $t('library.backup') })}</p>
    <button type="button" aria-label={$t('library.storageNoteDismiss')} onclick={dismiss}
      class="shrink-0 rounded px-2 py-2 text-slate-500 hover:bg-stone-200">✕</button>
  </div>
{/if}
