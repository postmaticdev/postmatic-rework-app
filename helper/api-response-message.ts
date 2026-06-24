type SupportedLocale = "id" | "en";

const DEFAULT_LOCALE: SupportedLocale = "id";

const EXACT_MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  id: {
    LOGIN_SUCCESS: "Berhasil masuk.",
    REGISTER_SUCCESS: "Pendaftaran berhasil. Silakan cek email Anda untuk verifikasi.",
    LOGOUT_SUCCESS: "Berhasil keluar dari sesi ini.",
    LOGOUT_ALL_SUCCESS: "Berhasil keluar dari semua sesi.",
    REFRESH_TOKEN_SUCCESS: "Sesi berhasil diperbarui.",
    REFRESH_TOKEN_NOT_FOUND: "Sesi tidak ditemukan. Silakan masuk kembali.",
    INVALID_REFRESH_TOKEN: "Sesi tidak valid. Silakan masuk kembali.",
    INVALID_TOKEN: "Token tidak valid.",
    TOKEN_EXPIRED: "Sesi Anda sudah kedaluwarsa. Silakan masuk kembali.",
    EMAIL_ALREADY_EXISTS: "Email ini sudah terdaftar.",
    EMAIL_NOT_VERIFIED: "Email Anda belum diverifikasi. Silakan cek inbox Anda.",
    USER_NOT_FOUND: "Pengguna tidak ditemukan.",
    USER_ALREADY_VERIFIED: "Akun ini sudah diverifikasi.",
    INVALID_CREATE_ACCOUNT_TOKEN: "Tautan verifikasi tidak valid.",
    PLEASE_WAIT: "Harap tunggu sebentar lalu coba lagi.",
    FORGOT_PASSWORD_REQUEST_SUCCESS: "Permintaan reset password berhasil dikirim.",
    CHECK_FORGOT_PASSWORD_TOKEN_SUCCESS: "Tautan reset password valid.",
    INVALID_FORGOT_PASSWORD_TOKEN: "Tautan reset password tidak valid.",
    SUBMIT_FORGOT_PASSWORD_SUCCESS: "Password berhasil diperbarui.",
    UPDATE_PASSWORD_SUCCESS: "Password berhasil diperbarui.",
    PASSWORD_WRONG: "Password yang Anda masukkan salah.",
    PASSWORD_SAME: "Password baru tidak boleh sama dengan password saat ini.",
    UPDATE_PROFILE_SUCCESS: "Profil berhasil diperbarui.",
    GET_PROFILE_SUCCESS: "Profil berhasil dimuat.",
    RESEND_EMAIL_VERIFICATION_SUCCESS: "Email verifikasi berhasil dikirim ulang.",
    DIRECT_POST_NOT_AVAILABLE: "Fitur posting langsung belum tersedia.",
    DELETE_DRAFT_NOT_AVAILABLE: "Fitur hapus draft belum tersedia.",
    GET_IMAGE_POST_EMPTY: "Belum ada konten yang tersedia.",
    IMAGE_POST_ALREADY_SUCCESS_ON_PLATFORM: "Konten ini sudah berhasil dipublikasikan di platform tersebut.",
    PUBLISH_AT_MUST_NOT_BE_IN_THE_PAST: "Jadwal publikasi tidak boleh di waktu yang sudah lewat.",
    RSS_ONLY_ALLOWED_ON_FIRST_BUBBLE: "RSS hanya bisa digunakan pada bubble pertama.",
    GET_GENERATIVE_IMAGE_MODELS_SUCCESS: "Model gambar AI berhasil dimuat.",
    GET_GENERATIVE_TEXT_MODELS_SUCCESS: "Model teks AI berhasil dimuat.",
    PRODUCT_ADVANCED_FIELDS_LOCAL_DEFAULT: "Pengaturan lanjutan produk berhasil dimuat.",
    AUTO_GENERATE_PREFERENCE_LOCAL_ONLY: "Preferensi pengulangan konten berhasil dimuat.",
    SUBSCRIPTION_NOT_AVAILABLE: "Paket langganan belum tersedia.",
    SUBSCRIPTION_PRODUCT_NOT_AVAILABLE: "Produk langganan belum tersedia.",
    INSUFFICIENT_TOKEN: "Token Anda tidak mencukupi untuk melanjutkan.",
    PREMIUM_MODEL_NOT_ACCESSIBLE_FOR_BUSINESS:
      "Model premium belum bisa digunakan untuk bisnis ini.",
    CHECK_PRICE_SUCCESS: "Harga berhasil diperiksa.",
    PAYMENT_CREATED: "Pembayaran berhasil dibuat.",
    PAYMENT_CANCELED: "Pembayaran berhasil dibatalkan.",
    PAYMENT_CANNOT_BE_CANCELED: "Pembayaran ini tidak bisa dibatalkan.",
    PAYMENT_METHOD_NOT_FOUND: "Metode pembayaran tidak ditemukan.",
    PAYMENT_METHOD_CODE_ALREADY_EXISTS: "Kode metode pembayaran sudah digunakan.",
    CANNOT_USE_OWN_REFERRAL_CODE: "Anda tidak bisa menggunakan kode referral milik sendiri.",
    PROFILE_ALREADY_USED_REFERRAL_CODE: "Anda sudah pernah menggunakan kode referral.",
    REFERRAL_CODE_NOT_FOUND: "Kode referral tidak ditemukan.",
    MEMBER_ALREADY_EXISTS: "Anggota ini sudah ada di bisnis Anda.",
    MEMBER_ALREADY_PENDING: "Undangan untuk anggota ini masih menunggu respons.",
    MEMBER_ALREADY_ANSWERED: "Undangan anggota ini sudah dijawab.",
    MEMBER_ALREADY_KICKED: "Anggota ini sudah dikeluarkan.",
    SUCCESS_ADD_BUSINESS_MEMBER: "Anggota bisnis berhasil ditambahkan.",
    SUCCESS_INVITE_BUSINESS_MEMBER: "Undangan anggota bisnis berhasil dikirim.",
    SUCCESS_EDIT_BUSINESS_MEMBER: "Peran anggota bisnis berhasil diperbarui.",
    SUCCESS_RESEND_BUSINESS_MEMBER_INVITATION:
      "Undangan anggota bisnis berhasil dikirim ulang.",
    SUCCESS_VERIFY_BUSINESS_MEMBER: "Anggota bisnis berhasil diverifikasi.",
    SUCCESS_REMOVE_BUSINESS_MEMBER: "Anggota bisnis berhasil dihapus.",
    SUCCESS_ANSWER_BUSINESS_MEMBER_INVITATION:
      "Respons undangan anggota bisnis berhasil disimpan.",
    OWNER_CANNOT_EDITED: "Pemilik bisnis tidak dapat diubah.",
    OWNER_CANNOT_REMOVE_ITSELF: "Pemilik bisnis tidak dapat menghapus dirinya sendiri.",
    TIMEZONE_NOT_VALID: "Zona waktu yang dipilih tidak valid.",
    CONNECTED_PLATFORM_TEMP_CODE_ACCOUNT_NOT_FOUND:
      "Akun platform yang akan dihubungkan tidak ditemukan.",
    PLATFORM_SCOPES_NOT_FULFILLED:
      "Izin platform belum lengkap. Silakan hubungkan ulang akun Anda.",
    PLATFORM_CODE_ALREADY_EXISTS: "Platform ini sudah terhubung.",
    SOCIAL_PLATFORM_CREATED: "Platform sosial berhasil ditambahkan.",
    SOCIAL_PLATFORM_UPDATED: "Platform sosial berhasil diperbarui.",
    SOCIAL_PLATFORM_DELETED: "Platform sosial berhasil dihapus.",
    SUCCESS_CONNECT_PLATFORM: "Platform berhasil dihubungkan.",
    SUCCESS_GENERATE_CAPTION: "Caption berhasil dibuat.",
    SUCCESS_PRESIGN_UPLOAD_IMAGE: "Tautan upload gambar berhasil disiapkan.",
    SUCCESS_UPLOAD_IMAGE: "Gambar berhasil diunggah.",
  },
  en: {
    LOGIN_SUCCESS: "Logged in successfully.",
    REGISTER_SUCCESS: "Registration successful. Please check your email for verification.",
    LOGOUT_SUCCESS: "Logged out from this session.",
    LOGOUT_ALL_SUCCESS: "Logged out from all sessions.",
    REFRESH_TOKEN_SUCCESS: "Session refreshed successfully.",
    REFRESH_TOKEN_NOT_FOUND: "Session not found. Please sign in again.",
    INVALID_REFRESH_TOKEN: "Your session is invalid. Please sign in again.",
    INVALID_TOKEN: "Invalid token.",
    TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
    EMAIL_ALREADY_EXISTS: "This email is already registered.",
    EMAIL_NOT_VERIFIED: "Your email is not verified yet. Please check your inbox.",
    USER_NOT_FOUND: "User not found.",
    USER_ALREADY_VERIFIED: "This account is already verified.",
    INVALID_CREATE_ACCOUNT_TOKEN: "The verification link is invalid.",
    PLEASE_WAIT: "Please wait a moment and try again.",
    FORGOT_PASSWORD_REQUEST_SUCCESS: "Password reset request sent successfully.",
    CHECK_FORGOT_PASSWORD_TOKEN_SUCCESS: "The password reset link is valid.",
    INVALID_FORGOT_PASSWORD_TOKEN: "The password reset link is invalid.",
    SUBMIT_FORGOT_PASSWORD_SUCCESS: "Password updated successfully.",
    UPDATE_PASSWORD_SUCCESS: "Password updated successfully.",
    PASSWORD_WRONG: "The password you entered is incorrect.",
    PASSWORD_SAME: "The new password must be different from the current password.",
    UPDATE_PROFILE_SUCCESS: "Profile updated successfully.",
    GET_PROFILE_SUCCESS: "Profile loaded successfully.",
    RESEND_EMAIL_VERIFICATION_SUCCESS: "Verification email sent again successfully.",
    DIRECT_POST_NOT_AVAILABLE: "Direct posting is not available yet.",
    DELETE_DRAFT_NOT_AVAILABLE: "Deleting drafts is not available yet.",
    GET_IMAGE_POST_EMPTY: "No content is available yet.",
    IMAGE_POST_ALREADY_SUCCESS_ON_PLATFORM:
      "This content has already been published successfully on that platform.",
    PUBLISH_AT_MUST_NOT_BE_IN_THE_PAST: "The publish schedule cannot be set in the past.",
    RSS_ONLY_ALLOWED_ON_FIRST_BUBBLE: "RSS can only be used in the first bubble.",
    GET_GENERATIVE_IMAGE_MODELS_SUCCESS: "AI image models loaded successfully.",
    GET_GENERATIVE_TEXT_MODELS_SUCCESS: "AI text models loaded successfully.",
    PRODUCT_ADVANCED_FIELDS_LOCAL_DEFAULT: "Advanced product settings loaded successfully.",
    AUTO_GENERATE_PREFERENCE_LOCAL_ONLY: "Content repetition preferences loaded successfully.",
    SUBSCRIPTION_NOT_AVAILABLE: "Subscription plans are not available yet.",
    SUBSCRIPTION_PRODUCT_NOT_AVAILABLE: "Subscription products are not available yet.",
    INSUFFICIENT_TOKEN: "You do not have enough tokens to continue.",
    PREMIUM_MODEL_NOT_ACCESSIBLE_FOR_BUSINESS:
      "Premium models are not available for this business yet.",
    CHECK_PRICE_SUCCESS: "Price checked successfully.",
    PAYMENT_CREATED: "Payment created successfully.",
    PAYMENT_CANCELED: "Payment canceled successfully.",
    PAYMENT_CANNOT_BE_CANCELED: "This payment cannot be canceled.",
    PAYMENT_METHOD_NOT_FOUND: "Payment method not found.",
    PAYMENT_METHOD_CODE_ALREADY_EXISTS: "This payment method code is already in use.",
    CANNOT_USE_OWN_REFERRAL_CODE: "You cannot use your own referral code.",
    PROFILE_ALREADY_USED_REFERRAL_CODE: "You have already used a referral code.",
    REFERRAL_CODE_NOT_FOUND: "Referral code not found.",
    MEMBER_ALREADY_EXISTS: "This member is already in your business.",
    MEMBER_ALREADY_PENDING: "This member's invitation is still pending.",
    MEMBER_ALREADY_ANSWERED: "This member's invitation has already been answered.",
    MEMBER_ALREADY_KICKED: "This member has already been removed.",
    SUCCESS_ADD_BUSINESS_MEMBER: "Business member added successfully.",
    SUCCESS_INVITE_BUSINESS_MEMBER: "Business member invitation sent successfully.",
    SUCCESS_EDIT_BUSINESS_MEMBER: "Business member role updated successfully.",
    SUCCESS_RESEND_BUSINESS_MEMBER_INVITATION:
      "Business member invitation sent again successfully.",
    SUCCESS_VERIFY_BUSINESS_MEMBER: "Business member verified successfully.",
    SUCCESS_REMOVE_BUSINESS_MEMBER: "Business member removed successfully.",
    SUCCESS_ANSWER_BUSINESS_MEMBER_INVITATION:
      "Business member invitation response saved successfully.",
    OWNER_CANNOT_EDITED: "The business owner cannot be edited.",
    OWNER_CANNOT_REMOVE_ITSELF: "The business owner cannot remove themselves.",
    TIMEZONE_NOT_VALID: "The selected timezone is invalid.",
    CONNECTED_PLATFORM_TEMP_CODE_ACCOUNT_NOT_FOUND:
      "The platform account to connect could not be found.",
    PLATFORM_SCOPES_NOT_FULFILLED:
      "The platform permissions are incomplete. Please reconnect your account.",
    PLATFORM_CODE_ALREADY_EXISTS: "This platform is already connected.",
    SOCIAL_PLATFORM_CREATED: "Social platform added successfully.",
    SOCIAL_PLATFORM_UPDATED: "Social platform updated successfully.",
    SOCIAL_PLATFORM_DELETED: "Social platform removed successfully.",
    SUCCESS_CONNECT_PLATFORM: "Platform connected successfully.",
    SUCCESS_GENERATE_CAPTION: "Caption generated successfully.",
    SUCCESS_PRESIGN_UPLOAD_IMAGE: "Image upload link prepared successfully.",
    SUCCESS_UPLOAD_IMAGE: "Image uploaded successfully.",
  },
};

