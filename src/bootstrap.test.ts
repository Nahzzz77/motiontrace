import { afterEach, describe, expect, it, vi } from "vitest";

const { createStorage } = vi.hoisted(() => ({
  createStorage: vi.fn(async (_accountId: string) => ({ flush: async () => undefined })),
}));
vi.mock("./data/account-storage", () => ({
  AccountStorage: { create: createStorage },
  setCurrentAccountStorage: vi.fn(),
}));
vi.mock("./main", () => ({}));

afterEach(() => {
  vi.unstubAllGlobals();
  createStorage.mockClear();
});

async function openPublicApp(
  values: Map<string, string>,
  parent?: { postMessage: ReturnType<typeof vi.fn> },
  addEventListener = vi.fn(),
): Promise<string> {
  vi.resetModules();
  vi.stubGlobal("navigator", { userAgent: "test" });
  vi.stubGlobal("window", {
    location: { search: "", pathname: "/" },
    parent,
    matchMedia: () => ({ matches: false }),
    addEventListener,
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
  });
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ authenticated: false, publicAccess: true }) })));
  const before = createStorage.mock.calls.length;
  await import("./bootstrap");
  await vi.waitFor(() => expect(createStorage).toHaveBeenCalledTimes(before + 1));
  return createStorage.mock.calls[before]![0] as string;
}

describe("public guest storage identity", () => {
  it("keeps a returning browser's identity and isolates another browser", async () => {
    const firstBrowser = new Map<string, string>();
    const firstId = await openPublicApp(firstBrowser);
    expect(firstId).toMatch(/^guest-[0-9a-f-]{36}$/);
    expect(await openPublicApp(firstBrowser)).toBe(firstId);
    expect(await openPublicApp(new Map())).not.toBe(firstId);
    expect(firstBrowser.get("motiontrace:public-guest-id:v1")).toBe(firstId);
  });

  it("signals the embedding origin after the app module loads, without sending account data", async () => {
    const parent = { postMessage: vi.fn() };
    vi.stubGlobal("document", { referrer: "https://proposal.example/portfolio" });
    await openPublicApp(new Map(), parent);

    await vi.waitFor(() => expect(parent.postMessage).toHaveBeenCalledWith(
      { type: "motiontrace:ready" }, "https://proposal.example",
    ));
    expect(parent.postMessage).toHaveBeenCalledTimes(1);
  });

  it("skips parent messaging when parent or referrer is unavailable", async () => {
    vi.stubGlobal("document", { referrer: "https://proposal.example/portfolio" });
    await openPublicApp(new Map());
    const { notifyEmbeddingParent } = await import("./bootstrap");
    expect(() => notifyEmbeddingParent("motiontrace:ready")).not.toThrow();

    const parent = { postMessage: vi.fn() };
    vi.stubGlobal("window", { parent });
    vi.stubGlobal("document", { referrer: "" });
    notifyEmbeddingParent("motiontrace:error");
    expect(parent.postMessage).not.toHaveBeenCalled();
  });

  it("requests parent fullscreen exit on Escape without consuming the key", async () => {
    const parent = { postMessage: vi.fn() };
    const addEventListener = vi.fn();
    vi.stubGlobal("document", { referrer: "https://proposal.example/portfolio" });
    await openPublicApp(new Map(), parent, addEventListener);
    const keydown = addEventListener.mock.calls.find(([type]) => type === "keydown")?.[1] as
      | ((event: KeyboardEvent) => void)
      | undefined;
    expect(keydown).toBeTypeOf("function");
    const event = { key: "Escape", preventDefault: vi.fn() } as unknown as KeyboardEvent;
    keydown!(event);

    expect(parent.postMessage).toHaveBeenCalledWith(
      { type: "motiontrace:exit-fullscreen" }, "https://proposal.example",
    );
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
