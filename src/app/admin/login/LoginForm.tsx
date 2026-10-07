"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const input = "mt-1.5 w-full rounded-lg border-2 border-white/15 bg-white/5 px-4 py-3 text-base text-light placeholder:text-dim focus:border-signal focus:outline-none";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-5 rounded-none border border-white/10 bg-white/5 p-7">
      {state.error && (
        <p role="alert" className="rounded-lg border border-signal bg-signal/10 px-4 py-3 text-sm font-semibold text-soft">
          {state.error}
        </p>
      )}
      <label className="block text-sm font-semibold">
        Email
        <input name="email" type="email" required autoComplete="username" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input name="password" type="password" required autoComplete="current-password" className={input} />
      </label>
      <button type="submit" disabled={pending} className="btn-gold w-full px-6 py-3.5 text-lg disabled:opacity-60">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
