<?php
declare(strict_types=1);
require_once __DIR__.'/branding-service.php';
try {
    $config=csm_branding();
    parse_str((string)parse_url($config['logoUrl'],PHP_URL_QUERY),$query);
    $name=$query['v']??'';
    if (!is_string($name) || !preg_match('/^logo-[a-f0-9]{64}\.(png|jpg|webp)$/D',$name,$match)) csm_json(404,['error'=>'Logo introuvable.']);
    $bytes=@file_get_contents(csm_private_base().'/'.$name);
    if ($bytes===false) csm_json(404,['error'=>'Logo introuvable.']);
    header('Content-Type: '.['png'=>'image/png','jpg'=>'image/jpeg','webp'=>'image/webp'][$match[1]]);
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-cache');
    echo $bytes;
} catch(Throwable $error) { csm_json(500,['error'=>'Logo indisponible.']); }
