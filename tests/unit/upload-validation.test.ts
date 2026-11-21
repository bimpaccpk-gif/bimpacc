import { describe, expect, it } from "vitest";
import {
  MAX_RESOURCE_BYTES,
  hasValidSignature,
  sanitizeFileName,
  validateResourceUpload,
} from "@/lib/upload-validation";

const f = (name: string, type = "application/pdf", size = 1000) => ({ name, type, size });

describe("validateResourceUpload", () => {
  it("accepts an allowed type and normalizes the stored content type", () => {
    const r = validateResourceUpload(f("Notes.PDF", "application/octet-stream"));
    expect(r).toMatchObject({ ok: true, extension: "pdf", contentType: "application/pdf" });
  });

  it.each(["evil.html", "x.svg", "run.exe", "a.js", "noextension", "shell.php", "x.pdf.html"])(
    "rejects %s",
    (name) => {
      expect(validateResourceUpload(f(name, "")).ok).toBe(false);
    }
  );

  it("rejects a declared type that contradicts the extension", () => {
    expect(validateResourceUpload(f("a.pdf", "text/html")).ok).toBe(false);
  });

  it("rejects empty and oversized files", () => {
    expect(validateResourceUpload(f("a.pdf", "application/pdf", 0)).ok).toBe(false);
    expect(validateResourceUpload(f("a.pdf", "application/pdf", MAX_RESOURCE_BYTES + 1)).ok).toBe(
      false
    );
    expect(validateResourceUpload(f("a.pdf", "application/pdf", MAX_RESOURCE_BYTES)).ok).toBe(true);
  });
});

describe("sanitizeFileName", () => {
  it("removes paths and traversal", () => {
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeFileName(String.raw`C:\Users\me\report.pdf`)).toBe("report.pdf");
  });

  it("replaces unsafe characters and never returns an empty stem", () => {
    expect(sanitizeFileName("my notes (final) #1.pdf")).toBe("my_notes_final_1.pdf");
    expect(sanitizeFileName("###.pdf")).toBe("file.pdf");
  });

  it("bounds the length and collapses dot runs", () => {
    expect(sanitizeFileName(`${"a".repeat(500)}.pdf`).length).toBeLessThanOrEqual(124);
    expect(sanitizeFileName("a...b.pdf")).toBe("a.b.pdf");
  });
});

describe("hasValidSignature", () => {
  it("matches magic numbers", () => {
    expect(hasValidSignature("pdf", new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(hasValidSignature("docx", new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe(true);
    expect(hasValidSignature("png", new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(true);
  });

  it("rejects mismatched contents (e.g. HTML renamed to .pdf)", () => {
    const html = new TextEncoder().encode("<html><script>");
    expect(hasValidSignature("pdf", html)).toBe(false);
    expect(hasValidSignature("png", html)).toBe(false);
  });

  it("does not sniff unknown/text formats", () => {
    expect(hasValidSignature("txt", new Uint8Array([1, 2, 3]))).toBe(true);
  });
});
