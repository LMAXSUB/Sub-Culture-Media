# Sub Culture — website files

Three pages: `index.html` (Articles/blog), `photography.html` (services), `shop.html` (digital products).
Shared: `styles.css`, `script.js`, `posts.json`, and `images/` (put your logo and post images here).

## How to add a free download (MP3 or picture)
1. Put the file into `downloads/mp3/` (for audio) or `downloads/pictures/` (for images).
2. Open `downloads.json` in GitHub, click the pencil to edit, and add a new entry:

```json
{
  "title": "Track or Photo Name",
  "type": "mp3",
  "file": "downloads/mp3/your-filename.mp3",
  "description": "A short line about it."
}
```

Use `"type": "image"` for pictures instead of `"mp3"`. Don't forget the comma after the previous entry's closing `}`. Commit — it appears on the Downloads page automatically. Keep individual files under about 100MB (GitHub's per-file limit); MP3s and photos are normally well under that.

## How to publish a new article (no code editing needed)
1. In Canva, export your article's cover image as a JPG or PNG.
2. Upload that image into the `images/posts/` folder in your GitHub repo.
3. Open `posts.json` in GitHub, click the pencil to edit, and add a new entry at the top like this:

```json
{
  "title": "Your Article Title",
  "date": "2026-09-10",
  "image": "images/posts/your-image-filename.jpg",
  "excerpt": "A one or two sentence teaser for the article."
}
```

Don't forget the comma after the previous entry's closing `}` if you're adding above it. Commit the change — the new post appears on the homepage automatically, newest first.

## Before you publish — fill these in
- **Photography page**: replace the WhatsApp number in the two "Book" buttons (`https://wa.me/27000000000`) with your real WhatsApp number, in the format `27` + your number without the leading 0.
- **Shop page**: replace the three placeholder product cards with your real digital products, and swap each "Buy on Gumroad" link (`href="#"`) for your actual Gumroad product URL. Sign up free at gumroad.com if you haven't already.
- **Social links**: currently pointing to instagram.com/subxculturex, tiktok.com/@subxculturex, and youtube.com/@subxculturex — update if these aren't correct.

## Hosting it for free — GitHub Pages
1. Create a new repository (e.g. `subculture-site`).
2. Upload all the files and folders here, keeping the same structure (`images/` and `images/posts/` as folders, not flattened).
3. Go to Settings → Pages, set Branch to `main` and folder to `/root`, then Save.
4. Your live link will appear at the top of that page after a minute or two.
5. You can later point subxculturex.com at this for free too, the same way as the attorneys site.
