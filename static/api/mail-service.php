<?php
declare(strict_types=1);

function csm_private_base(): string {
    $root = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($root === false) throw new RuntimeException('Stockage privé indisponible.');
    return dirname($root) . DIRECTORY_SEPARATOR . '.macuisine_catalog';
}
function csm_json(int $status, array $data): void {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store'); header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
function csm_admin(): bool {
    $expected = trim((string)@file_get_contents(csm_private_base() . '/admin.key'));
    $provided = trim((string)($_SERVER['HTTP_X_MACUISINE_ADMIN_KEY'] ?? ''));
    if ($provided === '' && preg_match('/^Bearer\s+(.+)$/i', (string)($_SERVER['HTTP_AUTHORIZATION'] ?? ''), $match)) $provided = trim($match[1]);
    return $expected !== '' && $provided !== '' && hash_equals($expected, $provided);
}
function csm_same_origin(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && strcasecmp((string)parse_url($origin, PHP_URL_HOST), (string)parse_url('https://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) !== 0) csm_json(403, ['error' => 'Origine non autorisée.']);
}
function csm_write_json(string $path, array $data): void {
    $parent = dirname($path);
    if (!is_dir($parent) && !mkdir($parent, 0700, true) && !is_dir($parent)) throw new RuntimeException('Stockage privé indisponible.');
    $temporary = $path . '.tmp-' . bin2hex(random_bytes(8));
    $encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    if (file_put_contents($temporary, $encoded, LOCK_EX) === false) throw new RuntimeException('Écriture privée impossible.');
    chmod($temporary, 0600);
    if (!rename($temporary, $path)) { @unlink($temporary); throw new RuntimeException('Enregistrement privé impossible.'); }
}
function csm_smtp_config(): array {
    $defaults = ['enabled'=>false,'host'=>'','port'=>587,'security'=>'tls','username'=>'','password'=>'','fromEmail'=>'','fromName'=>'Mon entreprise','publicUrl'=>''];
    $path = csm_private_base() . '/smtp.json';
    if (!is_file($path)) return $defaults;
    $stored = json_decode((string)file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
    if (!is_array($stored)) throw new RuntimeException('Configuration SMTP illisible.');
    return array_replace($defaults, array_intersect_key($stored, $defaults));
}
function csm_public_smtp_config(array $config): array {
    $configured = $config['password'] !== ''; unset($config['password']);
    $config['passwordConfigured'] = $configured; return $config;
}
function csm_validate_smtp(array $input, array $previous): array {
    $config = [];
    if (!is_bool($input['enabled'] ?? null)) throw new InvalidArgumentException('Choisissez si l’envoi SMTP est activé.');
    $config['enabled'] = $input['enabled'];
    foreach (['host','security','username','fromEmail','fromName','publicUrl'] as $key) {
        if (!is_string($input[$key] ?? null) || strlen($input[$key]) > 512 || preg_match('/[\x00-\x1f\x7f]/', $input[$key])) throw new InvalidArgumentException('Champ SMTP invalide : ' . $key);
        $config[$key] = trim($input[$key]);
    }
    if ($config['host'] !== '' && !preg_match('/^[a-zA-Z0-9.-]+$/D', $config['host'])) throw new InvalidArgumentException('Indiquez uniquement le nom du serveur SMTP, sans protocole ni chemin.');
    if ($config['enabled'] && $config['host'] === '') throw new InvalidArgumentException('Indiquez le serveur SMTP.');
    if (!is_int($input['port'] ?? null) || $input['port'] < 1 || $input['port'] > 65535) throw new InvalidArgumentException('Port SMTP invalide.');
    $config['port'] = $input['port'];
    if (!in_array($config['security'], ['tls','ssl','none'], true)) throw new InvalidArgumentException('Chiffrement SMTP invalide.');
    if ($config['security'] === 'none' && !in_array(strtolower($config['host']), ['127.0.0.1','localhost'], true)) throw new InvalidArgumentException('Utilisez TLS ou SSL pour un serveur distant.');
    if (!filter_var($config['fromEmail'], FILTER_VALIDATE_EMAIL) || $config['fromName'] === '') throw new InvalidArgumentException('Expéditeur invalide.');
    $url = parse_url($config['publicUrl']);
    if (!is_array($url) || ($url['scheme'] ?? '') !== 'https' || empty($url['host']) || isset($url['user'], $url['pass']) || isset($url['user']) || isset($url['pass']) || isset($url['query']) || isset($url['fragment']) || !in_array($url['path'] ?? '', ['', '/'], true)) throw new InvalidArgumentException('L’adresse du simulateur doit être une URL HTTPS, sans chemin ni paramètres.');
    $config['publicUrl'] = rtrim($config['publicUrl'], '/');
    if (!is_string($input['password'] ?? '') || strlen($input['password'] ?? '') > 2048 || preg_match('/[\r\n\x00]/', $input['password'] ?? '')) throw new InvalidArgumentException('Mot de passe SMTP invalide.');
    $config['password'] = ($input['password'] ?? '') === '' ? $previous['password'] : $input['password'];
    if ($config['enabled'] && $config['username'] !== '' && $config['password'] === '') throw new InvalidArgumentException('Indiquez le mot de passe SMTP.');
    return $config;
}
function csm_mailer(array $config) {
    require_once __DIR__ . '/vendor/PHPMailer/src/Exception.php';
    require_once __DIR__ . '/vendor/PHPMailer/src/PHPMailer.php';
    require_once __DIR__ . '/vendor/PHPMailer/src/SMTP.php';
    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP(); $mail->CharSet = 'UTF-8'; $mail->Timeout = 15; $mail->getSMTPInstance()->Timelimit = 25; $mail->SMTPDebug = 0;
    $mail->Host = $config['host']; $mail->Port = $config['port'];
    $mail->SMTPAuth = $config['username'] !== ''; $mail->Username = $config['username']; $mail->Password = $config['password'];
    $mail->SMTPSecure = $config['security'] === 'none' ? '' : $config['security'];
    $mail->SMTPAutoTLS = $config['security'] !== 'none';
    $mail->setFrom($config['fromEmail'], $config['fromName']);
    require_once __DIR__.'/branding-service.php';
    $identity=csm_branding();
    $mail->addReplyTo($identity['contactEmail']!==''?$identity['contactEmail']:$config['fromEmail'], $identity['companyName']);
    return $mail;
}
function csm_design_record(string $id): ?array {
    if (!preg_match('/^[a-f0-9]{24}$/D', $id)) return null;
    $path = csm_private_base() . '/design_requests/requests.json';
    $data = is_file($path) ? json_decode((string)file_get_contents($path), true) : [];
    foreach ($data['requests'] ?? [] as $row) if (($row['id'] ?? '') === $id) return $row;
    return null;
}
function csm_mail_status(string $id): array {
    $path = csm_private_base() . '/design_requests/' . $id . '/mail-status.json';
    $state = is_file($path) ? json_decode((string)file_get_contents($path), true) : null;
    return is_array($state) ? $state : ['status'=>'not-sent'];
}
function csm_project_link(array $row, array $config): string {
    $dir = csm_private_base() . '/design_requests/' . $row['id'];
    $keyPath = $dir . '/share-token.json';
    if (!isset($row['files']['project']) || !is_file($dir . '/projet-modifiable.json')) throw new RuntimeException('Le projet modifiable manque dans ce dossier.');
    if (is_file($keyPath)) { $stored = json_decode((string)file_get_contents($keyPath), true); $token = $stored['token'] ?? ''; }
    else { $token = bin2hex(random_bytes(32)); csm_write_json($keyPath, ['token'=>$token]); }
    if (!is_string($token) || !preg_match('/^[a-f0-9]{64}$/D', $token)) throw new RuntimeException('Lien privé illisible.');
    return $config['publicUrl'] . '/editor#projet=' . $row['id'] . '.' . $token;
}
function csm_send_design_mail(array $row): array {
    $dir = csm_private_base() . '/design_requests/' . $row['id'];
    $lock = fopen($dir . '/mail.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return ['status'=>'sending'];
    try {
        $previous = csm_mail_status($row['id']);
        if (($previous['status'] ?? '') === 'sent') return $previous;
        $config = csm_smtp_config();
        if (!$config['enabled']) { $state = ['status'=>'disabled','updatedAt'=>gmdate(DATE_ATOM)]; csm_write_json($dir . '/mail-status.json', $state); return $state; }
        $link = csm_project_link($row, $config);
        $mail = csm_mailer($config); $mail->addAddress($row['email'], $row['firstName'] . ' ' . $row['lastName']);
        require_once __DIR__.'/branding-service.php';
        $identity=csm_branding();$companyName=$identity['companyName'];
        $mail->Subject = 'Merci pour votre projet — '.$companyName;
        $mail->MessageID = '<projet-' . $row['id'] . '@' . parse_url($config['publicUrl'], PHP_URL_HOST) . '>';
        $escape = static function ($text) { return htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
        $contactHtml='<strong>'.$escape($companyName).'</strong>';
        if($identity['phone']!=='')$contactHtml.='<br>Tél. : '.$escape($identity['phone']);
        if($identity['contactEmail']!=='')$contactHtml.='<br><a href="mailto:'.$escape($identity['contactEmail']).'">'.$escape($identity['contactEmail']).'</a>';
        if($identity['website']!=='')$contactHtml.='<br><a href="'.$escape($identity['website']).'">'.$escape($identity['website']).'</a>';
        $contactText=implode("\n",array_filter([$companyName,$identity['phone'],$identity['contactEmail'],$identity['website']]));
        $detailsPath = $dir . '/equipements-et-dimensions.txt';
        if(is_file($detailsPath)&&filesize($detailsPath)>1024*1024)throw new RuntimeException('Récapitulatif trop volumineux pour le mail.');
        $details = is_file($detailsPath) ? (string)file_get_contents($detailsPath) : '';
        $mail->isHTML(true);
        $mail->Body = '<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#1e2447;background:#f4f5f9;padding:24px"><div style="max-width:640px;margin:auto;background:#fff;padding:28px;border-radius:12px"><h1 style="font-size:24px">Merci pour votre confiance !</h1><p>Bonjour ' . $escape($row['firstName']) . ',</p><p>Nous avons bien reçu votre projet <strong>' . $escape($row['projectName']) . '</strong>. Merci d’avoir choisi ' . $escape($companyName) . ' pour votre aménagement sur mesure.</p><p>Notre équipe pourra vous contacter pour étudier votre conception, vérifier les dimensions et préparer votre devis.</p><p><a style="display:inline-block;background:#1e2447;color:#fff;padding:14px 20px;text-decoration:none;border-radius:6px" href="' . $escape($link) . '">Retrouver mon projet</a></p><p>Ce lien privé ouvre une copie de la version transmise, que vous pouvez modifier. Conservez-le et partagez-le uniquement avec les personnes de votre choix.</p><p>Votre PDF, votre plan DXF, votre aperçu PNG et le récapitulatif des éléments et dimensions sont joints à ce message.</p><h2 style="font-size:18px">Détail de votre projet</h2><pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px;line-height:1.5">' . $escape($details) . '</pre><hr><p>' . $contactHtml . '</p><p style="font-size:12px;color:#56627b">Dessins indicatifs. La faisabilité, les dimensions et les finitions seront confirmées avec notre équipe avant fabrication.</p></div></body></html>';
        $mail->Body=str_replace('background:#1e2447','background:'.$identity['primaryColor'],$mail->Body);
        $mail->AltBody = 'Bonjour ' . $row['firstName'] . ",\n\nMerci pour votre confiance ! Nous avons bien reçu votre projet « " . $row['projectName'] . " ».\nRetrouvez une copie de la version envoyée : " . $link . "\nCe lien est privé.\n\n" . $details . "\n\n" . $contactText . "\nDessins indicatifs, à valider avant fabrication.";
        $attachments = ['pdf'=>['plan-projet.pdf','application/pdf'],'cad'=>['plan-projet.dxf','application/dxf'],'png'=>['apercu-projet.png','image/png'],'equipment'=>['equipements-et-dimensions.txt','text/plain']];
        $size = 0;
        foreach ($attachments as $key => [$filename,$mime]) {
            $stored = $row['files'][$key] ?? ($key === 'png' && in_array($row['preferredFormat'], ['png2d','png3d'], true) ? ($row['files']['selection'] ?? '') : '');
            $path = $dir . '/' . basename((string)$stored);
            if ($stored === '' || !is_file($path)) throw new RuntimeException('Pièce jointe manquante : ' . $filename);
            $size += filesize($path);
            if ($size > 15 * 1024 * 1024) throw new RuntimeException('Les pièces jointes dépassent 15 Mio. Réduisez les images du projet.');
            $contents=file_get_contents($path);
            if($contents===false)throw new RuntimeException('Lecture de la pièce jointe impossible : '.$filename);
            $mail->addStringAttachment($contents, $filename, 'base64', $mime);
        }
        $mail->send();
        $state = ['status'=>'sent','updatedAt'=>gmdate(DATE_ATOM)];
        csm_write_json($dir . '/mail-status.json', $state);@unlink($dir.'/mail-diagnostic.json');return $state;
    } catch (Throwable $error) {
        $diagnostic=$error->getMessage();
        if(isset($config['password'])&&$config['password']!=='')$diagnostic=str_replace($config['password'],'[masqué]',$diagnostic);
        csm_write_json($dir.'/mail-diagnostic.json',['error'=>substr($diagnostic,0,1000),'updatedAt'=>gmdate(DATE_ATOM)]);
        $state = ['status'=>'failed','updatedAt'=>gmdate(DATE_ATOM),'error'=>'Le serveur SMTP n’a pas accepté le message ou le dossier est incomplet. Vérifiez la configuration, le test SMTP et les pièces jointes.'];
        csm_write_json($dir . '/mail-status.json', $state); return $state;
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}

/** Public submissions may send only a bounded number of confirmations. */
function csm_submission_limit(string $email): bool {
    $base = csm_private_base(); if (!is_dir($base) && !mkdir($base,0700,true) && !is_dir($base)) throw new RuntimeException('Stockage privé indisponible.');
    $lock = fopen($base . '/submission-limits.lock','c'); if (!$lock || !flock($lock,LOCK_EX)) throw new RuntimeException('Vérification du formulaire indisponible.');
    try {
        $path=$base . '/submission-limits.json';$items=is_file($path)?json_decode((string)file_get_contents($path),true):[];
        if (!is_array($items)) $items=[]; $now=time();
        $items=array_filter($items,static function($item)use($now){return is_array($item)&&($item['until']??0)>$now;});
        $keys=['ip:'.hash('sha256',(string)($_SERVER['REMOTE_ADDR']??''))=>10,'mail:'.hash('sha256',strtolower($email))=>3];
        foreach($keys as $key=>$maximum)if(($items[$key]['count']??0)>=$maximum)return false;
        foreach($keys as $key=>$maximum)$items[$key]=['count'=>($items[$key]['count']??0)+1,'until'=>$items[$key]['until']??$now+3600];
        csm_write_json($path,$items);return true;
    } finally {flock($lock,LOCK_UN);fclose($lock);}
}
