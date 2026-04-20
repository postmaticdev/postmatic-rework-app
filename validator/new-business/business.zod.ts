import z from "zod";

/** Helper: normalisasi ke 6-hex tanpa '#' + uppercase, dengan default saat undefined */
const color6HexPreprocess = (v: unknown, fallback = "E5E7EB") => {
  if (typeof v !== "string") return fallback;
  const cleaned = v.trim().replace(/^#/, "").toUpperCase();
  return cleaned || fallback;
};

/** Factory untuk validator colorTone dengan i18n message */
const colorToneSchemaWithMsg = (msg: string) =>
  z.preprocess(
    (v) => color6HexPreprocess(v, "E5E7EB"),
    z
      .string()
      .regex(/^[0-9A-F]{6}$/, { message: msg }) // pastikan 6 hex
  );

// Function to create business knowledge schema with i18n messages
export const createBusinessKnowledgeSchema = (messages: {
  zodLogoBrand: string;
  zodBrandName: string;
  zodCategory: string;
  zodDescription: string;
  zodPhone: string;
  zodColorTone: string;
  zodMaxLengthBrandName: string;
  zodMaxLengthDescription: string;
  zodMaxLengthPhone: string;
}) => z.object({
  primaryLogo: z.string().min(1, messages.zodLogoBrand),
  name: z
    .string()
    .min(1, messages.zodBrandName)
    .max(100, messages.zodMaxLengthBrandName),
  category: z.string().min(1, messages.zodCategory),
  description: z
    .string()
    .min(1, messages.zodDescription)
    .max(1000, messages.zodMaxLengthDescription),
  visionMission: z.string(),
  website: z
    .string()
    .min(1, messages.zodPhone)
    .max(50, messages.zodMaxLengthPhone),
  uniqueSellingPoint: z.string(),
  location: z.string(),
  colorTone: colorToneSchemaWithMsg(messages.zodColorTone),
});

// Default schema with Indonesian messages (for backward compatibility)
export const businessKnowledgeSchema = z.object({
  primaryLogo: z.string().min(1, "Harap upload logo bisnis"),
  name: z
    .string()
    .min(1, "Harap masukkan nama bisnis")
    .max(100, "Nama bisnis harus kurang dari 100 karakter"),
  category: z.string().min(1, "Harap masukkan kategori bisnis"),
  description: z
    .string()
    .min(1, "Harap masukkan deskripsi bisnis")
    .max(1000, "Deskripsi bisnis harus kurang dari 1000 karakter"),
  visionMission: z.string(),
  website: z
    .string()
    .min(1, "Harap masukkan nomor telepon bisnis")
    .max(50, "Nomor telepon bisnis harus kurang dari 50 karakter"),
  uniqueSellingPoint: z.string(),
  location: z.string(),
  colorTone: z.preprocess(
    (v) => color6HexPreprocess(v, "E5E7EB"),
    z
      .string()
      .regex(/^[0-9A-F]{6}$/, {
        message: "Harap masukkan warna tone bisnis (6 digit hex)",
      })
  ),
});

export type BusinessKnowledgePld = z.infer<typeof businessKnowledgeSchema>;
