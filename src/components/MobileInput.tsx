"use client";

import { useState } from "react";

const VALID = /^[6-9]\d{9}$/;

/**
 * Keeps only the ten digits of an Indian mobile number. Letters, spaces and dashes never get in; a pasted
 * "+91 98765 43210" or "098765 43210" loses its country or trunk prefix, and typing stops at ten digits.
 */
export function mobileDigits(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && /^(91|0)/.test(d)) d = d.replace(/^(91|0)/, "");
  return d.slice(0, 10);
}

/** Mobile number field: a fixed +91 in front, digits only, at most ten, and a tick once the number is complete. */
export default function MobileInput({
  name,
  defaultValue = "",
  required,
  className = "",
  onValue,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
  onValue?: (digits: string) => void;
}) {
  const [value, setValue] = useState(() => mobileDigits(defaultValue));
  const ok = VALID.test(value);
  return (
    <span className="relative mt-1.5 block">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-line pl-4 pr-3 font-normal text-muted">
        +91
      </span>
      <input
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        pattern="[6-9][0-9]{9}"
        maxLength={10}
        required={required}
        value={value}
        onChange={(e) => {
          const d = mobileDigits(e.target.value);
          setValue(d);
          onValue?.(d);
        }}
        // field-bare: the border shows focus, so the site-wide gold focus outline would only double it
        className={`${className} field-bare pl-[4.25rem] pr-11 tabular-nums tracking-wide`}
      />
      {ok && (
        <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-green-700" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </span>
  );
}
