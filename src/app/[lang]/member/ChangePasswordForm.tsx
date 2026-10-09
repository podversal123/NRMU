"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";
import type { Dict, Lang } from "@/lib/i18n";

const input = "mt-1.5 w-full border border-line bg-white px-4 py-3 text-base focus:border-ink focus:outline-none";

export default function ChangePasswordForm({ ui, lang }: { ui: Dict; lang: Lang }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(changePassword, {});
  return (
    <section aria-labelledby="pw-h" className="border border-line bg-white p-5 sm:p-8">
      <h2 id="pw-h" className="text-xl font-medium">{ui.memChangeTitle}</h2>
      <form key={state.done ? "done" : "form"} action={action} className="mt-5 space-y-4" noValidate>
        <input type="hidden" name="lang" value={lang} />
        {state.error && <p role="alert" className="border-2 border-brand bg-brand/10 px-4 py-3 font-semibold text-brand-deep">{ui[state.error]}</p>}
        {state.done && <p role="status" className="border-2 border-ink bg-soft/40 px-4 py-3 font-semibold">{ui.memChanged}</p>}
        <label className="block font-semibold">
          {ui.memCurrent}
          <input name="current" type="password" required autoComplete="current-password" className={input} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block font-semibold">
            {ui.memNew}
            <input name="next" type="password" required minLength={8} autoComplete="new-password" className={input} />
          </label>
          <label className="block font-semibold">
            {ui.memPassword2}
            <input name="again" type="password" required minLength={8} autoComplete="new-password" className={input} />
          </label>
        </div>
        <button type="submit" disabled={pending} className="btn-primary min-h-12 px-8 disabled:opacity-60">
          {pending ? ui.submitting : ui.memChangeButton}
        </button>
      </form>
    </section>
  );
}
