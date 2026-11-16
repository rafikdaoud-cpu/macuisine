<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, max-age=0');

function jsonReply(int $status, array $payload): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function privatePaths(): array {
    $documentRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
    if ($documentRoot === false) jsonReply(500, ['error' => 'Stockage privé indisponible.']);
    $dir = dirname($documentRoot) . DIRECTORY_SEPARATOR . '.macuisine_catalog';
    return [$dir, $dir . DIRECTORY_SEPARATOR . 'admin.key', $dir . DIRECTORY_SEPARATOR . 'leads.json', $dir . DIRECTORY_SEPARATOR . 'leads.lock'];
}

function adminAuthorized(string $keyPath): bool {
    if (!is_file($keyPath)) return false;
    $expected = trim((string)file_get_contents($keyPath));
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $providedKey = trim((string)($_SERVER['HTTP_X_MACUISINE_ADMIN_KEY'] ?? ''));
    if ($providedKey === '') {
        foreach ($headers as $headerName => $headerValue) {
            if (strcasecmp((string)$headerName, 'X-Macuisine-Admin-Key') === 0) { $providedKey = trim((string)$headerValue); break; }
        }
    }
    if ($expected !== '' && $providedKey !== '' && hash_equals($expected, $providedKey)) return true;
    $authorization = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $headers['Authorization'] ?? $headers['authorization'] ?? '');
    return preg_match('/^Bearer[[:space:]]+(.+)$/i', $authorization, $match) === 1
        && $expected !== ''
        && hash_equals($expected, trim($match[1]));
}

function csvSafe(string $value): string {
    return preg_match('/^[=+@\-]/u', $value) === 1 ? "'" . $value : $value;
}

[$privateDir, $keyPath, $dataPath, $lockPath] = privatePaths();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!adminAuthorized($keyPath)) jsonReply(401, ['error' => 'Clé administrateur incorrecte.']);
    $records = [];
    if (is_file($dataPath)) {
        $size = filesize($dataPath);
        if ($size === false || $size > 20 * 1024 * 1024) jsonReply(507, ['error' => 'Le fichier des demandes dépasse la limite de téléchargement.']);
        $raw = file_get_contents($dataPath);
        $stored = is_string($raw) ? json_decode($raw, true) : null;
        if (!is_array($stored) || !isset($stored['leads']) || !is_array($stored['leads'])) jsonReply(500, ['error' => 'Le fichier des demandes est illisible.']);
        $records = $stored['leads'];
    }
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="demandes-macuisine-' . gmdate('Ymd') . '.csv"');
    echo "\xEF\xBB\xBF";
    $out = fopen('php://output', 'wb');
    if ($out === false) exit;
    fputcsv($out, ['date_utc', 'nom', 'prenom', 'email', 'telephone', 'nom_du_projet'], ';', '"', '\\');
    foreach ($records as $record) {
        fputcsv($out, [
            csvSafe((string)($record['createdAt'] ?? '')),
            csvSafe((string)($record['lastName'] ?? '')),
            csvSafe((string)($record['firstName'] ?? '')),
            csvSafe((string)($record['email'] ?? '')),
            csvSafe((string)($record['phone'] ?? '')),
            csvSafe((string)($record['projectName'] ?? '')),
        ], ';', '"', '\\');
    }
    fclose($out);
    exit;
}

if ($method !== 'POST') jsonReply(405, ['error' => 'Méthode non autorisée.']);
if (!is_file($keyPath)) jsonReply(503, ['error' => 'Le stockage des demandes doit être configuré sur le serveur.']);

$contentType = strtolower(trim(explode(';', (string)($_SERVER['CONTENT_TYPE'] ?? ''))[0]));
if ($contentType !== 'application/json') jsonReply(415, ['error' => 'Format de requête invalide.']);
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($contentLength > 8192) jsonReply(413, ['error' => 'Formulaire trop volumineux.']);
$raw = file_get_contents('php://input');
if (!is_string($raw) || strlen($raw) > 8192) jsonReply(413, ['error' => 'Formulaire trop volumineux.']);
$input = json_decode($raw, true);
if (!is_array($input)) jsonReply(400, ['error' => 'Formulaire invalide.']);

