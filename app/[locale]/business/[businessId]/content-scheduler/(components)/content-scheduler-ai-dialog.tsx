"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { SharedReferencePanel } from "@/components/shared/shared-reference-panel";
import { SelectedReferenceImage } from "@/app/[locale]/business/[businessId]/content-generate/(components)/selected-reference-image";
import { SelectedArticleRss } from "@/app/[locale]/business/[businessId]/content-generate/(components)/selected-article-rss";
import { GenerateFormBase } from "@/app/[locale]/business/[businessId]/content-generate/(components)/generate-form-base";
import { GenerateFormSelectRss } from "@/app/[locale]/business/[businessId]/content-generate/(components)/generate-form-select-rss";
import { useContentGenerate } from "@/contexts/content-generate-context";
import {
  useContentCaptionEnhance,
  useContentDraftSaveDraftContent,
  useContentSchedulerManualAddToQueue,
} from "@/services/content/content.api";
import { useBusinessGetById } from "@/services/business.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { showToast } from "@/helper/show-toast";
import { dateManipulation } from "@/helper/date-manipulation";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { JobData } from "@/models/socket-content";
import {
  Bot,
  CalendarDays,
  ChevronRight,
  Loader2,
  Send,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface ContentSchedulerAiDialogProps {
  isOpen: boolean;
  selectedDate: Date | null;
  onClose: () => void;
  onScheduled: () => void;
  onNeedPlatformConnect: () => void;
}

type PromptMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function buildTimeOptions() {
  return Array.from({ length: 48 }, (_, index) => {
    const hour = Math.floor(index / 2)
      .toString()
      .padStart(2, "0");
    const minute = index % 2 === 0 ? "00" : "30";
    return `${hour}:${minute}`;
  });
}

export function ContentSchedulerAiDialog({
  isOpen,
  selectedDate,
  onClose,
  onScheduled,
  onNeedPlatformConnect,
}: ContentSchedulerAiDialogProps) {
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("contentScheduler");
  const previewT = useTranslations("previewPanel");
  const locale = useLocale();
  const {
    form,
    publishedTemplates,
    savedTemplates,
    onSelectReferenceImage,
    onSaveUnsave,
    onConfirmUnsave,
    onCloseUnsaveModal,
    unsaveModal,
    isLoading,
    selectedTemplate,
    selectedHistory,
    histories,
    onSelectHistory,
    onSubmitGenerate,
    setMode,
    setTab,
  } = useContentGenerate();

  const saveDraftMutation = useContentDraftSaveDraftContent();
  const scheduleMutation = useContentSchedulerManualAddToQueue();
  const enhanceCaptionMutation = useContentCaptionEnhance();
  const { data: platformsData } = usePlatformKnowledgeGetAll(businessId);
  const { data: businessData } = useBusinessGetById(businessId);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);
  const [isTrendDialogOpen, setIsTrendDialogOpen] = useState(false);
  const [confirmVisual, setConfirmVisual] = useState(false);
  const [confirmSchedule, setConfirmSchedule] = useState(false);
  const [promptMessages, setPromptMessages] = useState<PromptMessage[]>([]);

  const connectedPlatforms = useMemo(
    () =>
      (platformsData?.data.data || []).filter(
        (platform) => platform.status === "connected"
      ),
    [platformsData?.data.data]
  );
  const hasConnectedPlatforms = connectedPlatforms.length > 0;
  const recentJobs = useMemo(
    () =>
      histories
        .flatMap((group) => group.jobs)
        .slice()
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime()
        )
        .slice(0, 6),
    [histories]
  );
  const timeOptions = useMemo(() => buildTimeOptions(), []);

  useEffect(() => {
    if (!isOpen) return;

    const nextDate = selectedDate
      ? dateManipulation.ymd(selectedDate)
      : dateManipulation.ymd(new Date());

    setDate(nextDate);
    setTime("08:00");
    setSelectedPlatforms([]);
    setConfirmVisual(false);
    setConfirmSchedule(false);
    setPromptMessages([]);
    onSelectHistory(null);
    setMode("knowledge");
    setTab("knowledge");
  }, [isOpen, onSelectHistory, selectedDate, setMode, setTab]);

  useEffect(() => {
    if (!isOpen || !form.rss) return;
    setIsTrendDialogOpen(false);
  }, [form.rss, isOpen]);

  const formattedDate = selectedDate
    ? new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selectedDate)
    : "";

  const businessName = businessData?.data?.data?.name || "Postmatic";
  const businessLogo = businessData?.data?.data?.logo || "/logoblue.png";
  const minDate = dateManipulation.ymd(new Date());

  const appendPromptMessage = (job?: JobData | null) => {
    const prompt = (form.basic.prompt || "").trim();
    if (prompt) {
      setPromptMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-user`,
          role: "user",
          content: prompt,
        },
      ]);
    }

    const caption = form.basic.caption || job?.result?.caption;
    if (caption) {
      setPromptMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: caption,
        },
      ]);
    }
  };

  const handleGenerate = async () => {
    if (!form.basic.productKnowledgeId) {
      showToast("error", t("chooseProductFirst"));
      return;
    }

    appendPromptMessage(selectedHistory);
    await onSubmitGenerate({
      mode: selectedHistory ? "regenerate" : undefined,
    });
  };

  const handleEnhanceCaption = async () => {
    const imageUrl = selectedHistory?.result?.images?.[0];
    if (!imageUrl) {
      showToast("error", t("generateContentFirst"));
      return;
    }

    try {
      const response = await enhanceCaptionMutation.mutateAsync({
        businessId,
        formData: {
          images: [imageUrl],
          model: "gemini",
          currentCaption: form.basic.caption || "",
        },
      });

      form.setBasic({ ...form.basic, caption: response.data.data.caption });
      showToast("success", response.data.responseMessage);
    } catch (error) {
      showToast("error", error);
    }
  };

  const togglePlatform = (platform: PlatformEnum) => {
    if (!hasConnectedPlatforms) {
      onNeedPlatformConnect();
      return;
    }

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const handleSchedule = async () => {
    if (!selectedHistory?.result) {
      showToast("error", t("generateContentFirst"));
      return;
    }
    if (!date || !time) {
      showToast("error", t("selectDateAndTime"));
      return;
    }
    if (selectedPlatforms.length === 0) {
      if (!hasConnectedPlatforms) {
        onNeedPlatformConnect();
        return;
      }
      showToast("error", t("pleaseSelectAtLeastOnePlatform"));
      return;
    }
    if (!confirmVisual || !confirmSchedule) {
      showToast("error", t("confirmBeforeSchedule"));
      return;
    }

    try {
      const savedDraft = await saveDraftMutation.mutateAsync({
        businessId,
        formData: {
          images: selectedHistory.result.images,
          ratio: selectedHistory.result.ratio,
          category: selectedHistory.result.category || selectedHistory.input.category,
          designStyle:
            selectedHistory.result.designStyle || selectedHistory.input.designStyle,
          caption: form.basic.caption || selectedHistory.result.caption,
          referenceImages:
            selectedHistory.result.referenceImages ||
            (selectedHistory.input.referenceImage
              ? [selectedHistory.input.referenceImage]
              : []),
          productKnowledgeId:
            selectedHistory.result.productKnowledgeId ||
            selectedHistory.input.productKnowledgeId,
        },
      });

      await scheduleMutation.mutateAsync({
        businessId,
        formData: {
          generatedImageContentId: savedDraft.data.data.id,
          caption: form.basic.caption || selectedHistory.result.caption,
          platforms: selectedPlatforms,
          dateTime: new Date(`${date}T${time}`).toISOString(),
        },
      });

      showToast("success", t("postScheduledSuccess"));
      onScheduled();
    } catch (error) {
      showToast("error", error);
    }
  };

  const scheduleDisabled =
    !selectedHistory?.result ||
    !confirmVisual ||
    !confirmSchedule ||
    saveDraftMutation.isPending ||
    scheduleMutation.isPending;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[1400px] h-[92vh]">
          <DialogHeader>
            <DialogTitle>{t("buildWithAiTitle")}</DialogTitle>
            <DialogDescription>{formattedDate}</DialogDescription>
          </DialogHeader>

          {!selectedHistory ? (
            <div className="grid flex-1 overflow-hidden border-t lg:grid-cols-[360px_1fr_420px]">
              <div className="border-r overflow-y-auto">
                <SharedReferencePanel
                  publishedTemplates={publishedTemplates}
                  savedTemplates={savedTemplates}
                  form={form}
                  onSelectReferenceImage={onSelectReferenceImage}
                  onSaveUnsave={onSaveUnsave}
                  onConfirmUnsave={onConfirmUnsave}
                  onCloseUnsaveModal={onCloseUnsaveModal}
                  unsaveModal={unsaveModal}
                  isLoading={isLoading}
                  selectedTemplate={selectedTemplate}
                  showSearchNotFound={true}
                />
              </div>

              <div className="overflow-y-auto p-6">
                <div className="mx-auto max-w-2xl space-y-4">
                  <div className="rounded-3xl border border-border bg-background-secondary p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          {t("customizeWithKnowledge")}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("customizeWithKnowledgeDescription")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTrendDialogOpen(true)}
                      >
                        <Sparkles className="h-4 w-4" />
                        {t("generateByTrend")}
                      </Button>
                    </div>
                  </div>

                  <SelectedReferenceImage />
                  <SelectedArticleRss />
                  <GenerateFormBase />
                </div>
              </div>

              <div className="overflow-y-auto border-l p-6">
                <Card className="overflow-hidden rounded-[28px]">
                  <div className="flex items-center gap-3 border-b px-5 py-4">
                    <Image
                      src={businessLogo}
                      alt={businessName}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="font-semibold">{businessName}</div>
                  </div>

                  <div className="aspect-square bg-background-secondary">
                    <Image
                      src={form.basic.referenceImage || form.basic.productImage || DEFAULT_PLACEHOLDER_IMAGE}
                      alt={businessName}
                      width={800}
                      height={800}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="space-y-4 p-5">
                    <Textarea
                      value={form.basic.caption}
                      onChange={(event) =>
                        form.setBasic({
                          ...form.basic,
                          caption: event.target.value,
                        })
                      }
                      placeholder={previewT("captionWillShowHere")}
                      className="min-h-24 resize-none rounded-2xl bg-background-secondary"
                    />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          {t("selectDate")}
                        </span>
                        <div className="flex items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <input
                            type="date"
                            value={date}
                            min={minDate}
                            onChange={(event) => setDate(event.target.value)}
                            className="h-11 w-full bg-transparent text-sm outline-none"
                          />
                        </div>
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-medium">
                          {t("selectTime")}
                        </span>
                        <Select value={time} onValueChange={setTime}>
                          <SelectTrigger className="h-11 rounded-2xl bg-background-secondary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </label>
                    </div>

                    <div>
                      <div className="mb-2 text-sm font-medium">
                        {t("choosePlatforms")}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {connectedPlatforms.map((platform) => {
                          const isSelected = selectedPlatforms.includes(
                            platform.platform
                          );
                          return (
                            <button
                              key={platform.platform}
                              type="button"
                              onClick={() => togglePlatform(platform.platform)}
                              className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary text-white"
                                  : "border-border bg-background-secondary"
                              }`}
                            >
                              {mapEnumPlatform.getPlatformIcon(
                                platform.platform,
                                isSelected ? "text-white" : ""
                              )}
                              <span>
                                {mapEnumPlatform.getPlatformLabel(
                                  platform.platform
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={isLoading}
                      className="w-full rounded-2xl py-6 text-base"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <WandSparkles className="h-4 w-4" />
                      )}
                      {t("generateContent")}
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid flex-1 overflow-hidden border-t lg:grid-cols-[360px_1fr_420px]">
              <div className="overflow-y-auto border-r p-5">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-border bg-background-secondary p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{t("aiAssistant")}</div>
                        <p className="text-sm text-muted-foreground">
                          {t("aiAssistantDescription")}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {promptMessages.length === 0 && (
                      <div className="rounded-3xl bg-background-secondary p-4 text-sm text-muted-foreground">
                        {t("aiChatEmpty")}
                      </div>
                    )}
                    {promptMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm ${
                          message.role === "user"
                            ? "ml-auto bg-primary text-white"
                            : "bg-background-secondary text-foreground"
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-3xl border border-border bg-card p-4">
                    <label className="mb-2 block text-sm font-medium">
                      {t("regenerateInstruction")}
                    </label>
                    <Textarea
                      value={form.basic.prompt || ""}
                      onChange={(event) =>
                        form.setBasic({
                          ...form.basic,
                          prompt: event.target.value,
                        })
                      }
                      placeholder={t("regenerateInstructionPlaceholder")}
                      className="min-h-28 resize-none rounded-2xl bg-background-secondary"
                    />
                    <div className="mt-3 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsTrendDialogOpen(true)}
                      >
                        <Sparkles className="h-4 w-4" />
                        {t("changeTrend")}
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={isLoading}
                        onClick={handleGenerate}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        {previewT("regenerate")}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold">
                      {t("recentGenerations")}
                    </div>
                    <div className="space-y-2">
                      {recentJobs.map((job) => (
                        <button
                          key={job.id}
                          type="button"
                          onClick={() => onSelectHistory(job)}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                            selectedHistory.id === job.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-card hover:bg-background-secondary"
                          }`}
                        >
                          <Image
                            src={
                              job.result?.images?.[0] ||
                              job.product?.images?.[0] ||
                              DEFAULT_PLACEHOLDER_IMAGE
                            }
                            alt={job.product?.name || "history"}
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {job.product?.name || t("generatedContent")}
                            </div>
                            <div className="line-clamp-2 text-xs text-muted-foreground">
                              {job.input.prompt || job.result?.caption || "-"}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto p-6">
                <div className="mx-auto max-w-2xl space-y-4">
                  <Card className="overflow-hidden rounded-[32px]">
                    <div className="flex items-center gap-3 border-b px-5 py-4">
                      <Image
                        src={businessLogo}
                        alt={businessName}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full"
                      />
                      <div className="font-semibold">{businessName}</div>
                    </div>
                    <div className="aspect-square bg-background-secondary">
                      <Image
                        src={
                          selectedHistory.result?.images?.[0] ||
                          DEFAULT_PLACEHOLDER_IMAGE
                        }
                        alt={selectedHistory.product?.name || businessName}
                        width={1200}
                        height={1200}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </Card>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedHistory.result?.images?.slice(1).map((image, index) => (
                      <Card key={image + index} className="overflow-hidden rounded-3xl">
                        <Image
                          src={image}
                          alt={`variant-${index + 2}`}
                          width={800}
                          height={800}
                          className="aspect-square w-full object-cover"
                        />
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto border-l p-6">
                <div className="space-y-4">
                  <Card className="rounded-[28px] p-5">
                    <div className="space-y-4">
                      <div className="text-xl font-semibold">
                        {t("contentSummary")}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">{t("caption")}</div>
                        <div className="relative">
                          <Textarea
                            value={
                              form.basic.caption ||
                              selectedHistory.result?.caption ||
                              ""
                            }
                            onChange={(event) =>
                              form.setBasic({
                                ...form.basic,
                                caption: event.target.value,
                              })
                            }
                            className="min-h-40 resize-none rounded-2xl bg-background-secondary pr-14"
                          />
                          <Button
                            type="button"
                            size="icon"
                            className="absolute bottom-3 right-3 rounded-xl"
                            onClick={handleEnhanceCaption}
                            disabled={enhanceCaptionMutation.isPending}
                          >
                            {enhanceCaptionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium">
                            {t("selectDate")}
                          </span>
                          <div className="flex items-center gap-2 rounded-2xl border border-input bg-background-secondary px-3">
                            <CalendarDays className="h-4 w-4 text-primary" />
                            <input
                              type="date"
                              value={date}
                              min={minDate}
                              onChange={(event) => setDate(event.target.value)}
                              className="h-11 w-full bg-transparent text-sm outline-none"
                            />
                          </div>
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-medium">
                            {t("selectTime")}
                          </span>
                          <Select value={time} onValueChange={setTime}>
                            <SelectTrigger className="h-11 rounded-2xl bg-background-secondary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </label>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {t("choosePlatforms")}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {connectedPlatforms.map((platform) => {
                            const isSelected = selectedPlatforms.includes(
                              platform.platform
                            );
                            return (
                              <button
                                key={platform.platform}
                                type="button"
                                onClick={() => togglePlatform(platform.platform)}
                                className={`flex h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary text-white"
                                    : "border-border bg-background-secondary"
                                }`}
                              >
                                {mapEnumPlatform.getPlatformIcon(
                                  platform.platform,
                                  isSelected ? "text-white" : ""
                                )}
                                <span>
                                  {mapEnumPlatform.getPlatformLabel(
                                    platform.platform
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="rounded-[28px] p-5">
                    <div className="space-y-3">
                      <div className="text-base font-semibold">
                        {t("scheduleChecklistTitle")}
                      </div>
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={confirmVisual}
                          onChange={(event) => setConfirmVisual(event.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <span>{t("confirmVisualChecklist")}</span>
                      </label>
                      <label className="flex items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={confirmSchedule}
                          onChange={(event) =>
                            setConfirmSchedule(event.target.checked)
                          }
                          className="mt-1 h-4 w-4 rounded border-border"
                        />
                        <span>{t("confirmScheduleChecklist")}</span>
                      </label>
                    </div>
                  </Card>

                  {!hasConnectedPlatforms && (
                    <p className="text-sm text-muted-foreground">
                      {t("noConnectedPlatformMessage")}
                    </p>
                  )}

                  <div className="rounded-3xl border border-border bg-background-secondary p-4 text-sm text-muted-foreground">
                    {t("needMoreSetup")}{" "}
                    <Link
                      href={`/business/${businessId}/knowledge-base`}
                      className="font-medium text-primary"
                    >
                      {t("openBusinessKnowledge")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t p-6">
            <div className="flex justify-end">
              {selectedHistory ? (
                <Button
                  onClick={handleSchedule}
                  disabled={scheduleDisabled}
                  className="w-full rounded-2xl py-6 text-base sm:w-auto sm:min-w-64"
                >
                  {saveDraftMutation.isPending || scheduleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {t("schedulePostButton")}
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full rounded-2xl py-6 text-base sm:w-auto sm:min-w-64"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <WandSparkles className="h-4 w-4" />
                  )}
                  {t("generateContent")}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTrendDialogOpen} onOpenChange={setIsTrendDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("selectTrendTitle")}</DialogTitle>
            <DialogDescription>{t("selectTrendDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <GenerateFormSelectRss />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
