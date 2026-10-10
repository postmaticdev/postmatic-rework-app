import { redirect } from "@/i18n/navigation";

interface Params {
  params: Promise<{
    locale: string;
    businessId: string;
  }>;
}
export default async function BusinessPage({ params }: Params) {
  const { locale, businessId } = await params;
  redirect({ href: `/business/${businessId}/settings`, locale });
}
