import { PARTY } from './config.js';
import { readInvite, hashString, invitationNumber } from './invite-token.js';
import { createStage, mulberry32 } from './stage.js';
import { buildCrowd } from './crowd.js';
import { loadLaserFont, canWrite, buildName, createWriter } from './laser-writer.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const invite = readInvite(location.search);
const guest = invite?.name || '';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero = document.querySelector('.hero');
const $ = (selector) => document.querySelector(selector);

// ---------- Dates ----------

const partyNoon = new Date(`${PARTY.date}T12:00:00+03:30`);

function dateParts(locale, date) {
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tehran',
  }).formatToParts(date);
  return Object.fromEntries(parts.map((p) => [p.type, p.value]));
}

function formatDates() {
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Asia/Tehran' }).format(partyNoon);
  const g = dateParts('en-GB', partyNoon);
  const p = dateParts('en-u-ca-persian', partyNoon);
  return {
    weekday,
    short: `${weekday} ${g.day} ${g.month}`,
    long: `${g.day} ${g.month} ${g.year}`,
    persian: `${p.day} ${p.month} ${String(p.year).replace(/\D/g, '')}`,
  };
}

// '18:00' -> '6 pm', '18:30' -> '6:30 pm', with a no-break space so it never splits.
function formatTime(value) {
  const [h, m] = value.split(':').map(Number);
  const hour = h % 12 || 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}\u00a0${h < 12 ? 'am' : 'pm'}`;
}

function nightsLeft() {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'Asia/Tehran',
  }).formatToParts(new Date());
  const t = Object.fromEntries(parts.map((p) => [p.type, Number(p.value)]));
  const [y, m, d] = PARTY.date.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(t.year, t.month - 1, t.day)) / 86400000);
}

function nightsLabel(n) {
  if (n > 1) return `${n} nights to go`;
  if (n === 1) return 'Tomorrow night';
  if (n === 0) return 'Tonight';
  return 'The party has happened. Thanks for coming.';
}

function googleCalendarUrl() {
  const [y, m, d] = PARTY.date.split('-').map(Number);
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = (date, withTime) => {
    const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
    return withTime ? `${day}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00` : day;
  };
  let dates;
  if (PARTY.startTime) {
    const [hh, mm] = PARTY.startTime.split(':').map(Number);
    const begin = new Date(Date.UTC(y, m - 1, d, hh, mm));
    const end = new Date(begin.getTime() + 4 * 3600 * 1000);
    dates = `${stamp(begin, true)}/${stamp(end, true)}`;
  } else {
    dates = `${stamp(new Date(Date.UTC(y, m - 1, d)))}/${stamp(new Date(Date.UTC(y, m - 1, d + 1)))}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: PARTY.host ? `${PARTY.host}'s birthday party` : 'Birthday party',
    dates,
    ctz: 'Asia/Tehran',
    location: PARTY.route.en.join(', '),
    details: `Address in Persian: ${PARTY.addressFa}\nMap: ${PARTY.map.google}\nInvitation: ${location.href}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// ---------- Name ----------

// On narrow screens a long two-word name is stacked so it stays readable.
function splitName(text) {
  const narrow = window.innerWidth < 640;
  const limit = narrow ? 11 : 20;
  if (text.length <= limit || !text.includes(' ')) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return [text.slice(0, best), text.slice(best + 1)];
}

let renderedLines = '';
let laserFont = null;

// Draws the name as laser outlines when the font's outlines are available,
// otherwise as plain SVG text. Returns the laser strokes, if any.
function renderName(text) {
  const lines = splitName(text);
  if (lines.join('\n') === renderedLines) return null;
  renderedLines = lines.join('\n');

  const svg = $('.name');
  svg.style.setProperty('--lines', lines.length === 1 ? 1 : 1.75);
  $('[data-name-label]').textContent = text;

  if (laserFont) {
    svg.classList.add('is-laser');
    const built = buildName(svg, laserFont, lines);
    updateStrokeScale();
    return built;
  }

  const el = document.createElementNS(SVG_NS, 'text');
  el.setAttribute('class', 'name__text');
  el.setAttribute('text-anchor', 'middle');
  lines.forEach((line, i) => {
    const span = document.createElementNS(SVG_NS, 'tspan');
    span.setAttribute('x', '0');
    span.setAttribute('dy', i === 0 ? '0' : '1.05em');
    span.textContent = line;
    el.append(span);
  });
  svg.replaceChildren(el);
  const box = el.getBBox();
  const pad = Math.max(10, box.height * 0.1);
  svg.setAttribute('viewBox', `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`);
  return null;
}

// Laser lines keep the same on-screen thickness whatever size the name is.
function updateStrokeScale() {
  const svg = $('.name');
  const height = svg.getBoundingClientRect().height;
  const viewHeight = svg.viewBox.baseVal?.height;
  if (height && viewHeight) svg.style.setProperty('--u', viewHeight / height);
}

// ---------- Content ----------

function fillDetails() {
  document.title = guest ? `${guest}, you're invited` : "You're invited to a birthday party";
  $('[data-to-party]').textContent = PARTY.host
    ? `You're invited to ${PARTY.host}'s birthday party.`
    : "You're invited to a birthday party.";

  const dates = formatDates();
  $('[data-date-short]').textContent = PARTY.startTime ? `${dates.short}, ${formatTime(PARTY.startTime)}` : dates.short;
  $('[data-date-weekday]').textContent = dates.weekday;
  $('[data-date-long]').textContent = dates.long;
  $('[data-date-alt]').textContent = dates.persian;
  const timeEl = $('[data-time]');
  timeEl.hidden = !PARTY.startTime;
  if (PARTY.startTime) timeEl.textContent = `Starts at ${formatTime(PARTY.startTime)}`;

  const n = nightsLeft();
  $('[data-nights]').textContent = nightsLabel(n);
  const count = n < 0 ? 0 : Math.min(Math.max(n, 1), 30);
  const bars = $('.nights__bars');
  bars.hidden = count === 0;
  bars.style.setProperty('--n', count);
  bars.replaceChildren(
    ...Array.from({ length: count }, (_, i) => {
      const bar = document.createElement('span');
      bar.style.setProperty('--i', i);
      if (i === count - 1) bar.className = 'is-party';
      return bar;
    }),
  );

  $('[data-gcal]').href = googleCalendarUrl();

  $('[data-route]').replaceChildren(
    ...PARTY.route.en.map((step, i, all) => {
      const li = document.createElement('li');
      li.textContent = step;
      if (i === all.length - 1) li.className = 'route__door';
      return li;
    }),
  );
  $('[data-driver-address]').textContent = PARTY.addressFa;

  const { lat, lng, google } = PARTY.map;
  $('[data-gmaps]').href = google;
  $('[data-waze]').href = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  $('[data-neshan]').href = `https://neshan.org/maps/@${lat},${lng},17.0z,0.0p`;
  $('[data-balad]').href = `https://balad.ir/location?latitude=${lat}&longitude=${lng}&zoom=17`;

  $('[data-dance]').textContent = guest ? `See you on the dance floor, ${guest}.` : 'See you on the dance floor.';
  $('[data-footer]').textContent = guest ? `Invitation no. ${invitationNumber(guest)}, made for ${guest}` : '';
}

