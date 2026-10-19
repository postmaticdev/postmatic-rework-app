import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface SearchNotFoundProps {
  /** Optional hint appended to the default text, e.g. "or add a new product". */
  description?: string;
}

export function SearchNotFound({ description }: SearchNotFoundProps) {
  const t = useTranslations("searchNotFound");
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Search className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">
        {t("title")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {description?.trim()
          ? t("descriptionWithHint", { hint: description.trim() })
          : t("descriptionDefault")}
      </p>
    </div>
  );
}
