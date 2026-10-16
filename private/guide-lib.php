<?php
// Shared code for the free guide (fr/guide-prix-parfum-dubai) and the newsletter list.
// Used by api/guide.php (form), api/stop.php (opt-out link) and private/guide-cron.php (follow-ups).
//
// Runtime files written next to this one (never committed, never served — see private/.htaccess):
//   guide-queue.jsonl   follow-ups still to send (J+3, J+7)
//   newsletter.csv      people who ticked the newsletter box (guide and contact forms)
//   stop.txt            addresses that asked to stop (follow-ups and newsletter)
//   secret.txt          random key that signs the opt-out links

define('GUIDE_DIR', __DIR__);
define('GUIDE_FROM', 'Zacharie Courie <zacharie.courie@scenagrowth.fr>');
define('GUIDE_NOTIFY', 'contact@scenagrowth.fr');
define('GUIDE_PDF', GUIDE_DIR . '/Scena-Guide-prix-parfum-Dubai.pdf');
define('GUIDE_PDF_EN', GUIDE_DIR . '/Scena-Guide-Perfume-Price-Dubai.pdf');
define('GUIDE_SITE', 'https://www.scenagrowth.fr');

function guide_secret() {
    $f = GUIDE_DIR . '/secret.txt';
    $s = is_file($f) ? trim(file_get_contents($f)) : '';
    if (strlen($s) < 32) {
        $s = bin2hex(random_bytes(32));
        file_put_contents($f, $s, LOCK_EX);
    }
    return $s;
}

function guide_stop_link($email, $lang = 'fr') {
    $email = strtolower($email);
    $t = substr(hash_hmac('sha256', $email, guide_secret()), 0, 32);
    $site = $lang === 'en' ? 'https://www.scenagrowth.com' : GUIDE_SITE;
    return $site . '/api/stop?e=' . rawurlencode($email) . '&t=' . $t . ($lang === 'en' ? '&l=en' : '');
}

function guide_stop_valid($email, $t) {
    $want = substr(hash_hmac('sha256', strtolower($email), guide_secret()), 0, 32);
    return is_string($t) && hash_equals($want, $t);
}

function guide_stopped($email) {
    $f = GUIDE_DIR . '/stop.txt';
    if (!is_file($f)) return false;
    $list = array_map('trim', file($f));
    return in_array(strtolower($email), $list, true);
}

function guide_add_stop($email) {
    if (!guide_stopped($email)) {
        file_put_contents(GUIDE_DIR . '/stop.txt', strtolower($email) . "\n", FILE_APPEND | LOCK_EX);
    }
}

function guide_csv_cell($v) {
    $v = str_replace(array("\r", "\n", '"'), array(' ', ' ', '""'), (string) $v);
    // Never let a spreadsheet read a cell as a formula.
    if ($v !== '' && strpos('=+-@', $v[0]) !== false) $v = "'" . $v;
    return '"' . $v . '"';
}

// Adds someone to the newsletter list (CSV, importable into any emailing tool).
function guide_newsletter_add($email, $firstName, $brand, $market, $source) {
    $f = GUIDE_DIR . '/newsletter.csv';
    $row = array(date('c'), $email, $firstName, $brand, $market, $source);
    $line = implode(';', array_map('guide_csv_cell', $row)) . "\n";
    if (!is_file($f)) $line = "date;email;prenom;marque;marche;source\n" . $line;
    file_put_contents($f, $line, FILE_APPEND | LOCK_EX);
}

