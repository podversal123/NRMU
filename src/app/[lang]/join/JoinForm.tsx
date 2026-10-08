"use client";

import { useActionState } from "react";
import { submitJoin, type JoinState } from "./actions";
import type { Dict } from "@/lib/i18n";

const input =
  "mt-1.5 w-full rounded-lg border-2 border-line bg-white px-4 py-3 text-base focus:border-ink focus:outline-none";

export default function JoinForm({ ui, divisions }: { ui: Dict; divisions: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState<JoinState, FormData>(submitJoin, {});

  const v = state.values ?? {};
  // Remount after an error so every field (including the dropdown) starts from what the visitor typed.
  const formKey = state.error ? JSON.stringify(v) : "fresh";

  if (state.ok) {
    return (
      <div role="status" className="rounded-none border-2 border-ink bg-white p-10 text-center">
        <p className="font-display text-2xl font-semibold text-brand">{ui.thanksTitle}</p>
        <p className="mt-3 text-lg text-muted">{ui.thanksText}</p>
      </div>
    );
  }

  return (
    <form key={formKey} action={action} className="space-y-5 border border-line bg-white p-6 sm:p-9" noValidate>
      {state.error && (
        <p role="alert" className="rounded-lg border-2 border-brand bg-brand/10 px-4 py-3 font-semibold text-brand-deep">
          {ui[state.error]}
        </p>
      )}
      <div className="hidden" aria-hidden>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <label className="block font-semibold">
        {ui.formName}
        <input name="name" required autoComplete="name" defaultValue={v.name} className={input} />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          {ui.formMobile}
          <input name="mobile" required inputMode="tel" autoComplete="tel" maxLength={13} defaultValue={v.mobile} className={input} />
        </label>
        <label className="block font-semibold">
          {ui.formEmail}
          <input name="email" type="email" autoComplete="email" defaultValue={v.email} className={input} />
        </label>
      </div>
      <label className="block font-semibold">
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
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          {ui.formDesignation}
          <input name="designation" defaultValue={v.designation} className={input} />
        </label>
        <label className="block font-semibold">
          {ui.formEmployeeId}
          <input name="employeeId" defaultValue={v.employeeId} className={input} />
        </label>
      </div>
      <label className="block font-semibold">
        {ui.formMessage}
        <textarea name="message" rows={4} maxLength={1000} defaultValue={v.message} className={input} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full px-8 py-4 text-lg disabled:opacity-60 sm:w-auto"
      >
        {pending ? ui.submitting : ui.submit}
      </button>
    </form>
  );
}
