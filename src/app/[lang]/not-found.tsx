import Link from "next/link";

/** Shown for missing pages. Both languages are displayed because the language segment is unknown here. */
import { getUi } from "@/lib/queries";

export default async function NotFound() {
  const en = await getUi("en");
  const hi = await getUi("hi");
  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-48 text-center sm:px-6">
      <p className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-brand">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold sm:text-2xl">
        {en.notFoundTitle}
        <span className="mt-2 block text-2xl text-muted sm:text-2xl">{hi.notFoundTitle}</span>
      </h1>
      <p className="mt-5 text-lg text-muted">{en.notFoundText}</p>
      <p className="text-lg text-muted">{hi.notFoundText}</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <Link href="/en" className="btn-primary px-7 py-3">
          {en.goHome}
        </Link>
        <Link href="/hi" className="rounded-full border-2 border-ink px-7 py-3 font-bold hover:bg-ink hover:text-white">
          {hi.goHome}
        </Link>
      </div>
    </div>
  );
}
