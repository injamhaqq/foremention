# Foremention monitoring and search setup

Foremention ships technical SEO fundamentals: canonical metadata, robots rules,
a sitemap, structured data, social previews, responsive layout, keyboard focus,
and reduced-motion behavior. These improve discoverability and quality; they do
not guarantee a ranking or an AI citation.

## Activate Sentry

1. Create a free Sentry JavaScript/Cloudflare project.
2. Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to encrypted host environment
   variables. Use the project DSN for both.
3. Add `SENTRY_ENVIRONMENT=production` and
   `NEXT_PUBLIC_SENTRY_ENVIRONMENT=production`.
4. Redeploy and confirm a harmless staging error reaches Sentry.

The server DSN is never committed. Browser monitoring sends no default PII and
uses a 5% trace sample. Review retention and privacy before enabling replay or
user feedback.

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
