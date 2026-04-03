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
      <body>
        {children}
      </body>
    </html>
  );
}
