"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe,
  Link2,
  Palette,
  Sparkles,
  Tags,
  Users,
  WandSparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

type FlowPhase = "input" | "loading" | "result";

type WebsiteDraft = {
  name: string;
  category: string;
  description: string;
  website: string;
  location: string;
  uniqueSellingPoint: string;
  visionMission: string;
  colorTone: string;
  targetAudience: string;
  contentTone: string;
  hashtags: string;
  callToAction: string;
};

function normalizeUrl(value: string) {
  if (!value.trim()) return "";
  return /^https?:\/\//i.test(value) ? value.trim() : `https://${value.trim()}`;
}

function startCase(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default function NewBusinessWebsitePage() {
  const router = useRouter();
  const t = useTranslations("newBusinessWebsite");
  const b = useTranslations("businessKnowledge");
  const r = useTranslations("roleKnowledge");

  const loadingSteps = useMemo(
    () => [
      t("loadingStep1"),
      t("loadingStep2"),
      t("loadingStep3"),
      t("loadingStep4"),
    ],
    [t]
  );

  const [phase, setPhase] = useState<FlowPhase>("input");
  const [websiteInput, setWebsiteInput] = useState("");
  const [activeLoadingStep, setActiveLoadingStep] = useState(0);
  const [draft, setDraft] = useState<WebsiteDraft>({
    name: t("sampleName"),
    category: t("sampleCategory"),
    description: t("sampleDescription"),
    website: "",
    location: t("sampleLocation"),
    uniqueSellingPoint: t("sampleUniqueSellingPoint"),
    visionMission: t("sampleVisionMission"),
    colorTone: "#2563eb",
    targetAudience: t("sampleTargetAudience"),
    contentTone: t("sampleContentTone"),
    hashtags: t("sampleHashtags"),
    callToAction: t("sampleCallToAction"),
  });

  useEffect(() => {
    if (phase !== "loading") return;

    const intervalId = window.setInterval(() => {
      setActiveLoadingStep((current) => (current + 1) % loadingSteps.length);
    }, 1100);

    const timeoutId = window.setTimeout(() => {
      const normalized = normalizeUrl(websiteInput);

      let generatedName = t("sampleName");
      try {
        const hostname = new URL(normalized).hostname.replace(/^www\./, "");
        const baseName = hostname.split(".")[0];
        if (baseName) {
          generatedName = startCase(baseName);
        }
      } catch {
        generatedName = t("sampleName");
      }

      setDraft({
        name: generatedName,
        category: t("sampleCategory"),
        description: t("sampleDescription"),
        website: normalized,
        location: t("sampleLocation"),
        uniqueSellingPoint: t("sampleUniqueSellingPoint"),
        visionMission: t("sampleVisionMission"),
        colorTone: "#2563eb",
        targetAudience: t("sampleTargetAudience"),
        contentTone: t("sampleContentTone"),
        hashtags: t("sampleHashtags"),
        callToAction: t("sampleCallToAction"),
      });
      setPhase("result");
    }, 3200);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(timeoutId);
    };
  }, [loadingSteps.length, phase, t, websiteInput]);

  const canContinue = websiteInput.trim().length > 0;

  const updateDraft = <K extends keyof WebsiteDraft>(
    key: K,
    value: WebsiteDraft[K]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="ai-glow-page relative min-h-screen overflow-hidden bg-background">
      <div className="ai-glow-orb ai-glow-orb-1" />
      <div className="ai-glow-orb ai-glow-orb-2" />
      <div className="ai-glow-orb ai-glow-orb-3" />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-4 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-full border-white/30 bg-white/65 px-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-md dark:bg-white/5"
            onClick={() => {
              if (phase === "input") {
                router.push("/business/new-business");
                return;
              }

              if (phase === "loading") {
                setPhase("input");
                setActiveLoadingStep(0);
                return;
              }

              setPhase("input");
            }}
          >
            <ArrowLeft className="size-4" />
            {t("back")}
          </Button>

          <div className="rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1 text-xs font-medium tracking-[0.22em] text-blue-700 uppercase backdrop-blur-sm dark:text-blue-200">
            {t("dummyBadge")}
          </div>
        </div>

        {phase === "input" && (
          <div className="flex flex-1 items-center justify-center py-8">
            <Card className="w-full max-w-2xl rounded-[2rem] border-white/50 bg-white/78 p-6 shadow-[0_24px_100px_rgba(37,99,235,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(17,24,39,0.84)] sm:p-8">
              <div className="mx-auto max-w-xl text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-1 text-xs font-medium tracking-[0.22em] text-blue-700 uppercase dark:text-blue-200">
                  <WandSparkles className="size-3.5" />
                  {t("eyebrow")}
                </div>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {t("title")}
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  {t("subtitle")}
                </p>
              </div>

              <div className="mt-8 space-y-5">
                <div className="rounded-[1.5rem] border border-white/60 bg-black/[0.03] p-3 shadow-inner dark:border-white/10 dark:bg-black/20">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-700 dark:text-blue-200">
                      <Globe className="size-5" />
                    </div>
                    <Input
                      type="url"
                      value={websiteInput}
                      onChange={(event) => setWebsiteInput(event.target.value)}
                      placeholder={t("inputPlaceholder")}
                      className="h-14 border-0 bg-transparent px-1 text-lg shadow-none focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-14 rounded-full border-blue-300/30 bg-blue-500/10 text-blue-800 hover:bg-blue-500/15 dark:text-blue-100"
                    onClick={() => router.push("/business/new-business/manual")}
                  >
                    {t("noWebsiteYet")}
                  </Button>
                  <Button
                    className="h-14 rounded-full text-base shadow-[0_18px_40px_rgba(37,99,235,0.35)]"
                    disabled={!canContinue}
                    onClick={() => {
                      setActiveLoadingStep(0);
                      setPhase("loading");
                    }}
                  >
                    {t("continue")}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {phase === "loading" && (
          <div className="flex flex-1 items-center justify-center py-8">
            <Card className="w-full max-w-2xl rounded-[2.2rem] border-white/40 bg-white/80 p-6 text-center shadow-[0_24px_110px_rgba(37,99,235,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(17,24,39,0.84)] sm:p-8">
              <div className="mx-auto max-w-xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-1 text-xs font-medium tracking-[0.22em] text-blue-700 uppercase dark:text-blue-200">
                  <Sparkles className="size-3.5" />
                  {t("loadingEyebrow")}
                </div>
                <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  {t("loadingTitle")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                  {t("loadingSubtitle")}
                </p>
              </div>

              <div className="mt-8 rounded-[1.8rem] border border-white/60 bg-white/70 p-5 text-left shadow-inner dark:border-white/10 dark:bg-white/5">
                <div className="mb-5 rounded-[1.4rem] border border-blue-300/30 bg-blue-500/10 p-4 text-sm font-medium text-blue-900 dark:text-blue-100">
                  {loadingSteps[activeLoadingStep]}
                </div>

                <div className="ai-grid-panel rounded-[1.6rem] border border-white/70 p-5 dark:border-white/10">
                  <div className="mb-4 h-44 rounded-[1.25rem] border border-blue-200/60 bg-white/80 p-6 shadow-[0_10px_35px_rgba(37,99,235,0.08)] dark:border-blue-300/10 dark:bg-slate-950/50">
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
                          <Link2 className="size-3.5" />
                          {t("sourceLabel")}
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {normalizeUrl(websiteInput) || t("previewFallbackUrl")}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <div
                            key={index}
                            className="h-16 rounded-2xl border border-blue-200/50 bg-blue-500/[0.08] dark:border-blue-300/10"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                    <div className="size-3 animate-pulse rounded-full bg-blue-500" />
                    {t("loadingFootnote")}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {phase === "result" && (
          <div className="mx-auto flex w-full max-w-7xl flex-1 items-start justify-center py-6">
            <Card className="w-full rounded-[2rem] border-white/50 bg-white/82 p-4 shadow-[0_28px_120px_rgba(37,99,235,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] sm:p-6 lg:p-8">
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-1 text-xs font-medium tracking-[0.22em] text-blue-700 uppercase dark:text-blue-200">
                    <CheckCircle2 className="size-3.5" />
                    {t("resultEyebrow")}
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    {t("resultTitle")}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                    {t("resultSubtitle")}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    className="rounded-full border-white/40 bg-white/65 dark:bg-white/5"
                    onClick={() => {
                      setPhase("input");
                      setActiveLoadingStep(0);
                    }}
                  >
                    {t("regenerate")}
                  </Button>
                  <Button
                    className="rounded-full shadow-[0_18px_40px_rgba(37,99,235,0.32)]"
                    onClick={() => router.push("/business/new-business/manual")}
                  >
                    {t("manualCta")}
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
                <div className="grid gap-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {b("brandName")}
                      </label>
                      <Input
                        value={draft.name}
                        onChange={(event) => updateDraft("name", event.target.value)}
                        className="h-12 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>

                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {b("category")}
                      </label>
                      <Input
                        value={draft.category}
                        onChange={(event) => updateDraft("category", event.target.value)}
                        className="h-12 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {b("description")}
                    </label>
                    <Textarea
                      value={draft.description}
                      onChange={(event) =>
                        updateDraft("description", event.target.value)
                      }
                      className="min-h-32 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {b("urlWebsite")}
                      </label>
                      <Input
                        value={draft.website}
                        onChange={(event) => updateDraft("website", event.target.value)}
                        className="h-12 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>

                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {b("location")}
                      </label>
                      <Input
                        value={draft.location}
                        onChange={(event) => updateDraft("location", event.target.value)}
                        className="h-12 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {b("uniqueSellingPoint")}
                      </label>
                      <Textarea
                        value={draft.uniqueSellingPoint}
                        onChange={(event) =>
                          updateDraft("uniqueSellingPoint", event.target.value)
                        }
                        className="min-h-28 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>

                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Palette className="size-4" />
                        {b("colorTone")}
                      </label>
                      <div className="flex items-center gap-4">
                        <div
                          className="size-16 rounded-2xl border border-white/70 shadow-inner"
                          style={{ backgroundColor: draft.colorTone }}
                        />
                        <Input
                          value={draft.colorTone}
                          onChange={(event) =>
                            updateDraft("colorTone", event.target.value)
                          }
                          className="h-12 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">
                      {b("visionMission")}
                    </label>
                    <Textarea
                      value={draft.visionMission}
                      onChange={(event) =>
                        updateDraft("visionMission", event.target.value)
                      }
                      className="min-h-28 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                    />
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Users className="size-4" />
                        {r("targetAudience")}
                      </label>
                      <Textarea
                        value={draft.targetAudience}
                        onChange={(event) =>
                          updateDraft("targetAudience", event.target.value)
                        }
                        className="min-h-28 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>

                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {r("contentTone")}
                      </label>
                      <Textarea
                        value={draft.contentTone}
                        onChange={(event) =>
                          updateDraft("contentTone", event.target.value)
                        }
                        className="min-h-28 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Tags className="size-4" />
                        {r("hashtags")}
                      </label>
                      <Textarea
                        value={draft.hashtags}
                        onChange={(event) =>
                          updateDraft("hashtags", event.target.value)
                        }
                        className="min-h-28 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>

                    <div className="rounded-[1.6rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">
                        {r("callToAction")}
                      </label>
                      <Textarea
                        value={draft.callToAction}
                        onChange={(event) =>
                          updateDraft("callToAction", event.target.value)
                        }
                        className="min-h-28 rounded-xl border-white/50 bg-white/80 dark:bg-slate-950/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="rounded-[1.8rem] border border-white/55 bg-white/72 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:border-white/10 dark:bg-white/5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
                      <Sparkles className="size-3.5" />
                      {t("insightsTitle")}
                    </div>
                    <div className="space-y-3">
                      {[t("insight1"), t("insight2"), t("insight3")].map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-blue-200/60 bg-blue-500/[0.08] p-4 text-sm leading-6 text-foreground dark:border-blue-300/10"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="ai-grid-panel rounded-[1.8rem] border border-white/55 p-5 dark:border-white/10">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-blue-700 uppercase dark:text-blue-300">
                      <Globe className="size-3.5" />
                      {t("sourceTitle")}
                    </div>
                    <div className="rounded-[1.4rem] border border-white/70 bg-white/75 p-4 dark:border-white/10 dark:bg-slate-950/40">
                      <p className="mb-2 text-sm text-muted-foreground">
                        {t("sourceDescription")}
                      </p>
                      <p className="break-all text-base font-semibold text-foreground">
                        {draft.website || t("previewFallbackUrl")}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[draft.category, draft.colorTone, draft.name].map((item) => (
                        <div
                          key={item}
                          className={cn(
                            "rounded-full border border-blue-300/35 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-900 dark:text-blue-100"
                          )}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
