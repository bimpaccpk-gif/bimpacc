/**
 * Validation for files uploaded by admins as lesson resources. Pure (no I/O) so it
 * can be unit tested. Do NOT trust the browser-supplied MIME type or file name:
 * the extension must be on an allowlist, the declared type must be compatible,
 * and the leading bytes must match the format.
 */

export const MAX_RESOURCE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_NAME_LENGTH = 120;

const ZIP_OFFICE = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** extension -> allowed declared MIME types (first entry is what we store) */
const ALLOWED: Record<string, string[]> = {
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [ZIP_OFFICE[0]],
  ppt: ["application/vnd.ms-powerpoint"],
  pptx: [ZIP_OFFICE[1]],
  xls: ["application/vnd.ms-excel"],
  xlsx: [ZIP_OFFICE[2]],
  csv: ["text/csv", "application/vnd.ms-excel"],
  txt: ["text/plain"],
  zip: ["application/zip", "application/x-zip-compressed"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
};

/** Formats with a reliable magic number. Text/legacy-Office formats are not sniffed. */
const MAGIC: Record<string, number[][]> = {
  pdf: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  png: [[0x89, 0x50, 0x4e, 0x47]],
  jpg: [[0xff, 0xd8, 0xff]],
  jpeg: [[0xff, 0xd8, 0xff]],
  zip: [[0x50, 0x4b, 0x03, 0x04], [0x50, 0x4b, 0x05, 0x06]],
  docx: [[0x50, 0x4b, 0x03, 0x04]],
  pptx: [[0x50, 0x4b, 0x03, 0x04]],
  xlsx: [[0x50, 0x4b, 0x03, 0x04]],
  doc: [[0xd0, 0xcf, 0x11, 0xe0]],
  ppt: [[0xd0, 0xcf, 0x11, 0xe0]],
  xls: [[0xd0, 0xcf, 0x11, 0xe0]],
};

export function getExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

/** Strip any path, control characters and unsafe characters; bound the length. */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  const ext = getExtension(base);
  const stem = (ext ? base.slice(0, -(ext.length + 1)) : base)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, MAX_NAME_LENGTH);
  return `${stem || "file"}${ext ? `.${ext}` : ""}`;
}

export type UploadCheck =
  | { ok: true; safeName: string; contentType: string; extension: string }
  | { ok: false; error: string };

export function validateResourceUpload(file: {
  name: string;
  size: number;
  type: string;
}): UploadCheck {
  if (!file.name || file.size <= 0) return { ok: false, error: "The file is empty." };
  if (file.size > MAX_RESOURCE_BYTES) {
    return { ok: false, error: `File is too large (max ${MAX_RESOURCE_BYTES / 1024 / 1024} MB).` };
  }

  const extension = getExtension(file.name);
  const allowedTypes = ALLOWED[extension];
  if (!allowedTypes) {
    return {
      ok: false,
      error: `File type ".${extension || "?"}" is not allowed. Allowed: ${Object.keys(ALLOWED).join(", ")}.`,
    };
  }

  const declared = (file.type || "").toLowerCase();
  if (declared && declared !== "application/octet-stream" && !allowedTypes.includes(declared)) {
    return { ok: false, error: "The file type does not match its extension." };
  }

  return {
    ok: true,
    safeName: sanitizeFileName(file.name),
    contentType: allowedTypes[0],
    extension,
  };
}

/** Check the leading bytes against the format for the extension. Unknown formats pass. */
export function hasValidSignature(extension: string, bytes: Uint8Array): boolean {
  const signatures = MAGIC[extension];
  if (!signatures) return true;
  return signatures.some((sig) => sig.every((b, i) => bytes[i] === b));
}
