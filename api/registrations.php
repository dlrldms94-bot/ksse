<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$dataFile = $config['data_file'];
$adminPassword = $config['admin_password'];

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function read_registrations(string $file): array
{
    if (!is_file($file)) {
        return [];
    }
    $raw = file_get_contents($file);
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function write_registrations(string $file, array $list): bool
{
    $dir = dirname($file);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    $json = json_encode($list, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    return file_put_contents($file, $json, LOCK_EX) !== false;
}

function normalize_phone(string $phone): string
{
    return preg_replace('/\D+/', '', $phone) ?? '';
}

function json_response(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $pw = $_GET['password'] ?? '';
    if (!hash_equals($adminPassword, (string) $pw)) {
        json_response(403, ['ok' => false, 'error' => 'forbidden']);
    }
    $list = read_registrations($dataFile);
    usort($list, static fn($a, $b) => ($b['id'] ?? 0) <=> ($a['id'] ?? 0));
    json_response(200, ['ok' => true, 'registrations' => $list]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        json_response(400, ['ok' => false, 'error' => 'invalid_json']);
    }

    $action = $body['action'] ?? 'register';

    if ($action === 'verify') {
        $name = trim((string) ($body['name'] ?? ''));
        $phone = normalize_phone((string) ($body['phone'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        if ($name === '' || $phone === '' || $password === '') {
            json_response(400, ['ok' => false, 'error' => 'missing_fields']);
        }
        foreach (read_registrations($dataFile) as $row) {
            if (
                ($row['name'] ?? '') === $name &&
                normalize_phone((string) ($row['phone'] ?? '')) === $phone &&
                (string) ($row['password'] ?? '') === $password
            ) {
                json_response(200, ['ok' => true, 'found' => true, 'registration' => $row]);
            }
        }
        json_response(200, ['ok' => true, 'found' => false]);
    }

    if ($action === 'register') {
        $required = ['name', 'org', 'orgType', 'title', 'phone', 'email', 'forumApply', 'forumApplyLabel', 'password'];
        foreach ($required as $key) {
            if (!isset($body[$key]) || trim((string) $body[$key]) === '') {
                json_response(400, ['ok' => false, 'error' => 'missing_' . $key]);
            }
        }

        $list = read_registrations($dataFile);
        $entry = [
            'id' => (int) round(microtime(true) * 1000),
            'createdAt' => gmdate('c'),
            'name' => trim((string) $body['name']),
            'org' => trim((string) $body['org']),
            'orgType' => trim((string) $body['orgType']),
            'title' => trim((string) $body['title']),
            'phone' => trim((string) $body['phone']),
            'email' => trim((string) $body['email']),
            'forumApply' => (string) $body['forumApply'],
            'forumApplyLabel' => (string) $body['forumApplyLabel'],
            'password' => (string) $body['password'],
        ];
        $list[] = $entry;
        if (!write_registrations($dataFile, $list)) {
            json_response(500, ['ok' => false, 'error' => 'write_failed']);
        }
        json_response(201, ['ok' => true, 'registration' => $entry]);
    }

    json_response(400, ['ok' => false, 'error' => 'unknown_action']);
}

json_response(405, ['ok' => false, 'error' => 'method_not_allowed']);
