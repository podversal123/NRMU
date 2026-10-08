import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getSettings, getUi } from "@/lib/queries";

/** Dark title band with a railway photograph, sits under the fixed header. */
export default async function PageHero({
  lang,
  title,
  sub,
  crumbs,
}: {
  lang: Lang;
  title: string;
  sub?: string;
  crumbs?: { href?: string; label: string }[];
}) {
  const [s, ui] = await Promise.all([getSettings(), getUi(lang)]);
  const image = s["page.hero_image"]?.en;
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-light">
        {image && <Image src={image} alt="" fill priority sizes="100vw" className="-z-10 object-cover object-[50%_58%]" />}
        <div className="absolute inset-0 -z-10 bg-ink/75" />
        <div className="mx-auto max-w-[1180px] px-5 pb-12 pt-12 sm:px-8 sm:pb-14 sm:pt-14">
          {crumbs && (
            <nav aria-label={ui.breadcrumb} className="mb-5 flex flex-wrap items-center gap-2 text-sm tracking-[0.02em] text-light/70">
              {crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-2">
                  {c.href ? (
                    <Link href={c.href} className="hover:text-soft">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="max-w-[20rem] truncate text-light">{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && <span aria-hidden>/</span>}
                </span>
              ))}
            </nav>
          )}
          <h1 className="max-w-4xl text-[clamp(1.9rem,3.8vw,3rem)] font-semibold leading-[1.1]">{title}</h1>
          <div className="rule mt-6" />
          {sub && <p className="mt-5 max-w-2xl text-lg text-light/80">{sub}</p>}
        </div>
      </section>
    </>
  );
}
