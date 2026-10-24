"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Shield, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberGetAllMembers } from "@/services/member.api";
import { useParams } from "next/navigation";
import { MemberManagementModal } from "@/app/[locale]/business/[businessId]/settings/(components)/member-management-modal";
import { useState } from "react";
import { MemberStatus } from "@/models/api/member/index.type";
import { useRole } from "@/contexts/role-context";
import { useTranslations } from "next-intl";
import {
  getMemberInitial,
  getMemberRoleLabel,
  getMemberStatusLabel,
} from "./member-display";

export function MembersTable() {
  const { businessId } = useParams() as { businessId: string };
  const {
    data: dataMembers,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useMemberGetAllMembers(businessId);
  const members = (dataMembers?.data?.data || []).filter((member) =>
    JOINED_STATUS.includes(member.status)
  );
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const t = useTranslations("settings");
  const d = useTranslations("dashboard");

  const { access } = useRole();
  const { invite, edit } = access.member;

  const onInviteMember = () => {
    setIsMemberModalOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col py-4 px-4 sm:px-0 sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <CardTitle className="text-lg sm:text-2xl font-bold">
              {t("members")}
            </CardTitle>
            {(invite || edit) && (
              <Button
                onClick={onInviteMember}
                className="w-full sm:w-auto text-white"
              >
                <UserPlus className="h-4 w-4" />
                {t("inviteMember")}
              </Button>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-3 p-4 max-md:pt-0 sm:px-0">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : isError && !dataMembers ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
                {d("retry")}
              </Button>
            </div>
          ) : (
          <>
          {/* Mobile list */}
          <div className="block lg:hidden p-4 space-y-3 max-md:pt-0">
            {members.map((member) => (
                <div
                  key={member.id}
                  className="border rounded-lg p-3 bg-background"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={member.profile.image} />
                        <AvatarFallback className="bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                          {getMemberInitial(member.profile)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate font-medium">
                            {member.profile.name}
                          </span>
                          {member.isYourself && (
                            <Badge
                              variant="secondary"
                              className="shrink-0 text-xs bg-blue-100 text-blue-800"
                            >
                              {t("you")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground break-all">
                          {member.profile.email}
                        </div>
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 border-0 rounded-full flex-shrink-0"
                        >
                          {getMemberStatusLabel(member.status, t)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    {JOINED_STATUS.includes(member.status) ? (
                      <div className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm">
                        <Shield className="h-4 w-4 mr-1" />
                        {getMemberRoleLabel(member.role, t)}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
          </div>

          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="p-4 font-medium text-muted-foreground">
                    {t("name")}
                  </th>
                  <th className="p-4 font-medium text-muted-foreground">
                    {t("email")}
                  </th>
                  <th className="p-4 font-medium text-muted-foreground">
                    {t("role")}
                  </th>
                  <th className="p-4 font-medium text-muted-foreground">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.profile.image} />
                            <AvatarFallback className="bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                              {getMemberInitial(member.profile)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">
                              {member.profile.name}
                            </span>
                            {member.isYourself && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-blue-100 text-blue-800"
                              >
                                {t("you")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground break-all">
                        {member.profile.email}
                      </td>
                      <td className="p-4">
                        <div className="inline-flex items-center text-sm font-normal">
                          <Shield className="h-4 w-4 mr-1" />
                          {getMemberRoleLabel(member.role, t)}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 border-0 rounded-full"
                        >
                          {getMemberStatusLabel(member.status, t)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </CardContent>
      </Card>
      <MemberManagementModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        businessIdFromProps={null}
      />
    </div>
  );
}

export const JOINED_STATUS: MemberStatus[] = ["Accepted", "Pending"];
