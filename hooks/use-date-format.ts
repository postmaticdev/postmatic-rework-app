import { useLocale } from "next-intl";
import { formatDateByLocale } from "@/helper/date-format";

export const useDateFormat = () => {
  const locale = useLocale();
  
  const formatDate = (date: Date) => {
    return formatDateByLocale(date, locale);
  };
  
  return { formatDate };
};
