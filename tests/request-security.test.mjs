import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const security = await import("../lib/request-security.ts");

test("customer mutations require a same-origin browser request", () => {
  const originalSite = process.env.NEXT_PUBLIC_SITE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NEXT_PUBLIC_SITE_URL = "https://foremention.com";
  process.env.NODE_ENV = "production";
  try {
    assert.equal(security.isTrustedMutationOrigin(new Request("https://foremention.com/api/runs", { headers: { origin: "https://foremention.com" } })), true);
    assert.equal(security.isTrustedMutationOrigin(new Request("https://foremention.com/api/runs", { headers: { origin: "https://attacker.example" } })), false);
    assert.equal(security.isTrustedMutationOrigin(new Request("https://foremention.com/api/runs")), false);
    assert.equal(security.isTrustedMutationOrigin(new Request("https://foremention-mvp.workers.dev/api/runs", {
      method: "POST",
      headers: {
        origin: "https://foremention.com",
        host: "foremention.com",
        "x-forwarded-proto": "https",
      },
    })), true);
    assert.equal(security.isTrustedMutationOrigin(new Request("https://foremention-mvp.workers.dev/api/runs", {
      method: "POST",
      headers: {
        referer: "https://foremention.com/app/onboarding",
        "sec-fetch-site": "same-origin",
        host: "foremention.com",
        "x-forwarded-proto": "https",
      },
    })), true);
    assert.equal(security.isTrustedMutationOrigin(new Request("https://foremention-mvp.workers.dev/api/runs", {
      method: "POST",
      headers: {
        referer: "https://attacker.example/form",
        "sec-fetch-site": "cross-site",
        host: "foremention.com",
        "x-forwarded-proto": "https",
      },
    })), false);
  } finally {
    if (originalSite === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = originalSite;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
  }
});
test("every authenticated workspace mutation uses the origin guard", async () => {
  const root = new URL("../", import.meta.url);
  const routes = [
    "app/api/onboarding/route.ts",
    "app/api/prompts/route.ts",
    "app/api/runs/route.ts",
    "app/api/runs/[id]/route.ts",
    "app/api/runs/[id]/review/route.ts",
    "app/api/evidence/route.ts",
    "app/api/placements/route.ts",
    "app/api/sources/[id]/review/route.ts",
    "app/api/sources/[id]/inspect/route.ts",
    "app/api/team/invitations/route.ts",
    "app/api/team/invitations/[id]/route.ts",
    "app/api/team/invitations/accept/route.ts",
    "app/api/team/members/[id]/route.ts",
    "app/api/notifications/route.ts",
    "app/api/account/deletion/route.ts",
  ];
  for (const route of routes) {
    const source = await readFile(new URL(route, root), "utf8");
    const mutationCount = [...source.matchAll(/export async function (?:POST|PATCH|DELETE)\(/g)].length;
    const guardCount = [...source.matchAll(/if \(!isTrustedMutationOrigin\(request\)\)/g)].length;
    assert.equal(guardCount, mutationCount, `${route} must guard every mutation`);
  }
});
