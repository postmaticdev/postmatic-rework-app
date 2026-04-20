import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

interface SearchNotFoundProps {
  description: string;
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
       {t("description")} {description}  
      </p>
    </div>
  );
}
