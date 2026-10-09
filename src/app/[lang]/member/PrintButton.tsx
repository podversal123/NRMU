"use client";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary inline-flex min-h-12 items-center justify-center px-6">
      {label}
    </button>
  );
}
