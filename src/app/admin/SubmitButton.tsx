"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-gold px-6 py-2.5" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Delete button that asks for confirmation before the form is submitted. */
export function DeleteButton({ label = "Delete", confirmText }: { label?: string; confirmText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      className="rounded-full border-2 border-brand px-4 py-1.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white disabled:opacity-60"
    >
      {label}
    </button>
  );
}
