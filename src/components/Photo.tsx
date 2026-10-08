import Image, { type ImageProps } from "next/image";

/** Hosts that next.config allows the image optimiser to fetch from. */
const OPTIMISED = /^https:\/\/([a-z0-9]+\.public\.blob\.vercel-storage\.com|www\.nrmu\.net)\//i;

/**
 * A photo from the admin uploads or the old site. It is resized and served as WebP/AVIF when its host is
 * known to the optimiser; any other address is shown as it is rather than failing the page.
 */
export default function Photo({ src, alt, className = "", fill, ...rest }: Omit<ImageProps, "src"> & { src: string }) {
  if (OPTIMISED.test(src)) return <Image src={src} alt={alt} fill={fill} className={className} {...rest} />;
  const { width, height } = rest;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" width={fill ? undefined : width} height={fill ? undefined : height} className={`${fill ? "absolute inset-0 h-full w-full" : ""} ${className}`} />
  );
}
