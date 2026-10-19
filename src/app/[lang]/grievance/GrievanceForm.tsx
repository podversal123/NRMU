"use client";

import Link from "next/link";
import { Req, Step } from "@/components/FormParts";
import Icon from "@/components/Icon";
import MobileInput, { mobileDigits } from "@/components/MobileInput";
import Select from "@/components/Select";
import { useActionState, useState } from "react";
import { submitGrievance, type SubmitState } from "./actions";
import type { Dict } from "@/lib/i18n";

const field = "w-full rounded-md border border-line bg-white px-4 py-3 text-base field-bare transition-colors focus:border-brand focus:outline-none";
const input = `mt-1.5 ${field}`;
// no overflow-hidden, and a layer above the bar below: the dropdowns inside must open past the card's edge and over the bar
const card = "relative z-10 focus-within:z-20 flex flex-col rounded-md border border-line bg-white shadow-[0_1px_2px_rgba(21,22,26,0.04),0_8px_24px_-12px_rgba(21,22,26,0.12)]";
const DETAILS_MAX = 4000;

export default function GrievanceForm({
  lang,
  ui,
  divisions,
  types,
}: {
  lang: string;
  ui: Dict;
  divisions: { id: number; name: string }[];
  types: { id: number; name: string }[];
}) {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitGrievance, {});
  const v = state.values ?? {};
  // Remount after an error so every field (including the dropdowns) starts from what the visitor typed.
  const formKey = state.error ? JSON.stringify(v) : "fresh";

  if (state.ok) {
    return (
      <div role="status" className={`${card} drawer-l mx-auto max-w-3xl p-8 sm:p-10`}>
        <p className="font-display text-2xl font-semibold">{ui.gThanksTitle}</p>
        <p className="mt-3 text-muted">{ui.gThanksText}</p>
        {state.ticket && (
          <div className="mt-6 rounded-md border border-line bg-paper p-5">
            <p className="text-sm text-muted">{ui.gTicket}</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-brand">{state.ticket}</p>
            <p className="mt-3 text-sm text-muted">{ui.gKeepTicket}</p>
          </div>
        )}
        <Link href={`/${lang}/grievance/track`} className="btn-primary mt-7 self-start">
          {ui.gTrackTitle}
        </Link>
      </div>
    );
  }

  return <FormBody key={formKey} lang={lang} ui={ui} divisions={divisions} types={types} state={state} action={action} pending={pending} />;
}

