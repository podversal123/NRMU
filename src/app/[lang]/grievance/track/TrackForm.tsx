"use client";

import { useActionState, useState } from "react";
import Icon from "@/components/Icon";
import MobileInput from "@/components/MobileInput";
import { trackGrievance, type TrackState } from "../actions";
import { intlLocale, type Dict, type Lang } from "@/lib/i18n";

// field-bare: the border shows focus, so the site-wide gold focus outline is left off
const field = "w-full rounded-md border border-line bg-white px-4 py-3 text-base field-bare transition focus:border-brand focus:outline-none";
// the same card as the grievance form, so raising and tracking look like one service
const card = "rounded-md border border-line bg-white shadow-[0_1px_2px_rgba(21,22,26,0.04),0_8px_24px_-12px_rgba(21,22,26,0.12)]";

/** Colour of the status badge: waiting is gold, being worked on is red, resolved is green, closed is grey. */
const STATUS_TONE: Record<string, string> = {
  open: "bg-signal/25 text-ink",
  in_progress: "bg-brand/10 text-brand",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-line/70 text-muted",
};

/**
 * Ticket numbers are capitals, digits and dashes (NRMU-2610-12345). A space or underscore typed in place of a dash
 * becomes one; anything else is dropped.
 */
const ticketChars = (s: string) =>
  s
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 30);

export default function TrackForm({ lang, ui }: { lang: Lang; ui: Dict }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackGrievance, {});
  const r = state.result;
  const v = state.values;
  const when = (iso: string) =>
    new Intl.DateTimeFormat(intlLocale(lang), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  const statusLabel = (st: string) => ui[`gStatus_${st}` as keyof Dict] ?? st;

  return (
    <div className="space-y-8">
      <form key={v ? `${v.ticket}|${v.mobile}` : "fresh"} action={action} className={card}>
        <input type="hidden" name="lang" value={lang} />
        <header className="flex items-center gap-3 rounded-t-md border-b border-line bg-gradient-to-b from-paper/70 to-white px-6 py-4">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white">
            <Icon name="search" size={18} />
          </span>
          <p className="text-muted">{ui.gTrackText}</p>
        </header>
        <div className="space-y-5 p-6">
          {state.error && (
            <p role="alert" className="rounded-md border border-brand bg-brand/10 px-4 py-3 font-medium text-brand-deep">
              {ui[state.error]}
            </p>
          )}
          {/* on wide screens the button sits in the same row as the two fields, like a search bar; its height matches theirs */}
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:gap-4">
            <label className="block font-medium">
              {ui.gTicket}
              <TicketInput defaultValue={v?.ticket ?? ""} placeholder={ui.phTicket} />
            </label>
            <label className="block font-medium">
              {ui.formMobile}
              <MobileInput name="mobile" required placeholder={ui.phMobile} defaultValue={v?.mobile} className={field} />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="group inline-flex h-[calc(3rem+2px)] w-full items-center justify-center gap-2 rounded-md bg-brand px-6 font-semibold text-white shadow-[0_6px_16px_-8px_rgba(111,26,23,0.6)] transition hover:bg-brand-deep hover:shadow-[0_10px_22px_-10px_rgba(111,26,23,0.75)] active:translate-y-px disabled:cursor-wait disabled:opacity-60 sm:col-span-2 md:col-span-1 md:w-auto"
            >
              <Icon name="search" size={18} className="transition group-hover:scale-110" />
              {pending ? ui.submitting : ui.gTrackButton}
            </button>
          </div>
        </div>
      </form>

      {r && (
        <section className={`${card} overflow-hidden`} aria-live="polite">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line bg-gradient-to-b from-paper/70 to-white px-6 py-5">
            <div className="min-w-0">
              <p className="font-mono text-sm font-bold tracking-wider text-brand">{r.ticket}</p>
              <h2 className="mt-1 text-xl font-semibold leading-snug">{r.subject}</h2>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${STATUS_TONE[r.status] ?? STATUS_TONE.open}`}>{statusLabel(r.status)}</span>
          </header>
          <dl className="grid gap-4 border-b border-line px-6 py-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">{ui.gLevel}</dt>
              <dd className="mt-0.5 font-semibold">{r.levelName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{ui.gTimeline}</dt>
              <dd className="mt-0.5 font-semibold">{when(r.createdAt)}</dd>
            </div>
          </dl>
          <ol className="px-6 py-6">
            {r.events.map((e, i) => {
              const last = i === r.events.length - 1;
              return (
                <li key={i} className="relative pb-6 pl-8 last:pb-0">
                  {!last && <span aria-hidden className="absolute bottom-0 left-[7px] top-5 w-px bg-line" />}
                  <span aria-hidden className={`absolute left-0 top-1.5 size-[15px] rounded-full border-[3px] border-white ring-1 ${last ? "bg-brand ring-brand" : "bg-signal ring-signal"}`} />
                  <p className="text-sm text-muted">{when(e.at)}</p>
                  <p className="font-medium">
                    {e.kind === "status" && statusLabel(e.value ?? "")}
                    {(e.kind === "level" || e.kind === "escalated" || e.kind === "created") && e.levelName}
                    {e.kind === "note" && e.message}
                  </p>
                  {e.kind === "status" && e.message && <p className="text-muted">{e.message}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function TicketInput({ defaultValue, placeholder }: { defaultValue: string; placeholder: string }) {
  const [value, setValue] = useState(() => ticketChars(defaultValue));
  return (
    <input
      name="ticket"
      required
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(ticketChars(e.target.value))}
      className={`mt-1.5 ${field} font-mono tracking-wider`}
    />
  );
}
