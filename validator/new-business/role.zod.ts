import z from "zod";

// Function to create role knowledge schema with i18n messages
export const createRoleKnowledgeSchema = (messages: {
  zodTargetAudience: string;
  zodContentTone: string;
  zodHashtags: string;
  zodMaxLengthTargetAudience: string;
  zodMaxLengthContentTone: string;
  zodMaxLengthHashtags: string;
}) => z.object({
  targetAudience: z
    .string()
    .min(1, messages.zodTargetAudience)
    .max(200, messages.zodMaxLengthTargetAudience),
  tone: z
    .string()
    .min(1, messages.zodContentTone)
    .max(200, messages.zodMaxLengthContentTone),
  audiencePersona: z.string(),
  hashtags: z
    .array(z.string())
    .min(1, messages.zodHashtags)
    .max(10, messages.zodMaxLengthHashtags),
  callToAction: z.string(),
  goals: z.string(),
});

// Default schema with Indonesian messages (for backward compatibility)
export const roleKnowledgeSchema = z.object({
  targetAudience: z
    .string()
    .min(1, "Harap masukkan target audience")
    .max(200, "Target audience harus kurang dari 200 karakter"),
  tone: z
    .string()
    .min(1, "Harap masukkan content tone")
    .max(200, "Content tone harus kurang dari 200 karakter"),
  audiencePersona: z.string(),
  hashtags: z
    .array(z.string())
    .min(1, "Harap masukkan setidaknya satu hashtag")
    .max(10, "Maksimal 10 hashtags yang diizinkan"),
  callToAction: z.string(),
  goals: z.string(),
});

export type RoleKnowledgePld = z.infer<typeof roleKnowledgeSchema>;
