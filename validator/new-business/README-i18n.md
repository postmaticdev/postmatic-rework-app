# I18n Implementation for Zod Validation

Implementasi sistem i18n untuk validasi Zod telah berhasil diintegrasikan ke dalam proyek. Berikut adalah penjelasan cara kerjanya:

## Struktur File

### 1. Schema dengan I18n Support
- `business.zod.ts` - Schema untuk business knowledge dengan dukungan i18n
- `product.zod.ts` - Schema untuk product knowledge dengan dukungan i18n  
- `role.zod.ts` - Schema untuk role knowledge dengan dukungan i18n
- `schema-with-i18n.ts` - Hook untuk menggunakan schema dengan pesan i18n

### 2. Fungsi Utama

#### `createBusinessKnowledgeSchema(messages)`
Membuat schema business knowledge dengan pesan validasi yang dapat disesuaikan.

#### `createProductKnowledgeSchema(messages)`
Membuat schema product knowledge dengan pesan validasi yang dapat disesuaikan.

#### `createRoleKnowledgeSchema(messages)`
Membuat schema role knowledge dengan pesan validasi yang dapat disesuaikan.

### 3. Hook untuk Komponen

#### `useBusinessKnowledgeSchema()`
Hook yang mengembalikan schema business knowledge dengan pesan i18n sesuai bahasa yang aktif.

#### `useProductKnowledgeSchema()`
Hook yang mengembalikan schema product knowledge dengan pesan i18n sesuai bahasa yang aktif.

#### `useRoleKnowledgeSchema()`
Hook yang mengembalikan schema role knowledge dengan pesan i18n sesuai bahasa yang aktif.

## Cara Penggunaan

### Dalam Komponen React

```tsx
import { useBusinessKnowledgeSchema } from "@/validator/new-business/schema-with-i18n";

export function MyComponent() {
  const businessKnowledgeSchema = useBusinessKnowledgeSchema();
  
  // Gunakan schema untuk validasi
  const result = businessKnowledgeSchema.safeParse(data);
  
  if (!result.success) {
    // Error messages akan dalam bahasa yang sesuai dengan locale aktif
    console.log(result.error.issues);
  }
}
```

### Pesan I18n yang Tersedia

Pesan validasi tersedia dalam 3 bahasa:
- **Indonesia** (`id.json`) - Default
- **Inggris** (`en.json`)
- **Jepang** (`jp.json`)

Semua pesan validasi Zod tersimpan dalam namespace:
- `businessKnowledge.*` - Untuk business knowledge validation
- `productKnowledge.*` - Untuk product knowledge validation  
- `roleKnowledge.*` - Untuk role knowledge validation

## Backward Compatibility

Schema default masih tersedia untuk kompatibilitas mundur:
- `businessKnowledgeSchema` - Schema default dengan pesan bahasa Indonesia
- `productKnowledgeSchema` - Schema default dengan pesan bahasa Indonesia
- `roleKnowledgeSchema` - Schema default dengan pesan bahasa Indonesia

## File yang Telah Diupdate

1. `app/[locale]/business/new-business/page.tsx`
2. `app/[locale]/business/[businessId]/knowledge-base/(components)/edit-knowledge-modal.tsx`
3. `app/[locale]/business/[businessId]/knowledge-base/(components)/product-section.tsx`

Semua file ini sekarang menggunakan hook i18n untuk mendapatkan schema dengan pesan validasi yang sesuai dengan bahasa yang aktif.
