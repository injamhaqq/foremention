# Funding draft runtime — 2026-10-02

The Company OS catalogue previously named funding agents and skills without a
callable preparation handler. This increment adds an offline, deterministic
eligibility and application review pack. It can be evaluated and reviewed without
changing the production Agent OS, invoking a model, or contacting a program.

## Run the synthetic example

Use the repository's supported Node version (at least 22.13.0) and its pinned
pnpm version, 10.25.0. From the repository root:

```sh
node --experimental-strip-types scripts/prepare-funding-draft.mjs tests/fixtures/company-os-funding-draft.json > funding-draft-review.json
```

The fixture uses an example company, example.org URLs, example UUIDs, and a fictional
grant. It establishes test behavior, not Foremention's eligibility for real funding.
The command writes only its JSON artifact to stdout; shell redirection above
creates the local file. Inputs are bounded to 2 MiB and diagnostics omit payloads.
Treat real input and output as confidential company information.

## Inputs and behavior

The input has `schemaVersion: 1`, organization/project UUIDs, `profileRevision`,
an explicit timezone-bearing `asOf`, and arrays of evidence, facts, and opportunities.
The fixture is the complete executable format example. Evidence references include
an asserted authority, observation timestamp, and freshness limit. Facts include
their value, asserted verification status, and evidence ID. Each opportunity has
an official-source reference, a known timezone-bearing deadline or null, simple
criteria, and questions with character limits and required flags.

Only `eq`, `in`, `gte`, and `lte` conditions are supported. There is no inference of
unrecorded conditions, no free-text eligibility reasoning, and no narrative answer
generation. Complex exceptions must remain manual review work. A verified failed
criterion establishes `ineligible`; missing, unverified, stale, or wrongly typed
facts stay `unknown`. Empty criteria cannot establish eligibility. Missing deadlines
or required answers, expired programs, and oversized answers block readiness.
Answers copy current verified scalar facts with evidence references; oversized
answers are left unresolved rather than silently shortened.

The output includes the fact and evidence rows, criteria and expected values,
answers, blockers, scope, profile revision, input and review digests, and explicit
`submissionAuthorized: false`. The CLI also hashes the two repository instruction
packages and binds the complete envelope to `artifactDigest`. Neither digest is
an approval, signature, authorization token, or proof that the declared facts are true.
The handler's `reviewDigest` binds its scoped input and derived draft; the CLI's
additional `artifactDigest` also includes instruction-file hashes.

## Skill and identity boundary

`lib/company-os/runtime-bindings.ts` records two versioned repository packages:
`funding-eligibility` and `funding-application-pack`. Their instructions are stored
under `company-skills/`. This makes seven catalogue skill assignments reviewable
across five funding agents. Both packages use the same bounded draft handler.
They are application repository packages, not installed ChatGPT skills or plugins.

The lookup exposes a narrow existing support-agent identity reference, funding
draft references, and `catalogue_only` for the remaining catalogue identities.
Every lookup result has `productionExecutable: false`. A reference is not a dispatch
capability or execution grant. The native Agent OS still has its existing identities,
database constraints, governor, executors, approval rules, and receipts.

## Integration limitations and next work

This code validates JSON shape, types, dates, references, bounds, and simple outcomes.
It does not authenticate caller scope, verify that an asserted official URL is
official, validate a company's evidence against source records, or enforce a live
clock. A trusted integration must establish those facts before real use and refresh
them before any consequential action. HTTPS URL checks are reference hygiene, not
a network-fetch SSRF defense. No URL is fetched here.

There is no production import, route, cron, migration, database write, portal
submission, email, payment, or connector. Package ownership checks do not implement
a complete Company OS-to-native runtime bridge. Keep broad operating-system work
unactivated during Stage 0 customer proof.

The next implementation should first resolve the active-project boundary blocker
and review this draft. Then design an authenticated, tenant/project-scoped draft
service and RLS-backed artifact persistence, with trusted profile/evidence adapters,
freshness policy, revision binding, and an explicit native ledger/event mapping.
Submission remains separate work: exact content/destination approval, stable
operation keys, retries and uncertain-outcome reconciliation, provider receipts,
least-privilege secrets, and cost controls are required before enabling it.

## Verification

Targeted tests cover eligibility, evidence freshness, missing facts, wrong types,
expired or unknown deadlines, unsupported answers, strict input bounds, digest
changes, absence of fetch calls, catalogue references, and the actual offline CLI.
Run the repository's standard tests, lint, typecheck, and build before review.
Passing local checks does not replace exact-commit CI or the release gate.
