import Image from "next/image";
import Link from "next/link";
import { altLang, type Lang } from "@/lib/i18n";
import { getDivisions, getFooterLinks, getNav, getSettings, getUi, pick, setting } from "@/lib/queries";
import FooterGroup from "./FooterGroup";
import HangingCard from "./HangingCard";
import Icon from "./Icon";

const YEAR = new Date().getFullYear();

/** Social profiles, in this order. Each one shows only when its address is filled in the admin (Site text, Social media links). */
const SOCIAL = [
  { key: "social.facebook", name: "Facebook", icon: "facebook" },
  { key: "social.youtube", name: "YouTube", icon: "youtube" },
  { key: "social.x", name: "X", icon: "x" },
  { key: "social.instagram", name: "Instagram", icon: "instagram" },
  { key: "social.whatsapp", name: "WhatsApp", icon: "whatsapp" },
];

/**
 * Footer over a railway photograph. From tablet width up it is exactly one screen tall: the photo band on top
 * takes whatever room the links leave, so the whole footer fits without scrolling on any screen size. On phones the
 * link columns fold into sections that open with a tap. The sticky menu slides away while this is in view.
 */
export default async function Footer({ lang }: { lang: Lang }) {
  const [s, ui, nav, links, policy, divisions] = await Promise.all([
    getSettings(),
    getUi(lang),
    getNav("footer"),
    getFooterLinks("links"),
    getFooterLinks("policy"),
    getDivisions(),
  ]);
  const t = (key: string) => setting(s, key, lang);
  const other = altLang(lang);
  const image = t("footer.image");
  const h = "text-sm font-bold uppercase tracking-[0.14em] text-signal";
  const link = "inline-block py-1.5 text-[0.95rem] text-light/80 decoration-signal/60 underline-offset-4 transition-colors hover:text-soft hover:underline";
  const href = (h2: string) => (/^https?:/.test(h2) ? h2 : `/${lang}${h2}`);

  // Contact details: every line is optional and comes from the admin. Phone numbers and email addresses can be tapped.
  const phones = t("contact.phone").split(/[,/]/).map((p) => p.trim()).filter(Boolean);
  const emails = t("contact.email").split(/[,\s]+/).filter(Boolean);
  const address = t("contact.address") || t("footer.address");
  const hours = t("contact.hours");
  const social = SOCIAL.map((x) => ({ ...x, url: s[x.key]?.en?.trim() ?? "" })).filter((x) => /^https?:\/\//.test(x.url));

  return (
    <footer id="site-footer" className="print-chrome relative isolate flex flex-col overflow-hidden bg-ink text-light md:min-h-[100svh]">
      {/* photograph, drifting very slowly, under layered shades: lighter at the top so the photo shows, dark under the links */}
      {image && <Image src={image} alt="" fill sizes="100vw" className="footer-photo -z-30 object-cover object-[50%_60%]" />}
      <div aria-hidden className="absolute inset-0 -z-20 bg-gradient-to-b from-ink/55 via-ink/80 to-ink/95" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_20%,rgba(138,33,29,0.45),transparent_55%)]" />
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand via-signal to-brand" />

      {/* 1. name band: takes two thirds of the free height of a tall screen (the last third sits under the links) */}
      <div className="flex min-h-0 flex-[2] items-center">
        <div className="mx-auto flex w-full max-w-wrap flex-col gap-5 px-5 py-6 sm:px-8 md:gap-6 md:py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <Image src="/logo.jpg" alt="" width={88} height={88} className="h-16 w-16 shrink-0 rounded-full ring-2 ring-signal/70 sm:h-[5.5rem] sm:w-[5.5rem]" />
            <div className="min-w-0">
              <p className="text-[1.6rem] font-bold leading-tight text-white sm:text-[2.2rem]">{t("org.name")}</p>
              <p className="mt-1 text-soft/90 sm:text-lg">
                {setting(s, "org.name", other)} · {t("org.city")}
              </p>
            </div>
          </div>
          {/* membership card on a short lanyard, where the join buttons used to be */}
          <HangingCard
            short={t("org.short")}
            name={t("org.name")}
            altName={setting(s, "org.name", other)}
            cardTitle={ui.memCardTitle}
            city={t("org.city")}
            address={address}
          />
        </div>
      </div>

      {/* 2. links on a dark glass panel, lifted a little by the free space under it */}
      <div className="mx-auto w-full max-w-wrap px-5 sm:px-8">
        <div
          className={`grid grid-cols-1 rounded-lg bg-ink/60 px-6 pb-1 pt-5 backdrop-blur-md md:grid-cols-2 md:gap-x-10 md:gap-y-8 md:px-8 md:py-9 ${
            links.length > 0 ? "lg:grid-cols-[1.2fr_1.75fr_1.2fr_1.2fr]" : "lg:grid-cols-[1.3fr_1.6fr_1.3fr]"
          }`}
        >
          {/* about, contact and social: always open, also on phones */}
          <div className="min-w-0 pb-5 md:pb-0">
            <h2 className={h}>{t("org.short")}</h2>
            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-light/80">{t("footer.about")}</p>
            <address className="mt-4 space-y-2 text-[0.95rem] not-italic text-light/80">
              {address && (
                <p className="flex gap-2.5">
                  <Icon name="pin" size={17} className="mt-0.5 shrink-0 text-signal" />
                  <span className="sr-only">{ui.cAddress}: </span>
                  <span>{address}</span>
                </p>
              )}
              {phones.length > 0 && (
                <p className="flex gap-2.5">
                  <Icon name="phone" size={17} className="mt-0.5 shrink-0 text-signal" />
                  <span className="sr-only">{ui.cPhone}: </span>
                  <span className="flex flex-wrap gap-x-3">
                    {phones.map((p) => (
                      <a key={p} href={`tel:${p.replace(/[^\d+]/g, "")}`} className="hover:text-soft hover:underline">
                        {p}
                      </a>
                    ))}
                  </span>
                </p>
              )}
              {emails.length > 0 && (
                <p className="flex gap-2.5">
                  <Icon name="mail" size={17} className="mt-0.5 shrink-0 text-signal" />
                  <span className="sr-only">{ui.cEmail}: </span>
                  <span className="flex min-w-0 flex-wrap gap-x-3">
                    {emails.map((m) => (
                      <a key={m} href={`mailto:${m}`} className="break-all hover:text-soft hover:underline">
                        {m}
                      </a>
                    ))}
                  </span>
                </p>
              )}
              {hours && (
                <p className="flex gap-2.5">
                  <Icon name="clock" size={17} className="mt-0.5 shrink-0 text-signal" />
                  <span className="sr-only">{ui.cHours}: </span>
                  <span>{hours}</span>
                </p>
              )}
            </address>
            {social.length > 0 && (
              <div className="mt-5">
                <p className="sr-only">{t("footer.follow_title")}</p>
                <ul className="flex flex-wrap gap-2">
                  {social.map((x) => (
                    <li key={x.key}>
                      <a
                        href={x.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${x.name} (${ui.newTab})`}
                        title={x.name}
                        className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-light transition hover:bg-signal hover:text-ink"
                      >
                        <Icon name={x.icon} size={18} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <FooterGroup title={t("footer.explore")} headingClass={h}>
            <ul className="grid grid-cols-2 gap-x-6">
              {nav.map((n) => (
                <li key={n.id}>
                  <Link href={href(n.href)} className={link}>
                    {pick(lang, n.labelEn, n.labelHi, n.i18n?.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterGroup>

          {links.length > 0 && (
            <FooterGroup title={t("footer.important_links")} headingClass={h}>
              <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-1">
                {links.map((n) => (
                  <li key={n.id}>
                    <a href={n.href} target="_blank" rel="noopener noreferrer" className={`${link} group`}>
                      {pick(lang, n.labelEn, n.labelHi, n.i18n?.label)}
                      <Icon name="external" size={12} className="ml-1.5 inline-block -translate-y-px opacity-60 group-hover:opacity-100" />
                      <span className="sr-only"> ({ui.newTab})</span>
                    </a>
                  </li>
                ))}
              </ul>
            </FooterGroup>
          )}

          <FooterGroup title={t("stats.divisions")} headingClass={h}>
            <ul className="grid grid-cols-2 gap-x-6">
              {divisions.map((d) => (
                <li key={d.slug}>
                  <Link href={`/${lang}/divisions/${d.slug}`} className={link}>
                    {pick(lang, d.nameEn, d.nameHi, d.i18n?.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </FooterGroup>
        </div>
      </div>
      <div aria-hidden className="hidden min-h-0 flex-1 md:block" />

      {/* 3. bottom bar: website policies, then copyright. Room is left on the right (and on phones, below)
          for the back-to-top button, which floats in the lower right corner. */}
      <div className="mx-auto w-full max-w-wrap px-5 pb-[4.5rem] pt-4 text-sm text-light/70 sm:px-8 md:py-4 md:pr-20 2xl:pr-8">
        {policy.length > 0 && (
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {policy.map((p) => (
              <li key={p.id}>
                <Link href={href(p.href)} className="inline-block py-1.5 decoration-signal/60 underline-offset-4 hover:text-soft hover:underline md:py-1">
                  {pick(lang, p.labelEn, p.labelHi, p.i18n?.label)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t border-white/10 pt-3">
          <p>
            © {YEAR} {t("org.name")}. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
