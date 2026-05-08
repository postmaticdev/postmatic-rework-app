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
import { Button } from "@/components/ui/button";
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
  SCHEDULER_DRAFT_MARKERS_CHANGED,
  getSchedulerDraftMarkers,
  removeSchedulerDraftMarker,
  type SchedulerDraftMarker,
} from "@/lib/scheduler-draft-markers";
import { GeneratedImageContent } from "@/models/api/content/scheduler.type";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { JobData } from "@/models/socket-content";
import {
  useContentAutoGenerateGetSettings,
  useContentDraftSetReadyToPost,
  useContentJobGetAllJob,
  useContentSchedulerManualRemove,
  useContentSchedulerTimezoneGetTimezone,
} from "@/services/content/content.api";
import {
  useContentOverviewGetCountPosted,
  useContentOverviewGetCountUpcoming,
  useContentOverviewGetUpcoming,
} from "@/services/content/overview";
import { useProductKnowledgeGetAll } from "@/services/knowledge.api";
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
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  FileClock,
  MoreVertical,
  Repeat2,
  Sparkles,
  PencilLine,
  WandSparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ContentSchedulerUploadDialog } from "./content-scheduler-upload-dialog";
import { TimezoneSelector } from "./timezone-selector";
import { AutoGenerate } from "../../dashboard/(components)/auto-generate";

type SchedulerEvent = {
  id: string;
  title: string;
  date: Date;
  time: string;
  image: string;
  type: "manual" | "repetition" | "draft";
  platforms: PlatformEnum[];
  schedulerManualPostingId: number | null;
  generatedImageContent: GeneratedImageContent | null;
  sourceType: "manual" | "auto" | "repetition" | "draft" | "history-draft";
  draftMarker: SchedulerDraftMarker | null;
  historyJob: JobData | null;
};

interface ContentSchedulerBoardProps {
  handleIfNoPlatformConnected: () => void;
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
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<SchedulerEvent | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [eventToCancel, setEventToCancel] = useState<SchedulerEvent | null>(null);
  const [draftMarkers, setDraftMarkers] = useState<SchedulerDraftMarker[]>([]);
  const [showCalendarEventDetails, setShowCalendarEventDetails] = useState(false);
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

  useContentOverviewGetCountUpcoming(businessId, {
    dateStart: rangeStart,
    dateEnd: rangeEnd,
  });
  const { data: postedCountData } = useContentOverviewGetCountPosted(
    businessId,
    {
      dateStart: rangeStart,
      dateEnd: rangeEnd,
    }
  );
  const { data: upcomingData } = useContentOverviewGetUpcoming(
    businessId,
    {
      dateStart: rangeStart,
      dateEnd: rangeEnd,
    }
  );
  const { data: autoGenerateData } = useContentAutoGenerateGetSettings(businessId);
  const { data: timezoneData } = useContentSchedulerTimezoneGetTimezone(businessId);
  const { data: generationHistoryData } = useContentJobGetAllJob(businessId);
  const { data: productsData } = useProductKnowledgeGetAll(businessId, {
    limit: 100,
    sortBy: "name",
    sort: "asc",
  });
  const mRemove = useContentSchedulerManualRemove();
  const mReadyToPost = useContentDraftSetReadyToPost();

  const productMap = useMemo(() => {
    return new Map(
      (productsData?.data.data || []).map((product) => [product.id, product.name])
    );
  }, [productsData?.data.data]);

