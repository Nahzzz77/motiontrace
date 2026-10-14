import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { afterEach, test } from "node:test";

const keys = ["NODE_ENV", "FORM_PUBLIC_ACCESS", "SESSION_SECRET", "INVITE_HASH_PEPPER", "FORM_INVITE_HASHES", "DEEPSEEK_API_KEY"];
const originalEnv = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
let moduleVersion = 0;

afterEach(() => {
  for (const key of keys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
});

async function apiFor(environment) {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, { NODE_ENV: "production" }, environment);
  return (await import(`./form-api.mjs?public-access-test=${++moduleVersion}`)).handleFormApi;
}

test("public access opens without invite secrets and never forwards paid AI requests", async () => {
  const api = await apiFor({ FORM_PUBLIC_ACCESS: "true", DEEPSEEK_API_KEY: "test-key-must-not-be-used" });
  let upstreamCalls = 0;
  globalThis.fetch = async () => { upstreamCalls += 1; throw new Error("Unexpected upstream request"); };
  const payload = Buffer.from(JSON.stringify({ type: "session", accountId: "forged", exp: Date.now() + 60_000 })).toString("base64url");
  const signature = createHmac("sha256", "local-development-session-secret-change-before-deploy").update(payload).digest("base64url");
  const headers = { cookie: `form_session=${payload}.${signature}`, "x-form-preview": "1" };

  const session = await api({ method: "GET", pathname: "/api/auth/session", headers });
  assert.equal(session.status, 200);
  assert.deepEqual(JSON.parse(session.body), { authenticated: false, publicAccess: true, inviteRequired: false });
  assert.equal(session.headers["Set-Cookie"], undefined);
  const status = await api({ method: "GET", pathname: "/api/ai/status", headers });
  assert.equal(JSON.parse(status.body).configured, false);
  const coach = await api({ method: "POST", pathname: "/api/ai/coach", headers, rawBody: JSON.stringify({ message: "如何深蹲？" }) });
  assert.equal(coach.status, 503);
  assert.equal(JSON.parse(coach.body).publicAccess, true);
  assert.match(JSON.parse(coach.body).error, /本机教练/);
  for (const pathname of ["/api/auth/activate", "/api/auth/recover", "/api/admin/invites", "/api/errors"]) {
    assert.equal((await api({ method: "POST", pathname, headers, rawBody: "{}" })).status, 403);
  }
  assert.equal(upstreamCalls, 0);
});

test("invitation mode still rejects incomplete production security configuration", async () => {
  const api = await apiFor({ FORM_PUBLIC_ACCESS: "false" });
  const response = await api({ method: "GET", pathname: "/api/auth/session" });
  assert.equal(response.status, 503);
});

test("configured production invitation mode requires authentication and rejects preview bypass", async () => {
  const pepper = "test-only-invite-pepper-with-24-characters";
  const code = "test-private-invite";
  const api = await apiFor({
    SESSION_SECRET: "test-only-session-secret-with-at-least-32-characters",
    INVITE_HASH_PEPPER: pepper,
    FORM_INVITE_HASHES: createHash("sha256").update(`${pepper}:${code}`).digest("hex"),
    DEEPSEEK_API_KEY: "test-key-must-not-be-used",
  });
  const denied = await api({ method: "POST", pathname: "/api/ai/coach", headers: { "x-form-preview": "1" }, rawBody: JSON.stringify({ message: "如何深蹲？" }) });
  assert.equal(denied.status, 401);
  const activated = await api({ method: "POST", pathname: "/api/auth/activate", rawBody: JSON.stringify({ code }), secure: true });
  assert.equal(activated.status, 200);
  assert.match(activated.headers["Set-Cookie"], /HttpOnly; SameSite=Lax; Max-Age=\d+; Secure/);
  const session = await api({ method: "GET", pathname: "/api/auth/session", headers: { cookie: activated.headers["Set-Cookie"].split(";")[0] } });
  assert.equal(JSON.parse(session.body).authenticated, true);
  assert.equal(JSON.parse(session.body).publicAccess, undefined);
});
