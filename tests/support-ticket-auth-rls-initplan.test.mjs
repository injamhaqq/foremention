import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("support requester policies retain both the actor equality and row-scoped tenant membership", async () => {
  const sql = await read("supabase/migrations/20260926090000_support_ticket_auth_rls_initplan.sql");
  assert.match(sql, /alter policy support_tickets_select_requester on public\.support_tickets\s+using\s*\(\s*requester_id = \(select auth\.uid\(\)\)\s+and public\.is_org_member\(organization_id\)/);
  assert.match(sql, /alter policy support_tickets_insert_requester on public\.support_tickets\s+with check\s*\(\s*requester_id = \(select auth\.uid\(\)\)\s+and public\.is_org_member\(organization_id\)/);
  assert.doesNotMatch(sql, /drop policy|create policy|security definer|grant\s|revoke\s/i);
});

test("original support ticket policy roles and predicates stay unchanged except stable auth initplan", async () => {
  const original = await read("supabase/migrations/20260918000400_support_agent.sql");
  assert.match(original, /create policy "support_tickets_select_requester"[\s\S]*requester_id = auth\.uid\(\)[\s\S]*public\.is_org_member\(organization_id\)/);
  assert.match(original, /create policy "support_tickets_insert_requester"[\s\S]*requester_id = auth\.uid\(\)[\s\S]*public\.is_org_member\(organization_id\)/);
});
