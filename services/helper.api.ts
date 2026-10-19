import { api } from "@/config/api";
import { BaseResponse } from "@/models/api/base-response.type";
import { UploadSingleImagePld } from "@/models/api/helper/image.type";
import { translateApiResponseMessage } from "@/helper/api-response-message";

// Mirrors the backend asset uploader image policy (jpeg/png/webp, max 10MB).
export const UPLOAD_IMAGE_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
export const UPLOAD_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/**
 * Client-side pre-check for image uploads. Returns the `toast.content.*`
 * i18n key describing the problem, or null when the file is acceptable.
 * An empty `file.type` is left to the backend (it sniffs the content).
 */
export const validateUploadImageFile = (
  file: File
): "imageInvalidType" | "imageTooLarge" | null => {
  const type = file.type.toLowerCase();
  if (type && !UPLOAD_IMAGE_ALLOWED_TYPES.includes(type)) {
    return "imageInvalidType";
  }
  if (file.size > UPLOAD_IMAGE_MAX_BYTES) {
    return "imageTooLarge";
  }
  return null;
};

export const helperService = {
  uploadSingleImage: async (data: UploadSingleImagePld): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("asset", data.image);

      // The api instance defaults to application/json (which would make axios
      // serialize FormData to JSON); override it for this request only. In the
      // browser axios then drops the header so the multipart boundary is set.
      const response = await api.post<BaseResponse<{ assetUrl: string } | string | { imageUrl: string }>>(
        "/app/asset-uploader/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      
      if (response.data.metaData.code !== 200) {
        throw new Error(
          response.data.responseMessage || translateApiResponseMessage("UPLOAD_IMAGE_FAILED")
        );
      }
      
      if (typeof response.data.data === "string") {
        return response.data.data;
      }
      if (response.data.data && "assetUrl" in response.data.data) {
        return response.data.data.assetUrl;
      }
      return (response.data.data as Record<string, string>).imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      // Surface the server's message (e.g. size/type rejection) when present.
      const axiosLike = error as {
        isAxiosError?: boolean;
        response?: { data?: { responseMessage?: string } };
      };
      const serverMessage = axiosLike?.response?.data?.responseMessage;
      const ownMessage =
        !axiosLike?.isAxiosError && error instanceof Error ? error.message : "";
      throw new Error(
        serverMessage || ownMessage || translateApiResponseMessage("UPLOAD_IMAGE_FAILED")
      );
    }
  },
};
