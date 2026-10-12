"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  MoreHorizontal,
  X,
  ThumbsUp,
  MessageCircle,
  Repeat2,
  Send,
  Heart,
  Share2,
  Bookmark,
  Globe,
  BadgeCheck,
} from "lucide-react";
import { FormDataView } from "./content-library";
import { PlatformEnum } from "@/models/api/knowledge/platform.type";
import { PostedImageContent } from "@/models/api/content/image.type";
import { DEFAULT_PLACEHOLDER_IMAGE, SOCIAL_MEDIA_PLATFORMS } from "@/constants";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import {
  usePlatformKnowledgeGetAll,
  useBusinessKnowledgeGetById,
} from "@/services/knowledge.api";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ViewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: FormDataView;
  setFormData: (formData: FormDataView) => void;
  onPostNow: () => void;
}

export function ViewPostModal({
  isOpen,
  onClose,
  onPostNow,
  formData,
  setFormData,
}: ViewPostModalProps) {
  const { businessId } = useParams() as { businessId: string };
  const { data: platformData } = usePlatformKnowledgeGetAll(businessId);
  const { data: businessKnowledgeData } = useBusinessKnowledgeGetById(businessId);
  const platforms = platformData?.data.data || [];
  const t = useTranslations("contentScheduler");

  const businessName =
    businessKnowledgeData?.data?.data?.name || "Business Name";
  const businessLogo =
    businessKnowledgeData?.data?.data?.primaryLogo ||
    businessKnowledgeData?.data?.data?.primaryLogoUrl ||
    "";

  const socialPlatforms = SOCIAL_MEDIA_PLATFORMS;

  const mappedPlatforms = socialPlatforms.map((platformCode) => {
    const platform = platforms.find((item) => item.platform === platformCode);
    const status = platform?.status ?? "unconnected";

    return {
      id: platformCode,
      name: platform?.name ?? mapEnumPlatform.getPlatformLabel(platformCode),
      isActive: status === "connected",
      status,
      hint:
        status === "connected"
          ? null
          : status === "unconnected"
            ? t("unconnected")
            : t("notAvailable"),
    };
  });

  const unavailablePlatforms = mappedPlatforms.filter(
    (platform) => !platform.isActive
  );

  const postedImageContents =
    formData?.data?.postedImageContents?.filter((platform) =>
      socialPlatforms.includes(platform.platform)
    ) || [];

  const postedPlatforms = new Set<PlatformEnum>([
    ...(formData?.data?.platforms || []),
    ...postedImageContents.map((item) => item.platform),
  ]);

  const unPostedPlatforms = mappedPlatforms.filter(
    (platform) => !postedPlatforms.has(platform.id)
  );

  const previewPlatforms = useMemo(() => {
    const posted = postedImageContents.map((p) => p.platform);
    const selected = formData?.selectedPlatforms || [];
    const list = Array.from(new Set([...posted, ...selected]));
    socialPlatforms.forEach((p) => {
      if (!list.includes(p)) list.push(p);
    });
    return list;
  }, [postedImageContents, formData?.selectedPlatforms, socialPlatforms]);

  const [activePreviewPlatform, setActivePreviewPlatform] =
    useState<PlatformEnum>("instagram_professional");

  useEffect(() => {
    if (isOpen) {
      const first =
        postedImageContents[0]?.platform ||
        formData?.selectedPlatforms?.[0] ||
        "instagram_professional";
      setActivePreviewPlatform(first);
    }
  }, [isOpen, formData?.data?.id]);

  const handleShowPosted = (item: PostedImageContent) => {
    window.open(item.url, "_blank");
  };

  const handlePostNow = () => {
    onPostNow();
  };

  const handleSelectUnpostedPlatform = (platform: PlatformEnum) => {
    if (isDisabledPlatform(platform)) return;
    const isExist = isSelectedPlatform(platform);
    setFormData({
      ...formData,
      selectedPlatforms: isExist
        ? formData?.selectedPlatforms?.filter((p) => p !== platform)
        : [...formData?.selectedPlatforms, platform],
    });
  };

  const isSelectedPlatform = (platform: PlatformEnum) => {
    return formData?.selectedPlatforms?.includes(platform);
  };

  const isDisabledPlatform = (platform: PlatformEnum) => {
    return unavailablePlatforms.some((p) => p.id === platform);
  };

  const postImageUrl =
    formData?.data?.images?.[0] || DEFAULT_PLACEHOLDER_IMAGE;
  const postCaption = formData?.data?.caption || "";

  const renderCaptionArea = (className?: string) => (
    <div className={cn("relative w-full group", className)}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {postCaption || (
          <span className="italic text-muted-foreground">Tidak ada caption</span>
        )}
      </p>
    </div>
  );

  const renderImage = () => (
    <div className="relative flex max-h-[500px] w-full items-center justify-center overflow-hidden bg-black/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={postImageUrl}
        alt="Post content"
        className="h-auto max-h-[500px] w-full object-contain"
      />
    </div>
  );

  const renderLinkedInPreview = () => (
    <div className="mx-auto flex w-full max-w-[500px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between p-4">
        <div className="flex gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-full bg-muted">
            {businessLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessLogo}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="cursor-pointer text-sm font-semibold hover:text-blue-600 hover:underline">
                {businessName}
              </span>
              <BadgeCheck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">• 1st</span>
            </div>
            <span className="line-clamp-1 text-xs text-muted-foreground">
              Postmatic Business Page
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              Just now • <Globe className="h-3 w-3" />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <MoreHorizontal className="h-5 w-5 cursor-pointer hover:text-foreground" />
          <X className="h-5 w-5 cursor-pointer hover:text-foreground" />
        </div>
      </div>
      <div className="px-4 pb-3">{renderCaptionArea()}</div>
      {renderImage()}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between border-t border-border/60 pt-3 text-muted-foreground">
          <div className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted">
            <ThumbsUp className="h-5 w-5" />
            <span className="text-sm font-medium">Like</span>
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Comment</span>
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted">
            <Repeat2 className="h-5 w-5" />
            <span className="text-sm font-medium">Repost</span>
          </div>
          <div className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 transition-colors hover:bg-muted">
            <Send className="h-5 w-5" />
            <span className="text-sm font-medium">Send</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFacebookPreview = () => (
    <div className="mx-auto flex w-full max-w-[500px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between p-4">
        <div className="flex gap-3">
          <div className="size-10 shrink-0 overflow-hidden rounded-full border border-border/50 bg-muted">
            {businessLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={businessLogo}
                alt="Logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-x-1">
              <span className="cursor-pointer text-sm font-bold hover:underline">
                {businessName}
              </span>
              <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />
              <span className="mx-1 text-sm font-semibold text-muted-foreground">
                •
              </span>
              <span className="cursor-pointer text-sm font-semibold text-blue-500 hover:underline">
                Follow
              </span>
            </div>
            <span className="mt-0.5 flex w-fit cursor-pointer items-center gap-1 text-[13px] text-muted-foreground hover:underline">
              Just now • <Globe className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-4 text-muted-foreground">
          <MoreHorizontal className="h-5 w-5 cursor-pointer rounded-full hover:bg-muted" />
          <X className="h-5 w-5 cursor-pointer rounded-full hover:bg-muted" />
        </div>
      </div>
      <div className="px-4 pb-3">{renderCaptionArea()}</div>
      {renderImage()}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 text-muted-foreground">
        <div className="flex cursor-pointer items-center gap-1.5 hover:underline">
          <div className="flex -space-x-1">
            <div className="z-10 flex size-5 items-center justify-center rounded-full border border-card bg-blue-500">
              <ThumbsUp className="h-2.5 w-2.5 fill-white text-white" />
            </div>
            <div className="flex size-5 items-center justify-center rounded-full border border-card bg-red-500">
              <Heart className="h-2.5 w-2.5 fill-white text-white" />
            </div>
          </div>
          <span className="text-[13px]">12</span>
        </div>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="cursor-pointer hover:underline">1 Comment</span>
          <span className="cursor-pointer hover:underline">1 Share</span>
        </div>
      </div>
      <div className="px-4 py-1.5">
        <div className="flex items-center justify-between font-semibold text-muted-foreground">
          <div className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-muted">
            <ThumbsUp className="h-5 w-5" />
            <span className="text-sm">Like</span>
          </div>
          <div className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-muted">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">Comment</span>
          </div>
          <div className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md py-2 transition-colors hover:bg-muted">
            <Share2 className="h-5 w-5" />
            <span className="text-sm">Share</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInstagramPreview = () => (
    <div className="mx-auto flex w-full max-w-[470px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between bg-card px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-card bg-muted">
              {businessLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessLogo}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm font-bold">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="cursor-pointer text-sm font-semibold">
              {businessName}
            </span>
            <span className="text-sm text-muted-foreground">• 1m</span>
          </div>
        </div>
        <MoreHorizontal className="h-5 w-5 cursor-pointer text-foreground" />
      </div>
      {renderImage()}
      <div className="flex flex-col gap-2 px-3 pb-4 pt-3">
        <div className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-4">
            <Heart className="h-6 w-6 cursor-pointer transition-opacity hover:opacity-50" />
            <MessageCircle
              className="h-6 w-6 cursor-pointer transition-opacity hover:opacity-50"
              style={{ transform: "scaleX(-1)" }}
            />
            <Send className="h-6 w-6 cursor-pointer transition-opacity hover:opacity-50" />
          </div>
          <Bookmark className="h-6 w-6 cursor-pointer text-foreground transition-opacity hover:opacity-50" />
        </div>
        <span className="mt-1 w-fit cursor-pointer text-sm font-semibold">
          12 likes
        </span>
        <div className="mt-1 flex w-full flex-col text-sm">
          <span className="mb-1 w-fit cursor-pointer font-semibold">
            {businessName}
          </span>
          {renderCaptionArea()}
        </div>
        <span className="mt-1 w-fit cursor-pointer text-sm text-muted-foreground">
          View all 1 comment
        </span>
      </div>
    </div>
  );

  const renderActivePreview = () => {
    if (activePreviewPlatform === "linked_in") return renderLinkedInPreview();
    if (activePreviewPlatform === "facebook_page")
      return renderFacebookPreview();
    return renderInstagramPreview();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent size="xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t("viewPost")}</DialogTitle>
          <DialogDescription>{t("viewPostDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hidden px-4 py-4 sm:p-6">
          <div className="grid h-full grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Left Section - Platforms Status */}
            <div className="flex flex-col gap-6">
              {/* Posted Platforms */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("postedTo")}
                </h3>
                {postedImageContents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {postedImageContents.map((platform) => (
                      <Button
                        key={platform.id}
                        type="button"
                        variant="outline"
                        className="justify-start space-x-2 border-green-600/40 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                        onClick={() => handleShowPosted(platform)}
                      >
                        {mapEnumPlatform.getPlatformIcon(platform.platform)}
                        <span className="truncate text-xs font-medium">
                          {mapEnumPlatform.getPlatformLabel(platform.platform)}
                        </span>
                        <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" />
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("notAvailable")}
                  </p>
                )}
              </div>

              {/* Available to Post */}
              {unPostedPlatforms.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("availableToPost")}
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {unPostedPlatforms.map((platform) => (
                      <Button
                        key={platform.id}
                        type="button"
                        variant="outline"
                        className={cn(
                          "justify-start space-x-2 transition-colors",
                          isSelectedPlatform(platform.id)
                            ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                            : "hover:bg-muted"
                        )}
                        disabled={isDisabledPlatform(platform.id)}
                        onClick={() => handleSelectUnpostedPlatform(platform.id)}
                      >
                        {mapEnumPlatform.getPlatformIcon(platform.id)}
                        <span className="truncate text-xs font-medium">
                          {mapEnumPlatform.getPlatformLabel(platform.id)}
                        </span>
                        {platform.hint && (
                          <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {platform.hint}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Section - Social Media Preview */}
            <div className="flex flex-col gap-3">
              <div className="sticky -top-4 -mt-4 sm:-top-6 sm:-mt-6 z-10 -mx-2 flex gap-2 overflow-x-auto scrollbar-hidden bg-background px-2 pb-3 pt-2">
                {previewPlatforms.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActivePreviewPlatform(platform)}
                    className={cn(
                      "flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      activePreviewPlatform === platform
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-background-secondary text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {mapEnumPlatform.getPlatformIcon(
                      platform,
                      activePreviewPlatform === platform
                        ? "text-white w-3 h-3"
                        : "w-3 h-3"
                    )}
                    {mapEnumPlatform.getPlatformLabel(platform)}
                  </button>
                ))}
              </div>

              <div className="flex h-fit origin-top transform flex-col lg:scale-[0.85]">
                {renderActivePreview()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Post Now Button */}
        <DialogFooter>
          <Button
            type="button"
            onClick={handlePostNow}
            disabled={formData?.selectedPlatforms?.length === 0}
          >
            {t("repostNow")}{" "}
            {formData?.selectedPlatforms?.length > 0 &&
              `(${formData?.selectedPlatforms?.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
