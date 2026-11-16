<script lang="ts">
  import { locale,t } from '$lib/i18n';
  let {inverse=false}:{inverse?:boolean}=$props();
  const languages=[{id:'fr',label:'Français'},{id:'ar',label:'العربية'},{id:'en',label:'English'}] as const;
</script>
<nav class="languages" class:inverse dir="ltr" aria-label={$t('settings.language')}>
  {#each languages as language}<button type="button" lang={language.id} aria-pressed={$locale===language.id} onclick={()=>locale.set(language.id)}>{language.label}</button>{/each}
</nav>
<style>.languages{display:flex;gap:4px;align-items:center;padding:4px;border:1px solid #ccd3e5;border-radius:9px;background:white;width:max-content;max-width:100%}.languages button{font-size:12px;font-weight:600;min-height:36px;padding:6px 10px;border-radius:6px;color:#1e2447;white-space:nowrap;cursor:pointer}.languages button[aria-pressed=true]{background:#1e2447;color:white}.languages.inverse{background:#ffffff0a;border-color:#ffffff40}.languages.inverse button{color:#fff}.languages.inverse button[aria-pressed=true]{background:white;color:#1e2447}.languages button:focus-visible{outline:3px solid #8ca1e2;outline-offset:2px}@media(max-width:500px){.languages button{min-height:40px;padding:6px 11px}}</style>
