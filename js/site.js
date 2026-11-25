/* The 100th · page motion */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) $$('.boil-anim').forEach((a) => a.remove());

  /* hero words get their own beat */
  $$('.hero-title .w').forEach((w, i) => { w.style.setProperty('--i', i); w.style.setProperty('--r', `${i % 2 ? 5 : -5}deg`); });
  $('.wordmark-sheep').innerHTML = window.miniSheepSVG();

  /* nav hairline */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- talking sheep ---------- */
  function sayer(fig) {
    const out = $('.bubble-text', fig);
    let token = 0;
    return function say(text) {
      const my = ++token;
      fig.classList.remove('is-hopping', 'is-idle'); void fig.offsetWidth; fig.classList.add('is-hopping');
      setTimeout(() => { if (my === token) { fig.classList.remove('is-hopping'); fig.classList.add('is-idle'); } }, 600);
      if (reduce) { out.textContent = text; return; }
      out.innerHTML = '<span class="t"></span><span class="caret"></span>';
      const t = $('.t', out);
      let k = 0;
      (function type() {
        if (my !== token) return;
        t.textContent = text.slice(0, ++k);
        if (k < text.length) setTimeout(type, 34 + (/[.,!?]/.test(text[k - 1]) ? 160 : 0));
        else setTimeout(() => { if (my === token) $('.caret', out)?.remove(); }, 900);
      })();
    };
  }
  const heroFig = $('#heroSheep');
  const sayHero = sayer(heroFig);
  const LINES = ["Baa. I'm the lost one.", "The 99 are fine. I'm out here.", 'Nobody ever says Shamgar.', 'Try past the Dark Ravine.', 'Bring the lantern closer?'];
  let lineIdx = 0, lineTimer, foundNow = false;
  function nextLine() {
    if (!foundNow) sayHero(LINES[lineIdx++ % LINES.length]);
    lineTimer = setTimeout(nextLine, 5200);
  }
  setTimeout(nextLine, reduce ? 0 : 3300);

  /* ---------- hero pasture + lantern ---------- */
  const heroHost = $('#heroPasture');
  const H = window.buildPasture(heroHost, { id: 'hero', seed: 7, lostAngle: 38 });
  heroHost.classList.add('is-drawing');
  const hole = H.addHole(500, 500, 0);
  const lamp = H.el('g', { class: 'hl', opacity: 0 }, H.svg.querySelector('.hover-lantern'));
  lamp.innerHTML = `<circle r="70" fill="url(#lanternGlow)" opacity=".22"/><path d="M-30 -58 Q-30 -70 -22 -74" stroke="#1F1C2C" stroke-width="1.6" fill="none" opacity=".6"/><g transform="translate(-30 -44) scale(2.2)"><circle r="9" fill="url(#lanternGlow)"/><path d="M-3 -4 L3 -4 L2.4 4 L-2.4 4Z" fill="#F6D37A" stroke="#1F1C2C" stroke-width=".9"/><path d="M-2 -6.5 Q0 -9 2 -6.5" stroke="#1F1C2C" stroke-width=".9" fill="none"/><path d="M-3.4 -4 L3.4 -4 M-2.8 4 L2.8 4" stroke="#1F1C2C" stroke-width="1.2"/></g>`;
  let cur = { x: 500, y: 330 }, target = { ...cur }, lastPointer = -1e9, lampOn = 0, t = 0;
  const [LX, LY] = H.lostPos;

  function toSvg(e) {
    const pt = H.svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(H.svg.getScreenCTM().inverse());
  }
  H.svg.addEventListener('pointermove', (e) => { const p = toSvg(e); target = { x: p.x, y: p.y }; lastPointer = performance.now(); });
  H.svg.addEventListener('pointerdown', (e) => { const p = toSvg(e); target = { x: p.x, y: p.y }; lastPointer = performance.now(); });

  let heroVisible = true;
  new IntersectionObserver(([en]) => { heroVisible = en.isIntersecting; }).observe(heroHost);

  function lanternLoop(now) {
    requestAnimationFrame(lanternLoop);
    if (!heroVisible) return;
    t += 0.0045;
    const user = now - lastPointer < 2600;
    if (!user) {
      // the Shepherd's lantern wanders the middle ground on its own, never quite reaching the edge
      const r = 250 + 110 * Math.sin(t * 0.9);
      const a = t * 0.55 + Math.sin(t * 1.7) * 0.4;
      target = { x: 500 + r * Math.cos(a), y: 500 + r * Math.sin(a) };
    }
    const k = reduce ? 1 : user ? 0.16 : 0.05;
    cur.x += (target.x - cur.x) * k; cur.y += (target.y - cur.y) * k;
    lampOn = Math.min(1, lampOn + 0.02);
    hole.setAttribute('cx', cur.x.toFixed(1)); hole.setAttribute('cy', cur.y.toFixed(1));
    hole.setAttribute('r', (108 * lampOn).toFixed(1));
    lamp.setAttribute('transform', `translate(${cur.x.toFixed(1)} ${cur.y.toFixed(1)})`);
    lamp.setAttribute('opacity', lampOn.toFixed(2));
    const near = Math.hypot(cur.x - LX, cur.y - LY) < 62;
    if (near && !foundNow) {
      foundNow = true;
      H.lost.classList.add('is-glimpsed');
      clearTimeout(lineTimer);
      sayHero('You found me! Rejoice!');
      window.petalBurst && window.petalBurst(H.lost, 22);
      lineTimer = setTimeout(nextLine, 5200);
    } else if (!near && foundNow && Math.hypot(cur.x - LX, cur.y - LY) > 140) {
      foundNow = false;
      H.lost.classList.remove('is-glimpsed');
    }
  }
  requestAnimationFrame(lanternLoop);

  /* ---------- reveals ---------- */
  const groups = new Map();
  $$('[data-reveal]').forEach((el) => {
    const p = el.parentElement;
    const n = groups.get(p) || 0;
    groups.set(p, n + 1);
    el.style.setProperty('--delay', `${n * 0.09}s`);
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], .timeline, .spelling, .thorn-note').forEach((el) => io.observe(el));

  /* strike-throughs, one after another */
  const strikeIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const li = en.target;
      setTimeout(() => li.classList.add('is-struck'), 120);
      strikeIO.unobserve(li);
    });
  }, { threshold: 0.7 });
  $$('[data-strike]').forEach((li) => strikeIO.observe(li));

  /* the typo fixes itself */
  const typo = $('.spelling-typo');
  const fixIO = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    fixIO.disconnect();
    setTimeout(() => {
      const svg = typo.querySelector('svg');
      typo.classList.add('is-fixed');
      typo.innerHTML = 'Zerub<span class="ins">b</span>abel<span class="tick">✓ fixed</span>';
      typo.appendChild(svg);
    }, reduce ? 0 : 2200);
  }, { threshold: 0.6 });
  fixIO.observe($('.spelling'));

  /* ---------- the rings walk (scroll-driven) ---------- */
  const walk = $('#ringWalk'), trail = $('.walk-trail'), path = $('#walkPath'), sp = $('#walkShepherd');
  sp.innerHTML = window.shepherdSVG();
  const stops = $$('.stop', walk);
  let lastP = -1, moveTimer;
  function updateWalk() {
    if (getComputedStyle(trail).display === 'none') { stops.forEach((s) => s.classList.remove('is-lit')); return; }
    const r = walk.getBoundingClientRect(), vh = window.innerHeight;
    const p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / (r.height * 0.95)));
    trail.style.setProperty('--p', p.toFixed(4));
    path.style.setProperty('--p', p.toFixed(4));
    const L = path.getTotalLength();
    const pt = path.getPointAtLength(L * p);
    const tb = trail.getBoundingClientRect();
    const x = tb.left - r.left + (pt.x / 1200) * tb.width;
    const y = tb.top - r.top + (pt.y / 120) * tb.height;
    const dir = p < lastP ? -1 : 1;
    sp.style.transform = `translate(${x}px, ${y}px) translate(-50%, -88%) scaleX(${dir})`;
    if (Math.abs(p - lastP) > 0.0005) {
      sp.classList.add('is-moving');
      clearTimeout(moveTimer);
      moveTimer = setTimeout(() => sp.classList.remove('is-moving'), 180);
    }
    lastP = p;
    const spX = tb.left + (pt.x / 1200) * tb.width;
    stops.forEach((s) => {
      const b = s.getBoundingClientRect();
      s.classList.toggle('is-lit', spX >= b.left + b.width * 0.3 && spX <= b.right + 30);
    });
  }
  let ticking = false;
  const onWalk = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; updateWalk(); }); } };
  window.addEventListener('scroll', onWalk, { passive: true });
  window.addEventListener('resize', onWalk);
  updateWalk();

  /* ---------- party room scene ---------- */
  const roomHost = $('#roomPasture');
  const R = window.buildPasture(roomHost, { id: 'room', seed: 33, lostAngle: 140, label: 'A party room. Five Shepherds walk out at once for: Name a judge of Israel.' });
  const list = $('#roomAnswers');
  const PLAYERS = [
    { who: 'Ana', ans: 'Samson', ring: 'fold', angle: -150, robe: '#9A7350', c: '#EDC873', pts: '5', tag: 'collision', r: 62 },
    { who: 'Ben', ans: 'Samson', ring: 'fold', angle: -112, robe: '#5E7A3E', c: '#EDC873', pts: '5', tag: 'collision', r: 62 },
    { who: 'Cleo', ans: 'Ehud', ring: 'rocky', angle: -28, robe: '#7E6A9E', c: '#B9AD93', pts: '60 +10' },
    { who: 'Dev', ans: 'Deborah', ring: 'gate', angle: 62, robe: '#A4402B', c: '#E6D3A0', pts: '15 +10' },
    { who: 'Eli', ans: 'Tola', ring: 'star', angle: 140, robe: '#2D3858', c: '#1F2744', pts: '100 +10', tag: 'found' },
  ];
  let roomRunning = false;
  async function playRoom() {
    if (roomRunning) return;
    roomRunning = true;
    R.reset();
    list.innerHTML = PLAYERS.map((p) => `<li style="--c:${p.c}"><i></i>${p.who} · ${p.ans} · <b>${p.pts}</b></li>`).join('');
    const items = $$('li', list);
    const sps = PLAYERS.map((p) => { const s = R.makeShepherd(p.robe); R.place(s, 500, 500, 50); return s; });
    await new Promise((r) => setTimeout(r, 500));
    await Promise.all(PLAYERS.map(async (p, i) => {
      await new Promise((r) => setTimeout(r, i * 160));
      const [x, y] = p.r ? R.polar(p.r, p.angle) : R.pointFor(p.ring, p.angle);
      await R.walk(sps[i], x, y, { light: p.ring === 'fold' ? 50 : 90, duration: reduce ? 1 : 1400 + i * 220 });
      items[i].classList.add('is-in');
      if (p.tag === 'collision') items[i].classList.add('is-collide');
    }));
    // Eli found the sheep: carry it home, the whole room sees it
    const eli = sps[4];
    const [sx, sy] = R.showLost(147);
    items[4].classList.add('is-found');
    await new Promise((r) => setTimeout(r, reduce ? 0 : 700));
    await R.walk(eli, sx - 8, sy, { duration: 500, light: 120 });
    R.lost.classList.remove('is-found');
    eli.g.querySelector('.sp-carry').setAttribute('opacity', '1');
    window.petalBurst && window.petalBurst(eli.g, 18);
    const [hx, hy] = R.polar(70, 140);
    await R.walk(eli, hx, hy, { duration: reduce ? 1 : 2000, light: 100, printColor: '#6A52A3' });
    eli.g.querySelector('.sp-carry').setAttribute('opacity', '0');
    R.addToFold();
    roomRunning = false;
  }
  const roomIO = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    roomIO.disconnect();
    roomHost.classList.add('is-drawing');
    setTimeout(playRoom, reduce ? 0 : 1600);
  }, { threshold: 0.4 });
  roomIO.observe(roomHost);
  $('#roomReplay').addEventListener('click', playRoom);

  /* ---------- closer sheep ---------- */
  const closer = $('#closerSheep');
  const sayCloser = sayer(closer);
  const cIO = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    cIO.disconnect();
    closer.classList.add('is-in');
    setTimeout(() => sayCloser('Still out here. Come find me?'), reduce ? 0 : 900);
  }, { threshold: 0.5 });
  cIO.observe(closer);
})();