  const manualEvents = useMemo<SchedulerEvent[]>(
    () =>
      (upcomingData?.data.data || []).map((item) => ({
        id: `upcoming-${item.id}`,
        title: item.title || t("scheduledPostLabel"),
        date: new Date(item.date),
        time: dateFormat.getHhMm(new Date(item.date)),
        image: item.images[0] || DEFAULT_PLACEHOLDER_IMAGE,
        type: item.type === "manual" ? "manual" : "repetition",
        platforms: item.platforms,
        schedulerManualPostingId: item.schedulerManualPostingId,
        generatedImageContent: item.generatedImageContent,
        sourceType: item.type,
        draftMarker: null,
        historyJob: null,
      })),
    [t, upcomingData?.data.data]
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

    return settings.schedules.flatMap((daySchedule) =>
      daySchedule.schedules
        .filter((schedule) => schedule.isActive)
        .flatMap((schedule) =>
          datesInMonth
            .filter((date) => getDay(date) === schedule.day)
            .map((date) => ({
              id: `auto-${schedule.id}-${date.toISOString()}`,
              title:
                productMap.get(schedule.productKnowledgeId) ||
                t("contentRepetitionLabel"),
              date: new Date(`${dateManipulation.ymd(date)}T${schedule.time}`),
              time: schedule.time,
              image: DEFAULT_PLACEHOLDER_IMAGE,
              type: "repetition" as const,
              platforms: schedule.platforms,
              schedulerManualPostingId: null,
              generatedImageContent: null,
              sourceType: "repetition" as const,
              draftMarker: null,
              historyJob: null,
            }))
        )
    );
  }, [autoGenerateData?.data.data, currentMonth, productMap, t]);

  const draftEvents = useMemo<SchedulerEvent[]>(
    () =>
      draftMarkers.map((marker) => ({
        id: `draft-${marker.draftId}`,
        title: "Draft",
        date: new Date(`${marker.date}T00:00:00`),
        time: "",
        image: marker.image || DEFAULT_PLACEHOLDER_IMAGE,
        type: "draft",
        platforms: [],
        schedulerManualPostingId: null,
        generatedImageContent: null,
        sourceType: "draft",
        draftMarker: marker,
        historyJob: null,
      })),
    [draftMarkers]
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

        return {
          id: `history-draft-${job.id}`,
          title: job.product?.name || "Draft",
          date: new Date(job.createdAt),
          time: dateFormat.getHhMm(new Date(job.createdAt)),
          image,
          type: "draft" as const,
          platforms: [],
          schedulerManualPostingId: null,
          generatedImageContent: null,
          sourceType: "history-draft" as const,
          draftMarker: {
            draftId: `history-${job.id}`,
            jobId: job.id,
            date: dateManipulation.ymd(new Date(job.createdAt)),
            image,
            caption: job.result?.caption || "",
            createdAt: job.createdAt,
          },
          historyJob: job,
        };
      });
  }, [draftMarkers, generationHistoryData?.data.data, manualEvents]);

  const mergedEvents = useMemo(
    () =>
      [...manualEvents, ...repetitionEvents, ...draftEvents, ...historyDraftEvents].sort(
        (left, right) => left.date.getTime() - right.date.getTime()
      ),
    [draftEvents, historyDraftEvents, manualEvents, repetitionEvents]
  );

  const selectedDateEvents = useMemo(
    () => mergedEvents.filter((item) => isSameDay(item.date, selectedDate)),
    [mergedEvents, selectedDate]
  );

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

  const handleViewEvent = (event: SchedulerEvent) => {
    setViewEvent(event);
    setIsViewDialogOpen(true);
  };

  const handleEditEvent = (event: SchedulerEvent) => {
    if (
      (event.sourceType === "draft" || event.sourceType === "history-draft") &&
      event.draftMarker
    ) {
      const params = new URLSearchParams({
        scheduleDate: event.draftMarker.date,
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

    const params = new URLSearchParams({
      scheduleDate: dateManipulation.ymd(event.date),
      scheduleTime: event.time,
      editSchedulerManualPostingId: String(event.schedulerManualPostingId),
      selectedHistoryImage: event.generatedImageContent.images[0] || "",
      platforms: event.platforms.join(","),
    });

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
    setEventToCancel(event);
    setIsCancelDialogOpen(true);
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
    } catch {}
  };

  const openDateAction = (
    date: Date,
    event: ReactMouseEvent<HTMLButtonElement>
  ) => {
    if (isBefore(date, startOfDay(new Date()))) {
      return;
    }

    const dateEvents = mergedEvents.filter((item) => isSameDay(item.date, date));

    if (dateEvents.length > 0) {
      setSelectedDate(date);
      setShowDateActionCard(false);
      setDateActionMenuPosition(null);
      setIsHistoryDialogOpen(true);
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
    const menuTop = Math.min(
      triggerRect.top - containerRect.top + 8,
      containerRect.height - 116
    );

    setDateActionMenuPosition({
      top: Math.max(menuTop, 12),
      left: Math.max(menuRightEdge, 196),
    });
  };

  const chosenDate = dateManipulation.ymd(selectedDate);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="p-3 sm:p-6">
            <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="min-w-0 flex-1 text-lg font-bold sm:flex-none sm:text-xl ">
                  {monthLabel}
                </h2>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    setCurrentMonth((current) => subMonths(current, 1));
                    setShowDateActionCard(false);
                    setDateActionMenuPosition(null);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => {
                    setCurrentMonth((current) => addMonths(current, 1));
                    setShowDateActionCard(false);
                    setDateActionMenuPosition(null);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-2 sm:block">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setCurrentMonth(startOfMonth(new Date()));
                    setSelectedDate(new Date());
                    setShowDateActionCard(false);
                    setDateActionMenuPosition(null);
                  }}
                >
                  {t("today")}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:hidden"
                  onClick={() =>
                    setShowCalendarEventDetails((current) => !current)
                  }
                >
                  {showCalendarEventDetails
                    ? t("hideCalendarEvents")
                    : t("showCalendarEvents")}
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
                      className="min-w-0 px-0.5 py-2 text-center text-[10px] font-medium uppercase text-muted-foreground sm:p-2 sm:text-sm sm:tracking-[0.24em]"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarDays.map((day) => {
                    const dayEvents = mergedEvents.filter((item) =>
                      isSameDay(item.date, day)
                    );
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isSelected = isSameDay(day, selectedDate);
                    const isPast = isBefore(day, startOfDay(new Date()));
                    const visibleEvents = dayEvents;

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={(event) => openDateAction(day, event)}
                        className={`flex min-w-0 flex-col justify-start border-b border-r px-1 py-1.5 text-right align-top transition-colors sm:min-h-[116px] sm:px-2 sm:py-2 xl:min-h-[85px] ${
                          showCalendarEventDetails
                            ? "min-h-[104px]"
                            : "min-h-[76px]"
                        } ${
                          isCurrentMonth ? "bg-card" : "bg-background-secondary/50"
                        } ${isSelected ? "bg-primary/5" : ""} ${
                          isPast ? "cursor-not-allowed opacity-60" : "hover:bg-primary/5"
                        }`}
                      >
                        <div
                          className={`mb-2 text-sm font-semibold sm:mb-3 sm:text-base xl:text-lg ${
                            isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </div>

                        <div className="min-w-0 space-y-1 sm:space-y-1.5">
                          {visibleEvents.map((event) => (
                            <div
                              key={event.id}
                              className={`min-w-0 overflow-hidden ${
                                showCalendarEventDetails
                                  ? "rounded-md"
                                  : "rounded-full sm:rounded-lg"
                              } ${
                                event.type === "manual"
                                  ? "bg-rose-100 text-rose-600"
                                  : event.type === "draft"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-violet-100 text-violet-600"
                              }`}
                            >
                              <div
                                className={
                                  showCalendarEventDetails
                                    ? "hidden"
                                    : "h-1.5 sm:hidden"
                                }
                              />
                              <div
                                className={`px-1 py-0.5 text-[9px] leading-tight sm:px-2 sm:py-1 sm:text-xs ${
                                  showCalendarEventDetails ? "block" : "hidden sm:block"
                                }`}
                              >
                                <div className="truncate font-medium">
                                  {event.title}
                                </div>
                                <div className="truncate opacity-90">{event.time}</div>
                              </div>
                            </div>
                          ))}
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
                        setIsUploadDialogOpen(true);
                        setShowDateActionCard(false);
                        setDateActionMenuPosition(null);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background-secondary"
                    >
                      <span className="flex size-8 items-center justify-center rounded-xl bg-background-secondary text-foreground">
                        <PencilLine className="size-4" />
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
                        <WandSparkles className="size-4" />
                      </span>
                      {t("buildWithAi")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex h-full flex-col gap-6">
          <Card>
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="text-2xl font-bold">{t("overview")}</div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-2">
                  <div className="rounded-md bg-rose-100 p-2 text-rose-500">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t("totalScheduled")}
                    </div>
                    <div className="sm:-mt-1 font-semibold">{mergedEvents.length}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-2">
                  <div className="rounded-md bg-amber-100 p-2 text-amber-500">
                    <Repeat2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t("contentRepetitionShort")}
                    </div>
                    <div className="sm:-mt-1 font-semibold">{repetitionEvents.length}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-2">
                  <div className="rounded-md bg-blue-100 p-2 text-blue-500">
                    <FileClock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {t("postedThisMonth")}
                    </div>
                    <div className="sm:-mt-1 font-semibold">
                      {postedCountData?.data.data.total || 0}
                    </div>
                  </div>
                </div>
              </div>

             
                <TimezoneSelector />
              
           

              <Link href={`/business/${businessId}/knowledge-base`}>
                <Button className="w-full">
                  <Sparkles className="h-4 w-4" />
                  {t("goToBusinessKnowledge")}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <AutoGenerate
            handleIfNoPlatformConnected={handleIfNoPlatformConnected}
            cardClassName="flex-1"
            scheduleListClassName="flex flex-col gap-4"
          />
        </div>
      </div>

      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b-0 pb-2">
            <div className="flex items-start justify-between gap-4 pr-8">
              <div>
                <DialogTitle>{formatDateTitle(selectedDate)}</DialogTitle>
                <DialogDescription>
                  {t("scheduledDateHistoryDescription")}
                </DialogDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button">{t("createNew")}</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setIsHistoryDialogOpen(false);
                      setIsUploadDialogOpen(true);
                    }}
                  >
                    <PencilLine className="h-4 w-4" />
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
                    <WandSparkles className="h-4 w-4" />
                    {t("buildWithAi")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 pt-0 sm:p-6 sm:pt-0">
            {selectedDateEvents.map((event) => (
              <div
                key={event.id}
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
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        event.type === "manual"
                          ? "bg-rose-500 text-white"
                          : event.type === "draft"
                          ? "bg-amber-500 text-white"
                          : "bg-violet-600 text-white"
                      }`}
                    >
                      {event.type === "manual"
                        ? t("scheduledBadge")
                        : event.type === "draft"
                        ? "Draft"
                        : t("repetitionBadge")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatFullDate(event.date)} - {event.time}{" "}
                    {timezoneData?.data.data.offset || ""}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">{t("scheduledHistoryActions")}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => handleViewEvent(event)}>
                      <Eye className="h-4 w-4" />
                      {t("viewPost")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        event.sourceType !== "draft" &&
                        event.sourceType !== "history-draft" &&
                        (event.sourceType !== "manual" ||
                          !event.schedulerManualPostingId)
                      }
                      onClick={() => handleEditEvent(event)}
                    >
                      <Edit className="h-4 w-4" />
                      {t("editPost")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={
                        !event.generatedImageContent &&
                        event.sourceType !== "draft"
                      }
                      onClick={() => handleAskCancelEvent(event)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <X className="h-4 w-4" />
                      {t("cancelQueue")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("viewPost")}</DialogTitle>
            <DialogDescription>{viewEvent && formatFullDate(viewEvent.date)}</DialogDescription>
          </DialogHeader>

          {viewEvent && (
            <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
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
                    {viewEvent.platforms.map((platform) => (
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
        title={t("deleteScheduledPostTitle")}
        description={t("deleteScheduledPostDescription")}
        onClose={() => setIsCancelDialogOpen(false)}
        onConfirm={handleConfirmCancelEvent}
        withDetailItem={false}
        isLoading={mRemove.isPending || mReadyToPost.isPending}
        itemName={eventToCancel?.title || ""}
      />

      <ContentSchedulerUploadDialog
        isOpen={isUploadDialogOpen}
        selectedDate={selectedDate}
        onClose={() => setIsUploadDialogOpen(false)}
        onNeedPlatformConnect={handleIfNoPlatformConnected}
        onScheduled={() => setIsUploadDialogOpen(false)}
      />
    </>
  );
}
