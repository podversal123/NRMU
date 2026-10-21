import Link from "next/link";
import Select from "@/components/Select";
import Icon from "@/components/Icon";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import PhotoGrid from "@/components/PhotoGrid";
import { getGalleryAlbums, getLoosePhotos } from "@/lib/content";
import { intlLocale, isLang, type Lang } from "@/lib/i18n";
import { getBranches, getDivisions, getSettings, getUi, formatDate, pick, setting } from "@/lib/queries";
import { navTitle } from "@/lib/nav";

type SP = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return { title: isLang(lang) ? await navTitle(lang, "/gallery") : undefined };
}

export default async function GalleryPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: SP }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const [ui, s, title] = await Promise.all([getUi(lang), getSettings(), navTitle(lang, "/gallery")]);
  return (
    <>
      <PageHero lang={lang} title={title} sub={setting(s, "gallery.sub", lang)} crumbs={[{ href: `/${lang}`, label: ui.home }, { label: title }]} />
      <Suspense fallback={<div className="mx-auto max-w-wrap px-5 py-20 sm:px-8" aria-busy="true" />}>
        <Results lang={lang} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// the same filter boxes as the orders page: a white box whose border turns brand while its dropdown has focus
const box = "mt-1.5 rounded-lg border border-line bg-white font-normal transition-colors focus-within:border-brand";
const trigger = "field-bare rounded-lg py-3.5 pl-4 pr-4 text-base";

async function Results({ lang, searchParams }: { lang: Lang; searchParams: SP }) {
  const sp = await searchParams;
  const divisionId = Number(first(sp.division)) || undefined;
  const branchId = Number(first(sp.branch)) || undefined;
  const filtered = Boolean(divisionId || branchId);
  const [ui, s, divisions, branches, albums, loose] = await Promise.all([
    getUi(lang),
    getSettings(),
    getDivisions(),
    getBranches(),
    getGalleryAlbums(divisionId, branchId),
    filtered ? Promise.resolve([]) : getLoosePhotos(200),
  ]);
  const t = (k: string) => setting(s, k, lang);
  const count = (n: number) => `${n.toLocaleString(intlLocale(lang))} ${t("gallery.unit")}`;

  return (
    <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
      <form method="get" className="mb-10 grid grid-cols-1 items-end gap-3 sm:grid-cols-[repeat(2,16rem)_auto] sm:gap-4">
        <label className="block text-sm font-semibold">
          {t("gallery.filter_division")}
          <div className={box}>
            <Select
              name="division"
              defaultValue={divisionId ? String(divisionId) : ""}
              placeholder={t("gallery.all")}
              options={divisions.map((d) => ({ value: String(d.id), label: pick(lang, d.nameEn, d.nameHi, d.i18n?.name) }))}
              submitOnChange
              className={trigger}
            />
          </div>
        </label>
        <label className="block text-sm font-semibold">
          {t("gallery.filter_branch")}
          <div className={box}>
            <Select
              name="branch"
              defaultValue={branchId ? String(branchId) : ""}
              placeholder={t("gallery.all")}
              options={divisions.flatMap((d) =>
                branches
                  .filter((b) => b.divisionId === d.id)
                  .map((b) => ({ value: String(b.id), label: pick(lang, b.nameEn, b.nameHi, b.i18n?.name), hint: pick(lang, d.nameEn, d.nameHi, d.i18n?.name) })),
              )}
              submitOnChange
              className={trigger}
            />
          </div>
        </label>
        {filtered && (
          <Link href={`/${lang}/gallery`} className="inline-flex min-h-[3.25rem] items-center font-medium text-brand underline underline-offset-4 sm:px-2">
            {t("gallery.back")}
          </Link>
        )}
      </form>

      {albums.length > 0 && (
        <section>
          <h2 className="text-2xl font-medium">{t("gallery.albums_title")}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => {
              const place = [pick(lang, a.divisionEn, a.divisionHi, a.divisionI18n?.name), pick(lang, a.branchEn, a.branchHi, a.branchI18n?.name)].filter(Boolean).join(" · ") || t("gallery.whole_union");
              return (
                <li key={a.id}>
                  <Link href={`/${lang}/gallery/${a.id}`} className="group block h-full border border-line bg-white transition hover:border-brand">
                    <span className="relative block aspect-[4/3] overflow-hidden bg-paper">
                      <Photo src={a.cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                    </span>
                    <span className="block p-4 sm:p-5">
                      <span className="block text-lg font-medium leading-snug">{pick(lang, a.titleEn, a.titleHi, a.i18n?.title)}</span>
                      <span className="mt-1 block text-sm text-muted">{place}</span>
                      <span className="mt-2 block text-sm text-muted">{[a.heldOn ? formatDate(a.heldOn, lang) : "", count(a.photos)].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {filtered && albums.length === 0 && <Empty text={t("gallery.empty_filter")} />}

      {!filtered && loose.length > 0 && (
        <section className={albums.length ? "mt-16" : ""}>
          {albums.length > 0 && (
            <>
              <h2 className="mb-6 text-2xl font-medium">{t("gallery.loose_title")}</h2>
            </>
          )}
          <PhotoGrid photos={loose} lang={lang} />
        </section>
      )}

      {!filtered && albums.length === 0 && loose.length === 0 && <Empty text={ui.noItems} />}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-line bg-paper/50 px-5 py-16 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-white text-brand ring-1 ring-line">
        <Icon name="image" size={26} />
      </span>
      <p className="mt-4 text-muted">{text}</p>
    </div>
  );
}
