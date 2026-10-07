import Link from "next/link";

export const inputCls =
  "mt-1.5 w-full rounded-lg border-2 border-line bg-white px-3.5 py-2.5 text-base focus:border-ink focus:outline-none";

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-5xl font-semibold leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-none border border-line bg-white p-6 ${className}`}>{children}</section>;
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-sm font-semibold ${className}`}>
      {label}
      {children}
      {hint && <span className="mt-1 block text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function LinkButton({ href, children, variant = "gold" }: { href: string; children: React.ReactNode; variant?: "gold" | "line" }) {
  return variant === "gold" ? (
    <Link href={href} className="btn-gold px-5 py-2.5 text-sm">
      {children}
    </Link>
  ) : (
    <Link href={href} className="rounded-full border-2 border-ink px-5 py-2 text-sm font-semibold hover:bg-ink hover:text-white">
      {children}
    </Link>
  );
}

export function Notice({ kind = "ok", children }: { kind?: "ok" | "err"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "err" ? "alert" : "status"}
      className={`mb-6 rounded-lg border-2 px-4 py-3 text-sm font-semibold ${kind === "ok" ? "border-ink bg-soft/50" : "border-brand bg-brand/10 text-brand-deep"}`}
    >
      {children}
    </p>
  );
}

export const th = "px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted";
export const td = "px-4 py-3 align-top";
