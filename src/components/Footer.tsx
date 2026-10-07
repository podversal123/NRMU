import Image from "next/image";
import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import { getDivisions, getNav, getSettings, pick, setting } from "@/lib/queries";

const YEAR = new Date().getFullYear();

/** Full-screen footer over a railway photograph. The fixed header slides away while this is in view. */
export default async function Footer({ lang }: { lang: Lang }) {
  const [s, nav, divisions] = await Promise.all([getSettings(), getNav("footer"), getDivisions()]);
  const t = (key: string) => setting(s, key, lang);
  const image = t("footer.image");
  const h = "font-display text-2xl text-soft";

  return (
    <footer id="site-footer" className="relative isolate flex min-h-[100svh] flex-col justify-between overflow-hidden bg-ink text-light">
      {image && <Image src={image} alt="" fill sizes="100vw" className="-z-10 object-cover object-[50%_60%]" />}
      <div className="absolute inset-0 -z-10 bg-ink/80" />

      <div className="mx-auto w-full max-w-[1180px] px-5 pt-24 sm:px-8 sm:pt-28">
        <p className="max-w-[16ch] font-display text-[clamp(2.4rem,5.4vw,4.4rem)] font-semibold leading-[1.05]">{t("org.tagline")}</p>
        <div className="rule mt-8" />
      </div>

      <div className="mx-auto grid w-full max-w-[1180px] gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3.5">
            <Image src="/logo.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
            <div className="leading-tight">
              <p className="font-display text-3xl font-bold tracking-[0.03em]">{t("org.short")}</p>
              <p className="text-sm text-light/75">{t("org.city")}</p>
            </div>
          </div>
          <p className="mt-6 max-w-sm leading-relaxed text-light/80">{t("footer.about")}</p>
        </div>

        <div>
          <h2 className={h}>{t("footer.explore")}</h2>
          <ul className="mt-4 space-y-2.5">
            {nav.map((n) => (
              <li key={n.id}>
                <Link href={`/${lang}${n.href}`} className="text-light/80 hover:text-soft">
                  {pick(lang, n.labelEn, n.labelHi)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={h}>{t("stats.divisions")}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-1">
            {divisions.map((d) => (
              <li key={d.slug}>
                <Link href={`/${lang}/divisions/${d.slug}`} className="text-light/80 hover:text-soft">
                  {pick(lang, d.nameEn, d.nameHi)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={h}>{t("footer.contact")}</h2>
          <address className="mt-4 space-y-3 not-italic text-light/80">
            <p>{t("footer.address")}</p>
            <p>
              <a href={t("footer.airf_url")} className="underline decoration-signal underline-offset-4 hover:text-soft">
                {t("footer.airf_label")}
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-white/15">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-5 py-5 text-sm text-light/70 sm:px-8">
          <p>
            © {YEAR} {t("org.name")}. {t("footer.rights")}
          </p>
          <p>{t("site.domain")}</p>
        </div>
      </div>
    </footer>
  );
}
