<?php
declare(strict_types=1);
require_once __DIR__ . '/mail-service.php';
try {
    if(!in_array($_SERVER['REMOTE_ADDR']??'', ['127.0.0.1','::1'],true)&&strtolower((string)($_SERVER['HTTPS']??''))!=='on'&&($_SERVER['SERVER_PORT']??'')!=='443')csm_json(403,['error'=>'Ouvrez l’administration en HTTPS pour configurer le SMTP.']);
    if (!csm_admin()) csm_json(401, ['error'=>'Clé administrateur incorrecte.']);
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') csm_json(200, ['config'=>csm_public_smtp_config(csm_smtp_config())]);
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') csm_json(405, ['error'=>'Méthode non autorisée.']);
    csm_same_origin();
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0)>16384) csm_json(413, ['error'=>'Configuration trop volumineuse.']);
    $input=json_decode((string)file_get_contents('php://input'),true,32,JSON_THROW_ON_ERROR);
    if(!is_array($input))csm_json(400,['error'=>'Configuration invalide.']);
    $action=$input['action']??'';
    if($action==='save'){
        if(!is_array($input['config']??null))csm_json(400,['error'=>'Configuration invalide.']);
        $config=csm_validate_smtp($input['config'],csm_smtp_config());
        csm_write_json(csm_private_base().'/smtp.json',$config);
        csm_json(200,['config'=>csm_public_smtp_config($config)]);
    }
    if($action==='test'){
        $recipient=$input['email']??'';
        if(!is_string($recipient)||strlen($recipient)>254||!filter_var($recipient,FILTER_VALIDATE_EMAIL))csm_json(400,['error'=>'Adresse de test invalide.']);
        $config=csm_smtp_config();
        if($config['host']==='')csm_json(400,['error'=>'Enregistrez d’abord le serveur SMTP.']);
        $mail=csm_mailer($config);$mail->addAddress($recipient);require_once __DIR__.'/branding-service.php';$identity=csm_branding();$mail->Subject='Test SMTP — '.$identity['companyName'];
        $mail->Body="Votre configuration SMTP fonctionne : le serveur a accepté ce message de test.\n\n".implode("\n",array_filter([$identity['companyName'],$identity['phone'],$identity['contactEmail'],$identity['website']]));
        try{$mail->send();}catch(Throwable $error){csm_json(422,['error'=>'Échec du test SMTP. Vérifiez le serveur, le port, le chiffrement, les identifiants et l’autorisation d’envoi de l’expéditeur.']);}
        csm_json(200,['sent'=>true]);
    }
    if($action==='resend'){
        $id=$input['id']??'';if(!is_string($id))csm_json(400,['error'=>'Dossier invalide.']);
        $row=csm_design_record($id);if(!$row)csm_json(404,['error'=>'Dossier introuvable.']);
        csm_json(200,['mail'=>csm_send_design_mail($row)]);
    }
    csm_json(400,['error'=>'Action inconnue.']);
}catch(InvalidArgumentException $error){csm_json(400,['error'=>$error->getMessage()]);}
catch(Throwable $error){csm_json(500,['error'=>'Configuration SMTP indisponible ou illisible.']);}
