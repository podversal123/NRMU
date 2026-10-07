import type { Metadata } from "next";
import { Poppins, Mukta, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import A11yBar from "@/components/A11yBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getDict, isLang, locales } from "@/lib/i18n";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "devanagari"],
  weight: ["600", "700", "800"],
});
const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDict(lang);
  return {
    title: { default: `${t.orgShort} — ${t.org}`, template: `%s · ${t.orgShort}` },
    description: t.heroSub,
    metadataBase: new URL("https://www.nrmu.net"),
    icons: { icon: "/logo.jpg" },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDict(lang);

  const items = [
    { href: `/${lang}`, label: t.nav.home },
    { href: `/${lang}/orders`, label: t.nav.orders },
    { href: `/${lang}/officials`, label: t.nav.officials },
    { href: `/${lang}/divisions`, label: t.nav.divisions },
    { href: `/${lang}/women`, label: t.nav.women },
    { href: `/${lang}/youth`, label: t.nav.youth },
    { href: `/${lang}/gallery`, label: t.nav.gallery },
  ];

  return (
    <html lang={lang} className={`${poppins.variable} ${mukta.variable} ${mono.variable} antialiased`}>
      <body className="flex min-h-screen flex-col">
        <A11yBar lang={lang} labels={{ skip: t.skip, textSize: t.textSize, contrast: t.contrast }} />
        <Header
          lang={lang}
          org={t.org}
          orgShort={t.orgShort}
          tagline={t.tagline}
          items={items}
          join={t.join}
          search={t.search}
        />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer lang={lang} />
      </body>
    </html>
  );
}
