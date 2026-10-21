/** What may be uploaded. The servers (api/admin/blob, api/member/blob) allow the same types; keep them in step. */
export const MAX_UPLOAD_MB = 50;

const IMAGES = { "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WebP", "image/gif": "GIF" } as const;
const VIDEOS = { "video/mp4": "MP4", "video/webm": "WebM", "video/quicktime": "MOV" } as const;
const DOCS = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
} as const;
const SHEETS = {
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
} as const;

/** "media" is what a member may attach to a feed post: photos and videos. */
export type UploadKind = "image" | "document" | "media" | "any";

const TYPES: Record<UploadKind, Record<string, string>> = {
  image: IMAGES,
  document: DOCS,
  media: { ...IMAGES, ...VIDEOS },
  any: { ...DOCS, ...SHEETS, ...IMAGES, ...VIDEOS },
};

export const IMAGE_TYPES = Object.keys(IMAGES);
export const VIDEO_TYPES = Object.keys(VIDEOS);
export const MEDIA_TYPES = Object.keys(TYPES.media);

/** Some browsers leave `file.type` empty (Word and Excel on Windows), so the extension is the fallback. */
const BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const acceptFor = (kind: UploadKind) => Object.keys(TYPES[kind]).join(",");

/** The content type of a file, from what the browser says or else from its extension ("" when unknown). */
export const typeOf = (file: { name: string; type: string }) => file.type || BY_EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";

/** "image" or "video" from an address, by its extension (used for files already stored). */
export const mediaKindOfUrl = (url: string): "image" | "video" | null =>
  /\.(jpe?g|png|gif|webp)(\?|$)/i.test(url) ? "image" : /\.(mp4|m4v|webm|mov)(\?|$)/i.test(url) ? "video" : null;

/** "JPG, PNG, WebP or GIF" */
export function allowedLabel(kind: UploadKind) {
  const names = [...new Set(Object.values(TYPES[kind]))];
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` : names[0];
}

/** The content type to upload with, or a plain-language reason why this file cannot be uploaded. */
export function checkFile(file: { name: string; type: string; size: number }, kind: UploadKind): { ok: true; type: string } | { ok: false; reason: string } {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = typeOf(file);
  if (/^image\/hei[cf]/.test(type) || ext === "heic" || ext === "heif") {
    return { ok: false, reason: "this is an iPhone HEIC photo. Save or share it as JPG and choose it again." };
  }
  if (!(type in TYPES[kind])) return { ok: false, reason: `this file type is not allowed. Use ${allowedLabel(kind)}.` };
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return { ok: false, reason: `it is ${(file.size / 1048576).toFixed(1)} MB; the limit is ${MAX_UPLOAD_MB} MB.` };
  }
  if (file.size === 0) return { ok: false, reason: "the file is empty." };
  return { ok: true, type };
}
