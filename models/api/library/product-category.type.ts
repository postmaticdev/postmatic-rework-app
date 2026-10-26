import { BusinessCategoryRes } from "@/models/api/library/business-category.type";

/* response for get product categories (same shape as business categories) */
export type ProductCategoryRes = BusinessCategoryRes;

/* "Lainnya": never stored, the user types the category instead */
export const PRODUCT_CATEGORY_OTHER = "other";
