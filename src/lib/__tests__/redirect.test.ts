import { describe, it, expect } from "vitest";
import { safeReturnTo } from "../redirect";

describe("safeReturnTo", () => {
  describe("valid internal paths", () => {
    it("accepts a plain league path", () => {
      expect(safeReturnTo("/l/dynasty")).toBe("/l/dynasty");
    });

    it("accepts a league path with a query string", () => {
      expect(safeReturnTo("/l/dynasty?league_id=1312047513884184576")).toBe(
        "/l/dynasty?league_id=1312047513884184576",
      );
    });

    it("accepts a nested league path", () => {
      expect(safeReturnTo("/l/big-jer-dynasty-ffl/team")).toBe(
        "/l/big-jer-dynasty-ffl/team",
      );
    });

    it("accepts a URL-encoded owner name in the path", () => {
      expect(safeReturnTo("/l/dynasty/intel/Beast%20Of%20Burden")).toBe(
        "/l/dynasty/intel/Beast%20Of%20Burden",
      );
    });

    it("accepts a bare root path", () => {
      expect(safeReturnTo("/")).toBe("/");
    });
  });

  describe("rejects unsafe values", () => {
    it("rejects undefined", () => {
      expect(safeReturnTo(undefined)).toBeNull();
    });

    it("rejects null", () => {
      expect(safeReturnTo(null)).toBeNull();
    });

    it("rejects empty string", () => {
      expect(safeReturnTo("")).toBeNull();
    });

    it("rejects an absolute http URL", () => {
      expect(safeReturnTo("http://evil.example/pwn")).toBeNull();
    });

    it("rejects an absolute https URL", () => {
      expect(safeReturnTo("https://evil.example/pwn")).toBeNull();
    });

    it("rejects a protocol-relative URL — the classic open-redirect vector", () => {
      // `//evil.example/pwn` resolves against the current scheme; browsers
      // treat `evil.example` as the origin. Reject to prevent phishing
      // via `/sign-in?return_to=//evil.example`.
      expect(safeReturnTo("//evil.example/pwn")).toBeNull();
    });

    it("rejects a backslash-prefixed value (some browsers normalize to //)", () => {
      expect(safeReturnTo("/\\evil.example")).toBeNull();
    });

    it("rejects a path that starts without a slash", () => {
      expect(safeReturnTo("dashboard")).toBeNull();
    });

    it("rejects a scheme without slashes", () => {
      expect(safeReturnTo("javascript:alert(1)")).toBeNull();
    });
  });
});
