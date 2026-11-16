<script lang="ts">
  import { branding } from '$lib/stores/branding';
  let { adminKey }: { adminKey: string } = $props();
  let companyName = $state($branding.companyName);
  let logoLink = $state($branding.logoLink);
  let shopLink = $state($branding.shopLink);
  let phone = $state($branding.phone);
  let contactEmail = $state($branding.contactEmail);
  let website = $state($branding.website);
  let primaryColor = $state($branding.primaryColor);
  let files = $state<FileList>();
  let resetLogo = $state(false);
  let busy = $state(false);
  let message = $state('');
  let failed = $state(false);
  async function save(event: SubmitEvent) {
    event.preventDefault(); busy = true; message = ''; failed = false;
    try {
      const data = new FormData();
      data.set('companyName', companyName); data.set('logoLink', logoLink); data.set('shopLink', shopLink);
      data.set('phone', phone); data.set('contactEmail', contactEmail); data.set('website', website); data.set('primaryColor', primaryColor);
      if (files?.[0]) data.set('logo', files[0]);
      if (resetLogo) data.set('resetLogo', '1');
      const response = await fetch('/api/branding.php', { method: 'POST', headers: { 'X-Macuisine-Admin-Key': adminKey.trim() }, body: data });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Enregistrement impossible.');
      branding.set(payload.branding); resetLogo = false; files = undefined;
      message = 'Identité enregistrée. Le nom, le logo et les liens sont mis à jour pour tous les visiteurs.';
    } catch (error) { failed = true; message = error instanceof Error ? error.message : 'Enregistrement impossible.'; }
    finally { busy = false; }
  }
</script>

<section class="identity" aria-labelledby="identity-title">
  <h2 id="identity-title">Identité de la société</h2>
  <form onsubmit={save}>
    <label>Nom de la société<input required maxlength="120" bind:value={companyName} /></label>
    <div class="logo-preview"><img src={$branding.logoUrl} alt={$branding.companyName} /></div>
    <label>Nouveau logo (PNG, JPEG ou WebP, 2 Mio maximum)<input type="file" accept="image/png,image/jpeg,image/webp" bind:files disabled={resetLogo} /></label>
    <label class="reset"><input type="checkbox" bind:checked={resetLogo} /> Rétablir le logo neutre</label>
    <label>Lien au clic sur le logo<input type="url" bind:value={logoLink} placeholder="https://votre-site.example" /></label>
    <label>Lien du bouton boutique<input type="url" bind:value={shopLink} placeholder="https://boutique.example" /></label>
    <label>Téléphone de contact<input type="tel" bind:value={phone} maxlength="60" /></label>
    <label>E-mail de contact<input type="email" bind:value={contactEmail} maxlength="254" /></label>
    <label>Site web de la société<input type="url" bind:value={website} /></label>
    <label>Couleur principale<input type="color" bind:value={primaryColor} /><small>Choisissez une teinte foncée pour garder les textes blancs lisibles.</small></label>
    <button type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer l’identité'}</button>
    {#if message}<p role={failed ? 'alert' : 'status'} class:error={failed}>{message}</p>{/if}
  </form>
</section>

<style>
  .identity{margin:24px 0;padding:24px 0;border-block:1px solid #dce0eb;color:#1e2447}h2{font-size:20px;font-weight:700;margin-bottom:20px}form{display:grid;gap:18px}label{display:grid;gap:8px;font-size:15px;font-weight:600}input{min-height:46px;border:1px solid #a5aec6;border-radius:8px;padding:10px 12px;font-size:16px;background:white;color:#1e2447;width:100%;min-width:0}input[type=file]{max-width:100%}.reset{display:flex;align-items:center;font-weight:400}.reset input{width:22px;min-height:22px;height:22px}.logo-preview{background:var(--brand-primary,#1e2447);border-radius:8px;padding:12px;width:240px;max-width:100%;height:100px}.logo-preview img{width:100%;height:100%;object-fit:contain}button{min-height:48px;background:var(--brand-primary,#1e2447);color:white;font-weight:700;padding:12px 20px;border-radius:8px;justify-self:start}button:disabled{opacity:.6}p{font-size:14px;color:#176142}.error{color:#a51b31}
</style>
