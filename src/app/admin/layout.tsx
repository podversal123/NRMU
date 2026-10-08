import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Roboto } from "next/font/google";
import "../globals.css";

const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });
const notoDevanagari = Noto_Sans_Devanagari({ variable: "--font-noto-deva", subsets: ["devanagari", "latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: { default: "NRMU Admin", template: "%s · NRMU Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.png" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${roboto.variable} ${notoDevanagari.variable} antialiased`}>
      <body className="min-h-screen bg-paper">{children}</body>
    </html>
  );
}