function fillTapes() {
  const dates = formatDates();
  const items = [
    guest ? `${guest}, you're invited` : "You're invited",
    PARTY.host ? `${PARTY.host}'s birthday` : 'Birthday party',
    PARTY.startTime ? `${dates.short}, ${formatTime(PARTY.startTime)}` : dates.short,
    'Shahrak-e Gharb, Tehran',
  ];
  document.querySelectorAll('[data-tape]').forEach((track) => {
    // Two identical halves, so sliding by -50% loops without a seam.
    const half = Array.from({ length: 3 }, () => items).flat();
    track.replaceChildren(
      ...[...half, ...half].flatMap((text) => {
        const item = document.createElement('span');
        item.textContent = text;
        const star = document.createElement('span');
        star.textContent = '✦';
        return [item, star];
      }),
    );
  });
}

function startCountdown() {
  if (!PARTY.startTime) return;
  const target = new Date(`${PARTY.date}T${PARTY.startTime}:00+03:30`).getTime();
  const box = $('[data-countdown]');
  const note = $('[data-countdown-note]');
  const nums = Object.fromEntries([...box.querySelectorAll('[data-unit]')].map((el) => [el.dataset.unit, el]));
  const labels = Object.fromEntries([...box.querySelectorAll('[data-label]')].map((el) => [el.dataset.label, el]));
  const words = { d: ['day', 'days'], h: ['hour', 'hours'], m: ['min', 'min'], s: ['sec', 'sec'] };

  const tick = () => {
    const left = Math.floor((target - Date.now()) / 1000);
    if (left <= 0) {
      box.hidden = true;
      note.hidden = false;
      note.textContent = left > -6 * 3600 ? 'The party is on right now' : 'Thanks for coming';
      return false;
    }
    box.hidden = false;
    const values = {
      d: Math.floor(left / 86400),
      h: Math.floor((left % 86400) / 3600),
      m: Math.floor((left % 3600) / 60),
      s: left % 60,
    };
    for (const [unit, value] of Object.entries(values)) {
      const text = String(value).padStart(2, '0');
      if (nums[unit].textContent !== text) {
        nums[unit].textContent = text;
        if (!reducedMotion) {
          nums[unit].classList.remove('is-ticking');
          void nums[unit].offsetWidth;
          nums[unit].classList.add('is-ticking');
        }
      }
      labels[unit].textContent = words[unit][value === 1 ? 0 : 1];
    }
    return true;
  };

  if (tick()) {
    const timer = setInterval(() => {
      if (!tick()) clearInterval(timer);
    }, 1000);
  }
}

