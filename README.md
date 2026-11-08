# You're invited

A personal birthday invitation for each guest. When a guest opens their link, a laser rig draws their name, then fans out into a light show. Scrolling down dims the lasers and brings up the house lights for the date, the countdown and the directions.

Live site: https://you-are-invited-to-party.github.io/

## Making invitation links

1. Open https://you-are-invited-to-party.github.io/create/
2. Write each guest's name in English, one per line, and press **Make links**.
3. Copy each message or share it straight to WhatsApp.

Each link is just the site address with the guest's name after `?`, for example `https://you-are-invited-to-party.github.io/?Sara` or `https://you-are-invited-to-party.github.io/?Ali+Rezaei` (use `+` for spaces). You can also type these by hand.

Every invitation is unique: a laser writes the guest's name stroke by stroke, the light show's running order comes from the name, and the footer shows an invitation number. A neon birthday cake sits at the bottom of the first screen and every beam comes out of its middle candle. Around it is a drawn club: a slatted ceiling and truss with moving-head lights, a mirror ball, LED meters on the walls, and a dancing crowd. Tapping the stage fires the lasers at that spot.

## Changing party details

Edit [`assets/js/config.js`](assets/js/config.js):

- `host`: whose birthday it is (leave empty to keep it neutral)
- `startTime`: the start time in Tehran, like `'18:00'` (leave empty to show the date only)
- `date`, `route`, `addressFa` and `map`: the date and the address

The Apple Calendar file is [`party.ics`](party.ics). If you change the date or time, update `DTSTART` and `DTEND` there too (they're in UTC; Tehran is UTC+3:30).

## Running locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/?Sara

## Credits

- [Unbounded](https://github.com/googlefonts/unbounded) by The Unbounded Project Authors, SIL Open Font License ([`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)). A Latin subset with merged outlines is bundled so the lasers can trace each letter.
- [opentype.js](https://opentype.js.org) 1.3.4, MIT License, bundled in [`assets/vendor`](assets/vendor).
- Photo "DJ Night Vibes" from [StockCake](https://stockcake.com), in [`assets/img`](assets/img).
