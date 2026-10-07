import type { Metadata } from "next";
import { Cormorant_Garamond, Jost, Tiro_Devanagari_Hindi, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { isLang, locales } from "@/lib/i18n";
import { getNav, getSettings, pick, setting, getUi } from "@/lib/queries";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const tiro = Tiro_Devanagari_Hindi({
  variable: "--font-tiro",
  subsets: ["devanagari", "latin"],
  weight: "400",
});
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const s = await getSettings();
  const short = setting(s, "org.short", lang);
  return {
    title: { default: `${short} — ${setting(s, "org.name", lang)}`, template: `%s · ${short}` },
    description: setting(s, "hero.sub", lang),
    metadataBase: new URL("https://www.nrmu.net"),
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = await getUi(lang);
  const [s, nav] = await Promise.all([getSettings(), getNav("header")]);

  const items = nav.map((n) => ({
    href: `/${lang}${n.href}`,
    label: pick(lang, n.labelEn, n.labelHi),
  }));

  return (
    <html lang={lang} className={`${cormorant.variable} ${jost.variable} ${tiro.variable} ${mono.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <Header
          lang={lang}
          orgShort={setting(s, "org.short", lang)}
          city={setting(s, "org.city", lang)}
          items={items}
          join={setting(s, "cta.join", lang)}
          labels={{
            skip: t.skip,
            textSize: t.textSize,
            textSmaller: t.textSmaller,
            textDefault: t.textDefault,
            textLarger: t.textLarger,
            menu: t.menu,
            search: t.search,
            langSwitch: t.langSwitch,
            navPrimary: t.navPrimary,
            navMobile: t.navMobile,
          }}
        />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
