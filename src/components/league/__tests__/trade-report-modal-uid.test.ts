/** TradeReportModal — verify getPicks calls route through uid when
 *  the owner is resolvable via getOwners, and gracefully fall back
 *  (still 404-safe) when the owner is unknown (departed manager).
 *
 *  Same rationale as tap-to-build-uid.test.tsx — lock the URL shape
 *  the fix produces without dragging the full modal render into the
 *  test process.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("TradeReportModal picks-fetch uid resolution — URL contract", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => "",
    });
    // @ts-expect-error test global
    globalThis.fetch = fetchMock;
    (globalThis as any).window = (globalThis as any).window || {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Simulate the lookup the modal builds via getOwners. In prod this
  // is a Record<string, string> from ownersData.owners after quote-
  // normalization; here we hardcode the result of that build for the
  // owner-with-a-slash case.
  const OWNER_NAME = "Keepin Up W/ The Joneses";
  const OWNER_UID = "729455221704642560";
  const uidLookup: Record<string, string> = {
    [OWNER_NAME.toLowerCase()]: OWNER_UID,
  };
  const uidFor = (name: string | undefined) => {
    if (!name) return null;
    return uidLookup[name.toLowerCase()] ?? null;
  };

  it("resolvable owner → picks URL routes through uid", async () => {
    const api = await import("../../../lib/api");
    const uid = uidFor(OWNER_NAME);
    expect(uid).toBe(OWNER_UID);
    await api.getPicks("L1", OWNER_NAME, uid);
    const urlArg = fetchMock.mock.calls[0][0] as string;
    expect(urlArg).toContain(`/api/league/L1/picks/${OWNER_UID}`);
    expect(urlArg).not.toContain("%2F");
  });

  it("departed owner not in current owners list → uid null, URL falls back to encoded name (endpoint 404s, handled upstream)", async () => {
    // fetchPicksOrNull in the modal swallows 404 for departed owners
    // — we're only asserting the URL shape here, since the fallback
    // itself is unchanged behavior.
    const api = await import("../../../lib/api");
    const uid = uidFor("Some Departed Manager");
    expect(uid).toBeNull();
    await api.getPicks("L1", "Some Departed Manager", uid);
    const urlArg = fetchMock.mock.calls[0][0] as string;
    expect(urlArg).toContain("/api/league/L1/picks/");
    // No `/` in the name so no %2F — safe path even without uid.
    expect(urlArg).not.toContain("%2F");
  });
});
