"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, BookOpen, Plus, RotateCw, Search, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";
import { CreatePostModal } from "./create-post-modal";
import { ViewPostModal } from "./view-post-modal";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { isProblemGenerationJob } from "./failed-generation-history";
import { getAiModelDisplayName } from "@/models/api/content/ai-model";
import { JobData } from "@/models/socket-content";

function formatJobDate(value: string | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
import {
  useContentDraftDirectPostFromDraft,
  useContentDraftGetAllDraftImage,
  useContentDraftSetReadyToPost,
  useContentPostedGetAllPostedImage,
  useContentPostedRepost,
  useContentSchedulerManualAddToQueue,
  useContentPersonalCreate,
} from "@/services/content/content.api";
import { useParams } from "next/navigation";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import {
  DirectPostContentPld,
  EditContentPld,
  ImageContentRes,
  PostedImageRes,
} from "@/models/api/content/image.type";
import { QueuePld } from "@/models/api/content/scheduler.type";
import { showToast } from "@/helper/show-toast";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { usePlatformKnowledgeGetAll } from "@/services/knowledge.api";
import { SearchNotFound } from "@/components/base/search-not-found";
import { NoContent } from "@/components/base/no-content";
import { ContentLibrarySkeleton } from "@/components/grid-skeleton/content-library-skeleton";
import { useContentSchedulerTab } from "../page";
import { useLocale, useTranslations } from "next-intl";
import { PersonalContentForm, PersonalPostModal } from "./personal-post-modal";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { FilterQuery, Pagination } from "@/models/api/base-response.type";
import { mapEnumPlatform } from "@/helper/map-enum-platform";

export interface FormDataDraft {
  direct: DirectPostContentPld;
  queue: QueuePld & { date: string; time: string };
  edit: EditContentPld;
}

export const initialDirectForm: FormDataDraft["direct"] = {
  generatedImageContentId: "",
  platforms: [],
  caption: "",
};

export const initialQueueForm: FormDataDraft["queue"] = {
  platforms: [],
  generatedImageContentId: "",
  dateTime: "",
  date: "",
  time: "",
  caption: "",
};

export const initialEditForm: FormDataDraft["edit"] = {
  images: [],
  category: "",
  designStyle: "",
  caption: "",
  ratio: "",
};

export interface FormDataView {
  data: PostedImageRes;
  unPostedPlatforms: PlatformEnum[];
  selectedPlatforms: PlatformEnum[];
}

const initialPostedForm: FormDataView["data"] = {
  id: "",
  images: [],
  ratio: "",
  category: "",
  designStyle: "",
  caption: "",
  createdAt: "",
  updatedAt: "",
  deletedAt: "",
  productKnowledgeId: "",
  rootBusinessId: "",
  readyToPost: false,
  postedImageContents: [],
  platforms: [],
};

const initialFormDataView: FormDataView = {
  data: initialPostedForm,
  unPostedPlatforms: [],
  selectedPlatforms: [],
};

const initialPersonalForm: PersonalContentForm = {
  image: null,
  caption: "",
};

interface ContentLibraryProps {
  showPostingNow?: boolean;
  showAddtoQueue?: boolean;
  showScheduling?: boolean;
  type: "draft" | "posted";
}

export function ContentLibrary({
  showPostingNow = true,
  showAddtoQueue = true,
  showScheduling = true,
  type,
}: ContentLibraryProps) {
  const { businessId } = useParams() as { businessId: string };
  const router = useRouter();
  const t = useTranslations("contentScheduler");
  const locale = useLocale();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useDebounce(() => {
    setDebouncedSearch(searchQuery);
  }, 500, [searchQuery]);

  const [historyFilterQuery, setHistoryFilterQuery] = useState<Partial<FilterQuery>>({
    page: 1,
    limit: 8,
  });

  const { data: draftContent, isLoading: isLoadingDraft } =
    useContentDraftGetAllDraftImage(businessId, {
      search: debouncedSearch,
      category: "drafts",
      ...historyFilterQuery,
    });
  const filteredContentDraft = draftContent?.data.data || [];

  const { data: postedContent, isLoading: isLoadingPosted } =
    useContentPostedGetAllPostedImage(businessId, {
      search: debouncedSearch,
      ...historyFilterQuery,
    });

  const { histories, onSelectHistory } = useContentGenerate();

  const [dismissedJobIds, setDismissedJobIds] = useState<string[]>([]);
  const [dismissedPostIds, setDismissedPostIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedJobs = localStorage.getItem(`postmatic:dismissed-failed-jobs:${businessId}`);
      if (storedJobs) {
        setDismissedJobIds(JSON.parse(storedJobs));
      }
      const storedPosts = localStorage.getItem(`postmatic:dismissed-failed-posts:${businessId}`);
      if (storedPosts) {
        setDismissedPostIds(JSON.parse(storedPosts));
      }
    } catch {}
  }, [businessId]);

  const failedJobs = useMemo(() => {
    if (type !== "posted") return [];
    return histories
      .flatMap((group) => group.jobs)
      .filter(isProblemGenerationJob)
      .filter((job) => !dismissedJobIds.includes(job.id))
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      );
  }, [histories, dismissedJobIds, type]);

  const filteredFailedJobs = useMemo(() => {
    if (!debouncedSearch) return failedJobs;
    const query = debouncedSearch.toLowerCase();
    return failedJobs.filter(
      (job) =>
        job.product?.name?.toLowerCase().includes(query) ||
        job.input?.prompt?.toLowerCase().includes(query) ||
        job.error?.message?.toLowerCase().includes(query) ||
        job.input?.model?.toLowerCase().includes(query)
    );
  }, [failedJobs, debouncedSearch]);

  const filteredPostedContent = useMemo(() => {
    return (postedContent?.data.data || []).filter(
      (content) => !dismissedPostIds.includes(content.id)
    );
  }, [postedContent?.data.data, dismissedPostIds]);
  
  const currentContent =
    type === "draft" ? filteredContentDraft : filteredPostedContent;

  const handleDeleteFailedJob = (jobId: string) => {
    setDismissedJobIds((prev) => {
      const next = Array.from(new Set([...prev, jobId]));
      try {
        localStorage.setItem(
          `postmatic:dismissed-failed-jobs:${businessId}`,
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });
    showToast("success", t("failedHistoryDeleted"));
  };

  const handleRetryFailedJob = (job: JobData) => {
    onSelectHistory(job);
    router.push(`/business/${businessId}/content-generate`);
  };

  const handleDeleteFailedPost = (postId: string) => {
    setDismissedPostIds((prev) => {
      const next = Array.from(new Set([...prev, postId]));
      try {
        localStorage.setItem(
          `postmatic:dismissed-failed-posts:${businessId}`,
          JSON.stringify(next)
        );
      } catch {}
      return next;
    });
    showToast("success", t("failedUploadHistoryDeleted"));
  };

  const handleRetryFailedPost = (content: PostedImageRes) => {
    handleSetFormDataView(content);
  };

  const isUploadFailedPost = (content: PostedImageRes) => {
    return Boolean(
      content?.postedImageContents &&
      content.postedImageContents.length > 0 &&
      content.postedImageContents.some(
        (post) =>
          post.jobStatus?.toLowerCase() === "failed" ||
          post.jobStatus?.toLowerCase() === "error"
      )
    );
  };
    
  const backendPagination = type === "draft" ? draftContent?.data.pagination : postedContent?.data.pagination;

  const historyPagination = useMemo<Pagination>(() => {
    if (backendPagination) {
      return backendPagination;
    }
    const limit = Math.max(historyFilterQuery.limit || 8, 1);
    return {
      total: 0,
      page: historyFilterQuery.page || 1,
      limit,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }, [backendPagination, historyFilterQuery]);

  const paginatedContent = currentContent;
  const isLoadingContent =
    type === "draft" ? isLoadingDraft : isLoadingPosted;

  useEffect(() => {
    setHistoryFilterQuery((prev) => ({ ...prev, page: 1 }));
  }, [searchQuery, type]);

  useEffect(() => {
    if (historyPagination.page === historyFilterQuery.page) return;
    setHistoryFilterQuery((prev) => ({ ...prev, page: historyPagination.page }));
  }, [historyFilterQuery.page, historyPagination.page]);

  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const platforms = platformData?.data.data || [];
  const availablePlatforms = platforms.filter(
    (platform) => platform.status === "connected"
  );

  const mDirectPostFromDraft = useContentDraftDirectPostFromDraft();
  const mSchedulePost = useContentSchedulerManualAddToQueue();
  const mAddToQueue = useContentDraftSetReadyToPost();
  const mRepostPostedContent = useContentPostedRepost(businessId);
  const mCreatePersonal = useContentPersonalCreate();

  const [modalPost, setModalPost] = useState(false);
  const [modalView, setModalView] = useState(false);
  const [modalPersonal, setModalPersonal] = useState(false);

  const [formDataDraft, setFormDataDraft] = useState<FormDataDraft>({
    direct: initialDirectForm,
    queue: initialQueueForm,
    edit: initialEditForm,
  });

  const [formDataView, setFormDataView] = useState<FormDataView>({
    data: initialPostedForm,
    unPostedPlatforms: [],
    selectedPlatforms: [],
  });

  const [personalForm, setPersonalForm] =
    useState<PersonalContentForm>(initialPersonalForm);
  const [personalErrors, setPersonalErrors] = useState<
    Partial<Record<keyof PersonalContentForm, string>>
  >({});

  const [initialPostType, setInitialPostType] = useState<"now" | "schedule">(
    "now"
  );

  const handleSetFormDataDraft = (
    item: ImageContentRes,
    type: "now" | "schedule"
  ) => {
    setFormDataDraft({
      direct: {
        ...initialDirectForm,
        generatedImageContentId: item.id,
        caption: item.caption || "",
      },
      queue: {
        ...initialQueueForm,
        generatedImageContentId: item.id,
        imageUrl: item.images?.[0],
        dateTime: "",
        date: "",
        time: "",
        caption: item.caption || "",
        platforms: item.platforms || [],
      },
      edit: {
        ...initialEditForm,
        images: item.images,
        category: item.category,
        designStyle: item.designStyle,
        caption: item.caption,
        ratio: item.ratio,
      },
    });
    setInitialPostType(type);
    setModalPost(true);
  };

  const handleAddToQueue = async (item: ImageContentRes) => {
    try {
      const res = await mAddToQueue.mutateAsync({
        businessId,
        generatedImageContentId: item.id,
      });
      showToast("success", res.data.responseMessage);
    } catch { }
  };

  const handleRepostNow = async () => {
    try {
      const imagePostScheduleId = Number(formDataView.data.id);
      if (!Number.isFinite(imagePostScheduleId)) {
        return;
      }

      const res = await mRepostPostedContent.mutateAsync({
        imagePostScheduleId,
        platforms: formDataView.selectedPlatforms,
      });
      showToast("success", res.data.responseMessage);
      onCloseModalView();
    } catch { }
  };

  const handleSetFormDataView = (item: PostedImageRes) => {
    setFormDataView({
      data: {
        caption: item?.caption,
        category: item?.category,
        designStyle: item?.designStyle,
        ratio: item?.ratio,
        images: item?.images,
        id: item?.id,
        rootBusinessId: item?.rootBusinessId,
        productKnowledgeId: item?.productKnowledgeId,
        readyToPost: item?.readyToPost,
        postedImageContents: item?.postedImageContents || [],
        platforms: item?.platforms || [],
        createdAt: item?.createdAt || "",
        updatedAt: item?.updatedAt || "",
        deletedAt: item?.deletedAt || "",
      },
      unPostedPlatforms: availablePlatforms
        .filter((p) => !item?.platforms?.includes(p.platform))
        .map((p) => p.platform),
      selectedPlatforms: [],
    });
    setModalView(true);
  };

  const { setActiveTab } = useContentSchedulerTab();

  const openPersonalModal = () => {
    setPersonalErrors({});
    setModalPersonal(true);
  };

  const handleSave = async () => {
    try {
      switch (initialPostType) {
        case "now":
          const resDirect = await mDirectPostFromDraft.mutateAsync({
            businessId,
            formData: formDataDraft.direct,
          });
          showToast("success", resDirect.data.responseMessage);
          onCloseModalPost();
          setActiveTab("history");
          break;
        case "schedule":
          const resSchedule = await mSchedulePost.mutateAsync({
            businessId,
            formData: {
              ...formDataDraft.queue,
              generatedImageContentId:
                formDataDraft.queue.generatedImageContentId,
              imageUrl: formDataDraft.queue.imageUrl,
              dateTime: new Date(
                formDataDraft.queue.date + "T" + formDataDraft.queue.time
              ).toISOString(),
            },
          });
          showToast("success", resSchedule.data.responseMessage);
          onCloseModalPost();
          break;
      }
      onCloseModalPost();
    } catch { }
  };

  const handleCancelQueue = (item: ImageContentRes) => {
    console.log("Cancel queue for item:", item);
    // TODO: Handle cancel queue logic here
  };

  const onCloseModalPost = () => {
    setModalPost(false);
    setFormDataDraft({
      direct: initialDirectForm,
      queue: initialQueueForm,
      edit: initialEditForm,
    });
  };

  const onCloseModalView = () => {
    setModalView(false);
    setFormDataView(initialFormDataView);
  };

  const onClosePersonalModal = () => {
    setModalPersonal(false);
    setPersonalForm(initialPersonalForm);
    setPersonalErrors({});
  };

  const handleSavePersonalContent = async () => {
    const errors: Partial<Record<keyof PersonalContentForm, string>> = {};
    if (!personalForm.image) {
      errors.image = t("uploadPhotoFirst");
    }
    if (!personalForm.caption.trim()) {
      errors.caption = t("captionRequired");
    }
    setPersonalErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const res = await mCreatePersonal.mutateAsync({
        businessId,
        formData: {
          images: personalForm.image ? [personalForm.image] : [],
          caption: personalForm.caption,
        },
      });
      showToast("success", res.data.responseMessage);
      onClosePersonalModal();
    } catch { }
  };


  const renderItems = (): React.JSX.Element[] => {
    switch (type) {
      case "draft":
        return (paginatedContent as ImageContentRes[]).map((content) => (
          <div
            key={content.id}
            className="relative flex h-full flex-col border border-border bg-card shadow-sm p-4 sm:p-3 rounded-lg group transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="aspect-square rounded-lg overflow-hidden">
              {/* Template content placeholder */}
              <div className="relative h-full w-full">
                <Image
                  src={content.images[0] || DEFAULT_PLACEHOLDER_IMAGE}
                  alt={t("contentImageAlt")}
                  className="object-cover rounded-xl select-none pointer-events-none
             transform-gpu transition-transform duration-500 ease-out will-change-transform
             group-hover:scale-110"
                  width={500}
                  height={500}
                />

                <div className="absolute top-2 right-2">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {content.category}
                  </span>
                </div>
              </div>

              {/* Tag */}
            </div>

            <div className="mt-4 flex flex-1 flex-col space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {content.caption}
              </p>

              <div className="mt-auto flex space-x-2 pt-1">
                {showAddtoQueue &&
                  (false ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                      onClick={() => handleCancelQueue(content)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {t("cancelQueue")}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1 "
                      onClick={() => handleAddToQueue(content)}
                      disabled={
                        mAddToQueue.isPending || mSchedulePost.isPending
                      }
                    >
                      {t("addToQueue")}
                    </Button>
                  ))}
                {showPostingNow && (
                  <Button
                    className="flex-1 text-white"
                    onClick={() => handleSetFormDataDraft(content, "now")}
                  >
                    {t("posting")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ));
      case "posted": {
        const failedJobElements = filteredFailedJobs.map((job) => {
          const image =
            job.input.referenceImage ||
            job.product?.images?.[0] ||
            DEFAULT_PLACEHOLDER_IMAGE;
          const title = job.product?.name || t("failedGenerate");
          const errorMessage =
            job.error?.message ||
            t("generateImageFailedDescription");

          return (
            <div
              key={`failed-job-${job.id}`}
              className="relative flex h-full flex-col border border-red-300 bg-red-50/60 dark:border-red-900/80 dark:bg-red-950/20 shadow-sm p-4 rounded-lg group transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="aspect-square rounded-lg overflow-hidden relative border border-red-200/60 dark:border-red-900/40">
                <div className="relative h-full w-full">
                  <Image
                    src={image}
                    alt={title}
                    className="object-cover select-none pointer-events-none transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-105"
                    fill
                  />
                  <div className="absolute top-2 right-2 z-10">
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                      {t("failedGenerate")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-1 flex-col space-y-3">
                <div className="space-y-1">
                  <h3 className="font-semibold text-foreground text-sm truncate" title={title}>
                    {title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatJobDate(job.updatedAt, locale)}
                  </p>
                </div>

                <div className="rounded-md bg-red-100/70 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  <div className="flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <p className="line-clamp-2 leading-relaxed" title={errorMessage}>
                      {errorMessage}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {job.input.model && <span>{getAiModelDisplayName(job.input.model)}</span>}
                  {job.input.ratio && <span>• {job.input.ratio}</span>}
                  {job.type && <span>• {job.type}</span>}
                </div>

                <div className="mt-auto flex space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                    onClick={() => handleDeleteFailedJob(job.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("delete")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 bg-red-600 text-white hover:bg-red-700 shadow-sm"
                    onClick={() => handleRetryFailedJob(job)}
                  >
                    <RotateCw className="h-3.5 w-3.5 mr-1" />
                    {t("retry")}
                  </Button>
                </div>
              </div>
            </div>
          );
        });

        const postedElements = (paginatedContent as PostedImageRes[]).map((content) => {
          const isUploadFailed = isUploadFailedPost(content);
          const firstFailedPost = content?.postedImageContents?.find(
            (p) => p.jobStatus?.toLowerCase() === "failed" || p.jobStatus?.toLowerCase() === "error"
          );

          if (isUploadFailed) {
            return (
              <div
                key={`failed-post-${content.id}`}
                className="relative flex h-full flex-col border border-red-300 bg-red-50/60 dark:border-red-900/80 dark:bg-red-950/20 shadow-sm p-4 rounded-lg group transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="aspect-square rounded-lg overflow-hidden relative border border-red-200/60 dark:border-red-900/40">
                  <div className="relative h-full w-full">
                    <Image
                      src={content?.images[0] || DEFAULT_PLACEHOLDER_IMAGE}
                      alt={t("contentImageAlt")}
                      className="object-cover select-none pointer-events-none transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-105"
                      fill
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <span className="bg-red-600 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                        {t("uploadFailed")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-1 flex-col space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {content?.caption || t("contentWithoutCaption")}
                  </p>

                  <div className="rounded-md bg-red-100/70 p-2 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <p className="line-clamp-2 leading-relaxed" title={firstFailedPost?.errorMessage || t("postToSocialFailed")}>
                        {firstFailedPost?.errorMessage || t("postToSocialFailed")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {t("postedTo")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {content?.postedImageContents?.map((post) => {
                        const isPostFailed =
                          post.jobStatus?.toLowerCase() === "failed" ||
                          post.jobStatus?.toLowerCase() === "error";
                        return (
                          <span
                            key={post.id}
                            className={`inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${
                              isPostFailed
                                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                                : "border-border bg-background-secondary text-foreground"
                            }`}
                            title={post.errorMessage || ""}
                          >
                            {mapEnumPlatform.getPlatformIcon(
                              post.platform,
                              "h-3.5 w-3.5 shrink-0"
                            )}
                            <span className="truncate">
                              {isPostFailed
                                ? t("platformFailed", {
                                    platform: mapEnumPlatform.getPlatformLabel(post.platform),
                                  })
                                : mapEnumPlatform.getPlatformLabel(post.platform)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-auto flex space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                      onClick={() => handleDeleteFailedPost(content.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      {t("delete")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-red-600 text-white hover:bg-red-700 shadow-sm"
                      onClick={() => handleRetryFailedPost(content)}
                    >
                      <RotateCw className="h-3.5 w-3.5 mr-1" />
                      {t("retry")}
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={content?.id}
              onClick={() => handleSetFormDataView(content)}
              className="relative flex h-full flex-col border border-border bg-card shadow-sm p-4 rounded-lg group transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              <div className="aspect-square rounded-lg overflow-hidden">
                <div className="relative h-full w-full">
                  <Image
                    src={content?.images[0] || DEFAULT_PLACEHOLDER_IMAGE}
                    alt={t("contentImageAlt")}
                    className="object-cover select-none pointer-events-none transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-110"
                    width={500}
                    height={500}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-1 flex-col space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {content?.caption}
                </p>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t("postedTo")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {content?.postedImageContents && content.postedImageContents.length > 0 ? (
                      content.postedImageContents.map((post) => {
                        return (
                          <span
                            key={post.id}
                            className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background-secondary text-foreground px-2 py-1 text-xs"
                            title={post.errorMessage || ""}
                          >
                            {mapEnumPlatform.getPlatformIcon(
                              post.platform,
                              "h-3.5 w-3.5 shrink-0"
                            )}
                            <span className="truncate">
                              {mapEnumPlatform.getPlatformLabel(post.platform)}
                            </span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("notAvailable")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        });

        return [...failedJobElements, ...postedElements];
      }
      default:
        return [];
    }
  };
  const renderedItems = renderItems();
  const hasNoResults = renderedItems.length === 0;

  return (
    <Card>
      <CardContent className="py-4 space-y-4 sm:py-6 sm:space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <h2 className="text-xl font-bold sm:text-2xl">{t("contentLibrary")}</h2>
          {/* <Button
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center w-full md:w-auto"
            onClick={openPersonalModal}
            disabled={mCreatePersonal.isPending}
          >
            <Plus className="w-4 h-4" />
            {t("addContent")}
          </Button> */}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("searchHere")}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {isLoadingContent ? (
          <ContentLibrarySkeleton count={8} />
        ) : hasNoResults && searchQuery === "" ? (
          <NoContent
            icon={BookOpen}
            title={t("noContent")}
            titleDescription={t("noContentDescription")}
          // buttonText={t("addContent")}
          // onButtonClick={() =>
          //   router.push(`/business/${businessId}/content-scheduler`)
          // }
          />
        ) : hasNoResults ? (
          <SearchNotFound description="" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {renderedItems}
            </div>
            <PaginationControls
              pagination={historyPagination}
              filterQuery={historyFilterQuery}
              setFilterQuery={(query) =>
                setHistoryFilterQuery((prev) => ({
                  ...prev,
                  ...query,
                }))
              }
            />
          </div>
        )}

        <PersonalPostModal
          isOpen={modalPersonal}
          onClose={onClosePersonalModal}
          form={personalForm}
          setForm={setPersonalForm}
          errors={personalErrors}
          onSave={handleSavePersonalContent}
          isSaving={mCreatePersonal.isPending}
        />

        <CreatePostModal
          isOpen={modalPost}
          onClose={onCloseModalPost}
          showScheduling={showScheduling}
          formData={formDataDraft}
          setFormData={setFormDataDraft}
          onSave={handleSave}
          postType={initialPostType}
          setPostType={setInitialPostType}
          isLoading={
            mAddToQueue?.isPending ||
            mDirectPostFromDraft?.isPending ||
            mSchedulePost?.isPending
          }
        />

        <ViewPostModal
          isOpen={modalView}
          onClose={() => onCloseModalView()}
          formData={formDataView}
          setFormData={setFormDataView}
          onPostNow={handleRepostNow}
        />
      </CardContent>
    </Card>
  );
}
