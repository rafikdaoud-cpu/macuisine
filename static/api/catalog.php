<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

function reply(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$documentRoot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
if ($documentRoot === false) reply(500, ['error' => 'Document root unavailable.']);
$privateDir = dirname($documentRoot) . DIRECTORY_SEPARATOR . '.macuisine_catalog';
$catalogPath = $privateDir . DIRECTORY_SEPARATOR . 'catalog.json';
$keyPath = $privateDir . DIRECTORY_SEPARATOR . 'admin.key';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!is_file($catalogPath)) reply(200, ['items' => []]);
    $raw = file_get_contents($catalogPath);
    $catalog = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($catalog) || !isset($catalog['items']) || !is_array($catalog['items'])) reply(500, ['error' => 'Shared catalog data is invalid.']);
    foreach ($catalog['items'] as &$item) { if (is_array($item)) { unset($item['price'], $item['currency'], $item['managedPrice']); if (!isset($item['catalogGroup'])) $item['catalogGroup'] = ($item['productType'] ?? '') === 'appliance' ? 'appliance' : 'base'; } } unset($item);
    reply(200, $catalog);
}

if ($method !== 'POST') reply(405, ['error' => 'Method not allowed.']);
if (!is_file($keyPath)) reply(503, ['error' => 'Administrator key is not configured on the server.']);
$expectedKey = trim((string)file_get_contents($keyPath));
$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedKey = trim((string)($_SERVER['HTTP_X_MACUISINE_ADMIN_KEY'] ?? ''));
if ($providedKey === '') {
    foreach ($headers as $headerName => $headerValue) {
        if (strcasecmp((string)$headerName, 'X-Macuisine-Admin-Key') === 0) { $providedKey = trim((string)$headerValue); break; }
    }
}
$authorization = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $headers['Authorization'] ?? $headers['authorization'] ?? '');
$bearerMatches = preg_match('/^Bearer[[:space:]]+(.+)$/i', $authorization, $match) === 1 && hash_equals($expectedKey, trim($match[1]));
$keyMatches = $providedKey !== '' && $expectedKey !== '' && hash_equals($expectedKey, $providedKey);
if (!$keyMatches && !$bearerMatches) reply(401, ['error' => 'Invalid administrator key.']);

$length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($length > 5 * 1024 * 1024) reply(413, ['error' => 'Catalog file exceeds 5 MiB.']);
$raw = file_get_contents('php://input');
if (is_string($raw) && strlen($raw) > 5 * 1024 * 1024) reply(413, ['error' => 'Catalog file exceeds 5 MiB.']);
$payload = is_string($raw) ? json_decode($raw, true) : null;
if (!is_array($payload) || !isset($payload['items']) || !is_array($payload['items'])) reply(400, ['error' => 'Expected an items array.']);
if (count($payload['items']) > 1000) reply(400, ['error' => 'Catalog contains too many items.']);

$clean = [];
$references = [];
$ids = [];
foreach ($payload['items'] as $index => $item) {
    if (!is_array($item)) reply(400, ['error' => 'Invalid item at row ' . ($index + 1) . '.']);
    $id = trim((string)($item['id'] ?? ''));
    $reference = trim((string)($item['reference'] ?? ''));
    $name = trim((string)($item['name'] ?? ''));
    $type = (string)($item['productType'] ?? 'furniture');
    if (!preg_match('/^[A-Za-z0-9_-]{1,80}$/', $id) || $reference === '' || strlen($reference) > 100 || $name === '' || strlen($name) > 200) reply(400, ['error' => 'Missing or invalid id, reference, or name at row ' . ($index + 1) . '.']);
    if (!in_array($type, ['furniture', 'appliance'], true)) reply(400, ['error' => 'Invalid item type at row ' . ($index + 1) . '.']);
    foreach (['width', 'depth', 'height'] as $dimension) {
        if (!isset($item[$dimension]) || !is_numeric($item[$dimension]) || (float)$item[$dimension] <= 0 || (float)$item[$dimension] > 2000) reply(400, ['error' => 'Invalid ' . $dimension . ' at row ' . ($index + 1) . '.']);
    }
    $refKey = strtolower($reference);
    if (isset($references[$refKey]) || isset($ids[$id])) reply(400, ['error' => 'Duplicate reference or id in the catalog.']);
    $references[$refKey] = true;
    $ids[$id] = true;
    $icon = trim((string)($item['icon'] ?? ($type === 'appliance' ? '🔌' : '🗄️')));
    if (strlen($icon) > 32) $icon = $type === 'appliance' ? '🔌' : '🗄️';
    $color = (string)($item['color'] ?? '#cbd5e1');
    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) $color = '#cbd5e1';
    $group = (string)($item['catalogGroup'] ?? ($type === 'appliance' ? 'appliance' : 'base'));
    if (!in_array($group, ['base', 'wall', 'tall', 'appliance', 'island', 'filler'], true)) $group = $type === 'appliance' ? 'appliance' : 'base';
    $clean[] = [
        'id' => $id, 'name' => $name, 'category' => 'Kitchen', 'reference' => $reference,
        'productType' => $type, 'catalogGroup' => $group,
        'width' => (float)$item['width'], 'depth' => (float)$item['depth'], 'height' => (float)$item['height'],
        'icon' => $icon, 'color' => $color, 'customized' => true,
    ];
}

if (!is_dir($privateDir) && !mkdir($privateDir, 0700, true) && !is_dir($privateDir)) reply(500, ['error' => 'Could not create private catalog storage.']);
$json = json_encode(['items' => $clean, 'updatedAt' => gmdate(DATE_ATOM)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if (!is_string($json)) reply(500, ['error' => 'Could not encode catalog.']);
$temporary = $catalogPath . '.tmp-' . bin2hex(random_bytes(6));
if (file_put_contents($temporary, $json, LOCK_EX) === false) reply(500, ['error' => 'Could not save catalog.']);
chmod($temporary, 0600);
if (!rename($temporary, $catalogPath)) { @unlink($temporary); reply(500, ['error' => 'Could not publish catalog.']); }
@chmod($catalogPath, 0600);
reply(200, ['items' => $clean, 'updatedAt' => gmdate(DATE_ATOM)]);
