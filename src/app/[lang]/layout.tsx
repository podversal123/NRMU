import type { Metadata } from "next";
import {
  Geist_Mono,
  Noto_Naskh_Arabic,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Meetei_Mayek,
  Noto_Sans_Ol_Chiki,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
  Roboto,
} from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import "../globals.css";
import Header from "@/components/Header";
import { TEXT_SIZES } from "@/lib/text-size";
import Footer from "@/components/Footer";
import BackToTop from "@/components/BackToTop";
import { altLang, isLang, isRtl } from "@/lib/i18n";
import { getMenu, getSettings, pick, setting, getUi } from "@/lib/queries";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-deva",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "700"],
});
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
// Fonts for the scripts of the other languages. Not preloaded: a browser downloads one only when the page has text in that script.
const bengali = Noto_Sans_Bengali({ variable: "--font-noto-beng", subsets: ["bengali"], weight: ["400", "500", "700"], preload: false });
const gujarati = Noto_Sans_Gujarati({ variable: "--font-noto-gujr", subsets: ["gujarati"], weight: ["400", "500", "700"], preload: false });
const gurmukhi = Noto_Sans_Gurmukhi({ variable: "--font-noto-guru", subsets: ["gurmukhi"], weight: ["400", "500", "700"], preload: false });
const kannada = Noto_Sans_Kannada({ variable: "--font-noto-knda", subsets: ["kannada"], weight: ["400", "500", "700"], preload: false });
const malayalam = Noto_Sans_Malayalam({ variable: "--font-noto-mlym", subsets: ["malayalam"], weight: ["400", "500", "700"], preload: false });
const oriya = Noto_Sans_Oriya({ variable: "--font-noto-orya", subsets: ["oriya"], weight: ["400", "500", "700"], preload: false });
const tamil = Noto_Sans_Tamil({ variable: "--font-noto-taml", subsets: ["tamil"], weight: ["400", "500", "700"], preload: false });
const telugu = Noto_Sans_Telugu({ variable: "--font-noto-telu", subsets: ["telugu"], weight: ["400", "500", "700"], preload: false });
const olChiki = Noto_Sans_Ol_Chiki({ variable: "--font-noto-olck", subsets: ["ol-chiki"], weight: ["400", "500", "700"], preload: false });
const meetei = Noto_Sans_Meetei_Mayek({ variable: "--font-noto-mtei", subsets: ["meetei-mayek"], weight: ["400", "500", "700"], preload: false });
const arabic = Noto_Naskh_Arabic({ variable: "--font-noto-arab", subsets: ["arabic"], weight: ["400", "500", "700"], preload: false });
const scripts = [bengali, gujarati, gurmukhi, kannada, malayalam, oriya, tamil, telugu, olChiki, meetei, arabic];

/** English and Hindi are built ahead; the other languages are rendered on the first visit and then kept. */
export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "hi" }];
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const s = await getSettings();
  const short = setting(s, "org.short", lang);
  return {
    title: { default: `${short} | ${setting(s, "org.name", lang)}`, template: `%s · ${short}` },
    description: setting(s, "hero.sub", lang),
    metadataBase: new URL("https://www.nrmu.net"),
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = await getUi(lang);
  const [s, menuTree] = await Promise.all([getSettings(), getMenu()]);

  const menu = menuTree.map((m) => ({
    id: m.id,
    href: m.href,
    label: pick(lang, m.labelEn, m.labelHi, m.i18n?.label),
    children: m.children.map((c) => ({
      href: c.href,
      label: pick(lang, c.labelEn, c.labelHi, c.i18n?.label),
      children: c.children.map((g) => ({ href: g.href, label: pick(lang, g.labelEn, g.labelHi, g.i18n?.label) })),
    })),
  }));
  const other = altLang(lang);

  return (
    <html
      lang={lang}
      dir={isRtl(lang) ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`${roboto.variable} ${notoDevanagari.variable} ${scripts.map((f) => f.variable).join(" ")} ${mono.variable} antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        {/* Applies the visitor's saved text size before the first paint, so the page does not jump when it loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var r=localStorage.getItem("nrmu-size"),s=r===null?NaN:Number(r),z=${JSON.stringify(TEXT_SIZES)};if(Number.isInteger(s)&&s>=0&&s<z.length)document.documentElement.style.setProperty("--user-scale",String(z[s]));if(localStorage.getItem("nrmu-contrast")==="1")document.documentElement.setAttribute("data-contrast","high")}catch(e){}`,
          }}
        />
        {/* The header reads the current address (to mark the open menu item). Pages whose address is only known per request
            need a boundary around it; the placeholder keeps the same height so nothing jumps when the real header arrives. */}
        <Suspense
          fallback={
            <div aria-hidden>
              <div className="h-11 bg-ink lg:h-9" />
              <div className="h-[5.6rem] border-b border-line bg-white sm:h-[6.6rem]" />
              <div className="h-12 bg-ink" />
            </div>
          }
        >
        <Header
          lang={lang}
          orgName={setting(s, "org.name", lang)}
          orgAltName={setting(s, "org.name", other)}
          orgShort={setting(s, "org.short", lang)}
          orgAltShort={setting(s, "org.short", other)}
          menu={menu}
          join={setting(s, "cta.join", lang)}
          labels={{
            skip: t.skip,
            textSize: t.textSize,
            textSmaller: t.textSmaller,
            textDefault: t.textDefault,
            textLarger: t.textLarger,
            textContrast: t.textContrast,
            menu: t.menu,
            search: t.search,
            langSwitch: t.langSwitch,
            navPrimary: t.navPrimary,
            navMobile: t.navMobile,
            memberLogin: t.memHeaderLogin,
          }}
        />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} />
        <BackToTop label={t.backToTop} />
      </body>
    </html>
  );
}
