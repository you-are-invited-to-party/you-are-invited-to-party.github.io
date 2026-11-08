// Turns a name into glyph outlines and lets the laser write them one stroke
// at a time, reporting where the beam should point on every frame.

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 100;
const LINE_HEIGHT = 112;
const BLANK_SECONDS = 0.05;

let fontPromise = null;

export function loadLaserFont() {
  fontPromise ??= Promise.all([
    import('../vendor/opentype.module.min.js'),
    fetch(new URL('../fonts/unbounded-800-latin.ttf', import.meta.url)).then((res) => {
      if (!res.ok) throw new Error(`Font request failed: ${res.status}`);
      return res.arrayBuffer();
    }),
  ]).then(([opentype, buffer]) => opentype.parse(buffer));
  return fontPromise;
}

// True when every character has a real glyph, so nothing is drawn as a box.
export function canWrite(font, text) {
  return [...text].every((ch) => /\s/.test(ch) || font.charToGlyphIndex(ch) > 0);
}

const round = (n) => Math.round(n * 100) / 100;

function toPathData(commands) {
  return commands
    .map((c) => {
      if (c.type === 'M') return `M${round(c.x)} ${round(c.y)}`;
      if (c.type === 'L') return `L${round(c.x)} ${round(c.y)}`;
      if (c.type === 'C') return `C${round(c.x1)} ${round(c.y1)} ${round(c.x2)} ${round(c.y2)} ${round(c.x)} ${round(c.y)}`;
      if (c.type === 'Q') return `Q${round(c.x1)} ${round(c.y1)} ${round(c.x)} ${round(c.y)}`;
      return 'Z';
    })
    .join('');
}

// One glyph can hold several closed outlines (an "a" has two); each is a stroke.
function splitContours(commands) {
  const contours = [];
  for (const c of commands) {
    if (c.type === 'M' || !contours.length) contours.push([]);
    contours[contours.length - 1].push(c);
  }
  return contours;
}

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

// Fills `svg` with the name as outlines: a soft fill per glyph, the strokes the
// laser draws, and a copy of those strokes for the scanning shimmer afterwards.
export function buildName(svg, font, lines) {
  const fill = el('g', { class: 'name__fill' });
  const ink = el('g', { class: 'name__ink' });
  const scan = el('g', { class: 'name__scan' });
  const strokes = [];
  const box = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };

  lines.forEach((line, i) => {
    const width = font.getAdvanceWidth(line, SIZE, { kerning: true });
    for (const glyph of font.getPaths(line, -width / 2, i * LINE_HEIGHT, SIZE, { kerning: true })) {
      if (!glyph.commands.length) continue;
      const bb = glyph.getBoundingBox();
      box.x1 = Math.min(box.x1, bb.x1);
      box.y1 = Math.min(box.y1, bb.y1);
      box.x2 = Math.max(box.x2, bb.x2);
      box.y2 = Math.max(box.y2, bb.y2);
      fill.append(el('path', { d: toPathData(glyph.commands) }));
      for (const contour of splitContours(glyph.commands)) {
        const d = toPathData(contour);
        const stroke = el('path', { d });
        ink.append(stroke);
        scan.append(el('path', { d, pathLength: 100 }));
        strokes.push(stroke);
      }
    }
  });

  svg.replaceChildren(fill, ink, scan);
  const pad = 14;
  svg.setAttribute('viewBox', `${box.x1 - pad} ${box.y1 - pad} ${box.x2 - box.x1 + pad * 2} ${box.y2 - box.y1 + pad * 2}`);
  return { strokes, lengths: strokes.map((p) => p.getTotalLength()) };
}

// Schedules the strokes over `duration` seconds at an even pen speed, with a
// short blank between strokes while the laser jumps to the next one.
export function createWriter(svg, strokes, lengths, duration) {
  const total = lengths.reduce((sum, len) => sum + len, 0) || 1;
  const drawing = Math.max(0.5, duration - BLANK_SECONDS * (strokes.length - 1));
  let clock = 0;
  const schedule = lengths.map((len) => {
    const span = (drawing * len) / total;
    const slot = { start: clock, end: clock + span };
    clock += span + BLANK_SECONDS;
    return slot;
  });

  strokes.forEach((path, i) => {
    path.style.strokeDasharray = `${lengths[i]} ${lengths[i]}`;
    path.style.strokeDashoffset = lengths[i];
  });

  const point = svg.createSVGPoint();

  return {
    // Draws everything up to `elapsed` seconds and returns the pen's position
    // in viewport pixels, or null while the laser is blanked.
    update(elapsed) {
      let pen = null;
      strokes.forEach((path, i) => {
        const { start, end } = schedule[i];
        const k = Math.min(1, Math.max(0, (elapsed - start) / (end - start)));
        path.style.strokeDashoffset = lengths[i] * (1 - k);
        if (elapsed >= start && elapsed < end) {
          const at = path.getPointAtLength(lengths[i] * k);
          point.x = at.x;
          point.y = at.y;
          const screen = point.matrixTransform(path.getScreenCTM());
          pen = { x: screen.x, y: screen.y };
        }
      });
      return pen;
    },
    finish() {
      strokes.forEach((path) => {
        path.style.strokeDasharray = '';
        path.style.strokeDashoffset = '';
      });
    },
  };
}
