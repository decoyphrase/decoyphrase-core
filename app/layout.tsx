import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "DecoyPhrase - Secure Arweave Vault",
    template: "%s | DecoyPhrase",
  },
  description:
    "Zero-knowledge encrypted digital vault powered by Arweave blockchain. Secure your files with permanent, decentralized storage and client-side encryption.",
  keywords: [
    "arweave",
    "vault",
    "encryption",
    "blockchain",
    "decentralized storage",
    "zero-knowledge",
    "secure files",
    "web3",
  ],
  authors: [
    {
      name: "DecoyPhrase Team",
      url: "https://github.com/decoyphrase/decoyphrase-core",
    },
  ],
  creator: "DecoyPhrase",
  publisher: "DecoyPhrase",
  applicationName: "DecoyPhrase",
  generator: "Next.js",
  metadataBase: new URL("https://decoyphrasestorage.arweave.net"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://decoyphrasestorage.arweave.net",
    title: "DecoyPhrase - Secure Arweave Vault",
    description:
      "Zero-knowledge encrypted digital vault powered by Arweave blockchain. Secure your files with permanent, decentralized storage.",
    siteName: "DecoyPhrase",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DecoyPhrase Vault",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DecoyPhrase - Secure Arweave Vault",
    description:
      "Zero-knowledge encrypted digital vault powered by Arweave blockchain.",
    images: ["/og-image.png"],
    creator: "@decoyphrase",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body
        className={`${jetbrainsMono.className} bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 antialiased h-screen overflow-hidden selection:bg-zinc-300 dark:selection:bg-zinc-700`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
