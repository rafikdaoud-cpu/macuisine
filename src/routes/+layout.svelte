<script>
  import '../app.css';
  import { branding, loadBranding } from '$lib/stores/branding';
  onMount(() => { void loadBranding(); });
  onMount(() => branding.subscribe(value => document.documentElement.style.setProperty('--brand-primary', value.primaryColor)));
  import { initializeLocale } from '$lib/i18n';
  onMount(initializeLocale);
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import { themePreference } from '$lib/stores/theme';
  import DeploymentNotice from '$lib/components/DeploymentNotice.svelte';
  import PlatformCredit from '$lib/components/PlatformCredit.svelte';
  import { page } from '$app/state';
  // Self-hosted instances and browser tests can run without sending analytics.
  onMount(() => { if (window.location.pathname !== '/render-lab' && env.PUBLIC_ENABLE_ANALYTICS === 'true') void import('$lib/firebase'); });
  let { children } = $props();
</script>

<div class="platform-shell" class:editor-page={/\/editor\/?$/.test(page.url.pathname)}>
  <div class="platform-content">{@render children()}</div>
  <PlatformCredit />
</div>
<DeploymentNotice />

<style>
  .platform-shell{min-height:100dvh;display:flex;flex-direction:column}
  .platform-content{position:relative;flex:1;min-height:0}
  .editor-page{height:100dvh;min-height:0}
  .editor-page .platform-content :global(.h-screen){height:100%}
</style>
