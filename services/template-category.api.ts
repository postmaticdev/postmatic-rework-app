import { api } from "@/config/api";
import {
  GetTemplateImageCategoriesResponse,
  GetTemplateProductCategoriesResponse,
} from "@/models/api/library/template-category.type";
import { useQuery } from "@tanstack/react-query";

type CreatorCategory = {
  id: string | number;
  name: string;
  totalData?: number;
};

const mapImageCategory = (category: CreatorCategory) => ({
  id: String(category.id),
  name: category.name,
  _count: { templateImageContents: category.totalData ?? 0 },
});

const mapProductCategory = (category: CreatorCategory) => ({
  id: String(category.id),
  indonesianName: category.name,
  _count: { templateImageContents: category.totalData ?? 0 },
});

const templateCategoryService = {
  // Get template image categories
  getImageCategories: () => {
    return api
      .get<GetTemplateImageCategoriesResponse>("/app/category-creator-image/type")
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data as unknown as CreatorCategory[]).map(
            mapImageCategory
          ),
        },
      }));
  },

  // Get template product categories
  getProductCategories: () => {
    return api
      .get<GetTemplateProductCategoriesResponse>(
        "/app/category-creator-image/product"
      )
      .then((res) => ({
        ...res,
        data: {
          ...res.data,
          data: (res.data.data as unknown as CreatorCategory[]).map(
            mapProductCategory
          ),
        },
      }));
  },
};

// React Query hooks for template categories
export const useTemplateImageCategories = (enabled = true) => {
  return useQuery({
    queryKey: ["templateImageCategories"],
    queryFn: () => templateCategoryService.getImageCategories(),
    enabled,
  });
};

export const useTemplateProductCategories = (enabled = true) => {
  return useQuery({
    queryKey: ["templateProductCategories"],
    queryFn: () => templateCategoryService.getProductCategories(),
    enabled,
  });
};

export default templateCategoryService;
