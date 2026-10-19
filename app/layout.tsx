import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

// Namespaces needed by the root-level error / not-found pages, which render
// outside the [locale] layout (and its full NextIntlClientProvider).
const ROOT_MESSAGE_NAMESPACES = ["errorPage", "notFoundPage"] as const;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const rootMessages = Object.fromEntries(
    ROOT_MESSAGE_NAMESPACES.map((ns) => [ns, messages[ns]])
  );

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <NextIntlClientProvider locale={locale} messages={rootMessages}>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
