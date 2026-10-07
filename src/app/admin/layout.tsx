import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "../globals.css";

const cormorant = Cormorant_Garamond({ variable: "--font-cormorant", subsets: ["latin"], weight: ["600", "700"] });
const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "NRMU Admin", template: "%s · NRMU Admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.png" },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jost.variable} antialiased`}>
      <body className="min-h-screen bg-paper">{children}</body>
    </html>
  );
}
