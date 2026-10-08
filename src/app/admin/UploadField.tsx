"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";
import { acceptFor, allowedLabel, checkFile, MAX_UPLOAD_MB, type UploadKind } from "@/lib/upload-types";

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const fresh = useRef(new Set<string>()); // uploaded in this form and not saved yet
  const ref = useRef<HTMLInputElement>(null);

  /** A file uploaded here and then taken out never reaches the database, so it is deleted right away. */
  function discard(u: string) {
    if (!fresh.current.delete(u)) return;
    fetch("/api/admin/blob", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: u }) }).catch(() => {});
  }

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const found: string[] = [];
    setProblems([]);
    setProgress({ done: 0, total: list.length });

    for (const [i, f] of list.entries()) {
      const check = checkFile(f, kind);
      if (!check.ok) {
        found.push(`${f.name}: ${check.reason}`);
      } else {
        const d = new Date();
        const path = `${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${safeName(f.name)}`;
        try {
          const res = await upload(path, f, { access: "public", handleUploadUrl: "/api/admin/blob", contentType: check.type });
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
      setProgress({ done: i + 1, total: list.length });
    }

    setProblems(found);
    setProgress(null);
    if (ref.current) ref.current.value = "";
  }

  const busy = progress !== null;

  return (
    <div>
      <p className="text-sm font-semibold">{label}</p>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <ul className="mt-2 space-y-1.5">
        {urls.map((u) => (
          <li key={u} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-paper px-3 py-2 text-sm">
            <a href={u} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate font-medium text-brand underline-offset-2 hover:underline">
              {shown(u)}
            </a>
            <button
              type="button"
              onClick={() => {
                discard(u);
                setUrls((x) => x.filter((y) => y !== u));
              }}
              className="shrink-0 font-semibold text-brand hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <input
        ref={ref}
        type="file"
        accept={acceptFor(kind)}
        multiple={multiple}
        disabled={busy}
        onChange={(e) => onPick(e.target.files)}
        className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-light hover:file:bg-brand"
      />
      <p className="mt-1 text-xs text-muted">
        {allowedLabel(kind)}, up to {MAX_UPLOAD_MB} MB each.
      </p>
      {busy && (
        <p role="status" className="mt-1 text-sm text-muted">
          Uploading {Math.min(progress.done + 1, progress.total)} of {progress.total}…
        </p>
      )}
      {problems.length > 0 && (
        <ul role="alert" className="mt-1 space-y-0.5 text-sm font-semibold text-brand">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
