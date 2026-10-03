# Braces downstream remediation — 2026-10-03

## Scope

Foremention reaches `braces@3.0.3` through both:

- `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces`
- `vinext -> vite-plugin-commonjs -> vite-plugin-dynamic-import -> fast-glob -> micromatch -> braces`

GitHub Advisory `GHSA-vfj7-8cjw-p6xm` / `CVE-2026-93687` affects published `braces <= 3.0.3`. At the time of this remediation there is no official patched npm release.

## Replacement

The repository vendors two narrowly scoped downstream packages:

- `@foremention/braces` under `vendor/braces`, sourced from the current upstream security-fix PR.
- `@foremention/micromatch` under `vendor/micromatch`, sourced from `micromatch@4.0.8` with one dependency/import substitution from `braces` to `@foremention/braces`.

Transitive `micromatch` resolution is overridden to `file:vendor/micromatch`. This removes the npm package identity `braces` from the dependency graph instead of asking OSV to interpret an unknown local `braces` version.

Source provenance:

- upstream repository: `micromatch/braces`
- base published version: `3.0.3`
- upstream security PR: `#72`
- exact upstream security commit: `d0d575e55e74a4e0218e5248fafb79efc3e54ebb`
- downstream braces package: `@foremention/braces@3.0.4-foremention.1`
- downstream micromatch package: `@foremention/micromatch@4.0.8-foremention.1`
- upstream license: MIT; the original `LICENSE` is preserved

No scanner waiver, OSV ignore, severity reduction, or release-gate bypass is part of this change.

## Acceptance contract

1. `pnpm-lock.yaml` must contain no package named `braces` from npm or a local `braces@file:` alias.
2. Transitive `micromatch` consumers must resolve to `file:vendor/micromatch`, whose only brace dependency is `@foremention/braces`.
3. Representative compile/expand behavior must remain unchanged.
4. 100 nested levels must be accepted and 101 rejected.
5. Caller-supplied deep ASTs must be bounded in compile/stringify/expand.
6. Dependency audit, OSV, Trivy, CodeQL, full tests, typecheck, build and browser acceptance stay enabled.
7. Replace this downstream package with an official upstream release once a patched release is independently verified through the same gates.

## Generated lockfile proof

The final scoped dependency graph was generated and frozen-install verified by temporary workflow run `37120114906` before that generator removed itself. The subsequent repository-authored checkpoint commit exists only to trigger Foremention's normal release workflows on the exact final candidate; it does not change runtime dependency resolution.

## Compatibility correction

The initial vendored candidate used the full current upstream PR branch, whose base also contains unrelated post-3.0.3 behavior changes. Focused Foremention regression tests detected one such change in stringify/escapeInvalid semantics. The downstream package is therefore derived from the published 3.0.3 runtime sources and applies only the bounded nesting-depth security changes, while retaining PR #72 and commit d0d575e55e74a4e0218e5248fafb79efc3e54ebb as the upstream security-design reference. This keeps the security bound while preserving published 3.0.3 behavior outside that bound.

## Final focused validation

Temporary generator run `37120646481` regenerated the lockfile after root dev-only test bindings were added, verified there is no unscoped `braces` identity, completed a frozen install, and passed all five focused scoped-fork security/compatibility tests. The generator then removed itself. This checkpoint commit exists to trigger the repository's normal Security, CI, CodeQL, quality and Browser Acceptance workflows against the exact post-generation candidate.
