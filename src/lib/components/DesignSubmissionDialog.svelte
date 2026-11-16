<script lang="ts">
  import { branding } from "$lib/stores/branding";
  import { ui } from '$lib/i18n';
  import {tick} from 'svelte';
  import {furnitureFrontView} from '$lib/stores/furnitureFrontView';
  import {projectSheetPNG,projectDetailLines} from '$lib/utils/projectDossier';
  import type { Project } from '$lib/models/types';
  import { locale as localeStore } from '$lib/i18n';
  import { get } from 'svelte/store';
  import { captureMain3DPNG } from '$lib/utils/captureMain3D';
  import { exportAsPNG, exportPDF } from '$lib/utils/export';
  import { exportDWG } from '$lib/utils/cadExport';
  import { viewMode } from '$lib/stores/project';
  import { readProject } from '$lib/utils/projectValidation';
  import { modalDialog, reconcileNativeClose } from '$lib/utils/modalDialog';
  type Props = { project: Project; onClose: () => void };
  let { project, onClose }: Props = $props();
  type PreferredFormat = 'png2d' | 'png3d' | 'pdf' | 'dwg';
  let preferredFormat = $state<PreferredFormat>('pdf');
  let lastName = $state(''), firstName = $state(''), email = $state(''), phone = $state('');
  let mailStatus=$state(''),pngMode=$state('3d');
  let busy = $state(false), sent = $state(false), error = $state('');

  async function submit(event: SubmitEvent) {
    event.preventDefault(); error = '';
    const fr = 'Voulez-vous envoyer votre projet à l’équipe CSM Taksit afin qu’elle vous contacte et valide la conception avec vous ?\n\nLe dossier transmis comprendra un PDF, un plan CAO au format DXF (ouvrable dans AutoCAD), la liste des équipements et une copie modifiable du projet.';
    if (!window.confirm($ui(fr).replaceAll("CSM Taksit", $branding.companyName))) return;
    busy = true; const oldMode = get(viewMode),oldFront=get(furnitureFrontView);
    try {
      const language = get(localeStore);
      const snapshot = $state.snapshot(project);
      viewMode.set('3d');await tick();
      let preview:Blob;
      try{preview=await captureMain3DPNG();pngMode='3d';}
      catch{const fallback=await exportAsPNG(null,snapshot,undefined,false);if(!(fallback instanceof Blob))throw new Error('Aperçu du projet indisponible.');preview=fallback;pngMode='2d';}
      const png=await projectSheetPNG(snapshot,preview,language);
      const pdfResult = await exportPDF(snapshot, language, undefined, false);
      if (!pdfResult?.blob) throw new Error('Le PDF n’a pas pu être créé.');
      const cadResult = exportDWG(snapshot, language, undefined, false);
      if (!(cadResult instanceof Blob)) throw new Error(cadResult === 'unsupported' ? 'Le plan CAO ne peut pas inclure uniquement des images décoratives.' : 'Le plan CAO n’a pas pu être créé.');
      let selected: Blob, selectedName: string;
      if (preferredFormat === 'pdf') { selected = pdfResult.blob; selectedName = 'plan-projet.pdf'; }
      else if (preferredFormat === 'dwg') { selected = cadResult; selectedName = 'plan-projet.dxf'; }
      else if (preferredFormat === 'png2d') {
        const result = await exportAsPNG(null, snapshot, undefined, false);
        if (!(result instanceof Blob)) throw new Error('Le plan 2D PNG n’a pas pu être créé.');
        selected = result; selectedName = 'plan-projet-2d.png';
      } else {
        selected = preview; selectedName = pngMode==='3d'?'plan-projet-3d.png':'plan-projet-2d.png';
      }
      const form = new FormData();
      form.set('lastName', lastName.trim()); form.set('firstName', firstName.trim());
      form.set('email', email.trim()); form.set('phone', phone.trim());
      form.set('projectName', project.name || 'Mon projet'); form.set('preferredFormat', preferredFormat); form.set('consent', 'true');
      form.set('projectKind', project.creationKind ?? 'kitchen');
      form.set('project', new Blob([JSON.stringify(readProject(snapshot))], { type: 'application/json' }), 'projet-modifiable.json');
      form.set('selection', selected, selectedName);
      form.set('pdf', pdfResult.blob, 'plan-projet.pdf');
      form.set('cad', cadResult, 'plan-projet.dxf');
      form.set('png',png,'apercu-projet.png');
      form.set('equipment', new Blob([projectDetailLines(snapshot,language).join('\n')], { type: 'text/plain;charset=utf-8' }), 'equipements-et-dimensions.txt');
      const response = await fetch('/api/designs.php', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.saved !== true) throw new Error(result.error || 'L’envoi du dossier a échoué.');
      mailStatus=result.mail?.status??'not-sent';sent = true;
    } catch (cause) { error = cause instanceof Error ? cause.message : 'Impossible d’envoyer le dossier.'; }
    finally { viewMode.set(oldMode);if(oldMode==='2d')furnitureFrontView.set(oldFront);busy = false; }
  }
