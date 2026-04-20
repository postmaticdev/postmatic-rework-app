"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Users, MessageCircle, Hash } from "lucide-react";
import { EditKnowledgeModal } from "./edit-knowledge-modal";
import { useRoleKnowledgeGetById } from "@/services/knowledge.api";
import { useParams } from "next/navigation";
import { useRole } from "@/contexts/role-context";
import { useTranslations } from "next-intl";

export function RoleKnowledgeSection() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { businessId } = useParams() as { businessId: string };
  const { data: roleKnowledgeData } = useRoleKnowledgeGetById(businessId);
  const { access } = useRole();
  const { roleKnowledge } = access;
  const r = useTranslations("roleKnowledge");

  const roleTags = [
    {
      icon: Users,
      label: r("targetAudience"),
      value: roleKnowledgeData?.data?.data?.targetAudience || r("notAvailable"),
      color: "bg-yellow-400/50 text-white",
    },
    {
      icon: MessageCircle,
      label: r("contentTone"),
      value: roleKnowledgeData?.data?.data?.tone || r("notAvailable"),
      color: "bg-blue-400/50 text-white",
    },
    {
      icon: Hash,
      label: r("hashtags"),
      value:
        roleKnowledgeData?.data?.data?.hashtags
          ?.map((hashtag) => `${hashtag}`)
          .join(", ") || r("notAvailable"),
      color: "bg-purple-400/50 text-white",
    },
  ];

  return (
    <div className="h-full">
      <Card className="h-full">
        <CardContent className="pb-6">
          <div className="my-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              {r("title")}
            </h2>
            {roleKnowledge.write && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roleTags.map((tag, index) => {
              const Icon = tag.icon;
              return (
                <div
                  key={index}
                  className="flex items-center justify-start gap-4 rounded-md border p-3 text-sm font-medium shadow-sm"
                >
                  <div
                    className={`items-center justify-center rounded-sm p-2 ${tag.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-normal">{tag.label}</span>
                    <span className="text-md truncate">{tag.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <EditKnowledgeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialTab="role"
      />
    </div>
  );
}
