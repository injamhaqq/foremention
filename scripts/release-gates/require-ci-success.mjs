#!/usr/bin/env node
// FM-06: production deploys are refused unless the CI workflow concluded
// `success` on the exact commit being released, and that commit is still the
// tip of main. Used by .github/workflows/production-deploy.yml, which is
// manual-only (workflow_dispatch from main), in its gate job and again right
// before `wrangler deploy`.
//
// The decision is a pure function so it can be unit-tested without network.
// The CLI only reads the GitHub REST API with the job's read-only token.

import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const CI_WORKFLOW_PATH = ".github/workflows/ci.yml";
const SHA_PATTERN = /^[0-9a-f]{40}$/;

function runOrder(run) {
  // Highest run_number wins; within one run, the latest attempt wins.
  return [Number(run.run_number) || 0, Number(run.run_attempt) || 0];
}

/**
 * @param {{ sha: string, mainSha: string, runs: Array<Record<string, any>>, repository?: string }} input
 * @returns {{ ok: boolean, reason: string, runId?: number }}
 */
export function evaluateCiGate({ sha, mainSha, runs, repository }) {
  if (typeof sha !== "string" || !SHA_PATTERN.test(sha)) {
    return { ok: false, reason: `Release SHA is not a full 40-character lowercase commit SHA: ${JSON.stringify(sha)}` };
  }
  if (typeof mainSha !== "string" || !SHA_PATTERN.test(mainSha)) {
    return { ok: false, reason: "Could not resolve the current tip of main." };
  }
  if (sha !== mainSha) {
    return { ok: false, reason: `Refusing to deploy ${sha}: main has moved to ${mainSha}. The newer commit deploys after its own CI succeeds.` };
  }
  const candidates = (Array.isArray(runs) ? runs : []).filter((run) =>
    run
    && run.head_sha === sha
    && run.event === "push"
    && run.head_branch === "main"
    && (run.path === undefined || run.path === CI_WORKFLOW_PATH)
    && (!repository || !run.head_repository || run.head_repository.full_name === repository));
  if (!candidates.length) {
    return { ok: false, reason: `Refusing to deploy ${sha}: no CI run for a push to main exists on this exact commit.` };
  }
  const latest = [...candidates].sort((a, b) => {
    const [an, aa] = runOrder(a);
    const [bn, ba] = runOrder(b);
    return bn - an || ba - aa;
  })[0];
  if (latest.status !== "completed") {
    return { ok: false, reason: `Refusing to deploy ${sha}: CI run ${latest.id} is still ${latest.status}.`, runId: latest.id };
  }
  if (latest.conclusion !== "success") {
    return { ok: false, reason: `Refusing to deploy ${sha}: CI run ${latest.id} concluded ${latest.conclusion}.`, runId: latest.id };
  }
  return { ok: true, reason: `CI run ${latest.id} concluded success on ${sha}, which is the tip of main.`, runId: latest.id };
}

async function github(path, token, accept = "application/vnd.github+json") {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept,
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "foremention-production-deploy-gate",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub API ${path} returned HTTP ${response.status}`);
  return accept === "application/vnd.github.sha" ? (await response.text()).trim() : response.json();
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  const sha = (process.env.RELEASE_SHA || "").trim();
  if (!token || !repository) throw new Error("GITHUB_TOKEN and GITHUB_REPOSITORY are required.");
  if (!SHA_PATTERN.test(sha)) throw new Error(`RELEASE_SHA is not a full commit SHA: ${JSON.stringify(sha)}`);

  const [mainSha, runsPayload] = await Promise.all([
    github(`/repos/${repository}/commits/main`, token, "application/vnd.github.sha"),
    github(`/repos/${repository}/actions/workflows/ci.yml/runs?head_sha=${sha}&event=push&branch=main&per_page=50`, token),
  ]);
  const result = evaluateCiGate({ sha, mainSha, runs: runsPayload.workflow_runs, repository });
  if (!result.ok) {
    console.error(`::error title=Production deploy refused::${result.reason}`);
    process.exit(1);
  }
  console.log(result.reason);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `sha=${sha}\nci_run_id=${result.runId}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(`::error title=Production deploy gate failed::${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
