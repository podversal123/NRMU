"use client";

import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";
import Icon from "@/components/Icon";
import { addComment, deleteComment, loadComments, reportItem, setLike } from "@/app/[lang]/feed/actions";
import type { FeedTarget } from "@/db/schema";
import type { FeedComment } from "@/lib/feed";
import { intlLocale, type Lang } from "@/lib/i18n";
import { fill, pickText } from "@/lib/text3";

export type FeedLabels = {
  like: string;
  unlike: string;
  likesCount: string;
  comment: string;
  commentsCount: string;
  suggestion: string;
  writeComment: string;
  writeSuggestion: string;
  send: string;
  noComments: string;
  report: string;
  reportReason: string;
  reportSend: string;
  reported: string;
  remove: string;
  cancel: string;
  share: string;
  copied: string;
  signInToAct: string;
  signIn: string;
  /** messages for the error keys the server can return */
  errors: Record<string, string>;
};

/**
 * Like, comment (or suggest) and report under one feed item. A like shows at once and is put right if the server
 * says otherwise. Comments load only when the panel is opened, so a page of the feed costs nothing extra for them.
 */
export default function FeedActions({
  lang,
  target,
  id,
  likes: likes0,
  comments: comments0,
  liked: liked0,
  me,
  mine = false,
  labels: L,
  commentMax,
  loginHref,
  startOpen = false,
  sharePath,
  shareTitle = "",
  canLike = false,
  spread = true,
}: {
  lang: Lang;
  target: FeedTarget;
  id: number;
  likes: number;
  comments: number;
  liked: boolean;
  /** the signed-in member's id, or null for a visitor */
  me: number | null;
  /** true on the member's own post: no report button */
  mine?: boolean;
  labels: FeedLabels;
  commentMax: number;
  loginHref: string;
  startOpen?: boolean;
  /** the item's own address ("/en/orders/12"); shown as a Share button when given */
  sharePath?: string;
  shareTitle?: string;
  /** a visitor who is not signed in may still like (the "feed.guest_likes" setting) */
  canLike?: boolean;
  /** true (as in the feed): the buttons spread across the row; false: they sit together at the start */
  spread?: boolean;
}) {
  const uid = useId();
  const [liked, setLiked] = useState(liked0);
  const [likes, setLikes] = useState(likes0);
  const [count, setCount] = useState(comments0);
  const [open, setOpen] = useState(startOpen);
  const [list, setList] = useState<FeedComment[] | null>(null);
  const [kind, setKind] = useState<"comment" | "suggestion">("comment");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ target: FeedTarget | "comment"; id: number } | null>(null);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [loaded, setLoaded] = useState(startOpen);

  const err = (key: string) => setMsg(L.errors[key] ?? L.errors.fdErrGeneric ?? "");
  const when = (iso: string) => new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

  function openPanel(force?: boolean) {
    const next = force ?? !open;
    setOpen(next);
    if (next && !loaded) {
      setLoaded(true);
      start(async () => {
        const r = await loadComments(target, id);
        if ("error" in r) err(r.error);
        else setList(r.comments);
      });
    }
  }
  // the item's own page opens with the comments showing: the panel starts open and they are fetched once
  useEffect(() => {
    if (!startOpen) return;
    let live = true;
    loadComments(target, id).then((r) => {
      if (!live) return;
      if ("error" in r) setMsg(L.errors[r.error] ?? L.errors.fdErrGeneric ?? "");
      else setList(r.comments);
    });
    return () => {
      live = false;
    };
  }, [startOpen, target, id, L.errors]);

  function toggleLike() {
    if (!me && !canLike) return setMsg(L.signInToAct);
    const want = !liked;
    setLiked(want);
    setLikes((n) => Math.max(0, n + (want ? 1 : -1)));
    start(async () => {
      const r = await setLike(target, id, want);
      if ("error" in r) {
        setLiked(!want);
        setLikes((n) => Math.max(0, n + (want ? -1 : 1)));
        err(r.error);
      } else {
        setLiked(r.liked);
        setLikes(r.likes);
      }
    });
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return err("fdErrBody");
    setMsg(null);
    start(async () => {
      const r = await addComment(target, id, kind, body);
      if ("error" in r) return err(r.error);
      setList((l) => [...(l ?? []), r.comment]);
      setCount(r.total);
      setText("");
    });
  }

  function remove(c: FeedComment) {
    start(async () => {
      const r = await deleteComment(c.id);
      if ("error" in r) return err(r.error);
      setList((l) => (l ?? []).filter((x) => x.id !== c.id));
      setCount(r.total);
    });
  }

  /** The phone's own share sheet where there is one (WhatsApp and the rest), otherwise the link is copied. */
  async function share() {
    if (!sharePath) return;
    const url = `${window.location.origin}${sharePath}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url });
        return;
      } catch (e) {
        // closed by the visitor: nothing to do; refused by the browser (no share sheet here): copy the link instead
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setMsg(L.copied);
    } catch {
      setMsg(url);
    }
  }

  function sendReport(e: React.FormEvent) {
    e.preventDefault();
    if (!reporting) return;
    const what = reporting;
    start(async () => {
      const r = await reportItem(what.target, what.id, reason);
      if ("error" in r) return err(r.error);
      setReported((s) => new Set(s).add(`${what.target}:${what.id}`));
      setReporting(null);
      setReason("");
      setMsg(L.reported);
    });
  }


  const panelId = `${uid}-comments`;
  const num = (n: number) => n.toLocaleString(intlLocale(lang));
  // icon buttons as on X: no box, a coloured icon when active; the count sits beside the icon
  const icon = "inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-2 text-sm tabular-nums";
  const initials = (name: string) =>
    name
      .split(/[\s.]+/)
      .filter((w) => w && !/^(sh|shri|smt|dr|com|km)$/i.test(w))
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className="pb-1">
      <div className={`-ms-2 mt-1 flex items-center ${spread ? "max-w-md justify-between" : "gap-5"}`}>
        <button
          type="button"
          onClick={() => openPanel()}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${L.comment} (${fill(L.commentsCount, { n: count })})`}
          className={`${icon} ${open ? "text-brand" : "text-muted"}`}
        >
          <Icon name="chat" size={19} />
          <span>{num(count)}</span>
        </button>
        <button
          type="button"
          onClick={toggleLike}
          aria-pressed={liked}
          aria-label={`${liked ? L.unlike : L.like} (${fill(L.likesCount, { n: likes })})`}
          className={`${icon} ${liked ? "text-brand" : "text-muted"}`}
        >
          <span className={liked ? "[&_path]:fill-current" : ""}>
            <Icon name="heart" size={19} />
          </span>
          <span>{num(likes)}</span>
        </button>
        {sharePath && (
          <button type="button" onClick={share} aria-label={L.share} title={L.share} className={`${icon} text-muted`}>
            <Icon name="share" size={19} />
          </button>
        )}
        {me && !mine && !reported.has(`${target}:${id}`) ? (
          <button type="button" onClick={() => setReporting({ target, id })} aria-label={L.report} title={L.report} className={`${icon} text-muted`}>
            <Icon name="flag" size={17} />
          </button>
        ) : (
          spread && <span aria-hidden className="min-w-11" />
        )}
      </div>

      {msg && (
        <p role="status" className="mb-3 rounded-xl bg-paper px-3.5 py-2.5 text-sm">
          {msg}{" "}
          {!me && msg === L.signInToAct && (
            <Link href={loginHref} className="font-semibold text-brand underline underline-offset-4">
              {L.signIn}
            </Link>
          )}
        </p>
      )}

      {reporting && (
        <form onSubmit={sendReport} className="mb-3 space-y-2 rounded-2xl border border-line p-3.5">
          <label className="block text-sm font-medium">
            {L.reportReason}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className="mt-1.5 w-full rounded-xl border border-line bg-white px-3 py-2 text-base field-bare focus:border-brand focus:outline-none" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">
              {L.reportSend}
            </button>
            <button type="button" onClick={() => setReporting(null)} className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold text-muted">
              {L.cancel}
            </button>
          </div>
        </form>
      )}

      {open && (
        // replies as on X: a small picture, name and time on one line, the words under it; the reply box at the end
        <div id={panelId} className="mb-3 border-t border-line pt-3">
          {list === null ? (
            <p className="py-2 text-sm text-muted" aria-busy="true">…</p>
          ) : list.length === 0 ? (
            <p className="py-2 text-sm text-muted">{L.noComments}</p>
          ) : (
            <ul className="space-y-4">
              {list.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f2e6cc] text-xs font-semibold text-brand">
                    {initials(c.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-1.5 text-sm leading-tight">
                      <span className="font-bold">{c.name}</span>
                      {c.division && <span className="text-muted">{pickText(lang, c.division)}</span>}
                      <span aria-hidden className="text-muted">·</span>
                      <time dateTime={c.at} className="text-muted">
                        {when(c.at)}
                      </time>
                      {c.kind === "suggestion" && <span className="rounded-full bg-signal/25 px-2 py-0.5 text-xs font-bold text-ink">{L.suggestion}</span>}
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words text-[0.97rem]">{c.body}</p>
                    {me === c.memberId ? (
                      <button type="button" onClick={() => remove(c)} disabled={pending} className="mt-0.5 min-h-9 text-xs font-semibold text-muted">
                        {L.remove}
                      </button>
                    ) : (
                      me &&
                      !reported.has(`comment:${c.id}`) && (
                        <button type="button" onClick={() => setReporting({ target: "comment", id: c.id })} className="mt-0.5 min-h-9 text-xs font-semibold text-muted">
                          {L.report}
                        </button>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {me ? (
            <form onSubmit={send} className="mt-4 space-y-2">
              <div role="radiogroup" className="inline-flex rounded-full bg-paper p-0.5 text-sm font-semibold">
                {(["comment", "suggestion"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={kind === k}
                    onClick={() => setKind(k)}
                    className={`min-h-9 rounded-full px-3.5 ${kind === k ? "bg-white text-brand shadow-[0_1px_3px_rgba(21,22,26,0.15)]" : "text-muted"}`}
                  >
                    {k === "comment" ? L.comment : L.suggestion}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{kind === "comment" ? L.writeComment : L.writeSuggestion}</span>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={commentMax}
                    rows={1}
                    placeholder={kind === "comment" ? L.writeComment : L.writeSuggestion}
                    className="block min-h-11 w-full resize-y rounded-2xl border border-line bg-white px-4 py-2.5 text-base field-bare focus:border-brand focus:outline-none"
                  />
                </label>
                <button type="submit" disabled={pending || !text.trim()} className="inline-flex h-11 shrink-0 items-center rounded-full bg-brand px-5 font-semibold text-white disabled:opacity-40">
                  {L.send}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-3 text-sm">
              {L.signInToAct}{" "}
              <Link href={loginHref} className="font-semibold text-brand underline underline-offset-4">
                {L.signIn}
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}