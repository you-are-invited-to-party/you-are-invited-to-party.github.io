// Invitation links carry the guest's name as the whole query string:
// https://you-are-invited-to-party.github.io/?Sara or ?Ali+Rezaei

export function cleanName(raw) {
  return String(raw)
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export function inviteLink(base, name) {
  const url = new URL(base);
  url.search = `?${encodeURIComponent(cleanName(name)).replace(/%20/g, '+')}`;
  return url.toString();
}

// Links made before names went in plain sight used a base64url `i` token.
function decodeToken(token) {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return '';
  }
}

// Reads ?Sara, ?Ali+Rezaei, ?to=Sara, ?name=Sara, or an old ?i=<token>.
export function readInvite(search) {
  const params = new URLSearchParams(search);
  let raw = '';
  if (params.get('i')) raw = decodeToken(params.get('i'));
  else if (params.get('to') || params.get('name')) raw = params.get('to') || params.get('name');
  else {
    const first = search.replace(/^\?/, '').split('&')[0];
    if (first && !first.includes('=')) {
      try {
        raw = decodeURIComponent(first.replace(/\+/g, ' '));
      } catch {
        raw = '';
      }
    }
  }
  const name = cleanName(raw);
  return name ? { name } : null;
}

// FNV-1a, 32-bit. Seeds each guest's light show and invitation number.
export function hashString(text) {
  let h = 0x811c9dc5;
  for (const ch of text) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function invitationNumber(name) {
  return String(1000 + (hashString(name.toLowerCase()) % 9000));
}
