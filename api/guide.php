<?php
// Guide download form (POST /api/guide, JSON body from static/guide.js).
// Emails the PDF, queues two follow-ups (J+3, J+7), adds newsletter opt-ins to the list
// and notifies contact@scenagrowth.fr. Answers {"ok": true}.

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
require __DIR__ . '/../private/guide-lib.php';

function reply($code, $payload) {
    http_response_code($code);
    echo json_encode($payload);
    exit;
}

function clean($value, $max) {
    $value = str_replace(array("\r", "\n", "\t", "\0"), ' ', is_scalar($value) ? (string) $value : '');
    return trim(mb_substr($value, 0, $max, 'UTF-8'));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(405, array('ok' => false, 'error' => 'Method not allowed'));
}

$data = json_decode(file_get_contents('php://input', false, null, 0, 10000), true);
if (!is_array($data)) $data = $_POST;
if (!is_array($data) || !$data) {
    reply(400, array('ok' => false, 'error' => 'Invalid request'));
}

// Honeypot: bots fill the hidden field, we pretend success.
if (clean(isset($data['website']) ? $data['website'] : '', 200) !== '') {
    reply(200, array('ok' => true));
}

$get = function ($k, $max) use ($data) { return clean(isset($data[$k]) ? $data[$k] : '', $max); };
$lang = $get('lang', 2) === 'en' ? 'en' : 'fr';
$markets = array('Émirats', 'France', 'Les deux', 'UAE', 'Both');
$d = array(
    'lang' => $lang,
    'firstName' => $get('firstName', 80),
    'email' => $get('email', 200),
    'brand' => $get('brand', 120),
    'market' => in_array($get('market', 40), $markets, true) ? $get('market', 40) : '',
    'newsletter' => isset($data['newsletter']) && in_array($data['newsletter'], array(true, 'true', 'on', 'yes', '1', 1), true)
);
if ($d['firstName'] === '' || !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
    reply(400, array('ok' => false, 'error' => 'Missing required fields'));
}

// 1. The guide itself: if this fails, the visitor must know.
$m = guide_messages($d);
$pdf = $lang === 'en' ? array(GUIDE_PDF_EN, 'Scena-Guide-Perfume-Price-Dubai.pdf') : array(GUIDE_PDF, 'Scena-Guide-prix-parfum-Dubai.pdf');
if (!guide_mail($d['email'], $m['guide']['subject'], $m['guide']['text'], 'zacharie.courie@scenagrowth.fr', $pdf[0], $pdf[1])) {
    reply(502, array('ok' => false, 'error' => 'Send failed'));
}

// 2–4 are best effort: a failure never reaches the visitor.
if (!guide_stopped($d['email'])) {
    @guide_queue_add($d);
    if ($d['newsletter']) @guide_newsletter_add($d['email'], $d['firstName'], $d['brand'], $d['market'], $lang === 'en' ? 'Guide perfume price Dubai (EN)' : 'Guide prix parfum Dubaï');
}

$notify = "Guide téléchargé : " . ($lang === 'en' ? "version anglaise « The real price of a French perfume in Dubai »" : "« Le vrai prix d’un parfum français à Dubaï »") . "\n\n"
        . "Prénom : {$d['firstName']}\n"
        . "E-mail : {$d['email']}\n"
        . ($d['brand'] !== '' ? "Marque : {$d['brand']}\n" : '')
        . ($d['market'] !== '' ? "Marché visé : {$d['market']}\n" : '')
        . 'Newsletter : ' . ($d['newsletter'] ? 'oui, ajouté à la liste' : 'non') . "\n"
        . "Suivi automatique : J+3 et J+7\n";
@mail(GUIDE_NOTIFY, guide_header_name("Guide téléchargé : {$d['firstName']}" . ($d['brand'] !== '' ? " ({$d['brand']})" : '')),
      $notify, "From: SCENA Growth (site) <site@scenagrowth.fr>\r\nReply-To: {$d['email']}\r\nMIME-Version: 1.0\r\n"
      . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n");

// Follow-ups that fell due since the last run (in addition to the daily cron).
@guide_queue_run();

reply(200, array('ok' => true));
