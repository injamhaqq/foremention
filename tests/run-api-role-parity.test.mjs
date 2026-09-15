import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");

const explicitRunRoleGuard = /!\["owner",\s*"admin",\s*"analyst"\]\.includes\(role\)/;

test("run start and cancel APIs allow only owner, admin, and analyst roles", async () => {
  const [createRoute, cancelRoute] = await Promise.all([
    text("app/api/runs/route.ts"),
    text("app/api/runs/[id]/route.ts"),
  ]);

  for (const route of [createRoute, cancelRoute]) {
    assert.doesNotMatch(route, /role\s*===\s*["']viewer["']/);
    assert.match(route, explicitRunRoleGuard);
  }
});
