<?php
/*
 * Finverse - first-party analytics endpoint.
 *
 * assets/js/track.js posts a small JSON event here; each event becomes one
 * line in ../finverse-analytics.log, outside the web root. No cookies and no
 * third-party service are used. The visitor IP is keyed with a rotating HMAC.
 */

declare(strict_types=1);

date_default_timezone_set('Asia/Shanghai');

const FV_LOG         = __DIR__ . '/../finverse-analytics.log';
const FV_MAX         = 5242880; /* 5 MB, then rotate to .1 */
const FV_CONFIG_FILE = __DIR__ . '/../finverse-config.php';
const FV_LEGACY_FILE = __DIR__ . '/../finverse-mail-config.php';
const FV_EVENTS = [
    'pageview', 'scroll', 'click', 'dwell',
    'form_open', 'form_submit', 'form_ok', 'form_fail', 'copy',
];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function fv_config(): array
{
    $paths = [
        trim((string) getenv('FINVERSE_CONFIG')),
        FV_CONFIG_FILE,
        FV_LEGACY_FILE,
    ];

    foreach (array_unique(array_filter($paths)) as $path) {
        if (!is_readable($path)) {
            continue;
        }
        $loaded = include $path;
        if (is_array($loaded)) {
            return $loaded;
        }
    }

    return [];
}

function fv_setting(array $config, string $key, string $envKey): string
{
    $env = getenv($envKey);
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }
    $value = $config[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function fv_clean(string $value, int $max): string
{
    $value = (string) preg_replace('/[\x00-\x1F\x7F]/', ' ', $value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max);
}

function fv_reply(int $status, string $body): void
{
    http_response_code($status);
    echo $body;
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fv_reply(405, '{"ok":false}');
}

/* Honour Do Not Track and drop obvious bots before touching the log. */
if ((string) ($_SERVER['HTTP_DNT'] ?? '') === '1') {
    fv_reply(204, '');
}

$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if (preg_match('/bot|crawler|spider|slurp|headless|preview/i', $ua)) {
    fv_reply(204, '');
}

$config = fv_config();
$salt = fv_setting($config, 'analytics_salt', 'FINVERSE_ANALYTICS_SALT');
if (strlen($salt) < 16 || str_starts_with($salt, 'replace-')) {
    fv_reply(503, '{"ok":false,"error":"analytics_not_configured"}');
}

$raw = file_get_contents('php://input', false, null, 0, 8192);
$data = json_decode((string) $raw, true);

if (!is_array($data)) {
    fv_reply(400, '{"ok":false}');
}

$event = (string) ($data['e'] ?? '');
if (!in_array($event, FV_EVENTS, true)) {
    fv_reply(400, '{"ok":false}');
}

$referrer = (string) ($data['r'] ?? '');
$referrerHost = '';
if ($referrer !== '') {
    $host = parse_url($referrer, PHP_URL_HOST);
    if (is_string($host)) {
        $referrerHost = $host;
    }
}

$ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
$proxySetting = getenv('FINVERSE_TRUST_PROXY');
if (!is_string($proxySetting) || trim($proxySetting) === '') {
    $proxySetting = $config['trust_proxy'] ?? false;
}
$trustProxy = filter_var($proxySetting, FILTER_VALIDATE_BOOLEAN);
$forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');
if ($trustProxy && $forwarded !== '') {
    $parts = explode(',', $forwarded);
    $ip = trim($parts[0]);
}

$visitor = substr(hash_hmac('sha256', date('Y-m-d') . '|' . $ip, $salt), 0, 12);
$value = is_numeric($data['v'] ?? null) ? (int) $data['v'] : 0;

$line = json_encode([
    'ts'  => date('c'),
    'e'   => $event,
    'v'   => $value,
    'p'   => fv_clean((string) ($data['p'] ?? ''), 160),
    'ref' => fv_clean($referrerHost, 80),
    'w'   => (int) ($data['w'] ?? 0),
    'h'   => (int) ($data['h'] ?? 0),
    'l'   => fv_clean((string) ($data['l'] ?? ''), 6),
    's'   => fv_clean((string) ($data['s'] ?? ''), 24),
    'ip'  => $visitor,
    'dev' => preg_match('/Mobi|Android|iPhone/i', $ua) ? 'mobile' : 'desktop',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if (is_file(FV_LOG) && filesize(FV_LOG) > FV_MAX) {
    @rename(FV_LOG, FV_LOG . '.1');
}

@file_put_contents(FV_LOG, $line . "\n", FILE_APPEND | LOCK_EX);

fv_reply(204, '');
