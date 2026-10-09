import { api } from "@/config/api";
import { BaseResponse } from "@/models/api/base-response.type";
import { UploadSingleImagePld } from "@/models/api/helper/image.type";

export const helperService = {
  uploadSingleImage: async (data: UploadSingleImagePld): Promise<string> => {
    // Add axios interceptor for multipart/form-data
    api.interceptors.request.use((config) => {
      if (config.data instanceof FormData) {
        config.headers["Content-Type"] = "multipart/form-data";
      }
      return config;
    });
    try {
      const formData = new FormData();
      formData.append("asset", data.image);

      const response = await api.post<BaseResponse<{ assetUrl: string } | string | { imageUrl: string }>>(
        "/app/asset-uploader/upload",
        formData
      );
      
      if (response.data.metaData.code !== 200) {
        throw new Error(
          response.data.responseMessage || "Failed to upload image"
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
      throw new Error("Failed to upload image. Please try again.");
    }
  },
};
