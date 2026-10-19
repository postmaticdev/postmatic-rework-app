"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useRole } from "@/contexts/role-context";
import { showToast } from "@/helper/show-toast";
import { mapEnumPlatform } from "@/helper/map-enum-platform";
import {
  getPublishJobState,
  isReconnectRequiredError,
} from "@/helper/publish-status";
import { BaseResponse } from "@/models/api/base-response.type";
import {
  DirectPostPlatformResult,
  DirectPostResultRes,
} from "@/models/api/content/image.type";

export type PublishFeedbackResult =
  | "success"
  | "partial"
  | "failed"
  | "in_progress"
  | "error";

const RESULT_TOAST_DURATION_MS = 8000;

type PublishErrorLike = {
  response?: { status?: number; data?: Partial<BaseResponse<DirectPostResultRes | null>> };
};

/*
  Reports the per-platform result of a direct post / repost. A success toast is
  only shown for platforms that actually succeeded; failures name the platform
  and offer a reconnect action when the account needs reconnecting.
*/
export function usePublishFeedback() {
  const t = useTranslations("contentScheduler");
  const router = useRouter();
  const { businessId } = useParams() as { businessId: string };
  const { access } = useRole();
  const canReconnect = access.platformKnowledge.write;

  const reportResults = useCallback(
    (
      data: DirectPostResultRes | null | undefined,
      fallbackMessage?: string
    ): PublishFeedbackResult => {
      const results = data?.publishResults;
      if (!results?.length) {
        showToast("success", fallbackMessage || t("publishSuccess"));
        return "success";
      }

      const toLabels = (items: DirectPostPlatformResult[]) =>
        items
          .map((item) => mapEnumPlatform.getPlatformLabel(item.platformCode))
          .join(", ");
      const succeeded = results.filter(
        (item) => getPublishJobState(item.jobStatus) === "success"
      );
      const failed = results.filter(
        (item) => getPublishJobState(item.jobStatus) !== "success"
      );

      if (!failed.length) {
        toast.success(t("publishAllSuccess", { platforms: toLabels(succeeded) }));
        return "success";
      }

      const needsReconnect = failed.filter(
        (item) => item.requiresReconnect || isReconnectRequiredError(item.errorMessage)
      );
      const description = needsReconnect.length
        ? canReconnect
          ? t("publishReconnectHint", { platforms: toLabels(needsReconnect) })
          : t("publishReconnectOwnerHint", { platforms: toLabels(needsReconnect) })
        : t("publishRetryHint");
      const options = {
        description,
        duration: RESULT_TOAST_DURATION_MS,
        action:
          needsReconnect.length && canReconnect
            ? {
                label: t("reconnectAction"),
                onClick: () =>
                  router.push(`/business/${businessId}/knowledge-base?reconnectPlatform=1`),
              }
            : undefined,
      };

      if (!succeeded.length) {
        toast.error(t("publishAllFailed", { platforms: toLabels(failed) }), options);
        return "failed";
      }

      toast.warning(
        t("publishPartial", {
          succeeded: toLabels(succeeded),
          failed: toLabels(failed),
        }),
        options
      );
      return "partial";
    },
    [businessId, canReconnect, router, t]
  );

  const notifyPublishResult = useCallback(
    (res: BaseResponse<DirectPostResultRes | null>) =>
      reportResults(res.data, res.responseMessage),
    [reportResults]
  );

  const notifyPublishError = useCallback(
    (error: unknown): PublishFeedbackResult => {
      const response = (error as PublishErrorLike)?.response;
      const responseMessage = response?.data?.responseMessage;

      // 422: every platform failed; the per-platform results come as error data.
      if (responseMessage === "DIRECT_POST_ALL_PLATFORMS_FAILED" && response?.data?.data) {
        return reportResults(response.data.data);
      }

      // 409: another request is already publishing this post.
      if (responseMessage === "IMAGE_POST_PUBLISH_IN_PROGRESS") {
        toast.info(t("publishInProgress"), { duration: RESULT_TOAST_DURATION_MS });
        return "in_progress";
      }

      showToast("error", error);
      return "error";
    },
    [reportResults, t]
  );

  return { notifyPublishResult, notifyPublishError };
}
