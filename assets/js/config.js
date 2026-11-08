// Everything about the party lives here. Edit this file, push, and every
// invitation link picks up the change.

export const PARTY = {
  // Whose birthday it is, e.g. 'Parsa'. Leave empty to keep the invitation
  // neutral ("You're invited to a birthday party").
  host: '',

  // Party date in Tehran.
  date: '2026-11-19',

  // Start time in Tehran as 'HH:MM' (24h), e.g. '20:00'. Leave empty to show
  // the date only.
  startTime: '18:00',

  // The address as a route, from the neighbourhood down to the door.
  route: {
    en: ['Shahrak-e Gharb, Tehran', 'North Zarafshan St.', '3rd alley', '1st side alley', 'No. 4 (1387)'],
  },

  // The same address in Persian, for drivers and ride apps.
  addressFa: 'شهرک غرب، زرافشان شمالی، کوچه سوم، فرعی اول، پلاک ۴ (۱۳۸۷)',

  // Telegram group invite link (https://t.me/+…). Guests who answer "Yes, I'll
  // be there" get a button to join it.
  telegram: 'https://t.me/+f5fz2fLHzPkyYjg0',

  map: {
    google: 'https://maps.app.goo.gl/AGuqCJ3yrttqhef17',
    lat: 35.7577133,
    lng: 51.3523889,
  },
};
