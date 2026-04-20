import z from "zod";

// Function to create product knowledge schema with i18n messages
export const createProductKnowledgeSchema = (messages: {
  zodProductPhoto: string;
  zodProductName: string;
  zodProductCategory: string;
  zodProductDescription: string;
  zodPrice: string;
  zodCurrency: string;
  zodMaxLengthProductName: string;
  zodMaxLengthProductDescription: string;
  zodMaxLengthPrice: string;
  zodMaxLengthCurrency: string;
}) => z.object({
  images: z.array(z.string()).min(1, messages.zodProductPhoto),
  name: z
    .string()
    .min(1, messages.zodProductName)
    .max(100, messages.zodMaxLengthProductName),
  category: z.string().min(1, messages.zodProductCategory),
  description: z
    .string()
    .min(1, messages.zodProductDescription)
    .max(1000, messages.zodMaxLengthProductDescription),
  price: z
    .number()
    .min(1, messages.zodPrice)
    .max(Number.MAX_SAFE_INTEGER, messages.zodMaxLengthPrice),
  currency: z.string().min(1, messages.zodCurrency),
});

// Default schema with Indonesian messages (for backward compatibility)
export const productKnowledgeSchema = z
  .object({
    images: z.array(z.string()).min(1, "Harap upload foto produk"),
    name: z
      .string()
      .min(1, "Harap masukkan nama produk")
      .max(100, "Nama produk harus kurang dari 100 karakter"),
    category: z.string().min(1, "Harap masukkan kategori produk"),
    description: z
      .string()
      .min(1, "Harap masukkan deskripsi produk")
      .max(1000, "Deskripsi produk harus kurang dari 1000 karakter"),
    price: z
      .number()
      .min(1, "Harap masukkan harga produk")
      .max(Number.MAX_SAFE_INTEGER, "Price is too high"),
    currency: z.string().min(1, "Harap masukkan mata uang"),
  })

export type ProductKnowledgePld = z.infer<typeof productKnowledgeSchema>;
