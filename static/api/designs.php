<?php
declare(strict_types=1);
require_once __DIR__ . '/mail-service.php';
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, max-age=0');

function reply(int $status, array $body): void {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
function storagePaths(): array {
    $root = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($root === false) reply(500, ['error' => 'Stockage privé indisponible.']);
    $base = dirname($root) . DIRECTORY_SEPARATOR . '.macuisine_catalog';
    return [$base, $base . DIRECTORY_SEPARATOR . 'admin.key', $base . DIRECTORY_SEPARATOR . 'design_requests'];
}
function isAdmin(string $path): bool {
    if (!is_file($path)) return false;
    $expected = trim((string)@file_get_contents($path));
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $provided = trim((string)($_SERVER['HTTP_X_MACUISINE_ADMIN_KEY'] ?? ''));
    if ($provided === '') foreach ($headers as $name => $value) if (strcasecmp((string)$name, 'X-Macuisine-Admin-Key') === 0) { $provided = trim((string)$value); break; }
    if ($expected !== '' && $provided !== '' && hash_equals($expected, $provided)) return true;
    $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    return preg_match('/^Bearer[[:space:]]+(.+)$/i', $auth, $m) === 1 && $expected !== '' && hash_equals($expected, trim($m[1]));
}
[$basePath, $keyPath, $requestDir] = storagePaths();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    if (!isAdmin($keyPath)) reply(401, ['error' => 'Clé administrateur incorrecte.']);
    $indexPath = $requestDir . DIRECTORY_SEPARATOR . 'requests.json';
    $records = [];
    if (is_file($indexPath)) {
        $raw = file_get_contents($indexPath); $data = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($data) || !isset($data['requests']) || !is_array($data['requests'])) reply(500, ['error' => 'La liste des dossiers est illisible.']);
        $records = $data['requests'];
    }
    if (isset($_GET['id'], $_GET['file'])) {
        $id = (string)$_GET['id']; $file = (string)$_GET['file'];
        $allowed = ['selection' => 'aperçu', 'pdf' => 'plan-projet.pdf', 'cad' => 'plan-projet.dxf', 'equipment' => 'equipements-et-dimensions.txt', 'project' => 'projet-modifiable.json', 'png'=>'apercu-projet.png'];
        if (!preg_match('/^[a-f0-9]{24}$/', $id) || !isset($allowed[$file])) reply(400, ['error' => 'Fichier demandé invalide.']);
        $record = null; foreach ($records as $row) if (($row['id'] ?? '') === $id) { $record = $row; break; }
        if (!$record || !isset($record['files'][$file])) reply(404, ['error' => 'Fichier introuvable.']);
        $path = $requestDir . DIRECTORY_SEPARATOR . $id . DIRECTORY_SEPARATOR . basename((string)$record['files'][$file]);
        if (!is_file($path)) reply(404, ['error' => 'Fichier introuvable.']);
        $name = basename((string)$record['files'][$file]);
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . str_replace('"', '', $name) . '"');
        header('Content-Length: ' . filesize($path)); readfile($path); exit;
    }
    header('Content-Type: application/json; charset=utf-8');
    foreach ($records as &$record) $record['mail'] = csm_mail_status((string)$record['id']);
    unset($record);
    echo json_encode(['items' => array_reverse($records)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
if ($method !== 'POST') reply(405, ['error' => 'Méthode non autorisée.']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $sourceHost = parse_url($origin, PHP_URL_HOST);
    $targetHost = parse_url('https://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!is_string($sourceHost) || !is_string($targetHost) || strcasecmp($sourceHost, $targetHost) !== 0) reply(403, ['error' => 'Origine de la demande non autorisée.']);
}
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 50 * 1024 * 1024) reply(413, ['error' => 'Le dossier dépasse la limite de 50 Mio.']);
foreach (['lastName','firstName','email','phone','projectName','preferredFormat'] as $field) if (!isset($_POST[$field]) || !is_string($_POST[$field])) reply(400, ['error' => 'Coordonnées incomplètes.']);
$last = trim($_POST['lastName']); $first = trim($_POST['firstName']); $email = trim($_POST['email']); $phone = trim($_POST['phone']); $project = trim($_POST['projectName']); $format = $_POST['preferredFormat'];
if ($last === '' || strlen($last) > 300 || $first === '' || strlen($first) > 300 || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || strlen($phone) < 6 || strlen($phone) > 25 || preg_match('/^[+()0-9.\s-]+$/', $phone) !== 1 || preg_match_all('/[0-9]/', $phone) < 6
    || $project === '' || strlen($project) > 320 || !in_array($format, ['png2d','png3d','pdf','dwg'], true) || ($_POST['consent'] ?? '') !== 'true') reply(400, ['error' => 'Vérifiez les coordonnées et votre accord de transmission.']);
if (preg_match('/[\x00-\x1F\x7F]/', $last . $first . $project) === 1) reply(400, ['error' => 'Le formulaire contient un caractère invalide.']);
$projectKind = $_POST['projectKind'] ?? 'kitchen';
if (!is_string($projectKind) || !in_array($projectKind, ['kitchen', 'dressing', 'furniture'], true)) reply(400, ['error' => 'Type de projet invalide.']);
$names = ['selection' => ['png2d'=>'apercu-2d.png','png3d'=>'apercu-3d.png','pdf'=>'apercu.pdf','dwg'=>'apercu.dxf'][$format], 'pdf'=>'plan-projet.pdf', 'cad'=>'plan-projet.dxf', 'equipment'=>'equipements-et-dimensions.txt'];
// Older clients still send four files; newer clients add a private, downloadable native project.
if (isset($_FILES['project'])) {
    $upload = $_FILES['project'];
    if (!is_array($upload) || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_string($upload['tmp_name'] ?? null) || !is_uploaded_file($upload['tmp_name']) || !is_int($upload['size'] ?? null) || $upload['size'] < 1 || $upload['size'] > 20 * 1024 * 1024) reply(400, ['error' => 'Projet modifiable invalide ou trop volumineux.']);
    $native = json_decode((string)file_get_contents($upload['tmp_name']), true, 128);
    if (!is_array($native) || !is_string($native['id'] ?? null) || !is_string($native['name'] ?? null) || !is_array($native['floors'] ?? null) || count($native['floors']) < 1 || count($native['floors']) > 100 || !is_string($native['activeFloorId'] ?? null)) reply(400, ['error' => 'Le fichier de projet ne contient pas un plan valide.']);
    unset($native);
    $names['project'] = 'projet-modifiable.json';
}
if (isset($_FILES['png'])) $names['png']='apercu-projet.png';
$total = 0;
foreach ($names as $key => $_) {
    if (!isset($_FILES[$key]) || !is_array($_FILES[$key]) || ($_FILES[$key]['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_string($_FILES[$key]['tmp_name'] ?? null) || !is_int($_FILES[$key]['size'] ?? null) || !is_uploaded_file($_FILES[$key]['tmp_name'])) reply(400, ['error' => 'Un des fichiers du dossier est manquant ou incomplet.']);
    $size = (int)$_FILES[$key]['size']; if ($size < 1 || $size > 20 * 1024 * 1024) reply(413, ['error' => 'Un fichier dépasse la limite de 20 Mio.']); $total += $size;
    if($key==='equipment'&&$size>1024*1024)reply(413,['error'=>'Le récapitulatif dépasse la limite de 1 Mio.']);
}
if ($total > 45 * 1024 * 1024) reply(413, ['error' => 'Le dossier complet dépasse la limite de 45 Mio.']);
if (isset($names['png']) && file_get_contents($_FILES['png']['tmp_name'], false, null, 0, 8) !== "\x89PNG\r\n\x1a\n") reply(400, ['error'=>'Aperçu PNG invalide.']);
if (file_get_contents($_FILES['pdf']['tmp_name'], false, null, 0, 5) !== '%PDF-') reply(400, ['error'=>'PDF invalide.']);
try { if (!csm_submission_limit($email)) reply(429, ['error'=>'Trop de demandes. Réessayez plus tard ou contactez notre équipe.']); }
catch (Throwable $error) { reply(500, ['error'=>'Enregistrement temporairement indisponible.']); }
if (!is_dir($requestDir) && !mkdir($requestDir, 0700, true) && !is_dir($requestDir)) reply(500, ['error' => 'Impossible de créer le stockage privé.']);
@chmod($requestDir, 0700);
$lock = fopen($requestDir . DIRECTORY_SEPARATOR . 'requests.lock', 'c');
if ($lock === false || !flock($lock, LOCK_EX)) reply(500, ['error' => 'Impossible d’enregistrer le dossier.']);
$indexPath = $requestDir . DIRECTORY_SEPARATOR . 'requests.json'; $records = [];
if (is_file($indexPath)) { $old = json_decode((string)file_get_contents($indexPath), true); if (!is_array($old) || !isset($old['requests']) || !is_array($old['requests'])) { flock($lock, LOCK_UN); fclose($lock); reply(500, ['error' => 'Le stockage privé est illisible.']); } $records = $old['requests']; }
if (count($records) >= 5000) { flock($lock, LOCK_UN); fclose($lock); reply(507, ['error' => 'Le stockage des dossiers est plein.']); }
$id = bin2hex(random_bytes(12)); $dir = $requestDir . DIRECTORY_SEPARATOR . $id;
if (!mkdir($dir, 0700)) { flock($lock, LOCK_UN); fclose($lock); reply(500, ['error' => 'Impossible de créer le dossier privé.']); }
$saved = [];
foreach ($names as $key => $name) {
    $target = $dir . DIRECTORY_SEPARATOR . $name;
    if (!move_uploaded_file($_FILES[$key]['tmp_name'], $target)) { foreach (glob($dir . DIRECTORY_SEPARATOR . '*') ?: [] as $item) @unlink($item); @rmdir($dir); flock($lock, LOCK_UN); fclose($lock); reply(500, ['error' => 'Impossible d’enregistrer les fichiers.']); }
    @chmod($target, 0600); $saved[$key] = $name;
}
$row = ['id'=>$id,'createdAt'=>gmdate(DATE_ATOM),'lastName'=>$last,'firstName'=>$first,'email'=>$email,'phone'=>$phone,'projectName'=>$project,'projectKind'=>$projectKind,'preferredFormat'=>$format,'files'=>$saved];
$records[] = $row; $encoded = json_encode(['requests'=>$records], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$tmp = $indexPath . '.tmp-' . bin2hex(random_bytes(5));
if (!is_string($encoded) || file_put_contents($tmp, $encoded, LOCK_EX) === false || !rename($tmp, $indexPath)) { @unlink($tmp); foreach (glob($dir . DIRECTORY_SEPARATOR . '*') ?: [] as $item) @unlink($item); @rmdir($dir); flock($lock, LOCK_UN); fclose($lock); reply(500, ['error' => 'Impossible de sauvegarder le dossier.']); }
@chmod($indexPath, 0600); flock($lock, LOCK_UN); fclose($lock);
try { $mail = csm_send_design_mail($row); } catch (Throwable $error) { $mail=['status'=>'failed']; }
reply(201, ['saved'=>true,'id'=>$id,'mail'=>$mail]);
