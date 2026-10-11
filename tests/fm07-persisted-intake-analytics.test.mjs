import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isValidDesignPartnerIntakeId } from "../lib/design-partner-intake-id.ts";
import { capturePersistedDesignPartnerSubmission } from "../lib/design-partner-server-analytics.ts";

const id = "b994c3c7-6190-41b7-9e0b-9826f5cc0534";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("only a well-formed opaque intake receipt can trigger server analytics", async () => {
  for (const bad of ["", "1", "not-a-uuid", "somebody@example.com", "b994c3c7-6190-11b7-0e0b-9826f5cc0534"]) {
    assert.equal(isValidDesignPartnerIntakeId(bad), false, bad);
    let called = false;
    assert.equal(await capturePersistedDesignPartnerSubmission(bad, async () => {
      called = true;
      return new Response(null, { status: 200 });
    }), false);
    assert.equal(called, false);
  }
  assert.equal(isValidDesignPartnerIntakeId(id), true);
});

test("confirmed server event is anonymous, no GeoIP, no customer fields and best-effort idempotent", async () => {
  const sent = [];
  const fakeSend = async (url, options) => {
    sent.push({ url, options });
    return new Response(JSON.stringify({ status: 1 }), { status: 200 });
  };
  assert.equal(await capturePersistedDesignPartnerSubmission(id, fakeSend, "phc_test"), true);
  assert.equal(await capturePersistedDesignPartnerSubmission(id, fakeSend, "phc_test"), true);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].url, "https://us.i.posthog.com/i/v0/e/");
  assert.equal(sent[0].options.method, "POST");
  assert.equal(sent[0].options.cache, "no-store");
  const event = JSON.parse(sent[0].options.body);
  const repeat = JSON.parse(sent[1].options.body);
  assert.equal(event.event, "design_partner_application_submitted");
  assert.equal(event.api_key.startsWith("phc_"), true);
  assert.match(event.uuid, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.equal(event.uuid, repeat.uuid);
  assert.equal(event.distinct_id, repeat.distinct_id);
  assert.match(event.distinct_id, /^persisted-intake:[a-f0-9]{32}$/);
  assert.deepEqual(event.properties, { $process_person_profile: false, $geoip_disable: true });
  const raw = JSON.stringify(event);
  assert.ok(!raw.includes(id), "receipt UUID must not be shipped raw to PostHog");
  for (const secret of ["email", "company", "buyerQuestions", "currentProblem", "url", "authorization"]) {
    assert.ok(!raw.includes(secret), `must not include ${secret}`);
  }
});

test("server conversion transport fails closed without the required project token", async () => {
  let calls = 0;
  assert.equal(await capturePersistedDesignPartnerSubmission(id, async () => {
    calls++;
    return new Response(null, { status: 200 });
  }, ""), false);
  assert.equal(await capturePersistedDesignPartnerSubmission(id, async () => {
    calls++;
    return new Response(null, { status: 200 });
  }, "invalid"), false);
  assert.equal(calls, 0);
});

test("telemetry transport failures cannot erase a first-party receipt", async () => {
  assert.equal(await capturePersistedDesignPartnerSubmission(id, async () => {
    throw new Error("offline");
  }, "phc_test"), false);
  assert.equal(await capturePersistedDesignPartnerSubmission(id, async () =>
    new Response("error", { status: 503 }), "phc_test"), false);
});

test("server emits conversion only after successful new database persistence, not duplicate or honeypot", () => {
  const route = read("app/api/design-partner/route.ts");
  const claim = route.indexOf('if (claim === "duplicate") return responseFor(request, 201, "Application received.");');
  const persisted = route.indexOf('const rows = await supabaseRest("design_partner_applications"');
  const receipt = route.indexOf('if (!intakeId) throw new Error("Application was not returned after persistence.");');
  const capture = route.indexOf("await capturePersistedDesignPartnerSubmission(intakeId);");
  const response = route.indexOf('return responseFor(request, 201, "Application received.", { intakeId });');
  assert.ok(claim >= 0 && claim < persisted);
  assert.ok(persisted < receipt && receipt < capture && capture < response);
  assert.equal((route.match(/capturePersistedDesignPartnerSubmission\(intakeId\)/g) || []).length, 1);
  assert.match(route, /input\.website.*return responseFor\(request, 201/);
  assert.match(route, /if \(claim === "limited"\) return limitedResponse\(request\)/);
  assert.match(route, /serviceRole: true/);
  assert.doesNotMatch(route, /captureProductEvent|posthog-js/);
});

test("the contact success UI cannot trust ?submitted=1 or a forged UUID alone", () => {
  const page = read("app/contact/page.tsx");
  const receipt = read("lib/design-partner-receipt.ts");
  const analytics = read("components/public-activation-analytics.tsx");
  assert.match(page, /await hasPersistedDesignPartnerReceipt\(intakeId\)/);
  assert.match(page, /query\.submitted === "1"[\s\S]*?Boolean\(intakeId\)[\s\S]*?await hasPersistedDesignPartnerReceipt/);
  assert.match(receipt, /design_partner_applications\?select=id&id=eq\./);
  assert.match(receipt, /serviceRole: true/);
  assert.match(receipt, /if \(!isValidDesignPartnerIntakeId\(intakeId\)\) return false/);
  assert.match(receipt, /catch \{[\s\S]*?return false/);
  assert.doesNotMatch(analytics, /captureProductEvent\("design_partner_application_submitted"/);
  assert.doesNotMatch(analytics, /get\("submitted"\)/);
});
