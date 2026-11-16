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
if ($documentRoot === false) reply(500, ['error' => 'Stockage privé indisponible.']);
$keyPath = dirname($documentRoot) . DIRECTORY_SEPARATOR . '.macuisine_catalog' . DIRECTORY_SEPARATOR . 'admin.key';
if (!is_file($keyPath)) reply(503, ['error' => 'Clé administrateur non configurée sur le serveur.']);
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
if (!$keyMatches && !$bearerMatches) reply(401, ['error' => 'Clé administrateur incorrecte.']);
reply(200, ['authenticated' => true]);
