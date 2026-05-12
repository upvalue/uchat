import { describe, it, expect } from "vitest";
import { GROUP_GAP_MS, isSameDay, startsNewBunch } from "./messageGrouping";

const at = (iso: string, user = "alice") => ({ user, timestamp: iso });

describe("startsNewBunch", () => {
  it("starts a bunch when there is no previous message", () => {
    expect(startsNewBunch(undefined, at("2026-05-12T09:00:00Z"))).toBe(true);
  });

  it("starts a bunch when the author changes", () => {
    expect(
      startsNewBunch(at("2026-05-12T09:00:00Z", "alice"), at("2026-05-12T09:01:00Z", "bob")),
    ).toBe(true);
  });

  it("bunches consecutive messages from the same user within the gap", () => {
    expect(
      startsNewBunch(at("2026-05-12T09:00:00Z"), at("2026-05-12T09:05:00Z")),
    ).toBe(false);
  });

  it("starts a new bunch after a gap of at least GROUP_GAP_MS", () => {
    const prev = at("2026-05-12T09:00:00Z");
    const justUnder = new Date(Date.parse(prev.timestamp) + GROUP_GAP_MS - 1).toISOString();
    const exactly = new Date(Date.parse(prev.timestamp) + GROUP_GAP_MS).toISOString();
    expect(startsNewBunch(prev, at(justUnder))).toBe(false);
    expect(startsNewBunch(prev, at(exactly))).toBe(true);
    expect(startsNewBunch(prev, at("2026-05-12T10:00:00Z"))).toBe(true);
  });
});

describe("isSameDay", () => {
  it("is true for two times on the same calendar day", () => {
    expect(isSameDay("2026-05-12T00:30:00", "2026-05-12T23:30:00")).toBe(true);
  });

  it("is false across a day boundary", () => {
    expect(isSameDay("2026-05-12T23:30:00", "2026-05-13T00:30:00")).toBe(false);
  });
});
