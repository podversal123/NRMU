import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getDivisions, getFooterLinks, getLastUpdated, getNav, getSettings, getUi, pick, setting } from "@/lib/queries";
import VisitorCounter from "./VisitorCounter";

const YEAR = new Date().getFullYear();

/** Full-screen footer over a railway photograph. The sticky menu slides away while this is in view. */
export default async function Footer({ lang }: { lang: Lang }) {
  const [s, ui, nav, links, policy, divisions, updated] = await Promise.all([
    getSettings(),
    getUi(lang),
    getNav("footer"),
    getFooterLinks("links"),
    getFooterLinks("policy"),
    getDivisions(),
    getLastUpdated(),
  ]);
  const t = (key: string) => setting(s, key, lang);
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const image = t("footer.image");
  const h = "text-lg font-medium text-soft";
  const contact = [t("footer.address"), t("contact.address"), t("contact.phone"), t("contact.email"), t("contact.hours")].filter(Boolean);
  const href = (h2: string) => (/^https?:/.test(h2) ? h2 : `/${lang}${h2}`);

  return (
    <footer id="site-footer" className="relative isolate flex flex-col justify-between overflow-hidden bg-ink text-light md:min-h-[100svh]">
      {image && <Image src={image} alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_60%]" />}
      <div className="absolute inset-0 -z-10 bg-ink/85" />

      <div aria-hidden className="hidden min-h-[34svh] md:block" />

      <div className="mx-auto grid w-full max-w-[1180px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-8 md:gap-10 md:py-14 lg:grid-cols-[1.4fr_1fr_1.2fr_1fr]">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-3.5">
            <Image src="/logo.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
            <div className="leading-tight">
              <p className="text-2xl font-bold tracking-wide">{t("org.short")}</p>
              <p className="text-sm text-light/75">{t("org.city")}</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm leading-relaxed text-light/80">{t("footer.about")}</p>
          {contact.length > 0 && (
            <address className="mt-5 space-y-1 text-[0.95rem] not-italic text-light/80">
              {contact.map((c) => (
                <p key={c}>{c}</p>
              ))}
            </address>
          )}
        </div>

        <div className="min-w-0">
          <h2 className={h}>{t("footer.explore")}</h2>
          <ul className="mt-3 md:mt-4 md:space-y-1">
            {nav.map((n) => (
              <li key={n.id}>
                <Link href={href(n.href)} className="block py-2 text-light/80 hover:text-soft lg:py-1">
                  {pick(lang, n.labelEn, n.labelHi)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {links.length > 0 && (
          <div className="min-w-0">
            <h2 className={h}>{t("footer.important_links")}</h2>
            <ul className="mt-3 md:mt-4 md:space-y-1">
              {links.map((n) => (
                <li key={n.id}>
                  <a href={n.href} target="_blank" rel="noopener noreferrer" className="block py-2 text-light/80 hover:text-soft lg:py-1">
                    {pick(lang, n.labelEn, n.labelHi)} <span aria-hidden>↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="col-span-2 md:col-span-1">
          <h2 className={h}>{t("stats.divisions")}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 md:mt-4 lg:grid-cols-1">
            {divisions.map((d) => (
              <li key={d.slug}>
                <Link href={`/${lang}/divisions/${d.slug}`} className="block py-2 text-light/80 hover:text-soft lg:py-1">
                  {pick(lang, d.nameEn, d.nameHi)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-5 text-sm text-light/75 sm:px-8">
          {policy.length > 0 && (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {policy.map((p) => (
                <li key={p.id}>
                  <Link href={href(p.href)} className="inline-block py-2.5 hover:text-soft">
                    {pick(lang, p.labelEn, p.labelHi)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p>
              © {YEAR} {t("org.name")}. {t("footer.rights")}
            </p>
            <p className="flex flex-wrap gap-x-6 gap-y-1">
              {updated && (
                <span>
                  {ui.lastUpdated}: {new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(updated + "T00:00:00"))}
                </span>
              )}
              <VisitorCounter label={ui.visitors} locale={locale} />
              <span>{t("site.domain")}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