let toastTimer = 0;
function toast(message) {
  const el = $('.toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
}

// Copies the Persian address: it's what drivers and ride apps in Tehran need.
async function copyAddress() {
  const text = PARTY.addressFa;
  try {
    await navigator.clipboard.writeText(text);
    toast('Address copied in Persian');
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    toast(ok ? 'Address copied in Persian' : "Couldn't copy. Press and hold the address to select it.");
  }
}

// ---------- Show ----------

function revealNights() {
  const nights = $('.nights');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    nights.classList.add('is-on');
    return;
  }
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      nights.classList.add('is-on');
      io.disconnect();
    }
  }, { threshold: 0.6 });
  io.observe(nights);
}

function wireStage(stage) {
  // Every beam comes out of the cake's middle candle.
  const rig = $('.cake__rig');
  stage.setSource(() => {
    const r = rig.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  // The club (ceiling, truss, mirror ball, wall meters) belongs to the first screen.
  stage.setScene(() => hero.getBoundingClientRect());

  const details = $('.details');
  const night = $('.night');
  const updateHouse = () => {
    const top = details.getBoundingClientRect().top;
    const vh = window.innerHeight;
    stage.setHouse((vh - top) / (vh * 0.75));
    // The photo drifts a little slower than the page as it scrolls past.
    if (!reducedMotion) {
      const rect = night.getBoundingClientRect();
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      night.style.setProperty('--drift', `${(progress * 60).toFixed(1)}px`);
    }
  };
  window.addEventListener('scroll', updateHouse, { passive: true });
  window.addEventListener('resize', updateHouse);
  updateHouse();

  if (!reducedMotion) {
    window.addEventListener('pointermove', (e) => stage.setAim((e.clientX / window.innerWidth - 0.5) * 2), { passive: true });
    $('.hero').addEventListener('pointerdown', (e) => {
      if (!e.target.closest('a, button')) stage.hit(e.clientX, e.clientY);
    });
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fontsReady(text) {
  if (!document.fonts) return;
  await Promise.race([document.fonts.load('800 100px Unbounded', text), wait(2500)]);
}

async function laserFontFor(text) {
  try {
    const font = await Promise.race([loadLaserFont(), wait(3500).then(() => null)]);
    return font && canWrite(font, text) ? font : null;
  } catch {
    return null;
  }
}

async function main() {
  // Every visit starts at the top so the guest sees their name being drawn.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  const seed = hashString(guest || 'guest');
  const stage = createStage($('.stage'), { seed, reducedMotion });
  buildCrowd($('.crowd'), mulberry32(seed + 5));
  fillDetails();
  fillTapes();
  startCountdown();
  $('[data-copy]').addEventListener('click', copyAddress);
  wireStage(stage);
  revealNights();
  stage.start();

  const displayName = guest || 'you';
  const [font] = await Promise.all([laserFontFor(displayName), fontsReady(displayName)]);
  laserFont = font;
  const built = renderName(displayName);
  window.addEventListener('resize', () => {
    renderName(displayName);
    updateStrokeScale();
  });

  if (reducedMotion) {
    hero.classList.add('is-powered', 'is-drawing', 'is-lit', 'is-ready');
    return;
  }

  // The cake powers up first; the laser fires from its candle once it's lit.
  hero.classList.add('is-powered');
  const ignite = 0.9;
  // Longer names take a little longer to write.
  const letters = displayName.replace(/\s/g, '').length;
  const drawFor = built ? Math.min(5, Math.max(2.6, 1.2 + letters * 0.32)) : 2.2;

  if (built) {
    const writer = createWriter($('.name'), built.strokes, built.lengths, drawFor);
    stage.playIntro({ getPen: (seconds) => writer.update(seconds), ignite, draw: drawFor });
    setTimeout(() => writer.finish(), (ignite + drawFor) * 1000);
  } else {
    stage.playIntro({ target: () => $('.name').getBoundingClientRect(), ignite, draw: drawFor });
  }
  setTimeout(() => hero.classList.add('is-drawing'), ignite * 1000);
  setTimeout(() => hero.classList.add('is-lit'), (ignite + drawFor) * 1000);
  setTimeout(() => hero.classList.add('is-ready'), (ignite + drawFor + 0.4) * 1000);
}

main();
