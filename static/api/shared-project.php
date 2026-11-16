<?php
declare(strict_types=1);
require_once __DIR__ . '/mail-service.php';
header('Referrer-Policy: no-referrer');
try {
    if(($_SERVER['REQUEST_METHOD']??'')!=='POST')csm_json(405,['error'=>'Méthode non autorisée.']);
    csm_same_origin();
    if((int)($_SERVER['CONTENT_LENGTH']??0)>2048)csm_json(413,['error'=>'Lien invalide.']);
    $input=json_decode((string)file_get_contents('php://input'),true,8);
    $id=$input['id']??null;$token=$input['token']??null;
    if(!is_string($id)||!preg_match('/^[a-f0-9]{24}$/D',$id)||!is_string($token)||!preg_match('/^[a-f0-9]{64}$/D',$token))csm_json(404,['error'=>'Lien de projet invalide ou indisponible.']);
    $dir=csm_private_base().'/design_requests/'.$id;
    $stored=is_file($dir.'/share-token.json')?json_decode((string)file_get_contents($dir.'/share-token.json'),true):[];
    if(!is_string($stored['token']??null)||!hash_equals($stored['token'],$token))csm_json(404,['error'=>'Lien de projet invalide ou indisponible.']);
    $path=$dir.'/projet-modifiable.json';
    if(!is_file($path)||filesize($path)>20*1024*1024)csm_json(404,['error'=>'Projet indisponible.']);
    $project=json_decode((string)file_get_contents($path),true,128,JSON_THROW_ON_ERROR);
    if(!is_array($project))csm_json(500,['error'=>'Projet illisible.']);
    // Contact details live in a separate index and are never exposed by this link.
    csm_json(200,['project'=>$project]);
}catch(Throwable $error){csm_json(500,['error'=>'Impossible de charger ce projet.']);}
