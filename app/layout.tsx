import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL("https://getgreenlit.in"),
  title: "Greenlit — Stop signing contracts you haven't really read",
  description:
    "Contract intelligence for creator agencies, talent managers and creators. Upload a contract, see what matters, and know exactly what to say back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${grotesk.variable} font-[family-name:var(--font-body)]`}>
        {children}
      </body>
    </html>
  );
}
