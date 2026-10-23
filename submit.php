<?php
/*
 * Finverse - trial request handler.
 *
 * Accepts POST (JSON or form-encoded) from the trial modal, records the
 * request outside the web root, and delivers it through a configured relay.
 *
 * Delivery order: Web3Forms, FormSubmit, then mail(). Copy
 * finverse-config.example.php to ../finverse-config.php for local secrets.
 */

declare(strict_types=1);

date_default_timezone_set('Asia/Shanghai');

const LOG_FILE      = __DIR__ . '/../finverse-submissions.log';
const CONFIG_FILE   = __DIR__ . '/../finverse-config.php';
const LEGACY_CONFIG = __DIR__ . '/../finverse-mail-config.php';

function loadConfig(): array
{
    $paths = [
        trim((string) getenv('FINVERSE_CONFIG')),
        CONFIG_FILE,
        LEGACY_CONFIG,
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

function setting(array $config, string $key, string $envKey): string
{
    $env = getenv($envKey);
    if (is_string($env) && trim($env) !== '') {
        return trim($env);
    }
    $value = $config[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

/** POST a JSON body over HTTPS. Returns [http status, response body]. */
function postJson(string $url, string $payload, array $headers = []): array
{
    $bodyHeaders = array_merge(
        ['Content-Type: application/json', 'Accept: application/json'],
        $headers
    );

    if (function_exists('curl_init')) {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_HTTPHEADER     => $bodyHeaders,
        ]);
        $response = curl_exec($handle);
        $code = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        curl_close($handle);
        return [$code, (string) $response];
    }

    $context = stream_context_create(['http' => [
        'method'        => 'POST',
        'header'        => implode("\r\n", $bodyHeaders) . "\r\n",
        'content'       => $payload,
        'timeout'       => 15,
        'ignore_errors' => true,
    ]]);
    $response = @file_get_contents($url, false, $context);
    $code = 0;
    foreach ($http_response_header ?? [] as $line) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $match)) {
            $code = (int) $match[1];
        }
    }
    return [$code, (string) $response];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    reply(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$ctype = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
$raw   = (string) file_get_contents('php://input');

if (strpos($ctype, 'application/json') !== false) {
    $decoded = json_decode($raw === '' ? '[]' : $raw, true);
    $input   = is_array($decoded) ? $decoded : [];
} else {
    $input = $_POST;
}

$field = static function (array $src, string $key, int $max): string {
    $value = $src[$key] ?? '';
    if (is_bool($value)) {
        return $value ? '1' : '';
    }
    if (!is_string($value) && !is_numeric($value)) {
        return '';
    }
    $value = str_replace(["\r", "\n", "\0", "\t"], ' ', (string) $value);
    $value = trim($value);
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max, 'UTF-8');
    }
    return substr($value, 0, $max);
};

$name    = $field($input, 'name', 80);
$company = $field($input, 'company', 120);
$phone   = $field($input, 'phone', 40);
$email   = $field($input, 'email', 160);
$trap    = $field($input, 'website', 120);
$lang    = $field($input, 'lang', 12);
$consent = $field($input, 'consent', 8);
$cross   = $field($input, 'cross_border', 8);

// Honeypot: real visitors never fill this in, so treat it as spam and stay quiet.
if ($trap !== '') {
    reply(200, ['ok' => true]);
}

$emailOk   = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
$phoneOk   = $phone !== '' && preg_match('/^[0-9+()\-\s]{6,20}$/', $phone) === 1;
$consentOk = in_array(strtolower($consent), ['1', 'true', 'yes', 'on'], true);
$crossOk   = in_array(strtolower($cross), ['1', 'true', 'yes', 'on'], true);

/* Consent is required: do not store or forward the submission without it. */
if ($name === '' || (!$emailOk && !$phoneOk) || !$consentOk || !$crossOk) {
    reply(422, ['ok' => false, 'error' => 'invalid_input']);
}

$config       = loadConfig();
$recipient    = setting($config, 'recipient', 'FINVERSE_RECIPIENT');
$relayKey     = setting($config, 'web3forms_key', 'FINVERSE_WEB3FORMS_KEY');
$formSubmitId = setting($config, 'formsubmit_id', 'FINVERSE_FORMSUBMIT_ID');
$sender       = setting($config, 'sender', 'FINVERSE_MAIL_FROM') ?: 'Finverse <noreply@mjvii.com>';
$envelope     = setting($config, 'envelope', 'FINVERSE_MAIL_ENVELOPE') ?: 'noreply@mjvii.com';