const SUBJECT_OVERRIDES: Record<string, Record<SupportedLocale, string>> = {
  APP_AVATAR: { id: "avatar aplikasi", en: "app avatar" },
  APP_AVATARS: { id: "avatar aplikasi", en: "app avatars" },
  BUSINESS: { id: "bisnis", en: "business" },
  BUSINESS_ACCESS_MANAGEMENT: { id: "akses bisnis", en: "business access" },
  BUSINESS_AVATAR: { id: "avatar bisnis", en: "business avatar" },
  BUSINESS_AVATARS: { id: "avatar bisnis", en: "business avatars" },
  BUSINESS_IMAGE_CONTENT: { id: "konten bisnis", en: "business content" },
  BUSINESS_IMAGE_CONTENTS: { id: "konten bisnis", en: "business content" },
  BUSINESS_INFORMATION: { id: "informasi bisnis", en: "business information" },
  BUSINESS_KNOWLEDGE: { id: "pengetahuan bisnis", en: "business knowledge" },
  BUSINESS_MANAGE: { id: "pengelolaan bisnis", en: "business workspace" },
  BUSINESS_MEMBER: { id: "anggota bisnis", en: "business member" },
  BUSINESS_MEMBERS: { id: "anggota bisnis", en: "business members" },
  BUSINESS_MEMBER_INVITATION: { id: "undangan anggota bisnis", en: "business member invitation" },
  BUSINESS_PRODUCT: { id: "produk bisnis", en: "business product" },
  BUSINESS_ROLE: { id: "peran bisnis", en: "business role" },
  BUSINESS_RSS_SUBSCRIPTION: { id: "langganan RSS bisnis", en: "business RSS subscription" },
  BUSINESS_TIMEZONE_PREF: { id: "preferensi zona waktu bisnis", en: "business timezone preference" },
  CHAT: { id: "chat", en: "chat" },
  CHATS: { id: "chat", en: "chats" },
  CONNECTED_PLATFORM: { id: "platform terhubung", en: "connected platform" },
  CONNECTED_PLATFORMS: { id: "platform terhubung", en: "connected platforms" },
  FINANCE_EXPENSE_TRANSACTION: { id: "transaksi pengeluaran", en: "expense transaction" },
  FINANCE_INCOME_TRANSACTION: { id: "transaksi pemasukan", en: "income transaction" },
  FINANCE_TRANSACTION: { id: "transaksi keuangan", en: "finance transaction" },
  IMAGE: { id: "gambar", en: "image" },
  IMAGE_POST: { id: "postingan", en: "post" },
  IMAGE_POST_REPETITION: { id: "jadwal pengulangan konten", en: "content repetition schedule" },
  IMAGE_POST_REPETITIONS: { id: "jadwal pengulangan konten", en: "content repetition schedules" },
  IMAGE_POST_SCHEDULE: { id: "jadwal postingan", en: "post schedule" },
  IMAGE_POST_SCHEDULES: { id: "jadwal postingan", en: "post schedules" },
  MEMBER: { id: "anggota", en: "member" },
  PAYMENT_METHOD: { id: "metode pembayaran", en: "payment method" },
  PAYMENT_METHODS: { id: "metode pembayaran", en: "payment methods" },
  PAYMENT_METHOD_TYPE: { id: "tipe metode pembayaran", en: "payment method type" },
  PAYMENT_METHOD_TYPES: { id: "tipe metode pembayaran", en: "payment method types" },
  PLATFORM: { id: "platform", en: "platform" },
  PRODUCT: { id: "produk", en: "product" },
  PROFILE: { id: "profil", en: "profile" },
  REFERRAL_RULE: { id: "aturan referral", en: "referral rule" },
  RSS_ARTICLE: { id: "artikel RSS", en: "RSS article" },
  RSS_CATEGORY: { id: "kategori RSS", en: "RSS category" },
  RSS_FEED: { id: "feed RSS", en: "RSS feed" },
  RSS_SUBSCRIPTION: { id: "langganan RSS", en: "RSS subscription" },
  SAVED_CREATOR_IMAGE: { id: "gambar tersimpan", en: "saved creator image" },
  SESSION: { id: "sesi", en: "session" },
  SESSION_LIST: { id: "daftar sesi", en: "session list" },
  SOCIAL_PLATFORM: { id: "platform sosial", en: "social platform" },
  SOCIAL_PLATFORMS: { id: "platform sosial", en: "social platforms" },
  TICKET_CATEGORY: { id: "kategori tiket", en: "ticket category" },
  TIMEZONE: { id: "zona waktu", en: "timezone" },
  TIMEZONE_PREF: { id: "preferensi zona waktu", en: "timezone preference" },
  TOKEN_PRODUCT: { id: "paket token", en: "token package" },
  TOKEN_PRODUCT_DETAIL: { id: "detail paket token", en: "token package details" },
  TOKEN_PRODUCTS: { id: "paket token", en: "token packages" },
  USER_MANAGE: { id: "manajemen pengguna", en: "user management" },
  WEBSITE_TICKET: { id: "tiket website", en: "website ticket" },
  WHATSAPP_CHAT: { id: "chat WhatsApp", en: "WhatsApp chat" },
  WHATSAPP_ROOM_CHAT: { id: "ruang chat WhatsApp", en: "WhatsApp room chat" },
  WHATSAPP_ROOM_CHAT_INFO: { id: "info ruang chat WhatsApp", en: "WhatsApp room chat info" },
  WHATSAPP_TICKET: { id: "tiket WhatsApp", en: "WhatsApp ticket" },
};

