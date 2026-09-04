import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isCompanyOperatorEmail } from "../lib/company-operator.ts";

const root = new URL("../", import.meta.url);
const text = (path) => readFile(new URL(path, root), "utf8");
const snapshot = process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS;

test.afterEach(() => {
  if (snapshot === undefined) delete process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS;
  else process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS = snapshot;
});

test("company operator access fails closed unless the authenticated email is explicitly allowlisted", () => {
  delete process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS;
  assert.equal(isCompanyOperatorEmail("founder@example.com"), false);
  process.env.FOREMENTION_COMPANY_OPERATOR_EMAILS = "Founder@Example.com, ops@example.com";
  assert.equal(isCompanyOperatorEmail("founder@example.com"), true);
  assert.equal(isCompanyOperatorEmail("other@example.com"), false);
});

test("operator route separates approval from send and same-origin guards mutations", async () => {
  const source = await text("app/api/company/acquisition/route.ts");
  assert.match(source, /getViewer/);
  assert.match(source, /isCompanyOperatorEmail/);
  assert.match(source, /isTrustedMutationOrigin/);
  assert.match(source, /action === "approve_draft"/);
  assert.match(source, /action === "send_draft"/);

  const approveBranch = source.match(/if \(action === "approve_draft"\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
  const sendBranch = source.match(/if \(action === "send_draft"\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? "";
  assert.match(approveBranch, /approveAcquisitionOutreachDraft/);
  assert.doesNotMatch(approveBranch, /sendApprovedAcquisitionOutreach/);
  assert.match(sendBranch, /sendApprovedAcquisitionOutreach/);
  assert.doesNotMatch(sendBranch, /approveAcquisitionOutreachDraft/);
});
