/** A file stored on our blob store downloads straight away with `?download=1`; elsewhere the browser decides. */
export const downloadUrl = (url: string) => (/\.public\.blob\.vercel-storage\.com\//.test(url) ? `${url}${url.includes("?") ? "&" : "?"}download=1` : url);

/** The file's type as printed on its badge (PDF, DOCX, XLSX ...), from its extension; `fallback` when it has none. */
export const typeLabel = (url: string, fallback: string) => {
  const ext = url.split("?")[0].split(".").pop() ?? "";
  return /^[a-z0-9]{2,4}$/i.test(ext) ? ext.toUpperCase() : fallback;
};
