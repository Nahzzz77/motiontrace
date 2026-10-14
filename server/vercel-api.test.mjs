import { describe, expect, it } from "vitest";
import handler from "../api/index.js";

describe("Vercel API adapter", () => {
  it("routes rewritten requests and forwards secure session cookies", async () => {
    const activation = await handler.fetch(new Request("https://example.test/api/index?route=auth/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "FORM-DEMO-2026" }),
    }));
    expect(activation.status).toBe(200);
    expect(activation.headers.get("Set-Cookie")).toContain("; Secure");
    const cookie = activation.headers.get("Set-Cookie").split(";")[0];
    const session = await handler.fetch(new Request("https://example.test/api/auth/session", { headers: { cookie } }));
    expect(await session.json()).toMatchObject({ authenticated: true });
    expect(session.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects oversized UTF-8 bodies before passing them to the API", async () => {
    const response = await handler.fetch(new Request("https://example.test/api/index?route=auth/activate", {
      method: "POST",
      body: "动".repeat(34_000),
    }));
    expect(response.status).toBe(413);
  });
});
