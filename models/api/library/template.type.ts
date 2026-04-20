/* payload for save template */
export interface SavedTemplatePld {
  templateImageContentId: string;
}

/* response for get saved templates */
export interface SavedTemplateRes {
  name: string;
  imageUrl: string;
  templateImageContent: TemplateImageContent;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateImageContent {
  id: string;
  publisher: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  templateImageCategories: TemplateImageCategories[];
  templateProductCategories: TemplateProductCategories[];
}
export interface TemplateImageCategories {
  id: string;
  name: string;
}

export interface TemplateProductCategories {
  id: string;
  indonesianName: string;
}
/* response for get published templates */
export interface PublishedTemplateRes {
  id: string;
  name: string;
  imageUrl: string;
  publisher: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  templateImageCategories: TemplateImageCategories[];
  templateProductCategories: TemplateProductCategories[];
  createdAt: string;
  updatedAt: string;
}

/* response for get template categories promotional, showcase, etc*/
export interface TemplateCategoryRes {
  id: string;
  name: string;
  _count: Count;
}

/* response for get template product categories makanan, snack, etc*/
export interface TemplateProductCategoryRes {
  id: string;
  indonesianName: string;
  _count: Count;
}

export interface Count {
  templateImageContents: number;
}
