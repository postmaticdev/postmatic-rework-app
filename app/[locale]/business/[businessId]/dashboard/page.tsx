import { redirect } from "@/i18n/navigation";

interface Params {
  params: Promise<{
    locale: string;
    businessId: string;
  }>;
}

// Redirect langsung ke path ber-locale agar tidak ada redirect kedua dari middleware.
export default async function DashboardPage({ params }: Params) {
  const { locale, businessId } = await params;
  redirect({ href: `/business/${businessId}/settings`, locale });
}
