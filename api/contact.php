<?php
// Contact form endpoint (POST /api/contact, JSON body) — replaces the Genspark backend.
// Sends the request by e-mail to contact@scenagrowth.fr and answers {"ok": true}.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function clean($value, $max) {
    if (is_array($value)) {
        $value = implode(', ', $value);
    }
    $value = str_replace(array("\r", "\0"), '', (string) $value);
    return trim(mb_substr($value, 0, $max, 'UTF-8'));
}

function oneLine($value) {
    return trim(preg_replace('/[\r\n\t]+/', ' ', $value));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(405, array('ok' => false, 'error' => 'Method not allowed'));
}

$raw = file_get_contents('php://input', false, null, 0, 20000);
$data = json_decode($raw, true);
if (!is_array($data)) {
    reply(400, array('ok' => false, 'error' => 'Invalid request'));
}

// Honeypot field: real visitors never fill it in.
if (!empty($data['website'])) {
    reply(200, array('ok' => true));
}

// Basic rate limit: 5 requests per IP per hour.
$ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
$bucket = sys_get_temp_dir() . '/scena-contact-' . md5($ip);
$hits = array();
if (is_file($bucket)) {
    $hits = array_filter(array_map('intval', explode(',', (string) file_get_contents($bucket))), function ($t) {
        return $t > time() - 3600;
    });
}
if (count($hits) >= 5) {
    reply(429, array('ok' => false, 'error' => 'Too many requests'));
}
$hits[] = time();
@file_put_contents($bucket, implode(',', $hits));

$first   = oneLine(clean(isset($data['firstName']) ? $data['firstName'] : '', 100));
$last    = oneLine(clean(isset($data['lastName']) ? $data['lastName'] : '', 100));
$email   = oneLine(clean(isset($data['email']) ? $data['email'] : '', 200));
$company = oneLine(clean(isset($data['company']) ? $data['company'] : '', 200));
$country = oneLine(clean(isset($data['country']) ? $data['country'] : '', 100));
$current = oneLine(clean(isset($data['currentMarket']) ? $data['currentMarket'] : '', 100));
$target  = oneLine(clean(isset($data['targetMarket']) ? $data['targetMarket'] : '', 100));
$types   = oneLine(clean(isset($data['type']) ? $data['type'] : '', 500));
$message = clean(isset($data['message']) ? $data['message'] : '', 5000);
$page    = oneLine(clean(isset($data['page']) ? $data['page'] : '', 200));

if ($first === '' || $last === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(422, array('ok' => false, 'error' => 'Missing or invalid fields'));
}

$body = "Nouvelle demande depuis le site scenagrowth.fr\n\n"
      . "Prénom : $first\n"
      . "Nom : $last\n"
      . "E-mail : $email\n"
      . "Société : $company\n"
      . "Pays : $country\n"
      . "Marché actuel : $current\n"
      . "Marché visé : $target\n"
      . "Besoins : $types\n"
      . "Page : $page\n\n"
      . "Message :\n$message\n";

$subject = '=?UTF-8?B?' . base64_encode("Nouveau contact site : $first $last") . '?=';
$headers = "From: SCENA Growth (site) <site@scenagrowth.fr>\r\n"
         . "Reply-To: $email\r\n"
         . "MIME-Version: 1.0\r\n"
         . "Content-Type: text/plain; charset=UTF-8\r\n"
         . "Content-Transfer-Encoding: 8bit\r\n";

if (!mail('contact@scenagrowth.fr', $subject, $body, $headers)) {
    reply(500, array('ok' => false, 'error' => 'Mail not sent'));
}

reply(200, array('ok' => true));
