"use client";

import { useActionState } from "react";
import { resetMemberPassword, type ResetState } from "../actions";

/** Makes a temporary password and shows it once, on this screen only. It is never put in an address or stored in readable form. */
export default function TempPassword({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetMemberPassword, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      {state.error && <p role="alert" className="text-sm font-semibold text-brand">{state.error}</p>}
      {state.temp && (
        <div role="status" className="border-2 border-ink bg-soft/40 p-4">
          <p className="text-sm text-muted">Temporary password (shown only now):</p>
          <p className="mt-1 select-all break-all font-mono text-2xl font-bold tracking-wider">{state.temp}</p>
          <p className="mt-2 text-sm text-muted">Tell the member in person or on the phone. Do not send it in a group.</p>
        </div>
      )}
      <button type="submit" disabled={pending} className="rounded-full border-2 border-ink px-5 py-2.5 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-60">
        {pending ? "Working…" : state.temp ? "Make another one" : "Give a temporary password"}
      </button>
    </form>
  );
}
