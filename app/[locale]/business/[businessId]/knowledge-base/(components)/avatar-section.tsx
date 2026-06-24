"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  Edit,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { NoContent } from "@/components/base/no-content";
import { SearchNotFound } from "@/components/base/search-not-found";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_PLACEHOLDER_IMAGE } from "@/constants";
import { showToast } from "@/helper/show-toast";
import {
  getApiValidationErrors,
  getFirstValidationMessage,
} from "@/helper/api-validation";
import { useRole } from "@/contexts/role-context";
import {
  BusinessAvatarPld,
  BusinessAvatarRes,
} from "@/models/api/knowledge/avatar.type";
import {
  useBusinessAvatarCreate,
  useBusinessAvatarDelete,
  useBusinessAvatarGetAll,
  useBusinessAvatarUpdate,
} from "@/services/knowledge.api";
import { useAvatarKnowledgeSchema } from "@/validator/new-business";
import { AvatarModal } from "./avatar-modal";

const initialAvatar: BusinessAvatarPld & { id?: string } = {
  name: "",
  imageUrl: "",
  id: "",
};

const AVATAR_VALIDATION_FIELD_MAP = {
  imageUrl: "imageUrl",
  name: "name",
} as const;

export function AvatarSection() {
  const { businessId } = useParams() as { businessId: string };
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedAvatar, setSelectedAvatar] = useState<
    BusinessAvatarPld & { id?: string }
  >(initialAvatar);
  const [avatarToDelete, setAvatarToDelete] =
    useState<BusinessAvatarRes | null>(null);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, string>>({});

  const t = useTranslations("avatarKnowledge");
  const e = useTranslations("errors");
  const avatarKnowledgeSchema = useAvatarKnowledgeSchema();
  const { access } = useRole();
  const { businessKnowledge } = access;

  const { data, isLoading, isError } = useBusinessAvatarGetAll(businessId, {
    limit: 100,
    page: 1,
    sortBy: "name",
    sort: "asc",
    search: searchQuery,
  });

  const mBusinessAvatarCreate = useBusinessAvatarCreate();
  const mBusinessAvatarUpdate = useBusinessAvatarUpdate();
  const mBusinessAvatarDelete = useBusinessAvatarDelete();

  const avatars = data?.data.data || [];

  const handleAddAvatar = () => {
    setModalMode("add");
    setSelectedAvatar(initialAvatar);
    setAvatarErrors({});
    setIsModalOpen(true);
  };

  const handleEditAvatar = (avatar: BusinessAvatarRes) => {
    setModalMode("edit");
    setSelectedAvatar({
      id: avatar.id,
      name: avatar.name,
      imageUrl: avatar.imageUrl,
    });
    setAvatarErrors({});
    setIsModalOpen(true);
  };

  const handleSaveAvatar = async (
    avatarData: BusinessAvatarPld & { id?: string }
  ) => {
    try {
      const result = avatarKnowledgeSchema.safeParse(avatarData);
      if (!result.success) {
        const validationErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          validationErrors[issue.path[0] as string] = issue.message;
        });
        setAvatarErrors(validationErrors);
        throw new Error(e("formValidation"));
      }

      setAvatarErrors({});

      if (avatarData.id) {
        const res = await mBusinessAvatarUpdate.mutateAsync({
          businessId,
          avatarId: avatarData.id,
          formData: {
            name: avatarData.name,
            imageUrl: avatarData.imageUrl,
          },
        });
        showToast("success", res.data.responseMessage || t("saveSuccess"));
      } else {
        const res = await mBusinessAvatarCreate.mutateAsync({
          businessId,
          formData: {
            name: avatarData.name,
            imageUrl: avatarData.imageUrl,
          },
        });
        showToast("success", res.data.responseMessage || t("saveSuccess"));
      }

      setIsModalOpen(false);
    } catch (error) {
      if (error instanceof Error && error.message === e("formValidation")) {
        return;
      }

      const apiValidationErrors = getApiValidationErrors(
        error,
        AVATAR_VALIDATION_FIELD_MAP
      );
      if (Object.keys(apiValidationErrors).length) {
        setAvatarErrors(apiValidationErrors);
        showToast(
          "error",
          getFirstValidationMessage(apiValidationErrors) || e("formValidation")
        );
        return;
      }

      showToast("error", t("saveFailed"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!avatarToDelete?.id) {
      showToast("error", t("idNotFound"));
      return;
    }

    try {
      const res = await mBusinessAvatarDelete.mutateAsync({
        businessId,
        avatarId: avatarToDelete.id,
      });
      showToast("success", res.data.responseMessage || t("deleteSuccess"));
      setAvatarToDelete(null);
    } catch {
      showToast("error", t("deleteFailed"));
    }
  };

  return (
    <>
      <Card className="h-full w-full">
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("title")}
              </h2>

              <div className="flex flex-col gap-3 sm:flex-row">
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

                {businessKnowledge.write && (
                  <Button
                    className="whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700"
                    onClick={handleAddAvatar}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addAvatar")}
                  </Button>
                )}
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
            ) : avatars.length === 0 && searchQuery === "" ? (
              <NoContent
                icon={UserRound}
                title={t("notAvailable")}
                titleDescription={t("notAvailableDescription")}
              />
            ) : avatars.length === 0 ? (
              <SearchNotFound description={t("searchEmptyDescription")} />
            ) : (
              <div
                className={`space-y-3 ${
                  avatars.length > 3 ? "max-h-[300px] overflow-y-auto" : ""
                }`}
              >
                {avatars.map((avatar) => (
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

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <h3 className="line-clamp-1 text-sm font-medium text-foreground sm:text-base">
                                {avatar.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {t("sourceValue")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t("idLabel")}: #{avatar.id}
                              </p>
                            </div>

                            {businessKnowledge.write && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditAvatar(avatar)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t("edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setAvatarToDelete(avatar)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t("delete")}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
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

      <AvatarModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAvatarErrors({});
        }}
        onSave={handleSaveAvatar}
        mode={modalMode}
        formValue={selectedAvatar}
        onChange={setSelectedAvatar}
        errors={avatarErrors}
      />

      <DeleteConfirmationModal
        isOpen={!!avatarToDelete}
        onClose={() => setAvatarToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={t("deleteAvatar")}
        description={t("deleteAvatarDescription")}
        itemName={avatarToDelete?.name || ""}
        isLoading={mBusinessAvatarDelete.isPending}
      />
    </>
  );
}
