/* The pasture: a hand-inked, watercoloured map of six rings.
   buildPasture(container, opts) returns an API to move shepherds, light the dark, and find the lost sheep. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const C = 500; // centre
  // outer edge radius of each ring, Fold → 100th
  const EDGE = { fold: 122, gate: 200, green: 280, rocky: 358, ravine: 428, star: 490 };
  const MID = { fold: 96, gate: 161, green: 240, rocky: 319, ravine: 393, star: 459, thorn: 150 };
  const RING_ORDER = ['star', 'ravine', 'rocky', 'green', 'gate', 'fold'];
  const FILL = { fold: '#EDC873', gate: '#E9D7A6', green: '#A9BF84', rocky: '#BDB298', ravine: '#3B4668', star: '#1E2643' };
  const LABEL = { fold: 'THE FOLD', gate: 'THE GATE', green: 'GREEN PASTURES', rocky: 'ROCKY HILLS', ravine: 'DARK RAVINE', star: 'THE 100TH SHEEP' };
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const f = (n) => n.toFixed(1);

  function closed(pts) {
    const n = pts.length;
    let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return d + 'Z';
  }
  function wobbly(r, amp, seed, n = 56) {
    const R = rng(seed);
    const a1 = R() * 6.3, a2 = R() * 6.3, a3 = R() * 6.3;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r + amp * (Math.sin(a * 3 + a1) * 0.5 + Math.sin(a * 5 + a2) * 0.32 + Math.sin(a * 11 + a3) * 0.18) + (R() - 0.5) * amp * 0.25;
      pts.push([C + rr * Math.cos(a), C + rr * Math.sin(a)]);
    }
    return closed(pts);
  }
  const polar = (r, deg) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];

  /* --- little drawings --- */
  const SHEEP_G = `
    <g class="sh-body">
      <path d="M-4.5 4 L-5 10 M3 4 L3.4 10" stroke="#2D3858" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <g stroke="#1F1C2C" stroke-width="2.4">
        <circle cx="-6" cy="-1" r="5"/><circle cx="-1" cy="-4.5" r="5"/><circle cx="4" cy="-2" r="4.6"/>
        <circle cx="-3" cy="3" r="4.6"/><circle cx="3" cy="2.6" r="4.4"/>
      </g>
      <g fill="#FBF8F0">
        <circle cx="-6" cy="-1" r="5"/><circle cx="-1" cy="-4.5" r="5"/><circle cx="4" cy="-2" r="4.6"/>
        <circle cx="-3" cy="3" r="4.6"/><circle cx="3" cy="2.6" r="4.4"/>
      </g>
      <path d="M7.6 -6.2 q4 -2.6 6.2 .2" stroke="#1F1C2C" stroke-width=".9" fill="#2D3858"/>
      <ellipse cx="9.4" cy="-2.6" rx="3.9" ry="4.7" fill="#2D3858" stroke="#1F1C2C" stroke-width="1"/>
      <circle cx="8.6" cy="-4.3" r="1.25" fill="#fff"/><circle cx="10.9" cy="-4.3" r="1.25" fill="#fff"/>
      <circle cx="8.9" cy="-4.2" r=".55" fill="#1F1C2C"/><circle cx="11.2" cy="-4.2" r=".55" fill="#1F1C2C"/>
    </g>`;

  const SHEPHERD = `
    <g class="sp-bob">
      <ellipse cx="0" cy="15" rx="11" ry="3" fill="#1F1C2C" opacity=".22"/>
      <path class="sp-crook" d="M12 15 L12 -16 Q12 -24 18 -23 Q23 -22 22 -17" stroke="#5B4026" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      <path d="M-9 14 L-6.5 -5 Q0 -9 6.5 -5 L9 14 Q0 16.5 -9 14Z" fill="#9A7350" stroke="#1F1C2C" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M-7.6 2.5 Q0 5 7.6 2.5" stroke="#C9B48A" stroke-width="2.2" fill="none"/>
      <path d="M8 -2 L12 -4" stroke="#1F1C2C" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="0" cy="-10.5" r="4.8" fill="#E4C29C" stroke="#1F1C2C" stroke-width="1.1"/>
      <path d="M-5.8 -9 Q-6.6 -17.5 0 -17.4 Q6.6 -17.5 5.8 -9 L5 -6 Q4 -10 0 -12.6 Q-4 -10 -5 -6Z" fill="#E7DCC2" stroke="#1F1C2C" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M-5.6 -14.2 Q0 -12.6 5.6 -14.2" stroke="#7E6A9E" stroke-width="1.4" fill="none"/>
      <g class="sp-carry" opacity="0" transform="translate(0 -21) scale(.78)">${SHEEP_G}</g>
      <g class="sp-lantern" transform="translate(-12 3)">
        <circle class="sp-glow" r="10" fill="url(#lanternGlow)"/>
        <path d="M-3 -4 L3 -4 L2.4 4 L-2.4 4Z" fill="#F6D37A" stroke="#1F1C2C" stroke-width="1"/>
        <path d="M-2 -6.5 Q0 -9 2 -6.5" stroke="#1F1C2C" stroke-width="1" fill="none"/>
        <path d="M-3.4 -4 L3.4 -4 M-2.8 4 L2.8 4" stroke="#1F1C2C" stroke-width="1.4"/>
      </g>
    </g>`;

  function buildPasture(host, opts = {}) {
    const p = opts.id || 'p' + Math.random().toString(36).slice(2, 7);
    const seed = opts.seed || 7;
    const R = rng(seed);

    let s = `<svg xmlns="${NS}" viewBox="0 0 1000 1000" class="pasture-svg" role="img" aria-label="${opts.label || 'A round pasture: the fold at the centre, then the Gate, Green Pastures, Rocky Hills, the Dark Ravine, and the starlit edge where the lost sheep hides.'}">`;
    s += `<defs>
      <radialGradient id="${p}-dark" gradientUnits="userSpaceOnUse" cx="${C}" cy="${C}" r="495">
        <stop offset=".24" stop-color="#0F1326" stop-opacity="0"/>
        <stop offset=".36" stop-color="#0F1326" stop-opacity=".28"/>
        <stop offset=".55" stop-color="#0F1326" stop-opacity=".58"/>
        <stop offset=".74" stop-color="#0F1326" stop-opacity=".74"/>
        <stop offset="1" stop-color="#0F1326" stop-opacity=".86"/>
      </radialGradient>
      <radialGradient id="${p}-hole">
        <stop offset="0" stop-color="#000" stop-opacity="1"/>
        <stop offset=".5" stop-color="#000" stop-opacity=".8"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <mask id="${p}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000">
        <rect width="1000" height="1000" fill="#fff"/>
        <g class="holes"></g>
      </mask>
      <clipPath id="${p}-clip"><path d="${wobbly(EDGE.star, 7, seed + 1)}"/></clipPath>
      <g id="${p}-sheep">${SHEEP_G}</g>
      ${Object.keys(MID).filter((k) => k !== 'thorn').map((k) => {
        const r = k === 'fold' ? 111 : MID[k] - 9;
        return k === 'fold'
          ? `<path id="${p}-lab-${k}" d="M${C - r},${C} A${r},${r} 0 0 0 ${C + r},${C}"/>`
          : `<path id="${p}-lab-${k}" d="M${C - r},${C} A${r},${r} 0 0 1 ${C + r},${C}"/>`;
      }).join('')}
    </defs>`;

    // watercolour fills, outermost first
    s += `<g class="wash" filter="url(#watercolor)">`;
    RING_ORDER.forEach((k, i) => {
      s += `<path d="${wobbly(EDGE[k], k === 'star' ? 7 : 5, seed + 10 + i)}" fill="${FILL[k]}"/>`;
    });
    // soft blooms inside rings for watercolour variance
    for (let i = 0; i < 26; i++) {
      const ring = RING_ORDER[Math.floor(R() * 5)];
      const inner = ring === 'star' ? EDGE.ravine : EDGE[RING_ORDER[RING_ORDER.indexOf(ring) + 1]];
      const rr = inner + 10 + R() * (EDGE[ring] - inner - 20);
      const [x, y] = polar(rr, R() * 360);
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(14 + R() * 26)}" fill="${ring === 'star' || ring === 'ravine' ? '#0E1430' : '#fff'}" opacity="${ring === 'star' || ring === 'ravine' ? .25 : .18}"/>`;
    }
    s += `</g>`;

    // ink outlines, drawn twice for a sketchy hand
    s += `<g class="ink-rings" filter="url(#ink)" fill="none" stroke="#1F1C2C" stroke-linecap="round">`;
    RING_ORDER.forEach((k, i) => {
      s += `<path class="ring-line" pathLength="1" d="${wobbly(EDGE[k], k === 'star' ? 7 : 5, seed + 10 + i)}" stroke-width="${k === 'star' ? 2.6 : 1.8}"/>`;
      s += `<path class="ring-line ring-line--b" pathLength="1" d="${wobbly(EDGE[k] + 2, 5, seed + 40 + i)}" stroke-width=".8" opacity=".5"/>`;
    });
    s += `</g>`;

    // decorations
    s += `<g class="decor" filter="url(#ink)">`;
    // gate band: little lilac flowers (the sheep's daisy)
    for (let i = 0; i < 16; i++) {
      const [x, y] = polar(EDGE.fold + 14 + R() * 60, R() * 360);
      s += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(R() * 70)})"><path d="M0 0 l0 6" stroke="#5E7A3E" stroke-width="1.1"/>` +
        [0, 72, 144, 216, 288].map((a) => `<ellipse rx="1.8" ry="3.2" cy="-3.2" fill="#A992D6" transform="rotate(${a})"/>`).join('') +
        `<circle r="1.4" fill="#F2C94C"/></g>`;
    }
    // green pastures: grass tufts
    for (let i = 0; i < 46; i++) {
      const [x, y] = polar(EDGE.gate + 10 + R() * 68, R() * 360);
      s += `<path d="M${f(x - 5)} ${f(y)} l2 -7 M${f(x)} ${f(y)} l0 -9 M${f(x + 5)} ${f(y)} l-2 -7" stroke="#4E6B35" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
    }
    // two olive trees
    [[255, 32], [242, 205]].forEach(([r, a]) => {
      const [x, y] = polar(r, a);
      s += `<g transform="translate(${f(x)} ${f(y)})"><path d="M0 0 l0 14" stroke="#5B4026" stroke-width="3"/><path d="${(() => { const pts = []; for (let j = 0; j < 9; j++) { const an = j / 9 * 6.28; const rr = 13 + R() * 5; pts.push([rr * Math.cos(an), rr * .78 * Math.sin(an) - 6]); } return closed(pts); })()}" fill="#7F9A5C" stroke="#1F1C2C" stroke-width="1.3"/></g>`;
    });
    // rocky hills: stones
    for (let i = 0; i < 26; i++) {
      const [x, y] = polar(EDGE.green + 12 + R() * 62, R() * 360);
      const w = 6 + R() * 9, h = 4 + R() * 5;
      s += `<path d="M${f(x - w)} ${f(y + h * .4)} Q${f(x - w * .7)} ${f(y - h)} ${f(x)} ${f(y - h)} Q${f(x + w * .8)} ${f(y - h * .8)} ${f(x + w)} ${f(y + h * .4)}Z" fill="#9C9177" stroke="#1F1C2C" stroke-width="1.2"/>`;
    }
    // little hills silhouettes
    for (let i = 0; i < 7; i++) {
      const [x, y] = polar(EDGE.green + 40, i * 51 + 20);
      s += `<path d="M${f(x - 22)} ${f(y + 6)} Q${f(x - 8)} ${f(y - 16)} ${f(x + 4)} ${f(y - 2)} Q${f(x + 12)} ${f(y - 12)} ${f(x + 24)} ${f(y + 6)}" fill="none" stroke="#1F1C2C" stroke-width="1.2" opacity=".7"/>`;
    }
    // ravine cracks
    for (let i = 0; i < 9; i++) {
      const a = R() * 360, r0 = EDGE.rocky + 12 + R() * 30;
      let d = '';
      for (let j = 0; j < 5; j++) {
        const [x, y] = polar(r0 + j * 6, a + j * 3 + (j % 2 ? 2.5 : -2.5));
        d += (j ? 'L' : 'M') + f(x) + ' ' + f(y);
      }
      s += `<path d="${d}" stroke="#0B0F22" stroke-width="1.6" fill="none" opacity=".8"/>`;
    }
    // stone wall of the fold, with a gap for the gate
    for (let a = 0; a < 360; a += 7.4) {
      if (a > 286 && a < 312) continue;
      const [x, y] = polar(EDGE.fold - 3 + (R() - 0.5) * 2, a);
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(6 + R() * 2)}" ry="${f(4 + R())}" transform="rotate(${f(a + 90)} ${f(x)} ${f(y)})" fill="#D7C49B" stroke="#1F1C2C" stroke-width="1.2"/>`;
    }
    // the gate
    {
      const [x1, y1] = polar(EDGE.fold - 3, 288), [x2, y2] = polar(EDGE.fold - 3, 310);
      s += `<path d="M${f(x1)} ${f(y1 - 9)} L${f(x1)} ${f(y1 + 7)} M${f(x2)} ${f(y2 - 9)} L${f(x2)} ${f(y2 + 7)}" stroke="#5B4026" stroke-width="3.2" stroke-linecap="round"/>`;
      s += `<path d="M${f(x1)} ${f(y1 - 5)} L${f(x1 + (x2 - x1) * .45)} ${f(y1 - 8 + (y2 - y1) * .3)} M${f(x1)} ${f(y1 + 2)} L${f(x1 + (x2 - x1) * .45)} ${f(y1 - 1 + (y2 - y1) * .3)}" stroke="#7A5634" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    s += `</g>`;

    // the 99
    s += `<g class="flock">`;
    for (let i = 1; i <= 99; i++) {
      const r = 8.8 * Math.sqrt(i) - 2, a = i * 137.508;
      const [x, y] = polar(r, a);
      const flip = R() > 0.5 ? -1 : 1;
      s += `<g transform="translate(${f(x)} ${f(y)}) scale(${flip * 0.62} .62)"><g class="bob" style="--d:${f(-R() * 3)}s;--t:${f(2.4 + R() * 1.8)}s"><use href="#${p}-sheep"/></g></g>`;
    }
    s += `<g class="flock-extra"></g></g>`;

    // the lost sheep (lives in the dark)
    const lostAngle = opts.lostAngle ?? 38;
    const [lx, ly] = polar(MID.star + 4, lostAngle);
    s += `<g class="lost" transform="translate(${f(lx)} ${f(ly)})"><g class="lost-inner"><g transform="scale(1.9)"><g class="bob" style="--d:-1s;--t:2.2s"><use href="#${p}-sheep"/></g></g></g></g>`;

    // night
    s += `<g class="night" mask="url(#${p}-mask)" clip-path="url(#${p}-clip)"><rect width="1000" height="1000" fill="url(#${p}-dark)"/></g>`;

    // stars on the starlit edge
    s += `<g class="stars">`;
    for (let i = 0; i < 70; i++) {
      const [x, y] = polar(EDGE.ravine + 6 + R() * 56, R() * 360);
      const sz = 1.4 + R() * 2.8;
      s += `<path class="twinkle" style="--d:${f(-R() * 4)}s;--t:${f(2 + R() * 3)}s" d="M${f(x)} ${f(y - sz * 2)} Q${f(x)} ${f(y)} ${f(x + sz * 2)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + sz * 2)} Q${f(x)} ${f(y)} ${f(x - sz * 2)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - sz * 2)}Z" fill="#F7E7B4"/>`;
    }
    s += `</g>`;

    // labels
    s += `<g class="labels">`;
    Object.keys(LABEL).forEach((k) => {
      const light = k === 'ravine' || k === 'star';
      s += `<text class="ring-label" fill="${light ? '#F3E6C4' : '#1F1C2C'}"><textPath href="#${p}-lab-${k}" startOffset="50%" text-anchor="middle">${LABEL[k]}</textPath></text>`;
    });
    s += `</g>`;

    s += `<g class="glows"></g><g class="trails"></g><g class="thorns"></g><g class="walkers"></g><g class="hover-lantern"></g>`;
    s += `</svg>`;
    host.innerHTML = s;

    const svg = host.querySelector('svg');
    const holes = svg.querySelector('.holes');
    const walkers = svg.querySelector('.walkers');
    const trails = svg.querySelector('.trails');
    const thorns = svg.querySelector('.thorns');
    const lost = svg.querySelector('.lost');

    function el(tag, attrs, parent) {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(e);
      return e;
    }
    // a hole in the night; static holes also leave a warm lantern glow on the ground
    function addHole(x, y, r, warm) {
      if (warm) {
        const g = el('circle', { cx: x, cy: y, r: r * 0.85, fill: 'url(#lanternGlow)', class: 'ground-glow' }, svg.querySelector('.glows'));
        g.style.setProperty('--o', '.34');
      }
      return el('circle', { cx: x, cy: y, r, fill: `url(#${p}-hole)` }, holes);
    }

    function makeShepherd(color) {
      const g = el('g', { class: 'shepherd', transform: `translate(${C} ${C})` }, walkers);
      g.innerHTML = `<g class="sp-scale" transform="scale(1.6)">${SHEPHERD}</g>`;
      if (color) g.querySelector('path[fill="#9A7350"]').setAttribute('fill', color);
      const hole = addHole(C, C, 0);
      return { g, hole, x: C, y: C, scale: g.querySelector('.sp-scale') };
    }

    function place(sp, x, y, light) {
      sp.x = x; sp.y = y;
      sp.g.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      sp.hole.setAttribute('cx', f(x)); sp.hole.setAttribute('cy', f(y));
      if (light != null) sp.hole.setAttribute('r', light);
    }

    function face(sp, dx) {
      sp.scale.setAttribute('transform', `scale(${dx < 0 ? -1.6 : 1.6} 1.6)`);
    }

    // walk with an ease and a footprint trail
    function walk(sp, tx, ty, o = {}) {
      const sx = sp.x, sy = sp.y;
      const dist = Math.hypot(tx - sx, ty - sy);
      const dur = reduce() ? 1 : o.duration || Math.max(650, Math.min(2300, dist * 5.2));
      const light = o.light ?? 95;
      face(sp, tx - sx);
      sp.g.classList.add('walking');
      let lastPrint = 0, side = 1;
      return new Promise((res) => {
        const t0 = performance.now();
        function step(now) {
          const t = Math.min(1, (now - t0) / dur);
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          const x = sx + (tx - sx) * e, y = sy + (ty - sy) * e;
          const r = light * Math.min(1, 0.55 + t);
          place(sp, x, y, r);
          if (o.prints !== false && dist * e - lastPrint > 13) {
            lastPrint = dist * e;
            side *= -1;
            const nx = -(ty - sy) / dist, ny = (tx - sx) / dist;
            const pr = el('ellipse', { cx: f(x + nx * 3 * side), cy: f(y + ny * 3 * side + 13), rx: 1.8, ry: 1.2, class: 'print', fill: o.printColor || '#1F1C2C' }, trails);
            if (o.trailClass) pr.classList.add(o.trailClass);
          }
          if (t < 1) requestAnimationFrame(step);
          else { sp.g.classList.remove('walking'); res(); }
        }
        requestAnimationFrame(step);
      });
    }

    function pointFor(ringKey, angle, jitter = 0) {
      return polar(MID[ringKey] + jitter, angle);
    }

    function growThorns(x, y) {
      const g = el('g', { class: 'thornbush', transform: `translate(${f(x)} ${f(y)})` }, thorns);
      let d = '';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.28, r = 12 + (i % 3) * 4;
        d += `M0 6 Q${f(Math.cos(a) * r * .5)} ${f(Math.sin(a) * r * .5 + 2)} ${f(Math.cos(a) * r)} ${f(Math.sin(a) * r * .7 + 4)} `;
        d += `m-2 -1 l2 1 l-1 2 `;
      }
      el('path', { d, stroke: '#4B3A22', 'stroke-width': 1.6, fill: 'none', 'stroke-linecap': 'round', pathLength: 1, class: 'thorn-path' }, g);
      return g;
    }

    function showLost(angle) {
      const [x, y] = polar(MID.star + 4, angle);
      lost.setAttribute('transform', `translate(${f(x)} ${f(y)})`);
      lost.classList.add('is-found');
      return [x, y];
    }
    function hideLost() { lost.classList.remove('is-found'); lost.style.display = ''; }

    function addToFold() {
      const extra = svg.querySelector('.flock-extra');
      const [x, y] = polar(38, 200);
      const g = el('g', { transform: `translate(${f(x)} ${f(y)}) scale(.78)`, class: 'hundredth' }, extra);
      g.innerHTML = `<g class="bob" style="--d:0s;--t:2s"><use href="#${p}-sheep"/></g>`;
    }

    function reset() {
      walkers.innerHTML = ''; trails.innerHTML = ''; thorns.innerHTML = ''; holes.innerHTML = ''; svg.querySelector('.glows').innerHTML = '';
      svg.querySelector('.flock-extra').innerHTML = '';
      hideLost();
    }

    return { svg, p, el, polar, MID, EDGE, addHole, makeShepherd, place, walk, face, pointFor, growThorns, showLost, hideLost, addToFold, reset, lost, lostPos: [lx, ly] };
  }

  /* a lone mini sheep as an inline svg string, for use in the page */
  window.miniSheepSVG = (cls = '') =>
    `<svg class="${cls}" viewBox="-16 -13 32 26" aria-hidden="true">${SHEEP_G}</svg>`;
  window.shepherdSVG = (cls = '') => `<svg class="${cls}" viewBox="-26 -30 52 50" aria-hidden="true">${SHEPHERD}</svg>`;
  window.buildPasture = buildPasture;
})();