const WORD_OVERRIDES: Record<string, Record<SupportedLocale, string>> = {
  ACCESS: { id: "akses", en: "access" },
  ACCOUNT: { id: "akun", en: "account" },
  ADD: { id: "tambah", en: "add" },
  APP: { id: "aplikasi", en: "app" },
  AUTHORIZE: { id: "otorisasi", en: "authorize" },
  AVATAR: { id: "avatar", en: "avatar" },
  BASIC: { id: "ringkasan", en: "overview" },
  BLAST: { id: "blast", en: "blast" },
  BUSINESS: { id: "bisnis", en: "business" },
  CALCULATE: { id: "hitung", en: "calculate" },
  CATEGORY: { id: "kategori", en: "category" },
  CHAT: { id: "chat", en: "chat" },
  CONNECT: { id: "hubungkan", en: "connect" },
  CONNECTED: { id: "terhubung", en: "connected" },
  CONTENT: { id: "konten", en: "content" },
  CREATE: { id: "buat", en: "create" },
  CREATOR: { id: "creator", en: "creator" },
  DELETE: { id: "hapus", en: "delete" },
  DETAIL: { id: "detail", en: "details" },
  DIRECT: { id: "langsung", en: "direct" },
  EDIT: { id: "ubah", en: "edit" },
  FEED: { id: "feed", en: "feed" },
  FINANCE: { id: "keuangan", en: "finance" },
  GENERATE: { id: "generate", en: "generate" },
  GENERATIVE: { id: "AI", en: "AI" },
  GET: { id: "ambil", en: "get" },
  IMAGE: { id: "gambar", en: "image" },
  INFO: { id: "info", en: "info" },
  INVITATION: { id: "undangan", en: "invitation" },
  INVITE: { id: "undang", en: "invite" },
  KNOWLEDGE: { id: "pengetahuan", en: "knowledge" },
  LIST: { id: "daftar", en: "list" },
  MANAGE: { id: "pengelolaan", en: "management" },
  MEMBER: { id: "anggota", en: "member" },
  METHOD: { id: "metode", en: "method" },
  MODEL: { id: "model", en: "model" },
  OAUTH: { id: "OAuth", en: "OAuth" },
  OVERVIEW: { id: "ringkasan", en: "overview" },
  PAYMENT: { id: "pembayaran", en: "payment" },
  PLATFORM: { id: "platform", en: "platform" },
  POST: { id: "postingan", en: "post" },
  PREF: { id: "preferensi", en: "preference" },
  PRESIGN: { id: "tautan upload", en: "upload link" },
  PRODUCT: { id: "produk", en: "product" },
  PROFILE: { id: "profil", en: "profile" },
  REFERRAL: { id: "referral", en: "referral" },
  REMOVE: { id: "hapus", en: "remove" },
  REPLY: { id: "balasan", en: "reply" },
  RESEND: { id: "kirim ulang", en: "resend" },
  ROLE: { id: "peran", en: "role" },
  ROOM: { id: "ruang", en: "room" },
  RSS: { id: "RSS", en: "RSS" },
  SAVED: { id: "tersimpan", en: "saved" },
  SCHEDULE: { id: "jadwal", en: "schedule" },
  SESSION: { id: "sesi", en: "session" },
  SOCIAL: { id: "sosial", en: "social" },
  SUBSCRIPTION: { id: "langganan", en: "subscription" },
  TEXT: { id: "teks", en: "text" },
  TICKET: { id: "tiket", en: "ticket" },
  TIMEZONE: { id: "zona waktu", en: "timezone" },
  TOKEN: { id: "token", en: "token" },
  UPDATE: { id: "perbarui", en: "update" },
  UPLOAD: { id: "unggah", en: "upload" },
  UPSERT: { id: "simpan", en: "save" },
  USER: { id: "pengguna", en: "user" },
  VERIFY: { id: "verifikasi", en: "verify" },
  WEBSITE: { id: "website", en: "website" },
  WHATSAPP: { id: "WhatsApp", en: "WhatsApp" },
};