</script>

  <dialog use:modalDialog oncancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} onclose={(event) => reconcileNativeClose(event, busy, onClose)} aria-labelledby="design-submit-title" class="m-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-800 shadow-2xl backdrop:bg-slate-950/50">
    {#if sent}
      <h2 id="design-submit-title" class="text-xl font-bold">{$ui("Votre dossier est enregistré")}</h2>
      <p class="mt-3 text-sm">{$ui("Votre demande a été transmise à l’espace privé de l’administration CSM Taksit. L’équipe pourra télécharger les fichiers et vous contacter.").replaceAll("CSM Taksit", $branding.companyName)}</p>

      <p class="mt-3 text-sm" role="status">{$ui(mailStatus==='sent'?'Votre e-mail de remerciement a été accepté par le serveur SMTP, avec le lien du projet et les pièces jointes.':'Votre dossier est enregistré. Le mail de confirmation n’a pas pu être envoyé pour le moment ; notre équipe peut le renvoyer.')}</p>
      <button class="mt-5 rounded-lg bg-teal-700 px-5 py-2.5 font-semibold text-white" onclick={onClose}>{$ui("Fermer")}</button>
    {:else}
      <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-widest text-teal-700">{$branding.companyName}</p><h2 id="design-submit-title" class="mt-1 text-xl font-bold">{$ui("Enregistrer et envoyer votre projet")}</h2></div><button class="rounded p-2 text-slate-500 hover:bg-slate-100" onclick={onClose} disabled={busy} aria-label={$ui("Fermer")}>✕</button></div>
      <p class="mt-3 text-sm">{$ui("Choisissez le format souhaité pour votre aperçu. Après confirmation, vous recevrez un e-mail avec le lien privé de votre projet, le PDF, le plan DXF, un PNG et le détail des éléments et dimensions.")}</p>

      <p class="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{$ui("Le DWG natif n’est pas généré par cette application : le plan CAO est fourni en DXF, lisible dans AutoCAD.")}</p>
      <form class="mt-4 space-y-4" onsubmit={submit}>
        <fieldset><legend class="mb-2 text-sm font-semibold">{$ui("Format de l’aperçu")}</legend><div class="grid grid-cols-2 gap-2">{#each [{id:'png2d',label:'Plan 2D PNG'},{id:'png3d',label:'Vue 3D PNG'},{id:'pdf',label:'Document PDF'},{id:'dwg',label:'DWG (fichier DXF)'}] as item}<label class="flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm {preferredFormat===item.id?'border-teal-700 bg-teal-50':''}"><input type="radio" name="format" value={item.id} bind:group={preferredFormat} />{$ui(item.label)}</label>{/each}</div></fieldset>
        <div class="grid gap-3 sm:grid-cols-2"><label class="text-sm">{$ui("Nom")}<input required maxlength="100" bind:value={lastName} class="mt-1 block w-full rounded border border-slate-300 px-3 py-2" /></label><label class="text-sm">{$ui("Prénom")}<input required maxlength="100" bind:value={firstName} class="mt-1 block w-full rounded border border-slate-300 px-3 py-2" /></label><label class="text-sm">{$ui("E-mail")}<input required type="email" maxlength="254" bind:value={email} class="mt-1 block w-full rounded border border-slate-300 px-3 py-2" /></label><label class="text-sm">{$ui("Téléphone")}<input required type="tel" maxlength="25" bind:value={phone} class="mt-1 block w-full rounded border border-slate-300 px-3 py-2" /></label></div>
        <label class="flex items-start gap-2 text-xs text-slate-600"><input required type="checkbox" class="mt-0.5" /><span>{$ui("J’accepte l’enregistrement et la transmission de mes coordonnées et de mon projet à l’équipe CSM Taksit pour être recontacté et valider la conception.").replaceAll("CSM Taksit", $branding.companyName)}</span></label>
        {#if error}<p role="alert" class="text-sm text-red-700">{error}</p>{/if}
        <div class="flex justify-end gap-2"><button type="button" class="rounded-lg border px-4 py-2" onclick={onClose} disabled={busy}>{$ui("Annuler")}</button><button type="submit" class="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={busy}>{$ui(busy?'Préparation et envoi…':'Confirmer et envoyer')}</button></div>
      </form>
    {/if}
  </dialog>
