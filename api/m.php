<?php
// First-party audience measurement (POST /api/m, sent by static/scena.js with sendBeacon).
// No cookie, no IP address, no identifier: one line per page view or event in
// private/stats/YYYY-MM.csv (date;host;page;event;source;device;lang).
// Once a week, the first hit after Monday 00:00 (Paris) emails last week's report to contact@scenagrowth.fr.

header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
http_response_code(204);

$ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
if ($ua === '' || preg_match('/bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|scrapy/i', $ua)) exit;

$data = json_decode(file_get_contents('php://input', false, null, 0, 2000), true);
if (!is_array($data)) exit;

function m_clean($v, $max, $pattern) {
    $v = is_scalar($v) ? substr((string) $v, 0, $max) : '';
    return preg_match($pattern, $v) ? $v : '';
}
$host = isset($_SERVER['HTTP_HOST']) && stripos($_SERVER['HTTP_HOST'], 'scenagrowth.com') !== false ? 'com' : 'fr';
$page = m_clean(isset($data['p']) ? $data['p'] : '', 200, '#^/[A-Za-z0-9/_\-]*$#');
$event = m_clean(isset($data['e']) ? $data['e'] : 'view', 30, '/^[a-z_]+$/');
$source = m_clean(isset($data['s']) ? strtolower($data['s']) : '', 80, '/^[a-z0-9.\-_]*$/');
$device = isset($data['d']) && $data['d'] === 'm' ? 'mobile' : 'desktop';
$lang = isset($data['l']) && $data['l'] === 'en' ? 'en' : 'fr';
if ($page === '' || $event === '') exit;
if (preg_match('/(^|\.)scenagrowth\.(fr|com)$/', $source)) $source = '';

date_default_timezone_set('Europe/Paris');
$dir = __DIR__ . '/../private/stats';
if (!is_dir($dir)) @mkdir($dir, 0750, true);
$line = implode(';', array(date('c'), $host, $page, $event, $source, $device, $lang)) . "\n";
@file_put_contents("$dir/" . date('Y-m') . '.csv', $line, FILE_APPEND | LOCK_EX);

// Weekly report (last Monday → Sunday), sent once.
$end = strtotime('monday this week');   // this Monday 00:00
$start = $end - 7 * 86400;
$week = date('o-\WW', $start);
$flag = "$dir/report-$week.sent";
if (is_file($flag)) exit;
$fp = @fopen("$dir/report.lock", 'c');
if (!$fp || !flock($fp, LOCK_EX | LOCK_NB)) exit;
if (is_file($flag)) exit;
@touch($flag);

$rows = array();
foreach (array(date('Y-m', $start), date('Y-m', $end - 1)) as $m) {
    $f = "$dir/$m.csv";
    if (!is_file($f) || isset($rows[$m])) continue;
    $rows[$m] = file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}
$views = array(); $events = array(); $sources = array(); $devices = array('mobile' => 0, 'desktop' => 0); $total = 0;
foreach ($rows as $lines) foreach ($lines as $l) {
    $c = explode(';', $l);
    if (count($c) < 7) continue;
    $t = strtotime($c[0]);
    if ($t < $start || $t >= $end) continue;
    $key = ($c[1] === 'com' ? 'scenagrowth.com' : 'scenagrowth.fr') . $c[2];
    if ($c[3] === 'view') {
        $total++;
        $views[$key] = (isset($views[$key]) ? $views[$key] : 0) + 1;
        $devices[$c[5]]++;
        $s = $c[4] !== '' ? $c[4] : 'direct / inconnu';
        $sources[$s] = (isset($sources[$s]) ? $sources[$s] : 0) + 1;
    } else {
        $events[$c[3]][$key] = (isset($events[$c[3]][$key]) ? $events[$c[3]][$key] : 0) + 1;
    }
}
if (!$total) exit;
arsort($views); arsort($sources);
$labels = array('whatsapp' => 'Clics « Réserver un échange » (WhatsApp)', 'form_contact' => 'Formulaires de contact envoyés',
                'form_guide' => 'Guides demandés', 'form_exemples' => 'Exemples demandés');
$txt = "Semaine du " . date('d/m/Y', $start) . " au " . date('d/m/Y', $end - 1) . "\n\n"
     . "Pages vues : $total (mobile {$devices['mobile']}, ordinateur {$devices['desktop']})\n\n";
foreach ($labels as $k => $label) {
    $n = isset($events[$k]) ? array_sum($events[$k]) : 0;
    $txt .= "$label : $n\n";
    if ($n) { arsort($events[$k]); foreach ($events[$k] as $p => $v) $txt .= "   $v  $p\n"; }
}
$txt .= "\nPages les plus vues :\n";
foreach (array_slice($views, 0, 15, true) as $p => $v) $txt .= "   $v  $p\n";
$txt .= "\nProvenance :\n";
foreach (array_slice($sources, 0, 10, true) as $s => $v) $txt .= "   $v  $s\n";
$txt .= "\nMesure sans cookie ni adresse IP. Données brutes : www/private/stats/ sur l'hébergement OVH.\n";
@mail('contact@scenagrowth.fr', '=?UTF-8?B?' . base64_encode('Scena Growth · audience de la semaine ' . date('d/m', $start)) . '?=', $txt,
      "From: SCENA Growth (site) <site@scenagrowth.fr>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n");
