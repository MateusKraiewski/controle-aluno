export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_LESSON = 10;

type Kind = { contentType: string; extension: string; matches: (bytes: Uint8Array) => boolean };
const startsWith = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);

/** Accepted types, recognised by their content (magic bytes), never by the name or the browser's claim. */
const kinds: Kind[] = [
  { contentType: "application/pdf", extension: "pdf", matches: (bytes) => startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { contentType: "image/png", extension: "png", matches: (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { contentType: "image/jpeg", extension: "jpg", matches: (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]) },
  { contentType: "image/webp", extension: "webp", matches: (bytes) => startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]) },
  { contentType: "text/plain", extension: "txt", matches: isPlainText },
];

function isPlainText(bytes: Uint8Array) {
  if (bytes.length === 0) return false;
  try { new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { return false; }
  // Control characters other than tab/newline/carriage return mean a binary file.
  return !bytes.some((value) => value < 0x09 || (value > 0x0d && value < 0x20 && value !== 0x1b));
}

export function detectKind(bytes: Uint8Array) {
  return kinds.find((kind) => kind.matches(bytes)) ?? null;
}

/** Display name only: no path parts, control characters or reserved characters; keeps the detected extension. */
export function safeFileName(original: string, extension: string) {
  const base = original.split(/[\\/]/).pop() ?? "";
  const cleaned = base.normalize("NFC").replace(/[\u0000-\u001f\u007f"<>:|?*]/g, "").replace(/\.[^.]*$/, "").trim().slice(0, 100);
  return `${cleaned || "anexo"}.${extension}`;
}
