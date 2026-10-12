# Experiment — semgrep (register disposition: EXPERIMENT)

**Result: POSITIVE, bounded — adopted as a non-required CI job.** 2026-10-12.

## Acceptance (from the repository register)

> A real boundary fixture is caught with acceptable false-positive rate; rules and engine licensing separate.

## What was added

- `policy/semgrep/foremention-boundaries.yml` — three custom Foremention rules (authored here, under this repository's license; no Semgrep Registry rules copied or referenced).
- `policy/semgrep/fixtures/` — deliberately non-compliant and compliant fixtures (excluded from `tsconfig.json` and ESLint; never imported).
- `policy/semgrep/check.py` — asserts every rule catches its bad fixtures, flags none of the compliant fixtures, and finds **zero** issues in `app/ lib/ worker/ components/`.
- `.github/workflows/semgrep-policy.yml` — **non-required** workflow (not in the branch ruleset), runs on PRs touching app/lib/worker/components/policy. Installs pinned `semgrep==1.180.0` via pip, `--metrics=off`, no login, no Semgrep App.

## Rules

| Rule | Invariant | Scope |
|---|---|---|
| `foremention-auth-mutation-requires-trusted-origin` | `POST/PUT/PATCH/DELETE` handlers must start with `if (!isTrustedMutationOrigin(request)) return …` (a late check after side effects is also flagged) | `app/api/auth/**/route.ts`, `app/api/account/**/route.ts` |
| `foremention-no-fetch-of-request-supplied-url` | Taint: `await req.json()` / `await req.formData()` / `url.searchParams.get()` must not reach `fetch()`'s URL argument unless passed through `validatePublicSourceUrl`/`inspectSourceUrl` (or only used inside `encodeURIComponent`) | `app/ lib/ worker/` (excluding `lib/source-inspection.ts`, the safe fetcher itself) |
| `foremention-no-service-role-in-client-component` | A `"use client"` file must not reference `process.env.SUPABASE_SERVICE_ROLE_KEY` or import `@/lib/supabase-rest` | `app/**/*.tsx`, `components/**/*.tsx` |

## Evidence (local, semgrep 1.180.0)

- Fixtures: 6 findings, exactly in the 4 bad fixture files (missing origin check, late origin check, two SSRF sinks, service-role key + server import in a client component); 0 findings in the 3 compliant fixtures.
- Real-code mutation test: deleting the origin check line from `app/api/auth/logout/route.ts` is flagged at line 8; restored.
- `main` (452 files): **0 findings → 0 false positives.** One parse note (`app/app/settings/page.tsx` JSX text `& privacy`) — semgrep skips that file's body; not a finding.
- Runtime ≈5 s locally.

## Licensing

Semgrep OSS engine is LGPL-2.1; it runs only as an external CI tool and is never bundled, linked or shipped in the Worker, so no copyleft obligation attaches to Foremention code. The rules are original Foremention work. Semgrep Registry/Pro rules (Semgrep Rules License) are **not** used.

## Limits / next steps

- Taint sources are syntactic (untyped TS); helpers that read the body indirectly are not modelled. This is a boundary tripwire, not a replacement for CodeQL.
- Make the job required only after it has run green on several PRs without noise (owner decision; ruleset change).
