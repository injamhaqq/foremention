# Braces downstream remediation — 2026-10-03

## Scope

Foremention reaches `braces@3.0.3` through both:

- `eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces`
- `vinext -> vite-plugin-commonjs -> vite-plugin-dynamic-import -> fast-glob -> micromatch -> braces`

GitHub Advisory `GHSA-vfj7-8cjw-p6xm` / `CVE-2026-93687` affects published `braces <= 3.0.3`. At the time of this remediation there is no official patched npm release.

## Replacement

The repository vendors the runtime package under `vendor/braces` and overrides transitive `braces` resolution to that local package.

Source provenance:

- upstream repository: `micromatch/braces`
- base published version: `3.0.3`
- upstream security PR: `#72`
- exact upstream security commit: `d0d575e55e74a4e0218e5248fafb79efc3e54ebb`
- downstream package version: `3.0.4-foremention.1`
- upstream license: MIT; the original `LICENSE` is preserved

No scanner waiver, OSV ignore, severity reduction, or release-gate bypass is part of this change.

## Acceptance contract

1. `pnpm-lock.yaml` must no longer resolve the registry package `braces@3.0.3`.
2. Transitive `braces` consumers must resolve to `file:vendor/braces`.
3. Representative compile/expand behavior must remain unchanged.
4. 100 nested levels must be accepted and 101 rejected.
5. Caller-supplied deep ASTs must be bounded in compile/stringify/expand.
6. Dependency audit, OSV, Trivy, CodeQL, full tests, typecheck, build and browser acceptance stay enabled.
7. Replace this downstream package with an official upstream release once a patched release is independently verified through the same gates.
