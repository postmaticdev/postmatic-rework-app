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
    zodPhone: t("zodPhone"),
    zodMaxLengthBrandName: t("zodMaxLengthBrandName"),
    zodMaxLengthDescription: t("zodMaxLengthDescription"),
    zodMaxLengthPhone: t("zodMaxLengthPhone"),
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
    zodHashtags: t("zodHashtags"),
    zodMaxLengthTargetAudience: t("zodMaxLengthTargetAudience"),
    zodMaxLengthContentTone: t("zodMaxLengthContentTone"),
    zodMaxLengthHashtags: t("zodMaxLengthHashtags"),
  };

  return createRoleKnowledgeSchema(messages);
};
