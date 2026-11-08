// Silhouettes of people dancing in front of the stage: two rows, rim-lit by
// the lasers, some with hands up and a few phones filming the show.

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const n = (v) => Math.round(v * 10) / 10;

// One person, as shapes in their own coordinates: a body, a head, and arms.
function person(x, y, s, rand) {
  const sh = 30 * s;
  const body = `M${n(x - sh - 6 * s)} ${n(y)}C${n(x - sh - 4 * s)} ${n(y - 30 * s)} ${n(x - sh + 4 * s)} ${n(y - 40 * s)} ${n(x - 14 * s)} ${n(y - 44 * s)}L${n(x + 14 * s)} ${n(y - 44 * s)}C${n(x + sh - 4 * s)} ${n(y - 40 * s)} ${n(x + sh + 4 * s)} ${n(y - 30 * s)} ${n(x + sh + 6 * s)} ${n(y)}Z`;
  const head = { cx: n(x), cy: n(y - 62 * s), rx: n(13 * s), ry: n(15 * s) };
  const neck = { x: n(x - 6 * s), y: n(y - 50 * s), width: n(12 * s), height: n(10 * s) };

  const arms = [];
  let phone = null;
  const roll = rand();
  const raise = (side) => {
    const sx = x + side * 22 * s;
    const sy = y - 38 * s;
    const ex = x + side * (34 + rand() * 10) * s;
    const ey = y - (78 + rand() * 10) * s;
    const hx = x + side * (24 + rand() * 18) * s;
    const hy = y - (112 + rand() * 22) * s;
    arms.push(`M${n(sx)} ${n(sy)}Q${n(ex)} ${n(ey)} ${n(hx)} ${n(hy)}`);
    return { hx, hy };
  };
  if (roll < 0.22) {
    raise(-1);
    raise(1);
  } else if (roll < 0.5) {
    const hand = raise(rand() < 0.5 ? -1 : 1);
    if (rand() < 0.3) phone = { x: hand.hx, y: hand.hy };
  }
  return { body, head, neck, arms, phone };
}

function drawPerson(group, shape, s, fill, rim, rimOpacity) {
  const parts = (paint, stroke, offset) => {
    const g = el('g', offset ? { transform: `translate(0 ${offset})`, opacity: rimOpacity } : {});
    g.append(
      el('path', { d: shape.body, fill: paint }),
      el('ellipse', { ...shape.head, fill: paint }),
      el('rect', { ...shape.neck, fill: paint }),
      ...shape.arms.map((d) => el('path', { d, fill: 'none', stroke, 'stroke-width': n(11 * s), 'stroke-linecap': 'round' })),
    );
    return g;
  };
  // A lighter copy nudged upward reads as rim light along the top edges.
  group.append(parts(rim, rim, -2.6), parts(fill, fill, 0));
  if (shape.phone) {
    const { x, y } = shape.phone;
    group.append(
      el('circle', { cx: n(x), cy: n(y - 4 * s), r: n(13 * s), fill: 'rgba(210,240,255,0.14)' }),
      el('rect', { x: n(x - 5 * s), y: n(y - 12 * s), width: n(10 * s), height: n(16 * s), rx: 2, fill: '#cfeeff', opacity: 0.85 }),
    );
  }
}

export function buildCrowd(svg, rand) {
  svg.setAttribute('viewBox', '0 0 1000 230');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');

  const defs = el('defs');
  const rim = el('linearGradient', { id: 'crowd-rim', x1: '0', x2: '1', y1: '0', y2: '0' });
  rim.append(
    el('stop', { offset: '0', 'stop-color': '#7cf4ff' }),
    el('stop', { offset: '0.5', 'stop-color': '#ff3bd4' }),
    el('stop', { offset: '1', 'stop-color': '#7cf4ff' }),
  );
  defs.append(rim);
  svg.replaceChildren(defs);

  const rows = [
    { y: 212, s: 0.7, count: 16, fill: '#0c0a33', rimOpacity: 0.4 },
    { y: 246, s: 1.05, count: 10, fill: '#04031a', rimOpacity: 0.75 },
  ];
  for (const row of rows) {
    const layer = el('g', { class: 'crowd__row' });
    for (let i = 0; i < row.count; i++) {
      const x = ((i + 0.5 + (rand() - 0.5) * 0.6) * 1000) / row.count;
      const s = row.s * (0.9 + rand() * 0.2);
      const group = el('g', { class: 'crowd__person' });
      group.style.setProperty('--delay', `${(-rand() * 0.52).toFixed(2)}s`);
      group.style.setProperty('--lift', `${(3 + rand() * 4).toFixed(1)}px`);
      drawPerson(group, person(x, row.y, s, rand), s, row.fill, 'url(#crowd-rim)', row.rimOpacity);
      layer.append(group);
    }
    svg.append(layer);
  }
}
