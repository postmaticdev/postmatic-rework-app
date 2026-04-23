"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Globe, PencilLine, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NewBusinessEntryPage() {
  const t = useTranslations("newBusinessEntry");

  return (
    <div className="ai-glow-page relative min-h-screen overflow-hidden bg-background">
      <div className="ai-glow-orb ai-glow-orb-1" />
      <div className="ai-glow-orb ai-glow-orb-2" />
      <div className="ai-glow-orb ai-glow-orb-3" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <Card className="w-full max-w-2xl rounded-[2rem] border-white/60 bg-white/80 p-6 shadow-[0_24px_90px_rgba(37,99,235,0.16)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(17,24,39,0.8)] dark:shadow-[0_24px_120px_rgba(37,99,235,0.2)] sm:p-8">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1 text-xs font-medium tracking-[0.24em] text-blue-700 uppercase dark:text-blue-200">
              <Sparkles className="size-3.5" />
              {t("badge")}
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
          </div>

          <div className="grid gap-4">
            <Button
              asChild
              variant="outline"
              className="group h-auto justify-between rounded-[1.5rem] border-border/70 bg-white/70 px-5 py-5 text-left shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition-transform hover:-translate-y-0.5 hover:bg-white dark:bg-white/5 dark:hover:bg-white/[0.08]"
            >
              <Link href="/business/new-business/manual">
                <span className="flex items-start gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg dark:bg-blue-500/20 dark:text-blue-100">
                    <PencilLine className="size-5" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-base font-semibold text-foreground">
                      {t("manualTitle")}
                    </span>
                    <span className="block text-sm leading-6 text-muted-foreground">
                      {t("manualDescription")}
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>

            <Button
              asChild
              className="group h-auto justify-between rounded-[1.5rem] bg-primary px-5 py-5 text-left text-white shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
            >
              <Link href="/business/new-business/website">
                <span className="flex items-start gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-white/16 text-white backdrop-blur-sm">
                    <Globe className="size-5" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-base font-semibold">
                      {t("websiteTitle")}
                    </span>
                    <span className="block text-sm leading-6 text-blue-100">
                      {t("websiteDescription")}
                    </span>
                  </span>
                </span>
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
