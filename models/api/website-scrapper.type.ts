export type WebsiteScrapperStatus = "pending" | "success" | "error" | string;

export type WebsiteScrapperProcessState =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | string;

export interface WebsiteScrapperBusinessKnowledge {
  primaryLogoUrl: string | null;
  name: string;
  category: string;
  description: string;
  websiteUrl: string | null;
  colorTone: string;
  businessPhone: string;
  countryCode: string;
}

export interface WebsiteScrapperBusinessProduct {
  name: string;
  category: string;
  description: string;
  price: number;
  currency: string;
  imageUrls: string[];
}

export interface WebsiteScrapperBusinessRole {
  hashtags: string[];
  targetAudience: string;
  tone: string;
}

export interface WebsiteScrapperMetadata {
  title: string;
  description: string;
  brandImage: string;
}

export interface WebsiteScrapperImage {
  url: string;
  alt: string;
}

export interface WebsiteScrapperResultData {
  businessKnowledge: WebsiteScrapperBusinessKnowledge;
  businessProducts: WebsiteScrapperBusinessProduct[];
  businessRole: WebsiteScrapperBusinessRole;
  metadata: WebsiteScrapperMetadata;
  images: WebsiteScrapperImage[];
  markdownContent: string;
}

export interface WebsiteScrapperHistoryItem {
  id: number;
  url: string;
  status: WebsiteScrapperStatus;
  processState: WebsiteScrapperProcessState;
  modelName: string;
  attempt: number;
  tokenUsed: number;
  errorReason: string | null;
  data?: WebsiteScrapperResultData | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteScrapperCreatePld {
  websiteUrl: string;
}
