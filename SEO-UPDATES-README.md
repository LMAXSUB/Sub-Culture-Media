# Applying the SEO/social-preview update to the rest of the site

`index.html` and `a-sideshow-year.html` are fully done — use `a-sideshow-year.html`
as your template. Here's why the rest of the article pages, plus
`photography.html`, `downloads.html` and `shop.html`, aren't included as
finished files: I could only pull the full source of those two pages directly;
GitHub blocked repeated automated fetches of the others. Rather than guess at
content I haven't actually seen and risk silently dropping something, here's
the exact, safe patch to apply by hand — it's the same few lines on every page,
in the same spot, and it only needs values that are already sitting right there
in the file.

## The steps, per page

Open the file in GitHub (pencil icon to edit) and:

**1. Find this block near the top of `<head>`:**

```html
<title>...</title>
<meta name="description" content="...">
```

Copy the exact text inside `<title>` and `content="..."` — you'll reuse both.

**2. Paste this block directly after that `<meta name="description">` line**,
filling in the four `{{ }}` placeholders using what you just copied, plus the
page's own URL and a real image filename already used on that page (its hero
or article photo):

```html
<link rel="canonical" href="https://subxculturex.com/{{PAGE-FILENAME}}">
<meta property="og:type" content="{{website-or-article}}">
<meta property="og:site_name" content="Sub Culture">
<meta property="og:title" content="{{SAME AS <title>}}">
<meta property="og:description" content="{{SAME AS description}}">
<meta property="og:url" content="https://subxculturex.com/{{PAGE-FILENAME}}">
<meta property="og:image" content="https://subxculturex.com/{{AN-IMAGE-ON-THIS-PAGE.jpg}}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{{SAME AS <title>}}">
<meta name="twitter:description" content="{{SAME AS description}}">
<meta name="twitter:image" content="https://subxculturex.com/{{AN-IMAGE-ON-THIS-PAGE.jpg}}">
```

Use `og:type = website` for `photography.html`, `downloads.html` and
`shop.html`; use `og:type = article` for every article page.

**3. Add the "Live Scores" nav link** so it's reachable from every page (find
the `<li><a href="downloads.html">Downloads</a></li>` line, in both the header
nav and the footer nav, and add directly after it):

```html
<li><a href="index.html#live-scores">Live Scores</a></li>
```

**4. Add the analytics line** directly before `</body>` (same line on every page):

```html
<script data-goatcounter="https://subculture.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
```

That's it — nothing else on the page changes. Commit each file and it goes live
within a minute or two, same as any other edit to this repo.

## Pages to update this way

- `photography.html`
- `downloads.html`
- `shop.html`
- `a-sweet-delusion.html`
- `boobies-and-doobies.html`
- `careers-article.html`
- `cheers-to-sunny-days.html`
- `festivals-vs-alone.html`
- `khumo-the-beautiful.html`
- `restaurant-economics.html`
- `snoop-the-undisputed-king.html`
- `toby-from-59th.html`
- `work-with-us.html`

## Two things to activate (both free)

- **Analytics**: done — your real GoatCounter code (`subculture`) is already
  in the script tag above and in the two finished pages.
- **Google Search Console**: add `subxculturex.com`, verify ownership, and
  submit `https://subxculturex.com/sitemap.xml` so Google finds every page.

## New files to add to the repo root

- `sitemap.xml`
- `robots.txt`