$stamp = date('Y-m-d H:i:s');
$ip    = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

$record = [
    'time'         => $stamp,
    'name'         => $name,
    'company'      => $company,
    'phone'        => $phone,
    'email'        => $email,
    'lang'         => $lang,
    'ip'           => $ip,
    'consent'      => true,
    'cross_border' => true,
];
@file_put_contents(
    LOG_FILE,
    json_encode($record, JSON_UNESCAPED_UNICODE) . PHP_EOL,
    FILE_APPEND | LOCK_EX
);

$body = implode("\r\n", [
    '新的免费试用申请',
    '',
    '姓名：' . $name,
    '公司：' . ($company !== '' ? $company : '未填写'),
    '手机：' . ($phone !== '' ? $phone : '未填写'),
    '邮箱：' . ($email !== '' ? $email : '未填写'),
    '语言：' . ($lang !== '' ? $lang : 'zh'),
    '时间：' . $stamp,
    '来源 IP：' . $ip,
    '同意：' . ($consentOk ? '已勾选隐私政策' : '未勾选'),
    '跨境：' . ($crossOk ? '已单独同意' : '未同意'),
]);

$subjectPlain = '[Finverse] 免费试用申请 - ' . $name;
$subject = function_exists('mb_encode_mimeheader')
    ? mb_encode_mimeheader($subjectPlain, 'UTF-8', 'B', "\r\n")
    : $subjectPlain;

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . $sender,
];
if ($emailOk) {
    $headers[] = 'Reply-To: ' . $email;
}
$headerBlock = implode("\r\n", $headers);

/* -------------------------------------------------------------- delivery */

$delivery = 'logged';

if ($relayKey !== '') {
    $payload = json_encode([
        'access_key' => $relayKey,
        'subject'    => $subjectPlain,
        'from_name'  => 'Finverse 官网',
        'name'       => $name,
        'company'    => $company !== '' ? $company : '-',
        'phone'      => $phone !== '' ? $phone : '-',
        'email'      => $emailOk ? $email : '',
        'language'   => $lang !== '' ? $lang : 'zh',
        'submitted'  => $stamp . ' (Asia/Shanghai)',
        'source_ip'  => $ip,
        'page'       => 'https://mjvii.com/',
    ], JSON_UNESCAPED_UNICODE);

    [$code, $response] = postJson('https://api.web3forms.com/submit', (string) $payload);
    $decoded = json_decode($response, true);
    if ($code === 200 && is_array($decoded) && !empty($decoded['success'])) {
        $delivery = 'web3forms';
    }
}

if ($delivery === 'logged' && $formSubmitId !== '') {
    $payload = json_encode([
        '_subject'  => $subjectPlain,
        '_template' => 'table',
        '_captcha'  => 'false',
        '_replyto'  => $emailOk ? $email : '',
        'name'      => $name,
        'company'   => $company !== '' ? $company : '未填写',
        'phone'     => $phone !== '' ? $phone : '未填写',
        'email'     => $emailOk ? $email : '未填写',
        'language'  => $lang !== '' ? $lang : 'zh',
        'submitted' => $stamp . ' (Asia/Shanghai)',
        'source_ip' => $ip,
        'message'   => $body,
    ], JSON_UNESCAPED_UNICODE);

    [$code, $response] = postJson(
        'https://formsubmit.co/ajax/' . rawurlencode($formSubmitId),
        (string) $payload,
        ['Origin: https://mjvii.com', 'Referer: https://mjvii.com/']
    );
    $decoded = json_decode($response, true);
    $success = is_array($decoded) && (
        ($decoded['success'] ?? false) === true ||
        strtolower((string) ($decoded['success'] ?? '')) === 'true'
    );
    if ($code === 200 && $success) {
        $delivery = 'formsubmit';
    }
}

if ($delivery === 'logged' && $recipient !== '' && filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
    $queued = @mail($recipient, $subject, $body, $headerBlock, '-f' . $envelope);
    if (!$queued) {
        $queued = @mail($recipient, $subject, $body, $headerBlock);
    }
    if ($queued) {
        $delivery = 'mail';
    }
}

if ($delivery === 'logged') {
    reply(503, ['ok' => false, 'error' => 'delivery_not_configured']);
}

reply(200, ['ok' => true, 'delivery' => $delivery]);
