# Teenooja — Artist Portfolio Website

A static website for Teenooja, modelled on the layout, palette and typography of
[tylerjurelle.com/portfolio](https://tylerjurelle.com/portfolio/).

## Running it

Any static file server works. From the project root:

```bash
python3 -m http.server 4173 --directory site
```

Then open http://localhost:4173.

Opening `site/index.html` straight from Finder also works, since there is no build step.

## Pages

| File | Contents |
| --- | --- |
| `index.html` | Hero, comp-card chips, stats row, category grid, about preview, services, data sheet, contact CTA |
| `portfolio.html` | Comp-card header, six category cards, filterable masonry grid of all 100 photographs with lightbox, FAQ |
| `about.html` | Biography plus the full artist data sheet from the PDF (personal, body, education, interests, comfort levels) |
| `contact.html` | Contact details and a WhatsApp enquiry form |

## Assets

- `assets/style.css` — all styling. The palette matches the reference site:
  `#a8977b` accent, `#3f4245` body text, `#111518` headings/dark blocks,
  `#f3ece0` cream, `#e9ddc9` sand.
- `assets/gallery.js` — the gallery data: six categories, each with a cover and
  its list of photos as `{f: filename, w: width, h: height}`. **Edit this file to
  add, remove or re-categorise photos.** The width and height are what let the
  gallery lay itself out before the images load — if you add a photo, include them.
- `assets/main.js` — mobile nav, reveal-on-scroll, category cards, gallery filters,
  justified gallery layout, lightbox, WhatsApp form.

## Images

`site/img/` holds web-optimised copies generated from `../images/` with `sips`:

- `img/thumb/` — max 700px, quality 62 (grid and cards)
- `img/full/` — max 1800px, quality 72 (lightbox and hero)

The originals (801 MB) are untouched in `../images/`. To regenerate after adding photos:

```bash
for f in images/*; do b=$(basename "$f"); n="${b%.*}"; s=$(echo "$n" | tr ' ,' '__' | tr -cd 'A-Za-z0-9_-'); sips -s format jpeg -s formatOptions 72 -Z 1800 "$f" --out "site/img/full/$s.jpg"; sips -s format jpeg -s formatOptions 62 -Z 700 "site/img/full/$s.jpg" --out "site/img/thumb/$s.jpg"; done
```

## Categories

| Slug | Title | Photos |
| --- | --- | --- |
| `bridal` | Bridal & Ceremonial | 28 |
| `traditional` | Traditional Saree | 16 |
| `ethnic` | Ethnic Drape | 12 |
| `silk` | Silk & Colour | 14 |
| `kerala` | Kerala Classic | 11 |
| `casual` | Casual & Contemporary | 19 |

## Gallery layout

The grid uses justified rows, like Google Photos: each photo keeps its own aspect
ratio and every row — the last one included — is scaled to fill the width exactly,
so there is no ragged right-hand edge and nothing is cropped. The number of rows is
chosen up front from the total aspect ratio, then the photos are split across them
by dynamic programming (`partition()` in `main.js`) so the rows come out a similar
height. Target row heights live in `metrics()`: 340px desktop, 280px tablet, 260px
phone, where rows are also kept to at least two photos.

Asset URLs carry a `?v=` version string. Bump it whenever you edit the CSS or JS,
or returning visitors will keep the cached copies:

```bash
cd site && V=$(date +%Y%m%d%H%M%S) && sed -i '' -E "s#(assets/(style\.css|gallery\.js|main\.js))\?v=[0-9]+#\1?v=$V#g" *.html
```

## Notes

- The contact form composes a WhatsApp message and opens `wa.me/919944730755`
  (WhatsApp on mobile, WhatsApp Web on desktop) with the enquiry pre-filled —
  nothing is sent until the visitor presses send in WhatsApp. The number lives in
  one place: the `data-whatsapp` attribute on the form in `contact.html`.
- Social media links are not included — none were in the portfolio PDF.
- Measurements are reproduced exactly as supplied in the PDF; the footnote about
  units and shoe sizing is carried over too.
