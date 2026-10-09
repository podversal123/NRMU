/** Placeholder shown while a detail page streams in. The header and footer around it are already on screen. */
export default function PageFallback() {
  return <div aria-busy="true" className="mx-auto min-h-[60vh] max-w-wrap px-5 py-16 sm:px-8" />;
}
