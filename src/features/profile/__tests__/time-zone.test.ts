import { describe, expect, it } from "vitest";
import { civilToday, isValidTimeZone } from "../time-zone";

describe("profile time zone", () => {
  it("accepts IANA zones only", () => {
    expect(isValidTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("gives the civil date in the zone, falling back to UTC", () => {
    const instant = new Date("2026-10-21T01:30:00Z");
    expect(civilToday("America/Sao_Paulo", instant)).toBe("2026-10-20");
    expect(civilToday("Europe/Lisbon", instant)).toBe("2026-10-21");
    expect(civilToday(null, instant)).toBe("2026-10-21");
    expect(civilToday("bogus", instant)).toBe("2026-10-21");
  });
});
