<script lang="ts">
  import { branding } from "$lib/stores/branding";
  import BrandingSettings from '$lib/components/BrandingSettings.svelte';
  import SmtpSettings from '$lib/components/SmtpSettings.svelte';

  let adminKey = $state('');
  let authorized = $state(false);
  let checking = $state(false);
  let loginError = $state('');
  let leadsMessage = $state('');
  let leadsError = $state(false);
  type DesignRequest = { id: string; createdAt: string; lastName: string; firstName: string; email: string; phone: string; projectName: string; preferredFormat: string; files: Record<string, string>; mail?:{status:string;error?:string} };
  let designRequests = $state<DesignRequest[]>([]);
  let designMessage = $state('');
  let designError = $state(false);
  let mailBusyId=$state<string|null>(null);
  async function retryMail(request:DesignRequest){
    mailBusyId=request.id;designError=false;designMessage='';
    try{const response=await fetch('/api/smtp.php',{method:'POST',headers:{'Content-Type':'application/json','X-Macuisine-Admin-Key':adminKey.trim()},body:JSON.stringify({action:'resend',id:request.id})});const payload=await response.json();if(!response.ok)throw new Error(payload.error||'Renvoi impossible.');if(payload.mail?.status!=='sent')throw new Error(payload.mail?.error||'Mail non envoyé. Vérifiez que le SMTP est activé et que le test fonctionne.');designMessage='Le serveur SMTP a accepté l’e-mail client.';await loadDesignRequests();}catch(error){designError=true;designMessage=error instanceof Error?error.message:'Renvoi impossible.';}finally{mailBusyId=null;}
  }

  async function login(event: SubmitEvent) {
    event.preventDefault();
    checking = true;
    loginError = '';
    try {
      const response = await fetch('/api/admin.php', { headers: { 'X-Macuisine-Admin-Key': adminKey.trim() }, cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.authenticated !== true) throw new Error(payload.error || 'Clé administrateur incorrecte.');
      authorized = true;
      await loadDesignRequests();
    } catch (error) {
      loginError = error instanceof Error ? error.message : 'Connexion administrateur impossible.';
    } finally { checking = false; }
  }

  function logout() {
    authorized = false;
    adminKey = '';


    designRequests = [];

    leadsMessage = '';
  }

  async function loadDesignRequests() {
    try { const response = await fetch('/api/designs.php', { headers: { 'X-Macuisine-Admin-Key': adminKey.trim() }, cache: 'no-store' }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Chargement des dossiers impossible.'); designRequests = Array.isArray(payload.items) ? payload.items : []; }
    catch (error) { designError = true; designMessage = error instanceof Error ? error.message : 'Chargement des dossiers impossible.'; }
  }

  async function downloadDesignFile(request: DesignRequest, file: string) {
    designError = false; designMessage = '';
    try { const response = await fetch('/api/designs.php?id=' + encodeURIComponent(request.id) + '&file=' + encodeURIComponent(file), { headers: { 'X-Macuisine-Admin-Key': adminKey.trim() }, cache: 'no-store' }); if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'Téléchargement impossible.'); } const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = request.files[file] || 'dossier'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (error) { designError = true; designMessage = error instanceof Error ? error.message : 'Téléchargement impossible.'; }
  }

  async function downloadLeads() {
    leadsMessage = ''; leadsError = false;
    try {
      const response = await fetch('/api/leads.php', { headers: { 'X-Macuisine-Admin-Key': adminKey.trim() }, cache: 'no-store' });
      if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.error || 'Téléchargement refusé.'); }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'demandes-macuisine.csv'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      leadsMessage = 'Le fichier CSV a été téléchargé.';
    } catch (error) {
      leadsError = true;
      leadsMessage = error instanceof Error ? error.message : 'Téléchargement impossible.';
    }
  }
</script>

