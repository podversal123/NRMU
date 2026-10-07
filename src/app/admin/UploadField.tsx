"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";

/**
 * Uploads files straight from the browser to the public Blob store (no 4.5 MB server limit)
 * and submits the resulting URLs with the form as repeated `name` inputs.
 */
export default function UploadField({
  name,
  label,
  accept,
  multiple = false,
  folder = "uploads",
  initial = [],
}: {
  name: string;
  label: string;
  accept: string;
  multiple?: boolean;
  folder?: string;
  initial?: string[];
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    try {
      const done: string[] = [];
      for (const f of Array.from(files)) {
        const d = new Date();
        const safe = f.name.replace(/[^\w.\- ]+/g, "_");
        const res = await upload(`${folder}/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${safe}`, f, {
          access: "public",
          handleUploadUrl: "/api/admin/blob",
        });
        done.push(res.url);
      }
      setUrls((u) => (multiple ? [...u, ...done] : done));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

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
              {decodeURIComponent(u.split("/").pop() ?? u)}
            </a>
            <button type="button" onClick={() => setUrls((x) => x.filter((y) => y !== u))} className="shrink-0 font-semibold text-brand hover:underline">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <input ref={ref} type="file" accept={accept} multiple={multiple} disabled={busy} onChange={(e) => onPick(e.target.files)} className="mt-2 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-light hover:file:bg-brand" />
      {busy && <p className="mt-1 text-sm text-muted">Uploading…</p>}
      {error && <p role="alert" className="mt-1 text-sm font-semibold text-brand">{error}</p>}
    </div>
  );
}
