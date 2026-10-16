import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import PageHero from "@/components/PageHero";
import { isLang } from "@/lib/i18n";
import { getUi } from "@/lib/queries";
import TrackForm from "./TrackForm";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  return { title: (await getUi(lang)).gTrackTitle };
}

export default async function TrackPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const ui = await getUi(lang);
  return (
    <>
      <PageHero lang={lang} title={ui.gTrackTitle} sub={ui.gTrackText} crumbs={[{ href: `/${lang}`, label: ui.home }, { href: `/${lang}/grievance`, label: ui.gOpenForm }, { label: ui.gTrackTitle }]} />
      <div className="mx-auto grid max-w-wrap gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-12">
        <TrackForm lang={lang} ui={ui} />
        {/* beside the form: where the ticket number comes from, and the way to raise a grievance for someone without one */}
        <aside className="space-y-4 lg:self-start">
          <div className="rounded-md border border-line bg-paper/60 p-5">
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-white text-brand shadow-sm">
              <Icon name="doc" size={18} />
            </span>
            <p className="mt-3 text-sm leading-relaxed text-muted">{ui.gKeepTicket}</p>
          </div>
          <Link href={`/${lang}/grievance`} className="group flex items-center justify-between gap-3 rounded-md border border-line bg-white p-5 font-semibold shadow-sm transition hover:border-brand hover:text-brand">
            {ui.gOpenForm}
            <Icon name="arrow" size={18} className="shrink-0 text-brand transition group-hover:translate-x-1" />
          </Link>
        </aside>
      </div>
    </>
  );
}
