#!/usr/bin/env node

const baseUrl = new URL((process.env.FOREMENTION_BASE_URL || "https://foremention.com").replace(/\/$/, ""));
const email = (process.env.FOREMENTION_ACCEPTANCE_EMAIL || "").trim();
const password = process.env.FOREMENTION_ACCEPTANCE_PASSWORD || "";
const requestRecovery = process.argv.includes("--request-recovery");

class CookieJar {
  #cookies = new Map();

  absorb(response) {
    const values = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [response.headers.get("set-cookie")].filter(Boolean);

    for (const raw of values) {
      const pair = raw.split(";", 1)[0];
      const index = pair.indexOf("=");
      if (index <= 0) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1);
      if (/max-age=0/i.test(raw) || /expires=Thu, 01 Jan 1970/i.test(raw)) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
  }

  header() {
    return [...this.#cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  names() {
    return [...this.#cookies.keys()].sort();
  }
}

function fail(message, details = {}) {
  console.error(JSON.stringify({ ok: false, message, ...details }, null, 2));
  process.exitCode = 1;
}

async function request(path, { method = "GET", body, jar, redirect = "manual" } = {}) {
  const url = new URL(path, baseUrl);
  const headers = {
    accept: "application/json, text/html;q=0.9",
    "user-agent": "ForementionProductionAcceptance/1.0",
  };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET" && method !== "HEAD") {
    headers.origin = baseUrl.origin;
    headers.referer = `${baseUrl.origin}/`;
  }
  const cookie = jar?.header();
  if (cookie) headers.cookie = cookie;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect,
    cache: "no-store",
  });
  jar?.absorb(response);
  return response;
}

async function jsonOrText(response) {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return response.json().catch(() => ({}));
  return response.text().catch(() => "");
}

async function main() {
  const evidence = {
    baseUrl: baseUrl.origin,
    checkedAt: new Date().toISOString(),
    public: {},
    authenticated: null,
    recoveryRequest: null,
  };

  const health = await request("/api/health");
  evidence.public.health = {
    status: health.status,
    body: await jsonOrText(health),
  };
  if (!health.ok) return fail("Production health endpoint failed.", evidence);

  const directReset = await request("/reset-password");
  evidence.public.directReset = {
    status: directReset.status,
    location: directReset.headers.get("location"),
  };
  const resetLocation = directReset.headers.get("location") || "";
  if (![301, 302, 303, 307, 308].includes(directReset.status) || !resetLocation.includes("/forgot-password")) {
    return fail("Direct reset-password access was not rejected as expected.", evidence);
  }

  const unauthenticatedApp = await request("/app");
  evidence.public.unauthenticatedApp = {
    status: unauthenticatedApp.status,
    location: unauthenticatedApp.headers.get("location"),
  };

  if (!email || !password) {
    evidence.authenticated = {
      skipped: true,
      reason: "Set FOREMENTION_ACCEPTANCE_EMAIL and FOREMENTION_ACCEPTANCE_PASSWORD to run authenticated checks.",
    };
    console.log(JSON.stringify({ ok: true, ...evidence }, null, 2));
    return;
  }

  const jar = new CookieJar();
  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
    jar,
  });
  const loginBody = await jsonOrText(login);
  evidence.authenticated = {
    login: {
      status: login.status,
      ok: login.ok,
      session: Boolean(loginBody && typeof loginBody === "object" && loginBody.session),
      cookieNames: jar.names(),
    },
  };
  if (!login.ok) return fail("Disposable acceptance login failed.", evidence);

  const protectedApp = await request("/app", { jar });
  evidence.authenticated.app = {
    status: protectedApp.status,
    location: protectedApp.headers.get("location"),
  };
  if (protectedApp.status !== 200) return fail("Authenticated /app did not load successfully.", evidence);

  if (requestRecovery) {
    const forgot = await request("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
    const forgotBody = await jsonOrText(forgot);
    evidence.recoveryRequest = {
      status: forgot.status,
      ok: forgot.ok,
      message: forgotBody && typeof forgotBody === "object" ? forgotBody.message || null : null,
      error: forgotBody && typeof forgotBody === "object" ? forgotBody.error || null : null,
    };
    if (!forgot.ok) return fail("Password-recovery email request failed.", evidence);
  }

  const logout = await request("/api/auth/logout", {
    method: "POST",
    jar,
  });
  evidence.authenticated.logout = {
    status: logout.status,
    location: logout.headers.get("location"),
    remainingCookieNames: jar.names(),
  };
  if (logout.status !== 303) return fail("Logout did not return the expected 303 redirect.", evidence);

  const appAfterLogout = await request("/app", { jar });
  evidence.authenticated.appAfterLogout = {
    status: appAfterLogout.status,
    location: appAfterLogout.headers.get("location"),
  };
  if (appAfterLogout.status === 200) return fail("Protected app remained accessible after logout.", evidence);

  console.log(JSON.stringify({ ok: true, ...evidence }, null, 2));
}

main().catch((error) => fail("Production auth smoke crashed.", {
  error: error instanceof Error ? error.message : String(error),
}));
