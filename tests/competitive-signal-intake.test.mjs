import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { HOSTS, validatePublicSignal, parsePublicSignals } from "../scripts/competitive-signal-intake.mjs";

const valid = Object.freeze({
  competitor: "Peec AI",
  url: "https://peec.ai/blog/introducing-ai-referrals",
  title: "Public release of AI referral analytics",
  summary: "The company describes new GA4-connected AI referral reporting.",
  published_on: "2026-09-11",
  observed_on: "2026-09-30",
  source_kind: "OFFICIAL_COMPANY_ANNOUNCEMENT",
});

test("official public signal is review-pending, not verified customer evidence", () => {
  const signal=validatePublicSignal(valid,"2026-09-30");
  assert.equal(signal.competitor,"Peec AI");
  assert.equal(signal.evidence_class,"PUBLIC_COMPANY_CLAIM");
  assert.equal(signal.review_status,"NEEDS_HUMAN_SOURCE_VERIFICATION");
  assert.match(signal.qualification,/never customer evidence/);
  assert.equal(signal.id,validatePublicSignal(valid,"2026-09-30").id);
});

test("source URLs are strict HTTPS origins with no spoofed hosts, auth, query or fragments", () => {
  for (const url of [
    "http://peec.ai/blog/introducing-ai-referrals",
    "https://peec.ai.evil.example/post",
    "https://peec.ai@evil.example/post",
    "https://evil@peec.ai/post",
    "https://peec.ai:444/post",
    "https://peec.ai/post?auth=secret",
    "https://peec.ai/post#fragment",
    "https://peec.ai/",
  ]) {
    assert.throws(() => validatePublicSignal({...valid,url},"2026-09-30"),undefined,url);
  }
});

test("rejects cross-vendor citation laundering, unknown fields and unsupported research types", () => {
  assert.throws(()=>validatePublicSignal({...valid,competitor:"Profound"},"2026-09-30"));
  assert.throws(()=>validatePublicSignal({...valid,token:"abc123"},"2026-09-30"));
  assert.throws(()=>validatePublicSignal({...valid,source_kind:"INDEPENDENT_BUYER_EVIDENCE"},"2026-09-30"));
  assert.throws(()=>validatePublicSignal({...valid,source_kind:"VENDOR_PUBLISHED_RESEARCH"},"2026-09-30"));
});

test("dated facts are real, ordered and may not be future-dated", () => {
  for (const input of [
    {...valid,published_on:"2026-09-31"},
    {...valid,published_on:"2026-10-01"},
    {...valid,observed_on:"2026-10-01"},
    {...valid,published_on:"2026-09-30",observed_on:"2026-09-11"},
  ]) assert.throws(()=>validatePublicSignal(input,"2026-09-30"));
});

test("rejects input email, likely secret, control bytes and oversized copied page data", () => {
  for (const s of [
    "Source contact jane@example.com was contacted",
    "auth token: tokenABC12345",
    "An unsafe\nmultiline observation",
    "x".repeat(231),
  ]) assert.throws(()=>validatePublicSignal({...valid,summary:s},"2026-09-30"));
});

test("bounded NDJSON fails wholly on duplicates, unknown fields, malformed rows and huge input", () => {
  const row=JSON.stringify(valid);
  assert.equal(parsePublicSignals(row+"\n","2026-09-30").length,1);
  assert.throws(()=>parsePublicSignals(row+"\n"+row,"2026-09-30"),/Duplicate/);
  assert.throws(()=>parsePublicSignals("{not json}","2026-09-30"),/Invalid JSON/);
  assert.throws(()=>parsePublicSignals(row+"\n"+JSON.stringify({...valid,password:"sensitive"}),"2026-09-30"));
  assert.throws(()=>parsePublicSignals("x".repeat(500001),"2026-09-30"),/500 KB/);
});

test("dated internal radar preserves source-first claims and isolates response hypotheses", async () => {
  const raw=await readFile(new URL("../docs/company-evidence/COMPETITIVE-PUBLIC-SIGNALS-2026-09-30.json",import.meta.url),"utf8");
  const radar=JSON.parse(raw);
  assert.equal(radar.schema_version,"foremention.public-competitive-signals.v1");
  assert.equal(radar.collector_status.includes("NOT executed"),true);
  assert.ok(radar.records.length>=8);
  const ids=new Set();
  for (const row of radar.records) {
    assert.ok(!ids.has(row.id),"duplicate evidence id");ids.add(row.id);
    assert.ok(["PUBLIC_COMPANY_CLAIM","VENDOR_PUBLISHED_STUDY"].includes(row.evidence_class));
    assert.equal(row.review_status,"PUBLIC_SOURCE_REVIEWED");
    assert.ok(typeof row.foremention_response_hypothesis==="string" && row.foremention_response_hypothesis.length>25);
    const url=new URL(row.source_url);
    assert.equal(url.protocol,"https:");
    assert.ok(HOSTS[row.competitor]?.includes(url.hostname),row.competitor+" source must be exact vendor domain");
    assert.ok(row.published_on<=radar.as_of);
    assert.ok(row.observed_on===radar.as_of);
  }
});


test("public intake CLI consumes explicit local export only and never leaks rejected data",async()=>{
  const temp=await mkdtemp(join(tmpdir(),"foremention-research-"));
  const input=join(temp,"research.ndjson");
  try {
    await writeFile(input,JSON.stringify(valid)+"\\n","utf8");
    const script=fileURLToPath(new URL("../scripts/competitive-signal-intake.mjs",import.meta.url));
    const args=[script,"--input",input,"--as-of","2026-09-30"];
    const ok=spawnSync(process.execPath,args,{encoding:"utf8",timeout:10000,maxBuffer:500000});
    assert.equal(ok.status,0,ok.stderr);
    assert.equal(ok.stderr,"");
    const result=JSON.parse(ok.stdout);
    assert.equal(result.records.length,1);
    assert.equal(result.records[0].review_status,"NEEDS_HUMAN_SOURCE_VERIFICATION");
    assert.match(result.source_tool_claim,/does not attest that Agent Reach ran/);
    const invalid=spawnSync(process.execPath,
      [script,"--input",input,"--as-of","2026-02-30"],
      {encoding:"utf8",timeout:10000,maxBuffer:500000});
    assert.notEqual(invalid.status,0);
    assert.doesNotMatch(invalid.stderr,/peec\\.ai|Public release of AI referral analytics|token/);
  } finally {await rm(temp,{recursive:true,force:true});}
});
