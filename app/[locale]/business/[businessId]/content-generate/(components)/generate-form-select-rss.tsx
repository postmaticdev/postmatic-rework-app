import { NoContent } from "@/components/base/no-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { PaginationWithControls } from "@/components/ui/pagination-with-controls";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useContentGenerate } from "@/contexts/content-generate-context";
import { useDateFormat } from "@/hooks/use-date-format";
import { dateFormat } from "@/helper/date-format";
import { useRssKnowledgeGetById } from "@/services/knowledge.api";
import { ChartNoAxesCombined } from "lucide-react";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export const GenerateFormSelectRss = () => {
  const { businessId } = useParams() as { businessId: string };
  const { formatDate } = useDateFormat();
  const { data: rssData } = useRssKnowledgeGetById(businessId, {
    sortBy: "title",
    sort: "asc",
  });

  const rssKnowledges = rssData?.data.data || [];
  
  const t = useTranslations("generationPanel");
  const { rss, form, isLoading } = useContentGenerate();
  const router = useRouter();
  if (form.rss) return null;

  const handleNavigateToRssModal = () => {
    router.push(
      `/business/${businessId}/knowledge-base?openRssModal=true#rss-trend-section`
    );
  };
  const handleNavigateToRss = () => {
    router.push(`/business/${businessId}/knowledge-base#rss-trend-section`);
  };
  return (
    <>
      {rss.articles.length === 0 && rssKnowledges.length === 0 ? (
        <NoContent
          icon={ChartNoAxesCombined}
          title={t("noRssArticleFound")}
          titleDescription={t("addRssFirst")}
          buttonText={t("addRss")}
          onButtonClick={handleNavigateToRssModal}
        />
      ) : (
        rssKnowledges.length >= 0 &&
        rss.articles.length === 0 && (
          <NoContent
            icon={ChartNoAxesCombined}
            title={t("noRssArticleFound2")}
            titleDescription={t("addRssFirst2")}
            buttonText={t("addRss2")}
            onButtonClick={handleNavigateToRss}
          />
        )
      )}

      {rss.articles.length !== 0 && rssKnowledges.length !== 0 && (
        <PaginationWithControls
          currData={rss.articles.length}
          pagination={rss.pagination}
          setFilterQuery={rss.setFilterQuery}
          showSort={false}
          filterQuery={rss.filterQuery}
          className="mb-4"
        />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rss.articles.map((article, index) => (
          <Card
            key={`${article?.imageUrl}:${index}`}
            className="p-4 hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              {/* Article Image */}
              <div className="w-full h-48 rounded-lg overflow-hidden relative">
                <Image
                  src={article.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>

              {/* Article Content */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm line-clamp-2 leading-relaxed flex-1 pr-2 ">
                  {article.title}
                </h3>
                <span className="text-xs mb-1 text-muted-foreground whitespace-nowrap">
                  {formatDate(new Date(article.publishedAt))}{" "}
                  {dateFormat.getHhMm(new Date(article.publishedAt))}
                </span>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {article.summary}
                </p>
              </div>

              {/* Use Button */}
              <Button
                onClick={() =>
                  form.onRssSelect({
                    imageUrl: article.imageUrl,
                    publishedAt: article.publishedAt,
                    publisher: article.publisher,
                    summary: article.summary,
                    title: article.title,
                    url: article.url,
                  })
                }
                disabled={!!form.rss || isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm py-2 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              >
                {t("use")}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {rss.articles.length !== 0 && rssKnowledges.length !== 0 && (
        <PaginationControls
          pagination={rss.pagination}
          setFilterQuery={rss.setFilterQuery}
          filterQuery={rss.filterQuery}
        />
      )}
    </>
  );
};
