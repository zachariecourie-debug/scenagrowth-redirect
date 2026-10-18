<?php
// Sample deliverables form (POST /api/exemples, JSON body from static/exemples.js).
// Emails the chosen sample PDFs (French or English set), logs the request in
// private/exemples-leads.csv, adds newsletter opt-ins to the list and notifies contact@scenagrowth.fr.
// Answers {"ok": true}.

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
$d = array(
    'lang' => $lang,
    'firstName' => $get('firstName', 80),
    'email' => $get('email', 200),
    'brand' => $get('brand', 120),
    'newsletter' => isset($data['newsletter']) && in_array($data['newsletter'], array(true, 'true', 'on', 'yes', '1', 1), true)
);
if ($d['firstName'] === '' || !filter_var($d['email'], FILTER_VALIDATE_EMAIL)) {
    reply(400, array('ok' => false, 'error' => 'Missing required fields'));
}

// The two samples, in the visitor's language: [file in private/exemples, attachment name, label].
$dir = GUIDE_DIR . '/exemples/';
$all = $lang === 'en'
    ? array('diagnostic' => array('Scena-sample-diagnostic.pdf', 'Scena-Sample-Diagnostic.pdf', 'Sample diagnostic'),
            'monthly' => array('Scena-sample-monthly-report.pdf', 'Scena-Sample-Monthly-Report.pdf', 'Sample monthly report'))
    : array('diagnostic' => array('Scena-exemple-diagnostic.pdf', 'Scena-Exemple-Diagnostic.pdf', 'Exemple de diagnostic'),
            'monthly' => array('Scena-exemple-point-mensuel.pdf', 'Scena-Exemple-Point-mensuel.pdf', 'Exemple de point mensuel'));
$asked = isset($data['docs']) && is_array($data['docs']) ? $data['docs'] : array_keys($all);
$docs = array();
foreach ($all as $k => $doc) if (in_array($k, $asked, true) && is_file($dir . $doc[0])) $docs[$k] = $doc;
if (!$docs) reply(400, array('ok' => false, 'error' => 'No document selected'));
$labels = implode($lang === 'en' ? ' and ' : ' et ', array_map(function ($x) { return $x[2]; }, $docs));

// 1. The email with the PDFs: if this fails, the visitor must know.
if ($lang === 'en') {
    $subject = 'Your Scena Growth samples';
    $text = "Hello {$d['firstName']},\n\nAttached: $labels.\n\n"
          . "They are built on a fictional brand: the format is exactly what our clients receive, and the market figures are real, with their sources.\n\n"
          . "If you would like to talk about " . ($d['brand'] !== '' ? $d['brand'] : 'your brand') . ", just reply to this email or book a 20–30 minute call: https://www.scenagrowth.com/contact\n\n"
          . "Zacharie Courie, CEO\nScena Growth · Paris · Dubai · Abu Dhabi\nscenagrowth.com";
} else {
    $subject = 'Vos exemples Scena Growth';
    $text = "Bonjour {$d['firstName']},\n\nEn pièce jointe : $labels.\n\n"
          . "Ils portent sur une marque fictive : la forme est exactement celle que reçoivent nos clients, et les chiffres de marché sont réels, avec leurs sources.\n\n"
          . "Si vous voulez en parler pour " . ($d['brand'] !== '' ? $d['brand'] : 'votre marque') . ", répondez simplement à cet email ou réservez un échange de 20 à 30 minutes : https://www.scenagrowth.fr/contact\n\n"
          . "Zacharie Courie, CEO\nScena Growth · Paris · Dubaï · Abu Dhabi\nscenagrowth.fr";
}
$b = 'scena-' . md5(uniqid('', true));
$headers = 'From: ' . guide_header_name('Zacharie Courie · Scena Growth') . " <zacharie.courie@scenagrowth.fr>\r\n"
         . "Reply-To: zacharie.courie@scenagrowth.fr\r\nMIME-Version: 1.0\r\n"
         . "Content-Type: multipart/mixed; boundary=\"$b\"\r\n";
$body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$text\r\n";
foreach ($docs as $doc) {
    $body .= "--$b\r\nContent-Type: application/pdf; name=\"{$doc[1]}\"\r\nContent-Transfer-Encoding: base64\r\n"
           . "Content-Disposition: attachment; filename=\"{$doc[1]}\"\r\n\r\n"
           . chunk_split(base64_encode(file_get_contents($dir . $doc[0])));
}
$body .= "--$b--\r\n";
if (!mail($d['email'], guide_header_name($subject), $body, $headers)) {
    reply(502, array('ok' => false, 'error' => 'Send failed'));
}

// 2–4 are best effort: a failure never reaches the visitor.
$f = GUIDE_DIR . '/exemples-leads.csv';
$row = array(date('c'), $d['email'], $d['firstName'], $d['brand'], $lang, implode('+', array_keys($docs)), $d['newsletter'] ? 'oui' : 'non');
$line = implode(';', array_map('guide_csv_cell', $row)) . "\n";
if (!is_file($f)) $line = "date;email;prenom;marque;langue;documents;newsletter\n" . $line;
@file_put_contents($f, $line, FILE_APPEND | LOCK_EX);

if ($d['newsletter'] && !guide_stopped($d['email'])) {
    @guide_newsletter_add($d['email'], $d['firstName'], $d['brand'], '', $lang === 'en' ? 'Samples (EN)' : 'Exemples');
}

$notify = "Exemples demandés (" . ($lang === 'en' ? 'version anglaise' : 'version française') . ") : $labels\n\n"
        . "Prénom : {$d['firstName']}\n"
        . "E-mail : {$d['email']}\n"
        . ($d['brand'] !== '' ? "Marque : {$d['brand']}\n" : '')
        . 'Newsletter : ' . ($d['newsletter'] ? 'oui, ajouté à la liste' : 'non') . "\n";
@mail(GUIDE_NOTIFY, guide_header_name("Exemples demandés : {$d['firstName']}" . ($d['brand'] !== '' ? " ({$d['brand']})" : '')),
      $notify, "From: SCENA Growth (site) <site@scenagrowth.fr>\r\nReply-To: {$d['email']}\r\nMIME-Version: 1.0\r\n"
      . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n");

reply(200, array('ok' => true));
