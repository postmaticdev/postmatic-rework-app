import { api } from "@/config/api";
import {
  GetTemplateImageCategoriesResponse,
  GetTemplateProductCategoriesResponse,
} from "@/models/api/library/template-category.type";
import { useQuery } from "@tanstack/react-query";

const templateCategoryService = {
  // Get template image categories
  getImageCategories: () => {
    return api.get<GetTemplateImageCategoriesResponse>("/library/template/category/type");
  },

  // Get template product categories
  getProductCategories: () => {
    return api.get<GetTemplateProductCategoriesResponse>("/library/template/category/product");
  },
};

// React Query hooks for template categories
export const useTemplateImageCategories = () => {
  return useQuery({
    queryKey: ["templateImageCategories"],
    queryFn: () => templateCategoryService.getImageCategories(),
  });
};

export const useTemplateProductCategories = () => {
  return useQuery({
    queryKey: ["templateProductCategories"],
    queryFn: () => templateCategoryService.getProductCategories(),
  });
};

export default templateCategoryService;
