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

// Accepts multipart/form-data (current form, optional file) or JSON (older pages still cached).
$isJson = isset($_SERVER['CONTENT_TYPE']) && stripos($_SERVER['CONTENT_TYPE'], 'application/json') !== false;
if ($isJson) {
    $raw = file_get_contents('php://input', false, null, 0, 20000);
    $data = json_decode($raw, true);
} else {
    $data = $_POST;
}
if (!is_array($data) || !$data) {
    reply(400, array('ok' => false, 'error' => 'Invalid request'));
}

// Honeypot fields: real visitors never fill them in ('website' was the old one, JSON only).
if (!empty($data['hp']) || ($isJson && !empty($data['website']))) {
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

$get = function ($k, $max) use ($data) { return oneLine(clean(isset($data[$k]) ? $data[$k] : '', $max)); };
$name    = $get('name', 200);
if ($name === '') {
    $name = trim($get('firstName', 100) . ' ' . $get('lastName', 100));
}
$site      = $get('site', 300);
$industry  = $get('industry', 200);
$objective = $get('objective', 200);
$timeline  = $get('timeline', 100);
$ptype     = $get('projectType', 200);
$have      = $get('have', 500);
$email   = oneLine(clean(isset($data['email']) ? $data['email'] : '', 200));
$company = oneLine(clean(isset($data['company']) ? $data['company'] : '', 200));
$country = oneLine(clean(isset($data['country']) ? $data['country'] : '', 100));
$current = oneLine(clean(isset($data['currentMarket']) ? $data['currentMarket'] : '', 100));
$target  = oneLine(clean(isset($data['targetMarket']) ? $data['targetMarket'] : '', 100));
$types   = oneLine(clean(isset($data['type']) ? $data['type'] : '', 500));
$message = clean(isset($data['message']) ? $data['message'] : '', 5000);
$page    = oneLine(clean(isset($data['page']) ? $data['page'] : '', 200));

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(422, array('ok' => false, 'error' => 'Missing or invalid fields'));
}

$body = "Nouvelle demande depuis le site scenagrowth.fr\n\n"
      . "Nom : $name\n"
      . "E-mail : $email\n"
      . "Société : $company\n"
      . "Site web : $site\n"
      . "Secteur : $industry\n"
      . "Marché actuel : $current\n"
      . "Marché visé : $target\n"
      . "Objectif : $objective\n"
      . "Calendrier : $timeline\n"
      . ($ptype !== '' ? "Immobilier — type de projet : $ptype\n" : '')
      . ($have !== '' ? "Immobilier — éléments disponibles : $have\n" : '')
      . ($types !== '' ? "Besoins : $types\n" : '')
      . ($country !== '' ? "Pays : $country\n" : '')
      . "Page : $page\n\n"
      . "Message :\n$message\n";

$subject = '=?UTF-8?B?' . base64_encode("Nouveau contact site : $name" . ($objective !== '' ? " — $objective" : '')) . '?=';
$headers = "From: SCENA Growth (site) <site@scenagrowth.fr>\r\n"
         . "Reply-To: $email\r\n"
         . "MIME-Version: 1.0\r\n";

// Optional project file: PDF, PNG or JPG, 10 MB max, checked by content (not by extension).
$att = null;
if (!$isJson && isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
    $up = $_FILES['file'];
    if ($up['error'] !== UPLOAD_ERR_OK || $up['size'] > 10 * 1024 * 1024 || !is_uploaded_file($up['tmp_name'])) {
        reply(413, array('ok' => false, 'error' => 'File rejected'));
    }
    $allowed = array('application/pdf' => 'pdf', 'image/png' => 'png', 'image/jpeg' => 'jpg');
    $mime = function_exists('finfo_open') ? finfo_file(finfo_open(FILEINFO_MIME_TYPE), $up['tmp_name']) : '';
    if (!isset($allowed[$mime])) {
        reply(415, array('ok' => false, 'error' => 'File type not allowed'));
    }
    $base = preg_replace('/[^A-Za-z0-9._-]+/', '-', pathinfo($up['name'], PATHINFO_FILENAME));
    $att = array('name' => substr($base ?: 'projet', 0, 80) . '.' . $allowed[$mime], 'mime' => $mime, 'data' => file_get_contents($up['tmp_name']));
    $body .= "\nPièce jointe : " . $att['name'] . ' (' . round($up['size'] / 1024) . " Ko)\n";
}

if ($att) {
    $b = 'scena-' . md5(uniqid('', true));
    $headers .= "Content-Type: multipart/mixed; boundary=\"$b\"\r\n";
    $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$body\r\n"
          . "--$b\r\nContent-Type: {$att['mime']}; name=\"{$att['name']}\"\r\nContent-Transfer-Encoding: base64\r\n"
          . "Content-Disposition: attachment; filename=\"{$att['name']}\"\r\n\r\n"
          . chunk_split(base64_encode($att['data'])) . "--$b--\r\n";
} else {
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
}

if (!mail('contact@scenagrowth.fr', $subject, $body, $headers)) {
    reply(500, array('ok' => false, 'error' => 'Mail not sent'));
}

reply(200, array('ok' => true));
