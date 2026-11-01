import { useTranslations } from "next-intl";
import { createAvatarKnowledgeSchema } from "./avatar.zod";
import { createBusinessKnowledgeSchema } from "./business.zod";
import { createProductKnowledgeSchema } from "./product.zod";
import { createRoleKnowledgeSchema } from "./role.zod";

// Hook to get business knowledge schema with i18n messages
export const useBusinessKnowledgeSchema = () => {
  const tBusiness = useTranslations("businessKnowledge");

  const messages = {
    zodColorTone: tBusiness("zodColorTone"),
    zodLogoBrand: tBusiness("zodLogoBrand"),
    zodBrandName: tBusiness("zodBrandName"),
    zodCategory: tBusiness("zodCategory"),
    zodDescription: tBusiness("zodDescription"),
    zodPhone: tBusiness("zodPhone"),
    zodMaxLengthBrandName: tBusiness("zodMaxLengthBrandName"),
    zodMaxLengthDescription: tBusiness("zodMaxLengthDescription"),
    zodMaxLengthPhone: tBusiness("zodMaxLengthPhone"),
    zodMaxLengthWebsite: tBusiness("zodMaxLengthWebsite"),
    zodUrlWebsite: tBusiness("zodUrlWebsite"),
    zodCountryCode: tBusiness("zodCountryCode"),
  };

  return createBusinessKnowledgeSchema(messages);
};

// Hook to get product knowledge schema with i18n messages
export const useProductKnowledgeSchema = () => {
  const tProduct = useTranslations("productKnowledge");

  const messages = {
    zodProductPhoto: tProduct("zodProductPhoto"),
    zodProductName: tProduct("zodProductName"),
    zodProductCategory: tProduct("zodProductCategory"),
    zodProductDescription: tProduct("zodProductDescription"),
    zodPrice: tProduct("zodPrice"),
    zodCurrency: tProduct("zodCurrency"),
    zodMaxLengthProductName: tProduct("zodMaxLengthProductName"),
    zodMaxLengthProductDescription: tProduct("zodMaxLengthProductDescription"),
    zodMaxLengthPrice: tProduct("zodMaxLengthPrice"),
    zodMaxLengthCurrency: tProduct("zodMaxLengthCurrency"),
  };

  return createProductKnowledgeSchema(messages);
};

export const useAvatarKnowledgeSchema = () => {
  const tAvatar = useTranslations("avatarKnowledge");

  const messages = {
    zodAvatarPhoto: tAvatar("zodAvatarPhoto"),
    zodAvatarName: tAvatar("zodAvatarName"),
    zodMaxLengthAvatarName: tAvatar("zodMaxLengthAvatarName"),
  };

  return createAvatarKnowledgeSchema(messages);
};

// Hook to get role knowledge schema with i18n messages
export const useRoleKnowledgeSchema = () => {
  const tRole = useTranslations("roleKnowledge");

  const messages = {
    zodTargetAudience: tRole("zodTargetAudience"),
    zodContentTone: tRole("zodContentTone"),
    zodHashtags: tRole("zodHashtags"),
    zodMaxLengthTargetAudience: tRole("zodMaxLengthTargetAudience"),
    zodMaxLengthContentTone: tRole("zodMaxLengthContentTone"),
    zodMaxLengthHashtags: tRole("zodMaxLengthHashtags"),
  };

  return createRoleKnowledgeSchema(messages);
};
