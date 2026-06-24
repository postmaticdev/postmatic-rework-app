import z from "zod";

export const createAvatarKnowledgeSchema = (messages: {
  zodAvatarPhoto: string;
  zodAvatarName: string;
  zodMaxLengthAvatarName: string;
}) =>
  z.object({
    imageUrl: z.string().min(1, messages.zodAvatarPhoto),
    name: z
      .string()
      .min(1, messages.zodAvatarName)
      .max(100, messages.zodMaxLengthAvatarName),
  });

export const avatarKnowledgeSchema = z.object({
  imageUrl: z.string().min(1, "Harap upload foto avatar"),
  name: z
    .string()
    .min(1, "Harap masukkan nama avatar")
    .max(100, "Nama avatar harus kurang dari 100 karakter"),
});

export type BusinessAvatarPld = z.infer<typeof avatarKnowledgeSchema>;
