# You're invited

A personal birthday invitation for each guest. When a guest opens their link, a laser rig draws their name, then fans out into a light show. Scrolling down dims the lasers and brings up the house lights for the date, the countdown and the directions.

Live site: https://you-are-invited-to-party.github.io/you-are-invited-to-party/

## Making invitation links

1. Open https://you-are-invited-to-party.github.io/you-are-invited-to-party/create/
2. Write each guest's name in English, one per line, and press **Make links**.
3. Copy each message or share it straight to WhatsApp.

Each link carries the guest's name, so every invitation is unique: the name is drawn by the lasers, the light show's running order is seeded from the name, and the footer shows an invitation number.

You can also write a link by hand: `.../?to=Sara`.

## Changing party details

Edit [`assets/js/config.js`](assets/js/config.js):

- `host`: whose birthday it is (leave empty to keep it neutral)
- `startTime`: the start time in Tehran, like `'20:00'` (leave empty to show the date only)
- `date`, `route`, `addressFa` and `map`: the date and the address

The Apple Calendar file is [`party.ics`](party.ics). If you add a start time, update `DTSTART` and `DTEND` there too.

## Running locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/?to=Sara
