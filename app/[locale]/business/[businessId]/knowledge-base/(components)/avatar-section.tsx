"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Search, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { NoContent } from "@/components/base/no-content";
import { SearchNotFound } from "@/components/base/search-not-found";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { useAppAvatarGetAll } from "@/services/app-avatar.api";

export function AvatarSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const t = useTranslations("avatarKnowledge");
  const { data, isLoading, isError } = useAppAvatarGetAll({
    limit: 100,
    page: 1,
    sortBy: "name",
    sort: "asc",
  });

  const avatars = useMemo(() => data?.data.data || [], [data?.data.data]);
  const filteredAvatars = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return avatars;

    return avatars.filter((avatar) =>
      avatar.name.toLowerCase().includes(normalizedQuery)
    );
  }, [avatars, searchQuery]);

  return (
    <Card className="h-full w-full">
      <CardContent className="py-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {t("title")}
            </h2>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="bg-background pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("loading")}</span>
            </div>
          ) : isError ? (
            <NoContent
              icon={UserRound}
              title={t("errorTitle")}
              titleDescription={t("errorDescription")}
            />
          ) : avatars.length === 0 ? (
            <NoContent
              icon={UserRound}
              title={t("notAvailable")}
              titleDescription={t("notAvailableDescription")}
            />
          ) : filteredAvatars.length === 0 ? (
            <SearchNotFound description={t("searchEmptyDescription")} />
          ) : (
            <div
              className={`space-y-3 ${
                filteredAvatars.length > 3 ? "max-h-[300px] overflow-y-auto" : ""
              }`}
            >
              {filteredAvatars.map((avatar) => (
                <Card key={avatar.id} className="bg-background-secondary">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={avatar.imageUrl || DEFAULT_PLACEHOLDER_IMAGE}
                          alt={avatar.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="line-clamp-1 text-sm font-medium text-foreground sm:text-base">
                              {avatar.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {t("sourceValue")}
                            </p>
                          </div>

                          <Badge
                            variant={avatar.isActive ? "default" : "secondary"}
                            className={
                              avatar.isActive
                                ? "border-primary/20 bg-primary/10 text-primary hover:bg-primary/10"
                                : "border-border bg-muted text-muted-foreground hover:bg-muted"
                            }
                          >
                            {avatar.isActive ? t("active") : t("inactive")}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {t("idLabel")}: #{avatar.id}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
