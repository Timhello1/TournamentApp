import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Tournament Hub",
  description: "Host group-stage and knockout tournaments with live standings and brackets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
