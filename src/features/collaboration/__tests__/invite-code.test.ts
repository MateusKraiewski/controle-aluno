import { describe, expect, it } from "vitest";
import { generateInviteCode, hashInviteCode, normalizeInviteCode } from "../invite-code";

describe("invite codes", () => {
  it("are grouped, unambiguous and unique", () => {
    const codes = new Set(Array.from({ length: 200 }, generateInviteCode));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/);
  });

  it("normalize typing variations and reject anything else", () => {
    const code = generateInviteCode();
    const compact = code.replaceAll("-", "");
    expect(normalizeInviteCode(` ${code.toLowerCase()} `)).toBe(compact);
    expect(normalizeInviteCode(compact.replace(/.{4}/g, "$& ").trim())).toBe(compact);
    expect(normalizeInviteCode("ABCD-EFGH-JKLM-NPQ0")).toBeNull();
    expect(normalizeInviteCode("ABCD")).toBeNull();
    expect(normalizeInviteCode("' OR 1=1 --")).toBeNull();
  });

  it("hash deterministically without exposing the code", () => {
    const compact = normalizeInviteCode(generateInviteCode())!;
    expect(hashInviteCode(compact)).toBe(hashInviteCode(compact));
    expect(hashInviteCode(compact)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashInviteCode(compact)).not.toContain(compact);
  });
});
