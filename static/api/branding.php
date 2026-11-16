<?php
declare(strict_types=1);
require_once __DIR__.'/branding-service.php';
try {
    if (($_SERVER['REQUEST_METHOD']??'GET')==='GET') csm_json(200,['branding'=>csm_branding()]);
    if (($_SERVER['REQUEST_METHOD']??'')!=='POST') csm_json(405,['error'=>'Méthode non autorisée.']);
    if (!csm_admin()) csm_json(401,['error'=>'Clé administrateur incorrecte.']);
    csm_same_origin();
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>2300000) csm_json(413,['error'=>'Logo trop volumineux (2 Mio maximum).']);
    $config=csm_branding();
    $name=trim((string)($_POST['companyName']??''));
    if ($name==='' || strlen($name)>240 || preg_match('/[\x00-\x1f\x7f]/',$name)) csm_json(400,['error'=>'Nom de société invalide.']);
    $config['companyName']=$name;
    foreach (['logoLink','shopLink'] as $key) {
        $url=trim((string)($_POST[$key]??''));
        $parts=parse_url($url);
        if (strlen($url)>2048 || !filter_var($url,FILTER_VALIDATE_URL) || !is_array($parts) || !in_array(strtolower($parts['scheme']??''),['https','http'],true) || isset($parts['user']) || isset($parts['pass']) || preg_match('/[\x00-\x20\x7f]/',$url)) csm_json(400,['error'=>'Lien invalide. Utilisez une adresse https:// complète.']);
        $config[$key]=$url;
    }
    $upload=$_FILES['logo']??null;
    if (is_array($upload) && ($upload['error']??UPLOAD_ERR_NO_FILE)!==UPLOAD_ERR_NO_FILE) {
        if ($upload['error']!==UPLOAD_ERR_OK || $upload['size']>2097152 || !is_uploaded_file($upload['tmp_name'])) csm_json(400,['error'=>'Téléversement du logo impossible (2 Mio maximum).']);
        $info=@getimagesize($upload['tmp_name']);
        $types=['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'];
        if (!$info || !isset($types[$info['mime']??'']) || $info[0]<1 || $info[1]<1 || $info[0]*$info[1]>16000000) csm_json(400,['error'=>'Choisissez une image PNG, JPEG ou WebP valide (16 mégapixels maximum).']);
        $bytes=file_get_contents($upload['tmp_name']);
        if ($bytes===false) throw new RuntimeException('Logo illisible.');
        $filename='logo-'.hash('sha256',$bytes).'.'.$types[$info['mime']];
        $base=csm_private_base();
        if (!is_dir($base) && !mkdir($base,0700,true) && !is_dir($base)) throw new RuntimeException('Stockage impossible.');
        if (file_put_contents($base.'/'.$filename,$bytes,LOCK_EX)===false) throw new RuntimeException('Logo non enregistré.');
        chmod($base.'/'.$filename,0600);
        $config['logoUrl']='/api/branding-logo.php?v='.basename($filename);
    }
    if (($_POST['resetLogo']??'')==='1') $config['logoUrl']='/branding/csm-taksit-logo.png';
    csm_write_json(csm_private_base().'/branding.json',$config);
    csm_json(200,['branding'=>$config]);
} catch(Throwable $error) { csm_json(500,['error'=>'Identité de la société indisponible.']); }
