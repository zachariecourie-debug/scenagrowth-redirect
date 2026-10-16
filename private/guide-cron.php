<?php
// Daily OVH scheduled task (Hébergement → Tâches planifiées - Cron → www/private/guide-cron.php):
// sends the guide follow-ups that are due. Not reachable from the web (private/.htaccess).
require __DIR__ . '/guide-lib.php';
$n = guide_queue_run();
echo date('c') . " follow-ups sent: $n\n";
