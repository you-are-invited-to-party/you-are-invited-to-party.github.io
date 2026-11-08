import { cleanName, encodeInvite, invitationNumber } from './invite-token.js';

const STORAGE_KEY = 'invite-maker-names';
const base = new URL('../', location.href);

const form = document.querySelector('[data-form]');
const textarea = form.querySelector('textarea');
const list = document.querySelector('[data-links]');
const empty = document.querySelector('[data-empty]');
const warning = document.querySelector('[data-warning]');
const copyAll = document.querySelector('[data-copy-all]');
let messages = [];

function linkFor(name) {
  const url = new URL(base);
  url.searchParams.set('i', encodeInvite(name));
  return url.toString();
}

function messageFor(name, url) {
  return `Hi ${name}!\nHere's your invitation to the birthday party:\n${url}`;
}

let toastTimer = 0;
function toast(message) {
  const el = document.querySelector('.toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast("Couldn't copy. Select the link and copy it yourself.");
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

function button(label, onClick) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'button button--small';
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
}

function render() {
  const names = [...new Set(textarea.value.split('\n').map(cleanName).filter(Boolean))];
  try {
    localStorage.setItem(STORAGE_KEY, textarea.value);
  } catch {}

  messages = [];
  list.replaceChildren(
    ...names.map((name) => {
      const url = linkFor(name);
      const text = messageFor(name, url);
      messages.push(text);

      const li = document.createElement('li');
      li.className = 'link';

      const head = document.createElement('div');
      head.className = 'link__head';
      const title = document.createElement('p');
      title.className = 'link__name';
      title.dir = 'auto';
      title.textContent = name;
      const no = document.createElement('p');
      no.className = 'link__no';
      no.textContent = `No. ${invitationNumber(name)}`;
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
        button('Copy message', () => copy(text, `Message for ${name} copied`)),
        button('Copy link', () => copy(url, 'Link copied')),
        button('Share', () => share(text)),
      );

      li.append(head, anchor, actions);
      return li;
    }),
  );

  warning.hidden = !names.some((name) => /[^\u0000-ɏ]/.test(name));
  empty.hidden = names.length > 0;
  copyAll.hidden = names.length < 2;
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
