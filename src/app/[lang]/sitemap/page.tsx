import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getDivisions, getFooterLinks, getMenu, getSettings, getUi, pick, setting } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? (await getUi(lang)).sitemapTitle : undefined };
}

/** A readable map of the whole website, built from the menu and the divisions in the database. */
export default async function SitemapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, menu, divisions, links, policy, s] = await Promise.all([getUi(lang), getMenu(), getDivisions(), getFooterLinks("links"), getFooterLinks("policy"), getSettings()]);
  const href = (h: string) => (/^https?:/.test(h) ? h : `/${lang}${h}`);
  const h = "font-display text-2xl";
  return (
    <>
      <PageHero lang={lang} title={ui.sitemapTitle} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: ui.sitemapTitle }]} />
      <div className="mx-auto grid max-w-wrap gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
        {menu.map((m) => (
          <section key={m.id}>
            <h2 className={h}>{m.href === "#" ? pick(lang, m.labelEn, m.labelHi) : <Link href={href(m.href)} className="hover:text-brand">{pick(lang, m.labelEn, m.labelHi)}</Link>}</h2>
            {m.children.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-ink pt-3">
                {m.children.map((c) => (
                  <li key={c.id}><Link href={href(c.href)} className="hover:text-brand">{pick(lang, c.labelEn, c.labelHi)}</Link></li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section>
          <h2 className={h}>{setting(s, "stats.divisions", lang)}</h2>
          <ul className="mt-3 space-y-2 border-t border-ink pt-3">
            {divisions.map((d) => (
              <li key={d.slug}><Link href={`/${lang}/divisions/${d.slug}`} className="hover:text-brand">{pick(lang, d.nameEn, d.nameHi)}</Link></li>
            ))}
          </ul>
        </section>
        {policy.length > 0 && (
          <section>
            <h2 className={h}>{setting(s, "footer.important_links", lang)}</h2>
            <ul className="mt-3 space-y-2 border-t border-ink pt-3">
              {policy.map((p) => (
                <li key={p.id}><Link href={href(p.href)} className="hover:text-brand">{pick(lang, p.labelEn, p.labelHi)}</Link></li>
              ))}
              {links.map((p) => (
                <li key={p.id}><a href={p.href} target="_blank" rel="noopener noreferrer" className="hover:text-brand">{pick(lang, p.labelEn, p.labelHi)} ↗</a></li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
