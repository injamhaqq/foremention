#!/usr/bin/env bash
set -euo pipefail

: "${ROLLBACK_SHA:?ROLLBACK_SHA is required}"

if [[ "${ROLLBACK_SHA}" =~ ^0+$ ]]; then
  echo "No previous main SHA exists for this push; rollback rehearsal is not applicable."
  exit 0
fi

git cat-file -e "${ROLLBACK_SHA}^{commit}"

workdir="${RUNNER_TEMP:-/tmp}/foremention-rollback-${ROLLBACK_SHA:0:12}"
drydir="${RUNNER_TEMP:-/tmp}/foremention-rollback-dry-${ROLLBACK_SHA:0:12}"
rm -rf "${workdir}" "${drydir}"

cleanup() {
  git worktree remove --force "${workdir}" >/dev/null 2>&1 || true
  rm -rf "${drydir}"
}
trap cleanup EXIT

git worktree add --detach "${workdir}" "${ROLLBACK_SHA}"
(
  cd "${workdir}"
  pnpm install --frozen-lockfile --prefer-offline
  pnpm build
  pnpm exec wrangler deploy --dry-run --config dist/server/wrangler.json --outdir "${drydir}"
)

echo "Rollback candidate ${ROLLBACK_SHA} produced a deployable Worker dry-run artifact."
