// The club around the light show, drawn behind the beams: a slatted ceiling,
// a lighting truss with moving heads, a mirror ball throwing sparkles across
// the room, and LED meter columns along the walls.

const TAU = Math.PI * 2;
const ICE = [124, 244, 255];
const MAGENTA = [255, 59, 212];
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createScene(rand) {
  const spots = Array.from({ length: 34 }, () => ({
    u: rand(),
    v: 0.06 + rand() * 0.66,
    size: 1 + rand() * 2.2,
    phase: rand() * TAU,
    speed: 0.6 + rand() * 0.8,
  }));
  const facets = Array.from({ length: 400 }, () => rand());
  let architecture = null;

  // The ceiling and truss never move, so they're drawn once per size.
  function buildArchitecture(W, H, dpr) {
    const ceil = Math.round(H * 0.17);
    const c = document.createElement('canvas');
    c.width = Math.round(W * dpr);
    c.height = Math.round((ceil + 16) * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);

    const plane = x.createLinearGradient(0, 0, 0, ceil);
    plane.addColorStop(0, 'rgba(150,160,255,0.07)');
    plane.addColorStop(1, 'rgba(150,160,255,0.02)');
    x.fillStyle = plane;
    x.fillRect(0, 0, W, ceil);

    // Slats run toward a vanishing point below the ceiling.
    const vx = W / 2;
    const vy = H * 0.62;
    const k = ceil / vy;
    const count = Math.max(10, Math.round(W / 28));
    x.strokeStyle = 'rgba(175,185,255,0.14)';
    x.lineWidth = 1;
    x.beginPath();
    for (let i = -count; i <= count * 2; i++) {
      const sx = (i / count) * W;
      x.moveTo(sx, 0);
      x.lineTo(sx + (vx - sx) * k, ceil);
    }
    x.stroke();

    // Truss: two rails with a zigzag lattice between them.
    x.strokeStyle = 'rgba(195,205,255,0.26)';
    x.lineWidth = 1.3;
    x.beginPath();
    x.moveTo(0, ceil);
    x.lineTo(W, ceil);
    x.moveTo(0, ceil + 12);
    x.lineTo(W, ceil + 12);
    for (let px = 0, up = true; px < W; px += 12, up = !up) {
      x.moveTo(px, up ? ceil : ceil + 12);
      x.lineTo(px + 12, up ? ceil + 12 : ceil);
    }
    x.stroke();
    return { canvas: c, W, H, dpr, ceil };
  }

  function drawFixtures(ctx, t, W, H, top, ceil, level) {
    // Two lights on phones keep the middle of the truss clear for the text.
    const n = clamp(Math.round(W / 190), 2, 7);
    for (let i = 0; i < n; i++) {
      const color = i % 2 ? MAGENTA : ICE;
      const tilt = Math.sin(t * 0.5 + i * 1.9) * 0.55;
      ctx.save();
      ctx.translate(((i + 0.5) / n) * W, top + ceil + 14);
      ctx.rotate(tilt);

      ctx.globalCompositeOperation = 'lighter';
      const len = H * 0.6;
      const cone = ctx.createLinearGradient(0, 0, 0, len);
      cone.addColorStop(0, rgba(color, 0.17 * level));
      cone.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(-4, 6);
      ctx.lineTo(4, 6);
      ctx.lineTo(len * 0.16, len);
      ctx.lineTo(-len * 0.16, len);
      ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgb(18,16,52)';
      ctx.strokeStyle = 'rgba(195,205,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-7, -8, 14, 15, 3);
      else ctx.rect(-7, -8, 14, 15);
      ctx.fill();
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      const lens = ctx.createRadialGradient(0, 6, 0, 0, 6, 10);
      lens.addColorStop(0, rgba([255, 255, 255], 0.9 * level));
      lens.addColorStop(0.35, rgba(color, 0.6 * level));
      lens.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = lens;
      ctx.fillRect(-10, -4, 20, 20);
      ctx.restore();
    }
  }

  function drawMirrorBall(ctx, t, bx, by, r, cableTop, level) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(195,205,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, cableTop);
    ctx.lineTo(bx, by - r);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, TAU);
    ctx.clip();
    ctx.fillStyle = 'rgb(22,20,58)';
    ctx.fillRect(bx - r, by - r, r * 2, r * 2);
    // Facets slide sideways as the ball turns.
    const f = Math.max(3.5, r / 5.5);
    const travel = t * 9;
    const shift = travel % f;
    const step = Math.floor(travel / f);
    for (let row = 0, yy = by - r; yy < by + r; row++, yy += f) {
      for (let col = -1, xx = bx - r - f + shift; xx < bx + r; col++, xx += f) {
        const b = facets[(((col - step) * 31 + row * 17) % 400 + 400) % 400];
        const dx = (xx + f / 2 - bx) / r;
        const dy = (yy + f / 2 - by) / r;
        const round = Math.max(0, 1 - (dx * dx + dy * dy));
        const v = 36 + b * 190 * (0.3 + 0.7 * round);
        ctx.fillStyle = `rgb(${(v * 0.86) | 0},${(v * 0.9) | 0},${v | 0})`;
        ctx.fillRect(xx + 0.6, yy + 0.6, f - 1.2, f - 1.2);
      }
    }
    ctx.restore();

    // A glint that flares now and then.
    ctx.globalCompositeOperation = 'lighter';
    const flare = 0.4 + 0.6 * Math.pow(Math.max(0, Math.sin(t * 1.7)), 6);
    const gx = bx - r * 0.35;
    const gy = by - r * 0.4;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 1.1);
    glow.addColorStop(0, rgba([255, 255, 255], 0.75 * flare * level));
    glow.addColorStop(0.15, rgba(ICE, 0.25 * flare * level));
    glow.addColorStop(1, rgba(ICE, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(gx - r * 1.1, gy - r * 1.1, r * 2.2, r * 2.2);
    ctx.fillStyle = rgba([255, 255, 255], 0.8 * flare * level);
    ctx.fillRect(gx - r * 0.9, gy - 0.5, r * 1.8, 1);
    ctx.fillRect(gx - 0.5, gy - r * 0.9, 1, r * 1.8);
  }

  // Sparkles from the mirror ball drifting across the walls.
  function drawSpots(ctx, t, W, top, H, level) {
    ctx.globalCompositeOperation = 'lighter';
    for (const s of spots) {
      const x = ((s.u + t * 0.022 * s.speed) % 1) * (W + 40) - 20;
      const y = top + H * s.v;
      const twinkle = 0.45 + 0.55 * Math.sin(t * 2.6 + s.phase);
      if (twinkle <= 0) continue;
      ctx.fillStyle = rgba([255, 255, 255], 0.6 * twinkle * level);
      ctx.fillRect(x - s.size / 2, y - s.size / 2, s.size, s.size);
    }
  }

  // LED meters along both walls, bouncing like an equalizer.
  function drawMeters(ctx, t, W, top, H, level) {
    ctx.globalCompositeOperation = 'lighter';
    const segs = 14;
    const segH = clamp(H * 0.008, 4, 7);
    const gap = segH * 0.7;
    const colW = clamp(W * 0.02, 7, 13);
    const bottom = top + H * 0.86;
    for (const side of [0, 1]) {
      for (const c of [0, 1]) {
        const x = side === 0 ? 10 + c * (colW + 5) : W - 10 - colW - c * (colW + 5);
        const wave = Math.abs(Math.sin(t * (1.6 + c * 0.9 + side * 0.5) + side * 2) * Math.cos(t * 0.8 + c * 1.3));
        const lit = Math.round((0.2 + 0.8 * wave) * segs);
        for (let k = 0; k < segs; k++) {
          const color = k >= segs - 4 ? MAGENTA : ICE;
          ctx.fillStyle = rgba(color, (k < lit ? 0.8 : 0.07) * level);
          ctx.fillRect(x, bottom - (k + 1) * (segH + gap), colW, segH);
        }
      }
    }
  }

  // Draws the room for a hero section at `top` (viewport px) that is `height` tall.
  return function drawScene(ctx, { t, W, top, height, dpr, level }) {
    if (top + height < 0) return;
    if (!architecture || architecture.W !== W || architecture.H !== height || architecture.dpr !== dpr) {
      architecture = buildArchitecture(W, height, dpr);
    }
    const { canvas, ceil } = architecture;

    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.6 + 0.4 * level;
    ctx.drawImage(canvas, 0, top, W, canvas.height / dpr);
    ctx.globalAlpha = 1;

    drawSpots(ctx, t, W, top, height, level);
    drawMeters(ctx, t, W, top, height, level);
    drawFixtures(ctx, t, W, height, top, ceil, level);
    const r = clamp(Math.min(W, height) * 0.045, 14, 34);
    drawMirrorBall(ctx, t, W * 0.84, top + ceil + 16 + r, r, top + ceil + 12, level);
    ctx.globalCompositeOperation = 'lighter';
  };
}
