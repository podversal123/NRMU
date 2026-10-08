"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitGrievance, type SubmitState } from "./actions";
import type { Dict } from "@/lib/i18n";

const input = "mt-1.5 w-full border border-line bg-white px-4 py-3 text-base focus:border-ink focus:outline-none";

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
      <div role="status" className="border border-ink bg-white p-8 sm:p-10">
        <p className="font-display text-2xl font-semibold">{ui.gThanksTitle}</p>
        <p className="mt-3 text-muted">{ui.gThanksText}</p>
        {state.ticket && (
          <div className="mt-6 border border-line bg-paper p-5">
            <p className="text-sm text-muted">{ui.gTicket}</p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-brand">{state.ticket}</p>
            <p className="mt-3 text-sm text-muted">{ui.gKeepTicket}</p>
          </div>
        )}
        <Link href={`/${lang}/grievance/track`} className="btn-primary mt-7">
          {ui.gTrackTitle}
        </Link>
      </div>
    );
  }

  return (
    <form key={formKey} action={action} className="space-y-5 border border-line bg-white p-6 sm:p-9" noValidate>
      {state.error && (
        <p role="alert" className="border border-brand bg-brand/10 px-4 py-3 font-medium text-brand-deep">
          {ui[state.error]}
        </p>
      )}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-medium">
          {ui.formName}
          <input name="name" required autoComplete="name" defaultValue={v.name} className={input} />
        </label>
        <label className="block font-medium">
          {ui.formMobile}
          <input name="mobile" required inputMode="numeric" autoComplete="tel" maxLength={13} defaultValue={v.mobile} className={input} />
        </label>
        <label className="block font-medium">
          {ui.formEmail}
          <input name="email" type="email" autoComplete="email" defaultValue={v.email} className={input} />
        </label>
        <label className="block font-medium">
          {ui.formEmployeeId}
          <input name="employeeId" defaultValue={v.employeeId} className={input} />
        </label>
        <label className="block font-medium">
          {ui.formDivision}
          <select name="division" required defaultValue={v.division ?? ""} className={input}>
            <option value="" disabled>
              {ui.formDivisionPick}
            </option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-medium">
          {ui.gType}
          <select name="type" defaultValue={v.type ?? ""} className={input}>
            <option value="">{ui.gTypePick}</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block font-medium">
        {ui.gSubject}
        <input name="subject" required maxLength={200} defaultValue={v.subject} className={input} />
      </label>
      <label className="block font-medium">
        {ui.gDetails}
        <textarea name="details" required rows={7} maxLength={4000} defaultValue={v.details} className={input} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? ui.submitting : ui.gSubmit}
        </button>
        <Link href={`/${lang}/grievance/track`} className="border-b border-signal pb-0.5 font-medium hover:text-brand">
          {ui.gTrackTitle} →
        </Link>
      </div>
    </form>
  );
}
