"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { acceptFor, allowedLabel, checkFile, MAX_UPLOAD_MB, mediaKindOfUrl, type UploadKind } from "@/lib/upload-types";

/** Keeps letters and digits of every script (Hindi names stay readable); only characters unsafe in an address become "_". */
const safeName = (name: string) => {
  const clean = name.normalize("NFC").replace(/[^\p{L}\p{N}\p{M}._ -]+/gu, "_");
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot) : "";
  const base = (dot > 0 ? clean.slice(0, dot) : clean).slice(0, 80).trim();
  return `${base || "file"}${ext}`;
};

const shown = (u: string) => {
  const last = u.split("/").pop() ?? u;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** The small label on a stored file: its kind, from the address. */
const badge = (u: string) => {
  const ext = (u.split("?")[0].split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "DOC";
  if (ext === "xls" || ext === "xlsx") return "XLS";
  return mediaKindOfUrl(u) === "video" ? "VIDEO" : ext.slice(0, 4).toUpperCase() || "FILE";
};

/**
 * Uploads files straight from the browser to the public Blob store (no 4.5 MB server limit)
 * and submits the resulting URLs with the form as repeated `name` inputs.
 * Each file is handled on its own: the ones that work are kept, the ones that do not say why.
 */
export default function UploadField({
  name,
  label,
  kind,
  multiple = false,
  folder = "uploads",
  initial = [],
}: {
  name: string;
  label: string;
  kind: UploadKind;
  multiple?: boolean;
  folder?: string;
  initial?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [progress, setProgress] = useState<{ done: number; total: number; name: string; bytes: number; pct: number } | null>(null);
  const [over, setOver] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const fresh = useRef(new Set<string>()); // uploaded in this form and not saved yet
  const ref = useRef<HTMLInputElement>(null);

  /** A file uploaded here and then taken out never reaches the database, so it is deleted right away. */
  function discard(u: string) {
    if (!fresh.current.delete(u)) return;
    fetch("/api/admin/blob", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) }).catch(() => {});
  }

  async function onPick(list: File[]) {
    if (!list.length) return;
    const found: string[] = [];
    setProblems([]);
    setProgress({ done: 0, total: list.length, name: list[0].name, bytes: list[0].size, pct: 0 });

    for (const [i, f] of list.entries()) {
      const check = checkFile(f, kind);
      if (!check.ok) {
        found.push(`${f.name}: ${check.reason}`);
      } else {
        const d = new Date();
        const path = `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${safeName(f.name)}`;
        try {
          setProgress({ done: i, total: list.length, name: f.name, bytes: f.size, pct: 0 });
          const res = await upload(path, f, {
            access: "public",
            handleUploadUrl: "/api/admin/blob",
            contentType: check.type,
            onUploadProgress: ({ percentage }) => setProgress((p) => (p ? { ...p, pct: Math.round(percentage) } : p)),
          });
          fresh.current.add(res.url);
          setUrls((u) => {
            if (multiple) return [...u, res.url];
            u.forEach(discard);
            return [res.url];
          });
        } catch (e) {
          found.push(`${f.name}: could not be uploaded${e instanceof Error && e.message ? ` (${e.message.replace(/^Vercel Blob: /, "")})` : ""}. Try again.`);
        }
      }
      setProgress(i + 1 < list.length ? { done: i + 1, total: list.length, name: list[i + 1].name, bytes: list[i + 1].size, pct: 0 } : { done: i + 1, total: list.length, name: f.name, bytes: f.size, pct: 100 });
    }

    setProblems(found);
    setProgress(null);
    if (ref.current) ref.current.value = "";
  }

  const busy = progress !== null;
  // A single-file field takes the first file only, however many are dropped.
  const onFiles = (files: FileList | null) => onPick(files ? Array.from(files).slice(0, multiple ? files.length : 1) : []);

  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!busy) onFiles(e.dataTransfer.files);
        }}
        className={`mt-2 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-4 py-7 text-center transition focus-within:border-ink focus-within:ring-2 focus-within:ring-ink/20 ${busy ? "cursor-wait opacity-70" : ""} ${over ? "border-brand bg-brand/5" : "border-line bg-paper hover:border-ink"}`}
      >
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-brand">
          <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
          <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
        </svg>
        <span className="font-semibold">{multiple ? "Drag files here, or click to choose" : "Drag a file here, or click to choose"}</span>
        <span className="text-xs text-muted">
          {allowedLabel(kind)}, up to {MAX_UPLOAD_MB} MB each
        </span>
        <input ref={ref} type="file" accept={acceptFor(kind)} multiple={multiple} disabled={busy} onChange={(e) => onFiles(e.target.files)} className="sr-only" />
      </label>

      {busy && (
        <div role="status" className="mt-3 rounded-lg border border-line bg-white px-3 py-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-medium">{progress.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {size(progress.bytes)} · {progress.pct}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="presentation">
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${progress.pct}%` }} />
          </div>
          {progress.total > 1 && (
            <p className="mt-1.5 text-xs text-muted">
              File {Math.min(progress.done + 1, progress.total)} of {progress.total}
            </p>
          )}
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 rounded-lg border-2 border-brand bg-brand/10 px-3 py-2 text-sm font-semibold text-brand-deep">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {urls.length > 0 && (
        <ul className="mt-3 space-y-2">
          {urls.map((u) => (
            <li key={u} className="flex items-center gap-3 rounded-lg border border-line bg-white p-2">
              {mediaKindOfUrl(u) === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element -- a small preview of a file just uploaded
                <img src={u} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-ink text-[0.7rem] font-bold tracking-wide text-light">{badge(u)}</span>
              )}
              <a href={u} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-brand underline-offset-2 hover:underline">
                {shown(u)}
              </a>
              <button
                type="button"
                onClick={() => {
                  discard(u);
                  setUrls((x) => x.filter((y) => y !== u));
                }}
                className="shrink-0 rounded px-3 py-2.5 text-sm font-semibold text-brand hover:bg-brand/10"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
