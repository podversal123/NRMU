"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitJoin, type JoinState } from "./actions";
import type { Dict, Lang } from "@/lib/i18n";

const input = "mt-1.5 w-full border border-line bg-white px-4 py-3 text-base focus:border-ink focus:outline-none";

type Option = { id: number; name: string };

export default function JoinForm({
  ui,
  lang,
  divisions,
  branches,
  departments,
}: {
  ui: Dict;
  lang: Lang;
  divisions: Option[];
  branches: (Option & { divisionId: number })[];
  departments: Option[];
}) {
  const [state, action, pending] = useActionState<JoinState, FormData>(submitJoin, {});
  const v = state.values ?? {};
  // Remount after an error so every field (including the dropdowns) starts from what the visitor typed.
  const formKey = state.error ? JSON.stringify(v) : "fresh";
  const [division, setDivision] = useState(v.division ?? "");
  const shown = branches.filter((b) => String(b.divisionId) === (division || v.division));

  if (state.ok) {
    return (
      <div role="status" className="border-2 border-ink bg-white p-8 text-center sm:p-10">
        <p className="text-2xl font-medium text-brand">{ui.memThanksTitle}</p>
        <p className="mt-3 text-lg text-muted">{ui.memThanksText}</p>
        <Link href={`/${lang}/member/login`} className="btn-primary mt-6 inline-flex min-h-12 items-center justify-center px-8">
          {ui.memLoginButton}
        </Link>
      </div>
    );
  }

  return (
    <form key={formKey} action={action} className="space-y-5 border border-line bg-white p-5 sm:p-9" noValidate>
      {state.error && (
        <p role="alert" className="border-2 border-brand bg-brand/10 px-4 py-3 font-semibold text-brand-deep">
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          {ui.formMobile}
          <input name="mobile" required inputMode="tel" autoComplete="tel-national" maxLength={13} defaultValue={v.mobile} className={input} />
        </label>
        <label className="block font-semibold">
          {ui.formEmail}
          <input name="email" type="email" autoComplete="email" defaultValue={v.email} className={input} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          {ui.formDivision}
          <select name="division" required defaultValue={v.division ?? ""} onChange={(e) => setDivision(e.target.value)} className={input}>
            <option value="" disabled>{ui.formDivisionPick}</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="block font-semibold">
          {ui.memBranch}
          <select name="branch" required defaultValue={v.branch ?? ""} key={division || v.division || "none"} className={input}>
            <option value="" disabled>{ui.memBranchPick}</option>
            {shown.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          {ui.memDepartment}
          <select name="department" required defaultValue={v.department ?? ""} className={input}>
            <option value="" disabled>{ui.memDepartmentPick}</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="block font-semibold">
          {ui.formDesignation}
          <input name="designation" defaultValue={v.designation} className={input} />
        </label>
      </div>
      <label className="block font-semibold">
        {ui.formEmployeeId}
        <input name="employeeId" defaultValue={v.employeeId} className={input} />
      </label>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          {ui.memPassword}
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <label className="block font-semibold">
          {ui.memPassword2}
          <input name="password2" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
      </div>
      <p className="-mt-2 text-sm text-muted">{ui.memPasswordHint}</p>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="consent" required className="mt-1 h-6 w-6 shrink-0" />
        <span>
          {ui.memConsent}{" "}
          <Link href={`/${lang}/pages/privacy-policy`} className="font-semibold text-brand underline underline-offset-4">{ui.memConsentLink}</Link>
        </span>
      </label>

      <button type="submit" disabled={pending} className="btn-primary min-h-12 w-full px-8 text-lg disabled:opacity-60 sm:w-auto">
        {pending ? ui.submitting : ui.submit}
      </button>
      <p className="text-sm text-muted">
        {ui.memHaveAccount}{" "}
        <Link href={`/${lang}/member/login`} className="font-semibold text-brand underline underline-offset-4">{ui.memLoginButton}</Link>
      </p>
    </form>
  );
}
