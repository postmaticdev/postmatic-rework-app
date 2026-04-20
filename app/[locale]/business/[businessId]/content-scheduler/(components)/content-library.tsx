"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus, Search, X } from "lucide-react";
import { CreatePostModal } from "./create-post-modal";
import { ViewPostModal } from "./view-post-modal";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import {
  useContentDraftDirectPostFromDraft,
  useContentDraftGetAllDraftImage,
  useContentDraftSetReadyToPost,
  useContentPostedGetAllPostedImage,
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
import { useTranslations } from "next-intl";
import { PersonalContentForm, PersonalPostModal } from "./personal-post-modal";

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

  const [searchQuery, setSearchQuery] = useState("");

  const { data: draftContent, isLoading: isLoadingDraft } =
    useContentDraftGetAllDraftImage(businessId, {
      search: searchQuery,
      limit: 50,
    });
  const filteredContentDraft = (draftContent?.data.data || []).filter(
    (item) => !item.readyToPost
  );

  const { data: postedContent, isLoading: isLoadingPosted } =
    useContentPostedGetAllPostedImage(businessId, {
      search: searchQuery,
      limit: 50,
    });
  const filteredPostedContent = postedContent?.data.data || [];

  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const platforms = platformData?.data.data || [];
  const availablePlatforms = platforms.filter(
    (platform) => platform.status === "connected"
  );

  const mDirectPostFromDraft = useContentDraftDirectPostFromDraft();
  const mSchedulePost = useContentSchedulerManualAddToQueue();
  const mAddToQueue = useContentDraftSetReadyToPost();
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
    } catch {}
  };

  const handleRepostNow = async () => {
    try {
      const res = await mDirectPostFromDraft.mutateAsync({
        businessId,
        formData: {
          caption: formDataView.data.caption,
          generatedImageContentId: formDataView.data.id,
          platforms: formDataView.selectedPlatforms,
        },
      });
      showToast("success", res.data.responseMessage);
      onCloseModalView();
    } catch {}
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
              dateTime: new Date(
                formDataDraft.queue.date + " " + formDataDraft.queue.time
              ).toISOString(),
            },
          });
          showToast("success", resSchedule.data.responseMessage);
          onCloseModalPost();
          break;
      }
      onCloseModalPost();
    } catch {}
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
      errors.image = "Please upload a photo";
    }
    if (!personalForm.caption.trim()) {
      errors.caption = "Caption is required";
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
    } catch {}
  };

  const renderItems = (): React.JSX.Element[] => {
    switch (type) {
      case "draft":
        return filteredContentDraft.map((content) => (
          <div
            key={content.id}
            className="relative border border-border bg-card  shadow-sm p-3 rounded-lg  group transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="aspect-square rounded-lg overflow-hidden">
              {/* Template content placeholder */}
              <div className="relative h-full w-full">
                <Image
                  src={content.images[0] || DEFAULT_PLACEHOLDER_IMAGE}
                  alt="image content"
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

            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {content.caption}
              </p>

              <div className="flex space-x-2">
                {showAddtoQueue &&
                  (false ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs text-red-600 border-red-600 hover:bg-red-50"
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
      case "posted":
        return filteredPostedContent.map((content) => (
          <div
            key={content?.id}
            className="relative group border border-border bg-card  shadow-sm p-4 rounded-lg group transition-all duration-300 hover:scale-105 cursor-pointer"
          >
            <div className="aspect-square  rounded-lg overflow-hidden">
              {/* Template content placeholder */}
              <div className="relative h-full w-full">
                <Image
                  src={content?.images[0] || DEFAULT_PLACEHOLDER_IMAGE}
                  alt="image content"
                  className="object-cover  select-none pointer-events-none
             transform-gpu transition-transform duration-500 ease-out will-change-transform
             group-hover:scale-110"
                  width={500}
                  height={500}
                />

                <div className="absolute top-2 right-2">
                  <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {content?.category}
                  </span>
                </div>
              </div>

              {/* Tag */}
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {content?.caption}
              </p>

              <div className="flex space-x-2">
                <Button
                  className="flex-1 text-white"
                  onClick={() => handleSetFormDataView(content)}
                >
                  {t("viewPost")}
                </Button>
              </div>
            </div>
          </div>
        ));
      default:
        return [];
    }
  };

  return (
    <Card>
      <CardContent className="py-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <h2 className="text-2xl font-bold">{t("contentLibrary")}</h2>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center w-full md:w-auto"
            onClick={openPersonalModal}
            disabled={mCreatePersonal.isPending}
          >
            <Plus className="w-4 h-4" />
            {t("addContent")}
          </Button>
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
        {isLoadingDraft || isLoadingPosted ? (
          <ContentLibrarySkeleton count={8} />
        ) : renderItems().length === 0 && searchQuery === "" ? (
          <NoContent
            icon={BookOpen}
            title={t("noContent")}
            titleDescription={t("noContentDescription")}
            buttonText={t("addContent")}
            onButtonClick={() =>
              router.push(`/business/${businessId}/content-generate`)
            }
          />
        ) : renderItems().length === 0 ? (
          <SearchNotFound description="" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {renderItems()}
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
