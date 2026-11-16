<script lang="ts">
  import {onMount} from 'svelte';
  let {adminKey}:{adminKey:string}=$props();
  type Config={enabled:boolean;host:string;port:number;security:'tls'|'ssl'|'none';username:string;password:string;fromEmail:string;fromName:string;publicUrl:string};
  let config=$state<Config>({enabled:false,host:'',port:587,security:'tls',username:'',password:'',fromEmail:'',fromName:'Mon entreprise',publicUrl:''});
  let loading=$state(true),busy=$state(false),passwordConfigured=$state(false),message=$state(''),failed=$state(false),testEmail=$state(''),insecure=$state(false);
  async function request(body?:object){
    const response=await fetch('/api/smtp.php',{method:body?'POST':'GET',headers:{'X-Macuisine-Admin-Key':adminKey.trim(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Configuration SMTP indisponible.');return result;
  }
  function apply(value:Config&{passwordConfigured?:boolean}){passwordConfigured=value.passwordConfigured===true;config={enabled:value.enabled,host:value.host,port:value.port,security:value.security,username:value.username,password:'',fromEmail:value.fromEmail,fromName:value.fromName,publicUrl:value.publicUrl};}
  async function load(){try{apply((await request()).config);}catch(error){failed=true;message=error instanceof Error?error.message:'Chargement SMTP impossible.';}finally{loading=false;}}
  onMount(()=>{if(location.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(location.hostname)){insecure=true;loading=false;failed=true;message='Ouvrez cette administration en HTTPS pour configurer le SMTP.';}else void load();});
  async function save(event:SubmitEvent){event.preventDefault();busy=true;message='';failed=false;try{apply((await request({action:'save',config:$state.snapshot(config)})).config);message='Configuration SMTP enregistrée.';}catch(error){failed=true;message=error instanceof Error?error.message:'Enregistrement impossible.';}finally{busy=false;}}
  async function test(){busy=true;message='';failed=false;try{await request({action:'test',email:testEmail.trim()});message='Le serveur SMTP a accepté le mail de test. Vérifiez la réception et les courriers indésirables.';}catch(error){failed=true;message=error instanceof Error?error.message:'Test SMTP impossible.';}finally{busy=false;}}
</script>
<section class="mt-7 border-t border-slate-200 pt-5" aria-labelledby="smtp-title">
  <h2 id="smtp-title" class="text-xl font-bold">Configuration SMTP</h2>
  <p class="mt-2 text-sm text-slate-500">Envoi du remerciement au client après réception de son dossier. Les identifiants sont conservés hors du dossier public du site.</p>
  <form onsubmit={save} class="mt-4">
    <fieldset disabled={loading||busy||insecure} class="smtp-fields">
      <label class="smtp-toggle"><input type="checkbox" bind:checked={config.enabled}/> Activer les e-mails de confirmation aux clients</label>
      <div class="smtp-grid">
        <label>Serveur SMTP<input bind:value={config.host} placeholder="mail.example.com" autocomplete="off" maxlength="253" /></label>
        <label>Port<input type="number" min="1" max="65535" bind:value={config.port} required /></label>
        <label>Chiffrement<select bind:value={config.security}><option value="tls">STARTTLS — généralement port 587</option><option value="ssl">SSL/TLS — généralement port 465</option><option value="none">Sans chiffrement — serveur local uniquement</option></select></label>
        <label>Identifiant SMTP<input bind:value={config.username} placeholder="contact@example.com" autocomplete="off" maxlength="256" /></label>
        <label>Mot de passe SMTP<input type="password" bind:value={config.password} autocomplete="new-password" maxlength="2048" placeholder={passwordConfigured?'Enregistré : laisser vide pour le conserver':'Mot de passe de la boîte mail'} /><span class="mt-1 block text-xs text-slate-500">Le mot de passe enregistré n’est jamais renvoyé au navigateur.</span></label>
        <label>Adresse d’expédition<input type="email" bind:value={config.fromEmail} required /></label>
        <label>Nom de l’expéditeur<input bind:value={config.fromName} required maxlength="100" /></label>
        <label>Adresse HTTPS du simulateur<input type="url" bind:value={config.publicUrl} required /></label>
      </div>
      <button type="submit" class="smtp-primary">{busy?'Traitement…':'Enregistrer la configuration SMTP'}</button>
    </fieldset>
  </form>
  <div class="smtp-test"><label>Envoyer le test à<input type="email" bind:value={testEmail} /></label><button type="button" class="smtp-secondary" disabled={loading||busy||insecure||!testEmail.trim()} onclick={test}>Envoyer un mail de test</button></div>
  <p class="mt-2 text-xs text-slate-500">Enregistrez les réglages avant le test. TLS et SSL vérifient le certificat du serveur. Activez l’envoi client lorsque le test est reçu.</p>
  {#if message}<p class="mt-3 text-sm" class:text-red-700={failed} role={failed?'alert':'status'}>{message}</p>{/if}
</section>
<style>.smtp-fields{border:0;min-width:0}.smtp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:16px 0}.smtp-grid label,.smtp-test label{display:block;font-size:14px;font-weight:600;min-width:0}.smtp-grid input,.smtp-grid select,.smtp-test input{display:block;width:100%;min-height:44px;margin-top:6px;border:1px solid #8997b8;border-radius:7px;padding:10px;font-size:16px}.smtp-toggle{display:flex;gap:10px;align-items:center;font-size:15px}.smtp-toggle input{width:20px;height:20px}.smtp-primary,.smtp-secondary{min-height:44px;padding:12px 16px;border-radius:7px;font-weight:600;font-size:14px;cursor:pointer}.smtp-primary{background:var(--brand-primary,#1e2447);color:#fff}.smtp-secondary{border:1px solid #8997b8}.smtp-test{display:flex;align-items:end;gap:12px;flex-wrap:wrap;margin-top:20px}.smtp-test label{flex:1;min-width:200px}@media(max-width:600px){.smtp-grid{grid-template-columns:1fr}}button:disabled{opacity:.5;cursor:default}</style>
