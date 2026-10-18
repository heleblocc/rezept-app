
import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Das Schmausarchiv",
  description: "Mahlzeit, Majestät!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${dmSans.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen bg-[#F7F3EC] text-[#292B25] antialiased">
        <Navigation />
{children}
      </body>
    </html>
  );
}
