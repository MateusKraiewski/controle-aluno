/** Accepts only zones the runtime knows, so stored values always work with Intl. */
export function isValidTimeZone(value: string) {
  if (!value || value.length > 80) return false;
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}
