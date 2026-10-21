/** Accepts only zones the runtime knows, so stored values always work with Intl. */
/** Civil date (YYYY-MM-DD) in the given zone; en-CA formats dates in that order. */
export function civilToday(timeZone: string | null, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC" }).format(now);
}

export function isValidTimeZone(value: string) {
  if (!value || value.length > 80) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}
