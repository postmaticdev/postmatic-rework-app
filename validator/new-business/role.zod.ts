import z from "zod";

// Function to create role knowledge schema with i18n messages
export const createRoleKnowledgeSchema = (messages: {
  zodTargetAudience: string;
  zodContentTone: string;
  zodPersona: string;
  zodHashtags: string;
  zodCallToAction: string;
  zodGoals: string;
  zodMaxLengthTargetAudience: string;
  zodMaxLengthContentTone: string;
  zodMaxLengthPersona: string;
  zodMaxLengthHashtags: string;
  zodMaxLengthCallToAction: string;
  zodMaxLengthGoals: string;
}) => z.object({
  targetAudience: z
    .string()
    .min(1, messages.zodTargetAudience)
    .max(200, messages.zodMaxLengthTargetAudience),
  tone: z
    .string()
    .min(1, messages.zodContentTone)
    .max(200, messages.zodMaxLengthContentTone),
  audiencePersona: z
    .string()
    .min(1, messages.zodPersona)
    .max(500, messages.zodMaxLengthPersona),
  hashtags: z
    .array(z.string())
    .min(1, messages.zodHashtags)
    .max(10, messages.zodMaxLengthHashtags),
  callToAction: z
    .string()
    .min(1, messages.zodCallToAction)
    .max(200, messages.zodMaxLengthCallToAction),
  goals: z
    .string()
    .min(1, messages.zodGoals)
    .max(500, messages.zodMaxLengthGoals),
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
  audiencePersona: z
    .string()
    .min(1, "Harap masukkan audience persona")
    .max(500, "Audience persona harus kurang dari 500 karakter"),
  hashtags: z
    .array(z.string())
    .min(1, "Harap masukkan setidaknya satu hashtag")
    .max(10, "Maksimal 10 hashtags yang diizinkan"),
  callToAction: z
    .string()
    .min(1, "Harap masukkan call to action")
    .max(200, "Call to action harus kurang dari 200 karakter"),
  goals: z
    .string()
    .min(1, "Harap masukkan content goals")
    .max(500, "Content goals harus kurang dari 500 karakter"),
});

export type RoleKnowledgePld = z.infer<typeof roleKnowledgeSchema>;
