# Foremention monitoring and search setup

Foremention ships technical SEO fundamentals: canonical metadata, robots rules,
a sitemap, structured data, social previews, responsive layout, keyboard focus,
and reduced-motion behavior. These improve discoverability and quality; they do
not guarantee a ranking or an AI citation.

## Activate Sentry

1. Create a free Sentry JavaScript/Cloudflare project and copy its DSN.
2. **Browser:** GitHub -> Settings -> Secrets and variables -> Actions ->
   **Variables** -> `NEXT_PUBLIC_SENTRY_DSN` = the DSN. A browser DSN is public
   by design. `production-deploy.yml` inlines it into the browser bundle at
   build time (with `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`); unset means
   browser Sentry stays off. `components/sentry-client.tsx` reads it.
3. **Worker/server:** `npx wrangler secret put SENTRY_DSN` (and optionally
   `npx wrangler secret put SENTRY_ENVIRONMENT` with `production`). Never commit it.
4. Deploy and confirm one harmless test error reaches Sentry from each side.

The CSP `connect-src` allows `*.ingest.sentry.io`, `*.ingest.us.sentry.io` and
`*.ingest.de.sentry.io`. Browser monitoring sends no default PII and uses a 5%
trace sample. Review retention and privacy before enabling replay or user
feedback.

## Workers Logs

`wrangler.jsonc` and `scripts/prepare-worker-config.mjs` enable Workers
observability (`observability.enabled`, `logs.invocation_logs`, sampling 1.0),
so `console.*` output and invocation logs from the deployed Worker are kept
and searchable in Cloudflare dashboard -> Workers -> foremention-mvp -> Logs.
Logs follow Cloudflare's plan limits and retention; lower `head_sampling_rate`
in both files if traffic grows past the free allowance.

## Brave Search API key: move to a Worker secret

`lib/free-web-retrieval.ts` reads `process.env.BRAVE_SEARCH_API_KEY`. With
`nodejs_compat` and the current compatibility date, Workers populate
`process.env` from both plain-text vars and secrets, so no code change is
needed. To move it (do this deliberately, not from CI):

```bash
npx wrangler secret put BRAVE_SEARCH_API_KEY   # paste the key when prompted
# then delete the plain-text BRAVE_SEARCH_API_KEY variable in the Cloudflare
# dashboard (Workers -> foremention-mvp -> Settings -> Variables), redeploy,
# check /api/health shows retrieval available, and rotate the key in Brave.
```

`keep_vars: true` keeps dashboard plain-text vars across deploys; a secret is
never touched by `wrangler deploy`.

## Connect the free search foundations

1. In Google Search Console, create the domain property `foremention.com` and
   verify its DNS record in Cloudflare.
2. Submit `https://foremention.com/sitemap.xml`, then inspect the home page and
   high-value product pages.
3. In Bing Webmaster Tools, import the verified Search Console property, or
   verify it by DNS.
4. Enable Cloudflare Web Analytics if privacy-preserving aggregate website
   analytics is wanted.

Do not add visitor recording, ad pixels, or an AI-writing plugin by default.
They create privacy, consent, performance, and data-governance work, but cannot
make a site rank first.

## GEO and content operations

Earn visibility with accurate, uniquely useful product pages, transparent
methodology, dated source records, clear comparison pages, and fast crawlable
HTML. Keep every public claim evidence-backed and update pages when product
capabilities actually change.
