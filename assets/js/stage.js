// The laser rig behind the invitation: haze, colour washes and fans of beams
// thrown from one projector point. A seed picks the cue order and timing, so
// every guest gets a slightly different show.

const TAU = Math.PI * 2;
const UP = -Math.PI / 2;

const COLORS = {
  ice: [124, 244, 255],
  white: [226, 238, 255],
  magenta: [255, 59, 212],
  blue: [46, 40, 255],
  red: [255, 26, 64],
  amber: [255, 190, 110],
};

const CUE_SECONDS = 7.5;
const FADE_SECONDS = 1.6;

export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A beam drawn once into a sprite: hot core plus a widening halo, layered to
// fake a blur (canvas filters aren't reliable on mobile Safari).
function beamSprite([r, g, b]) {
  const w = 512;
  const h = 64;
  const c = makeCanvas(w, h);
  const x = c.getContext('2d');
  const mid = h / 2;
  for (let i = 7; i >= 1; i--) {
    const spread = (i / 7) * mid;
    const grad = x.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.09)`);
    grad.addColorStop(0.6, `rgba(${r},${g},${b},0.035)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = grad;
    x.beginPath();
    x.moveTo(0, mid - 1);
    x.lineTo(w, mid - spread);
    x.lineTo(w, mid + spread);
    x.lineTo(0, mid + 1);
    x.fill();
  }
  const core = x.createLinearGradient(0, 0, w, 0);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.12, `rgba(${r},${g},${b},0.95)`);
  core.addColorStop(0.7, `rgba(${r},${g},${b},0.35)`);
  core.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = core;
  x.beginPath();
  x.moveTo(0, mid - 0.7);
  x.lineTo(w, mid - 2.2);
  x.lineTo(w, mid + 2.2);
  x.lineTo(0, mid + 0.7);
  x.fill();
  return c;
}

// Soft, tileable fog in one colour.
function hazeSprite(color, rand) {
  const s = 256;
  const c = makeCanvas(s, s);
  const x = c.getContext('2d');
  for (let i = 0; i < 34; i++) {
    const px = rand() * s;
    const py = rand() * s;
    const r = s * (0.1 + rand() * 0.26);
    const a = 0.05 + rand() * 0.08;
    for (const ox of [-s, 0, s]) {
      for (const oy of [-s, 0, s]) {
        const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
        g.addColorStop(0, rgba(color, a));
        g.addColorStop(1, rgba(color, 0));
        x.fillStyle = g;
        x.fillRect(0, 0, s, s);
      }
    }
  }
  return c;
}

// Cue recipes. Angles are radians from straight up; `spread` is the fan width,
// `sweep` how far the whole fan swings, `ripple` a per-beam shimmer.
const RECIPES = {
  fan: (r) => ({
    wash: 'blue', washAmt: 0.5, bloom: 'ice',
    fans: [{ color: 'ice', count: 9 + Math.floor(r() * 5), spread: 1.9 + r() * 0.5, center: 0,
      sweep: 0.14 + r() * 0.1, rate: 0.12 + r() * 0.08, ripple: 0.03, phase: r() * TAU }],
  }),
  scissor: (r) => ({
    wash: 'blue', washAmt: 0.95, bloom: 'ice',
    fans: [
      { color: 'ice', count: 5, spread: 0.42, center: -0.5, sweep: 0.42, rate: 0.16 + r() * 0.06, ripple: 0, phase: 0 },
      { color: r() > 0.5 ? 'magenta' : 'ice', count: 5, spread: 0.42, center: 0.5, sweep: -0.42, rate: 0.16 + r() * 0.06, ripple: 0, phase: 0 },
    ],
  }),
  crimson: (r) => ({
    wash: 'red', washAmt: 0.85, bloom: 'amber',
    fans: [
      { color: 'white', count: 7, spread: 1.1 + r() * 0.4, center: 0, sweep: 0.32, rate: 0.22 + r() * 0.08, ripple: 0.05, phase: r() * TAU },
      { color: 'magenta', count: 4, spread: 2.6, center: 0, sweep: 0.08, rate: 0.1, ripple: 0.02, phase: r() * TAU },
    ],
  }),
  sheet: (r) => ({
    wash: 'blue', washAmt: 0.7, bloom: 'ice',
    fans: [{ color: 'ice', count: 16 + Math.floor(r() * 6), spread: 0.42 + r() * 0.2, center: 0,
      sweep: 0.95, rate: 0.07 + r() * 0.04, ripple: 0.01, phase: r() * TAU }],
  }),
  ribbons: (r) => ({
    wash: r() > 0.5 ? 'red' : 'blue', washAmt: 0.6, bloom: 'magenta',
    fans: [
      { color: 'magenta', count: 6, spread: 2.2, center: 0, sweep: 0.05, rate: 0.1, ripple: 0.22, phase: r() * TAU },
      { color: 'ice', count: 6, spread: 2.0, center: 0, sweep: -0.05, rate: 0.1, ripple: 0.22, phase: r() * TAU },
    ],
  }),
};

