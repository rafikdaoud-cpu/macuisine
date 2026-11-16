<?php
declare(strict_types=1);
require_once __DIR__ . '/mail-service.php';
function csm_branding(): array {
    $defaults = ['companyName'=>'CSM Taksit','logoUrl'=>'/branding/csm-taksit-logo.png','logoLink'=>'https://csmtaksit.dz','shopLink'=>'https://eshop.csmtaksit.dz/'];
    $file=csm_private_base().'/branding.json';
    if (!is_file($file)) return $defaults;
    $stored=json_decode((string)file_get_contents($file),true,16,JSON_THROW_ON_ERROR);
    if (!is_array($stored)) throw new RuntimeException('Identité illisible.');
    return array_replace($defaults,array_intersect_key($stored,$defaults));
}
