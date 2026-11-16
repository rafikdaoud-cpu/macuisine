<script lang="ts">
  import {locale} from '$lib/i18n';
  import type {Project} from '$lib/models/types';
  import type {CreationKind} from '$lib/utils/creationWorkflow';
  import type {KitchenRoomSize} from '$lib/utils/kitchenWorkflow';
  import ProjectPreview from './ProjectPreview.svelte';
  let {project,kind,required=null,onFit}:{project:Project|null;kind:CreationKind;required?:KitchenRoomSize|null;onFit?:()=>void}=$props();
  const fitLabels={fr:{note:'Aperçu dans une pièce agrandie. Dimensions minimales conseillées (L × P × H) :',button:'Adapter la pièce'},en:{note:'Preview in an enlarged room. Recommended minimum dimensions (W × D × H):',button:'Resize the room'},ar:{note:'معاينة في غرفة موسعة. الأبعاد الدنيا الموصى بها (العرض × العمق × الارتفاع):',button:'تعديل أبعاد الغرفة'}};
  const fitText=$derived(fitLabels[$locale==='ar'?'ar':$locale==='en'?'en':'fr']);
  const labels={fr:{title:'Aperçu de votre projet',plan:'Vue de dessus',face:'Vue de face',note:'Mis à jour avec vos réglages. Dessin indicatif.',empty:'Vérifiez les dimensions et la composition pour afficher l’aperçu.'},en:{title:'Your project preview',plan:'Top view',face:'Front view',note:'Updates with your settings. Indicative drawing.',empty:'Check the dimensions and composition to display the preview.'},ar:{title:'معاينة مشروعك',plan:'منظر علوي',face:'واجهة أمامية',note:'تتحدث المعاينة حسب إعداداتك. رسم توضيحي.',empty:'تحقق من الأبعاد والتكوين لعرض المعاينة.'}};
  const text=$derived(labels[$locale==='ar'?'ar':$locale==='en'?'en':'fr']);
</script>
<aside class="creation-preview" aria-label={text.title}>
  <div class="preview-heading"><h2>{text.title}</h2><span>{kind==='kitchen'?text.plan:text.face}</span></div>
  <div class="preview-canvas">{#if project}<ProjectPreview {project} />{:else}<p role="status">{text.empty}</p>{/if}</div>
  {#if required}<div class="fit-warning" role="status"><p>{fitText.note} <strong>{Math.ceil(required.widthMm/10)} × {Math.ceil(required.depthMm/10)} × {Math.ceil(required.heightMm/10)} cm</strong></p>{#if onFit}<button type="button" onclick={onFit}>{fitText.button}</button>{/if}</div>{/if}
  <p class="preview-note">{text.note}</p>
</aside>
<style>
  .fit-warning{background:#fff8e6;color:#704310;padding:12px 16px;font-size:12px;line-height:1.6}.fit-warning strong{display:block}.fit-warning button{margin-top:8px;min-height:40px;padding:8px 12px;border:1px solid #8c601e;border-radius:6px;background:white;color:#704310;font-weight:600;cursor:pointer}
  .creation-preview{position:sticky;top:24px;margin-top:28px;border:1px solid #dce0eb;border-radius:14px;overflow:hidden;background:#fff;min-width:0}.preview-heading{padding:16px 16px 12px}.preview-heading h2{font-size:14px;font-weight:700;color:#1e2447;margin:0 0 5px}.preview-heading span{font-size:12px;color:#56627b}.preview-canvas{height:245px;background:#f3f5fa;display:flex;align-items:center;justify-content:center;direction:ltr}.preview-canvas p{font-size:13px;line-height:1.6;text-align:center;padding:20px;color:#56627b}.preview-note{font-size:12px;color:#56627b;line-height:1.5;padding:12px 16px;margin:0}@media(max-width:850px){.creation-preview{position:static;margin-top:0}.preview-canvas{height:220px}}
</style>
