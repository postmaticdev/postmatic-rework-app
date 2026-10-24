"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "@/i18n/navigation";
import { CardNoGap } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { ScheduleTimeInput } from "@/components/ui/schedule-time-input";
import { Textarea } from "@/components/ui/textarea";
import { LogoLoader } from "@/components/base/logo-loader";
import { ScheduleSummaryModal } from "@/app/[locale]/business/[businessId]/content-generate/(components)/schedule-summary-modal";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PLACEHOLDER_IMAGE, SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { ContentCarouselPreview } from "./content-carousel-preview";
import { ProtectedImage } from "./protected-image";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import {
  getFreeUserAiModelDisplayNames,
  isAiModelRestrictedForFreeUser,
} from "@/models/api/content/ai-model";
import { cn } from "@/lib/utils";
import {
  getSchedulerDraftMarkers,
  removeSchedulerDraftMarker,
  upsertSchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import {
  useContentCaptionEnhance,
  useContentImageWatermarkGet,
  useContentSchedulerManualAddToQueue,
  useContentSchedulerManualEditQueue,
  useContentSchedulerTimezoneGetTimezone,
} from "@/services/content/content.api";
import {
  useBusinessAccessManagementGet,
  useBusinessGetById,
} from "@/services/business.api";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarClock,
  CalendarDays,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { showToast } from "@/helper/show-toast";
import { useRole } from "@/contexts/role-context";
import {
  getCurrentScheduleInput,
  getNextSchedulableDate,
  toBusinessWallDate,
} from "@/lib/schedule-date-time";
import { dateManipulation } from "@/helper/date-manipulation";
import { isAxiosError } from "axios";
import { ImageWatermarkRes } from "@/models/api/content/image.type";

const WATERMARK_POLL_INTERVAL_MS = 2000;
const WATERMARK_POLL_TIMEOUT_MS = 60000;
// Stops background watermark polling when the backend never produces one.
const WATERMARK_POLL_MAX_DURATION_MS = 5 * 60000;
// The backend rejects a publishAt already past when the request lands, so a
// schedule needs some lead time (also absorbs small client clock drift).
const SCHEDULE_MIN_LEAD_MS = 30000;
// The backend's zone when a business has none stored.
const DEFAULT_BUSINESS_TIME_ZONE = "Asia/Jakarta";

// toBusinessWallDate is minute precision; add the seconds back.
const getBusinessWallNowMs = (timeZone?: string) => {
  const now = new Date();
  return (
    toBusinessWallDate(now, timeZone).getTime() +
    now.getSeconds() * 1000 +
    now.getMilliseconds()
  );
};

const isTooSoonToSchedule = (scheduledAt: Date, timeZone?: string) =>
  scheduledAt.getTime() - getBusinessWallNowMs(timeZone) < SCHEDULE_MIN_LEAD_MS;

const getSchedulableInput = (timeZone?: string) =>
  getCurrentScheduleInput(new Date(Date.now() + SCHEDULE_MIN_LEAD_MS), timeZone);

const getPaddingBottomStyle = (ratio?: string) => {
  switch (ratio) {
    case "16:9":
      return "56.25%";
    case "9:16":
      return "177.77%";
    case "4:3":
      return "75%";
    case "3:4":
      return "133.33%";
    case "4:5":
      return "125%";
    case "2:3":
      return "150%";
    case "1:1":
    default:
      return "100%";
  }
};

const formatScheduleDetail = (date: string, time: string, locale: string) => {
  const parsed = new Date(`${date}T${time}`);
  if (Number.isNaN(parsed.getTime())) return `${date} ${time}`;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(parsed);
};

export function PreviewPanel() {
  const { mutateAsync: getImageWatermark } = useContentImageWatermarkGet();
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const shouldAutoEnhanceOnFirstGenerateRef = useRef(false);
  const lastAutoEnhancedResultKeyRef = useRef<string | null>(null);
  const previewWatermarkRequestKeyRef = useRef<string | null>(null);
  const isSubmittingScheduleRef = useRef(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const previewWatermarkRequestPromiseRef = useRef<Promise<string | null> | null>(
    null
  );
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { businessId } = useParams() as { businessId: string };
  // Schedule inputs and publishAt are wall time in the business time zone,
  // which is how the backend reads publishAt.
  const { data: timezoneRes, isError: isTimezoneError } =
    useContentSchedulerTimezoneGetTimezone(businessId);
  const businessTimeZone =
    timezoneRes?.data?.data?.timezone ||
    (isTimezoneError ? DEFAULT_BUSINESS_TIME_ZONE : undefined);
  const {
    mode,
    form,
    aiModels,
    selectedHistory,
    selectedGeneratedImageUrl,
    selectedContentImages,
    histories,
    schedulerDraftPost,
    onSelectHistory,
    isLoading,
    onSelectAiModel,
    onSubmitGenerate,
  } = useContentGenerate();
  const { data: businessData } = useBusinessGetById(businessId);
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const { data: businessAccessRes } = useBusinessAccessManagementGet(businessId);
  // The backend shares the post regardless when the plan requires it.
  const isMustShareContent =
    businessAccessRes?.data?.data?.isMustShareContent === true;
  const [shareAsReference, setShareAsReference] = useState(true);
  const businessName = businessData?.data?.data?.name;
  const businessLogo = businessData?.data?.data?.logo;
  const t = useTranslations("previewPanel");
  const schedulerT = useTranslations("contentGenerateScheduler");
  const tModal = useTranslations("modal");
  // Top-up links are only offered to members allowed to purchase.
  const canPurchase = useRole().access.purchase.write;
  const mEnhanceCaption = useContentCaptionEnhance();
  const mSchedulePost = useContentSchedulerManualAddToQueue();
  const mEditSchedulePost = useContentSchedulerManualEditQueue();

  const scheduleDate = searchParams.get("scheduleDate");
  const scheduleTime = searchParams.get("scheduleTime");
  const editSchedulerManualPostingId = searchParams.get(
    "editSchedulerManualPostingId"
  );
  const initialPlatforms = searchParams.get("platforms");
  const schedulerMode = Boolean(scheduleDate);
  const selectedImageUrl =
    selectedGeneratedImageUrl || selectedHistory?.result?.images?.[0];
  const selectedImageIndex = useMemo(() => {
    if (!selectedHistory?.result?.images?.length || !selectedImageUrl) {
      return 0;
    }

    const foundIndex = selectedHistory.result.images.findIndex(
      (imageUrl) => imageUrl === selectedImageUrl
    );

    return foundIndex >= 0 ? foundIndex : 0;
  }, [selectedHistory?.result?.images, selectedImageUrl]);
  const selectedImageItemId =
    selectedHistory?.result?.imageItemIds?.[selectedImageIndex];
  // The backend rebuilds a grid tile's watermark from its upscale, so the watermark is refetched
  // once the upscale finishes instead of keeping (and publishing) the one made from the small tile.
  const selectedUpscaleStatus =
    selectedHistory?.result?.upscaleStatuses?.[selectedImageIndex] ?? null;
  const restrictedModelName = getFreeUserAiModelDisplayNames(aiModels.models);
  const modelRestrictionCopy = {
    title: t("freeModelRestrictionTitle"),
    description: t("freeModelRestrictionDescription", {
      modelName: restrictedModelName,
    }),
    topUp: t("freeModelRestrictionTopUp"),
    useDefault: t("freeModelRestrictionUseDefault"),
  };
  const [watermarkedPreviewUrl, setWatermarkedPreviewUrl] = useState<
    string | null
  >(null);
  // ProtectedImage swaps generated images for their watermark for free users.
  // Grid tiles show their upscaled version once ready; selectedImageUrl stays the original tile,
  // which the backend swaps for the upscale when publishing.
  const selectedDisplayImageUrl =
    selectedHistory?.result?.upscaledImages?.[selectedImageIndex] ||
    selectedImageUrl;
  const displayedPreviewImageUrl =
    watermarkedPreviewUrl ||
    selectedDisplayImageUrl ||
    form.basic.productImage ||
    DEFAULT_PLACEHOLDER_IMAGE;
  // Display only: selected images stay the original tile URLs, shown upscaled once ready.
  const upscaledImageByOriginal = useMemo(() => {
    const upscaled = new Map<string, string>();
    for (const job of histories.flatMap((group) => group.jobs)) {
      job.result?.images.forEach((image, index) => {
        const upscaledImage = job.result?.upscaledImages?.[index];
        if (upscaledImage) upscaled.set(image, upscaledImage);
      });
    }
    return upscaled;
  }, [histories]);
  const carouselPreviewImages = useMemo(
    () =>
      selectedContentImages.map(
        (image) => upscaledImageByOriginal.get(image) || image
      ),
    [selectedContentImages, upscaledImageByOriginal]
  );
  const isCarouselPreview = carouselPreviewImages.length > 1;

  const [date, setDate] = useState(() => getSchedulableInput(businessTimeZone).date);
  const [time, setTime] = useState(() => getSchedulableInput(businessTimeZone).time);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformEnum[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isScheduleNowConfirmOpen, setIsScheduleNowConfirmOpen] =
    useState(false);
  const [isRestrictedModelModalOpen, setIsRestrictedModelModalOpen] =
    useState(false);
  const [isAutoEnhancingCaption, setIsAutoEnhancingCaption] = useState(false);
  
  const [isScheduleTouched, setIsScheduleTouched] = useState(
    !!searchParams.get("scheduleDate") || !!searchParams.get("scheduleTime")
  );

  useEffect(() => {
    if (isScheduleTouched) return;
    const intervalId = setInterval(() => {
      const nextSchedule = getSchedulableInput(businessTimeZone);
      setDate((prev) => (prev !== nextSchedule.date ? nextSchedule.date : prev));
      setTime((prev) => (prev !== nextSchedule.time ? nextSchedule.time : prev));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [businessTimeZone, isScheduleTouched]);

  const handleDateChange = (d: string) => {
    setDate(d);
    setIsScheduleTouched(true);
  };

  const handleTimeChange = (t: string) => {
    setTime(t);
    setIsScheduleTouched(true);
  };

  const lastPushedDate = useRef(scheduleDate);
  const lastPushedTime = useRef(scheduleTime);

  useEffect(() => {
    if (scheduleDate && scheduleDate !== lastPushedDate.current) {
      setDate(scheduleDate);
      lastPushedDate.current = scheduleDate;
    }
  }, [scheduleDate]);

  useEffect(() => {
    if (scheduleTime && scheduleTime !== lastPushedTime.current) {
      setTime(scheduleTime);
      lastPushedTime.current = scheduleTime;
    }
  }, [scheduleTime]);

  useEffect(() => {
    if (!schedulerMode) return;
    const timeoutId = setTimeout(() => {
      if (date !== scheduleDate || time !== scheduleTime) {
        const newParams = new URLSearchParams(searchParams.toString());
        if (date) newParams.set("scheduleDate", date);
        if (time) newParams.set("scheduleTime", time);
        lastPushedDate.current = date || null;
        lastPushedTime.current = time || null;
        router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
      }
    }, 400);
    return () => clearTimeout(timeoutId);
  }, [date, time, schedulerMode, scheduleDate, scheduleTime, router, pathname, searchParams]);

  useEffect(() => {
    if (!initialPlatforms) return;

    setSelectedPlatforms(
      initialPlatforms
        .split(",")
        .filter(Boolean)
        .map((platform) => platform as PlatformEnum)
    );
  }, [initialPlatforms]);

  useEffect(() => {
    setWatermarkedPreviewUrl(null);
    previewWatermarkRequestKeyRef.current = null;
    previewWatermarkRequestPromiseRef.current = null;
  }, [selectedImageItemId, selectedImageUrl, selectedUpscaleStatus]);

  const resolvePreviewWatermarkUrl = useCallback(
    async ({
      timeoutMs = WATERMARK_POLL_TIMEOUT_MS,
    }: {
      timeoutMs?: number;
    } = {}): Promise<string | null> => {
      if (!aiModels.isFreeUser) {
        return selectedImageUrl || null;
      }

      if (watermarkedPreviewUrl) {
        return watermarkedPreviewUrl;
      }

      if (!selectedImageUrl || typeof selectedImageItemId !== "number") {
        return null;
      }

      const requestKey = `${selectedImageItemId}-${selectedImageUrl}-${selectedUpscaleStatus}-${timeoutMs}`;
      if (
        previewWatermarkRequestPromiseRef.current &&
        previewWatermarkRequestKeyRef.current === requestKey
      ) {
        return previewWatermarkRequestPromiseRef.current;
      }

      const requestPromise = (async (): Promise<string | null> => {
        const maxAttempts = Math.max(
          1,
          Math.ceil(timeoutMs / WATERMARK_POLL_INTERVAL_MS) + 1
        );

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          try {
            const watermarkRes = await getImageWatermark({
              generatedImagePostItemId: selectedImageItemId,
            });
            const watermarkData: ImageWatermarkRes | undefined =
              watermarkRes.data?.data;
            const watermarkUrl = watermarkData?.imageUrls?.[0];
            const canUseWatermark = Boolean(
              watermarkData?.generatedImagePostItemId === selectedImageItemId &&
                watermarkData?.isWatermarked &&
                watermarkData?.isCached &&
                watermarkUrl
            );

            if (canUseWatermark && watermarkUrl) {
              setWatermarkedPreviewUrl(watermarkUrl);
              return watermarkUrl;
            }
          } catch {}

          if (attempt < maxAttempts) {
            await new Promise((resolve) =>
              window.setTimeout(resolve, WATERMARK_POLL_INTERVAL_MS)
            );
          }
        }

        return null;
      })();

      previewWatermarkRequestKeyRef.current = requestKey;
      previewWatermarkRequestPromiseRef.current = requestPromise;

      return requestPromise.finally(() => {
        if (previewWatermarkRequestKeyRef.current === requestKey) {
          previewWatermarkRequestPromiseRef.current = null;
        }
      });
    },
    [
      aiModels.isFreeUser,
      getImageWatermark,
      selectedImageItemId,
      selectedImageUrl,
      selectedUpscaleStatus,
      watermarkedPreviewUrl,
    ]
  );

  useEffect(() => {
    if (
      aiModels.isLoading ||
      !aiModels.isFreeUser ||
      !selectedImageUrl ||
      typeof selectedImageItemId !== "number"
    ) {
      return;
    }

    let isCancelled = false;
    const deadline = Date.now() + WATERMARK_POLL_MAX_DURATION_MS;

    const keepTryingWatermark = async () => {
      while (!isCancelled && Date.now() < deadline) {
        const watermarkUrl = await resolvePreviewWatermarkUrl();

        if (isCancelled) {
          return;
        }

        if (watermarkUrl) {
          setWatermarkedPreviewUrl(watermarkUrl);
          return;
        }

        await new Promise((resolve) =>
          window.setTimeout(resolve, WATERMARK_POLL_INTERVAL_MS)
        );
      }
    };

    void keepTryingWatermark();

    return () => {
      isCancelled = true;
    };
  }, [
    aiModels.isFreeUser,
    aiModels.isLoading,
    resolvePreviewWatermarkUrl,
    selectedImageItemId,
    selectedImageUrl,
  ]);

  const platformOptions = useMemo(
    () =>
      SOCIAL_MEDIA_PLATFORMS.map((platform) => {
        const connected = (platformData?.data.data || []).find(
          (item) => item.platform === platform && item.status === "connected"
        );
        return {
          platform,
          isConnected: Boolean(connected),
          requiresReconnect: Boolean(connected?.requiresReconnect),
        };
      }),
    [platformData?.data.data]
  );
  // A platform needing reconnection would only fail at publish time.
  const connectedPlatforms = useMemo(
    () =>
      platformOptions
        .filter((platform) => platform.isConnected && !platform.requiresReconnect)
        .map((platform) => platform.platform),
    [platformOptions]
  );
  const isFirstGenerateFlow =
    !selectedHistory || selectedHistory.id.startsWith("chat-scheduled-");
  const minDate = getCurrentScheduleInput(new Date(), businessTimeZone).date;
  const isEnhanceCaptionLoading =
    mEnhanceCaption.isPending &&
    (!isAutoEnhancingCaption || !form.basic.caption.trim());
  const canEnhanceCaption =
    Boolean(selectedHistory && selectedImageUrl) && !isEnhanceCaptionLoading;
  const schedulerDraftId = schedulerDraftPost?.id ||
    (editSchedulerManualPostingId
      ? Number(editSchedulerManualPostingId)
      : null);

  const handleGenerateClick = () => {
    if (schedulerMode && selectedHistory) {
      setIsSummaryOpen(true);
      return;
    }

    if (
      aiModels.isFreeUser &&
      aiModels.freeUserAllowedModel &&
      isAiModelRestrictedForFreeUser(aiModels.models, form.basic.model)
    ) {
      setIsRestrictedModelModalOpen(true);
      return;
    }

    shouldAutoEnhanceOnFirstGenerateRef.current = isFirstGenerateFlow;

    onSubmitGenerate({
      mode: selectedHistory ? "regenerate" : undefined,
    });
    setTimeout(() => {
      if (window.innerWidth < 1024) {
        previewPanelRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  const handleUseFreeUserAllowedModel = () => {
    const allowedModel = aiModels.freeUserAllowedModel;
    if (!allowedModel) {
      setIsRestrictedModelModalOpen(false);
      return;
    }

    const allowedRatios = allowedModel.validRatios.length
      ? allowedModel.validRatios
      : aiModels.validRatios;
    const nextRatio = allowedRatios.includes(form.basic.ratio)
      ? form.basic.ratio
      : (allowedRatios[0] || aiModels.validRatios[0] || "1:1");

    onSelectAiModel(allowedModel);
    setIsRestrictedModelModalOpen(false);
    shouldAutoEnhanceOnFirstGenerateRef.current = isFirstGenerateFlow;
    void onSubmitGenerate({
      mode: selectedHistory ? "regenerate" : undefined,
      model: allowedModel.name,
      ratio: nextRatio as "1:1" | "2:3" | "4:5" | "5:4" | "9:16" | "16:9",
      imageSize: allowedModel.imageSizes?.[0] || null,
    });
  };

  const handleTopUpNow = () => {
    setIsRestrictedModelModalOpen(false);
    router.push(`/business/${businessId}/settings?tab=billing&topUp=token`);
  };

  // Always the original image: at publish time the backend swaps a grid tile
  // for its upscaled version and watermarks it for free businesses. A
  // watermarked URL here would get a second watermark and skip the upscale.
  // The backend publishes a single image, so a carousel publishes its cover
  // (the primary image can sit outside the carousel after a new generation).
  const scheduleImageSourceUrl =
    selectedContentImages.length > 1 ? selectedContentImages[0] : selectedImageUrl;
  const resolveScheduleImageUrl = useCallback(
    async () => scheduleImageSourceUrl || null,
    [scheduleImageSourceUrl]
  );

  const persistCaptionToSchedulerDraft = useCallback(
    async (nextCaption: string) => {
      if (!schedulerMode || !schedulerDraftId || !selectedHistory || !selectedImageUrl) {
        return;
      }

      const scheduleImageUrl = await resolveScheduleImageUrl();
      if (!scheduleImageUrl) {
        return;
      }

      const currentDraftMarker = getSchedulerDraftMarkers(businessId).find(
        (marker) => marker.draftId === String(schedulerDraftId)
      );
      const draftDate = currentDraftMarker?.date || scheduleDate || date;
      const draftTime =
        currentDraftMarker?.time || scheduleTime || time || getCurrentScheduleInput(new Date(), businessTimeZone).time;

      if (draftDate) {
        upsertSchedulerDraftMarker(businessId, {
          draftId: String(schedulerDraftId),
          jobId: selectedHistory.id,
          date: draftDate,
          time: draftTime,
          image: scheduleImageUrl,
          caption: nextCaption,
          productImage:
            currentDraftMarker?.productImage || form.basic.productImage || null,
          referenceImage:
            currentDraftMarker?.referenceImage ||
            selectedHistory.input.referenceImage ||
            form.basic.referenceImage ||
            null,
          avatarImages:
            currentDraftMarker?.avatarImages ||
            form.basic.selectedAvatars.map((avatar) => avatar.imageUrl),
          chatSessionId:
            schedulerDraftPost?.chatSessionId ?? currentDraftMarker?.chatSessionId ?? null,
          businessProductId:
            selectedHistory.input.productKnowledgeId ||
            currentDraftMarker?.businessProductId ||
            null,
          createdAt: currentDraftMarker?.createdAt || selectedHistory.createdAt,
        });
      }

      await mEditSchedulePost.mutateAsync({
        businessId,
        idScheduler: schedulerDraftId,
        formData: {
          imageUrl: scheduleImageUrl,
          caption: nextCaption,
          platforms: [],
          // The backend rejects a past publishAt, drafts included.
          dateTime: (() => {
            const draftAt = new Date(`${draftDate}T${draftTime}`);
            return Number.isNaN(draftAt.getTime()) ||
              isTooSoonToSchedule(draftAt, businessTimeZone)
              ? getNextSchedulableDate(
                  new Date(Date.now() + SCHEDULE_MIN_LEAD_MS),
                  businessTimeZone
                ).toISOString()
              : draftAt.toISOString();
          })(),
          status: "draft",
          withChatAI: true,
          shareAsReference: true,
          businessProductId: selectedHistory.input.productKnowledgeId,
          chatSessionId:
            schedulerDraftPost?.chatSessionId ??
            currentDraftMarker?.chatSessionId ??
            undefined,
        },
      });
    },
    [
      businessId,
      businessTimeZone,
      date,
      form.basic.productImage,
      form.basic.referenceImage,
      form.basic.selectedAvatars,
      mEditSchedulePost,
      scheduleDate,
      scheduleTime,
      schedulerDraftId,
      schedulerDraftPost?.chatSessionId,
      schedulerMode,
      resolveScheduleImageUrl,
      selectedHistory,
      selectedImageUrl,
      time,
    ]
  );

  const handleEnhanceCaption = useCallback(
    async (options?: { silent?: boolean }) => {
      const imageUrl = selectedImageUrl;
      if (!imageUrl) {
        if (!options?.silent) {
          showToast("error", schedulerT("generateFirst"));
        }
        return;
      }

      if (options?.silent) {
        setIsAutoEnhancingCaption(true);
      }

      try {
        const res = await mEnhanceCaption.mutateAsync({
          businessId,
          formData: {
            imageUrl,
            businessProductId: Number(
              form.basic.productKnowledgeId || 
              selectedHistory?.input?.productKnowledgeId || 
              selectedHistory?.result?.productKnowledgeId
            ) || undefined,
          },
        });
        const nextCaption = res.data.data.caption;
        form.setBasic({ ...form.basic, caption: nextCaption });
        await persistCaptionToSchedulerDraft(nextCaption);
        if (!options?.silent) {
          showToast("success", res.data.responseMessage);
        }
      } catch (error) {
        if (!options?.silent) {
          showToast("error", error, t);
        }
      } finally {
        if (options?.silent) {
          setIsAutoEnhancingCaption(false);
        }
      }
    },
    [
      businessId,
      form,
      mEnhanceCaption,
      persistCaptionToSchedulerDraft,
      schedulerT,
      selectedHistory?.input?.productKnowledgeId,
      selectedHistory?.result?.productKnowledgeId,
      selectedImageUrl,
      t,
    ]
  );

  useEffect(() => {
    if (!selectedHistory) {
      shouldAutoEnhanceOnFirstGenerateRef.current = false;
      return;
    }

    const isFailed =
      selectedHistory.status === "error" || selectedHistory.stage === "error";
    if (isFailed) {
      shouldAutoEnhanceOnFirstGenerateRef.current = false;
      return;
    }

    const currentDraftMarker =
      schedulerMode && schedulerDraftId
        ? getSchedulerDraftMarkers(businessId).find(
          (marker) => marker.draftId === String(schedulerDraftId)
        )
        : null;
    const persistedCaption =
      currentDraftMarker?.caption?.trim() ||
      form.basic.caption.trim() ||
      selectedHistory.result?.caption?.trim() ||
      selectedHistory.input.caption?.trim() ||
      "";
    const isGeneratedChatResult =
      selectedHistory.id.startsWith("chat-") &&
      !selectedHistory.id.startsWith("chat-pending-") &&
      !selectedHistory.id.startsWith("chat-scheduled-");
    const isReady =
      !isLoading &&
      selectedHistory.status === "done" &&
      selectedHistory.stage === "done" &&
      Boolean(selectedImageUrl);
    const shouldAutoEnhance =
      (shouldAutoEnhanceOnFirstGenerateRef.current && !persistedCaption) ||
      (schedulerMode &&
        schedulerDraftId &&
        isGeneratedChatResult &&
        !persistedCaption);
    const resultKey = schedulerDraftId
      ? `${schedulerDraftId}:${selectedHistory.id}:${selectedImageUrl || ""}`
      : `${selectedHistory.id}:${selectedImageUrl || ""}`;

    if (!shouldAutoEnhance || !isReady) return;
    if (lastAutoEnhancedResultKeyRef.current === resultKey) return;

    lastAutoEnhancedResultKeyRef.current = resultKey;
    shouldAutoEnhanceOnFirstGenerateRef.current = false;
    void handleEnhanceCaption({ silent: true });
  }, [
    form.basic.caption,
    businessId,
    handleEnhanceCaption,
    isLoading,
    schedulerMode,
    schedulerDraftId,
    selectedHistory,
    selectedImageUrl,
  ]);

  const togglePlatform = (platform: PlatformEnum) => {
    if (!connectedPlatforms.includes(platform)) return;

    setSelectedPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  // Guards against duplicate scheduled posts: resolving the schedule image can
  // wait on the watermark for a long time before any mutation is pending.
  const submitSchedule = async (scheduleDate: string, scheduleTime: string) => {
    if (isSubmittingScheduleRef.current) return;
    isSubmittingScheduleRef.current = true;
    setIsSubmittingSchedule(true);
    try {
      await submitScheduleOnce(scheduleDate, scheduleTime);
    } finally {
      isSubmittingScheduleRef.current = false;
      setIsSubmittingSchedule(false);
    }
  };

  const submitScheduleOnce = async (scheduleDate: string, scheduleTime: string) => {
    if (!selectedHistory?.result) {
      showToast("error", schedulerT("generateFirst"));
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }

    let scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }

    if (isTooSoonToSchedule(scheduledAt, businessTimeZone)) {
      scheduledAt = getNextSchedulableDate(
        new Date(Date.now() + SCHEDULE_MIN_LEAD_MS),
        businessTimeZone
      );
    }

    const connectedSelectedPlatforms = selectedPlatforms.filter((platform) =>
      connectedPlatforms.includes(platform)
    );

    if (connectedSelectedPlatforms.length === 0) {
      showToast("error", schedulerT("selectPlatform"));
      return;
    }

    try {
      const scheduleImageUrl = await resolveScheduleImageUrl();
      if (!scheduleImageUrl) {
        showToast("error", schedulerT("generateFirst"));
        return;
      }

      const caption = form.basic.caption || selectedHistory.result.caption || "";
      // The backend rejects a "ready" post without a caption.
      if (!caption.trim()) {
        showToast("error", schedulerT("captionRequired"));
        return;
      }

      const existingPostId =
        schedulerDraftPost?.id ??
        (editSchedulerManualPostingId ? Number(editSchedulerManualPostingId) : null);
      const formData = {
        imageUrl: scheduleImageUrl,
        caption,
        platforms: connectedSelectedPlatforms,
        dateTime: scheduledAt.toISOString(),
        status: "ready" as const,
        // A new post can't open a chat: the backend allows withChatAI only on
        // drafts. Existing posts keep their chat (the update ignores it).
        withChatAI: existingPostId !== null,
        shareAsReference: isMustShareContent || shareAsReference,
        businessProductId: selectedHistory.input.productKnowledgeId,
        chatSessionId: schedulerDraftPost?.chatSessionId || undefined,
      };

      if (schedulerDraftPost) {
        await mEditSchedulePost.mutateAsync({
          businessId,
          idScheduler: schedulerDraftPost.id,
          formData,
        });
      } else if (editSchedulerManualPostingId) {
        await mEditSchedulePost.mutateAsync({
          businessId,
          idScheduler: Number(editSchedulerManualPostingId),
          formData,
        });
      } else {
        await mSchedulePost.mutateAsync({
          businessId,
          formData,
        });
      }

      setIsSummaryOpen(false);
      setIsScheduleNowConfirmOpen(false);
      if (existingPostId !== null) {
        removeSchedulerDraftMarker(businessId, String(existingPostId));
      }
      showToast("success", schedulerT("postScheduledSuccess"));
      // scheduledAt may have moved past midnight when bumped forward.
      router.push(
        `/business/${businessId}/content-scheduler?selectedDate=${dateManipulation.ymd(scheduledAt)}`
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "WATERMARK_REQUIRED_FOR_FREE_USER"
      ) {
        showToast("error", schedulerT("watermarkNotReady"));
        return;
      }

      // Failed requests are already toasted by the global mutation onError.
      if (!isAxiosError(error)) {
        showToast("error", error);
      }
    }
  };

  const handleConfirmSchedule = async () => {
    const scheduledAt = new Date(`${date}T${time}`);
    if (Number.isNaN(scheduledAt.getTime())) {
      showToast("error", schedulerT("selectDateTime"));
      return;
    }
    if (isTooSoonToSchedule(scheduledAt, businessTimeZone)) {
      setIsScheduleNowConfirmOpen(true);
      return;
    }

    await submitSchedule(date, time);
  };

  const handleScheduleNow = async () => {
    const nextSchedule = getSchedulableInput(businessTimeZone);
    setDate(nextSchedule.date);
    setTime(nextSchedule.time);
    await submitSchedule(nextSchedule.date, nextSchedule.time);
  };

  const isScheduling =
    isSubmittingSchedule ||
    mSchedulePost.isPending ||
    mEditSchedulePost.isPending;

  useEffect(() => {
    const handleOpenScheduleSummary = () => {
      if (mode !== "regenerate" || !schedulerMode) return;
      if (!selectedHistory) {
        showToast("error", schedulerT("generateFirst"));
        return;
      }
      setIsSummaryOpen(true);
    };

    window.addEventListener(
      "content-generate:open-schedule-summary",
      handleOpenScheduleSummary
    );
    return () => {
      window.removeEventListener(
        "content-generate:open-schedule-summary",
        handleOpenScheduleSummary
      );
    };
  }, [mode, schedulerMode, selectedHistory, schedulerT]);

  return (
    // Mobile: card preview (header, gambar, caption) disembunyikan; yang tersisa hanya
    // optimize prompt (non-scheduler) dan bar Generate yang fixed di bawah.
    <div ref={previewPanelRef} className="h-full flex flex-col p-4 sm:p-6 overflow-y-auto scrollbar-hidden max-lg:p-0">
      <CardNoGap className="flex-1 overflow-auto scrollbar-hidden max-lg:contents">
        <div className="sticky top-0 z-20 bg-card p-4 border-b flex items-center justify-between gap-2 max-lg:hidden">
          <div className="flex min-w-0 items-center space-x-3">
            <Image
              src={businessLogo || "/logoblue.png"}
              alt={t("businessLogoAlt")}
              width={200}
              height={200}
              className="w-8 h-8 shrink-0 rounded-full"
              unoptimized
            />
            <span className="truncate font-medium text-sm">{businessName}</span>
          </div>
          {!schedulerMode && selectedHistory && (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => onSelectHistory(null)}
            >
              <RotateCcw className="h-4 w-4" />
              {t("resetForm")}
            </Button>
          )}
        </div>

        <div 
          className="relative w-full transition-all duration-300 overflow-hidden max-lg:hidden"
          style={{ paddingBottom: getPaddingBottomStyle(form.basic.ratio) }}
        >
          <div className="absolute inset-0 w-full h-full">
            {/* A new generation doesn't replace a carousel, so keep it visible meanwhile. */}
            {isCarouselPreview ? (
              <ContentCarouselPreview images={carouselPreviewImages} />
            ) : isLoading ? (
              <div className="flex items-center justify-center w-full h-full bg-background-secondary relative">
                <LogoLoader
                  hideContentBackground={false}
                  className="absolute z-20"
                />
                <ProtectedImage
                  src={displayedPreviewImageUrl}
                  alt=""
                  className="absolute inset-0 bg-black opacity-50 blur-sm"
                />
              </div>
            ) : (
              <ProtectedImage
                src={displayedPreviewImageUrl}
                alt=""
                className="h-full w-full bg-background-secondary"
              />
            )}
          </div>
        </div>

        <div className="p-4 border-b max-lg:hidden">
          <div className="flex items-start gap-3">
            <Image
              src={businessLogo || "/logoblue.png"}
              alt={t("businessLogoAlt")}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full shrink-0 object-cover"
              unoptimized
            />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">{businessName}</span>
              <div className="relative mt-1">
                <Textarea
                  value={form.basic.caption}
                  rows={4}
                  onChange={(e) => {
                    form.setBasic({ ...form.basic, caption: e.target.value });
                  }}
                  className="min-h-[100px] w-full resize-none border-none bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none placeholder:text-muted-foreground/70"
                  placeholder={
                    selectedHistory ? t("captionWillShowHere") : t("writeCaption")
                  }
                />
                {selectedHistory && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="absolute bottom-0 right-0 rounded-full text-muted-foreground hover:text-primary hover:bg-transparent"
                    onClick={() => void handleEnhanceCaption()}
                    disabled={!canEnhanceCaption}
                    title={t("enhanceCaption")}
                    aria-label={t("enhanceCaption")}
                  >
                    {isEnhanceCaptionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>



        {!schedulerMode && (
          <div className="p-4 border-b lg:border-none flex flex-col space-y-2 mb-2">
            <label className="block text-sm font-medium">
              {t("optimizePrompt")}
            </label>
            <Textarea
              value={form?.basic?.prompt || ""}
              rows={3}
              onChange={(e) =>
                form.setBasic({ ...form.basic, prompt: e.target.value })
              }
              className="min-h-[60px] max-h-[120px] resize-none border-border focus:ring-0"
              placeholder={t("writeOptimizePrompt")}
            />
          </div>
        )}
      </CardNoGap>

      {/* Mobile: bar Generate menempel di bawah layar untuk seluruh langkah form */}
      <div className="sticky bottom-0 right-0 border border-border space-y-2 bg-card pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] px-4 -mt-3 rounded-b-md z-10 max-lg:fixed max-lg:inset-x-0 max-lg:z-30 max-lg:mt-0 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:pt-3 md:max-lg:left-16">
        {!schedulerMode && selectedHistory && (
          <div className="flex w-full gap-4">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              disabled={isLoading}
              onClick={() => onSelectHistory(null)}
            >
              <RotateCcw className="h-5 w-5" />
              {t("resetForm")}
            </Button>
          </div>
        )}
        <Button
          onClick={handleGenerateClick}
          size="lg"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          disabled={isLoading}
        >
          {schedulerMode && selectedHistory ? (
            <CalendarClock className="h-5 w-5" />
          ) : !schedulerMode && !isLoading && selectedHistory ? (
            <RefreshCw className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {schedulerMode
            ? selectedHistory
              ? schedulerT("schedulePost")
              : schedulerT("generateContent")
            : isLoading
              ? t("loading")
              : selectedHistory
                ? t("regenerate")
                : t("generate")}
        </Button>
      </div>

      <ScheduleSummaryModal
        isOpen={isSummaryOpen}
        businessName={businessName}
        businessLogo={businessLogo}
        imageUrl={displayedPreviewImageUrl}
        imageUrls={isCarouselPreview ? carouselPreviewImages : undefined}
        ratio={form.basic.ratio}
        caption={form.basic.caption || selectedHistory?.result?.caption || ""}
        date={date}
        time={time}
        minDate={minDate}
        timeZone={businessTimeZone}
        selectedPlatforms={selectedPlatforms}
        platforms={platformOptions}
        isLoading={isScheduling || mEnhanceCaption.isPending}
        shareAsReference={shareAsReference}
        onShareAsReferenceChange={setShareAsReference}
        isShareAsReferenceLocked={isMustShareContent}
        onClose={() => setIsSummaryOpen(false)}
        onCaptionChange={(value) =>
          form.setBasic({ ...form.basic, caption: value })
        }
        onDateChange={handleDateChange}
        onTimeChange={handleTimeChange}
        onTogglePlatform={togglePlatform}
        onEnhanceCaption={handleEnhanceCaption}
        onConfirm={handleConfirmSchedule}
      />
      <ConfirmationModal
        isOpen={isScheduleNowConfirmOpen}
        onClose={() => setIsScheduleNowConfirmOpen(false)}
        onConfirm={handleScheduleNow}
        title={schedulerT("publishTimePassedTitle")}
        description={schedulerT("publishTimePassedDescription")}
        confirmText={schedulerT("scheduleNowConfirm")}
        cancelText={schedulerT("scheduleNowCancel")}
        detailLabel={schedulerT("selectedPublishTime")}
        detailValue={formatScheduleDetail(date, time, locale)}
        isLoading={isScheduling || mEnhanceCaption.isPending}
      />
      <ConfirmationModal
        isOpen={isRestrictedModelModalOpen}
        onClose={() => setIsRestrictedModelModalOpen(false)}
        onCancel={canPurchase ? handleUseFreeUserAllowedModel : undefined}
        onConfirm={canPurchase ? handleTopUpNow : handleUseFreeUserAllowedModel}
        title={modelRestrictionCopy.title}
        description={modelRestrictionCopy.description}
        confirmText={
          canPurchase ? modelRestrictionCopy.topUp : modelRestrictionCopy.useDefault
        }
        cancelText={canPurchase ? modelRestrictionCopy.useDefault : tModal("cancel")}
      />
    </div>
  );
}
