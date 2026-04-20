import { useState } from "react";
import type { SyntheticEvent, MouseEvent, KeyboardEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronRight, RefreshCcw } from "lucide-react";
import { useAutoGenerate } from "@/contexts/auto-generate-context";
import { GenerateContentAdvanceBase } from "@/models/api/content/image.type";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

type BK = GenerateContentAdvanceBase["businessKnowledge"];
type PK = GenerateContentAdvanceBase["productKnowledge"];
type RK = GenerateContentAdvanceBase["roleKnowledge"];

export const AutoGenerateFormAdvanced = () => {
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [businessKnowledgeExpanded, setBusinessKnowledgeExpanded] =
    useState(false);
  const [productKnowledgeExpanded, setProductKnowledgeExpanded] =
    useState(false);
  const [roleKnowledgeExpanded, setRoleKnowledgeExpanded] = useState(false);

  const { form, isLoading, onResetAdvance } = useAutoGenerate();
  const { advance, setAdvance, enabledAdvance } = form;
  const { businessKnowledge, productKnowledge, roleKnowledge } = advance;
  const t = useTranslations("generationPanel");

  const BUSINESS_OPTIONS: {
    key: keyof BK;
    label: string;
    enabled: boolean;
  }[] = [
    {
      key: "name",
      label: t("namaBisnis"),
      enabled: enabledAdvance?.businessKnowledge?.name && !isLoading,
    },
    {
      key: "category",
      label: t("kategori"),
      enabled: enabledAdvance?.businessKnowledge?.category && !isLoading,
    },
    {
      key: "description",
      label: t("deskripsi"),
      enabled: enabledAdvance?.businessKnowledge?.description && !isLoading,
    },
    {
      key: "location",
      label: t("lokasi"),
      enabled: enabledAdvance?.businessKnowledge?.location && !isLoading,
    },
    {
      key: "uniqueSellingPoint",
      label: t("keunggulanUSP"),
      enabled:
        enabledAdvance?.businessKnowledge?.uniqueSellingPoint && !isLoading,
    },
    {
      key: "website",
      label: t("website"),
      enabled: enabledAdvance?.businessKnowledge?.website && !isLoading,
    },
    {
      key: "visionMission",
      label: t("visiMisi"),
      enabled: enabledAdvance?.businessKnowledge?.visionMission && !isLoading,
    },
    {
      key: "logo",
      label: t("logo"),
      enabled: enabledAdvance?.businessKnowledge?.logo && !isLoading,
    },
    {
      key: "colorTone",
      label: t("colorTone"),
      enabled: enabledAdvance?.businessKnowledge?.colorTone && !isLoading,
    },
  ];

  const PRODUCT_OPTIONS: { key: keyof PK; label: string; enabled: boolean }[] =
    [
      {
        key: "name",
        label: t("namaProduk"),
        enabled: enabledAdvance?.productKnowledge?.name && !isLoading,
      },
      {
        key: "category",
        label: t("kategori"),
        enabled: enabledAdvance?.productKnowledge?.category && !isLoading,
      },
      {
        key: "description",
        label: t("deskripsi"),
        enabled: enabledAdvance?.productKnowledge?.description && !isLoading,
      },
      {
        key: "price",
          label: t("harga"),
        enabled: enabledAdvance?.productKnowledge?.price && !isLoading,
      },
    ];

  const ROLE_OPTIONS: { key: keyof RK; label: string; enabled: boolean }[] = [
    {
      key: "hashtags",
      label: t("hashtag"),
      enabled: enabledAdvance?.roleKnowledge?.hashtags && !isLoading,
    },
  ];

  const toggleBusiness = (key: keyof BK, enabled: boolean) => {
    if (!enabled) return;
    setAdvance({
      ...advance,
      businessKnowledge: {
        ...advance.businessKnowledge,
        [key]: !advance.businessKnowledge[key],
      },
    });
  };

  const toggleProduct = (key: keyof PK, enabled: boolean) => {
    if (!enabled) return;
    setAdvance({
      ...advance,
      productKnowledge: {
        ...advance.productKnowledge,
        [key]: !advance.productKnowledge[key],
      },
    });
  };

  const toggleRole = (key: keyof RK, enabled: boolean) => {
    if (!enabled) return;
    setAdvance({
      ...advance,
      roleKnowledge: {
        ...advance.roleKnowledge,
        [key]: !advance.roleKnowledge[key],
      },
    });
  };

  // Blok interaksi saat tidak enabled (mencegah toggle visual sebelum re-render)
  const blockIfDisabled = (
    enabled: boolean,
    e: SyntheticEvent | MouseEvent | KeyboardEvent
  ) => {
    if (enabled) return false;
    e.preventDefault();
    e.stopPropagation();
    return true;
  };

  return (
    <div className=" ">
      <button
        onClick={() => setAdvancedExpanded(!advancedExpanded)}
        className="w-full flex items-center gap-1 mb-2"
      >
        {/* Garis horizontal */}
        <div className="flex-1 h-[2px] bg-border" />

        {/* Teks + Chevron */}
        <div className="flex items-center gap-1 p-3 rounded-sm hover:bg-accent">
          <span className="text-sm text-muted-foreground hover:text-foreground font-medium">
            {t("advanced")}
          </span>
          {advancedExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {advancedExpanded && (
        <div className="pb-3 space-y-4">
          {/* Business Knowledge */}
          <div className="border rounded-sm bg-background-secondary">
            <button
              onClick={() => setBusinessKnowledgeExpanded((s) => !s)}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <span className="text-sm">{t("businessKnowledge")}</span>
              {businessKnowledgeExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {businessKnowledgeExpanded && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BUSINESS_OPTIONS.map(({ key, label, enabled }) => {
                    const checked = businessKnowledge[key];
                    const base = "transition-colors";
                    const state = checked
                      ? "ring-2 ring-primary bg-accent"
                      : "";
                    const interact = enabled
                      ? "cursor-pointer hover:bg-accent"
                      : "opacity-50 cursor-not-allowed hover:bg-transparent";
                    return (
                      <Card
                        key={key}
                        className={`${base} ${state} ${interact}`}
                        aria-disabled={!enabled}
                        onClick={(e) => {
                          if (blockIfDisabled(enabled, e)) return;
                          toggleBusiness(key, enabled);
                        }}
                      >
                        <CardContent className="flex items-center space-x-3 p-4">
                          <input
                            id={`bk-${key}`}
                            type="checkbox"
                            checked={checked}
                            disabled={!enabled}
                            onMouseDown={(e) => blockIfDisabled(enabled, e)}
                            onKeyDown={(e) => {
                              // space/enter
                              if (
                                !enabled &&
                                ((e as KeyboardEvent).key === " " ||
                                  (e as KeyboardEvent).key === "Enter")
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onChange={(e) => {
                              if (blockIfDisabled(enabled, e)) return;
                              toggleBusiness(key, enabled);
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label
                            htmlFor={`bk-${key}`}
                            className="text-sm font-medium"
                            onMouseDown={(e) => blockIfDisabled(enabled, e)}
                            onClick={(e) => blockIfDisabled(enabled, e)}
                          >
                            {label}
                          </label>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Product Knowledge */}
          <div className="border rounded-sm bg-background-secondary">
            <button
              onClick={() => setProductKnowledgeExpanded((s) => !s)}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <span className="text-sm">{t("productKnowledge")}</span>
              {productKnowledgeExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {productKnowledgeExpanded && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {PRODUCT_OPTIONS.map(({ key, label, enabled }) => {
                    const checked = productKnowledge[key];
                    const base = "transition-colors";
                    const state = checked
                      ? "ring-2 ring-primary bg-accent"
                      : "";
                    const interact = enabled
                      ? "cursor-pointer hover:bg-accent"
                      : "opacity-50 cursor-not-allowed hover:bg-transparent";
                    return (
                      <Card
                        key={key}
                        className={`${base} ${state} ${interact}`}
                        aria-disabled={!enabled || isLoading}
                        onClick={(e) => {
                          if (blockIfDisabled(enabled, e)) return;
                          toggleProduct(key, enabled);
                        }}
                      >
                        <CardContent className="flex items-center space-x-3 p-4">
                          <input
                            id={`pk-${key}`}
                            type="checkbox"
                            checked={checked}
                            disabled={!enabled || isLoading}
                            onMouseDown={(e) => blockIfDisabled(enabled, e)}
                            onKeyDown={(e) => {
                              if (
                                !enabled &&
                                ((e as KeyboardEvent).key === " " ||
                                  (e as KeyboardEvent).key === "Enter")
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onChange={(e) => {
                              if (blockIfDisabled(enabled, e)) return;
                              toggleProduct(key, enabled);
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label
                            htmlFor={`pk-${key}`}
                            className="text-sm font-medium"
                            onMouseDown={(e) => blockIfDisabled(enabled, e)}
                            onClick={(e) => blockIfDisabled(enabled, e)}
                          >
                            {label}
                          </label>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Role Knowledge */}
          <div className="border rounded-sm bg-background-secondary">
            <button
              onClick={() => setRoleKnowledgeExpanded((s) => !s)}
              className="w-full px-3 py-2 flex items-center justify-between text-left"
            >
              <span className="text-sm">{t("roleKnowledge")}</span>
              {roleKnowledgeExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {roleKnowledgeExpanded && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ROLE_OPTIONS.map(({ key, label, enabled }) => {
                    const checked = roleKnowledge[key];
                    const base = "transition-colors";
                    const state = checked
                      ? "ring-2 ring-primary bg-accent"
                      : "";
                    const interact = enabled
                      ? "cursor-pointer hover:bg-accent"
                      : "opacity-50 cursor-not-allowed hover:bg-transparent";
                    return (
                      <Card
                        key={key}
                        className={`${base} ${state} ${interact}`}
                        aria-disabled={!enabled || isLoading}
                        onClick={(e) => {
                          if (blockIfDisabled(enabled, e)) return;
                          toggleRole(key, enabled);
                        }}
                      >
                        <CardContent className="flex items-center space-x-3 p-4">
                          <input
                            id={`rk-${key}`}
                            type="checkbox"
                            checked={checked}
                            disabled={!enabled || isLoading}
                            onMouseDown={(e) => blockIfDisabled(enabled, e)}
                            onKeyDown={(e) => {
                              if (
                                !enabled &&
                                ((e as KeyboardEvent).key === " " ||
                                  (e as KeyboardEvent).key === "Enter")
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                              }
                            }}
                            onChange={(e) => {
                              if (blockIfDisabled(enabled, e)) return;
                              toggleRole(key, enabled);
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <label
                            htmlFor={`rk-${key}`}
                            className="text-sm font-medium"
                            onMouseDown={(e) => blockIfDisabled(enabled, e)}
                            onClick={(e) => blockIfDisabled(enabled, e)}
                          >
                            {label}
                          </label>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={onResetAdvance}>
              <RefreshCcw className="h-4 w-4" />
              {t("reset")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
