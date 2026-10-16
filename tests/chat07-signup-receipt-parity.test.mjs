import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const auth=readFileSync(new URL("../components/auth-form.tsx",import.meta.url),"utf8");
const signup=readFileSync(new URL("../app/api/auth/signup/route.ts",import.meta.url),"utf8");

test("neutral signup receipt never presents a delivered-email assertion",()=>{
 const head=auth.indexOf("if (data.session === false) {");
 const tail=auth.indexOf("\n      if (!isLogin)",head);
 assert.ok(head>=0 && tail>head);
 const branch=auth.slice(head,tail);
 assert.match(branch,/mode === "signup"/);
 assert.match(branch,/setNoticeEmail\(""\)/);
 assert.match(branch,/setAccountHelp\(false\)/);
 assert.doesNotMatch(branch,/signup_completed|captureProductEvent/);
 assert.match(auth,/Request received\./);
 assert.doesNotMatch(auth,/Sent to <strong>|Open the newest email|Confirm your email\./);
 assert.match(auth,/href="\/forgot-password"/);
});

test("new and pre-existing email are only acknowledged as requests, never activation",()=>{
 assert.match(signup,/signupRequestReceipt\(\)/);
 assert.match(signup,/If this email can be registered/);
 assert.doesNotMatch(signup,/An account already exists with this email/);
 assert.match(auth,/role="status" aria-live="polite"/);
});