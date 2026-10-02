# #334 Phase-Zero Isolated Staging Preflight — Owner Runbook
**30 September 2026.** Operator-invoked, no-credential, read-only production-representative staging **preflight**, not the actual #334 acceptance proof and not permission to deploy to production.

## Why this exists
The Stage-0 combined local test uses a compiled Cloudflare Worker, disposable local Supabase and a Chromium browser bridge. It **does not** prove that real deployed Cloudflare stage uses independent D1/Supabase bindings, has stable first-attempt transport, preserves authenticated tenant isolation on the actual remote host or has a usable rollback. In addition, running ordinary production canary on an unverified URL could accidentally target production or re-use the compromised #323 acceptance credential.

This tool prevents several such mistakes **before** any permitted staged authenticated/browser workflow: it refuses the production hostname, refuses an unapproved host, enforces HTTPS and a clean root origin, refuses a reused production Supabase project-ref *declaration*, requires a full different exact candidate SHA, checks healthy first-attempt deployed `/api/health` and public root, then checks that three remote protected pages **redirect an anonymous request to the same-host login**. It sends only anonymous GET requests and does not automatically follow redirects, authenticate, deploy, create data or trigger paid provider runs.

**Attestation limitation:** operator-supplied production/stage project references are not a cryptographic proof of actual remote Worker bindings. Independently verify separate Cloudflare Worker, D1, project URL and secret bindings in the approved infrastructure control plane; retain a redacted signed receipt. The preflight will not detect another team's tenant failures or validate full customer workflow or end-to-end data retention.

## Prerequisites (external owner actions; currently NOT verified)
1. Obtain explicit infrastructure provisioning authorization and any cost approvals. Provision **separate isolated Cloudflare Worker, D1, new Supabase project and stage hostname**, without copying live production customer data or compromised synthetic acceptance secrets.
2. Independently inspect all deployed bindings and the isolated project's RLS/role defaults. Do not rely on the human-supplied project-ref strings passed into this script.
3. Deploy the **exact intended staged commit** only to the approved isolated stage, with `FOREMENTION_BUILD_COMMIT` pinned to that full candidate SHA. No deploy to auto-deploying production `main`.
4. Verify the exact current production Git SHA separately and preserve the owner's signed stage/production/environment receipt. Do not copy customer IDs, keys, passwords or private host configuration into public PR comments.
5. Run the local and CI exact-head integration gates separately. This script deliberately assumes nothing from green local synthetic results.

## Invocation — private trusted operator shell
Set these *non-secret* identifiers from independently checked control-plane records (do not put passwords in these variables):
```sh
export FOREMENTION_STAGE_BASE_URL='https://stage.foremention.com/'
export FOREMENTION_STAGE_APPROVED_HOST='stage.foremention.com'
export FOREMENTION_STAGE_EXPECTED_SHA='<40-char-stage-candidate-commit>'
export FOREMENTION_VERIFIED_PRODUCTION_SHA='<40-char-current-production-commit>'
export FOREMENTION_STAGE_PROJECT_REF='<20-char-verified-stage-Supabase-ref>'
export FOREMENTION_PRODUCTION_PROJECT_REF='<20-char-verified-production-Supabase-ref>'
node scripts/isolated-staging-preflight.mjs
```
`stage.foremention.com` is an **example**, not a claim that this DNS name exists. A separate exact approved `*.workers.dev` host is also supported. All required values are deliberate fail-closed inputs. The CLI prints only fixed low-sensitivity status/SHA/route codes, not input secrets, raw responses or redirects.

## Interpreting the result
- `ok:true` means the **read-only preflight only** passed on the provided stage host and SHA. It cannot be used as the #334 full-loop closure receipt. Archive the exact script revision, candidate SHA, independently verified environment binding and date.
- Wrong/missing SHA, production URL, same-declared project ref, missing root HTML, invalid login target or failed anonymous denial **fail** before any authenticated workflow.
- A 503 that later becomes healthy **still fails** with `degraded_first_attempt` and preserves safe health receipts. Do not silently relabel a flaky transport as a first-attempt pass.
- Running this script against production, unapproved third-party hosts or any unaudited staging environment is prohibited; no network requests are made unless local config validation succeeds.

## Further #334 release blockers this DOES NOT cover
- An actual deployed **signed-in, normal browser form-click** reviewer → manager approval → customer-owned execution → second comparable measurement journey against the isolated stage.
- Five actual-versioned questions, relevant citation and zero-citation/failed-source branches, reviewer reject, cross-tenant and cross-role access, idempotent retries and provider failure paths.
- Binding-level proof that stage **cannot** read production Supabase/D1, no provider external charges, no actual compromised acceptance identity re-use, no raw customer data.
- Exact source/legal rights #346 and relevance #345, synthetic credential revocation #323, migration/backups #332/#354, write-side comparator #351/#352, manually exercised rollback and owner release signoff.

**Sequence:** provision isolated stage with owner authorization → binding proof → deploy independently tested candidate to stage → run THIS no-secret preflight → obtain independently authorized synthetic credentials in that isolated stage → execute full remote role/browser/RLS acceptance + fault injection + rollback and archive sanitized exact-head receipts → only then independently decide whether production launch gates permit a main merge. Prior local 17/17 proof remains valuable, but neither it nor this preflight supplies live customer proof.
