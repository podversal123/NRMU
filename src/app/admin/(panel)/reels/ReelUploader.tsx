"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { saveReel } from "./actions";

type Sign = { cloud: string; apiKey: string; folder: string; timestamp: string; signature: string; allowed_formats: string };

/** Uploads one video straight from the browser to Cloudinary (no size limit at our server), then saves it with a title. */
export default function ReelUploader({ maxMb, maxSeconds }: { maxMb: number; maxSeconds: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [credit, setCredit] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const busy = pct !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!file) return setMsg({ ok: false, text: "Choose a video first." });
    if (title.trim().length < 3) return setMsg({ ok: false, text: "Write a title of at least 3 characters." });
    if (file.size > maxMb * 1024 * 1024) return setMsg({ ok: false, text: `The video is ${(file.size / 1048576).toFixed(0)} MB. The limit is ${maxMb} MB.` });
    setPct(0);
    try {
      const res = await fetch("/api/admin/reels/sign", { method: "POST" });
      if (!res.ok) throw new Error(res.status === 429 ? "Too many uploads. Please wait a little." : "Could not start the upload. Please sign in again.");
      const s = (await res.json()) as Sign;
      const body = new FormData();
      body.set("file", file);
      body.set("api_key", s.apiKey);
      body.set("timestamp", s.timestamp);
      body.set("folder", s.folder);
      body.set("allowed_formats", s.allowed_formats);
      body.set("signature", s.signature);
      const uploaded = await new Promise<{ public_id: string }>((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("POST", `https://api.cloudinary.com/v1_1/${s.cloud}/video/upload`);
        x.upload.onprogress = (ev) => ev.lengthComputable && setPct(Math.round((ev.loaded / ev.total) * 100));
        x.onload = () => {
          if (x.status < 300) return resolve(JSON.parse(x.responseText));
          let why = "The video store refused the file.";
          try {
            why = JSON.parse(x.responseText)?.error?.message ?? why;
          } catch {
            // keep the general message
          }
          reject(new Error(why));
        };
        x.onerror = () => reject(new Error("The connection broke. Please try again."));
        x.send(body);
      });
      const saved = await saveReel({ publicId: uploaded.public_id, titleEn: title, titleHi, credit });
      if (!saved.ok) throw new Error(saved.error);
      setMsg({ ok: true, text: "Reel added." });
      setFile(null);
      setTitle("");
      setTitleHi("");
      setCredit("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed." });
    } finally {
      setPct(null);
    }
  }

  const field = "mt-1.5 w-full rounded-lg border-2 border-line bg-white px-3.5 py-2.5 text-base focus:border-ink focus:outline-none";
  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="block text-sm font-semibold sm:col-span-2">
        Video (MP4, MOV or WebM; up to {maxSeconds} seconds and {maxMb} MB)
        <input
          ref={fileRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-light hover:file:bg-brand"
        />
        {file && (
          <span className="mt-1 block text-xs font-normal text-muted">
            {file.name} · {(file.size / 1048576).toFixed(1)} MB
          </span>
        )}
      </label>
      <label className="block text-sm font-semibold">
        Title (English) *
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={busy} className={field} />
      </label>
      <label className="block text-sm font-semibold">
        Title (Hindi)
        <input value={titleHi} onChange={(e) => setTitleHi(e.target.value)} maxLength={200} disabled={busy} className={field} />
      </label>
      <label className="block text-sm font-semibold sm:col-span-2">
        Credit line
        <input value={credit} onChange={(e) => setCredit(e.target.value)} maxLength={200} disabled={busy} placeholder="Optional. For example: Video: name of the author, licence" className={field} />
      </label>
      {busy && (
        <div role="status" className="sm:col-span-2">
          <div className="flex justify-between text-sm">
            <span>{pct === 100 ? "Saving..." : "Uploading..."}</span>
            <span className="tabular-nums text-muted">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`rounded-lg border-2 px-4 py-3 text-sm font-semibold sm:col-span-2 ${msg.ok ? "border-ink bg-soft/50" : "border-brand bg-brand/10 text-brand-deep"}`}>
          {msg.text}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-primary px-6 py-3 disabled:opacity-60">
          {busy ? "Please wait..." : "Add reel"}
        </button>
      </div>
    </form>
  );
}
