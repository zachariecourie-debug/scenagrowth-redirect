/* Sample deliverables form (POST → /api/exemples). Loaded only on the examples page. */
(function () {
  var f = document.getElementById('xf'), recv = document.getElementById('xReceived'), err = document.getElementById('xfErr');
  if (!f || !recv) return;
  var en = document.documentElement.lang === 'en';
  // the confirmation is invisible until sent: keep it out of screen readers, then announce it and move focus to it
  recv.setAttribute('aria-hidden', 'true'); recv.setAttribute('role', 'status'); recv.setAttribute('tabindex', '-1');
  var btn = f.querySelector('button[type=submit]');
  // "Receive by email" on a card: tick only that document, then go to the form
  document.querySelectorAll('[data-doc]').forEach(function (a) {
    a.addEventListener('click', function () {
      f.querySelectorAll('input[name=docs]').forEach(function (c) { c.checked = c.value === a.getAttribute('data-doc'); });
    });
  });
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    ['xfn', 'xem'].forEach(function (id) {
      var el = document.getElementById(id);
      var bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
      el.closest('.fld').classList.toggle('err', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    var docs = [].map.call(f.querySelectorAll('input[name=docs]:checked'), function (c) { return c.value; });
    var dl = document.getElementById('xdocs');
    dl.classList.toggle('err', !docs.length);
    if (!docs.length) ok = false;
    if (!ok) return;
    var data = {
      firstName: f.firstName.value, email: f.email.value, brand: f.brand.value, docs: docs,
      newsletter: f.newsletter.checked, website: f.website.value, page: location.pathname, lang: en ? 'en' : 'fr'
    };
    btn.disabled = true; err.hidden = true;
    fetch('/api/exemples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'failed'); }); })
      .then(function () { f.classList.add('sent'); if (window.scenaTrack) window.scenaTrack('form_exemples'); setTimeout(function () { recv.removeAttribute('aria-hidden'); recv.classList.add('show'); try { recv.focus(); } catch (e) {} }, 400); })
      .catch(function () { err.hidden = false; err.textContent = en
          ? 'Sending failed. Write to contact@scenagrowth.fr and we will send you the samples.'
          : 'L’envoi n’a pas abouti. Écrivez-nous à contact@scenagrowth.fr et nous vous envoyons les exemples.'; })
      .then(function () { btn.disabled = false; });
  });
})();
