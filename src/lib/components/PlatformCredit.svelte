<script lang="ts">
  import { locale } from '$lib/i18n';
  const label = $derived($locale === 'ar' ? 'تم إنشاء المنصة بواسطة' : $locale === 'en' ? 'Platform created by' : 'Plateforme créée par');
</script>

<footer class="platform-credit">
  <span>{label} <strong dir="ltr">Rafik DAOUD</strong></span>
  <a href="mailto:rafikdaoud@gmail.com" dir="ltr">rafikdaoud@gmail.com</a>
  <a href="https://github.com/rafikdaoud-cpu" target="_blank" rel="noopener noreferrer" dir="ltr">GitHub</a>
  <a href="https://www.linkedin.com/in/rafik-daoud/" target="_blank" rel="noopener noreferrer" dir="ltr">LinkedIn</a>
</footer>

<style>
  .platform-credit{flex-shrink:0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px 16px;padding:8px 16px calc(8px + env(safe-area-inset-bottom, 0px));background:var(--brand-primary,#1e2447);color:#eef0ff;border-top:1px solid #495173;text-align:center;font-size:13px;line-height:1.6}
  strong{font-weight:700;unicode-bidi:isolate}
  a{display:inline-flex;align-items:center;min-height:28px;color:#fff;text-decoration:underline;text-underline-offset:3px;overflow-wrap:anywhere;max-width:100%}
  a:hover{color:#d4dcff}
  a:focus-visible{outline:2px solid #fff;outline-offset:3px;border-radius:2px}
</style>
