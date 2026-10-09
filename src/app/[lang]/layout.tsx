import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Devanagari, Roboto } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import "../globals.css";
import Header from "@/components/Header";
import { TEXT_SIZES } from "@/lib/text-size";
import Footer from "@/components/Footer";
import { isLang, locales } from "@/lib/i18n";
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
  const [s, menuTree] = await Promise.all([getSettings(), getMenu()]);

  const menu = menuTree.map((m) => ({
    id: m.id,
    href: m.href,
    label: pick(lang, m.labelEn, m.labelHi),
    children: m.children.map((c) => ({ href: c.href, label: pick(lang, c.labelEn, c.labelHi) })),
  }));
  const other = lang === "en" ? "hi" : "en";

  return (
    <html lang={lang} suppressHydrationWarning className={`${roboto.variable} ${notoDevanagari.variable} ${mono.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        {/* Applies the visitor's saved text size before the first paint, so the page does not jump when it loads. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var r=localStorage.getItem("nrmu-size"),s=r===null?NaN:Number(r),z=${JSON.stringify(TEXT_SIZES)};if(Number.isInteger(s)&&s>=0&&s<z.length)document.documentElement.style.setProperty("--user-scale",String(z[s]))}catch(e){}`,
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
          menu={menu}
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
            memberLogin: t.memHeaderLogin,
          }}
        />
        </Suspense>
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
