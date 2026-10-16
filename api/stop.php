<?php
// Opt-out link sent in the guide follow-ups (GET /api/stop?e=...&t=...).
// Stops the follow-ups and removes the address from the newsletter list.

require __DIR__ . '/../private/guide-lib.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$email = isset($_GET['e']) ? trim((string) $_GET['e']) : '';
$ok = filter_var($email, FILTER_VALIDATE_EMAIL) && guide_stop_valid($email, isset($_GET['t']) ? $_GET['t'] : '');
if ($ok) {
    guide_add_stop($email);
    @mail(GUIDE_NOTIFY, guide_header_name('Désinscription : ' . $email),
          "Cette adresse ne recevra plus les emails de suivi ni la newsletter :\n$email\n",
          "From: SCENA Growth (site) <site@scenagrowth.fr>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n");
}
http_response_code($ok ? 200 : 400);
?><!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/><title>Désinscription | Scena Growth</title><link rel="stylesheet" href="/static/scena.css?v=26"/></head>
<body style="background:#11100E;color:#F4EFE6;min-height:100vh;display:grid;place-items:center;padding:24px">
<main style="max-width:520px;text-align:center"><p class="mono" style="letter-spacing:.14em">SCENA GROWTH</p>
<h1 class="serif" style="font-size:40px;margin:16px 0"><?php echo $ok ? 'C’est noté.' : 'Lien non valide.'; ?></h1>
<p><?php echo $ok ? 'Vous ne recevrez plus nos emails de suivi ni notre newsletter.' : 'Écrivez-nous à contact@scenagrowth.fr et nous vous retirerons de la liste.'; ?></p>
<p style="margin-top:24px"><a href="https://www.scenagrowth.fr/" style="color:inherit">scenagrowth.fr</a></p></main></body></html>
