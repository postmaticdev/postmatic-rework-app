"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScheduleTimeInput } from "@/components/ui/schedule-time-input";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { dateFormat } from "@/helper/date-format";
import { dateManipulation } from "@/helper/date-manipulation";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import { showToast } from "@/helper/show-toast";
import {
  getCurrentScheduleInput,
  toBusinessWallDate,
} from "@/lib/schedule-date-time";
import {
  SCHEDULER_DRAFT_MARKERS_CHANGED,
  getSchedulerDraftMarkers,
  removeSchedulerDraftMarker,
  type SchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import { getPublishJobState, getPublishOutcome } from "@/helper/publish-status";
import { PostedImageContent } from "@/models/api/content/image.type";
import { GeneratedImageContent } from "@/models/api/content/scheduler.type";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { JobData } from "@/models/socket-content";
import {
  useContentAutoGenerateGetSettings,
  useContentDraftSetReadyToPost,
  useContentJobGetAllJob,
  useContentPostedGetAllPostedImage,
  useContentSchedulerManualRemove,
  useContentSchedulerTimezoneGetTimezone,
} from "@/services/content/content.api";
import {
  useContentOverviewGetUpcoming,
  useContentPostCommonGetOverview,
} from "@/services/content/overview";
import { useProductKnowledgeGetAll } from "@/services/knowledge.api";
import { useQueryClient } from "@tanstack/react-query";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Eye,
  FileClock,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Sparkles,
  Trash2,
  Upload,
  X,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ContentSchedulerUploadDialog } from "./content-scheduler-upload-dialog";
import { TimezoneSelector } from "./timezone-selector";
import { AutoGenerate } from "../../dashboard/(components)/auto-generate";
import { useContentSchedulerManualEditQueue } from "@/services/content/content.api";

// Next schedulable minute as wall time in the business time zone.
const getNextRetrySchedule = (businessTimeZone?: string | null) =>
  dateFormat.getWallDateTimeInTimeZone(
    new Date(Date.now() + 60 * 1000),
    businessTimeZone
  );