<svelte:head>
  <title>{$branding.companyName} · Création</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<main class="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-6">
  <section class="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm sm:p-8">
    <header class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[.2em] text-teal-700">{$branding.companyName} · Création</p>
        <h1 class="mt-2 text-2xl font-bold">Administration</h1>
        <p class="mt-1 text-sm text-slate-500">Espace réservé à l’administrateur.</p>
      </div>
      {#if authorized}
        <button type="button" onclick={logout} class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Se déconnecter</button>
      {/if}
    </header>

    {#if !authorized}
      <form onsubmit={login} class="max-w-md space-y-4">
        <label for="admin-key" class="block text-sm font-medium">Clé administrateur
          <input id="admin-key" type="password" autocomplete="current-password" required bind:value={adminKey} class="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        {#if loginError}<p role="alert" class="text-sm text-red-700">{loginError}</p>{/if}
        <button type="submit" disabled={checking || !adminKey.trim()} class="rounded-lg bg-teal-700 px-5 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-50">{checking ? 'Vérification…' : 'Accéder à l’administration'}</button>
      </form>
    {:else}
      <BrandingSettings {adminKey} />
      <SmtpSettings {adminKey} />
      <section class="mt-7 border-t border-slate-200 pt-5" aria-labelledby="design-requests-title">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 id="design-requests-title" class="text-lg font-semibold">Demandes de conception</h2><p class="mt-1 text-sm text-slate-600">Téléchargez les aperçus, les plans et la liste des équipements envoyés par les clients.</p></div><button type="button" onclick={loadDesignRequests} class="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">Actualiser</button></div>
        {#if designMessage}<p role={designError ? 'alert' : 'status'} class="mt-3 text-sm {designError ? 'text-red-700' : 'text-teal-700'}">{designMessage}</p>{/if}
        <div class="mt-4 space-y-3">
          {#each designRequests as request (request.id)}
            <article class="rounded-xl border border-slate-200 p-4">
              <h3 class="font-semibold">{request.projectName}</h3><p class="mt-1 text-sm">{request.firstName} {request.lastName} · {request.email} · {request.phone}</p><p class="mt-1 text-xs text-slate-500">{new Date(request.createdAt).toLocaleString('fr-FR')} · Format choisi : {request.preferredFormat.toUpperCase()}</p>
              <p class="mt-2 text-sm">E-mail client : {request.mail?.status==='sent'?'accepté par le serveur SMTP':request.mail?.status==='disabled'?'SMTP désactivé':request.mail?.status==='failed'?'échec — à renvoyer':'non envoyé'}</p>
              {#if request.mail?.status!=='sent'}<button type="button" class="mt-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" disabled={mailBusyId===request.id} onclick={()=>retryMail(request)}>{mailBusyId===request.id?'Envoi…':'Envoyer le mail de remerciement'}</button>{/if}
              <div class="mt-3 flex flex-wrap gap-2">{#each Object.keys(request.files) as file}<button type="button" onclick={() => downloadDesignFile(request, file)} class="rounded-lg border border-teal-700 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">Télécharger : {file === 'selection' ? 'aperçu choisi' : file === 'pdf' ? 'PDF' : file === 'png' ? 'PNG avec détails' : file === 'cad' ? 'Plan CAO DXF' : file === 'project' ? 'Projet modifiable JSON' : 'Équipements et dimensions'}</button>{/each}</div>
            </article>
          {:else}<p class="text-sm text-slate-500">Aucune demande de conception pour le moment.</p>{/each}
        </div>
      </section>

      <section class="mt-7 border-t border-slate-200 pt-5" aria-labelledby="leads-admin-title">
        <h2 id="leads-admin-title" class="text-lg font-semibold">Demandes de contact</h2>
        <p class="mt-1 text-sm text-slate-600">Télécharge les coordonnées transmises avec consentement dans le configurateur.</p>
        <button type="button" onclick={downloadLeads} class="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800">Télécharger les demandes en CSV</button>
        {#if leadsMessage}<p role={leadsError ? 'alert' : 'status'} class="mt-3 text-sm {leadsError ? 'text-red-700' : 'text-teal-700'}">{leadsMessage}</p>{/if}
      </section>
    {/if}
  </section>
</main>
