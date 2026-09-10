# Magic Gallery

Magic Gallery is a Cloudflare-ready web app for signed Magic cards, artist proofs, alters, and custom proxies. The static app lives in `public/`; API/auth code lives in `functions/api/` and is routed by `worker.js`.

## Local

```bash
npm install
npm run dev
```

The app works locally with browser storage. Cloudflare sync requires:

- `EDIT_PASSWORD` secret for login.
- `MAGIC_GALLERY` KV namespace bound in `wrangler.toml`.

## Cloudflare

1. Create a KV namespace and replace `replace_with_cloudflare_kv_namespace_id` in `wrangler.toml`.
2. Add an `EDIT_PASSWORD` secret in Cloudflare.
3. Deploy with `npm run deploy`.

Card lookup uses Scryfall directly from the browser. Cardmarket and TCGplayer are accepted as link-only references.
