/* The 100th · solo Daily, playable preview */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reduce() ? Math.min(ms, 60) : ms));
  const ANSWER_MS = 25000, READ_MS = 3000, DYM_MAX_MS = 3000;
  const ANGLES = [-128, -52, 18, 76, 136, 196, 250];
  const LIGHT = { fold: 0, gate: 70, green: 84, rocky: 96, ravine: 108, star: 124, thorn: 46 };
  const LAUNCH = new Date(2026, 10, 25);

  /* ---------- matching ---------- */
  const LEAD = new Set(['the', 'king', 'queen', 'saint', 'st', 'prophet', 'prophetess', 'apostle', 'judge', 'mount', 'mt', 'mountain', 'lady', 'sister', 'brother']);
  function norm(s) {
    let t = (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    let parts = t.split(' ');
    while (parts.length > 1 && LEAD.has(parts[0])) parts.shift();
    return parts.join(' ');
  }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 9;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }
  const allowed = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : 2);

  function indexPrompt(pr) {
    if (pr._idx) return pr._idx;
    const entries = [];
    pr.answers.forEach((a, i) => {
      [a[0], ...(a[4] || [])].forEach((n) => entries.push({ key: norm(n), type: 'ok', i }));
    });
    (pr.rejected || []).forEach((r, i) => r[0].forEach((n) => entries.push({ key: norm(n), type: 'no', i })));
    pr._idx = entries;
    return entries;
  }

  // returns {kind:'ok'|'no'|'maybe'|'none'|'blank', i}
  function match(pr, raw) {
    const q = norm(raw);
    if (!q) return { kind: 'blank' };
    const idx = indexPrompt(pr);
    const exact = idx.find((e) => e.key === q && e.type === 'ok') || idx.find((e) => e.key === q);
    if (exact) return { kind: exact.type, i: exact.i };
    let best = null, bestD = 99;
    for (const e of idx) {
      const d = lev(q, e.key);
      if (d <= allowed(e.key.length) && (d < bestD || (d === bestD && e.type === 'ok' && best.type !== 'ok'))) { best = e; bestD = d; }
    }
    if (!best) return { kind: 'none' };
    return best.type === 'ok' ? { kind: 'maybe', i: best.i } : { kind: 'no', i: best.i };
  }
  window.__match = match; // handy for testing in the console

  /* ---------- state ---------- */
  let P, shepherd, state;
  const game = $('#game');
  const els = {
    intro: $('#gIntro'), round: $('#gRound'), end: $('#gEnd'),
    roundN: $('#gRoundN'), prompt: $('#gPrompt'), form: $('#gForm'), input: $('#gInput'), lock: $('#gLock'),
    wick: $('.g-wick'), wickPath: $('#gWickPath'), flame: $('#gFlame'), time: $('#gTime'),
    dym: $('#gDym'), dymName: $('#gDymName'), dymYes: $('#gDymYes'), dymNo: $('#gDymNo'),
    reveal: $('#gReveal'), score: $('#gScore'), dots: $('#gDots'), day: $('#gDay'),
    foldCount: $('#gFoldCount'), rejoice: $('#gRejoice'), bible: $('#gBibleOnly'), start: $('#gStart'),
  };

  /* deal 7 prompts at random, steering away from the ones in your last game */
  const PER_GAME = 7, SEEN_KEY = 'the100th.recent';
  function dealPrompts() {
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch { }
    const all = window.PROMPTS.slice();
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const fresh = shuffle(all.filter((p) => !recent.includes(p.id)));
    const stale = shuffle(all.filter((p) => recent.includes(p.id)));
    const set = fresh.concat(stale).slice(0, PER_GAME);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(set.map((p) => p.id))); } catch { }
    return set;
  }

  function dayNumber() {
    const d = Math.floor((Date.now() - LAUNCH.getTime()) / 86400000) + 1;
    return Math.max(1, d);
  }

  function fresh() {
    return { round: 0, score: 0, results: [], found: null, timer: null, phase: 'intro', dymTarget: null };
  }

  function open(originEl) {
    if (originEl) {
      const r = originEl.getBoundingClientRect();
      game.style.setProperty('--ox', `${r.left + r.width / 2}px`);
      game.style.setProperty('--oy', `${r.top + r.height / 2}px`);
    }
    game.hidden = false;
    document.body.style.overflow = 'hidden';
    els.day.textContent = `Day ${dayNumber()}`;
    if (!P) P = window.buildPasture($('#gMap'), { id: 'g', seed: 21, lostAngle: 0, label: 'Your pasture. Your Shepherd walks out to the ring your answer reaches.' });
    $('#gMap').classList.add('is-drawing');
    reset();
    setTimeout(() => els.start.focus(), 400);
  }

  function close() {
    stopTimer();
    state && (state.phase = 'closed');
    if (reduce()) { finishClose(); return; }
    game.classList.add('is-closing');
    setTimeout(finishClose, 480);
  }
  function finishClose() {
    game.classList.remove('is-closing');
    game.hidden = true;
    document.body.style.overflow = '';
  }

  function reset() {
    stopTimer();
    state = fresh();
    P.reset();
    shepherd = P.makeShepherd();
    P.place(shepherd, 500, 500, 60);
    els.score.textContent = '0';
    els.foldCount.textContent = '99 safe in the fold';
    els.foldCount.classList.remove('is-hundred');
    state.set = dealPrompts();
    els.dots.innerHTML = state.set.map((_, i) => `<li aria-label="Prompt ${i + 1}"></li>`).join('');
    show('intro');
  }

  function show(which) {
    els.intro.hidden = which !== 'intro';
    els.round.hidden = which !== 'round';
    els.end.hidden = which !== 'end';
  }

  /* ---------- round flow ---------- */
  async function startRound() {
    const i = state.round;
    const pr = state.set[i];
    state.phase = 'read';
    show('round');
    els.reveal.hidden = true; els.reveal.innerHTML = '';
    els.dym.hidden = true;
    els.form.hidden = false;
    els.wick.classList.remove('is-low', 'is-out');
    els.wick.hidden = false; els.time.parentElement.hidden = false;
    setWick(1);
    els.time.textContent = '25';
    [...els.dots.children].forEach((d, k) => d.classList.toggle('is-current', k === i));
    els.roundN.textContent = `Prompt ${i + 1} of ${state.set.length}`;
    const words = pr.text.split(' ');
    els.prompt.innerHTML = words.map((w, k) => `<span class="w" style="--i:${k};--r:${(k % 2 ? 4 : -4)}deg">${w}</span>`).join(' ') +
      `<svg class="g-prompt-line" viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true" style="--dl:${0.25 + words.length * 0.085}s"><path d="M2 9 C 60 3, 120 13, 180 7 S 270 5, 298 8" pathLength="1"/></svg>`;
    // the panel turns like a page
    els.round.classList.remove('is-entering'); void els.round.offsetWidth; els.round.classList.add('is-entering');
    els.input.value = '';
    els.input.disabled = true; els.lock.disabled = true;
    els.input.placeholder = 'Read it first…';

    // Shepherd heads back to the fold while you read
    if (Math.hypot(shepherd.x - 500, shepherd.y - 500) > 4) {
      P.walk(shepherd, 500, 500, { duration: 900, prints: false, light: 60 });
    }
    await wait(READ_MS);
    if (state.phase !== 'read') return;
    state.phase = 'answer';
    els.input.disabled = false; els.lock.disabled = false;
    els.input.placeholder = 'Your answer';
    els.input.focus();
    runTimer();
  }

  function setWick(frac) {
    const f = Math.max(0, frac);
    els.wickPath.style.strokeDasharray = `${f} 2`;
    const L = els.wickPath.getTotalLength();
    const pt = els.wickPath.getPointAtLength(L * f);
    const svg = els.wickPath.ownerSVGElement;
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    els.flame.style.left = `${(pt.x / vb.width) * box.width}px`;
    els.flame.style.top = `${(pt.y / vb.height) * box.height}px`;
  }

  function runTimer() {
    let elapsed = 0, last = performance.now();
    state.pausedAt = null;
    const tick = (now) => {
      if (state.phase !== 'answer' && state.phase !== 'check') return;
      const dt = now - last; last = now;
      if (state.pausedAt != null) {
        if (now - state.pausedAt > DYM_MAX_MS) state.pausedAt = null; // pause is capped
      } else elapsed += dt;
      const left = Math.max(0, ANSWER_MS - elapsed);
      setWick(left / ANSWER_MS);
      els.time.textContent = Math.ceil(left / 1000);
      els.wick.classList.toggle('is-low', left < 6000);
      // embers fly off the wick, faster as the oil runs out
      const gap = left < 6000 ? 70 : 260;
      if (!reduce() && state.pausedAt == null && now - (state.lastEmber || 0) > gap) { state.lastEmber = now; ember(left < 6000); }
      if (left <= 0) { els.wick.classList.add('is-out'); submit(true); return; }
      state.timer = requestAnimationFrame(tick);
    };
    state.timer = requestAnimationFrame(tick);
  }
  function stopTimer() { if (state && state.timer) cancelAnimationFrame(state.timer); }

  function submit(timeUp) {
    if (state.phase !== 'answer' && state.phase !== 'check') return;
    const pr = state.set[state.round];
    const raw = els.input.value;
    const m = match(pr, raw);
    if (m.kind === 'maybe' && !timeUp && state.phase === 'answer') {
      // in-round check, clock waits up to 3s
      state.phase = 'check';
      state.pausedAt = performance.now();
      state.dymTarget = m.i;
      els.dymName.textContent = pr.answers[m.i][0];
      els.dym.hidden = false;
      els.dymYes.focus();
      return;
    }
    if (state.phase === 'check' && timeUp && state.dymTarget != null) {
      return resolve({ kind: 'ok', i: state.dymTarget }, raw); // time ran out mid-check: be generous
    }
    resolve(m.kind === 'maybe' ? { kind: 'ok', i: m.i } : m, raw);
  }

  function dymAnswer(yes) {
    if (state.phase !== 'check') return;
    els.dym.hidden = true;
    if (yes) return resolve({ kind: 'ok', i: state.dymTarget }, els.input.value);
    state.phase = 'answer';
    state.pausedAt = null;
    state.dymTarget = null;
    els.input.focus();
    els.input.select();
  }

  async function resolve(m, raw) {
    stopTimer();
    state.phase = 'reveal';
    els.dym.hidden = true;
    els.input.disabled = true; els.lock.disabled = true;
    const i = state.round, pr = state.set[i];
    let ring, result;
    if (m.kind === 'ok') {
      const a = pr.answers[m.i];
      ring = window.ringFor(a[1]);
      result = { prompt: pr.text, answer: a[0], pct: a[1], ref: a[2], note: a[3], ring, pts: ring.pts };
    } else {
      ring = window.THORN;
      const note = m.kind === 'no' ? pr.rejected[m.i][1]
        : m.kind === 'blank' ? 'No answer this time. The Shepherd waited by the gate.'
          : "That one isn't in this prompt's answer key. Your Shepherd's caught in the thorns for a moment.";
      result = { prompt: pr.text, answer: raw.trim() || '(blank)', note, ring, pts: 0, invalid: true };
    }
    state.results.push(result);
    state.score += result.pts;

    // the walk
    const angle = ANGLES[i];
    const key = ring.key;
    const [tx, ty] = key === 'fold' ? P.polar(62, angle) : P.pointFor(key, angle);
    els.form.hidden = true; els.wick.hidden = true; els.time.parentElement.hidden = true;
    await P.walk(shepherd, tx, ty, { light: LIGHT[key] || 60 });
    if (key === 'thorn') P.growThorns(tx, ty + 6);
    else if (LIGHT[key]) P.addHole(tx, ty, LIGHT[key], true);

    const dot = els.dots.children[i];
    dot.classList.remove('is-current');
    dot.classList.add('is-done');
    dot.style.setProperty('--c', ring.color);
    countTo(els.score, state.score - result.pts, state.score);

    const isFirstFind = key === 'star' && state.found == null;
    renderReveal(result, pr, isFirstFind);
    if (isFirstFind) {
      state.found = i + 1;
      dot.classList.add('is-star');
      await foundSequence(angle);
    }
    const next = $('#gNext');
    if (next) { next.disabled = false; next.focus({ preventScroll: true }); }
  }

  function renderReveal(r, pr, finding) {
    const pctLine = r.invalid ? '' :
      r.ring.key === 'gate' ? `${fmt(r.pct)}% of players also thought they were being clever.` :
        `${fmt(r.pct)}% of players said ${r.answer}.`;
    const deepPool = pr.answers.filter((a) => a[1] < 1 && a[0] !== r.answer);
    const deep = deepPool[Math.floor(Math.random() * deepPool.length)];
    const last = state.round === state.set.length - 1;
    const k = r.ring.key;
    const rays = k === 'star' ? `<svg class="rv-rays" viewBox="-60 -60 120 120" aria-hidden="true">${Array.from({ length: 14 }, (_, j) => `<path d="M-3 -24 L0 -58 L3 -24Z" transform="rotate(${j * 360 / 14})"/>`).join('')}</svg>` : '';
    const thorns = k === 'thorn' ? `<svg class="rv-thorns" viewBox="-40 -40 80 80" aria-hidden="true"><path pathLength="1" d="M-30 18 Q-10 6 -26 -14 M-26 -14 l-6 -2 M-18 -2 l-6 4 M30 16 Q10 4 24 -18 M24 -18 l6 -1 M17 -4 l6 3 M-8 32 Q2 18 12 32 M2 24 l0 6"/></svg>` : '';
    els.reveal.innerHTML = `
      <div class="rv-head rv-head--${k}" style="--c:${r.ring.color}">
        <span class="rv-badge">
          ${rays}
          <span class="rv-swatch ${k === 'star' ? 'is-star' : ''}"><span class="rv-icon">${r.ring.emoji}</span></span>
          <svg class="rv-ink" viewBox="-30 -30 60 60" aria-hidden="true"><path pathLength="1" d="M2 -27 C 17 -26 28 -13 27 2 C 26 17 13 28 -2 27 C -17 26 -28 13 -27 -2 C -26 -18 -12 -28 6 -26"/></svg>
          ${thorns}
        </span>
        <p class="rv-ring">${r.ring.name.split(' ').map((w, j) => `<span class="w" style="--i:${j};--r:${j % 2 ? 4 : -4}deg">${w}</span>`).join(' ')}<small>${r.invalid ? 'Thornbush · 0 points' : k === 'gate' ? 'So close to clever' : r.ring.line}</small></p>
        <p class="rv-pts" id="rvPtsWrap">+<span id="rvPts">0</span></p>
      </div>
      <div class="rv-body">
        <p class="rv-answer">${esc(r.answer)}${r.ref ? `<span>${r.ref}</span>` : ''}</p>
        <p class="rv-note">${esc(r.note)}</p>
        ${pctLine ? `<div class="rv-pct"><p>${pctLine}</p>${r.invalid ? '' : `<span class="rv-meter" style="--w:${Math.min(100, Math.max(3, r.pct * 2.5))}%"><i></i></span>`}</div>` : ''}
        ${deep ? `<div class="rv-deep-wrap"><p class="rv-deep"><span class="rv-deep-k">From the starlit edge</span><b>${deep[0]}</b> <em>(${deep[2]})</em>. ${esc(deep[3])}</p></div>` : ''}
        <button class="btn rv-next" id="gNext" ${finding ? 'disabled' : ''}><span>${last ? 'See your search' : 'Next prompt'}</span><svg class="nx-arrow" viewBox="0 0 26 12" aria-hidden="true"><path d="M1 6 C 8 4, 15 8, 23 6 M18 1.5 L23.5 6 L18 10.5"/></svg></button>
      </div>`;
    els.reveal.hidden = false;
    countTo($('#rvPts'), 0, r.pts, 700);
    if (r.pts > 0) setTimeout(() => flyPoints($('#rvPtsWrap'), r.pts), reduce() ? 0 : 750);
    $('#gNext').addEventListener('click', next);
  }

  // "+60" lifts off the reveal and lands in the score
  function flyPoints(from, pts) {
    const scoreEl = els.score.parentElement;
    if (reduce() || !from) { scoreEl.classList.add('is-bump'); return; }
    const a = from.getBoundingClientRect(), b = scoreEl.getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'pts-fly';
    f.textContent = `+${pts}`;
    document.body.appendChild(f);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    f.style.left = `${a.left + a.width / 2}px`; f.style.top = `${a.top + a.height / 2}px`;
    f.animate([
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4 - 70}px)) scale(1.35) rotate(-8deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.4)`, opacity: 0.2 },
    ], { duration: 900, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
      f.remove();
      scoreEl.classList.remove('is-bump'); void scoreEl.offsetWidth; scoreEl.classList.add('is-bump');
    };
  }

  // a spark off the burning wick
  function ember(hot) {
    const e = document.createElement('span');
    e.className = 'ember' + (hot ? ' is-hot' : '');
    e.style.left = els.flame.style.left; e.style.top = els.flame.style.top;
    els.wick.appendChild(e);
    const dx = (Math.random() - 0.5) * 40, dy = -26 - Math.random() * (hot ? 50 : 30);
    e.animate([
      { transform: 'translate(-50%,-90%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-90% + ${dy}px)) scale(.2)`, opacity: 0 },
    ], { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => e.remove();
  }

  async function foundSequence(angle) {
    const [sx, sy] = P.showLost(angle + 7);
    await wait(700);
    await P.walk(shepherd, sx - 8, sy, { duration: 600, light: 130 });
    P.lost.classList.remove('is-found');
    shepherd.g.querySelector('.sp-carry').setAttribute('opacity', '1');
    burst(shepherd.g, 34);
    await wait(500);
    const [hx, hy] = P.polar(70, angle);
    await P.walk(shepherd, hx, hy, { duration: 2200, light: 110, trailClass: 'print--home', printColor: '#6A52A3' });
    shepherd.g.querySelector('.sp-carry').setAttribute('opacity', '0');
    P.addToFold();
    els.foldCount.textContent = '100 safe in the fold';
    els.foldCount.classList.add('is-hundred');
    els.rejoice.hidden = false;
    burst(els.foldCount, 26);
    await wait(reduce() ? 1200 : 3600);
    els.rejoice.hidden = true;
  }

  function next() {
    if (state.phase !== 'reveal') return;
    state.round++;
    if (state.round >= state.set.length) return finish();
    startRound();
  }

  /* ---------- end ---------- */
  function shareText() {
    const rings = state.results.map((r) => r.ring.emoji).join('');
    return `${shareFirst()}\nThe 100th · Day ${dayNumber()} · Daily Bible\n${rings} · ${state.score}/700`;
  }
  function shareFirst() {
    return state.found ? `🏡 Carried the lost sheep home in round ${state.found}` : `🏮 Searched ${state.results.reduce((s, r) => s + r.ring.metres, 0)} m, still out there`;
  }

  async function finish() {
    state.phase = 'end';
    [...els.dots.children].forEach((d) => d.classList.remove('is-current'));
    // walk home
    P.walk(shepherd, 500, 500, { duration: 1100, prints: false, light: 60 });
    // the rarest answer from three different prompts
    const picks = state.set
      .map((pr) => [pr.answers.reduce((m, a) => (a[1] < m[1] ? a : m)), pr.text])
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const best = Math.max(...state.results.map((r) => r.pts));
    els.end.innerHTML = `
      <p class="g-eyebrow">Day ${dayNumber()} · Daily Bible</p>
      <div class="g-end-top">
        <p class="g-end-score"><span id="gEndScore">0</span><small>/700</small>
          <svg class="g-end-line" viewBox="0 0 220 16" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M3 10 C 50 3, 110 15, 160 7 S 210 6, 217 9"/></svg>
        </p>
        ${state.found ? `<span class="g-end-seal" aria-hidden="true"><svg viewBox="-50 -50 100 100"><path d="${seal()}"/></svg><span>Found!</span></span>` : ''}
      </div>
      <h2>${state.found ? `You carried the lost sheep home in round ${state.found}.` : 'The sheep is still out there.'}</h2>
      <div class="g-trail" aria-label="Your seven search trips">
        <svg class="g-trail-line" viewBox="0 0 700 40" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M10 28 C 80 4, 130 36, 200 20 S 330 4, 380 22 S 520 36, 580 16 S 670 10, 690 24"/></svg>
        ${state.results.map((r, k) => `<span class="stone ${r.ring.key === 'star' ? 'is-star' : ''} ${r.ring.key === 'thorn' ? 'is-thorn' : ''}" style="--c:${r.ring.color};--k:${k}" title="${r.ring.name}">${r.ring.emoji}</span>`).join('')}
      </div>
      <ol class="g-list">${state.results.map((r, k) => `
        <li style="--c:${r.ring.color};--k:${k}" class="${r.pts === best && best > 0 ? 'is-best' : ''}"><i>${r.ring.emoji}</i><span><b>${esc(r.answer)}</b> <span class="pr">${r.prompt} · ${r.ring.name}</span></span><span class="pts">${r.pts}</span></li>`).join('')}
      </ol>
      <div class="g-share" id="gShare">
        <span class="sc-tape" aria-hidden="true"></span>
        <p class="gs-first">${esc(shareFirst())}</p>
        <p class="gs-head">The 100th · Day ${dayNumber()} · Daily Bible</p>
        <p class="gs-icons">${state.results.map((r, k) => `<span class="${r.ring.key === 'star' ? 'is-star' : ''}" style="--k:${k}">${r.ring.emoji}</span>`).join('')}<span class="gs-score">${state.score}/700</span></p>
      </div>
      <div class="g-share-actions">
        <button class="btn" id="gCopy">Copy share card</button>
        <button class="link-ink" id="gAgain" type="button">Search again</button>
      </div>
      <div class="g-deep">
        <h3>Deep cuts in today's answer key</h3>
        <ul>${picks.map(([a, p]) => `<li><b>${a[0]}</b> (${a[2]}) for “${p}”. ${esc(a[3])}</li>`).join('')}</ul>
      </div>`;
    show('end');
    countTo($('#gEndScore'), 0, state.score, 1400);
    $('#gCopy').addEventListener('click', copyShare);
    $('#gAgain').addEventListener('click', () => { reset(); });
    $('#gCopy').focus({ preventScroll: true });
    if (state.found) burst($('#gEndScore'), 20);
  }

  async function copyShare(e) {
    const btn = e.currentTarget; // read before any await: currentTarget is cleared after dispatch
    const t = shareText();
    try { await navigator.clipboard.writeText(t); }
    catch {
      const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch { }
      ta.remove();
    }
    btn.textContent = 'Copied. Go and gloat.';
    setTimeout(() => (btn.textContent = 'Copy share card'), 2400);
    // an ink stamp thunks onto the card
    const card = $('#gShare');
    card.querySelector('.gs-stamp')?.remove();
    const s = document.createElement('span');
    s.className = 'gs-stamp'; s.textContent = 'Copied';
    card.appendChild(s);
    card.classList.remove('is-thunk'); void card.offsetWidth; card.classList.add('is-thunk');
  }

  // a wax-seal outline: a circle with soft scallops
  function seal() {
    let d = '';
    for (let j = 0; j <= 48; j++) {
      const a = (j / 48) * Math.PI * 2, r = 44 + (j % 2 ? 4 : -1) + Math.sin(j * 1.7) * 1.2;
      d += `${j ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(1)} ${(r * Math.sin(a)).toFixed(1)}`;
    }
    return d + 'Z';
  }

  /* ---------- little helpers ---------- */
  function fmt(n) { return n < 1 ? n.toFixed(1) : n % 1 ? n.toFixed(1) : String(n); }
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function countTo(el, from, to, dur = 900) {
    if (!el) return;
    if (reduce()) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // daisies and petals, the flower from the sheep's mouth
  function burst(target, n = 24) {
    if (reduce()) return;
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let k = 0; k < n; k++) {
      const p = document.createElement('span');
      p.className = 'petal';
      const size = 12 + Math.random() * 16;
      p.style.width = p.style.height = size + 'px';
      p.innerHTML = Math.random() < 0.55
        ? '<svg viewBox="-10 -10 20 20"><use href="#daisy"/></svg>'
        : `<svg viewBox="-6 -10 12 20"><ellipse rx="3" ry="7" fill="${Math.random() < .5 ? '#A992D6' : '#C9B8EA'}" stroke="#1F1C2C" stroke-width=".7"/></svg>`;
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 160;
      const dx = Math.cos(a) * d, up = -60 - Math.random() * 140;
      const rot = (Math.random() - .5) * 720;
      p.animate([
        { transform: `translate(${cx}px, ${cy}px) scale(.2) rotate(0)`, opacity: 1 },
        { transform: `translate(${cx + dx * .6}px, ${cy + up}px) scale(1) rotate(${rot / 2}deg)`, opacity: 1, offset: .35 },
        { transform: `translate(${cx + dx}px, ${cy + up + 260 + Math.random() * 140}px) scale(.8) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: 2000 + Math.random() * 1400, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }).onfinish = () => p.remove();
    }
  }
  window.petalBurst = burst;

  /* ---------- wiring ---------- */
  document.querySelectorAll('[data-play]').forEach((b) => b.addEventListener('click', () => open(b)));
  $('#gClose').addEventListener('click', close);
  els.start.addEventListener('click', () => startRound());
  els.form.addEventListener('submit', (e) => { e.preventDefault(); if (!els.input.value.trim()) { els.form.classList.remove('is-shake'); void els.form.offsetWidth; els.form.classList.add('is-shake'); return; } submit(false); });
  // the ink underline twitches as you write
  els.input.addEventListener('input', () => {
    els.form.classList.remove('is-typing'); void els.form.offsetWidth; els.form.classList.add('is-typing');
  });
  els.dymYes.addEventListener('click', () => dymAnswer(true));
  els.dymNo.addEventListener('click', () => dymAnswer(false));
  document.addEventListener('keydown', (e) => {
    if (game.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === 'Enter' && state && state.phase === 'reveal' && document.activeElement !== $('#gNext')) {
      const n = $('#gNext'); if (n && !n.disabled) { e.preventDefault(); next(); }
    }
  });
  window.addEventListener('resize', () => { if (state && state.phase === 'answer') return; if (!game.hidden && !els.round.hidden) setWick(1); });
})();
