"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

/** Hosts that next.config allows the image optimiser to fetch from. */
const OPTIMISED = /^https:\/\/([a-z0-9]+\.public\.blob\.vercel-storage\.com|www\.nrmu\.net)\//i;

/**
 * A photo from the admin uploads or the old site. It is resized and served as WebP/AVIF when its host is
 * known to the optimiser; any other address is shown as it is rather than failing the page. Many photos
 * from the old site no longer exist there, so a picture that fails to load is replaced by a plain cream
 * tile with the union logo instead of a broken image.
 */
export default function Photo({ src, alt, className = "", fill, ...rest }: Omit<ImageProps, "src"> & { src: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // An image can fail before React hydrates and attaches onError, so check once after mount too.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span aria-hidden className={`${fill ? "absolute inset-0" : "block h-full w-full"} grid place-items-center bg-[#f7efdc]`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="" className="h-14 w-14 rounded-full opacity-30" />
      </span>
    );
  }

  const onError = () => setFailed(true);
  if (OPTIMISED.test(src)) return <Image ref={ref} src={src} alt={alt} fill={fill} className={className} onError={onError} {...rest} />;
  const { width, height } = rest;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      onError={onError}
      className={`${fill ? "absolute inset-0 h-full w-full" : ""} ${className}`}
    />
  );
}
