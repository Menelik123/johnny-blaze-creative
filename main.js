/* =========================================================
   JOHNNY BLAZE CREATIVE · interaction layer (no dependencies)
   ========================================================= */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  /* ---------- split headings into characters ---------- */
  $$('.split').forEach(el => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    [...text].forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = c === ' ' ? ' ' : c;
      s.style.transitionDelay = (i * 0.035) + 's';
      el.appendChild(s);
    });
  });
  // stagger whole hero lines
  $$('h1 .split').forEach((el, li) =>
    $$('.ch', el).forEach((c, i) => c.style.transitionDelay = (li * 0.14 + i * 0.035) + 's'));

  /* ---------- loader ---------- */
  const loader = $('.loader');
  const countEl = $('#loaderCount');
  const barEl = $('.loader-bar i');
  let pageLoaded = document.readyState === 'complete';
  addEventListener('load', () => pageLoaded = true);

  const startSite = () => {
    document.body.classList.remove('is-loading');
    $$('h1 .split').forEach(el => el.classList.add('in'));
    $$('.hero .reveal-up').forEach((el, i) => setTimeout(() => el.classList.add('in'), 500 + i * 120));
  };

  if (reduce) {
    loader.classList.add('gone');
    startSite();
  } else {
    const t0 = performance.now();
    const tick = now => {
      const elapsed = now - t0;
      // move to 90% on time, finish when the page has loaded (max 3.5s)
      let p = Math.min(elapsed / 1600, 1) * 90;
      if (pageLoaded || elapsed > 3500) p = Math.min(100, 90 + (elapsed - 1600) / 8);
      p = clamp(p, 0, 100);
      countEl.textContent = Math.floor(p);
      barEl.style.width = p + '%';
      if (p < 100) return requestAnimationFrame(tick);
      setTimeout(() => {
        loader.classList.add('done');
        setTimeout(startSite, 350);
        setTimeout(() => loader.classList.add('gone'), 1400);
      }, 250);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- ember particle field ---------- */
  const canvas = $('#embers');
  const hero = $('.hero');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, dpr, parts = [], heroVisible = true;
    const colors = ['38,118,245', '105,165,255', '207,228,255', '123,92,255', '255,255,255'];
    const make = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 20,
      r: Math.random() * 2.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.9 + 0.25),
      life: 0,
      max: Math.random() * 400 + 250,
      c: colors[Math.random() < 0.78 ? Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)],
      f: Math.random() * Math.PI * 2
    });
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.offsetWidth; h = hero.offsetHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp(w * h / 9000, 40, 160));
      parts = Array.from({ length: n }, () => make(true));
    };
    resize();
    addEventListener('resize', resize);
    new IntersectionObserver(([e]) => heroVisible = e.isIntersecting).observe(hero);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const rect = hero.getBoundingClientRect();
      const mx = mouse.x - rect.left, my = mouse.y - rect.top;
      for (const p of parts) {
        p.life++;
        p.f += 0.05;
        // mouse repulsion
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < 22000) {
          const f = (1 - d2 / 22000) * 0.9;
          const d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx = p.vx * 0.96 + Math.sin(p.f) * 0.02;
        p.vy = p.vy * 0.98 - 0.012;
        p.x += p.vx; p.y += p.vy;
        const fade = Math.sin(Math.PI * clamp(p.life / p.max, 0, 1));
        const flick = 0.65 + Math.sin(p.f * 3) * 0.35;
        const a = fade * flick;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g.addColorStop(0, `rgba(${p.c},${a})`);
        g.addColorStop(1, `rgba(${p.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2); ctx.fill();
        if (p.life > p.max || p.y < -30 || p.x < -30 || p.x > w + 30) Object.assign(p, make(false));
      }
      ctx.globalCompositeOperation = 'source-over';
    };
    const loop = () => { if (heroVisible) draw(); requestAnimationFrame(loop); };
    if (reduce) draw(); else loop();
  }

  /* ---------- hero glow follows mouse ---------- */
  if (fine && !reduce) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  }

  /* ---------- 3D tilt + glare ---------- */
  const tilt = (el, target, max) => {
    const glare = $('.glare', el);
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      target.style.transform = `rotateY(${(px - 0.5) * max}deg) rotateX(${(0.5 - py) * max}deg)`;
      if (glare) { glare.style.setProperty('--gx', px * 100 + '%'); glare.style.setProperty('--gy', py * 100 + '%'); }
    });
    el.addEventListener('pointerleave', () => target.style.transform = '');
  };
  if (fine && !reduce) {
    const ht = $('#heroTilt');
    tilt($('.hero-visual'), ht, 18);
    $$('.gallery-card').forEach(c => tilt(c, $('.gallery-image', c), 12));
  }

  /* ---------- custom cursor ---------- */
  if (fine) {
    document.body.classList.add('has-cursor');
    const cur = $('.cursor'), dot = $('.cursor-dot'), ring = $('.cursor-ring'), label = $('.cursor-label');
    const rp = { x: mouse.x, y: mouse.y };
    const step = () => {
      rp.x = lerp(rp.x, mouse.x, reduce ? 1 : 0.16);
      rp.y = lerp(rp.y, mouse.y, reduce ? 1 : 0.16);
      dot.style.transform = `translate3d(${mouse.x}px,${mouse.y}px,0)`;
      ring.style.transform = `translate3d(${rp.x}px,${rp.y}px,0)`;
      requestAnimationFrame(step);
    };
    step();
    document.addEventListener('pointerover', e => {
      const v = e.target.closest('[data-cursor]');
      const h = e.target.closest('a,button,[data-hover],input,textarea');
      cur.classList.toggle('view', !!v);
      cur.classList.toggle('hover', !v && !!h);
      label.textContent = v ? v.dataset.cursor : '';
    });
    addEventListener('pointerdown', () => cur.classList.add('down'));
    addEventListener('pointerup', () => cur.classList.remove('down'));
    document.addEventListener('pointerleave', () => cur.style.opacity = 0);
    document.addEventListener('pointerenter', () => cur.style.opacity = 1);
  }

  /* ---------- magnetic buttons ---------- */
  if (fine && !reduce) {
    $$('.magnetic').forEach(el => {
      const inner = el.firstElementChild;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.3}px,${y * 0.4}px)`;
        if (inner) inner.style.transform = `translate(${x * 0.15}px,${y * 0.2}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transform = '';
        if (inner) inner.style.transform = '';
      });
    });
  }

  /* ---------- spotlight cards ---------- */
  $$('.spotlight').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--sy', (e.clientY - r.top) + 'px');
  }));

  /* ---------- text scramble ---------- */
  const glyphs = '!<>-_\\/[]{}=+*^?#ABCDEFX01';
  const scramble = el => {
    const final = el.dataset.text;
    let frame = 0;
    const total = final.length * 2.2 + 12;
    const run = () => {
      let out = '';
      for (let i = 0; i < final.length; i++) {
        const settle = i * 2.2 + 8;
        out += frame >= settle || final[i] === ' ' ? final[i] : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (frame++ < total) requestAnimationFrame(run);
    };
    run();
  };

  /* ---------- reveal on scroll ---------- */
  // stagger grid siblings
  $$('.services-grid, .gallery-grid').forEach(g =>
    [...g.children].forEach((c, i) => c.style.transitionDelay = (i % 4) * 0.1 + 's'));

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    if (el.classList.contains('scramble') && !reduce) scramble(el);
    io.unobserve(el);
  }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal-up, .reveal-clip, .scramble').filter(el => !el.closest('.hero')).forEach(el => io.observe(el));
  $$('.split').filter(el => !el.closest('.hero')).forEach(el => io.observe(el));

  /* ---------- about: words light up while scrolling ---------- */
  const about = $('#aboutText');
  const hot = new Set(['bold', 'branding,', 'cultural', 'creativity', 'spark', 'conversation.', 'BLAZE']);
  about.innerHTML = about.textContent.trim().split(/\s+/)
    .map(w => `<span class="w${hot.has(w) ? ' is-hot' : ''}">${w}</span>`).join(' ');
  const words = $$('.w', about);
  const lightWords = () => {
    const r = about.getBoundingClientRect();
    const p = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35), 0, 1);
    const n = Math.round(p * words.length);
    words.forEach((w, i) => {
      w.classList.toggle('lit', i < n);
      w.classList.toggle('hot', i < n && w.classList.contains('is-hot'));
    });
  };
  if (reduce) words.forEach(w => w.classList.add('lit'));

  /* ---------- marquee driven by scroll velocity ---------- */
  const tracks = $$('.marquee .track').map((t, i) => ({ el: t, x: 0, dir: i === 0 ? -1 : 1 }));
  let lastY = scrollY, velocity = 0;
  const runMarquee = () => {
    const dy = scrollY - lastY; lastY = scrollY;
    velocity = lerp(velocity, dy, 0.1);
    tracks.forEach(t => {
      const half = t.el.scrollWidth / 2;
      t.x += t.dir * (0.6 + Math.abs(velocity) * 0.5);
      if (t.x <= -half) t.x += half;
      if (t.x >= 0) t.x -= half;
      t.el.style.transform = `translate3d(${t.x}px,0,0) skewX(${clamp(-velocity * 0.4, -12, 12)}deg)`;
    });
    requestAnimationFrame(runMarquee);
  };
  if (!reduce) { tracks.forEach(t => t.dir === 1 && (t.x = -t.el.scrollWidth / 2)); runMarquee(); }

  /* ---------- nav: shrink, hide on scroll down, active link ---------- */
  const nav = $('#nav'), bar = $('#progressBar');
  let prevY = 0;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hide', y > prevY && y > 400 && !navLinks.classList.contains('open'));
    prevY = y;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    lightWords();
  };
  const navLinks = $('#navLinks');
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const linkFor = id => $(`.main-nav a[href="#${id}"]`);
  const navObserver = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    $$('.main-nav a').forEach(a => a.classList.remove('active'));
    const l = linkFor(e.target.id); if (l && !l.classList.contains('nav-cta')) l.classList.add('active');
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('section[id]').forEach(s => navObserver.observe(s));

  /* ---------- mobile menu ---------- */
  const burger = $('#burger');
  const setMenu = open => {
    navLinks.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
  $$('a', navLinks).forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- lightbox ---------- */
  const cards = $$('.gallery-card');
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let idx = 0;
  const show = i => {
    idx = (i + cards.length) % cards.length;
    const img = $('img', cards[idx]);
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbImg.style.animation = 'none'; lbImg.offsetHeight; lbImg.style.animation = '';
    lbCap.textContent = `${$('h3', cards[idx]).textContent} · ${$('.card-caption p', cards[idx]).textContent}`;
  };
  const openLb = i => { show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; $('#lbClose').focus(); };
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; cards[idx].focus?.(); };
  cards.forEach((c, i) => {
    c.tabIndex = 0;
    c.setAttribute('role', 'button');
    c.addEventListener('click', () => openLb(i));
    c.addEventListener('keydown', e => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openLb(i)));
  });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => show(idx - 1));
  $('#lbNext').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('click', e => e.target === lb && closeLb());
  addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
})();

/* ---------- booking form fallback ----------
   Netlify Forms only works when hosted on Netlify. Anywhere else
   (Vercel preview, local), send the booking to WhatsApp prefilled. */
(() => {
  const form = document.querySelector('.booking-form');
  if (!form || !/vercel\.app$|^localhost$|^127\.0\.0\.1$/.test(location.hostname)) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const text = `Hi Johnny Blaze Creative! Booking request:\n\nName: ${d.get('name')}\nEmail: ${d.get('email')}\n\n${d.get('message') || ''}`;
    window.open('https://wa.me/2348120712205?text=' + encodeURIComponent(text), '_blank', 'noopener');
    const btn = form.querySelector('button span');
    btn.textContent = 'Opening WhatsApp ✓';
    setTimeout(() => { btn.innerHTML = 'Book Now <b aria-hidden="true">→</b>'; form.reset(); }, 4000);
  });
})();
