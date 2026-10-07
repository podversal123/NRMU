import sanitizeHtml from "sanitize-html";
import { cacheLife } from "next/cache";

const toHttps = (url: string) => url.replace(/^http:\/\/((?:www\.)?(?:nrmu\.net|airfindia\.org))/i, "https://$1");

/**
 * Removes scripts, event handlers and unsafe URLs from HTML that came from the content database.
 * Cached, because sanitising is the same work for every visitor of a page.
 */
export async function cleanHtml(html: string) {
  "use cache";
  cacheLife("max");
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "sub", "sup", "span", "div", "blockquote", "pre", "code",
      "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "width", "height", "loading"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
      "*": ["style"],
    },
    allowedStyles: { "*": { "text-align": [/^(left|right|center|justify)$/] } },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (tag, attribs) => ({
        tagName: tag,
        attribs: {
          ...attribs,
          ...(attribs.href ? { href: toHttps(attribs.href) } : {}),
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      img: (tag, attribs) => ({
        tagName: tag,
        attribs: { ...attribs, ...(attribs.src ? { src: toHttps(attribs.src) } : {}), loading: "lazy" },
      }),
    },
  });
}

export default async function SafeHtml({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`prose-nrmu ${className}`} dangerouslySetInnerHTML={{ __html: await cleanHtml(html) }} />;
}
