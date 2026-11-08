// Invitation links carry the guest's name in the `i` query parameter as
// base64url text, so the name isn't sitting in the URL in plain sight.

export function cleanName(raw) {
  return String(raw)
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export function encodeInvite(name) {
  const bytes = new TextEncoder().encode(cleanName(name));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInvite(token) {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const name = cleanName(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return name ? { name } : null;
  } catch {
    return null;
  }
}

// Reads ?i=<token>, or the plain ?to=Name / ?name=Name forms.
export function readInvite(search) {
  const params = new URLSearchParams(search);
  const token = params.get('i');
  if (token) return decodeInvite(token);
  const plain = cleanName(params.get('to') || params.get('name') || '');
  return plain ? { name: plain } : null;
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
