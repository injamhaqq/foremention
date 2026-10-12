# Chat05 — cross-owner integration and acceptance proposals

Status: proposals, **not integrated fixes or evidence of production verification**. Based on main `6b93c88cd22653fb17c9bec5ca91ca4e997d76b9` and Chat05's isolated branch.

## FM-00 / Chat02 / Chat08: duplicate intake without an authoritative receipt (A01)

**Observed source contract**: `app/api/design-partner/route.ts` returns HTTP 201 / `received:true` on `claim === "duplicate"`, without an `intakeId`. The browser contact page correctly refuses to display success without an ID-only persisted receipt lookup. As a result a legitimate retry cannot verify its prior submission from the response. The pre-insert duplicate claim also has no public path to distinguish a previous committed insert from a failed insert after the claim was accepted.

**Required design decision**: preserve abuse controls, privacy, rate limits and scoped first-party persistence. FM-00/Chat02 to decide whether a transactional claim+insert/finalize RPC, constrained one-time receipt proof, or generic non-success duplicate response is permitted. Never return an existing intake ID based only on a guessed email or caller-supplied fields; never allow browser events to count as first-party conversion. Exercise first insert, exact retry, abandoned claim, concurrent duplicate, honeypot, invalid UUID, 429, database outage and telemetry outage. Chat05's safe interim UI describes missing proof neutrally.

## Chat04: action-detail interaction and focus (CV-17; coordinated CV-11)

Implementation ownership stays with Chat04. Provide one seeded, isolated and authorization-safe action-detail fixture and test: open from list via keyboard, assert focus moves into detail, Escape closes, focus returns to initiating trigger, no focus trap outside open content, error and retry remain announced, user-entered review labels distinguish returned references, independently retrieved evidence, and human inference. Chat05 supplies display labels if requested, but makes **no** independent mutation to feature review internals.

## FM-00 / Chat09: browser and search-indexing gates (A21/CV-17)

Run exact-head end-to-end/browser verification in a supported test environment for **320, 375, 768, 1024, 1440 px**, keyboard order, 200% text resize, focus-visible, touch targets, contrast, reduced motion, error/retry states, no horizontal content spill and restored focus for modals. Compare all 72 app page files and 78 API route files against both historical route inventories (`Foremention_Route_Coverage_71.csv`, `Foremention_Route_Coverage_71_v2.csv`) and 92 historical states (`Foremention_Surface_State_Register_v2.csv`), which were named in this packet but **not actually attached**.

Check actual rendered HTML and HTTP headers, dynamic `robots.txt`, sitemap, canonicals, social previews, link graph, private/auth/share/token noindex, and no indexing of `/pricing` until commercial truth is approved. Test `/api-docs/webhooks` newly added metadata. A source-level assertion alone is not performance, Lighthouse, axe, crawl or production proof.

## Chat03/Chat02/FM-00: policy and commercial truth

Keep existing `/pricing` noindex and proposed-price qualifier. PR #509 has a separate **draft** Paddle refund/cancellation page; no merge or public legal promise under Chat05. Counsel/founder review and checkout configuration receipt are required before claiming merchant, payouts, verified phone/support channels, cancellation paths, or live product availability.

## Source provenance limitation

This chat received 7 package control/index files, **not** the `Source_Files/` directory or original 18 files referenced in `Source_File_Checklist_19.csv`. `Foremention_Master_Backlog_28_v2.csv` was explicitly missing in the packaging report. Backlog row dispositions below are therefore restricted to available index excerpts plus current first-party repository code; historical full report-specific page/route/state acceptance requires the originals for exact reconciliation.
