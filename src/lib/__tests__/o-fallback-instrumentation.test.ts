/** Instrumentation for O() — verifies:
 *   - behavior unchanged (fallback still fires and returns the encoded
 *     display name in the URL)
 *   - console.warn fires when userId is falsy
 *   - /api/error-log POST fires with metadata.kind = "owner_id_fallback"
 *     when userId is falsy
 *   - dedupe: repeat calls with same (page, owner) do NOT flood
 *   - safe path (userId truthy) fires NEITHER log
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("O() fallback instrumentation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Reset modules so the module-scoped _fallbackLoggedThisSession Set
    // starts empty for each test.
    vi.resetModules();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({}), text: async () => "",
    });
    // @ts-expect-error test global
    globalThis.fetch = fetchMock;
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.location = { pathname: "/l/dynasty/team" };
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("safe path: userId truthy → no warn, no error-log", async () => {
    const api = await import("../api");
    await api.getRoster("L1", "Some Owner", "729455221704642560");
    // fetch called ONCE — for the getRoster itself. No error-log.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    // Confirm the single fetch was the roster URL, not error-log
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/roster/");
    expect(url).not.toContain("/error-log");
  });

  it("fallback path: null userId → console.warn AND error-log fire", async () => {
    const api = await import("../api");
    await api.getRoster("L1", "Some Owner");
    // Wait a microtask for the fire-and-forget POST to enqueue.
    await new Promise((r) => setTimeout(r, 0));
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const warnMsg = consoleWarnSpy.mock.calls[0][0] as string;
    expect(warnMsg).toContain("[owner-id-fallback]");
    expect(warnMsg).toContain("Some Owner");
    // Both the getRoster call AND the error-log POST should have fired
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const urls = fetchMock.mock.calls.map((c) => c[0] as string);
    expect(urls.some((u) => u.includes("/error-log"))).toBe(true);
    // Payload includes kind marker
    const errorLogCall = fetchMock.mock.calls.find((c) => (c[0] as string).includes("/error-log"))!;
    const body = JSON.parse((errorLogCall[1] as any).body);
    expect(body.metadata.kind).toBe("owner_id_fallback");
    expect(body.endpoint).toBe("[owner-id-fallback]");
    expect(body.status_code).toBe(0);
  });

  it("dedupe: repeat calls with same (page, owner) → warn/error-log ONCE only", async () => {
    const api = await import("../api");
    // Three back-to-back fallback calls with the SAME owner
    await api.getRoster("L1", "Repeated Owner");
    await api.getPicks("L1", "Repeated Owner");
    await api.getOwnerRecord("L1", "Repeated Owner");
    await new Promise((r) => setTimeout(r, 0));
    // Only ONE warn regardless of API-fn count
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    // 3 outer fetches + 1 error-log = 4 total
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const errorLogHits = fetchMock.mock.calls.filter((c) => (c[0] as string).includes("/error-log"));
    expect(errorLogHits.length).toBe(1);
  });

  it("dedupe scope: different owner on same page → separate log", async () => {
    const api = await import("../api");
    await api.getRoster("L1", "Owner A");
    await api.getRoster("L1", "Owner B");
    await new Promise((r) => setTimeout(r, 0));
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    const errorLogHits = fetchMock.mock.calls.filter((c) => (c[0] as string).includes("/error-log"));
    expect(errorLogHits.length).toBe(2);
  });

  it("behavior unchanged: URL still contains encoded display name on fallback", async () => {
    const api = await import("../api");
    await api.getRoster("L1", "Keepin Up W/ The Joneses");
    const rosterCall = fetchMock.mock.calls.find((c) => (c[0] as string).includes("/roster/"))!;
    const url = rosterCall[0] as string;
    // The %2F is exactly the 404 vector — instrumentation does NOT
    // fix it, just measures it.
    expect(url).toContain("%2F");
  });
});
