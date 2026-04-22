import { describe, expect, test } from "vitest";
import { classifyTradeError } from "../trade-errors";

describe("classifyTradeError", () => {
  test("429 status maps to rate_limit", () => {
    const r = classifyTradeError(new Error("API 429: too many"));
    expect(r.kind).toBe("rate_limit");
    expect(r.message).toMatch(/rate|retry/i);
  });

  test("'rate limit' in message maps to rate_limit even without status code", () => {
    expect(classifyTradeError(new Error("hit the rate limit")).kind).toBe("rate_limit");
  });

  test("504 status maps to timeout", () => {
    expect(classifyTradeError(new Error("API 504: gateway timeout")).kind).toBe("timeout");
  });

  test("'timed out' message maps to timeout", () => {
    expect(classifyTradeError(new Error("upstream timed out")).kind).toBe("timeout");
  });

  test("410 / 'expired' / 'not found' map to expired", () => {
    expect(classifyTradeError(new Error("API 410: sim expired or not found")).kind).toBe("expired");
    expect(classifyTradeError(new Error("the session expired")).kind).toBe("expired");
    expect(classifyTradeError(new Error("record not found")).kind).toBe("expired");
  });

  test("unknown error falls through to generic and preserves message", () => {
    const r = classifyTradeError(new Error("API 500: database is on fire"));
    expect(r.kind).toBe("generic");
    expect(r.message).toContain("database is on fire");
  });

  test("non-Error inputs still classify safely", () => {
    expect(classifyTradeError("rate limit hit").kind).toBe("rate_limit");
    expect(classifyTradeError(null).kind).toBe("generic");
    expect(classifyTradeError(undefined).kind).toBe("generic");
  });
});