const ACTION_PATTERNS = [
  { kind: "prefix", token: "SUCCESS_CREATE_", action: "create" },
  { kind: "prefix", token: "SUCCESS_UPDATE_", action: "update" },
  { kind: "prefix", token: "SUCCESS_DELETE_", action: "delete" },
  { kind: "prefix", token: "SUCCESS_REMOVE_", action: "remove" },
  { kind: "prefix", token: "SUCCESS_EDIT_", action: "update" },
  { kind: "prefix", token: "SUCCESS_ADD_", action: "add" },
  { kind: "prefix", token: "SUCCESS_INVITE_", action: "invite" },
  { kind: "prefix", token: "SUCCESS_RESEND_", action: "resend" },
  { kind: "prefix", token: "SUCCESS_VERIFY_", action: "verify" },
  { kind: "prefix", token: "SUCCESS_CONNECT_", action: "connect" },
  { kind: "prefix", token: "SUCCESS_UPLOAD_", action: "upload" },
  { kind: "prefix", token: "SUCCESS_SEND_", action: "send" },
  { kind: "prefix", token: "SUCCESS_REPLY_", action: "reply" },
  { kind: "prefix", token: "SUCCESS_CHANGE_", action: "change" },
  { kind: "prefix", token: "SUCCESS_RESET_", action: "reset" },
  { kind: "prefix", token: "SUCCESS_UPSERT_", action: "save" },
  { kind: "prefix", token: "SUCCESS_PRESIGN_", action: "prepare" },
  { kind: "prefix", token: "SUCCESS_GENERATE_", action: "generate" },
  { kind: "prefix", token: "SUCCESS_DIRECT_POST_", action: "publish" },
  { kind: "prefix", token: "SUCCESS_GET_", action: "load" },
  { kind: "prefix", token: "SUCCESS_CALCULATE_", action: "calculate" },
  { kind: "suffix", token: "_CREATED", action: "create" },
  { kind: "suffix", token: "_UPDATED", action: "update" },
  { kind: "suffix", token: "_DELETED", action: "delete" },
  { kind: "suffix", token: "_RETRIEVED", action: "load" },
  { kind: "suffix", token: "_SUCCESS", action: "success" },
] as const;

