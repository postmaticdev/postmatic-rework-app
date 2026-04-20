import { BaseResponse } from "../base-response.type";

// Template Image Category
export interface TemplateImageCategory {
  id: string;
  name: string;
  _count: {
    templateImageContents: number;
  };
}

// Template Product Category
export interface TemplateProductCategory {
  id: string;
  indonesianName: string;
  _count: {
    templateImageContents: number;
  };
}

// Response types
export type GetTemplateImageCategoriesResponse = BaseResponse<TemplateImageCategory[]>;
export type GetTemplateProductCategoriesResponse = BaseResponse<TemplateProductCategory[]>;
