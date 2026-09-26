# 2026-09-26 — image-size lockfile advisory remediation

Scope: **patch candidate, pending exact-head CI and Cloudflare production release**.

- Scheduled Security workflow on 2026-09-24 failed OSV on image-size@2.0.2 (GHSA-5p2g-fcmc-qvqq and GHSA-w3rx-r6r6-pgpr). Production dependency audit in prior release passed; do not infer publicly reachable exploit.
- Dependency graph in the 2026-09-20 main lockfile resolves `vinext@0.0.50 -> image-size@2.0.2`, under the build toolchain.
- OSV (both advisories, modified 2026-09-24) identifies `2.0.3` as first fixed. Official npm registry metadata for `image-size@2.0.4` was independently inspected: version `2.0.4`, Node `>=18`, MIT license, integrity `sha512-QRUkFFsRV/6fuESxb9Vkq+a0LkSrgKXuc2NEqfikiXxxN/G3tjWt5EVUlMaImRBZRZK/jRBEbYvpPYZL8t08Zw==`.
- Override precisely this one transitive package to `2.0.4` in `pnpm-workspace.yaml`; update the pnpm v9 lockfile, registry-published tarball integrity, and vinext dependency snapshot. No unrelated dependency movement.
- Remove the obsolete time-expired OSV exception file's suppression entries. A regression test requires patch consistency and forbids suppressing the two named advisories.

## Exact-head gates (NOT YET CLAIMED PASSED)

1. Pin pnpm 10.25.0 and Node >=22.13, run `pnpm install --frozen-lockfile`, then `pnpm why image-size`.
2. Run all repo tests, lint, typecheck, production build and Worker dry-run.
3. Verify the action's OSV and Trivy results, `pnpm audit --prod`, GitHub browser acceptance/first-evidence canary, CodeQL, SBOM and exact-SHA Cloudflare deployment.
4. Confirm the new production build SHA at `/api/health`; no release sign-off until the prior checks pass.
5. Recheck the affected package through future upstream vinext upgrades and remove this override once upstream has independently resolved the advisories.

The lockfile adjustment uses the integrity read from the official registry; it must still pass frozen-install and the exact CI gates.
