"use client";

import { upload } from "@vercel/blob/client";
import { useActionState, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import Select from "@/components/Select";
import { createPost, type PostState } from "@/app/[lang]/feed/actions";
import { memberFolder } from "@/lib/feed-paths";
import { IMAGE_TYPES, MEDIA_TYPES, VIDEO_TYPES, typeOf } from "@/lib/upload-types";
import { fill } from "@/lib/text3";

export type ComposerText = {
  start: string;
  share: string;
  placeholder: string;
  topic: string;
  topicPick: string;
  addMedia: string;
  mediaHint: string;
  anonymous: string;
  submit: string;
  submitting: string;
  sent: string;
  uploading: string;
  remove: string;
  errors: Record<string, string>;
};

type Limits = { postMax: number; maxMedia: number; maxImageMb: number; maxVideoMb: number };
type Attached = { url: string; kind: "image" | "video"; preview: string; name: string };

/** Keeps letters and digits of every script; characters unsafe in an address become "_". */
const safeName = (name: string) => {
  const clean = name.normalize("NFC").replace(/[^\p{L}\p{N}\p{M}._ -]+/gu, "_");
  const dot = clean.lastIndexOf(".");
  const ext = dot > 0 ? clean.slice(dot) : "";
  return `${(dot > 0 ? clean.slice(0, dot) : clean).slice(0, 60).trim() || "file"}${ext}`;
};

/**
 * A member writes a post: a topic, the text, up to a few photos or a video, and whether to hide their name.
 * Files go straight from the browser to storage (no size limit of the server in between); the post is checked
 * again on the server and then waits for an admin.
 */
const initials = (name: string) =>
  name
    .replace(/^(Sh|Shri|Smt|Dr|Com|Km)\.?\s+/i, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function Composer({ memberId, name, topics, limits, text: T }: { memberId: number; name: string; topics: { value: string; label: string }[]; limits: Limits; text: ComposerText }) {
  const [state, action, pending] = useActionState<PostState, FormData>(createPost, {});
  const [round, setRound] = useState(0); // a fresh, empty form after each post that went through
  const [lastOk, setLastOk] = useState<PostState | null>(null);
  // starts as a one-line prompt and opens into the full form; folds back after a post went through
  const [expanded, setExpanded] = useState(false);
  if (state.ok && state !== lastOk) {
    setLastOk(state);
    setRound((r) => r + 1);
    setExpanded(false);
  }
  const open = expanded || (!state.ok && !!state.error);

  return (
    <section aria-labelledby="composer-h" className="bg-white">
      <h2 id="composer-h" className="sr-only">
        {T.share}
      </h2>
      {state.ok && state === lastOk && (
        <p role="status" className="mx-4 mt-4 rounded-lg border border-green-700/30 bg-green-50 px-4 py-3 text-sm font-medium text-green-900 sm:mx-5">
          {T.sent}
        </p>
      )}
      {open ? (
        <Form key={round} action={action} pending={pending} state={state.ok ? {} : state} memberId={memberId} topics={topics} limits={limits} T={T} />
      ) : (
        <button type="button" onClick={() => setExpanded(true)} aria-expanded={false} className="flex w-full items-center gap-3 px-4 py-3.5 text-start sm:px-5">
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f7efdc] to-[#efe0bd] font-semibold text-brand ring-2 ring-signal/60">
            {initials(name)}
          </span>
          <span className="min-w-0 flex-1 truncate rounded-full border border-line bg-paper/70 px-4 py-3 text-muted">{T.start}</span>
          <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_6px_16px_-8px_rgba(111,26,23,0.6)]">
            <Icon name="plus" size={20} />
          </span>
        </button>
      )}
    </section>
  );
}

function Form({
  action,
  pending,
  state,
  memberId,
  topics,
  limits,
  T,
}: {
  action: (f: FormData) => void;
  pending: boolean;
  state: PostState;
  memberId: number;
  topics: { value: string; label: string }[];
  limits: Limits;
  T: ComposerText;
}) {
  const v = state.values;
  const [body, setBody] = useState(v?.body ?? "");
  const [files, setFiles] = useState<Attached[]>([]);
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const previews = useRef(new Set<string>());

  // previews made in the browser are released when the form goes away (after sending, or leaving the page)
  useEffect(() => {
    const own = previews.current;
    return () => own.forEach((p) => URL.revokeObjectURL(p));
  }, []);

  /** A file taken out before sending never reaches the database, so it is deleted from storage right away. */
  const discard = (f: Attached) => {
    fetch("/api/member/blob", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: f.url }) }).catch(() => {});
    URL.revokeObjectURL(f.preview);
    previews.current.delete(f.preview);
    setFiles((list) => list.filter((x) => x.url !== f.url));
  };

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    const found: string[] = [];
    const room = limits.maxMedia - files.length;
    const picked = Array.from(list);
    if (picked.length > room) found.push(fill(T.errors.fdErrTooMany ?? "", { n: limits.maxMedia }));
    for (const f of picked.slice(0, Math.max(0, room))) {
      const type = typeOf(f);
      const kind = IMAGE_TYPES.includes(type) ? "image" : VIDEO_TYPES.includes(type) ? "video" : null;
      const maxMb = kind === "image" ? limits.maxImageMb : limits.maxVideoMb;
      if (!kind || f.size === 0 || f.size > maxMb * 1024 * 1024) {
        found.push(fill(T.errors.fdErrFile ?? "", { name: f.name }));
        continue;
      }
      setBusy((n) => n + 1);
      try {
        const d = new Date();
        const path = `${memberFolder(memberId)}${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${safeName(f.name)}`;
        const res = await upload(path, f, { access: "public", handleUploadUrl: "/api/member/blob", contentType: type });
        const preview = URL.createObjectURL(f);
        previews.current.add(preview);
        setFiles((x) => [...x, { url: res.url, kind, preview, name: f.name }]);
      } catch {
        found.push(fill(T.errors.fdErrFile ?? "", { name: f.name }));
      } finally {
        setBusy((n) => n - 1);
      }
    }
    setProblems(found);
    if (input.current) input.current.value = "";
  }

  const error = state.error ? fill(T.errors[state.error] ?? T.errors.fdErrGeneric ?? "", { n: limits.maxMedia, name: state.detail ?? "" }) : null;

  return (
    <form action={action} className="space-y-4 p-4 sm:p-5">
      {error && (
        <p role="alert" className="rounded-md border border-brand bg-brand/10 px-4 py-3 text-sm font-medium text-brand-deep">
          {error}
        </p>
      )}
      <label className="block font-medium">
        {T.topic}
        <Select name="topic" defaultValue={v?.topic ?? ""} placeholder={T.topicPick} clearable={false} options={topics} className="mt-1.5 w-full rounded-md border border-line bg-white px-4 py-3 text-base font-normal field-bare focus:border-brand focus:outline-none" />
      </label>
      <label className="block">
        <span className="sr-only">{T.placeholder}</span>
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={limits.postMax}
          rows={4}
          // the form only appears after the member asked for it, so the cursor can go straight to the text
          autoFocus
          placeholder={T.placeholder}
          className="block w-full resize-y rounded-md border border-line bg-white px-4 py-3 text-base field-bare focus:border-brand focus:outline-none"
        />
        <span className="mt-1 block text-end text-xs tabular-nums text-muted">
          {body.length} / {limits.postMax}
        </span>
      </label>

      {files.map((f) => (
        <input key={f.url} type="hidden" name="media" value={f.url} />
      ))}
      {files.length > 0 && (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {files.map((f) => (
            <li key={f.url} className="relative aspect-square overflow-hidden rounded-md bg-ink">
              {f.kind === "video" ? (
                <video src={f.preview} muted playsInline className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.preview} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => discard(f)}
                aria-label={`${T.remove}: ${f.name}`}
                className="absolute end-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-ink/75 text-white"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold ${files.length >= limits.maxMedia || busy > 0 ? "pointer-events-none opacity-50" : ""}`}>
            <Icon name="image" size={18} />
            {busy > 0 ? T.uploading : T.addMedia}
            <input ref={input} type="file" accept={MEDIA_TYPES.join(",")} multiple className="sr-only" disabled={files.length >= limits.maxMedia || busy > 0} onChange={(e) => onPick(e.target.files)} />
          </label>
          <p className="mt-1 text-xs text-muted">{fill(T.mediaHint, { n: limits.maxMedia, img: limits.maxImageMb, vid: limits.maxVideoMb })}</p>
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <input type="checkbox" name="anonymous" defaultChecked={v?.anonymous} className="size-5 accent-[var(--color-brand)]" />
          {T.anonymous}
        </label>
      </div>
      {problems.length > 0 && (
        <ul role="alert" className="space-y-0.5 text-sm font-medium text-brand">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <button type="submit" disabled={pending || busy > 0} className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-6 font-semibold text-white shadow-[0_6px_16px_-8px_rgba(111,26,23,0.6)] disabled:opacity-60 sm:w-auto">
        {pending ? T.submitting : T.submit}
      </button>
    </form>
  );
}
