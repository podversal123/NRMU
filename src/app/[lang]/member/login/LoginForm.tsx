"use client";

import Link from "next/link";
import { useActionState } from "react";
import { memberLogin, type LoginState } from "../actions";
import type { Dict, Lang } from "@/lib/i18n";

const input = "mt-1.5 w-full border border-line bg-white px-4 py-3 text-base focus:border-ink focus:outline-none";

export default function LoginForm({ ui, lang }: { ui: Dict; lang: Lang }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(memberLogin, {});
  return (
    <form action={action} className="space-y-5 border border-line bg-white p-5 sm:p-9" noValidate>
      <input type="hidden" name="lang" value={lang} />
      {state.error && (
        <p role="alert" className="border-2 border-brand bg-brand/10 px-4 py-3 font-semibold text-brand-deep">
          {ui[state.error]}
        </p>
      )}
      <label className="block font-semibold">
        {ui.formMobile}
        <input name="mobile" required inputMode="tel" autoComplete="username" maxLength={13} defaultValue={state.mobile} className={input} />
      </label>
      <label className="block font-semibold">
        {ui.memLoginPassword}
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      <button type="submit" disabled={pending} className="btn-primary min-h-12 w-full px-8 text-lg disabled:opacity-60">
        {pending ? ui.submitting : ui.memLoginButton}
      </button>
      <p className="text-sm text-muted">{ui.memForgot}</p>
      <p className="text-sm">
        {ui.memNotMember}{" "}
        <Link href={`/${lang}/join`} className="font-semibold text-brand underline underline-offset-4">{ui.memJoinNow}</Link>
      </p>
    </form>
  );
}
