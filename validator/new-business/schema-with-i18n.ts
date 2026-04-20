import { useTranslations } from "next-intl";
import { createBusinessKnowledgeSchema } from "./business.zod";
import { createProductKnowledgeSchema } from "./product.zod";
import { createRoleKnowledgeSchema } from "./role.zod";

// Hook to get business knowledge schema with i18n messages
export const useBusinessKnowledgeSchema = () => {
  const t = useTranslations("businessKnowledge");
  
  const messages = {
    zodColorTone: t("zodColorTone"),
    zodLogoBrand: t("zodLogoBrand"),
    zodBrandName: t("zodBrandName"),
    zodCategory: t("zodCategory"),
    zodDescription: t("zodDescription"),
    zodVisionMission: t("zodVisionMission"),
    zodUniqueSellingPoint: t("zodUniqueSellingPoint"),
    zodUrlWebsite: t("zodUrlWebsite"),
    zodLocation: t("zodLocation"),
    zodMaxLengthBrandName: t("zodMaxLengthBrandName"),
    zodMaxLengthDescription: t("zodMaxLengthDescription"),
    zodMaxLengthVisionMission: t("zodMaxLengthVisionMission"),
    zodMaxLengthUniqueSellingPoint: t("zodMaxLengthUniqueSellingPoint"),
    zodMaxLengthLocation: t("zodMaxLengthLocation"),
  };

  return createBusinessKnowledgeSchema(messages);
};

// Hook to get product knowledge schema with i18n messages
export const useProductKnowledgeSchema = () => {
  const t = useTranslations("productKnowledge");
  
  const messages = {
    zodProductPhoto: t("zodProductPhoto"),
    zodProductName: t("zodProductName"),
    zodProductCategory: t("zodProductCategory"),
    zodProductDescription: t("zodProductDescription"),
    zodPrice: t("zodPrice"),
    zodCurrency: t("zodCurrency"),
    zodMaxLengthProductName: t("zodMaxLengthProductName"),
    zodMaxLengthProductDescription: t("zodMaxLengthProductDescription"),
    zodMaxLengthPrice: t("zodMaxLengthPrice"),
    zodMaxLengthCurrency: t("zodMaxLengthCurrency"),
  };

  return createProductKnowledgeSchema(messages);
};

// Hook to get role knowledge schema with i18n messages
export const useRoleKnowledgeSchema = () => {
  const t = useTranslations("roleKnowledge");
  
  const messages = {
    zodTargetAudience: t("zodTargetAudience"),
    zodContentTone: t("zodContentTone"),
    zodPersona: t("zodPersona"),
    zodHashtags: t("zodHashtags"),
    zodCallToAction: t("zodCallToAction"),
    zodGoals: t("zodGoals"),
    zodMaxLengthTargetAudience: t("zodMaxLengthTargetAudience"),
    zodMaxLengthContentTone: t("zodMaxLengthContentTone"),
    zodMaxLengthPersona: t("zodMaxLengthPersona"),
    zodMaxLengthHashtags: t("zodMaxLengthHashtags"),
    zodMaxLengthCallToAction: t("zodMaxLengthCallToAction"),
    zodMaxLengthGoals: t("zodMaxLengthGoals"),
  };

  return createRoleKnowledgeSchema(messages);
};
