import { createHash, randomBytes } from "node:crypto";

export const INVITE_TTL_DAYS = 7;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I to avoid misreading

/** 16 characters from a 32-symbol alphabet (80 bits), shown once as XXXX-XXXX-XXXX-XXXX. */
export function generateInviteCode() {
  const bytes = randomBytes(16);
  const chars = [...bytes].map((byte) => alphabet[byte % alphabet.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

/** Accepts the code with or without dashes, spaces or lowercase. */
export function normalizeInviteCode(input: string) {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  if (compact.length !== 16 || [...compact].some((char) => !alphabet.includes(char))) return null;
  return compact;
}

/** Only this hash is stored; the code itself never reaches the database or logs. */
export function hashInviteCode(normalized: string) {
  return createHash("sha256").update(`aula-em-dia:invite:${normalized}`).digest("hex");
}