export function createStage(canvas, { seed = 1, reducedMotion = false } = {}) {
  const ctx = canvas.getContext('2d');
  const rand = mulberry32(seed);

  const sprites = Object.fromEntries(
    ['ice', 'white', 'magenta'].map((k) => [k, beamSprite(COLORS[k])]),
  );
  const haze = {
    blue: hazeSprite(mix(COLORS.blue, [120, 140, 255], 0.5), mulberry32(seed + 1)),
    red: hazeSprite(mix(COLORS.red, [255, 120, 140], 0.4), mulberry32(seed + 2)),
  };

  // Seeded running order: always open on the fan, shuffle the rest.
  const rest = ['scissor', 'crimson', 'sheet', 'ribbons'].sort(() => rand() - 0.5);
  const cues = ['fan', ...rest].map((name) => RECIPES[name](rand));

  let W = 0;
  let H = 0;
  let dpr = 1;
  let start = performance.now();
  let raf = 0;
  let house = 0;
  let aim = 0;
  let aimTarget = 0;
  let sourceProvider = () => ({ x: W / 2, y: H * 0.86 });
  let intro = null;
  const hits = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, rect.width < 700 ? 1.5 : 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (reducedMotion) draw(performance.now());
  }

  function cueAt(time) {
    const span = cues.length * CUE_SECONDS;
    const local = ((time % span) + span) % span;
    const index = Math.floor(local / CUE_SECONDS);
    const into = local - index * CUE_SECONDS;
    const fade = smooth(clamp((into - (CUE_SECONDS - FADE_SECONDS)) / FADE_SECONDS));
    return { a: cues[index], b: cues[(index + 1) % cues.length], fade };
  }

  function drawBeam(sprite, x0, y0, angle, length, width, alpha) {
    if (alpha <= 0.002) return;
    const c = Math.cos(angle) * dpr;
    const s = Math.sin(angle) * dpr;
    ctx.setTransform(c, s, -s, c, x0 * dpr, y0 * dpr);
    ctx.globalAlpha = Math.min(alpha, 1);
    ctx.drawImage(sprite, 0, -width / 2, length, width);
  }

  function drawFans(cue, t, src, alpha, open) {
    const len = Math.hypot(W, H) * 1.15;
    const width = Math.max(48, Math.min(W, H) * 0.11);
    const pulse = 0.88 + 0.12 * Math.pow(0.5 + 0.5 * Math.cos(t * TAU * 2), 3);
    for (const fan of cue.fans) {
      const sprite = sprites[fan.color];
      const swing = fan.sweep * Math.sin(t * fan.rate * TAU + fan.phase);
      for (let i = 0; i < fan.count; i++) {
        const u = fan.count > 1 ? i / (fan.count - 1) - 0.5 : 0;
        const ripple = fan.ripple * Math.sin(t * 0.9 * TAU * fan.rate * 4 + i * 1.3);
        const angle = clamp((fan.center + swing) * open + u * fan.spread * open + ripple + aim * 0.28, -1.5, 1.5);
        drawBeam(sprite, src.x, src.y, UP + angle, len, width, alpha * pulse * (0.55 + 0.45 * Math.cos(u * 2.2)));
      }
    }
  }

  function drawBloom(color, src, alpha, t) {
    const base = Math.min(W, H);
    const wob = Math.sin(t * 1.3) * base * 0.01;
    const blobs = [
      [src.x - base * 0.07 + wob, src.y - base * 0.015, base * 0.13],
      [src.x + base * 0.07 - wob, src.y - base * 0.01, base * 0.11],
      [src.x, src.y, base * 0.2],
    ];
    for (const [x, y, r] of blobs) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba([255, 255, 255], 0.5 * alpha));
      g.addColorStop(0.25, rgba(color, 0.45 * alpha));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  function drawHaze(sprite, t, alpha) {
    if (alpha <= 0.01) return;
    const size = Math.max(W, H) * 0.9;
    ctx.globalAlpha = alpha;
    for (const [speed, offset, scale] of [[9, 0, 1], [-6, 0.37, 1.35]]) {
      const s = size * scale;
      const dx = (((t * speed + offset * s) % s) + s) % s;
      for (let x = -s + dx; x < W; x += s) {
        for (let y = H - s * 0.85; y > -s; y -= s) ctx.drawImage(sprite, x, y, s, s);
      }
    }
  }

  function draw(now) {
    const t = reducedMotion ? 3.2 : (now - start) / 1000;
    aim += (aimTarget - aim) * 0.04;

    const src = sourceProvider();
    const showLevel = 1 - 0.5 * house;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05041a';
    ctx.fillRect(0, 0, W, H);

    // Intro: dark room, then a few beams scanning the name, then the fan opens.
    let open = 1;
    let showAlpha = 1;
    let flash = 0;
    if (intro) {
      const it = (now - intro.start) / 1000;
      const { ignite, draw: drawFor } = intro;
      if (it < ignite + drawFor) {
        showAlpha = 0;
        open = 0;
      } else {
        const ot = it - ignite - drawFor;
        open = easeOut(clamp(ot / 1.4));
        showAlpha = clamp(ot / 0.35);
        flash = Math.max(0, 1 - ot / 0.9);
        if (ot > 2) intro = null;
      }
    }

    const { a, b, fade } = cueAt(t);
    const washColor = mix(COLORS[a.wash], COLORS[b.wash], fade);
    const washAmt = (a.washAmt + (b.washAmt - a.washAmt) * fade) * (intro ? 0.35 + 0.65 * showAlpha : 1);
    const bloomColor = mix(COLORS[a.bloom], COLORS[b.bloom], fade);

    ctx.globalCompositeOperation = 'lighter';

    // Colour wash rising from the rig, plus a faint fill across the room.
    const washLevel = washAmt * (1 - 0.45 * house);
    let g = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, Math.max(W, H) * 1.05);
    g.addColorStop(0, rgba(washColor, 0.55 * washLevel));
    g.addColorStop(0.45, rgba(washColor, 0.2 * washLevel));
    g.addColorStop(1, rgba(washColor, 0.04 * washLevel));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const redShare = (a.wash === 'red' ? 1 - fade : 0) + (b.wash === 'red' ? fade : 0);
    drawHaze(haze.blue, t, (1 - redShare) * (0.55 + 0.45 * washLevel));
    drawHaze(haze.red, t, redShare * (0.55 + 0.45 * washLevel));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Beams.
    const beamLevel = showAlpha * showLevel;
    if (beamLevel > 0.002) {
      drawFans(a, t, src, (1 - fade) * beamLevel, open);
      drawFans(b, t, src, fade * beamLevel, open);
    }

    if (intro) drawIntroBeams(now, src);
    if (hits.length) drawHits(now, src);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    const hitFlash = hits.reduce((sum, h) => sum + Math.max(0, 1 - (now - h.start) / 500), 0);
    drawBloom(bloomColor, src, (0.55 + 0.45 * showAlpha + flash * 0.5 + Math.min(hitFlash, 1) * 0.4) * (1 - 0.5 * house) * (intro && showAlpha === 0 ? 0.6 : 1), t);

    // House lights: warm ceiling glow and a row of lamps as you scroll to the details.
    if (house > 0.01) {
      g = ctx.createLinearGradient(0, 0, 0, H * 0.75);
      g.addColorStop(0, rgba(COLORS.amber, 0.24 * house));
      g.addColorStop(1, rgba(COLORS.amber, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const lamps = Math.max(5, Math.round(W / 140));
      for (let i = 0; i < lamps; i++) {
        const x = ((i + 0.5) / lamps) * W;
        const y = H * 0.045;
        const r = Math.min(W, H) * 0.06;
        const lg = ctx.createRadialGradient(x, y, 0, x, y, r);
        lg.addColorStop(0, rgba([255, 236, 200], 0.55 * house));
        lg.addColorStop(0.2, rgba(COLORS.amber, 0.25 * house));
        lg.addColorStop(1, rgba(COLORS.amber, 0));
        ctx.fillStyle = lg;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }

    // Vignette keeps the edges in the dark.
    ctx.globalCompositeOperation = 'source-over';
    g = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.85);
    g.addColorStop(0, 'rgba(5,4,26,0)');
    g.addColorStop(1, 'rgba(5,4,26,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function drawIntroBeams(now, src) {
    const it = (now - intro.start) / 1000;
    const { ignite, draw: drawFor } = intro;
    const rect = intro.target();
    if (!rect || it < ignite * 0.6) return;
    // Beams hold on the name until the outline is finished, then let go.
    const end = ignite + drawFor;
    const level = it < ignite ? clamp((it - ignite * 0.6) / (ignite * 0.4)) : it < end ? 1 : clamp(1 - (it - end) / 0.35);
    if (level <= 0) return;
    const progress = clamp((it - ignite) / drawFor);
    const len = Math.max(W, H) * 1.6;
    const width = Math.max(40, Math.min(W, H) * 0.08);
    intro.pointers.forEach((p, i) => {
      if (now > p.next) {
        // Scan across the name in reading order while it's being drawn.
        const u = clamp(progress + (rand() - 0.5) * 0.35);
        p.x = rect.left + rect.width * u;
        p.y = rect.top + rect.height * (0.2 + rand() * 0.6);
        p.next = now + 55 + rand() * 70;
      }
      const angle = Math.atan2(p.y - src.y, p.x - src.x);
      drawBeam(sprites[i === 1 ? 'white' : 'ice'], src.x, src.y, angle, len, width, 0.9 * level);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = level;
      const r = 26;
      const hg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      hg.addColorStop(0, 'rgba(255,255,255,0.95)');
      hg.addColorStop(0.3, rgba(COLORS.ice, 0.6));
      hg.addColorStop(1, rgba(COLORS.ice, 0));
      ctx.fillStyle = hg;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    });
  }

  // A tap fires three beams at that spot; they flare and fade.
  function drawHits(now, src) {
    const len = Math.max(W, H) * 1.6;
    const width = Math.max(40, Math.min(W, H) * 0.08);
    for (let k = hits.length - 1; k >= 0; k--) {
      const hit = hits[k];
      const age = (now - hit.start) / 1000;
      if (age > 1.2) {
        hits.splice(k, 1);
        continue;
      }
      const level = age < 0.06 ? age / 0.06 : 1 - (age - 0.06) / 1.14;
      [-1, 0, 1].forEach((side, i) => {
        const angle = Math.atan2(hit.y - src.y, hit.x + side * 10 - src.x);
        drawBeam(sprites[i === 1 ? 'white' : 'magenta'], src.x, src.y, angle, len, width, level);
      });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = level;
      const r = 30 + age * 60;
      const g = ctx.createRadialGradient(hit.x, hit.y, 0, hit.x, hit.y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.3, rgba(COLORS.magenta, 0.55));
      g.addColorStop(1, rgba(COLORS.magenta, 0));
      ctx.fillStyle = g;
      ctx.fillRect(hit.x - r, hit.y - r, r * 2, r * 2);
    }
  }

  function loop(now) {
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    start() {
      start = performance.now();
      if (reducedMotion) draw(start);
      else raf = requestAnimationFrame(loop);
    },
    // Beams scan `target()` (a DOMRect) for `draw` seconds after `ignite`.
    playIntro({ target, ignite = 0.5, draw: drawFor = 2.2 }) {
      if (reducedMotion) return;
      intro = {
        start: performance.now(),
        target,
        ignite,
        draw: drawFor,
        pointers: [0, 1, 2].map(() => ({ x: 0, y: 0, next: 0 })),
      };
    },
    setSource(fn) {
      sourceProvider = fn;
      if (reducedMotion) draw(performance.now());
    },
    setHouse(value) {
      const next = clamp(value);
      if (Math.abs(next - house) < 0.001) return;
      house = next;
      if (reducedMotion) draw(performance.now());
    },
    setAim(value) {
      aimTarget = clamp(value, -1, 1);
    },
    hit(x, y) {
      if (reducedMotion) return;
      hits.push({ x, y, start: performance.now() });
      if (hits.length > 8) hits.shift();
    },
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}
