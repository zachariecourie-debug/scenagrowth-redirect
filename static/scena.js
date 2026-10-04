/* SCENA GROWTH — interactions. Vanilla JS, one rAF loop, no dependencies.
   Production port: every module guards for the elements it needs so the same
   file runs on the homepage and on every sub-page. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => innerWidth <= 900;
  const fine = matchMedia('(pointer:fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ASSETS = '/static/assets/';
  const FRJS = document.documentElement.lang === 'fr';

  /* ---------- intro curtain (once per session) ---------- */
  const curtain = $('#curtain');
  if (curtain) {
    const liftCurtain = () => { curtain.classList.add('up'); setTimeout(() => curtain.classList.add('gone'), 1200); };
    if (RM || sessionStorage.getItem('scena-intro')) { curtain.classList.add('gone'); }
    else { sessionStorage.setItem('scena-intro', '1'); addEventListener('load', () => setTimeout(liftCurtain, 900)); setTimeout(liftCurtain, 2600); }
  }

  /* ---------- nav / menu ---------- */
  const nav = $('#nav'), burger = $('#burger'), mcta = $('#mcta');
  const closeMenu = () => { document.body.classList.remove('menu-open'); document.body.style.overflow = ''; burger && burger.setAttribute('aria-expanded', 'false'); };
  burger && burger.addEventListener('click', () => {
    const o = document.body.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(o)); document.body.style.overflow = o ? 'hidden' : '';
  });

  /* ---------- transitions: in-page jumps + route changes ---------- */
  const wipe = $('#wipe');
  const runWipe = (cb) => {
    if (!wipe || RM) { cb(); return; }
    wipe.classList.remove('run'); void wipe.offsetWidth; wipe.classList.add('run');
    setTimeout(cb, 460);
  };
  $$('a[data-go]').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href') || '';
    const wasMenu = document.body.classList.contains('menu-open');
    // In-page anchor
    if (href.startsWith('#')) {
      const t = $(href); if (!t) return;
      e.preventDefault(); closeMenu();
      const y = t.getBoundingClientRect().top + scrollY;
      if (RM) { scrollTo(0, y); return; }
      const far = Math.abs(y - scrollY) > innerHeight * 2.5;
      if (far || wasMenu) runWipe(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); document.documentElement.style.scrollBehavior = ''; });
      else scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    // Same-page hash on another route (e.g. "/#work" while on "/")
    const homeHash = href.startsWith('/#') ? href.slice(1) : href.startsWith('/fr#') ? href.slice(3) : null;
    if (homeHash && (location.pathname === '/' || location.pathname === '/fr')) {
      const t = $(homeHash); if (!t) return;
      e.preventDefault(); closeMenu();
      const y = t.getBoundingClientRect().top + scrollY;
      runWipe(() => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); document.documentElement.style.scrollBehavior = ''; });
      return;
    }
    // Route change: sun wipe, then navigate
    if (href.startsWith('/') && !a.target) {
      e.preventDefault(); closeMenu();
      runWipe(() => { location.href = href; });
    }
  }));

  /* ---------- cursor ---------- */
  const cur = $('#cursor'), curLab = $('#cursorLabel');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  if (fine && cur) {
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor]');
      if (t) { curLab.textContent = t.dataset.cursor; cur.classList.add('label'); } else cur.classList.remove('label');
    });
  }

  /* ---------- magnetic ---------- */
  if (fine && !RM) $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * .22, y = (e.clientY - r.top - r.height / 2) * .32;
      b.style.transform = `translate(${x}px,${y}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transition = 'transform .7s cubic-bezier(.22,.8,.2,1)'; b.style.transform = ''; setTimeout(() => b.style.transition = '', 700); });
  });

  /* ---------- reveals ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
    { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  let pendingReveal = $$('.reveal-t,.fade,.reveal-img,.eco-grid,.geo');
  pendingReveal.forEach(el => io.observe(el));
  const revealFallback = () => {
    if (!pendingReveal.length) return;
    const lim = innerHeight * .92;
    pendingReveal = pendingReveal.filter(el => {
      if (el.classList.contains('in')) return false;
      const r = el.getBoundingClientRect();
      if (r.top < lim && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); return false; }
      return true;
    });
  };
  addEventListener('scroll', revealFallback, { passive: true });
  addEventListener('load', revealFallback);
  setTimeout(revealFallback, 50);

  /* ---------- HERO ---------- */
  const hero = $('#top'), heroFr = $('#heroFr'), heroAe = $('#heroAe'), heroStage = $('#heroStage');
  const rot = $('#rot'), rotIn = $('#rotIn'), rotWords = rotIn ? $$('span', rotIn) : [], steps = $$('#heroSteps span');
  let rotIdx = -1, split = 50, splitT = 50;
  const setRot = i => {
    if (!rot || i === rotIdx) return; rotIdx = i;
    rotIn.style.transform = `translateY(${-i * 0.86}em)`;
    rot.style.width = rotWords[i].scrollWidth + 'px';
    steps.forEach((s, k) => s.classList.toggle('on', k <= i));
  };
  const measureRot = () => { if (!rot) return; const w = rotWords[Math.max(0, rotIdx)]; if (w) rot.style.width = w.scrollWidth + 'px'; };
  if (rot) {
    document.fonts && document.fonts.ready.then(() => { rotIdx = -1; setRot(0); });
    setRot(0);
  }
  if (hero && heroStage) {
    hero.addEventListener('pointermove', e => { splitT = 50 + ((e.clientX / innerWidth) - .5) * 26; });
    hero.addEventListener('pointerleave', () => { splitT = 50; });
  }

  /* ---------- momentum keywords ---------- */
  const mom = $('#momentum'), kws = mom ? $$('.kw', mom) : [];

  /* ---------- BRIDGE ---------- */
  const bui = $('#bridgeUi'), hub = $('#bridgeHub'), sides = bui ? $$('.side', bui) : [];
  sides.forEach(s => {
    const k = s.dataset.side;
    s.addEventListener('pointerenter', () => { if (!isMobile()) bui.className = 'bridge-ui h-' + k + (bui.dataset.open ? ' o-' + bui.dataset.open : ''); });
    s.addEventListener('pointerleave', () => { bui.className = 'bridge-ui' + (bui.dataset.open ? ' o-' + bui.dataset.open : ''); });
    const toggle = () => {
      const open = s.classList.contains('open');
      sides.forEach(o => { o.classList.remove('open'); o.setAttribute('aria-expanded', 'false'); $('.lbl', o).textContent = FRJS ? 'Voir les services' : 'Show services'; });
      if (!open) { s.classList.add('open'); s.setAttribute('aria-expanded', 'true'); $('.lbl', s).textContent = FRJS ? 'Masquer les services' : 'Hide services'; bui.dataset.open = k; }
      else delete bui.dataset.open;
      bui.className = 'bridge-ui' + (bui.dataset.open ? ' o-' + bui.dataset.open : '') + (s.matches(':hover') && !isMobile() ? ' h-' + k : '');
    };
    s.addEventListener('click', e => { if (e.target.closest('a')) return; toggle(); });
    s.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* ---------- SERVICES ---------- */
  const rows = $$('.svc-row'), bgs = $$('#buildBg .ph'), bigNum = $('#bigNum'), tagsEl = $('#svcTags');
  const svcTagsEn = [
    ['Market study', 'Entry model', 'Regulation', 'Go-to-market'],
    ['Lead generation', 'Meetings', 'Partnerships', 'Pipeline'],
    ['Positioning', 'Localisation', 'Packaging', 'Campaigns', 'Influence'],
    ['Retail strategy', 'Buyers', 'Importers', 'Distributors'],
    ['Podcast', 'Video', 'Founder stories', 'Social'],
    ['Launch events', 'Activations', 'Conferences', 'Hospitality']
  ];
  const svcTagsFr = [
    ['Étude de marché', "Modèle d'entrée", 'Réglementation', 'Go-to-market'],
    ['Génération de leads', 'Rendez-vous', 'Partenariats', 'Pipeline'],
    ['Positionnement', 'Localisation', 'Packaging', 'Campagnes', 'Influence'],
    ['Stratégie retail', 'Acheteurs', 'Importateurs', 'Distributeurs'],
    ['Podcast', 'Vidéo', 'Histoires de fondateurs', 'Réseaux sociaux'],
    ['Événements de lancement', 'Activations', 'Conférences', 'Hospitalité']
  ];
  const svcTags = FRJS ? svcTagsFr : svcTagsEn;
  const setSvc = i => {
    rows.forEach((r, k) => { r.classList.toggle('on', k === i); $('button', r).setAttribute('aria-expanded', String(k === i)); });
    bgs.forEach((b, k) => b.classList.toggle('on', k === i));
    if (bigNum) bigNum.style.transform = `translateY(${-i}em)`;
    if (tagsEl) tagsEl.innerHTML = svcTags[i].map(t => `<span class="tag">${t}</span>`).join('');
  };
  if (rows.length) {
    rows.forEach((r, i) => {
      r.addEventListener('pointerenter', () => { if (fine) setSvc(i); });
      $('button', r).addEventListener('click', () => setSvc(i));
    });
    setSvc(0);
  }

  /* ---------- horizontal pinned sections ---------- */
  const hsList = $$('.hs').map(sec => ({
    sec, track: $('.hs-track', sec), bars: $$('.hs-progress span', sec),
    frames: $$('.frame, .m-panel', sec), dist: 0
  }));
  const layoutHS = () => hsList.forEach(o => {
    if (isMobile()) { o.sec.style.height = ''; o.track.style.transform = ''; return; }
    o.dist = Math.max(0, o.track.scrollWidth - innerWidth);
    o.sec.style.height = (o.dist + innerHeight) + 'px';
  });
  const method = $('#method'), mCount = $('#mCount');

  /* ---------- journeys ---------- */
  const jA = $('#jA'), jB = $('#jB'), dossier = $('#dossier'), dosN = $('#dosN'), dosT = $('#dosT');
  const ringsI = $$('#rings i'), rtags = $$('#rings .rtag');
  const jState = el => {
    const st = $$('.j-step', el); const line = innerHeight * .62; let n = 0;
    st.forEach(s => { const on = s.getBoundingClientRect().top < line; s.classList.toggle('on', on); if (on) n++; });
    const r = el.getBoundingClientRect(); const p = clamp((line - r.top) / r.height);
    el.style.setProperty('--jp', p.toFixed(3));
    return { n, st };
  };
  let lastA = -1, lastB = -1;

  /* ---------- podcast ---------- */
  const eps = [
    { t: 'Building Between Two Markets', fr: 'Construire entre deux marchés', img: 'studio.jpg', tone: 't-mono', a: 'FR', b: 'AE', dur: 3120, fmt: 'Video + audio' },
    { t: 'Why France?', fr: 'Pourquoi la France ?', img: 'paris-facade.jpg', tone: 't-mono', a: 'AE', b: 'FR', dur: 2640, fmt: 'Video + audio' },
    { t: 'Why the UAE?', fr: 'Pourquoi les Émirats ?', img: 'uae-facade.jpg', tone: 't-sun', a: 'FR', b: 'AE', dur: 2890, fmt: 'Video + audio' },
    { t: 'Building a Global Brand', fr: 'Construire une marque globale', img: 'mic-1.jpg', tone: 't-warm', a: 'FR', b: 'AE', dur: 3410, fmt: 'Audio' },
    { t: 'From Founder to International Company', fr: 'De fondateur à entreprise internationale', img: 'mic-dark.jpg', tone: 't-mono', a: 'AE', b: 'FR', dur: 3760, fmt: 'Video + audio' }
  ];
  const fmtT = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const wave = (n, seed) => Array.from({ length: n }, (_, i) => {
    const h = 25 + Math.abs(Math.sin(i * .9 + seed) * 55 + Math.sin(i * .31 + seed * 2) * 20);
    return `<i style="--h:${Math.min(100, h).toFixed(0)};--i:${i}"></i>`;
  }).join('');
  const car = $('#carousel');
  let moved = 0;
  if (car) {
    car.innerHTML = eps.map((e, i) => `
    <button class="ep" role="listitem" data-i="${i}" data-cursor="${FRJS ? 'Regarder' : 'Watch'}" aria-label="${FRJS ? 'Ouvrir l\u2019\u00e9pisode' : 'Open episode'} ${i + 1}: ${FRJS && e.fr ? e.fr : e.t}">
      <div class="ph ${e.tone}"><img src="${ASSETS + e.img}" alt="" loading="lazy" decoding="async" draggable="false">
        <div class="ep-over">
          <div class="ep-top"><span class="flag">${e.a} <b>↔</b> ${e.b}</span><span class="mono">${FRJS ? e.fmt.replace('Video', 'Vidéo') : e.fmt}</span></div>
          <div class="ep-bottom"><span class="ep-num">${String(i + 1).padStart(2, '0')}</span>
            <div style="display:flex;align-items:center;gap:16px"><div class="wave">${wave(18, i)}</div><span class="play"><span class="tri"></span></span></div></div>
        </div></div>
      <div class="ep-meta mono"><span>${FRJS ? 'Épisode' : 'Episode'} ${String(i + 1).padStart(2, '0')}</span><span>${Math.round(e.dur / 60)} min</span><span>${FRJS ? 'Saison 01' : 'Season 01'}</span></div>
      <h3>${FRJS && e.fr ? e.fr : e.t}</h3>
      <div class="ep-guest"><span class="av"></span><span>${FRJS ? 'Invité à annoncer' : 'Guest to be announced'}</span></div>
    </button>`).join('');
    // drag to scroll
    let down = false, sx = 0, sl = 0;
    car.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = car.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const d = e.clientX - sx; moved = Math.max(moved, Math.abs(d)); if (moved > 5) car.classList.add('drag'); car.scrollLeft = sl - d; });
    addEventListener('pointerup', () => { down = false; setTimeout(() => car.classList.remove('drag'), 0); });
    const step = () => ($('.ep', car).offsetWidth + 24);
    const prev = $('#carPrev'), next = $('#carNext');
    prev && (prev.onclick = () => car.scrollBy({ left: -step(), behavior: 'smooth' }));
    next && (next.onclick = () => car.scrollBy({ left: step(), behavior: 'smooth' }));
  }

  /* player */
  const player = $('#player'), plPlay = $('#plPlay'), plFill = $('#plFill'), plCur = $('#plCur'), plDur = $('#plDur');
  let plT = 0, plD = 1, playing = false, plLast = 0, lastFocus = null;
  const setPlay = p => { if (!player) return; playing = p; player.classList.toggle('playing', p); $('#plWave').classList.toggle('live', p); plPlay.setAttribute('aria-label', p ? 'Pause' : (FRJS ? 'Lecture' : 'Play')); };
  if (player && car) {
    $('#plWave').innerHTML = wave(56, 3);
    const chapters = FRJS ? ['Ouverture — pourquoi cette conversation', 'Deux marchés, deux cultures', 'Ce qui change quand on traverse', 'Leçons pour le prochain fondateur', 'Clôture'] : ['Opening — why this conversation', 'Two markets, two cultures', 'What changes when you cross', 'Lessons for the next founder', 'Closing'];
    const openEp = i => {
      const e = eps[i]; lastFocus = document.activeElement;
      $('#plImg').src = ASSETS + e.img; $('#plTitle').textContent = FRJS && e.fr ? e.fr : e.t; $('#plEp').textContent = (FRJS ? 'Épisode ' : 'Episode ') + String(i + 1).padStart(2, '0') + (FRJS ? ' · Saison 01' : ' · Season 01');
      $('#plFlag').innerHTML = `${e.a} <b>↔</b> ${e.b}`;
      $('#plCh').innerHTML = chapters.map((c, k) => `<li><span>${fmtT(e.dur * k / chapters.length)}</span><span>${c}</span></li>`).join('');
      plT = 0; plD = e.dur; plDur.textContent = fmtT(plD); setPlay(true);
      player.classList.add('open'); document.body.style.overflow = 'hidden'; setTimeout(() => $('#plClose').focus(), 400);
    };
    const closeEp = () => { player.classList.remove('open'); setPlay(false); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
    car.addEventListener('click', e => { const b = e.target.closest('.ep'); if (!b || moved > 5) return; openEp(+b.dataset.i); });
    plPlay.onclick = () => setPlay(!playing);
    $('#plClose').onclick = closeEp;
    $('#plBar').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); plT = plD * clamp((e.clientX - r.left) / r.width); });
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && player.classList.contains('open')) closeEp();
      if (e.key === ' ' && player.classList.contains('open') && document.activeElement !== plPlay) { e.preventDefault(); setPlay(!playing); }
    });
  }

  /* ---------- waves (eco + anywhere) ---------- */
  $$('[data-wave]').forEach((w, k) => { if (!w.innerHTML) w.innerHTML = wave(+w.dataset.wave, k + 7); });

  /* ---------- media formats float ---------- */
  const ff = $('#fmtFloat'), ffImg = $('#fmtImg'); let fx = 0, fy = 0, fOn = false;
  if (fine && ff) $$('#formats li').forEach(li => {
    li.addEventListener('pointerenter', () => { ffImg.src = li.dataset.img; ff.classList.add('show'); fOn = true; });
    li.addEventListener('pointerleave', () => { ff.classList.remove('show'); fOn = false; });
  });

  /* ---------- insights filter ---------- */
  const chips = $$('#filters .chip'), arts = $$('#mag .art'), magEmpty = $('#magEmpty');
  chips.forEach(c => c.addEventListener('click', () => {
    chips.forEach(o => o.classList.toggle('on', o === c));
    const f = c.dataset.f; let n = 0;
    arts.forEach(a => { const show = f === 'all' || a.dataset.c.split(' ').includes(f); a.classList.toggle('hide', !show); if (show) n++; });
    const vis = arts.filter(a => !a.classList.contains('hide'));
    vis.forEach((a, i) => { a.classList.remove('lead', 'side-a', 'col'); a.classList.add(f === 'all' ? (i === 0 ? 'lead' : i < 3 ? 'side-a' : 'col') : (vis.length === 1 ? 'lead' : 'col')); });
    if (magEmpty) magEmpty.style.display = n ? 'none' : 'block';
  }));

  /* ---------- map ---------- */
  const svg = $('#geoSvg');
  let route = null;
  if (svg) {
    const proj = (lon, lat) => [(lon + 20) / 90 * 1600, (62 - lat) / 52 * 900];
    const P = proj(2.3522, 48.8566), D = proj(55.2708, 25.2048), A = proj(54.3773, 24.4539);
    const C = [(P[0] + D[0]) / 2 - 60, Math.min(P[1], D[1]) - 230];
    const routeD = `M${P[0].toFixed(1)} ${P[1].toFixed(1)} Q ${C[0].toFixed(1)} ${C[1].toFixed(1)} ${D[0].toFixed(1)} ${D[1].toFixed(1)}`;
    $$('path', svg).forEach(p => p.setAttribute('d', routeD));
    $('animateMotion', svg).setAttribute('path', routeD);
    const cities = $$('.city', svg);
    const place = (g, xy, lx, ly) => { $$('circle', g).forEach(c => { c.setAttribute('cx', xy[0]); c.setAttribute('cy', xy[1]); }); const t = $('text', g); t.setAttribute('x', xy[0] + lx); t.setAttribute('y', xy[1] + ly); };
    place(cities[0], P, 18, -6); place(cities[1], D, 18, -8); place(cities[2], A, -118, 30);
    route = $('#route'); const len = route.getTotalLength(); route.style.setProperty('--len', len);
    let g = '';
    for (let lon = -20; lon <= 70; lon += 10) { const x = proj(lon, 0)[0]; g += `<line class="grat${lon % 30 === 0 ? ' maj' : ''}" x1="${x}" y1="0" x2="${x}" y2="900"/>`; }
    for (let lat = 10; lat <= 60; lat += 10) { const y = proj(0, lat)[1]; g += `<line class="grat${lat % 30 === 0 ? ' maj' : ''}" x1="0" y1="${y}" x2="1600" y2="${y}"/>`; }
    for (let lat = 20; lat <= 60; lat += 10) { const y = proj(0, lat)[1]; g += `<text x="8" y="${y - 6}" fill="#8C857A" font-family="JetBrains Mono" font-size="11">${lat}°N</text>`; }
    $('#grat').innerHTML = g;
    let dots = ''; const samples = Array.from({ length: 40 }, (_, i) => route.getPointAtLength(len * i / 39));
    for (let x = 20; x < 1600; x += 26) for (let y = 20; y < 900; y += 26) {
      let dm = 1e9; for (const s of samples) { const d = (s.x - x) ** 2 + (s.y - y) ** 2; if (d < dm) dm = d; }
      dm = Math.sqrt(dm); const o = dm < 220 ? (0.06 + 0.5 * (1 - dm / 220) ** 2) : 0.05;
      dots += `<circle cx="${x}" cy="${y}" r="${dm < 60 ? 1.8 : 1.3}" fill="rgba(242,237,228,${o.toFixed(3)})"/>`;
    }
    $('#dots').innerHTML = dots;
    $$('.gcard').forEach(c => c.addEventListener('pointerenter', () => route.style.strokeWidth = 3));
    $$('.gcard').forEach(c => c.addEventListener('pointerleave', () => route.style.strokeWidth = ''));
  }
  /* live clocks (map + sub-pages) */
  const tP = $('#tParis'), tD = $('#tDubai');
  if (tP && tD) {
    const clock = () => {
      const o = { hour: '2-digit', minute: '2-digit', hour12: false };
      try {
        tP.textContent = new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'Europe/Paris' }).format(new Date());
        tD.textContent = new Intl.DateTimeFormat('en-GB', { ...o, timeZone: 'Asia/Dubai' }).format(new Date());
      } catch (e) { /* ignore */ }
    };
    clock(); setInterval(clock, 15000);
  }

  /* ---------- contact (POST → /api/contact) ---------- */
  const cf = $('#cf'), recv = $('#received'), recvT = $('#recvT'), cfErr = $('#cfErr');
  if (cf && recv) {
    recvT.innerHTML = (document.documentElement.lang === 'fr' ? 'REÇU.' : 'RECEIVED.').split('').map((c, i) => `<span style="transition-delay:${i * 45}ms">${c}</span>`).join('');
    const submitBtn = $('button[type=submit]', cf);
    cf.addEventListener('submit', async e => {
      e.preventDefault(); let ok = true;
      ['fn', 'ln', 'em'].forEach(id => {
        const el = $('#' + id); const bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
        el.closest('.fld').classList.toggle('err', bad); if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok) return;
      const fd = new FormData(cf);
      const data = {};
      fd.forEach((v, k) => { if (k === 'type') { (data.type = data.type || []).push(v); } else data[k] = v; });
      data.page = location.pathname;
      submitBtn.disabled = true; cfErr && (cfErr.hidden = true);
      try {
        const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'Request failed');
        cf.classList.add('sent'); setTimeout(() => recv.classList.add('show'), 400);
      } catch (err) {
        if (cfErr) { cfErr.hidden = false; cfErr.textContent = document.documentElement.lang === 'fr' ? 'Une erreur est survenue — écrivez-nous directement à contact@scenagrowth.fr.' : 'Something went wrong — please email contact@scenagrowth.fr directly.'; }
      } finally { submitBtn.disabled = false; }
    });
    const again = $('#again');
    again && (again.onclick = () => { recv.classList.remove('show'); cf.reset(); setTimeout(() => cf.classList.remove('sent'), 300); });
  }

  /* ---------- WhatsApp widget ---------- */
  const wa = $('#wa'), waBubble = $('#waBubble'), waPanel = $('#waPanel'), waClose = $('#waClose'), waTime = $('#waTime');
  if (wa && waBubble) {
    const setWa = (o) => {
      wa.classList.toggle('open', o); waBubble.setAttribute('aria-expanded', String(o)); waPanel.setAttribute('aria-hidden', String(!o));
      if (o) { wa.classList.add('seen'); try { sessionStorage.setItem('scena-wa', '1'); } catch (e) {} if (waTime) waTime.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    };
    waBubble.addEventListener('click', () => setWa(!wa.classList.contains('open')));
    waClose.addEventListener('click', () => setWa(false));
    addEventListener('keydown', e => { if (e.key === 'Escape' && wa.classList.contains('open')) setWa(false); });
    document.addEventListener('click', e => { if (wa.classList.contains('open') && !wa.contains(e.target)) setWa(false); });
    let seen = false; try { seen = !!sessionStorage.getItem('scena-wa'); } catch (e) {}
    if (seen) wa.classList.add('seen');
    // bubble appears after a short delay; window auto-opens once per session after 14s of browsing
    setTimeout(() => wa.classList.add('ready'), 1800);
    if (!seen && !RM) setTimeout(() => { if (!document.body.classList.contains('menu-open')) setWa(true); }, 14000);
    // Every WhatsApp CTA goes through /wa (server redirect) — the number is never in the page.
    $$('[data-wa]').forEach(a => a.addEventListener('click', () => setWa(false)));
  }

  /* ---------- main loop ---------- */
  const prog = $('#progress'), contactSec = $('#contact');
  let vh = innerHeight;
  const onResize = () => { vh = innerHeight; layoutHS(); measureRot(); };
  addEventListener('resize', onResize); onResize();
  addEventListener('load', onResize);

  const frame = () => {
    const y = scrollY, H = Math.max(1, document.documentElement.scrollHeight - vh);
    if (prog) prog.style.transform = `scaleX(${clamp(y / H)})`;
    revealFallback();
    nav && nav.classList.toggle('compact', y > 40);
    if (mcta) {
      const el = document.elementFromPoint(innerWidth / 2, vh - 40);
      mcta.classList.toggle('show', y > vh * .9 && !(contactSec && el && contactSec.contains(el)));
    }

    // cursor + float image
    cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2);
    if (fine && cur) cur.style.transform = `translate(${cx}px,${cy}px)`;
    if (ff) {
      if (fOn) { fx = lerp(fx, mx, .12); fy = lerp(fy, my, .12); ff.style.transform = `translate(${fx - 140}px,${fy - 105}px) rotate(${(mx - fx) * .04}deg)`; }
      else { fx = mx; fy = my; }
    }

    // hero
    if (hero && heroStage) {
      const hr = hero.getBoundingClientRect();
      if (hr.bottom > 0) {
        const p = clamp(-hr.top / (hero.offsetHeight - vh));
        setRot(Math.min(3, Math.floor(p * 4.001)));
        split = lerp(split, splitT, .06);
        const merge = RM ? 0 : p;
        const s = lerp(split, 8, clamp((merge - .45) / .5));
        heroStage.style.setProperty('--split', s.toFixed(2) + '%');
        heroAe.style.opacity = (1 - clamp((merge - .75) / .25) * .45).toFixed(3);
        if (!RM) {
          heroFr.style.transform = `translate3d(${(split - 50) * -.3}px,${p * -40}px,0) scale(${1.02 + p * .08})`;
          $('img', heroAe).style.transform = `translate3d(${(split - 50) * .4}px,${p * 30}px,0) scale(${1.04 + p * .05})`;
        }
      }
    }

    // keywords
    if (mom && !RM && !isMobile()) {
      const mr = mom.getBoundingClientRect();
      if (mr.bottom > 0 && mr.top < vh) { const d = mr.top - vh / 2; kws.forEach(k => k.style.transform = `translate3d(0,${d * k.dataset.speed}px,0)`); }
    }

    // bridge hub position
    if (hub && sides.length && !isMobile()) hub.style.setProperty('--hub', sides[0].offsetWidth + 'px');

    // horizontal
    if (!isMobile()) hsList.forEach(o => {
      const r = o.sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp(-r.top / o.dist || 0);
      o.track.style.transform = `translate3d(${-p * o.dist}px,0,0)`;
      const n = o.bars.length;
      o.bars.forEach((b, i) => { const f = clamp(p * n - i); b.style.setProperty('--f', f.toFixed(3)); b.classList.toggle('on', p * n >= i && p * n < i + 1 || (i === n - 1 && p >= 1)); });
      let act = 0;
      o.frames.forEach((f, i) => { const fr = f.getBoundingClientRect(); const c = fr.left + fr.width / 2; const on = c > innerWidth * .1 && c < innerWidth * .9; f.classList.toggle('act', on); if (fr.left < innerWidth * .5) act = i; });
      if (method && o.sec === method) { method.dataset.env = act + 1; mCount && (mCount.textContent = `0${act + 1} / 05`); }
    });
    else hsList.forEach(o => o.frames.forEach(f => f.classList.add('act')));

    // journeys
    if (jA) {
      const a = jState(jA); const ia = Math.max(0, a.n - 1);
      if (ia !== lastA) { lastA = ia; if (dossier) { dossier.dataset.s = ia; dosN.textContent = String(ia + 1).padStart(2, '0'); dosT.textContent = $('h3', a.st[ia]).textContent; } }
    }
    if (jB) {
      const b = jState(jB); const ib = Math.max(0, b.n - 1);
      if (ib !== lastB) {
        lastB = ib; const lvl = Math.floor(ib / 2);
        ringsI.forEach((r, k) => { if (!r.classList.contains('core')) r.classList.toggle('on', 3 - k <= lvl && ib > 0); });
        rtags.forEach(t => t.classList.toggle('on', 3 - (+t.dataset.r) <= lvl && ib > 0));
      }
    }

    // player progress (simulated at 8× — wire a real <video>/HLS element in production)
    const now = performance.now();
    if (playing) { plT = Math.min(plD, plT + (now - plLast) / 1000 * 8); if (plT >= plD) setPlay(false); }
    plLast = now;
    if (player && player.classList.contains('open')) { plFill.style.width = (plT / plD * 100) + '%'; plCur.textContent = fmtT(plT); }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
