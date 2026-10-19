"use client";

import Link from "next/link";
import { CardTitle, memberButton, memberCard, memberField as field, Req, Section } from "@/components/FormParts";
import MobileInput from "@/components/MobileInput";
import PasswordInput from "@/components/PasswordInput";
import Select from "@/components/Select";
import { useActionState, useState } from "react";
import { submitJoin, type JoinState } from "./actions";
import type { Dict, Lang } from "@/lib/i18n";

const input = `mt-1.5 ${field}`;

type Option = { id: number; name: string };
type Props = {
  ui: Dict;
  lang: Lang;
  divisions: Option[];
  branches: (Option & { divisionId: number })[];
  departments: Option[];
};

export default function JoinForm(props: Props) {
  const { ui, lang } = props;
  const [state, action, pending] = useActionState<JoinState, FormData>(submitJoin, {});
  const v = state.values ?? {};
  // Remount after an error so every field (including the dropdowns) starts from what the visitor typed.
  const formKey = state.error ? JSON.stringify(v) : "fresh";

  if (state.ok) {
    return (
      <div role="status" className={`${memberCard} drawer-l`}>
        <CardTitle title={ui.memJoinNow} />
        <div className="p-8 sm:p-10">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-green-100 text-green-800">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12 5 5 9-10" />
            </svg>
          </span>
          <p className="mt-5 font-display text-2xl font-semibold">{ui.memThanksTitle}</p>
          <p className="mt-3 text-muted">{ui.memThanksText}</p>
          <Link href={`/${lang}/member/login`} className={`${memberButton} mt-7 sm:w-auto`}>
            {ui.memLoginButton}
          </Link>
        </div>
      </div>
    );
  }

  return <FormBody key={formKey} {...props} state={state} action={action} pending={pending} />;
}

function FormBody({ ui, lang, divisions, branches, departments, state, action, pending }: Props & { state: JoinState; action: (f: FormData) => void; pending: boolean }) {
  const v = state.values ?? {};
  const [division, setDivision] = useState(v.division ?? "");
  const shown = branches.filter((b) => String(b.divisionId) === division);

  return (
    <form action={action} className={`${memberCard} drawer-l`} noValidate>
      <CardTitle title={ui.memJoinNow} />
      <div className="space-y-8 p-6 sm:p-8">
        {state.error && (
          <p role="alert" className="rounded-md border border-brand bg-brand/10 px-4 py-3 font-medium text-brand-deep">
            {ui[state.error]}
          </p>
        )}
        <div className="hidden" aria-hidden>
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <section aria-labelledby="j-personal">
          <Section n={1} id="j-personal" title={ui.memSecPersonal} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block font-medium sm:col-span-2">
              {ui.formName}
              <Req />
              <input name="name" required autoComplete="name" defaultValue={v.name} className={input} />
            </label>
            <label className="block font-medium">
              {ui.formMobile}
              <Req />
              <MobileInput name="mobile" required defaultValue={v.mobile} className={field} />
            </label>
            <label className="block font-medium">
              {ui.formEmail}
              <input name="email" type="email" autoComplete="email" defaultValue={v.email} className={input} />
            </label>
          </div>
        </section>

        <section aria-labelledby="j-work">
          <Section n={2} id="j-work" title={ui.memSecWork} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block font-medium">
              {ui.formDivision}
              <Req />
              <Select
                name="division"
                defaultValue={v.division ?? ""}
                onChange={setDivision}
                placeholder={ui.formDivisionPick}
                clearable={false}
                options={divisions.map((d) => ({ value: String(d.id), label: d.name }))}
                className={`${input} font-normal`}
              />
            </label>
            <label className="block font-medium">
              {ui.memBranch}
              <Req />
              {/* a new division empties the branch, since branches belong to one division */}
              <Select
                key={division || "none"}
                name="branch"
                defaultValue={division === v.division ? (v.branch ?? "") : ""}
                placeholder={ui.memBranchPick}
                clearable={false}
                options={shown.map((b) => ({ value: String(b.id), label: b.name }))}
                className={`${input} font-normal`}
              />
            </label>
            <label className="block font-medium">
              {ui.memDepartment}
              <Req />
              <Select
                name="department"
                defaultValue={v.department ?? ""}
                placeholder={ui.memDepartmentPick}
                clearable={false}
                options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
                className={`${input} font-normal`}
              />
            </label>
            <label className="block font-medium">
              {ui.formDesignation}
              <input name="designation" defaultValue={v.designation} className={input} />
            </label>
            <label className="block font-medium sm:col-span-2">
              {ui.formEmployeeId}
              <input name="employeeId" defaultValue={v.employeeId} className={input} />
            </label>
          </div>
        </section>

        <section aria-labelledby="j-account">
          <Section n={3} id="j-account" title={ui.memSecAccount} />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block font-medium">
              {ui.memPassword}
              <Req />
              <PasswordInput name="password" autoComplete="new-password" required minLength={8} describedBy="j-pw-hint" showLabel={ui.pwShow} hideLabel={ui.pwHide} className={field} />
            </label>
            <label className="block font-medium">
              {ui.memPassword2}
              <Req />
              <PasswordInput name="password2" autoComplete="new-password" required minLength={8} showLabel={ui.pwShow} hideLabel={ui.pwHide} className={field} />
            </label>
            <p id="j-pw-hint" className="-mt-2 text-sm text-muted sm:col-span-2">
              {ui.memPasswordHint}
            </p>
            <label className="flex items-start gap-3 rounded-md border border-line bg-paper/60 p-4 sm:col-span-2">
              <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]" />
              <span>
                {ui.memConsent}{" "}
                <Link href={`/${lang}/pages/privacy-policy`} className="font-semibold text-brand underline underline-offset-4">
                  {ui.memConsentLink}
                </Link>
              </span>
            </label>
          </div>
        </section>

        <div className="space-y-4">
          <button type="submit" disabled={pending} className={memberButton}>
            {pending ? ui.submitting : ui.submit}
          </button>
          <p className="text-center text-sm text-muted">
            {ui.memHaveAccount}{" "}
            <Link href={`/${lang}/member/login`} className="font-semibold text-brand underline underline-offset-4">
              {ui.memLoginButton}
            </Link>
          </p>
        </div>
      </div>
    </form>
  );
}
