import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageHero from "@/components/PageHero";
import Photo from "@/components/Photo";
import PhotoGrid from "@/components/PhotoGrid";
import { getGalleryAlbums, getLoosePhotos } from "@/lib/content";
import { isLang, type Lang } from "@/lib/i18n";
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

const select = "min-h-11 w-full border-2 border-line bg-white px-3 text-base focus:border-ink focus:outline-none";

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
  const count = (n: number) => `${n.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")} ${t("gallery.unit")}`;

  return (
    <div className="mx-auto max-w-wrap px-5 py-12 sm:px-8 sm:py-14">
      <form method="get" className="mb-10 grid grid-cols-1 items-end gap-4 border border-line bg-paper p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1fr_1fr_auto_auto]">
        <label className="block text-sm font-semibold">
          {t("gallery.filter_division")}
          <select name="division" defaultValue={divisionId ?? ""} className={`${select} mt-1.5 font-normal`}>
            <option value="">{t("gallery.all")}</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>{pick(lang, d.nameEn, d.nameHi)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          {t("gallery.filter_branch")}
          <select name="branch" defaultValue={branchId ?? ""} className={`${select} mt-1.5 font-normal`}>
            <option value="">{t("gallery.all")}</option>
            {divisions.map((d) => (
              <optgroup key={d.id} label={pick(lang, d.nameEn, d.nameHi)}>
                {branches.filter((b) => b.divisionId === d.id).map((b) => (
                  <option key={b.id} value={b.id}>{pick(lang, b.nameEn, b.nameHi)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="btn-primary min-h-11 px-6">{t("gallery.show")}</button>
        {filtered && (
          <Link href={`/${lang}/gallery`} className="inline-flex min-h-11 items-center justify-center font-medium text-brand underline underline-offset-4">
            {t("gallery.back")}
          </Link>
        )}
      </form>

      {albums.length > 0 && (
        <section>
          <div className="track-red mb-5 w-24" />
          <h2 className="text-2xl font-medium">{t("gallery.albums_title")}</h2>
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => {
              const place = [pick(lang, a.divisionEn, a.divisionHi), pick(lang, a.branchEn, a.branchHi)].filter(Boolean).join(" · ") || t("gallery.whole_union");
              return (
                <li key={a.id}>
                  <Link href={`/${lang}/gallery/${a.id}`} className="group block h-full border border-line bg-white transition hover:border-ink">
                    <span className="relative block aspect-[4/3] overflow-hidden bg-paper">
                      <Photo src={a.cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                    </span>
                    <span className="block p-4 sm:p-5">
                      <span className="block text-lg font-medium leading-snug">{pick(lang, a.titleEn, a.titleHi)}</span>
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

      {filtered && albums.length === 0 && <p className="text-muted">{t("gallery.empty_filter")}</p>}

      {!filtered && loose.length > 0 && (
        <section className={albums.length ? "mt-16" : ""}>
          {albums.length > 0 && (
            <>
              <div className="track-red mb-5 w-24" />
              <h2 className="mb-6 text-2xl font-medium">{t("gallery.loose_title")}</h2>
            </>
          )}
          <PhotoGrid photos={loose} lang={lang} />
        </section>
      )}

      {!filtered && albums.length === 0 && loose.length === 0 && <p className="text-muted">{ui.noItems}</p>}
    </div>
  );
}
