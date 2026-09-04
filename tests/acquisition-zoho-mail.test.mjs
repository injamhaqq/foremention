import assert from "node:assert/strict";
import test from "node:test";
import {
  getZohoMailConfig,
  refreshZohoMailAccessToken,
  sendZohoMailMessage,
} from "../lib/acquisition-zoho-mail.ts";

const envSnapshot = { ...process.env };
const resetEnv = () => {
  for (const key of Object.keys(process.env)) if (!(key in envSnapshot)) delete process.env[key];
  Object.assign(process.env, envSnapshot);
};

test.afterEach(resetEnv);

test("Zoho Mail config fails closed unless OAuth, account, sender and regional endpoints are configured", () => {
  for (const key of [
    "ZOHO_MAIL_CLIENT_ID",
    "ZOHO_MAIL_CLIENT_SECRET",
    "ZOHO_MAIL_REFRESH_TOKEN",
    "ZOHO_MAIL_ACCOUNT_ID",
    "ZOHO_MAIL_ACCOUNTS_BASE_URL",
    "ZOHO_MAIL_API_BASE_URL",
    "ACQUISITION_OUTREACH_FROM_EMAIL",
  ]) delete process.env[key];
  assert.equal(getZohoMailConfig(), null);

  Object.assign(process.env, {
    ZOHO_MAIL_CLIENT_ID: "1000.client",
    ZOHO_MAIL_CLIENT_SECRET: "server-secret",
    ZOHO_MAIL_REFRESH_TOKEN: "1000.refresh",
    ZOHO_MAIL_ACCOUNT_ID: "1234567890123456789",
    ZOHO_MAIL_ACCOUNTS_BASE_URL: "https://accounts.zoho.com",
    ZOHO_MAIL_API_BASE_URL: "https://mail.zoho.com",
    ACQUISITION_OUTREACH_FROM_EMAIL: "Injam <outreach@foremention.com>",
  });
  const config = getZohoMailConfig();
  assert.ok(config);
  assert.equal(config.accountId, "1234567890123456789");
  assert.equal(config.accountsBaseUrl, "https://accounts.zoho.com");
  assert.equal(config.mailBaseUrl, "https://mail.zoho.com");
  assert.equal(config.fromAddress, "outreach@foremention.com");
});

test("Zoho OAuth refresh sends credentials only to the configured accounts server and returns the access token", async () => {
  const calls = [];
  const accessToken = await refreshZohoMailAccessToken({
    clientId: "1000.client",
    clientSecret: "server-secret",
    refreshToken: "1000.refresh",
    accountsBaseUrl: "https://accounts.zoho.eu",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ access_token: "1000.access", expires_in: 3600, token_type: "Bearer" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });
  assert.equal(accessToken, "1000.access");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://accounts.zoho.eu/oauth/v2/token");
  assert.equal(calls[0].init.method, "POST");
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(body.get("grant_type"), "refresh_token");
  assert.equal(body.get("client_id"), "1000.client");
  assert.equal(body.get("client_secret"), "server-secret");
  assert.equal(body.get("refresh_token"), "1000.refresh");
});

test("Zoho send uses Mail API OAuth auth and returns provider message identifiers", async () => {
  const calls = [];
  const result = await sendZohoMailMessage({
    accessToken: "1000.access",
    mailBaseUrl: "https://mail.zoho.in",
    accountId: "1234567890123456789",
    fromAddress: "outreach@foremention.com",
    toAddress: "buyer@example.com",
    subject: "A source-backed recommendation review",
    content: "Hello.\n\nUnsubscribe: https://foremention.com/api/acquisition/unsubscribe?token=signed",
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({
        status: { code: 200, description: "success" },
        data: { messageId: "1726208416259127700", mailId: "<provider-id@example.com>" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  assert.deepEqual(result, {
    messageId: "1726208416259127700",
    mailId: "<provider-id@example.com>",
  });
  assert.equal(calls[0].url, "https://mail.zoho.in/api/accounts/1234567890123456789/messages");
  assert.equal(calls[0].init.headers.Authorization, "Zoho-oauthtoken 1000.access");
  const payload = JSON.parse(calls[0].init.body);
  assert.equal(payload.fromAddress, "outreach@foremention.com");
  assert.equal(payload.toAddress, "buyer@example.com");
  assert.match(payload.content, /Unsubscribe:/);
});
