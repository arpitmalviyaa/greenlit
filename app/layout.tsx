import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";

// Independent, swappable type tokens: --font-display (editorial serif),
// --font-ui (functional sans). --font-body aliases to the serif in globals.css.
const inter = Inter({ subsets: ["latin"], variable: "--font-ui" });
const garamond = EB_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getgreenlit.in"),
  title: "Greenlit — Stop signing contracts you haven't really read",
  description:
    "Contract intelligence for creator agencies, talent managers and creators. Upload a contract, see what matters, and know exactly what to say back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${garamond.variable} font-[family-name:var(--font-ui)]`}>
        {children}
      </body>
    </html>
  );
}
