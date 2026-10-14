import Image from "next/image";
import Photo from "@/components/Photo";

export type BannerLeader = { id: number; name: string; designation: string; cutout: { src: string; width: number; height: number } | null };

/**
 * Home page banner: the train photo on the left (cut on a slant on large screens) and the featured office
 * bearers, as background-removed photos, standing on the light stage beside it. Their names are page text,
 * so they follow the language of the page.
 */
export default function LeaderBanner({ title, photo, photoAlt, leaders }: { title: string; photo: string; photoAlt: string; leaders: BannerLeader[] }) {
  const shown = leaders.filter((l) => l.cutout);
  return (
    <section className="relative overflow-hidden bg-paper">
      <h1 className="sr-only">{title}</h1>
      <div className="relative h-60 sm:h-80 lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[56%] lg:[clip-path:polygon(0_0,100%_0,84%_100%,0_100%)]">
        {photo && <Photo src={photo} alt={photoAlt} fill priority sizes="(min-width: 1024px) 56vw, 100vw" quality={85} className="object-cover object-[30%_60%]" />}
      </div>
      <div className="relative mx-auto flex max-w-wrap justify-center px-5 pb-8 sm:px-8 lg:h-[30rem] lg:items-end lg:justify-end lg:pb-10">
        <ul className="-mt-10 flex items-end gap-4 sm:-mt-16 sm:gap-8 lg:mt-0">
          {shown.map((l) => (
            <li key={l.id} className="flex w-40 flex-col items-center sm:w-56 lg:w-[16.5rem]">
              <Image
                src={l.cutout!.src}
                alt=""
                width={l.cutout!.width}
                height={l.cutout!.height}
                priority
                sizes="(min-width: 1024px) 16.5rem, (min-width: 640px) 14rem, 10rem"
                className="leader-cutout h-auto w-full"
              />
              {/* the name card also hides the straight cut at the bottom of the photo */}
              <div className="relative -mt-6 w-full rounded-md border-t-2 border-signal bg-white px-3 py-3 text-center shadow-[0_10px_30px_-12px_rgba(21,22,26,0.35)] sm:px-4">
                <p className="text-base font-bold leading-tight sm:text-xl lg:text-2xl">{l.name}</p>
                <p className="mt-1 text-xs font-medium text-brand sm:text-sm lg:text-base">{l.designation}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
