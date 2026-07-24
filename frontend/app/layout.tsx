import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Tournament Hub",
  description: "Host group-stage and knockout tournaments with live standings and brackets.",
};

const themeBootScript = `
(function(){
  try {
    var key = "tournament-hub-theme";
    var allowed = ["meadow","chalk","scoreboard","poster","clinic"];
    var stored = localStorage.getItem(key);
    var theme = allowed.indexOf(stored) >= 0 ? stored : "meadow";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "meadow");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="meadow" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}