function RetryEventForm({
  event,
  businessId,
  businessTimeZone,
}: {
  event: SchedulerEvent;
  businessId: string;
  businessTimeZone?: string | null;
}) {
  const t = useTranslations("contentScheduler");
  const mEdit = useContentSchedulerManualEditQueue();
  // date/time are wall time in the business time zone, which is how the
  // backend parses publishAt.
  const [initialSchedule] = useState(() => getNextRetrySchedule(businessTimeZone));
  const [date, setDate] = useState(initialSchedule.date);
  const [time, setTime] = useState(initialSchedule.time);

  const handleRetry = async () => {
    if (!event.schedulerManualPostingId) return;

    let schedule = { date, time };
    const now = dateFormat.getWallDateTimeInTimeZone(new Date(), businessTimeZone);
    if (`${date}T${time}` <= `${now.date}T${now.time}`) {
      schedule = getNextRetrySchedule(businessTimeZone);
    }

    try {
      await mEdit.mutateAsync({
        businessId,
        idScheduler: event.schedulerManualPostingId,
        formData: {
          // Never the calendar placeholder: a schedule without an image is
          // rejected by the backend instead of being posted with it.
          imageUrl: event.generatedImageContent?.images?.[0] || "",
          caption: event.generatedImageContent?.caption || "",
          platforms: event.platforms,
          // formatPublishAt sends the local wall time of this instant, i.e.
          // the picked wall time (same as schedule-post.tsx).
          dateTime: new Date(`${schedule.date}T${schedule.time}`).toISOString(),
          status: "ready",
          withChatAI: event.withChatAI,
        },
      });
      showToast("success", t("rescheduleSuccess"));
    } catch {
      // The error toast comes from the global mutation onError.
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-background p-2">
      <Input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="flex-1 bg-background-secondary sm:w-auto"
      />
      <ScheduleTimeInput
        date={date}
        value={time}
        onValueChange={setTime}
        timeZone={businessTimeZone}
        className="flex-1 bg-background-secondary sm:w-auto"
      />
      <Button onClick={handleRetry} disabled={mEdit.isPending}>
        <RefreshCw className="h-4 w-4" />
        {t("retry")}
      </Button>
    </div>
  );
}

type SchedulerEvent = {
  id: string;
  title: string;
  date: Date;
  time: string;
  image: string;
  type: "manual" | "repetition" | "draft";
  platforms: PlatformEnum[];
  schedulerManualPostingId: number | null;
  withChatAI: boolean;
  chatSessionId: number | null;
  businessProductId: number | null;
  generatedImageContent: GeneratedImageContent | null;
  sourceType: "manual" | "auto" | "repetition" | "draft" | "history-draft" | "posted";
  status: string | null;
  draftMarker: SchedulerDraftMarker | null;
  historyJob: JobData | null;
  postedUrl: string | null;
  /* latest publishing job per platform (posted events only) */
  postedContents?: PostedImageContent[];
};

// Calendar status of a published post, from the latest job of each platform.
const POSTED_EVENT_STATUS = {
  published: "posted",
  partial: "partial",
  failed: "failed",
  processing: "processing",
} as const;

interface ContentSchedulerBoardProps {
  handleIfNoPlatformConnected: () => void;
}

// The backend rejects a publishAt in the past; when an edited draft's
// date/time has already passed, move it to the next schedulable minute
// (same adjustment used when the draft is created). date/time are wall time
// in the business time zone.
function resolveFutureSchedule(
  date: string,
  time: string,
  businessTimeZone?: string | null
) {
  const scheduledAt = new Date(`${date}T${time}`);
  if (
    Number.isNaN(scheduledAt.getTime()) ||
    scheduledAt <= toBusinessWallDate(new Date(), businessTimeZone)
  ) {
    return getCurrentScheduleInput(new Date(), businessTimeZone);
  }
  return { date, time };
}

export function ContentSchedulerBoard({
  handleIfNoPlatformConnected,
}: ContentSchedulerBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { businessId } = useParams() as { businessId: string };
  const t = useTranslations("contentScheduler");
  const locale = useLocale();
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingUploadDraft, setEditingUploadDraft] = useState<{
    id: number;
    date: Date;
    image: string;
    caption: string;
    platforms: PlatformEnum[];
  } | null>(null);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<SchedulerEvent | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<SchedulerEvent | null>(null);
  const [draftMarkers, setDraftMarkers] = useState<SchedulerDraftMarker[]>([]);
  const [showDateActionCard, setShowDateActionCard] = useState(false);
  const [dateActionMenuPosition, setDateActionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  const dateActionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const selectedDateQuery = searchParams.get("selectedDate");
    if (!selectedDateQuery) return;

    const parsedDate = new Date(`${selectedDateQuery}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) return;

    setSelectedDate(parsedDate);
    setCurrentMonth(startOfMonth(parsedDate));
    setShowDateActionCard(false);
    setDateActionMenuPosition(null);
  }, [searchParams]);

  useEffect(() => {
    setDraftMarkers(getSchedulerDraftMarkers(businessId));

    const handleDraftMarkersChanged = (event: Event) => {
      const changedBusinessId = (event as CustomEvent<{ businessId: string }>)
        .detail?.businessId;

      if (changedBusinessId === businessId) {
        setDraftMarkers(getSchedulerDraftMarkers(businessId));
      }
    };

    window.addEventListener(
      SCHEDULER_DRAFT_MARKERS_CHANGED,
      handleDraftMarkersChanged
    );

    return () => {
      window.removeEventListener(
        SCHEDULER_DRAFT_MARKERS_CHANGED,
        handleDraftMarkersChanged
      );
    };
  }, [businessId]);

  useEffect(() => {
    if (!showDateActionCard) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (dateActionMenuRef.current?.contains(target)) {
        return;
      }

      if (calendarContainerRef.current?.contains(target)) {
        return;
      }

      setShowDateActionCard(false);
      setDateActionMenuPosition(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showDateActionCard]);

  const rangeStart = dateManipulation.ymd(startOfMonth(currentMonth));
  const rangeEnd = dateManipulation.ymd(endOfMonth(currentMonth));

  // No manual polling: upcoming/posted/job queries poll on their own only
  // while something is being published or generated (and only while the tab
  // is visible); everything else is refreshed by mutation invalidation.
  const queryClient = useQueryClient();
  const { data: postOverviewData } = useContentPostCommonGetOverview(businessId);
  const { data: upcomingData } = useContentOverviewGetUpcoming(
    businessId,
    {
      dateStart: rangeStart,
      dateEnd: rangeEnd,
    }
  );
  const { data: postedData } = useContentPostedGetAllPostedImage(
    businessId,
    { dateStart: rangeStart, dateEnd: rangeEnd },
    true
  );
  const { data: autoGenerateData } = useContentAutoGenerateGetSettings(businessId);
  const { data: timezoneData } = useContentSchedulerTimezoneGetTimezone(businessId);
  // Every date/time on the calendar is wall time in the business time zone,
  // the zone the backend schedules in and the one shown in the selector.
  const businessTimeZone = timezoneData?.data.data?.timezone;
  const { data: generationHistoryData } = useContentJobGetAllJob(businessId, true, true);
  const postOverview = postOverviewData?.data.data;
  const { data: productsData } = useProductKnowledgeGetAll(businessId, {
    limit: 100,
    sortBy: "name",
    sort: "asc",
  });

  // When a READY post whose publish time has passed leaves the READY list the
  // worker has published (or failed) it: mark every posted list (calendar and
  // History) and the overview counters stale once. All READY posts are
  // tracked with their publish time, so a post that became due while the tab
  // was hidden (or was handled before the next fetch) is still detected.
  const readyPostsRef = useRef<{ range: string; publishAtById: Map<number, number> }>({
    range: "",
    publishAtById: new Map(),
  });
  useEffect(() => {
    const items = upcomingData?.data.data;
    if (!items) return;

    const range = `${rangeStart}|${rangeEnd}`;
    const previousReady =
      readyPostsRef.current.range === range
        ? readyPostsRef.current.publishAtById
        : new Map<number, number>();
    const now = Date.now();
    const readyItems = items.filter(
      (item) => item.status?.toLowerCase() === "ready"
    );
    const readyIds = new Set(readyItems.map((item) => item.id));
    // A future post that disappears was cancelled: nothing was published.
    const hasFinishedPost = Array.from(previousReady).some(
      ([id, publishAtMs]) => !readyIds.has(id) && publishAtMs <= now
    );
    readyPostsRef.current = {
      range,
      publishAtById: new Map(
        readyItems.map((item) => [item.id, new Date(item.date).getTime()])
      ),
    };

    if (hasFinishedPost) {
      queryClient.invalidateQueries({
        queryKey: ["contentPostedGetAllPostedImage", businessId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contentPostCommonOverview", businessId],
      });
    }
  }, [businessId, queryClient, rangeEnd, rangeStart, upcomingData?.data.data]);
  const mRemove = useContentSchedulerManualRemove();
  const mReadyToPost = useContentDraftSetReadyToPost();

  const productMap = useMemo(() => {
    return new Map(
      (productsData?.data.data || []).map((product) => [product.id, product.name])
    );
  }, [productsData?.data.data]);

  const manualEvents = useMemo<SchedulerEvent[]>(
    () =>
      (upcomingData?.data.data || []).map((item) => {
        const matchingDraftMarker = draftMarkers.find(
          (marker) =>
            String(item.schedulerManualPostingId || item.id) === marker.draftId
        );
        const markerImage = matchingDraftMarker?.image || "";
        const realImages = item.images.length
          ? item.images
          : markerImage
            ? [markerImage]
            : [];
        const displayImage = realImages[0] || DEFAULT_PLACEHOLDER_IMAGE;
        const publishAt = toBusinessWallDate(new Date(item.date), businessTimeZone);

        return {
          id: `upcoming-${item.id}`,
          title:
            item.status?.toLowerCase() === "draft"
              ? t("draftLabel")
              : item.title || t("scheduledPostLabel"),
          date: publishAt,
          time: dateFormat.getHhMm(publishAt),
          image: displayImage,
          type:
            item.status?.toLowerCase() === "draft"
              ? "draft"
              : item.type === "manual"
                ? "manual"
                : "repetition",
          platforms: item.platforms,
          schedulerManualPostingId: item.schedulerManualPostingId,
          withChatAI: item.withChatAI ?? false,
          chatSessionId: item.chatSessionId ?? null,
          businessProductId: item.businessProductId ?? null,
          generatedImageContent: {
            ...item.generatedImageContent,
            images: realImages,
            caption:
              item.generatedImageContent.caption ||
              matchingDraftMarker?.caption ||
              "",
          },
          sourceType: item.type,
          // Failed schedules without publishing jobs come from calendar-view
          // only; reuse the posted badges (and "Coba Lagi") for them.
          status:
            item.status?.toLowerCase() === "partial_published"
              ? "partial"
              : item.status?.toLowerCase() ?? null,
          draftMarker: null,
          historyJob: null,
          postedUrl: null,
        };
      }),
    [businessTimeZone, draftMarkers, t, upcomingData?.data.data]
  );

  const repetitionEvents = useMemo<SchedulerEvent[]>(() => {
    const settings = autoGenerateData?.data.data;
    if (!settings?.preference?.isActive) {
      return [];
    }

    const datesInMonth = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    });
    // Repetitions are only projected ahead: a past slot either produced a post
    // (shown from the posting history) or never ran.
    const now = toBusinessWallDate(new Date(), businessTimeZone);

    return settings.schedules.flatMap((daySchedule) =>
      daySchedule.schedules
        .filter((schedule) => schedule.isActive)
        .flatMap((schedule) =>
          datesInMonth
            .filter((date) => getDay(date) === schedule.day)
            .map((date) => ({
              date,
              runAt: new Date(`${dateManipulation.ymd(date)}T${schedule.time}`),
            }))
            .filter(({ runAt }) => runAt > now)
            .map(({ date, runAt }) => ({
              id: `auto-${schedule.id}-${date.toISOString()}`,
              title:
                productMap.get(schedule.productKnowledgeId) ||
                t("contentRepetitionLabel"),
              date: runAt,
              time: schedule.time,
              image: DEFAULT_PLACEHOLDER_IMAGE,
              type: "repetition" as const,
              platforms: schedule.platforms,
              schedulerManualPostingId: null,
              withChatAI: false,
              chatSessionId: null,
              businessProductId: Number(schedule.productKnowledgeId),
              generatedImageContent: null,
              sourceType: "repetition" as const,
              status: null,
              draftMarker: null,
              historyJob: null,
              postedUrl: null,
            }))
        )
    );
  }, [autoGenerateData?.data.data, businessTimeZone, currentMonth, productMap, t]);

  const draftEvents = useMemo<SchedulerEvent[]>(
    () =>
      draftMarkers
        .filter(
          (marker) =>
            marker.time &&
            marker.chatSessionId !== undefined &&
            !manualEvents.some(
              (event) => String(event.schedulerManualPostingId || "") === marker.draftId
            )
        )
        .map((marker) => ({
          id: `draft-${marker.draftId}`,
          title: t("draftLabel"),
          date: new Date(`${marker.date}T00:00:00`),
          time: marker.time || "",
          image: marker.image || DEFAULT_PLACEHOLDER_IMAGE,
          type: "draft",
          platforms: [],
          schedulerManualPostingId:
            Number.isNaN(Number(marker.draftId)) ? null : Number(marker.draftId),
          withChatAI: true,
          chatSessionId:
            marker.chatSessionId === null || marker.chatSessionId === undefined
              ? null
              : Number.isNaN(Number(marker.chatSessionId))
                ? null
                : Number(marker.chatSessionId),
          businessProductId:
            marker.businessProductId === null ||
              marker.businessProductId === undefined
              ? null
              : Number.isNaN(Number(marker.businessProductId))
                ? null
                : Number(marker.businessProductId),
          generatedImageContent: null,
          sourceType: "draft",
          status: null,
          draftMarker: marker,
          historyJob: null,
          postedUrl: null,
        })),
    [draftMarkers, manualEvents, t]
  );

  const historyDraftEvents = useMemo<SchedulerEvent[]>(() => {
    const markedJobIds = new Set(draftMarkers.map((marker) => marker.jobId));
    const scheduledImages = new Set(
      manualEvents.flatMap((event) => event.generatedImageContent?.images || [])
    );

    return (generationHistoryData?.data.data || [])
      .flatMap((group) => group.jobs)
      .filter((job) => {
        const image = job.result?.images?.[0];
        if (!image) return false;
        if (job.status !== "done" || job.stage !== "done") return false;
        if (markedJobIds.has(job.id)) return false;
        if (scheduledImages.has(image)) return false;
        return true;
      })
      .map((job) => {
        const image = job.result?.images?.[0] || DEFAULT_PLACEHOLDER_IMAGE;
        const createdAt = toBusinessWallDate(new Date(job.createdAt), businessTimeZone);

        return {
          id: `history-draft-${job.id}`,
          title: job.product?.name || t("draftLabel"),
          date: createdAt,
          time: dateFormat.getHhMm(createdAt),
          image,
          type: "draft" as const,
          platforms: [],
          schedulerManualPostingId: null,
          withChatAI: true,
          chatSessionId: null,
          businessProductId: null,
          generatedImageContent: null,
          sourceType: "history-draft" as const,
          status: null,
          draftMarker: {
            draftId: `history-${job.id}`,
            jobId: job.id,
            date: dateManipulation.ymd(createdAt),
            image,
            caption: job.result?.caption || "",
            createdAt: job.createdAt,
          },
          historyJob: job,
          postedUrl: null,
        };
      });
  }, [
    businessTimeZone,
    draftMarkers,
    generationHistoryData?.data.data,
    manualEvents,
    t,
  ]);

  const postedEvents = useMemo<SchedulerEvent[]>(
    () =>
      (postedData?.data.data || []).map((item) => {
        const image = item.images[0] || DEFAULT_PLACEHOLDER_IMAGE;
        const postedAt = toBusinessWallDate(
          new Date(item.createdAt || item.updatedAt),
          businessTimeZone
        );
        const postedContents = item.postedImageContents || [];
        const outcome = getPublishOutcome(postedContents) ?? "published";
        const postedUrl =
          postedContents.find(
            (post) =>
              getPublishJobState(post.jobStatus, post.updatedAt) === "success" && post.url
          )?.url || null;

        // Untitled posts are named after their real outcome, not "posted".
        const fallbackTitle =
          outcome === "failed"
            ? t("failedToPost")
            : outcome === "partial"
              ? t("publishStatusPartial")
              : outcome === "processing"
                ? t("publishStatusProcessing")
                : t("postedThisMonth");

        return {
          id: `posted-${item.id}`,
          title: item.caption || fallbackTitle,
          date: postedAt,
          time: dateFormat.getHhMm(postedAt),
          image,
          type: "manual" as const,
          platforms: item.platforms,
          schedulerManualPostingId: Number.isNaN(Number(item.id))
            ? null
            : Number(item.id),
          withChatAI: false,
          chatSessionId: null,
          businessProductId: Number.isNaN(Number(item.productKnowledgeId))
            ? null
            : Number(item.productKnowledgeId),
          generatedImageContent: {
            id: item.id,
            images: item.images,
            ratio: item.ratio,
            category: item.category,
            designStyle: item.designStyle,
            caption: item.caption,
            productKnowledgeId: item.productKnowledgeId,
            rootBusinessId: item.rootBusinessId,
            deletedAt: item.deletedAt || "",
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          },
          sourceType: "posted" as const,
          status: POSTED_EVENT_STATUS[outcome],
          draftMarker: null,
          historyJob: null,
          postedUrl,
          postedContents,
        };
      }),
    [businessTimeZone, postedData?.data.data, t]
  );

  const mergedEvents = useMemo(
    () => {
      // A failed/partial post that was rescheduled (READY again) is shown as
      // the upcoming retry instead of the old failed result.
      const rescheduledIds = new Set(
        manualEvents
          .filter((event) => event.status === "ready")
          .map((event) => event.generatedImageContent?.id)
          .filter((id) => Boolean(id))
      );
      const visiblePostedEvents = postedEvents.filter(
        (event) =>
          event.status === "posted" ||
          event.status === "processing" ||
          !rescheduledIds.has(event.generatedImageContent?.id)
      );
      const postedGeneratedImageIds = new Set(
        visiblePostedEvents
          .map((event) => event.generatedImageContent?.id)
          .filter((id) => Boolean(id))
      );
      const visibleManualEvents = manualEvents.filter(
        (event) =>
          !event.generatedImageContent?.id ||
          !postedGeneratedImageIds.has(event.generatedImageContent.id)
      );

      const postedEventsByDateAndProduct = new Set(
        postedEvents
          .filter(e => e.businessProductId)
          .map(e => `${dateManipulation.ymd(e.date)}|${e.businessProductId}`)
      );
      
      const visibleRepetitionEvents = repetitionEvents.filter(
        (event) =>
          !event.businessProductId ||
          !postedEventsByDateAndProduct.has(`${dateManipulation.ymd(event.date)}|${event.businessProductId}`)
      );

      return [
        ...visibleManualEvents,
        ...visiblePostedEvents,
        ...visibleRepetitionEvents,
        ...draftEvents,
        ...historyDraftEvents,
      ].sort(
        (left, right) => left.date.getTime() - right.date.getTime()
      );
    },
    [draftEvents, historyDraftEvents, manualEvents, postedEvents, repetitionEvents]
  );

  const selectedDateEvents = useMemo(
    () => mergedEvents.filter((item) => isSameDay(item.date, selectedDate)),
    [mergedEvents, selectedDate]
  );

  // Group once per data change instead of filtering all events for each of
  // the 42 calendar cells on every render.
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, SchedulerEvent[]>();
    mergedEvents.forEach((event) => {
      const key = dateManipulation.ymd(event.date);
      grouped.set(key, [...(grouped.get(key) || []), event]);
    });
    return grouped;
  }, [mergedEvents]);

  const calendarDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
      }),
    [currentMonth]
  );

  const weekdayLabels = useMemo(() => {
    const baseDate = startOfWeek(new Date(), { weekStartsOn: 0 });
    return eachDayOfInterval({
      start: baseDate,
      end: endOfWeek(baseDate, { weekStartsOn: 0 }),
    }).map((date) =>
      new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        weekday: "short",
      }).format(date)
    );
  }, [locale]);

  const monthLabel = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(currentMonth);

  const formatFullDate = (date: Date) =>
    new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  const formatDateTitle = (date: Date) =>
    new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  const today = startOfDay(toBusinessWallDate(new Date(), businessTimeZone));
  const isPastDate = (date: Date) => isBefore(startOfDay(date), today);
  const canCreateNewOnSelectedDate = !isPastDate(selectedDate);

  const isEventEditable = (event: SchedulerEvent) => {
    if (event.sourceType === "posted") {
      return false;
    }

    if (isPastDate(event.date)) {
      return event.type === "draft";
    }

    return (
      event.sourceType === "draft" ||
      event.sourceType === "history-draft" ||
      (event.sourceType === "manual" && !!event.schedulerManualPostingId)
    );
  };
  const canCancelEvent = (event: SchedulerEvent) => {
    if (event.sourceType === "posted") {
      return false;
    }

    if (
      event.sourceType === "manual" &&
      event.status === "ready" &&
      isPastDate(event.date)
    ) {
      return false;
    }

    if (event.sourceType === "draft") {
      return true;
    }

    return Boolean(event.generatedImageContent);
  };

  const handleViewEvent = (event: SchedulerEvent) => {
    setViewEvent(event);
    setIsViewDialogOpen(true);
  };

  const handleEditEvent = (event: SchedulerEvent) => {
    const eventIsPast = isPastDate(event.date);

    if (eventIsPast && event.type !== "draft") {
      handleViewEvent(event);
      return;
    }

    if (
      event.sourceType === "manual" &&
      !event.withChatAI &&
      event.schedulerManualPostingId &&
      event.generatedImageContent
    ) {
      const updatedEditDate = new Date(
        eventIsPast ? today.getTime() : event.date.getTime()
      );
      updatedEditDate.setHours(event.date.getHours(), event.date.getMinutes(), 0, 0);

      setSelectedDate(updatedEditDate);
      setEditingUploadDraft({
        id: event.schedulerManualPostingId,
        date: updatedEditDate,
        image: event.generatedImageContent.images[0] || event.image,
        caption: event.generatedImageContent.caption || "",
        platforms: event.platforms,
      });
      setIsHistoryDialogOpen(false);
      setIsViewDialogOpen(false);
      setIsUploadDialogOpen(true);
      return;
    }

    if (event.sourceType === "draft" && event.draftMarker) {
      const { date: scheduleDate, time: scheduleTime } = resolveFutureSchedule(
        eventIsPast ? dateManipulation.ymd(today) : event.draftMarker.date,
        event.draftMarker.time ||
          event.time ||
          getCurrentScheduleInput(new Date(), businessTimeZone).time,
        businessTimeZone
      );
      const params = new URLSearchParams({
        scheduleDate,
        scheduleTime,
        editSchedulerManualPostingId: event.draftMarker.draftId,
        selectedHistoryId: event.draftMarker.jobId,
        selectedHistoryImage: event.draftMarker.image,
      });
      if (event.draftMarker.chatSessionId !== undefined && event.draftMarker.chatSessionId !== null) {
        params.set("chatSessionId", String(event.draftMarker.chatSessionId));
      }
      if (event.draftMarker.businessProductId !== undefined && event.draftMarker.businessProductId !== null) {
        params.set("businessProductId", String(event.draftMarker.businessProductId));
      }

      setIsHistoryDialogOpen(false);
      router.push(`/business/${businessId}/content-generate?${params.toString()}`);
      return;
    }

    if (event.sourceType === "history-draft" && event.draftMarker) {
      const scheduleDate = eventIsPast
        ? dateManipulation.ymd(today)
        : event.draftMarker.date;
      const params = new URLSearchParams({
        scheduleDate,
        selectedHistoryId: event.draftMarker.jobId,
        selectedHistoryImage: event.draftMarker.image,
      });

      setIsHistoryDialogOpen(false);
      router.push(`/business/${businessId}/content-generate?${params.toString()}`);
      return;
    }

    if (!event.generatedImageContent || !event.schedulerManualPostingId) {
      return;
    }

    const { date: scheduleDate, time: scheduleTime } = resolveFutureSchedule(
      eventIsPast ? dateManipulation.ymd(today) : dateManipulation.ymd(event.date),
      event.time,
      businessTimeZone
    );
    const params = new URLSearchParams({
      scheduleDate,
      scheduleTime,
      editSchedulerManualPostingId: String(event.schedulerManualPostingId),
      selectedHistoryImage: event.generatedImageContent.images[0] || event.image || "",
      platforms: event.platforms.join(","),
    });
    if (event.chatSessionId) {
      params.set("chatSessionId", String(event.chatSessionId));
    }
    if (event.businessProductId) {
      params.set("businessProductId", String(event.businessProductId));
    }

    setIsHistoryDialogOpen(false);
    document.body.style.pointerEvents = "";
    window.setTimeout(() => {
      document.body.style.pointerEvents = "";
      router.push(`/business/${businessId}/content-generate?${params.toString()}`);
      window.setTimeout(() => {
        router.refresh();
      }, 300);
    }, 0);
  };

  const handleAskCancelEvent = (event: SchedulerEvent) => {
    if (!canCancelEvent(event)) {
      return;
    }

    setEventToCancel(event);
    setIsCancelDialogOpen(true);
  };

  const handleDatePickerChange = (value: string) => {
    if (!value) return;

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return;

    setSelectedDate(date);
    setCurrentMonth(startOfMonth(date));
    setShowDateActionCard(false);
    setDateActionMenuPosition(null);
  };

  const handleConfirmCancelEvent = async () => {
    try {
      if (eventToCancel?.sourceType === "draft" && eventToCancel.draftMarker) {
        removeSchedulerDraftMarker(businessId, eventToCancel.draftMarker.draftId);
        setDraftMarkers(getSchedulerDraftMarkers(businessId));
        setIsCancelDialogOpen(false);
        setEventToCancel(null);
        return;
      }

      if (!eventToCancel?.generatedImageContent) return;

      if (
        eventToCancel.sourceType === "manual" &&
        eventToCancel.schedulerManualPostingId
      ) {
        const res = await mRemove.mutateAsync({
          businessId,
          idScheduler: eventToCancel.schedulerManualPostingId,
        });
        // A backend draft may also have a local draft marker; drop it so the
        // deleted draft doesn't reappear from localStorage.
        removeSchedulerDraftMarker(
          businessId,
          String(eventToCancel.schedulerManualPostingId)
        );
        setDraftMarkers(getSchedulerDraftMarkers(businessId));
        showToast("success", res.data.responseMessage);
      } else {
        const res = await mReadyToPost.mutateAsync({
          businessId,
          generatedImageContentId: eventToCancel.generatedImageContent.id,
        });
        showToast("success", res.data.responseMessage);
      }

      setIsCancelDialogOpen(false);
      setEventToCancel(null);
    } catch { }
  };

  const openDateAction = (
    date: Date,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    const dateEvents = mergedEvents.filter((item) => isSameDay(item.date, date));

    if (dateEvents.length > 0) {
      setSelectedDate(date);
      setShowDateActionCard(false);
      setDateActionMenuPosition(null);
      setIsHistoryDialogOpen(true);
      return;
    }

    if (isPastDate(date)) {
      return;
    }

    const containerRect = calendarContainerRef.current?.getBoundingClientRect();
    const triggerRect = event.currentTarget.getBoundingClientRect();

    setSelectedDate(date);
    setShowDateActionCard(true);

    if (!containerRect) {
      setDateActionMenuPosition(null);
      return;
    }

    const menuRightEdge = Math.min(
      triggerRect.left -
      containerRect.left +
      triggerRect.width -
      12,
      containerRect.width - 12
    );
    // Menu height: 3 actions × ~52px + padding, so it never overflows the bottom.
    const menuTop = Math.min(
      triggerRect.top - containerRect.top + 8,
      containerRect.height - 172
    );

    setDateActionMenuPosition({
      top: Math.max(menuTop, 12),
      left: Math.max(menuRightEdge, 196),
    });
  };

  const chosenDate = dateManipulation.ymd(selectedDate);

  return (
    <>
      {/* Mobile: urutan Overview → Kalender → Pengulangan Konten (via order);
          lg ke atas kembali ke layout 2 kolom */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="order-2 lg:order-none">
          <CardContent className="p-4 sm:p-6">
            <div className="mb-4 sm:mb-6">
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 justify-self-start"
                  aria-label={t("previousMonth")}
                  onClick={() => {
                    setCurrentMonth((current) => subMonths(current, 1));
                    setShowDateActionCard(false);
                    setDateActionMenuPosition(null);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="relative mx-auto flex justify-center">
                  <input
                    type="date"
                    value={dateManipulation.ymd(selectedDate)}
                    aria-label={t("today")}
                    onChange={(event) => handleDatePickerChange(event.target.value)}
                    className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                  <span
                    aria-hidden="true"
                    className={buttonVariants({
                      variant: "outline",
                      className:
                        "pointer-events-none w-auto min-w-[160px] text-center text-lg font-bold capitalize peer-focus-visible:border-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 sm:min-w-[220px] sm:text-xl",
                    })}
                  >
                    {monthLabel}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 justify-self-end"
                  aria-label={t("nextMonth")}
                  onClick={() => {
                    setCurrentMonth((current) => addMonths(current, 1));
                    setShowDateActionCard(false);
                    setDateActionMenuPosition(null);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="w-full overflow-visible">
              <div
                ref={calendarContainerRef}
                className="relative w-full min-w-0 overflow-hidden rounded-2xl border border-border sm:rounded-[28px]"
              >
                <div className="grid grid-cols-7 bg-background-secondary">
                  {weekdayLabels.map((label) => (
                    <div
                      key={label}
                      className="min-w-0 truncate px-0.5 py-2 text-center text-[11px] font-medium uppercase text-muted-foreground sm:p-2 sm:text-sm sm:tracking-[0.24em]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarDays.map((day) => {
                    const dayEvents =
                      eventsByDay.get(dateManipulation.ymd(day)) || [];
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);
                    const visibleEvents = dayEvents.slice(0, 2);
                    const hiddenEventCount = dayEvents.length - visibleEvents.length;

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={(event) => openDateAction(day, event)}
                        className={`flex min-w-0 flex-col justify-start border-b border-r px-1 py-1.5 text-right align-top transition-colors min-h-[104px] sm:min-h-[116px] sm:px-2 sm:py-2 xl:min-h-[85px] ${isToday
                            ? "bg-blue-50 dark:bg-blue-950/60"
                            : isCurrentMonth
                              ? "bg-card"
                              : "bg-background-secondary/50"
                          } ${isSelected ? "ring-1 ring-inset ring-primary/30" : ""} ${isToday ? "hover:bg-blue-100/80 dark:hover:bg-blue-900/60" : "hover:bg-primary/5"
                          }`}
                      >
                        <div
                          className={`mb-2 text-sm font-semibold sm:mb-3 sm:text-base xl:text-lg ${isToday ? "inline-flex h-7 min-w-7 items-center justify-center self-end rounded-full bg-blue-600 px-2 text-white sm:h-8 sm:min-w-8 dark:bg-blue-500" : isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                            }`}
                        >
                          {format(day, "d")}
                        </div>

                        <div className="min-w-0 space-y-1 sm:space-y-1.5">
                          {visibleEvents.map((event) => (
                            <div
                              key={event.id}
                              className={`min-w-0 overflow-hidden rounded-md sm:rounded-lg ${event.status === "posted"
                                  ? "bg-blue-100 text-blue-600"
                                  : event.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : event.status === "partial"
                                  ? "bg-orange-100 text-orange-700"
                                  : event.status === "processing"
                                  ? "bg-slate-100 text-slate-600"
                                  : event.type === "manual"
                                  ? "bg-rose-100 text-rose-600"
                                  : event.type === "draft"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-violet-100 text-violet-600"
                                }`}
                            >
                              <div className="px-1 py-0.5 text-[11px] leading-tight sm:px-2 sm:py-1 sm:text-xs">
                                <div className="truncate font-medium">
                                  {event.title}
                                </div>
                                <div className="truncate opacity-90">{event.time}</div>
                              </div>
                            </div>
                          ))}
                          {hiddenEventCount > 0 && (
                            <div
                              className="min-w-0 overflow-hidden rounded-md bg-background-secondary text-muted-foreground sm:rounded-lg"
                            >
                              <div className="truncate px-0.5 py-0.5 text-center text-[11px] font-semibold leading-tight sm:px-2 sm:py-1 sm:text-xs">
                                {t("moreCount", { count: hiddenEventCount })}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showDateActionCard && dateActionMenuPosition && (
                  <div
                    ref={dateActionMenuRef}
                    className="absolute z-20 w-52 rounded-2xl border border-border bg-card p-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                    style={{
                      top: dateActionMenuPosition.top,
                      left: dateActionMenuPosition.left,
                      transform: "translateX(-100%)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUploadDraft(null);
                        setIsUploadDialogOpen(true);
                        setShowDateActionCard(false);
                        setDateActionMenuPosition(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background-secondary"
                    >
                      <span className="flex size-8 items-center justify-center rounded-xl bg-background-secondary text-foreground">
                        <Upload className="size-4" />
                      </span>
                      {t("uploadFile")}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDateActionCard(false);
                        setDateActionMenuPosition(null);
                        router.push(
                          `/business/${businessId}/content-generate?scheduleDate=${chosenDate}`
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background-secondary"
                    >
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                      </span>
                      {t("buildWithAi")}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDateActionCard(false);
                        setDateActionMenuPosition(null);
                        router.push(
                          `/business/${businessId}/video-generator?scheduleDate=${chosenDate}`
                        );
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background-secondary"
                    >
                      <span className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Clapperboard className="size-4" />
                      </span>
                      {t("videoGenerator")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="contents lg:flex h-full flex-col gap-6">
          <Card className="order-1 lg:order-none">
            <CardContent className="space-y-4 p-4 sm:space-y-5 sm:p-6">
              <div className="text-xl font-bold sm:text-2xl">{t("overview")}</div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex min-w-0 flex-row items-center gap-2 rounded-xl border border-border px-2 py-3 sm:gap-3 sm:px-4 sm:py-2">
                  <div className="shrink-0 rounded-md bg-rose-100 p-1.5 text-rose-500 sm:p-2">
                    <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex min-w-0 flex-col-reverse sm:flex-col">
                    <div className="text-[11px] leading-tight text-muted-foreground sm:text-xs sm:leading-(--text-xs--line-height)">
                      {t("overviewQueued")}
                    </div>
                    <div className="text-lg leading-tight font-semibold sm:-mt-1 sm:text-base sm:leading-normal">
                      {postOverview?.totalFutureReadySchedules ?? 0}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-row items-center gap-2 rounded-xl border border-border px-2 py-3 sm:gap-3 sm:px-4 sm:py-2">
                  <div className="shrink-0 rounded-md bg-amber-100 p-1.5 text-amber-500 sm:p-2">
                    <Repeat2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex min-w-0 flex-col-reverse sm:flex-col">
                    <div className="text-[11px] leading-tight text-muted-foreground sm:text-xs sm:leading-(--text-xs--line-height)">
                      {t("overviewRepetition")}
                    </div>
                    <div className="text-lg leading-tight font-semibold sm:-mt-1 sm:text-base sm:leading-normal">
                      {postOverview?.totalActiveRepetitions ?? 0}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-row items-center gap-2 rounded-xl border border-border px-2 py-3 sm:gap-3 sm:px-4 sm:py-2">
                  <div className="shrink-0 rounded-md bg-blue-100 p-1.5 text-blue-500 sm:p-2">
                    <FileClock className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="flex min-w-0 flex-col-reverse sm:flex-col">
                    <div className="text-[11px] leading-tight text-muted-foreground sm:text-xs sm:leading-(--text-xs--line-height)">
                      {t("overviewPosted")}
                    </div>
                    <div className="text-lg leading-tight font-semibold sm:-mt-1 sm:text-base sm:leading-normal">
                      {postOverview?.totalSuccessfulPosted ?? 0}
                    </div>
                  </div>
                </div>
              </div>


              <TimezoneSelector />



              <Link href={`/business/${businessId}/knowledge-base`} className="block">
                <Button className="w-full">
                  <BookOpen className="h-4 w-4" />
                  {t("goToBusinessKnowledge")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <div className="order-3 lg:contents">
            <AutoGenerate
              handleIfNoPlatformConnected={handleIfNoPlatformConnected}
              cardClassName="flex-1 xl:max-h-[calc(100vh-8.5rem)] xl:overflow-hidden"
              scheduleListClassName="flex flex-col gap-4 xl:max-h-[calc(80vh-19rem)] xl:overflow-y-auto scrollbar-hidden xl:pr-1"
            />
          </div>
        </div>
      </div>

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 pr-8 max-sm:flex-col max-sm:gap-3">
              <div>
                <DialogTitle>{formatDateTitle(selectedDate)}</DialogTitle>
                <DialogDescription>
                  {t("scheduledDateHistoryDescription")}
                </DialogDescription>
              </div>
              {canCreateNewOnSelectedDate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      {t("createNew")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => {
                        setIsHistoryDialogOpen(false);
                        setEditingUploadDraft(null);
                        setIsUploadDialogOpen(true);
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      {t("uploadFile")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setIsHistoryDialogOpen(false);
                        router.push(
                          `/business/${businessId}/content-generate?scheduleDate=${chosenDate}`
                        );
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      {t("buildWithAi")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setIsHistoryDialogOpen(false);
                        router.push(
                          `/business/${businessId}/video-generator?scheduleDate=${chosenDate}`
                        );
                      }}
                    >
                      <Clapperboard className="h-4 w-4" />
                      {t("videoGenerator")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:p-6">
            <div className="space-y-3">
              {selectedDateEvents.map((event) => (
                <div key={event.id} className="flex flex-col gap-2">
                  <div
                    className="flex items-center gap-3 rounded-2xl bg-background-secondary p-3"
                  >
                  <Image
                    src={event.image}
                    alt={event.title}
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <div className="truncate text-base font-semibold sm:text-lg">
                        {event.title}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${event.status === "posted"
                          ? "bg-blue-500 text-white"
                          : event.status === "failed"
                          ? "bg-red-600 text-white"
                          : event.status === "partial"
                          ? "bg-orange-500 text-white"
                          : event.status === "processing"
                          ? "bg-slate-500 text-white"
                          : event.type === "manual"
                          ? "bg-rose-500 text-white"
                          : event.type === "draft"
                            ? "bg-amber-500 text-white"
                            : "bg-violet-600 text-white"
                          }`}
                      >
                        {event.status === "posted"
                          ? t("postedBadge")
                          : event.status === "failed"
                          ? t("publishStatusFailed")
                          : event.status === "partial"
                          ? t("publishStatusPartial")
                          : event.status === "processing"
                          ? t("publishStatusProcessing")
                          : event.type === "manual"
                          ? t("scheduledBadge")
                          : event.type === "draft"
                            ? t("draftLabel")
                            : t("repetitionBadge")}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatFullDate(event.date)} - {event.time}{" "}
                      {timezoneData?.data.data?.offset || ""}
                    </div>
                  </div>

                  {event.sourceType === "posted" ? (
                    event.postedUrl ? (
                      <Button variant="outline" size="sm" asChild className="shrink-0">
                        <a href={event.postedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                          {t("viewPost")}
                        </a>
                      </Button>
                    ) : (
                      // No public URL (failed / still processing): show the details instead.
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        onClick={() => handleViewEvent(event)}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">{t("viewPost")}</span>
                      </Button>
                    )
                  ) : event.type === "manual" || event.type === "draft" ? (
                    <div className="flex shrink-0 items-center gap-1">
                    {event.type === "draft" && isEventEditable(event) && (
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="max-sm:sr-only">{t("continueEditing")}</span>
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">{t("scheduledHistoryActions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {event.type !== "draft" && (
                          <DropdownMenuItem onClick={() => handleViewEvent(event)}>
                            <Eye className="h-4 w-4" />
                            {t("viewPost")}
                          </DropdownMenuItem>
                        )}
                        {/* posted events are handled by the branch above */}
                        <DropdownMenuItem
                          disabled={!isEventEditable(event)}
                          onClick={() => handleEditEvent(event)}
                        >
                          <Pencil className="h-4 w-4" />
                          {t("editPost")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canCancelEvent(event)}
                          onClick={() => handleAskCancelEvent(event)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          {event.type === "draft"
                            ? t("deleteDraft")
                            : t("cancelQueue")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  ) : null}
                </div>
                {(event.status === "failed" ||
                  event.status === "error" ||
                  event.status === "partial") && (
                  <RetryEventForm
                    event={event}
                    businessId={businessId}
                    businessTimeZone={businessTimeZone}
                  />
                )}
              </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>{t("viewPost")}</DialogTitle>
            <DialogDescription>{viewEvent && formatFullDate(viewEvent.date)}</DialogDescription>
          </DialogHeader>

          {viewEvent && (
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:p-6">
              {viewEvent.postedUrl && (
                <a
                  href={viewEvent.postedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t("viewOnPlatform")}
                </a>
              )}
              <Image
                src={viewEvent.image}
                alt={viewEvent.title}
                width={720}
                height={720}
                className="h-auto w-full rounded-lg object-cover"
              />

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium">{t("postTitle")}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {viewEvent.title}
                  </div>
                </div>
                {viewEvent.generatedImageContent?.caption && (
                  <div>
                    <div className="text-sm font-medium">{t("caption")}</div>
                    <div className="mt-1 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                      {viewEvent.generatedImageContent.caption}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium">{t("choosePlatforms")}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {viewEvent.postedContents?.length
                      ? viewEvent.postedContents.map((post) => {
                          const state = getPublishJobState(post.jobStatus, post.updatedAt);
                          const chip = (
                            <>
                              {mapEnumPlatform.getPlatformIcon(post.platform, "h-3 w-3")}
                              {mapEnumPlatform.getPlatformLabel(post.platform)}
                              <span className="opacity-80">
                                ·{" "}
                                {state === "success"
                                  ? t("postedBadge")
                                  : state === "failed"
                                    ? t("publishStatusFailed")
                                    : t("publishStatusProcessing")}
                              </span>
                              {state === "success" && post.url && (
                                <ExternalLink className="h-3 w-3" />
                              )}
                            </>
                          );
                          const chipClassName = `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${state === "success"
                            ? "bg-blue-100 text-blue-700"
                            : state === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-background-secondary text-muted-foreground"
                            }`;

                          return state === "success" && post.url ? (
                            <a
                              key={post.id}
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${chipClassName} hover:underline`}
                            >
                              {chip}
                            </a>
                          ) : (
                            <span
                              key={post.id}
                              className={chipClassName}
                              title={post.errorMessage || undefined}
                            >
                              {chip}
                            </span>
                          );
                        })
                      : viewEvent.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="inline-flex items-center gap-1 rounded-full bg-background-secondary px-2.5 py-1 text-xs font-medium"
                          >
                            {mapEnumPlatform.getPlatformIcon(platform, "h-3 w-3")}
                            {mapEnumPlatform.getPlatformLabel(platform)}
                          </span>
                        ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        isOpen={isCancelDialogOpen}
        title={
          eventToCancel?.type === "draft"
            ? t("deleteDraftTitle")
            : t("deleteScheduledPostTitle")
        }
        description={
          eventToCancel?.type === "draft"
            ? t("deleteDraftDescription")
            : t("deleteScheduledPostDescription")
        }
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancelEvent}
        withDetailItem={false}
        isLoading={mRemove.isPending || mReadyToPost.isPending}
        itemName={eventToCancel?.title || ""}
      />

      <ContentSchedulerUploadDialog
        isOpen={isUploadDialogOpen}
        selectedDate={selectedDate}
        editDraft={editingUploadDraft}
        onClose={() => {
          setIsUploadDialogOpen(false);
          setEditingUploadDraft(null);
        }}
        onNeedPlatformConnect={handleIfNoPlatformConnected}
        onScheduled={() => {
          setIsUploadDialogOpen(false);
          setEditingUploadDraft(null);
        }}
      />
    </>
  );
}