const ERROR_PATTERNS = [
  { suffix: "_NOT_FOUND", action: "notFound" },
  { suffix: "_NOT_AVAILABLE", action: "notAvailable" },
  { suffix: "_ALREADY_EXISTS", action: "alreadyExists" },
  { suffix: "_ALREADY_PENDING", action: "alreadyPending" },
  { suffix: "_ALREADY_KICKED", action: "alreadyRemoved" },
  { prefix: "INVALID_", action: "invalid" },
] as const;

const localeText = {
  id: {
    create: (subject: string) => `${capitalize(subject)} berhasil dibuat.`,
    update: (subject: string) => `${capitalize(subject)} berhasil diperbarui.`,
    delete: (subject: string) => `${capitalize(subject)} berhasil dihapus.`,
    remove: (subject: string) => `${capitalize(subject)} berhasil dihapus.`,
    add: (subject: string) => `${capitalize(subject)} berhasil ditambahkan.`,
    invite: (subject: string) => `Undangan untuk ${subject} berhasil dikirim.`,
    resend: (subject: string) => `Permintaan ${subject} berhasil dikirim ulang.`,
    verify: (subject: string) => `${capitalize(subject)} berhasil diverifikasi.`,
    connect: (subject: string) => `${capitalize(subject)} berhasil dihubungkan.`,
    upload: (subject: string) => `${capitalize(subject)} berhasil diunggah.`,
    send: (subject: string) => `${capitalize(subject)} berhasil dikirim.`,
    reply: (subject: string) => `Balasan untuk ${subject} berhasil dikirim.`,
    change: (subject: string) => `${capitalize(subject)} berhasil diubah.`,
    reset: (subject: string) => `${capitalize(subject)} berhasil direset.`,
    save: (subject: string) => `${capitalize(subject)} berhasil disimpan.`,
    prepare: (subject: string) => `${capitalize(subject)} berhasil disiapkan.`,
    generate: (subject: string) => `${capitalize(subject)} berhasil dibuat.`,
    publish: (subject: string) => `${capitalize(subject)} berhasil dipublikasikan.`,
    load: (subject: string) => `${capitalize(subject)} berhasil dimuat.`,
    calculate: (subject: string) => `${capitalize(subject)} berhasil dihitung.`,
    success: (subject: string) => `${capitalize(subject)} berhasil.`,
    invalid: (subject: string) => `${capitalize(subject)} tidak valid.`,
    notFound: (subject: string) => `${capitalize(subject)} tidak ditemukan.`,
    notAvailable: (subject: string) => `${capitalize(subject)} belum tersedia.`,
    alreadyExists: (subject: string) => `${capitalize(subject)} sudah ada.`,
    alreadyPending: (subject: string) => `${capitalize(subject)} masih menunggu proses.`,
    alreadyRemoved: (subject: string) => `${capitalize(subject)} sudah dihapus.`,
  },
  en: {
    create: (subject: string) => `${capitalize(subject)} created successfully.`,
    update: (subject: string) => `${capitalize(subject)} updated successfully.`,
    delete: (subject: string) => `${capitalize(subject)} deleted successfully.`,
    remove: (subject: string) => `${capitalize(subject)} removed successfully.`,
    add: (subject: string) => `${capitalize(subject)} added successfully.`,
    invite: (subject: string) => `Invitation for ${subject} sent successfully.`,
    resend: (subject: string) => `${capitalize(subject)} sent again successfully.`,
    verify: (subject: string) => `${capitalize(subject)} verified successfully.`,
    connect: (subject: string) => `${capitalize(subject)} connected successfully.`,
    upload: (subject: string) => `${capitalize(subject)} uploaded successfully.`,
    send: (subject: string) => `${capitalize(subject)} sent successfully.`,
    reply: (subject: string) => `Reply for ${subject} sent successfully.`,
    change: (subject: string) => `${capitalize(subject)} changed successfully.`,
    reset: (subject: string) => `${capitalize(subject)} reset successfully.`,
    save: (subject: string) => `${capitalize(subject)} saved successfully.`,
    prepare: (subject: string) => `${capitalize(subject)} prepared successfully.`,
    generate: (subject: string) => `${capitalize(subject)} generated successfully.`,
    publish: (subject: string) => `${capitalize(subject)} published successfully.`,
    load: (subject: string) => `${capitalize(subject)} loaded successfully.`,
    calculate: (subject: string) => `${capitalize(subject)} calculated successfully.`,
    success: (subject: string) => `${capitalize(subject)} completed successfully.`,
    invalid: (subject: string) => `Invalid ${subject}.`,
    notFound: (subject: string) => `${capitalize(subject)} not found.`,
    notAvailable: (subject: string) => `${capitalize(subject)} is not available yet.`,
    alreadyExists: (subject: string) => `${capitalize(subject)} already exists.`,
    alreadyPending: (subject: string) => `${capitalize(subject)} is already pending.`,
    alreadyRemoved: (subject: string) => `${capitalize(subject)} has already been removed.`,
  },
} as const;

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const normalizeLocale = (value?: string | null): SupportedLocale => {
  if (!value) return DEFAULT_LOCALE;
  return value.toLowerCase().startsWith("en") ? "en" : "id";
};

