import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface SelectedArticleRssProps {
  onChangeArticle: () => void;
}

export const SelectedArticleRss = ({ onChangeArticle }: SelectedArticleRssProps) => {
  const { form, isLoading } = useContentGenerate();
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("generationPanel");
  if (!form?.rss) return null;
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex gap-2 flex-row">
          <div className="h-14 w-14 bg-gray-100 rounded-lg overflow-hidden relative flex-shrink-0">
            <Image
              src={form.rss.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
              alt={form.rss.title}
              fill
              className="object-cover"
            />
          </div>
          <div>
          <h3 className="font-medium text-sm">{form.rss.title}</h3>
          <div className="relative">
            <p className={`text-xs text-muted-foreground mt-1 ${!expanded ? "line-clamp-1" : ""}`}>
              {form.rss.summary}
            </p>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs  mt-1 flex items-center"
            >
              {expanded ? (
                <>
                  {t("showShort")} <ChevronUp className="h-3 w-3 ml-1" />
                </>
              ) : (
                <>
                  {t("showLong")} <ChevronDown className="h-3 w-3 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onChangeArticle}
            disabled={isLoading}
          >
            {t("changeArticle")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={() => form.onRssSelect(null)}
            disabled={isLoading}
            aria-label="Remove article selection"
            title="Remove article selection"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Link href={form.rss.url} prefetch={false} target="_blank">
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600 text-white text-xs"
            >
              {t("visitSource")}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
