import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = () => readFile(new URL("../app/app/runs/[id]/page.tsx", import.meta.url), "utf8");
const control = () => readFile(new URL("../components/decision-review-download.tsx", import.meta.url), "utf8");

test("Record page has a bounded active-project reviewer-only decision list", async () => {
  const s = await page();
  for (const part of [
    'viewer.mode !== "demo"', 'role === "owner"', 'role === "admin"', 'role === "analyst"',
    "viewer.accessToken", "context.organizationId", "context.projectId", "baseline_run_id=eq.",
    "record_decisions?select=", "limit=20", "<DecisionReviewDownload",
  ]) assert.ok(s.includes(part), part);
  assert.ok(!s.includes("service_role"));
});

test("private download displays errors and never claims success for JSON failures", async () => {
  const s = await control();
  for (const part of [
    '"use client"', "credentials: \"same-origin\"", 'cache: "no-store"',
    "if (!response.ok)", "await response.json().catch(", "No file was saved",
    "role=\"status\"", "aria-live=\"polite\"", "URL.revokeObjectURL(href)",
  ]) assert.ok(s.includes(part), part);
});
