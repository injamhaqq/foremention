import assert from "node:assert/strict";
import test from "node:test";
import { capturePrSnapshot } from "../scripts/capture-workstream-prs.mjs";

const sha = "a".repeat(40);
const movedSha = "b".repeat(40);
const updated = "2026-10-09T10:00:00Z";
const fakePr = (number) => ({ number, head: { sha, ref: `fm-11/task-${number}` }, updated_at: updated });
const ok = (payload) => ({ ok: true, status: 200, json: async () => payload });
function mockGitHub({ prs = [fakePr(449)], files = { 449: [{ filename: ".github/workflows/ci.yml" }] },
  movingMain = false, changePr = false, rejectFiles = false } = {}) {
  let mainReads = 0;
  let listReads = 0;
  const calls = [];
  return {
    calls,
    request: async (url, options) => {
      assert.equal(options.method, "GET");
      assert.match(url, /^https:\/\/api\.github\.com\/repos\/injamhaqq\/foremention\//);
      calls.push(url);
      const path = new URL(url).pathname;
      const page = Number(new URL(url).searchParams.get("page") || 1);
      if (path.endsWith("/branches/main")) return ok({ commit: { sha: ++mainReads > 1 && movingMain ? movedSha : sha } });
      if (path.endsWith("/pulls")) {
        if (page === 1) listReads++;
        const actual = changePr && listReads >= 2 ? [...prs, fakePr(999)] : prs;
        return ok(actual.slice((page - 1) * 100, page * 100));
      }
      const m = path.match(/\/pulls\/(\d+)\/files$/);
      if (m) {
        if (rejectFiles) return { ok: false, status: 403 };
        const all = files[Number(m[1])] || [];
        return ok(all.slice((page - 1) * 100, page * 100));
      }
      throw new Error("Unexpected GitHub URL: " + url);
    },
  };
}

const clock = () => Date.parse("2026-10-09T10:00:00Z");

test("captures complete main and PR inventory with verified refresh", async () => {
  const api = mockGitHub();
  const result = await capturePrSnapshot({ request: api.request, clock });
  assert.equal(result.complete, true);
  assert.equal(result.mainSha, sha);
  assert.deepEqual(result.prs, [{ number: 449, headBranch: "fm-11/task-449", headSha: sha, files: [".github/workflows/ci.yml"] }]);
  assert.equal(api.calls.filter((url) => url.endsWith("/branches/main")).length, 2);
});

test("paginates more than 100 PRs and files", async () => {
  const prs = Array.from({ length: 101 }, (_, i) => fakePr(i + 1));
  const files = { 1: Array.from({ length: 101 }, (_, i) => ({ filename: `lib/file-${i}.ts` })) };
  const api = mockGitHub({ prs, files });
  const result = await capturePrSnapshot({ request: api.request, clock });
  assert.equal(result.prs.length, 101);
  assert.equal(result.prs[0].files.length, 101);
  assert.ok(api.calls.some((url) => url.includes("page=2")));
});

test("fails closed when main moves during collection", async () => {
  const api = mockGitHub({ movingMain: true });
  await assert.rejects(capturePrSnapshot({ request: api.request, clock }), /Main moved/);
});

test("fails closed when PRs change during collection", async () => {
  const api = mockGitHub({ changePr: true });
  await assert.rejects(capturePrSnapshot({ request: api.request, clock }), /Open pull requests changed/);
});

test("fails closed when GitHub returns an API error", async () => {
  const api = mockGitHub({ rejectFiles: true });
  await assert.rejects(capturePrSnapshot({ request: api.request, clock }), /HTTP 403/);
});

test("fails closed at GitHub's 3,000 changed-file API ceiling", async () => {
  const files = { 449: Array.from({ length: 3000 }, (_, i) => ({ filename: `src/changed-${i}.ts` })) };
  const api = mockGitHub({ files });
  await assert.rejects(capturePrSnapshot({ request: api.request, clock }), /pagination limit|3,000-file/);
});

test("includes both renamed file paths as overlap candidates", async () => {
  const api = mockGitHub({ files: { 449: [{ filename: "lib/new.ts", previous_filename: "lib/old.ts", status: "renamed" }] } });
  const result = await capturePrSnapshot({ request: api.request, clock });
  assert.deepEqual(result.prs[0].files, ["lib/old.ts", "lib/new.ts"]);
});

test("fails closed when file names repeat", async () => {
  const api = mockGitHub({ files: { 449: [{ filename: "a.ts" }, { filename: "a.ts" }] } });
  await assert.rejects(capturePrSnapshot({ request: api.request, clock }), /Duplicate changed filename/);
});
