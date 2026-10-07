import type { MetadataRoute } from "next";
import { getSettings, setting } from "@/lib/queries";

/** Makes the website installable on a phone ("Add to home screen"). Names come from the database. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: setting(s, "org.name", "en"),
    short_name: setting(s, "org.short", "en"),
    description: setting(s, "hero.sub", "en"),
    start_url: "/en",
    display: "standalone",
    background_color: "#15161a",
    theme_color: "#15161a",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