function guide_header_name($text) {
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

// Plain-text email, optionally with one PDF attached. Returns true when PHP accepted it.
function guide_mail($to, $subject, $text, $replyTo, $pdfPath = null, $pdfName = null) {
    $headers = 'From: ' . guide_header_name('Zacharie Courie · Scena Growth') . " <zacharie.courie@scenagrowth.fr>\r\n"
             . "Reply-To: $replyTo\r\n"
             . "MIME-Version: 1.0\r\n";
    if ($pdfPath && is_file($pdfPath)) {
        $b = 'scena-' . md5(uniqid('', true));
        $headers .= "Content-Type: multipart/mixed; boundary=\"$b\"\r\n";
        $body = "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$text\r\n"
              . "--$b\r\nContent-Type: application/pdf; name=\"$pdfName\"\r\nContent-Transfer-Encoding: base64\r\n"
              . "Content-Disposition: attachment; filename=\"$pdfName\"\r\n\r\n"
              . chunk_split(base64_encode(file_get_contents($pdfPath))) . "--$b--\r\n";
    } else {
        $headers .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n";
        $body = $text;
    }
    return mail($to, guide_header_name($subject), $body, $headers);
}

function guide_messages($d) {
    if (isset($d['lang']) && $d['lang'] === 'en') return guide_messages_en($d);
    $brand = $d['brand'] !== '' ? $d['brand'] : 'votre marque';
    $sign = "Zacharie Courie, CEO\nScena Growth · Paris · Dubaï · Abu Dhabi\nscenagrowth.fr";
    $stop = "\n\n—\nPour ne plus recevoir ces emails : " . guide_stop_link($d['email']);
    return array(
        'guide' => array(
            'subject' => 'Votre guide : le vrai prix d’un parfum français à Dubaï',
            'text' => "Bonjour {$d['firstName']},\n\nVoici le guide, en pièce jointe.\n\n"
                . "Un conseil pour le lire : partez de la dernière ligne. Le prix public visé en rayon décide de tout le reste.\n\n"
                . "Si vous voulez le même calcul pour $brand, répondez simplement à cet email avec un prix départ usine et le marché visé.\n\n"
                . $sign
        ),
        'j3' => array(
            'subject' => 'L’erreur que font presque toutes les marques',
            'text' => "Bonjour {$d['firstName']},\n\n"
                . "La plupart des marques fixent leur prix à Dubaï depuis l’usine, puis découvrent que les marges du distributeur et du revendeur se multiplient. Résultat : une gamme trop chère pour le rayon visé.\n\n"
                . "La méthode inverse tient en trois questions : quel prix public, quel circuit, quels formats ?\n\n"
                . "Nous la déroulons pour une marque lors d’un premier échange. Répondez à cet email, ou écrivez-nous depuis " . GUIDE_SITE . "/contact.\n\n"
                . $sign . $stop
        ),
        'j7' => array(
            'subject' => "Une question sur $brand",
            'text' => "Bonjour {$d['firstName']},\n\n"
                . "Une seule question : où en est votre projet aux Émirats, entre « on regarde » et « on a déjà un distributeur » ?\n\n"
                . "Votre réponse, même en un mot, m’aide à vous envoyer ce qui vous sert vraiment. Et si ce n’est pas le moment, dites-le-moi : je ne vous relancerai pas.\n\n"
                . "Zacharie" . $stop
        )
    );
}

function guide_messages_en($d) {
    $brand = $d['brand'] !== '' ? $d['brand'] : 'your brand';
    $sign = "Zacharie Courie, CEO\nScena Growth · Paris · Dubai · Abu Dhabi\nscenagrowth.com";
    $stop = "\n\n—\nTo stop receiving these emails: " . guide_stop_link($d['email'], 'en');
    return array(
        'guide' => array(
            'subject' => 'Your guide: the real price of a French perfume in Dubai',
            'text' => "Hello {$d['firstName']},\n\nHere is the guide, attached.\n\n"
                . "A tip for reading it: start from the last line. The target shelf price drives everything else.\n\n"
                . "If you would like the same calculation for $brand, just reply to this email with an ex-works price and your target market.\n\n"
                . $sign
        ),
        'j3' => array(
            'subject' => 'The mistake almost every brand makes',
            'text' => "Hello {$d['firstName']},\n\n"
                . "Most brands set their Dubai price from the factory, then discover that distributor and retailer margins multiply. The result: a range too expensive for the shelf they want.\n\n"
                . "The reverse method comes down to three questions: which retail price, which channel, which formats?\n\n"
                . "We walk a brand through it in a first conversation. Reply to this email, or write to us at https://www.scenagrowth.com/contact.\n\n"
                . $sign . $stop
        ),
        'j7' => array(
            'subject' => "A question about $brand",
            'text' => "Hello {$d['firstName']},\n\n"
                . "Just one question: where is your UAE project, between “we're looking” and “we already have a distributor”?\n\n"
                . "Your answer, even one word, helps me send you what is actually useful. And if now is not the time, tell me: I won't follow up again.\n\n"
                . "Zacharie" . $stop
        )
    );
}

function guide_queue_add($d) {
    $now = time();
    $entry = array('email' => $d['email'], 'firstName' => $d['firstName'], 'brand' => $d['brand'], 'lang' => isset($d['lang']) ? $d['lang'] : 'fr',
                   'j3' => $now + 3 * 86400, 'j7' => $now + 7 * 86400, 'sent' => array());
    file_put_contents(GUIDE_DIR . '/guide-queue.jsonl', json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

// Sends the follow-ups that are due; keeps the others. Safe to call often (cron and each guide request).
function guide_queue_run() {
    $f = GUIDE_DIR . '/guide-queue.jsonl';
    if (!is_file($f)) return 0;
    $fh = fopen($f, 'c+');
    if (!$fh || !flock($fh, LOCK_EX | LOCK_NB)) return 0;
    $keep = array();
    $sent = 0;
    $now = time();
    while (($line = fgets($fh)) !== false) {
        $e = json_decode($line, true);
        if (!is_array($e) || empty($e['email'])) continue;
        if (guide_stopped($e['email'])) continue;
        $m = guide_messages(array('email' => $e['email'], 'firstName' => $e['firstName'], 'brand' => $e['brand'],
                                  'lang' => isset($e['lang']) ? $e['lang'] : 'fr'));
        foreach (array('j3', 'j7') as $k) {
            if (!in_array($k, $e['sent'], true) && $now >= $e[$k]) {
                if (guide_mail($e['email'], $m[$k]['subject'], $m[$k]['text'], 'zacharie.courie@scenagrowth.fr')) {
                    $e['sent'][] = $k;
                    $sent++;
                }
                break; // at most one email per person per run
            }
        }
        if (count($e['sent']) < 2) $keep[] = json_encode($e, JSON_UNESCAPED_UNICODE);
    }
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, $keep ? implode("\n", $keep) . "\n" : '');
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $sent;
}
