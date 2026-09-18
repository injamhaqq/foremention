import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20260918000400_support_agent.sql", import.meta.url),
  "utf8",
);
const api = await readFile(
  new URL("../app/api/support/tickets/route.ts", import.meta.url),
  "utf8",
);
const executor = await readFile(
  new URL("../lib/agent-os/executor.ts", import.meta.url),
  "utf8",
);

test("support tickets are requester-scoped while diagnostics stay service-only", () => {
  assert.match(migration, /requester_id = auth\.uid\(\)/i);
  assert.match(migration, /public\.is_org_member\(organization_id\)/i);
  assert.match(migration, /revoke all on table public\.support_ticket_diagnostics from anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete on table public\.support_ticket_diagnostics to service_role/i);
});

test("support reasoning uses a real ticket context instead of a fabricated collection run", () => {
  assert.match(migration, /alter column run_id drop not null/i);
  assert.match(migration, /support_ticket_id uuid references public\.support_tickets/i);
  assert.match(migration, /agent_reasoning_runs_context_check/i);
  assert.match(migration, /reserve_agent_support_reasoning_run/i);
  assert.match(migration, /active_support_ticket_required/i);
  assert.match(migration, /p_agent_id <> 'support'/i);
});

test("controlled execution adds only the approved medium-risk Support reply family", () => {
  assert.match(migration, /support_reply_email/i);
  assert.match(migration, /agent_id = 'support'/i);
  assert.match(migration, /action_type = 'support_reply_draft'/i);
  assert.match(migration, /effect_class = 'external_communication'/i);
  assert.match(migration, /risk_level = 'medium'/i);
});

test("support intake is authenticated, same-origin protected, and bounded", () => {
  assert.match(api, /getViewer\(\)/);
  assert.match(api, /isTrustedMutationOrigin\(request\)/);
  assert.match(api, /const subject = clean\(body\.subject, 180\)/);
  assert.match(api, /const message = clean\(body\.message, 4000\)/);
  assert.match(api, /value\.replace\(\/\\r\\n\/g, "\\n"\)\.trim\(\)\.slice\(0, max\)/);
  assert.match(api, /requester_id: resolved\.viewer!\.id/);
});

test("transactional support replies do not depend on product alert opt-in", () => {
  const supportBranch = executor.slice(
    executor.indexOf("if (supportPayload)"),
    executor.indexOf("let providerMessageId"),
  );
  assert.match(supportBranch, /support_ticket_changed/);
  assert.match(supportBranch, /recipient_not_member/);
  assert.match(supportBranch, /if \(customerSuccessPayload\)/);
  assert.match(supportBranch, /email_opt_in_required/);
  assert.doesNotMatch(
    executor.slice(executor.indexOf("} else {", executor.indexOf("let text: string")), executor.indexOf("let providerMessageId")),
    /List-Unsubscribe/,
  );
});
