import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getUi } from "@/lib/queries";
import LoginForm from "./LoginForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await getUi(lang)).memLoginTitle, robots: { index: false, follow: false } };
}

export default async function MemberLoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  return (
    <>
      <PageHero lang={lang} title={ui.memLoginTitle} sub={ui.memLoginSub} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: ui.memLoginTitle }]} />
      <div className="mx-auto max-w-xl px-5 py-12 sm:px-8 sm:py-14">
        <LoginForm ui={ui} lang={lang} />
      </div>
    </>
  );
}
