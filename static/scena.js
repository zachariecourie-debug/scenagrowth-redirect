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
    else { sessionStorage.setItem('scena-intro', '1'); const touch = !matchMedia('(pointer:fine)').matches; addEventListener('load', () => setTimeout(liftCurtain, touch ? 150 : 450)); setTimeout(liftCurtain, touch ? 900 : 1400); }
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
  // Language hint: English on scenagrowth.com, French on scenagrowth.fr. When the browser language does not
  // match the site, suggest the same page on the other domain (never an automatic redirect).
  (() => {
    const other = document.querySelector(`link[rel="alternate"][hreflang="${FRJS ? 'en' : 'fr'}"]`);
    if (!other) return;
    const first = ((navigator.languages && navigator.languages[0]) || navigator.language || '').slice(0, 2).toLowerCase();
    if (!first || (first === 'fr') === FRJS) return;
    try { if (localStorage.getItem('scenaLangHint')) return; } catch (e) {}
    const bar = document.createElement('div');
    bar.className = 'lang-hint';
    bar.setAttribute('role', 'region');
    bar.setAttribute('lang', FRJS ? 'en' : 'fr');
    bar.setAttribute('aria-label', FRJS ? 'Language' : 'Langue');
    bar.innerHTML = FRJS
      ? `<span>This page is also available in English.</span><a href="${other.href}" hreflang="en">View in English →</a><button type="button" aria-label="Close">✕</button>`
      : `<span>Cette page existe aussi en français.</span><a href="${other.href}" hreflang="fr">Voir en français →</a><button type="button" aria-label="Fermer">✕</button>`;
    $('button', bar).addEventListener('click', () => { bar.remove(); try { localStorage.setItem('scenaLangHint', '1'); } catch (e) {} });
    document.body.appendChild(bar);
  })();

  // Top tab bar: open the matching Explore tab, then the data-go handler scrolls to #explore.
  $$('a[data-tab]').forEach(a => a.addEventListener('click', () => { const t = document.getElementById(a.dataset.tab); if (t) t.click(); }));
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
    if (homeHash && location.pathname === '/') {
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
  // warm the next page as soon as a finger lands on an internal link
  const prefetched = new Set();
  addEventListener('touchstart', e => {
    const a = e.target.closest && e.target.closest('a[href^="/"]'); if (!a || a.target) return;
    const href = a.getAttribute('href').split('#')[0]; if (!href || prefetched.has(href) || href === location.pathname) return;
    prefetched.add(href); const l = document.createElement('link'); l.rel = 'prefetch'; l.href = href; document.head.appendChild(l);
  }, { passive: true });

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
    hero.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') splitT = 50 + ((e.clientX / innerWidth) - .5) * 26; });
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
  const svcTagsEn = [["Market assessment", "Entry roadmap", "Target mapping", "Introductions"], ["Distributor map", "Retail mapping", "Channel strategy", "Product dossiers"], ["Fulfillment needs", "Provider shortlist", "Launch stock", "Coordination"]];
  const svcTagsFr = [["Évaluation marché", "Feuille de route", "Cartographie des cibles", "Introductions"], ["Carte distributeurs", "Carte retail", "Stratégie de canal", "Dossiers produit"], ["Besoins logistiques", "Short-list prestataires", "Stock de lancement", "Coordination"]];
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
  // phones: pin (scroll-driven, like desktop) only when every panel fits the small viewport height,
  // otherwise keep the native swipe. Decided per width so the URL bar showing/hiding never flips it.
  const svhProbe = document.createElement('div');
  svhProbe.style.cssText = 'position:absolute;top:0;left:-9999px;width:1px;height:100vh;height:100svh;pointer-events:none;visibility:hidden';
  document.body.appendChild(svhProbe);
  let hsW = -1;
  const layoutHS = () => {
    const mob = isMobile();
    if (innerWidth !== hsW) {
      hsW = innerWidth;
      const navH = nav ? nav.offsetHeight : 68, svh = svhProbe.offsetHeight;
      hsList.forEach(o => {
        o.sec.classList.remove('pin-m'); o.sec.style.height = ''; o.track.style.transform = '';
        if (!mob) { o.pin = true; return; }
        const head = $('.m-label', o.sec); const headH = head ? head.offsetHeight : 0;
        const tallest = Math.max(0, ...$$('.hs-track > *', o.sec).map(el => el.offsetHeight));
        o.pin = false;
        o.sec.classList.toggle('pin-m', o.pin);
      });
    }
    hsList.forEach(o => {
      if (!o.pin) { o.sec.style.height = ''; o.track.style.transform = ''; return; }
      o.dist = Math.max(0, o.track.scrollWidth - innerWidth);
      o.sec.style.height = (o.dist + (mob ? svhProbe.offsetHeight : innerHeight)) + 'px';
    });
  };
  const method = $('#method'), mCount = $('#mCount');

  /* ---------- journeys ---------- */
  const jA = $('#jA'), jB = $('#jB'), dossier = $('#dossier'), dosN = $('#dosN'), dosT = $('#dosT');
  const ringsI = $$('#rings i'), rtags = $$('#rings .rtag');
  const jState = el => {
    const st = el._st || (el._st = $$('.j-step', el)); const line = innerHeight * (isMobile() ? .8 : .62);
    const ons = st.map(s => s.getBoundingClientRect().top < line);
    const r = el.getBoundingClientRect(); const p = clamp((line - r.top) / r.height).toFixed(3);
    let n = 0; ons.forEach((on, i) => { if (on) n++; if (st[i]._on !== on) { st[i]._on = on; st[i].classList.toggle('on', on); } });
    if (el._jp !== p) { el._jp = p; el.style.setProperty('--jp', p); }
    return { n, st };
  };
  let lastA = -1, lastB = -1;

  /* ---------- podcast ---------- */
  const eps = [
    { t: 'Building Between Two Markets', fr: 'Construire entre deux marchés', img: 'studio.jpg', clip: '/static/film/podcast-intro', tone: 't-mono', a: 'FR', b: 'AE', dur: 3120, fmt: 'Video + audio' },
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
    <a class="ep" role="listitem" href="/contact" data-i="${i}" data-cursor="${FRJS ? 'Proposer' : 'Propose'}" aria-label="${FRJS ? 'Proposer un invit\u00e9 pour le th\u00e8me' : 'Propose a guest for the theme'} ${FRJS && e.fr ? e.fr : e.t}">
      <div class="ph ${e.tone}">${e.clip ? `<video class="ep-clip" muted loop playsinline preload="none" poster="${e.clip}.jpg" aria-hidden="true"><source src="${e.clip}.mp4" type="video/mp4"></video>` : `<img src="${ASSETS + e.img}" alt="" loading="lazy" decoding="async" draggable="false">`}
        <div class="ep-over">
          <div class="ep-top"><span class="flag">${e.a} <b>↔</b> ${e.b}</span><span class="mono">${FRJS ? 'Saison 01' : 'Season 01'}</span></div>
          <div class="ep-bottom"><span class="ep-num">${String(i + 1).padStart(2, '0')}</span>
            <div style="display:flex;align-items:center;gap:16px"><div class="wave">${wave(18, i)}</div><span class="play" aria-hidden="true"><span style="color:var(--ink);font-size:20px;line-height:1">→</span></span></div></div>
        </div></div>
      <div class="ep-meta mono"><span>${FRJS ? 'Thème' : 'Theme'} ${String(i + 1).padStart(2, '0')}</span><span>${FRJS ? 'En cours d\u2019enregistrement' : 'Now recording'}</span></div>
      <h3>${FRJS && e.fr ? e.fr : e.t}</h3>
      <div class="ep-guest"><span class="av"></span><span>${FRJS ? 'Proposer un invité →' : 'Propose a guest →'}</span></div>
    </a>`).join('');
    car.addEventListener('click', e => { if (moved > 5 && e.target.closest('.ep')) e.preventDefault(); });
    const clips = $$('.ep-clip', car);
    if (clips.length && 'IntersectionObserver' in window && !RM) {
      const cio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause(); }), { threshold: .35 });
      clips.forEach(v => cio.observe(v));
    }
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

  // touch screens: no cursor to follow, so the row in the middle of the screen lights up and reveals its image
  const fmtRows = !fine ? $$('#formats li[data-img]') : [];
  fmtRows.forEach(li => { const a = $('a', li); if (!a || $('.thumb', li)) return;
    const t = document.createElement('span'); t.className = 'thumb ph t-mono';
    t.innerHTML = `<img src="${li.dataset.img}" alt="" loading="lazy" decoding="async">`; a.appendChild(t); });
  let fmtAct = null;

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

  /* ---------- pause looping animations off screen ---------- */
  if ('IntersectionObserver' in window) {
    const aio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('anim-off', !e.isIntersecting)), { rootMargin: '100px 0px' });
    $$('main > section').forEach(sec => aio.observe(sec));
  }

  /* ---------- Test → Enter → Grow route (static if no JS / reduced motion) ---------- */
  const tg = $('.tegrow');
  if (tg && !RM && 'IntersectionObserver' in window) {
    tg.classList.add('armed');
    const tio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { tg.classList.add('in'); tio.disconnect(); } }), { threshold: .35 });
    tio.observe(tg);
  }

  /* ---------- spec-ads player (static strip without JS) ---------- */
  const sp = $('#spPlayer');
  if (sp) {
    const scenes = $$('.sp-scene', sp), bars = $$('.sp-bars button', sp), pz = $('.sp-pause', sp);
    const DUR = 6000; let cur = 0, timer = null, visible = false, user = RM;
    sp.classList.add('armed'); sp.style.setProperty('--dur', DUR / 1000 + 's');
    const show = i => {
      cur = (i + scenes.length) % scenes.length;
      scenes.forEach((s, k) => { s.classList.toggle('on', k === cur); s.setAttribute('aria-hidden', String(k !== cur)); const im = $('img', s); if (k === cur && im) im.loading = 'eager'; });
      bars.forEach((b, k) => b.setAttribute('aria-current', String(k === cur)));
    };
    const stop = () => { clearInterval(timer); timer = null; sp.classList.remove('playing'); };
    const play = () => { if (timer || user || !visible) return; sp.classList.add('playing'); timer = setInterval(() => { show(cur + 1); restartBar(); }, DUR); };
    const restartBar = () => { sp.classList.remove('playing'); void sp.offsetWidth; if (timer) sp.classList.add('playing'); };
    const label = () => { pz.textContent = user ? pz.dataset.labelPlay : pz.dataset.labelPause; pz.setAttribute('aria-pressed', String(user)); };
    bars.forEach((b, i) => b.addEventListener('click', () => { show(i); if (timer) { stop(); play(); } }));
    pz.addEventListener('click', () => { user = !user; label(); user ? stop() : play(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; visible ? play() : stop(); }), { threshold: .3 }).observe(sp);
    show(0); label();
  }

  /* ---------- tab groups (corridor, explore); without JS every panel stays visible ---------- */
  $$('.ctabs[role=tablist]').forEach(list => {
    const tabs = $$('[role=tab]', list);
    const show = t => {
      tabs.forEach(b => { const on = b === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; const p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      dispatchEvent(new Event('resize'));
    };
    tabs.forEach((b, i) => {
      b.addEventListener('click', () => show(b));
      b.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; show(n); n.focus(); } });
    });
    show(tabs.find(b => b.getAttribute('aria-selected') === 'true') || tabs[0]);
  });

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
    const buildDots = () => {
      const samples = Array.from({ length: 40 }, (_, i) => route.getPointAtLength(len * i / 39));
      const groups = new Map();
      for (let x = 20; x < 1600; x += 26) for (let y = 20; y < 900; y += 26) {
        let dm = 1e9; for (const s of samples) { const d = (s.x - x) ** 2 + (s.y - y) ** 2; if (d < dm) dm = d; }
        dm = Math.sqrt(dm); const o = dm < 220 ? (0.06 + 0.5 * (1 - dm / 220) ** 2) : 0.05;
        const key = (dm < 60 ? 1.8 : 1.3) + '|' + (Math.round(o * 40) / 40).toFixed(3);
        groups.set(key, (groups.get(key) || '') + `M${x} ${y}h0`);
      }
      let dots = '';
      groups.forEach((d, key) => { const [r, o] = key.split('|'); dots += `<path d="${d}" stroke="rgba(242,237,228,${o})" stroke-width="${r * 2}" stroke-linecap="round" fill="none"/>`; });
      $('#dots').innerHTML = dots;
    };
    if ('IntersectionObserver' in window) {
      const dio = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { dio.disconnect(); buildDots(); } }, { rootMargin: '800px 0px' });
      dio.observe(svg);
    } else buildDots();
    $$('.gcard').forEach(c => c.addEventListener('pointerenter', () => route.style.strokeWidth = 3));
    $$('.gcard').forEach(c => c.addEventListener('pointerleave', () => route.style.strokeWidth = ''));

    // phones: tap a card to light it up with the route (the desktop hover state)
    const gcards = $$('.gcard');
    gcards.forEach(c => c.addEventListener('click', () => {
      if (fine) return;
      const on = !c.classList.contains('hl');
      gcards.forEach(o => o.classList.remove('hl'));
      c.classList.toggle('hl', on); svg.classList.toggle('hl', on);
    }));

    // phones: zoom the map on the route, enlarge labels and print distance + flight time on it
    const stats = $$('.geo-stats b');
    const mid = route.getPointAtLength(len / 2);
    const dist = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    dist.setAttribute('class', 'geo-dist');
    dist.innerHTML = `<text x="${(mid.x - 220).toFixed(0)}" y="${(mid.y + 230).toFixed(0)}" text-anchor="middle">${stats[2] ? stats[2].textContent : ''}</text>` +
      `<text class="sub" x="${(mid.x - 220).toFixed(0)}" y="${(mid.y + 280).toFixed(0)}" text-anchor="middle">${FRJS ? 'Vol direct' : 'Direct flight'} ${stats[3] ? stats[3].textContent : ''}</text>`;
    svg.appendChild(dist);
    const labels = $$('.city text', svg), trav = $('#traveller', svg);
    const orig = labels.map(t => [t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('font-size'), t.getAttribute('text-anchor')]);
    const geoLayout = () => {
      const m = isMobile();
      svg.setAttribute('viewBox', m ? '250 30 1260 860' : '0 0 1600 900');
      labels.forEach((t, i) => {
        const [x, y, fs, ta] = orig[i];
        if (!m) { t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('font-size', fs); ta ? t.setAttribute('text-anchor', ta) : t.removeAttribute('text-anchor'); return; }
        const big = i < 2; t.setAttribute('font-size', big ? 40 : 30);
        if (i === 0) { t.setAttribute('x', +x + 10); t.setAttribute('y', +y - 16); }
        if (i === 1) { t.setAttribute('x', +x - 40); t.setAttribute('y', +y - 34); t.setAttribute('text-anchor', 'end'); }
        if (i === 2) { t.setAttribute('x', +x + 118 - 24); t.setAttribute('y', +y + 50); t.setAttribute('text-anchor', 'end'); }
      });
      if (trav) trav.setAttribute('r', m ? 12 : 5);
      $$('.city circle', svg).forEach(c => c.setAttribute('r', m ? (c.classList.contains('p') ? 14 : 11) : (c.closest('.city') === cities[2] ? 4 : 6)));
    };
    geoLayout(); addEventListener('resize', geoLayout);
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
      const fr = document.documentElement.lang === 'fr';
      $$('[required]', cf).forEach(el => {
        const bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
        el.closest('.fld').classList.toggle('err', bad); if (bad && ok) { el.focus(); ok = false; }
      });
      const file = $('#fl', cf), big = file && file.files[0] && file.files[0].size > 10 * 1024 * 1024;
      if (file) file.closest('.fld').classList.toggle('err', !!big);
      if (big && cfErr) { cfErr.hidden = false; cfErr.textContent = fr ? 'Fichier trop lourd (10 Mo max) — partagez plutôt un lien dans le message.' : 'File too large (10 MB max) — share a link in your message instead.'; ok = false; }
      if (!ok) return;
      const fd = new FormData(cf);
      if (file && !file.files.length) fd.delete('file');
      fd.append('page', location.pathname);
      submitBtn.disabled = true; cfErr && (cfErr.hidden = true);
      try {
        const r = await fetch('/api/contact', { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'Request failed');
        cf.classList.add('sent'); setTimeout(() => recv.classList.add('show'), 400);
      } catch (err) {
        if (cfErr) { cfErr.hidden = false; cfErr.textContent = document.documentElement.lang === 'fr' ? 'Une erreur est survenue — écrivez-nous directement à contact@scenagrowth.fr.' : 'Something went wrong — please email contact@scenagrowth.fr directly.'; }
      } finally { submitBtn.disabled = false; }
    });
    // Objective drives the Real Estate questions; contextual CTAs preselect it.
    const ob = $('#ob', cf), reQ = $('[data-re-block]', cf);
    const setObj = key => { if (!ob) return; const o = $(`option[data-key="${key}"]`, ob); if (o) { ob.value = o.value; ob.dispatchEvent(new Event('change')); } };
    if (ob && reQ) ob.addEventListener('change', () => { reQ.hidden = (ob.selectedOptions[0] || {}).dataset?.key !== 're'; });
    try { const k = new URLSearchParams(location.search).get('objective'); if (k) setObj(k); } catch (e) {}
    $$('[data-objective]').forEach(a => a.addEventListener('click', () => setObj(a.dataset.objective)));
    const again = $('#again');
    again && (again.onclick = () => { recv.classList.remove('show'); cf.reset(); setTimeout(() => cf.classList.remove('sent'), 300); });
  }

  /* ---------- Real Estate: plan → property frame sequence ---------- */
  const reSeq = $('#reSeq');
  if (reSeq) {
    const tabs = $$('.re-tabs button', reSeq), frames = $$('.re-frame', reSeq);
    reSeq.classList.add('on');
    let cur = 0, timer = null;
    const show = i => {
      cur = (i + frames.length) % frames.length;
      frames.forEach((f, j) => f.classList.toggle('on', j === cur));
      tabs.forEach((t, j) => t.setAttribute('aria-current', String(j === cur)));
      const img = $('img', frames[cur]); if (img && img.loading === 'lazy') img.loading = 'eager';
    };
    const stop = () => { clearInterval(timer); timer = null; };
    tabs.forEach((t, i) => t.addEventListener('click', () => { stop(); show(i); }));
    reSeq.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { stop(); show(cur + (e.key === 'ArrowRight' ? 1 : -1)); tabs[cur].focus(); } });
    if (!RM && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && !timer && !reSeq.dataset.touched) timer = setInterval(() => show(cur + 1), 3800);
        else if (!e.isIntersecting) stop();
      }), { threshold: .4 }).observe(reSeq);
      reSeq.addEventListener('pointerdown', () => { reSeq.dataset.touched = '1'; stop(); });
    }
    show(0);
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
    if (!seen && !RM && !isMobile()) setTimeout(() => { if (!document.body.classList.contains('menu-open')) setWa(true); }, 14000);
    // Every WhatsApp CTA goes through /wa (server redirect) — the number is never in the page.
    $$('[data-wa]').forEach(a => a.addEventListener('click', () => setWa(false)));
  }

  /* ---------- pause decorative animations while off screen ---------- */
  if ('IntersectionObserver' in window) {
    const offIO = new IntersectionObserver(es => es.forEach(e => {
      const off = !e.isIntersecting;
      e.target.classList.toggle('offscreen', off);
      $$('svg', e.target).forEach(sv => { if (sv.pauseAnimations) off ? sv.pauseAnimations() : sv.unpauseAnimations(); });
    }), { rootMargin: '200px 0px' });
    $$('main section, main > article > section').forEach(sec => offIO.observe(sec));
  }

  /* ---------- main loop ----------
     Runs only while something moves (scroll, resize, pointer, playback or an easing still settling),
     reads layout first and writes after, and skips writes whose value did not change. */
  const prog = $('#progress'), contactSec = $('#contact');
  let vh = innerHeight, docH = document.documentElement.scrollHeight;
  let running = false, busy = 0, lastY = -1, lastW = -1, mobileDone = false;
  const set = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; el.style[k] = v; } };
  const setVar = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; el.style.setProperty(k, v); } };
  const wake = () => { busy = 90; if (!running) { running = true; requestAnimationFrame(frame); } };
  const onResize = () => { vh = innerHeight; docH = document.documentElement.scrollHeight; hsList.forEach(o => { o.track._transform = undefined; o._tx = undefined; }); layoutHS(); measureRot(); mobileDone = false; wake(); };
  addEventListener('resize', onResize); onResize();
  addEventListener('load', onResize);
  if ('ResizeObserver' in window) new ResizeObserver(() => { docH = document.documentElement.scrollHeight; wake(); }).observe(document.body);
  ['scroll', 'pointermove', 'pointerdown', 'click', 'keydown', 'touchstart'].forEach(t => addEventListener(t, wake, { passive: true }));

  function frame() {
    const y = scrollY, scrolled = y !== lastY || innerWidth !== lastW; lastY = y; lastW = innerWidth;
    const mob = isMobile();

    /* ---- read phase ---- */
    if (scrolled) revealFallback();
    let inContact = false;
    if (mcta && scrolled && contactSec) { const cr = contactSec.getBoundingClientRect(); inContact = cr.top < vh - 40 && cr.bottom > vh - 40; }
    let hr = null, heroH = 0;
    if (hero && heroStage) { hr = hero.getBoundingClientRect(); heroH = hero.offsetHeight; }
    let mr = null;
    if (mom && !RM && scrolled) mr = mom.getBoundingClientRect();
    const hubW = hub && sides.length && !mob ? sides[0].offsetWidth + 'px' : null;
    let fmtNext = fmtAct;
    if (fmtRows.length && scrolled) {
      let best = null, bd = 1e9;
      fmtRows.forEach(li => { const r = li.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - vh * .5); if (r.bottom > 0 && r.top < vh && d < bd) { bd = d; best = li; } });
      fmtNext = bd < vh * .3 ? best : null;
    }
    const hsRects = scrolled ? hsList.map(o => {
      if (!o.pin) return null;
      const r = o.sec.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return null;
      return { r, fr: o.frames.map(f => f.getBoundingClientRect()) };
    }) : null;

    /* ---- write phase ---- */
    if (prog && scrolled) set(prog, 'transform', `scaleX(${clamp(y / Math.max(1, docH - vh)).toFixed(4)})`);
    if (nav && scrolled) nav.classList.toggle('compact', y > 40);
    const inPin = hsRects && hsRects.some(m => m && m.r.top <= 1 && m.r.bottom >= vh - 1);
    if (mcta && scrolled) mcta.classList.toggle('show', y > vh * .9 && !inContact && !inPin);

    // cursor + float image
    cx = lerp(cx, mx, .2); cy = lerp(cy, my, .2);
    if (fine && cur) set(cur, 'transform', `translate(${cx.toFixed(1)}px,${cy.toFixed(1)}px)`);
    if (ff) {
      if (fOn) { fx = lerp(fx, mx, .12); fy = lerp(fy, my, .12); ff.style.transform = `translate(${fx - 140}px,${fy - 105}px) rotate(${(mx - fx) * .04}deg)`; }
      else { fx = mx; fy = my; }
    }

    // hero
    if (hr && hr.bottom > 0) {
      const p = clamp(-hr.top / (heroH - vh));
      setRot(Math.min(3, Math.floor(p * 4.001)));
      split = lerp(split, splitT, .06);
      const merge = RM ? 0 : p;
      const s = lerp(split, 8, clamp((merge - .45) / .5));
      setVar(heroStage, '--split', s.toFixed(2) + '%');
      set(heroAe, 'opacity', (1 - clamp((merge - .75) / .25) * .45).toFixed(3));
      if (!RM) {
        set(heroFr, 'transform', `translate3d(${((split - 50) * -.3).toFixed(2)}px,${(p * -40).toFixed(2)}px,0) scale(${(1.02 + p * .08).toFixed(4)})`);
        const ai = heroAe._img || (heroAe._img = $('img', heroAe));
        set(ai, 'transform', `translate3d(${((split - 50) * .4).toFixed(2)}px,${(p * 30).toFixed(2)}px,0) scale(${(1.04 + p * .05).toFixed(4)})`);
      }
    }

    // keywords
    if (mr && mr.bottom > 0 && mr.top < vh) { const d = mr.top - vh / 2; kws.forEach(k => set(k, 'transform', `translate3d(0,${(d * k.dataset.speed).toFixed(1)}px,0)`)); }

    if (fmtNext !== fmtAct) { fmtAct && fmtAct.classList.remove('act'); fmtNext && fmtNext.classList.add('act'); fmtAct = fmtNext; }

    // bridge hub position
    if (hubW) setVar(hub, '--hub', hubW);

    // horizontal
    if (hsRects) hsList.forEach((o, k) => {
      const m = hsRects[k]; if (!m) return;
      const p = clamp(-m.r.top / o.dist || 0);
      set(o.track, 'transform', `translate3d(${(-p * o.dist).toFixed(1)}px,0,0)`);
      const n = o.bars.length;
      o.bars.forEach((b, i) => { const f = clamp(p * n - i); setVar(b, '--f', f.toFixed(3)); b.classList.toggle('on', p * n >= i && p * n < i + 1 || (i === n - 1 && p >= 1)); });
      // frame rects were read before the track moved this frame; shift them by the same delta
      const shift = (-p * o.dist) - (o._tx || 0); o._tx = -p * o.dist;
      let act = 0;
      o.frames.forEach((f, i) => { const fr = m.fr[i]; const left = fr.left + shift; const c = left + fr.width / 2; const on = c > innerWidth * .1 && c < innerWidth * .9; f.classList.toggle('act', on); if (left < innerWidth * .5) act = i; });
      if (method && o.sec === method) { method.dataset.env = act + 1; mCount && (mCount.textContent = `0${act + 1} / 05`); }
    });
    if (!mobileDone) { hsList.forEach(o => { if (!o.pin) o.frames.forEach(f => f.classList.add('act')); }); mobileDone = true; }

    // journeys (jState reads all its rects before writing)
    if (scrolled && jA) {
      const a = jState(jA); const ia = Math.max(0, a.n - 1);
      if (ia !== lastA) { lastA = ia; if (dossier) { dossier.dataset.s = ia; dosN.textContent = String(ia + 1).padStart(2, '0'); dosT.textContent = $('h3', a.st[ia]).textContent; } }
    }
    if (scrolled && jB) {
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

    // keep running while something moves; otherwise sleep until the next event
    if (scrolled || playing || fOn) busy = Math.max(busy, 30);
    if (--busy > 0) requestAnimationFrame(frame); else running = false;
  }
  wake();
})();
