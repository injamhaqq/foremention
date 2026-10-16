import assert from "node:assert/strict";
import test from "node:test";
import { loadModule, request } from "./attach02-harness.mjs";

const PASSWORD = "Sufficient#Pass123";

class FakeAuthLinkError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
  get alreadyRegistered() {
    return this.status === 422 && this.code === "email_exists";
  }
}

class FakeSupabaseAuthError extends Error {
  constructor(message) {
    super(message);
    this.retryable = false;
  }
}

function signupRoute({ mode = "new", deliveryFails = false, fallback = false } = {}) {
  const deps = {
    "@/lib/application-email": {
      getApplicationEmailStatus: () => ({ available: !fallback }),
      sendWelcomeEmail: async () => undefined,
    },
    "@/lib/input-validation": {
      readJsonObject: async (r) => r.json(),
      cleanText: (v, limit) => typeof v === "string" ? v.trim().slice(0, limit) : "",
    },
    "@/lib/password-safety": {
      checkPasswordSafety: async () => ({ compromised: false }),
      HashRangeUnavailable: class HashRangeUnavailable extends Error {},
      issueSignupSecurityAttestation: async () => "synthetic-attestation",
    },
    "@/lib/auth-email-delivery": {
      AuthLinkError: FakeAuthLinkError,
      authEmailDeliveryAvailable: () => !fallback,
      generateAuthLink: async () => {
        if (mode === "existing") throw new FakeAuthLinkError(422, "email_exists", "already registered");
        return { actionLink: "https://auth.example.test/verify", userId: "synthetic" };
      },
      sendSignupConfirmationEmail: async () => {
        if (deliveryFails) throw new Error("synthetic transport failure");
      },
    },
    "@/lib/supabase-rest": {
      SupabaseAuthError: FakeSupabaseAuthError,
      supabaseAuth: async () => mode === "existing"
        ? { user: { identities: [] } }
        : { user: { identities: [{ id: "synthetic" }] } },
    },
  };
  return loadModule("app/api/auth/signup/route.ts", deps);
}

async function post(route, email = "person@example.test") {
  return route.POST(request("/api/auth/signup", {
    body: { email, full_name: "Synthetic User", password: PASSWORD, confirmation: PASSWORD },
  }));
}

test("Chat05: existing mailbox and new account share an identical neutral response", async () => {
  const created = await post(signupRoute({mode:"new"}));
  const existing = await post(signupRoute({mode:"existing"}));
  assert.equal(created.status, 200);
  assert.equal(existing.status, created.status);
  assert.deepEqual(await existing.json(), await created.json());
  const neutral = await post(signupRoute({mode:"existing"}));
  const body = await neutral.json();
  assert.equal(body.session, false);
  assert.ok(!("email" in body) && !("account_help" in body));
  assert.match(body.message, /If this email can be registered/);
  assert.doesNotMatch(JSON.stringify(body), /already exists|already registered/i);
});

test("Chat05: native Supabase fallback also neutralizes obfuscated existing identities", async () => {
  const existing = await post(signupRoute({mode:"existing", fallback:true}));
  const created = await post(signupRoute({mode:"new", fallback:true}));
  assert.equal(existing.status, 200);
  assert.deepEqual(await existing.json(), await created.json());
});

test("Chat05: failed application email is disclosed as unavailable, never falsely reported as delivered", async () => {
  const failure = await post(signupRoute({deliveryFails:true}));
  assert.equal(failure.status, 503);
  const json = await failure.json();
  assert.match(json.error, /could not be delivered/);
});

test("Chat05: unsafe origin and incomplete signup never reach link generation", async () => {
  const route = signupRoute();
  const hostile = await route.POST(request("/api/auth/signup", {
    origin: "https://untrusted.example.test",
    body: {email:"someone@example.test",full_name:"Synthetic",password:PASSWORD,confirmation:PASSWORD},
  }));
  assert.equal(hostile.status,403);
  const invalid = await route.POST(request("/api/auth/signup", {
    body: {email:"someone@example.test",full_name:"Synthetic",password:PASSWORD,confirmation:"different"},
  }));
  assert.equal(invalid.status,400);
});