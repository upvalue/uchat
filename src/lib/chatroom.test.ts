import { describe, it, expect } from "vitest";
import { chatroomTitle } from "./chatroom";

describe("chatroomTitle", () => {
  it("returns YYYY-MM-DD for the default daily granularity", () => {
    const date = new Date(2026, 4, 11); // May 11, 2026 local
    expect(chatroomTitle({ date })).toBe("2026-05-11");
  });

  it("appends HHMMSS when detailed is true", () => {
    const date = new Date(2026, 4, 11, 14, 7, 3); // 14:07:03 local
    expect(chatroomTitle({ date, detailed: true })).toBe("2026-05-11 140703");
  });

  it("pads detailed time components with leading zeros", () => {
    const date = new Date(2026, 0, 5, 1, 2, 9);
    expect(chatroomTitle({ date, detailed: true })).toBe("2026-01-05 010209");
  });

  it("respects timezone in detailed mode", () => {
    // 2026-05-11T20:00:00Z is 13:00 in Los Angeles (PDT, UTC-7)
    const date = new Date("2026-05-11T20:00:00Z");
    expect(
      chatroomTitle({ date, timeZone: "America/Los_Angeles", detailed: true }),
    ).toBe("2026-05-11 130000");
  });

  it("matches the channel name validation regex", () => {
    const date = new Date(2026, 4, 11, 14, 7, 3);
    const detailed = chatroomTitle({ date, detailed: true });
    expect(detailed).toMatch(/^[a-zA-Z0-9]+([a-zA-Z0-9 -]*[a-zA-Z0-9]+)?$/);
  });
});