const getLocaleFromPathname = (): SupportedLocale | null => {
  if (typeof window === "undefined") return null;

  const [, firstSegment] = window.location.pathname.split("/");
  if (!firstSegment) return null;

  if (firstSegment === "id" || firstSegment === "en") {
    return firstSegment;
  }

  return null;
};

const getLocaleFromDocument = (): SupportedLocale => {
  const localeFromPathname = getLocaleFromPathname();
  if (localeFromPathname) return localeFromPathname;

  if (typeof document === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(document.documentElement.lang);
};

const isApiResponseCode = (message: string) =>
  /^[A-Z0-9_]+$/.test(message) && message.includes("_");

const formatSubject = (subjectCode: string, locale: SupportedLocale) => {
  const exact = SUBJECT_OVERRIDES[subjectCode]?.[locale];
  if (exact) return exact;

  return subjectCode
    .split("_")
    .map((part) => WORD_OVERRIDES[part]?.[locale] ?? part.toLowerCase())
    .join(" ");
};

const matchActionPattern = (code: string) => {
  for (const pattern of ACTION_PATTERNS) {
    if (pattern.kind === "prefix" && code.startsWith(pattern.token)) {
      return {
        action: pattern.action,
        subject: code.slice(pattern.token.length),
      };
    }

    if (pattern.kind === "suffix" && code.endsWith(pattern.token)) {
      return {
        action: pattern.action,
        subject: code.slice(0, -pattern.token.length),
      };
    }
  }

  return null;
};

const matchErrorPattern = (code: string) => {
  for (const pattern of ERROR_PATTERNS) {
    if ("prefix" in pattern && code.startsWith(pattern.prefix)) {
      return {
        action: pattern.action,
        subject: code.slice(pattern.prefix.length),
      };
    }

    if ("suffix" in pattern && code.endsWith(pattern.suffix)) {
      return {
        action: pattern.action,
        subject: code.slice(0, -pattern.suffix.length),
      };
    }
  }

  return null;
};

export const getToastLocale = () => getLocaleFromDocument();

export const translateApiResponseMessage = (
  message: string,
  locale = getLocaleFromDocument()
) => {
  const normalizedMessage = message.trim();
  if (!isApiResponseCode(normalizedMessage)) {
    return message;
  }

  const activeLocale = normalizeLocale(locale);
  const exact = EXACT_MESSAGES[activeLocale][normalizedMessage];
  if (exact) {
    return exact;
  }

  const actionMatch = matchActionPattern(normalizedMessage);
  if (actionMatch?.subject) {
    const subject = formatSubject(actionMatch.subject, activeLocale);
    return localeText[activeLocale][actionMatch.action](subject);
  }

  const errorMatch = matchErrorPattern(normalizedMessage);
  if (errorMatch?.subject) {
    const subject = formatSubject(errorMatch.subject, activeLocale);
    return localeText[activeLocale][errorMatch.action](subject);
  }

  return capitalize(formatSubject(normalizedMessage, activeLocale));
};
