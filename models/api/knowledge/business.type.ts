/** Business knowledge payload */
export interface BusinessKnowledgePld {
  primaryLogo: string | null;
  name: string;
  category: string;
  description: string;
  visionMission: string;
  website: string;
  businessPhone: string;
  countryCode: string;
  location: string;
  uniqueSellingPoint: string;
  colorTone: string;
}

/** Business knowledge response */
export interface BusinessKnowledgeRes {
  id: string;
  primaryLogo: string;
  secondaryLogo: string;
  primaryLogoUrl?: string | null;
  name: string;
  category: string;
  description: string;
  visionMission: string;
  website: string;
  websiteUrl?: string | null;
  businessPhone?: string | null;
  countryCode?: string | null;
  location: string;
  uniqueSellingPoint: string;
  colorTone: string;
  rootBusinessId: string;
  deletedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
