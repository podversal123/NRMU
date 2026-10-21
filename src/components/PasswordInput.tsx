"use client";

import { useState } from "react";

/** Password field with an eye button that shows or hides what was typed. */
export default function PasswordInput({
  name,
  autoComplete,
  className = "",
  showLabel,
  hideLabel,
  required,
  minLength,
  onValue,
  describedBy,
  placeholder,
}: {
  name: string;
  autoComplete: "current-password" | "new-password";
  className?: string;
  showLabel: string;
  hideLabel: string;
  required?: boolean;
  minLength?: number;
  onValue?: (value: string) => void;
  describedBy?: string;
  placeholder?: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <span className="relative mt-1.5 block">
      <input
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-describedby={describedBy}
        placeholder={placeholder}
        onChange={(e) => onValue?.(e.target.value)}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? hideLabel : showLabel}
        aria-pressed={shown}
        title={shown ? hideLabel : showLabel}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted transition-colors hover:text-brand"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="m4 4 16 16" />}
        </svg>
      </button>
    </span>
  );
}
