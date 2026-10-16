/* Guide download form (POST → /api/guide). Loaded only on the guide page. */
(function () {
  var f = document.getElementById('gf'), recv = document.getElementById('gReceived'), err = document.getElementById('gfErr');
  if (!f || !recv) return;
  var btn = f.querySelector('button[type=submit]');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    ['gfn', 'gem'].forEach(function (id) {
      var el = document.getElementById(id);
      var bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
      el.closest('.fld').classList.toggle('err', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    if (!ok) return;
    var data = {
      firstName: f.firstName.value, email: f.email.value, brand: f.brand.value, market: f.market.value,
      newsletter: f.newsletter.checked, website: f.website.value, page: location.pathname,
      lang: document.documentElement.lang === 'en' ? 'en' : 'fr'
    };
    btn.disabled = true; err.hidden = true;
    fetch('/api/guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'failed'); }); })
      .then(function () { f.classList.add('sent'); setTimeout(function () { recv.classList.add('show'); }, 400); })
      .catch(function () { err.hidden = false; err.textContent = document.documentElement.lang === 'en'
          ? 'Sending failed. Write to contact@scenagrowth.fr and we will send you the guide.'
          : 'L’envoi n’a pas abouti. Écrivez-nous à contact@scenagrowth.fr et nous vous envoyons le guide.'; })
      .then(function () { btn.disabled = false; });
  });
})();
