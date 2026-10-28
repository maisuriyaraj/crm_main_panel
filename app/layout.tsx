import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from 'sonner';

import "./globals.css";
import StoreProvider from "@/lib/store/StoreProvider";
import { SessionExpiredDialog } from "@/components/layout/session-expired-dialog";
import { SITE_URL } from "@/lib/constants";

const SITE_NAME = "OrbitOps";
const SITE_DESCRIPTION =
  "OrbitOps combines CRM, sales pipeline, marketing automation, ads management, billing, and analytics into one unified growth platform.";

const THEME_INIT_SCRIPT = `
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "dark") document.documentElement.classList.add("dark");
    else if (theme === "light") document.documentElement.classList.add("light");
  } catch (e) {}
`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — All-in-One CRM & Business Growth Platform`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "CRM",
    "sales pipeline",
    "lead management",
    "marketing automation",
    "Meta ads management",
    "invoicing",
    "billing software",
    "business analytics",
    "small business CRM",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "business",
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
    title: `${SITE_NAME} — Run Your Entire Business From One Platform`,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Run Your Entire Business From One Platform`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020a00" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <StoreProvider>
        <body className="min-h-full flex flex-col">
          <Script id="theme-init" strategy="beforeInteractive">
            {THEME_INIT_SCRIPT}
          </Script>
          {children}
          <Toaster richColors position="top-right" />
          <SessionExpiredDialog />
        </body>
      </StoreProvider>
    </html>
  );
}
