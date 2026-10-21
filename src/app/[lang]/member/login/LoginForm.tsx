"use client";

import Link from "next/link";
import { useActionState } from "react";
import { memberButton, memberCard, memberField as field } from "@/components/FormParts";
import MobileInput from "@/components/MobileInput";
import PasswordInput from "@/components/PasswordInput";
import { memberLogin, type LoginState } from "../actions";
import type { Dict, Lang } from "@/lib/i18n";

export default function LoginForm({ ui, lang }: { ui: Dict; lang: Lang }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(memberLogin, {});
  return (
    <form action={action} className={`${memberCard} drawer-l`} noValidate>
      <input type="hidden" name="lang" value={lang} />
      {/* no title band: the page title right above already names the form, and leaving it out keeps the whole card on one screen */}
      <div className="space-y-4 px-6 pb-[1.375rem] pt-6 sm:px-8">
        {state.error && (
          <p role="alert" className="rounded-md border border-brand bg-brand/10 px-4 py-3 font-medium text-brand-deep">
            {ui[state.error]}
          </p>
        )}
        <label className="block font-medium">
          {ui.formMobile}
          {/* remount on each answer so the number the server sends back is shown */}
          <MobileInput key={state.mobile ?? ""} name="mobile" required autoComplete="username" placeholder={ui.phMobile} defaultValue={state.mobile} className={field} />
        </label>
        <label className="block font-medium">
          {ui.memLoginPassword}
          <PasswordInput name="password" autoComplete="current-password" required placeholder={ui.phLoginPassword} showLabel={ui.pwShow} hideLabel={ui.pwHide} className={field} />
        </label>
        <button type="submit" disabled={pending} className={memberButton}>
          {pending ? ui.submitting : ui.memLoginButton}
        </button>
        <p className="text-sm text-muted">{ui.memForgot}</p>
      </div>
      <p className="rounded-b-md border-t border-line bg-paper/60 px-6 py-4 text-sm sm:px-8">
        {ui.memNotMember}{" "}
        <Link href={`/${lang}/join`} className="font-semibold text-brand underline underline-offset-4">
          {ui.memJoinNow}
        </Link>
      </p>
    </form>
  );
}
