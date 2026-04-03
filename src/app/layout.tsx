import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REPP Dashboard",
  description: "Real Estate Sales Dashboard for REPP",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <head>
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
