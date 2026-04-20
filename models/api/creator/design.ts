import { BaseResponse, BaseResponseFiltered } from "../base-response.type";

// Publisher interface
export interface Publisher {
  id: string;
  name: string;
  image: string;
}

// Template Image Category interface
export interface TemplateImageCategory {
  id: string;
  name: string;
}

// Template Product Category interface
export interface TemplateProductCategory {
  id: string;
  indonesianName: string;
}

// Template Image Saved count interface
export interface TemplateImageSavedCount {
  templateImageSaved: number;
}

// Creator Design interface
export interface CreatorDesign {
  currency: string;
  id: string;
  name: string;
  imageUrl: string;
  isPublished: boolean;
  price: number;
  publisherId: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  publisher: Publisher;
  templateImageCategories: TemplateImageCategory[];
  templateProductCategories: TemplateProductCategory[];
  _count: TemplateImageSavedCount;
}

// Create Design Request interface
export interface CreateDesignRequest {
  name: string;
  imageUrl: string;
  price: number;
  isPublished?: boolean;
  currency: string;
  templateImageCategoryIds?: string[];
  templateProductCategoryIds?: string[];
}

// Update Design Request interface
export interface UpdateDesignRequest {
  name?: string;
  imageUrl?: string;
  price?: number;
  isPublished?: boolean;
  templateImageCategoryIds?: string[];
  templateProductCategoryIds?: string[];
}

// Publish/Unpublish Design Request interface
export interface PublishDesignRequest {
  isPublished: boolean;
}

// Get Designs Query Parameters
export interface GetDesignsQuery {
  limit?: number;
  page?: number;
  search?: string;
  category?: string;
  sort?: string;
  sortBy?: string;
}

// Response types
export type GetDesignsResponse = BaseResponseFiltered<CreatorDesign[]>;
export type CreateDesignResponse = BaseResponse<CreatorDesign>;
export type UpdateDesignResponse = BaseResponse<CreatorDesign>;
export type PublishDesignResponse = BaseResponse<CreatorDesign>;
export type DeleteDesignResponse = BaseResponse<null>;
