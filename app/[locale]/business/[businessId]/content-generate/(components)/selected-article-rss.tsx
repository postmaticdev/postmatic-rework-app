import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
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

        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={onChangeArticle}
            disabled={isLoading}
          >
            {t("changeArticle")}
          </Button>
          <Link href={form.rss.url} prefetch={false} target="_blank" className="flex-1">
            <Button
              size="sm"
              className="w-full bg-blue-500 text-xs text-white hover:bg-blue-600"
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
