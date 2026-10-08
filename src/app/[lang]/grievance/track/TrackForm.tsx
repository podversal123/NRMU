"use client";

import { useActionState } from "react";
import { trackGrievance, type TrackState } from "../actions";
import type { Dict, Lang } from "@/lib/i18n";

const input = "mt-1.5 w-full border border-line bg-white px-4 py-3 text-base focus:border-ink focus:outline-none";

const pickLang = (pair: string | null, lang: Lang) => {
  if (!pair) return "";
  const [en, hi] = pair.split("|");
  return lang === "hi" && hi ? hi : en;
};

export default function TrackForm({ lang, ui }: { lang: Lang; ui: Dict }) {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackGrievance, {});
  const r = state.result;
  const v = state.values;
  const when = (iso: string) =>
    new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  const statusLabel = (st: string) => ui[`gStatus_${st}` as keyof Dict] ?? st;

  return (
    <div className="space-y-8">
      <form key={v ? `${v.ticket}|${v.mobile}` : "fresh"} action={action} className="space-y-5 border border-line bg-white p-6 sm:p-9">
        {state.error && (
          <p role="alert" className="border border-brand bg-brand/10 px-4 py-3 font-medium text-brand-deep">
            {ui[state.error]}
          </p>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-medium">
            {ui.gTicket}
            <input name="ticket" required autoComplete="off" defaultValue={v?.ticket} className={`${input} font-mono uppercase`} />
          </label>
          <label className="block font-medium">
            {ui.formMobile}
            <input name="mobile" required inputMode="tel" autoComplete="tel" maxLength={13} defaultValue={v?.mobile} className={input} />
          </label>
        </div>
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? ui.submitting : ui.gTrackButton}
        </button>
      </form>

      {r && (
        <section className="border border-ink bg-white p-6 sm:p-9" aria-live="polite">
          <p className="font-mono text-lg font-bold tracking-wider text-brand">{r.ticket}</p>
          <h2 className="mt-1 text-[1.35rem] leading-tight">{r.subject}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">{ui.gStatus}</dt>
              <dd className="mt-0.5 font-semibold">{statusLabel(r.status)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{ui.gLevel}</dt>
              <dd className="mt-0.5 font-semibold">{pickLang(r.levelName, lang)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{ui.gTimeline}</dt>
              <dd className="mt-0.5 text-muted">{when(r.createdAt)}</dd>
            </div>
          </dl>
          <ol className="mt-8 border-l border-line">
            {r.events.map((e, i) => (
              <li key={i} className="relative pb-6 pl-6 last:pb-0">
                <span className="absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full bg-signal" />
                <p className="text-sm text-muted">{when(e.at)}</p>
                <p className="font-medium">
                  {e.kind === "status" && statusLabel(e.value ?? "")}
                  {(e.kind === "level" || e.kind === "escalated" || e.kind === "created") && pickLang(e.levelName, lang)}
                  {e.kind === "note" && e.message}
                </p>
                {e.kind === "status" && e.message && <p className="text-muted">{e.message}</p>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
