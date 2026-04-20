import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/provider/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { FormNewBusinessProvider } from "@/contexts/form-new-business-context";
import { ManageKnowledgeProvider } from "@/contexts/manage-knowledge-context";
import { CheckoutProvider } from "@/contexts/checkout-context";
import { ContentGenerateProvider } from "@/contexts/content-generate-context";
import { Suspense } from "react";
import { BusinessGridFilterProvider } from "@/contexts/business-grid-context";
import { RoleProvider } from "@/contexts/role-context";
import { AutoSchedulerAutosaveProvider } from "@/contexts/auto-scheduler-autosave-context";
import BusinessClientLayout from "./client-layout";
import { Locale, routing } from "@/i18n/routing";
import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AutoGenerateProvider } from "@/contexts/auto-generate-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Postmatic Business",
  description: "Dashboard manajemen bisnis untuk Postmatic",
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    redirect(routing.defaultLocale);
  }
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <Suspense fallback={null}>
              <QueryProvider>
                <RoleProvider>
                <AutoGenerateProvider>
                  <AutoSchedulerAutosaveProvider>
                    <ContentGenerateProvider>
                      <FormNewBusinessProvider>
                        <ManageKnowledgeProvider>
                          <CheckoutProvider>
                            <BusinessGridFilterProvider>
                              <BusinessClientLayout>
                                <main>{children}</main>
                              </BusinessClientLayout>
                            </BusinessGridFilterProvider>
                          </CheckoutProvider>
                        </ManageKnowledgeProvider>
                      </FormNewBusinessProvider>
                    </ContentGenerateProvider>
                  </AutoSchedulerAutosaveProvider>
                </AutoGenerateProvider>
                </RoleProvider>
                <Toaster />
              </QueryProvider>
            </Suspense>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
