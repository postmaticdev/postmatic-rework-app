"use client";

import Image from "next/image";
import { AlertCircle, ExternalLink } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { JobData } from "@/models/socket-content";
import { useParams } from "next/navigation";
import { getAiModelDisplayNameByName } from "@/models/api/content/ai-model";
import { useLocale, useTranslations } from "next-intl";

export function isProblemGenerationJob(job: JobData) {
  return (
    job.status === "error" ||
    job.stage === "error" ||
    (job.status === "done" && (job.result?.images?.length || 0) === 0)
  );
}

function formatJobDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(job: JobData, fallback: string) {
  if (job.error?.message) {
    return job.error.message;
  }

  return fallback;
}

export function FailedGenerationHistory() {
  const { histories, onSelectHistory, aiModels } = useContentGenerate();
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const t = useTranslations("contentScheduler");
  const locale = useLocale();

  const failedJobs = histories
    .flatMap((group) => group.jobs)
    .filter(isProblemGenerationJob)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );

  if (failedJobs.length === 0) {
    return null;
  }

  const openJob = (job: JobData) => {
    onSelectHistory(job);
    router.push(`/business/${businessId}/content-generate`);
  };

  return (
    <Card className="border-red-200 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20">
      <CardContent className="space-y-4 py-4 sm:py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-700 dark:text-red-300">
              <AlertCircle className="h-5 w-5" />
              {t("generationIssuesTitle")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("generationIssuesDescription")}
            </p>
          </div>
          <Badge variant="destructive" className="self-start text-white sm:self-auto">
            {t("issuesCount", { count: failedJobs.length })}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {failedJobs.map((job) => {
            const image =
              job.input.referenceImage ||
              job.product?.images?.[0] ||
              DEFAULT_PLACEHOLDER_IMAGE;

            return (
              <div
                key={job.id}
                className="flex gap-3 rounded-lg border border-red-200 bg-card p-3 dark:border-red-900/60"
              >
                <Image
                  src={image}
                  alt={job.product?.name || t("failedGenerationAlt")}
                  width={96}
                  height={96}
                  className="h-20 w-20 shrink-0 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {job.product?.name || t("unknownProduct")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatJobDate(job.updatedAt, locale)}
                      </p>
                    </div>
                    <Badge variant="destructive" className="shrink-0 text-white">{t("failedBadge")}</Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-red-700 dark:text-red-300">
                    {getErrorMessage(
                      job,
                      t("generationNoUsableImage")
                    )}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {job.input.model ? (
                      <span>{getAiModelDisplayNameByName(aiModels.models, job.input.model)}</span>
                    ) : null}
                    {job.input.ratio ? <span>{job.input.ratio}</span> : null}
                    {job.type ? <span>{job.type}</span> : null}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="sm:min-h-0"
                    onClick={() => openJob(job)}
                  >
                    <ExternalLink className="h-3.5 w-3.5 max-sm:size-4" />
                    {t("openInGenerator")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
