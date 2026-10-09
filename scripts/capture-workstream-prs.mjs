/**
 * Read-only GitHub PR inventory; fails closed on pagination gaps or ref drift.
 */
import { fileURLToPath } from "node:url";
import path from "node:path";

const REPO = "injamhaqq/foremention";
const ORIGIN = "https://api.github.com";
const PAGE_SIZE = 100;
const FILE_CAP = 3000; // GitHub REST caps PR file listings at 3,000.
const SHA = /^[0-9a-f]{40}$/;

export async function capturePrSnapshot({
  request = globalThis.fetch,
  token = "",
  clock = () => Date.now(),
} = {}) {
  if (typeof request !== "function") throw new Error("GitHub fetch implementation is unavailable");
  const startedAt = clock();
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "foremention-fm11-inventory",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  async function getJson(endpoint) {
    const response = await request(`${ORIGIN}/repos/${REPO}${endpoint}`, {
      method: "GET", headers, signal: AbortSignal.timeout(15000),
    });
    if (!response?.ok) {
      throw new Error(`GitHub inventory read failed (HTTP ${response?.status ?? "unknown"}); refusing incomplete snapshot`);
    }
    try { return await response.json(); }
    catch { throw new Error("GitHub response is not valid JSON; refusing incomplete snapshot"); }
  }

  async function getMain() {
    const branch = await getJson("/branches/main");
    const sha = branch?.commit?.sha;
    if (!SHA.test(sha ?? "")) throw new Error("GitHub returned no valid main SHA");
    return sha;
  }

  async function collectPages(endpoint, maximumPages) {
    const results = [];
    for (let page = 1; page <= maximumPages; page++) {
      const values = await getJson(`${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=${PAGE_SIZE}&page=${page}`);
      if (!Array.isArray(values) || values.length > PAGE_SIZE) throw new Error("Malformed GitHub pagination response");
      results.push(...values);
      if (values.length < PAGE_SIZE) return results;
    }
    throw new Error("GitHub pagination limit reached; refusing incomplete snapshot");
  }

  function summarize(prs) {
    const seen = new Set();
    return prs.map((pr) => {
      if (!Number.isInteger(pr?.number) || pr.number <= 0 ||
          (!pr?.head?.ref || typeof pr.head.ref !== "string") ||
          !SHA.test(pr?.head?.sha ?? "") || !Number.isFinite(Date.parse(pr?.updated_at))) {
        throw new Error("Malformed GitHub open PR metadata");
      }
      if (seen.has(pr.number)) throw new Error("Duplicate GitHub PR in paginated inventory");
      seen.add(pr.number);
      return `${pr.number}:${pr.head.ref}:${pr.head.sha}:${pr.updated_at}`;
    }).sort();
  }

  const mainSha = await getMain();
  const initial = await collectPages("/pulls?state=open", 100);
  const initialIdentity = summarize(initial);
  const prs = [];
  for (const pr of initial) {
    const files = await collectPages(`/pulls/${pr.number}/files`, 30);
    if (files.length >= FILE_CAP) throw new Error(`PR #${pr.number} reaches GitHub's 3,000-file pagination cap`);
    // Rename conflicts include both the previous and destination filenames.
    const names = files.flatMap((entry) => entry?.status === "renamed"
      ? [entry.previous_filename, entry.filename]
      : [entry?.filename]);
    if (names.some((value) => typeof value !== "string" || !value || value.includes("\\") || value.startsWith("/"))) {
      throw new Error(`Malformed changed filename for PR #${pr.number}`);
    }
    if (new Set(names).size !== names.length) throw new Error(`Duplicate changed filename for PR #${pr.number}`);
    prs.push({ number: pr.number, headBranch: pr.head.ref, headSha: pr.head.sha, files: names });
  }
  const final = await collectPages("/pulls?state=open", 100);
  if (JSON.stringify(initialIdentity) !== JSON.stringify(summarize(final))) {
    throw new Error("Open pull requests changed during capture; retry from a fresh baseline");
  }
  if (await getMain() !== mainSha) throw new Error("Main moved during capture; retry from a fresh baseline");
  const completedAt = clock();
  if (completedAt < startedAt || completedAt - startedAt > 900000) {
    throw new Error("Inventory took over 15 minutes; recapture before use");
  }
  return {
    complete: true, mainSha, capturedAt: new Date(completedAt).toISOString(), prs,
    source: "github-rest-paginated-verified",
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  capturePrSnapshot({ token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "" })
    .then((snapshot) => process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\\n`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
