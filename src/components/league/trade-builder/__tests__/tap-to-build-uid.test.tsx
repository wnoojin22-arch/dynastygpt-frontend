/** TapToBuild — verify partner_user_id from SuggestedPackage is
 *  threaded through getRoster/getPicks so partner names containing `/`
 *  (encoded %2F breaks path routing at edge) resolve via uid path.
 *
 *  We don't render the component here — the component tree pulls in
 *  Zustand, framer-motion, and a dozen other client hooks that
 *  aren't worth spinning up for a URL-shape check. Instead we lock
 *  the api.ts URL builder behavior directly against the exact
 *  argument shape the fix passes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("TapToBuild partner uid threading — URL contract", () => {
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
    // Clerk session absent in tests — authHeaders returns Content-Type only
    (globalThis as any).window = (globalThis as any).window || {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getRoster with partner_user_id passed → URL uses uid, not display name", async () => {
    const api = await import("../../../../lib/api");
    const partnerName = "Keepin Up W/ The Joneses";
    const partnerUid = "729455221704642560";
    await api.getRoster("L1", partnerName, partnerUid);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const urlArg = fetchMock.mock.calls[0][0] as string;
    // uid appears verbatim in the path
    expect(urlArg).toContain(`/api/league/L1/roster/${partnerUid}`);
    // display name (or its %2F-encoded form) does NOT appear
    expect(urlArg).not.toContain("Keepin");
    expect(urlArg).not.toContain("%2F");
    expect(urlArg).not.toContain("Joneses");
  });

  it("getPicks with partner_user_id passed → URL uses uid", async () => {
    const api = await import("../../../../lib/api");
    const partnerName = "Keepin Up W/ The Joneses";
    const partnerUid = "729455221704642560";
    await api.getPicks("L1", partnerName, partnerUid);
    const urlArg = fetchMock.mock.calls[0][0] as string;
    expect(urlArg).toContain(`/api/league/L1/picks/${partnerUid}`);
    expect(urlArg).not.toContain("%2F");
  });

  it("regression: bare getRoster (2-arg, no uid) still falls back to encoded display name — this is what the fix ELIMINATES at the call site", async () => {
    // Locking the failure shape so we know what we're protecting
    // against. TapToBuild used to hit this path; the fix threads
    // pkg.partner_user_id through so it doesn't anymore.
    const api = await import("../../../../lib/api");
    await api.getRoster("L1", "Keepin Up W/ The Joneses");
    const urlArg = fetchMock.mock.calls[0][0] as string;
    // Fallback path emits %2F for the `/` in the name — this is the
    // route-breaking segment.
    expect(urlArg).toContain("%2F");
    expect(urlArg).not.toContain("729455221704642560");
  });
});
