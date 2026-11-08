import { PARTY } from './config.js?v=0d9be427';
import { cleanName, inviteLink, invitationNumber } from './invite-token.js?v=a2b1d497';

const STORAGE_KEY = 'invite-maker-names';
const LINK_TEXT = 'کارت دعوتت اینجاست';
const FA_WEEKDAYS = ['یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
const PERSIAN = /[؀-ۿ‌]/;
const base = new URL('../', location.href);

const form = document.querySelector('[data-form]');
const textarea = form.querySelector('textarea');
const list = document.querySelector('[data-links]');
const empty = document.querySelector('[data-empty]');
const warning = document.querySelector('[data-warning]');
const copyAll = document.querySelector('[data-copy-all]');
let messages = [];

const faDigits = (value) => String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// "پنج‌شنبه ۲۸ آبان ساعت ۶", straight from the party settings.
function faWhen() {
  const noon = new Date(`${PARTY.date}T12:00:00+03:30`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', timeZone: 'Asia/Tehran' })
      .formatToParts(noon)
      .map((p) => [p.type, p.value]),
  );
  let when = `${FA_WEEKDAYS[noon.getUTCDay()]} ${faDigits(parts.day)} ${parts.month}`;
  if (PARTY.startTime) {
    const [h, m] = PARTY.startTime.split(':').map(Number);
    when += ` ساعت ${faDigits(h % 12 || 12)}${m ? `:${faDigits(String(m).padStart(2, '0'))}` : ''}`;
  }
  return when;
}

// One line can hold both spellings, e.g. "Sara سارا": the English part goes
// into the link (the lasers draw it), the Persian part into the greeting.
function parseLine(line) {
  const tidy = line.replace(/[|/،,]+/g, ' ');
  const english = cleanName(tidy.replace(/[؀-ۿ‌]+/g, ' '));
  const persian = cleanName((tidy.match(/[؀-ۿ‌]+(?:\s+[؀-ۿ‌]+)*/g) || []).join(' '));
  const site = english || persian;
  return site ? { site, greet: persian || english } : null;
}

function messageFor(greet, url) {
  const lines = [`سلام ${greet} جان!`, `${faWhen()} تولدمه، خیلی خوشحال می‌شم بیای 🎉`];
  return {
    lines,
    // Plain text can't hide a link behind words, so the address follows them.
    plain: [...lines, `${LINK_TEXT}:`, url].join('\n'),
    html: `<div dir="rtl">${lines.map(escapeHtml).join('<br>')}<br><a href="${escapeHtml(url)}">${LINK_TEXT}</a></div>`,
  };
}

let toastTimer = 0;
function toast(message) {
  const el = document.querySelector('.toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Couldn't copy. Select the text and copy it yourself.");
  }
}

// Copies the message as rich text, so pasting into Telegram or an email keeps
// «کارت دعوتت اینجاست» as a tappable link. Apps without rich text get the plain version.
async function copyRich(html, plain, done) {
  try {
    if (!window.ClipboardItem || !navigator.clipboard?.write) throw new Error('No rich clipboard');
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      }),
    ]);
    toast(done);
  } catch {
    const box = document.createElement('div');
    box.contentEditable = 'true';
    box.innerHTML = html;
    box.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.append(box);
    const range = document.createRange();
    range.selectNodeContents(box);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const ok = document.execCommand('copy');
    selection.removeAllRanges();
    box.remove();
    toast(ok ? done : "Couldn't copy. Select the text and copy it yourself.");
  }
}

async function share(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

function button(label, onClick, extra = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `button button--small ${extra}`.trim();
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
}

// What the guest will see once the message is pasted.
function preview(lines, url) {
  const box = document.createElement('div');
  box.className = 'link__preview';
  box.dir = 'rtl';
  box.lang = 'fa';
  for (const line of lines) {
    const p = document.createElement('p');
    p.textContent = line;
    box.append(p);
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = LINK_TEXT;
  const p = document.createElement('p');
  p.append(a);
  box.append(p);
  return box;
}

function render() {
  const seen = new Set();
  const guests = textarea.value
    .split('\n')
    .map(parseLine)
    .filter((g) => g && !seen.has(g.site) && seen.add(g.site));
  try {
    localStorage.setItem(STORAGE_KEY, textarea.value);
  } catch {}

  messages = [];
  list.replaceChildren(
    ...guests.map(({ site, greet }) => {
      const url = inviteLink(base, site);
      const message = messageFor(greet, url);
      messages.push(message.plain);

      const li = document.createElement('li');
      li.className = 'link';

      const head = document.createElement('div');
      head.className = 'link__head';
      const title = document.createElement('p');
      title.className = 'link__name';
      title.dir = 'auto';
      title.textContent = site;
      const no = document.createElement('p');
      no.className = 'link__no';
      no.textContent = `No. ${invitationNumber(site)}`;
      head.append(title, no);

      const anchor = document.createElement('a');
      anchor.className = 'link__url';
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.textContent = url;

      const actions = document.createElement('div');
      actions.className = 'link__actions';
      actions.append(
        button('Copy for Telegram', () => copyRich(message.html, message.plain, 'Copied with the link built in. Paste it in Telegram.'), 'button--accent'),
        button('Copy for WhatsApp', () => copy(message.plain, 'Copied. Paste it in WhatsApp.')),
        button('Share', () => share(message.plain)),
        button('Copy link', () => copy(url, 'Link copied')),
      );

      li.append(head, anchor, preview(message.lines, url), actions);
      return li;
    }),
  );

  warning.hidden = !guests.some((g) => PERSIAN.test(g.site));
  empty.hidden = guests.length > 0;
  copyAll.hidden = guests.length < 2;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  render();
});

copyAll.addEventListener('click', () => copy(messages.join('\n\n'), `${messages.length} messages copied`));

try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    textarea.value = saved;
    render();
  }
} catch {}