function FormBody({
  lang,
  ui,
  divisions,
  types,
  state,
  action,
  pending,
}: {
  lang: string;
  ui: Dict;
  divisions: { id: number; name: string }[];
  types: { id: number; name: string }[];
  state: SubmitState;
  action: (f: FormData) => void;
  pending: boolean;
}) {
  const v = state.values ?? {};
  // the required fields, followed as the visitor types so the bar below can show how far along the form is
  const [f, setF] = useState({ name: v.name ?? "", mobile: mobileDigits(v.mobile ?? ""), division: v.division ?? "", subject: v.subject ?? "", details: v.details ?? "" });
  const track = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  // the same minimums the server checks (actions.ts), so a full bar means the form will go through
  const done = [
    f.name.trim().length >= 2,
    /^[6-9]\d{9}$/.test(f.mobile),
    f.division !== "",
    f.subject.trim().length >= 3,
    f.details.trim().length >= 20,
  ];
  const filled = done.filter(Boolean).length;
  const ready = filled === done.length;

  return (
    // the two halves slide in from opposite sides like drawers; clip so they never cause a sideways scroll
    <form action={action} className="grid gap-6 overflow-x-clip lg:grid-cols-2" noValidate>
      {state.error && (
        <p role="alert" className="rounded-md border border-brand bg-brand/10 px-4 py-3 font-medium text-brand-deep lg:col-span-2">
          {ui[state.error]}
        </p>
      )}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <section aria-labelledby="g-contact" className={`${card} drawer-l`}>
        <Step n={1} id="g-contact" title={ui.gSecContact} />
        <div className="grid flex-1 content-start gap-5 p-6 sm:grid-cols-2">
          <label className="block font-medium">
            {ui.formName}
            <Req />
            <input name="name" required autoComplete="name" defaultValue={v.name} onChange={track("name")} className={input} />
          </label>
          <label className="block font-medium">
            {ui.formMobile}
            <Req />
            <MobileInput name="mobile" required defaultValue={v.mobile} onValue={(mobile) => setF((p) => ({ ...p, mobile }))} className={field} />
          </label>
          <label className="block font-medium">
            {ui.formEmail}
            <input name="email" type="email" autoComplete="email" defaultValue={v.email} className={input} />
          </label>
          <label className="block font-medium">
            {ui.formEmployeeId}
            <input name="employeeId" defaultValue={v.employeeId} className={input} />
          </label>
          <label className="block font-medium sm:col-span-2">
            {ui.formDivision}
            <Req />
            <Select
              name="division"
              defaultValue={v.division ?? ""}
              placeholder={ui.formDivisionPick}
              clearable={false}
              onChange={(division) => setF((p) => ({ ...p, division }))}
              options={divisions.map((d) => ({ value: String(d.id), label: d.name }))}
              className={`${input} font-normal`}
            />
          </label>
        </div>
      </section>

      <section aria-labelledby="g-details" className={`${card} drawer-r`}>
        <Step n={2} id="g-details" title={ui.gSecDetails} />
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block font-medium">
              {ui.gType}
              <Select
                name="type"
                defaultValue={v.type ?? ""}
                placeholder={ui.gTypePick}
                options={types.map((t) => ({ value: String(t.id), label: t.name }))}
                className={`${input} font-normal`}
              />
            </label>
            <label className="block font-medium">
              {ui.gSubject}
              <Req />
              <input name="subject" required maxLength={200} defaultValue={v.subject} onChange={track("subject")} className={input} />
            </label>
          </div>
          {/* the description box takes whatever height is left, so both halves end on the same line */}
          <label className="flex flex-1 flex-col font-medium">
            <span>
              {ui.gDetails}
              <Req />
            </span>
            <textarea
              name="details"
              required
              rows={5}
              maxLength={DETAILS_MAX}
              defaultValue={v.details}
              onChange={track("details")}
              aria-describedby="g-count"
              className={`${input} min-h-36 flex-1 resize-y`}
            />
            <span id="g-count" className="mt-1.5 self-end text-xs font-normal tabular-nums text-muted">
              {f.details.length} / {DETAILS_MAX}
            </span>
          </label>
        </div>
      </section>

      {/* dispatch row under the cards: one gold segment per required field filled in, and the ticket button from the
          home page's grievance card, whose arrow starts moving once everything needed is there */}
      <div className="drawer-up flex flex-wrap items-center gap-x-8 gap-y-5 py-2 lg:col-span-2">
        <div aria-hidden className="flex min-w-[12rem] flex-1 items-center gap-4">
          <div className="flex max-w-xs flex-1 gap-1.5">
            {done.map((ok, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${ok ? "bg-signal" : "bg-line"}`} />
            ))}
          </div>
          <span className={`text-sm font-semibold tabular-nums transition-colors ${ready ? "text-brand" : "text-muted"}`}>
            {filled} / {done.length}
          </span>
        </div>
        <Link href={`/${lang}/grievance/track`} className="py-2.5 font-medium underline decoration-signal decoration-2 underline-offset-4 hover:text-brand">
          {ui.gTrackTitle} →
        </Link>
        <button type="submit" disabled={pending} className={`ticket-btn disabled:opacity-60 ${ready ? "is-ready" : ""}`} style={{ "--notch": "var(--card)" } as React.CSSProperties}>
          <span className="ticket-label">{pending ? ui.submitting : ui.gSubmit}</span>
          <span aria-hidden className="ticket-stub">
            <Icon name="arrow" size={20} />
          </span>
        </button>
      </div>
    </form>
  );
}