foreach (['lastName', 'firstName', 'email', 'phone', 'projectName'] as $field) {
    if (isset($input[$field]) && !is_string($input[$field])) jsonReply(400, ['error' => 'Formulaire invalide.']);
}
$lastName = trim((string)($input['lastName'] ?? ''));
$firstName = trim((string)($input['firstName'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$phone = trim((string)($input['phone'] ?? ''));
$projectName = trim((string)($input['projectName'] ?? 'Ma cuisine'));
if ($lastName === '' || strlen($lastName) > 400 || $firstName === '' || strlen($firstName) > 400
    || strlen($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false
    || strlen($phone) < 6 || strlen($phone) > 25
    || preg_match('/^[+()0-9.\s-]+$/', $phone) !== 1
    || preg_match_all('/[0-9]/', $phone) < 6
    || ($input['consent'] ?? false) !== true
    || strlen($projectName) > 320) {
    jsonReply(400, ['error' => 'Vérifiez les coordonnées et cochez la case de consentement.']);
}
if (preg_match('/[\x00-\x1F\x7F]/', $lastName . $firstName . $projectName) === 1) jsonReply(400, ['error' => 'Le formulaire contient un caractère invalide.']);

if (!is_dir($privateDir) && !mkdir($privateDir, 0700, true) && !is_dir($privateDir)) jsonReply(500, ['error' => 'Impossible de créer le stockage privé.']);
@chmod($privateDir, 0700);
$lock = fopen($lockPath, 'c');
if ($lock === false) jsonReply(500, ['error' => 'Impossible d’enregistrer la demande.']);
@chmod($lockPath, 0600);
if (!flock($lock, LOCK_EX)) { fclose($lock); jsonReply(500, ['error' => 'Impossible d’enregistrer la demande.']); }

$records = [];
if (is_file($dataPath)) {
    $size = filesize($dataPath);
    if ($size === false || $size > 20 * 1024 * 1024) {
        flock($lock, LOCK_UN); fclose($lock);
        jsonReply(507, ['error' => 'Le stockage des demandes a atteint sa limite.']);
    }
    $storedRaw = file_get_contents($dataPath);
    $stored = is_string($storedRaw) ? json_decode($storedRaw, true) : null;
    if (!is_array($stored) || !isset($stored['leads']) || !is_array($stored['leads'])) {
        flock($lock, LOCK_UN); fclose($lock);
        jsonReply(500, ['error' => 'Le stockage des demandes est illisible.']);
    }
    $records = $stored['leads'];
}
if (count($records) >= 20000) {
    flock($lock, LOCK_UN); fclose($lock);
    jsonReply(507, ['error' => 'Le stockage des demandes est plein.']);
}
$records[] = [
    'createdAt' => gmdate(DATE_ATOM),
    'lastName' => $lastName,
    'firstName' => $firstName,
    'email' => $email,
    'phone' => $phone,
    'projectName' => $projectName,
];
$json = json_encode(['leads' => $records], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if (!is_string($json)) {
    flock($lock, LOCK_UN); fclose($lock);
    jsonReply(500, ['error' => 'Impossible d’enregistrer la demande.']);
}
$tempPath = $dataPath . '.tmp-' . bin2hex(random_bytes(6));
$saved = file_put_contents($tempPath, $json, LOCK_EX);
if ($saved === false || !rename($tempPath, $dataPath)) {
    @unlink($tempPath); flock($lock, LOCK_UN); fclose($lock);
    jsonReply(500, ['error' => 'Impossible d’enregistrer la demande.']);
}
@chmod($dataPath, 0600);
flock($lock, LOCK_UN);
fclose($lock);
jsonReply(201, ['saved' => true]);
