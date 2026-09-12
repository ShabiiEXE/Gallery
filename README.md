<h1>
  <img src="public/assets/Icon.png" alt="Gallery logo" width="42" align="center">
  <span style="color: #e92841;">Shabii's Gallery</span>
</h1>

Shabii's Gallery is a personal Magic: The Gathering collection gallery for signed cards, artist proofs, alters, custom proxies, deck memories, and card variants. It runs as a self-hosted static frontend served by a Cloudflare Worker, with saved cards and settings stored in Cloudflare KV.

The app has one main page:
- <img src="public/assets/Icon.png" alt="Gallery" width="18" align="center"> `/` for the card gallery, filters, card detail views, editing, Scryfall lookup, Moxfield deck info, and collection metadata.

Made and designed by <img src="public/assets/shabii_logo.png" alt="Shabii" width="18" align="center"> [Shabii](https://x.com/Shabii_exe) with the help of ChatGPT Codex.

## Features
- Cloud sync through Cloudflare Workers and KV.
- Signed, artist proof, altered, altered artist proof, custom proxy, and foil card tracking.
- Scryfall-powered lookup by card name or Scryfall link.
- Cardmarket and TCGplayer links as saved card references.
- Language-aware Scryfall lookup when possible.
- Moxfield deck auto-fetch by pasted deck URL.
- Commander deck metadata, bracket pills, commander/part-of-99 role, deck owners, avatars, mana color pips, and deck background art.
- Original/custom card art toggle in the 3D card detail view.
- Front/back card image support, including double-faced cards and artist proof backs.
- Local asset photo picker for card images.
- Partner card linking so related cards stay together without bundling.
- Gallery filters by type, artist, and set, plus sorting by artist, deck, name, year, or type.
- Responsive display sizing for desktop and mobile gallery grids.
- Settings saved to Cloudflare KV so defaults survive browser cache clears.
- Mobile-ready responsive layout for phone, tablet, and desktop use.

---

<h1>
  <img src="public/assets/Icon.png" alt="Gallery logo" width="42" align="center">
  <span style="color: #e92841;">How To Setup Your Own Gallery</span>
</h1>

This is the main setup path. You do not need to download a ZIP or run terminal commands. Cloudflare can import the public GitHub repository URL directly from the dashboard and automatically set up your own personal copy for you, for free.

#### Setup requirements

- <img src="https://cdn.simpleicons.org/cloudflare/F38020" alt="Cloudflare" width="18" align="center"> A Cloudflare account, to host your site and store your cards.
- <img src="https://cdn.simpleicons.org/github/D0D7DE" alt="GitHub" width="18" align="center"> A GitHub account to host your site files.

The setup is simple and should take under an hour. Scryfall lookup works without private API keys. Moxfield deck fetch also works through the Worker API without extra setup.

Your default Gallery site URL will be **gallery.***email_username***.workers.dev**. You can change it later with a custom domain if wanted.

### 1. Start from Cloudflare

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages**.
3. Click **Create application**.
4. Click **Continue with GitHub**.
5. Choose **Import a repository**.
6. Choose **Clone a public repository via GitHub URL**.
7. Add this repository URL:

```text
https://github.com/ShabiiEXE/Gallery
```

8. Continue with the imported repository.
9. If Cloudflare sends you to GitHub, set up or sign in to your GitHub account and allow the connection.
10. Keep the default settings and click **Deploy**.
11. Once deployed, open **Overview** in the nav bar and click **Visit** to open your site.
12. If the **Visit** button is not available, open **Domains** in the nav bar and enable both URLs.

### 2. Create the Cloudflare KV storage

Gallery stores cards and settings in Cloudflare KV.

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages**.
3. Open your Gallery Worker.
4. Open **Storage & Databases** or **KV**.
5. Create a KV namespace.
6. Bind it to the Worker with this exact binding name:

```text
MAGIC_GALLERY
```

If you are editing `wrangler.toml` manually, the binding should look like this:

```toml
[[kv_namespaces]]
binding = "MAGIC_GALLERY"
id = "your_cloudflare_kv_namespace_id"
```

### 3. Set your own private password to access editing

In order to add cards, edit cards, and change settings, set your own password.

In the Worker project settings, add your secret through the Cloudflare website:

1. Open the [Cloudflare dashboard](https://dash.cloudflare.com/).
2. Go to **Workers & Pages**.
3. Open your Gallery Worker.
4. Open **Settings**.
5. Open **Variables and Secrets**.
6. Click **Add**.
7. Choose **Secret**.
8. Enter the variable name exactly as shown below.
9. Paste your password as the value.
10. Deploy/Save.

Add this required secret:

```text
EDIT_PASSWORD
```

`EDIT_PASSWORD` is the password you will type in the app to unlock editing and settings.

Use **Secret** for passwords. Do not share them publicly or add them as plain text.

### 4. Optional Worker variable

The project includes this variable by default:

```text
EDITOR_AUTH_SCOPE=gallery
```

It scopes the editor login cookie to this Gallery app. You can leave it as-is.

### 5. Set up automatic website updates/patches

To receive upcoming Gallery feature updates, add a GitHub Actions sync workflow to your repository.

1. Once the setup is done, go to your newly added GitHub repository.
2. Go to **Actions**.
3. Click **set up a workflow yourself**.
4. Make sure the default file name is:

```text
main.yml
```

5. Add your sync workflow, commit it, and enable it in **Actions**.
6. To force an update manually later, open your repository, go to **Actions**, open the sync workflow, and click **Run workflow**.

---

## <img src="public/assets/Icon.png" alt="Gallery" width="22" align="center"> First run

1. Deploy the website.
2. Open it.
3. Click the login/edit button and enter the `EDIT_PASSWORD` you set.
4. Open Settings.
5. Set language, default sort, default direction, and visible sections.
6. Save settings.

Those settings are stored in the Worker KV namespace and also cached locally for faster loading.

## <img src="public/assets/Icon.png" alt="Gallery" width="22" align="center"> Common tasks

### Add a card to the gallery

1. Log in.
2. Click **Add Card**.
3. Search by card name, paste a Scryfall link, or paste a Cardmarket/TCGplayer link.
4. Pick the card result.
5. Choose type, language, foil, photos, artist, year, signature/alter info, set data, and notes.
6. Save.

Scryfall fills card name, set, collector number, original art, original back art when available, and original card artist.

### Add Moxfield deck information

1. Edit or add a card.
2. Paste a Moxfield deck URL into the Moxfield deck field.
3. The app auto-fetches deck name, format, commander bracket, deck owner(s), avatars, color identity, and deck art.
4. If the format is Commander, choose whether the card is the commander or part of the 99.
5. Save.

Deck data is shown in the card detail view with the Moxfield logo and links back to the deck.

### Use local card photos

Card photos in `public/assets/cards/` are available in the image dropdowns inside the editor.

To add more reusable photos:

1. Add optimized images to:

```text
public/assets/cards/
```

2. Add the image paths to:

```text
public/js/photo-assets.js
```

3. Deploy the site again.

Images saved directly into card data can make KV data too large. Prefer optimized local assets for large scans or photos.

### Link partner cards

1. Edit the card that should appear first.
2. Enable **Partner**.
3. Choose the partner card from the dropdown.
4. Save.

Partner cards stay next to each other in the gallery and show each other in the card detail collection section, but they are not bundled into one card.

### Toggle original/custom art

In the card detail view:

- Use the eye button to switch the big 3D card between custom and original card art.
- Use the flip button when the card has a back side.
- Artist proofs and altered artist proofs can show the proof back first.

### Clear local cache

Click the footer version number to clear browser cache/local storage and reload.

Cards and saved defaults are stored in Cloudflare KV, so they can return after reload as long as Cloudflare storage is configured.

---

## Local development

```bash
npm install
npm run dev
```

Deploy:

```bash
npm run deploy
```

The static app lives in `public/`. API/auth code lives in `functions/api/` and is routed by `worker.js`.
