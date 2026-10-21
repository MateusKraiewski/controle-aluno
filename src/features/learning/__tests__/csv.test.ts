import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "../csv";

describe("csv export", () => {
  it("quotes separators, quotes and line breaks", () => {
    expect(csvField("simples")).toBe("simples");
    expect(csvField("a, b")).toBe("\"a, b\"");
    expect(csvField("disse \"olá\"")).toBe("\"disse \"\"olá\"\"\"");
    expect(csvField("linha\nnova")).toBe("\"linha\nnova\"");
    expect(csvField(null)).toBe("");
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvField("-2+3")).toBe("'-2+3");
  });

  it("starts with a BOM and ends rows with CRLF", () => {
    expect(toCsv(["a", "b"], [["1", "Física"]])).toBe("﻿a,b\r\n1,Física\r\n");
  });
});
