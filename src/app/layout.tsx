import type { Metadata } from "next";
import { brand } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: brand.name, template: `%s · ${brand.name}` },
  description: brand.description,
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <a className="skip-link" href="#main">
          Vai al contenuto
        </a>
        {children}
      </body>
    </html>
  );
}
