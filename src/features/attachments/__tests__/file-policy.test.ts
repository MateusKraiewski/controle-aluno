import { describe, expect, it } from "vitest";
import { detectKind, safeFileName } from "../file-policy";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("attachment file policy", () => {
  it("recognises allowed types by content", () => {
    expect(detectKind(text("%PDF-1.7 ..."))?.contentType).toBe("application/pdf");
    expect(detectKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))?.contentType).toBe("image/png");
    expect(detectKind(bytes(0xff, 0xd8, 0xff, 0xe0))?.contentType).toBe("image/jpeg");
    expect(detectKind(text("RIFF\u0000\u0000\u0000\u0000WEBPVP8 "))?.contentType).toBe("image/webp");
    expect(detectKind(text("Resumo da aula\nlinha 2 ✓"))?.contentType).toBe("text/plain");
  });

  it("rejects executables, HTML with binary bytes and empty files", () => {
    expect(detectKind(text("MZ\u0090\u0000\u0003"))).toBeNull();
    expect(detectKind(bytes(0x00, 0x01, 0x02))).toBeNull();
    expect(detectKind(new Uint8Array())).toBeNull();
    expect(detectKind(bytes(0x50, 0x4b, 0x03, 0x04, 0x00))).toBeNull();
  });

  it("produces safe display names with the detected extension", () => {
    expect(safeFileName("../../etc/passwd", "txt")).toBe("passwd.txt");
    expect(safeFileName("C:\\Users\\x\\lista.exe", "pdf")).toBe("lista.pdf");
    expect(safeFileName("nota<script>.pdf", "pdf")).toBe("notascript.pdf");
    expect(safeFileName("", "png")).toBe("anexo.png");
  });
});
