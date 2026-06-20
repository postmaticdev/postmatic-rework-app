"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooterWithButton,
} from "@/components/ui/dialog";
import { ChevronDown, Mail, Shield, Trash2 } from "lucide-react";
import {
  useMemberDelete,
  useMemberGetAllMembers,
  useMemberInvite,
  useMemberResend,
  useMemberUpdateRole,
} from "@/services/member.api";
import { useParams } from "next/navigation";
import { showToast } from "@/helper/show-toast";
import { MemberRole, MembersInvitePld } from "@/models/api/member/index.type";

import { JOINED_STATUS } from "./members-table";
import { useTranslations } from "next-intl";
import {
  getMemberRoleLabel,
  getMemberStatusLabel,
  ROLE_OPTIONS,
} from "./member-display";

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessIdFromProps: string | null;
}

export function MemberManagementModal({
  isOpen,
  onClose,
  businessIdFromProps: businessIdFromProps,
}: MemberManagementModalProps) {
  const [memberToDelete, setMemberToDelete] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [formData, setFormData] = useState<MembersInvitePld>({
    email: "",
    role: "Member",
  });

  const { businessId } = useParams() as { businessId: string };
  const resolvedBusinessId = businessIdFromProps || businessId || "";
  const { data: dataMembers } = useMemberGetAllMembers(
    resolvedBusinessId
  );
  const members = dataMembers?.data?.data || [];
  const mInvite = useMemberInvite();
  const mUpdateRole = useMemberUpdateRole();
  const mResend = useMemberResend();
  const mDelete = useMemberDelete();
  const t = useTranslations("settings");
  const m = useTranslations("modal");

  const handleAddMember = async () => {
    try {
      if (!formData.email.trim()) return;
      const res = await mInvite.mutateAsync({
        businessId: resolvedBusinessId,
        formData: {
          ...formData,
          email: formData.email.trim(),
        },
      });
      showToast("success", res.data.responseMessage);
      setFormData({
        email: "",
        role: "Member",
      });
    } catch (error) {
      showToast("error", error);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      const findMember = members.find((member) => member.id === id);
      if (findMember?.role === "Owner") return;
      const res = await mDelete.mutateAsync({
        businessId: resolvedBusinessId,
        idData: id,
      });
      showToast("success", res.data.responseMessage);
      setMemberToDelete(null);
    } catch (error) {
      showToast("error", error);
    }
  };

  const handleOpenDeleteConfirmation = (member: {
    id: string;
    profile: { name: string; email: string };
    role: MemberRole;
  }) => {
    if (member.role === "Owner") return;

    setMemberToDelete({
      id: member.id,
      name: member.profile.name,
      email: member.profile.email,
    });
  };

  const handleCloseDeleteConfirmation = () => {
    if (mDelete.isPending) return;
    setMemberToDelete(null);
  };

  const onChangeRole = async (id: string, role: Exclude<MemberRole, "Owner">) => {
    try {
      const findMember = members.find((member) => member.id === id);
      if (
        !findMember ||
        findMember.role === "Owner" ||
        findMember.status !== "Accepted" ||
        findMember.role === role
      ) {
        return;
      }
      const res = await mUpdateRole.mutateAsync({
        businessId: resolvedBusinessId,
        formData: {
          memberId: id,
          role,
        },
      });
      showToast("success", res.data.responseMessage);
    } catch (error) {
      showToast("error", error);
    }
  };

  const onResendInvite = async (id: string) => {
    try {
      const res = await mResend.mutateAsync({
        businessId: resolvedBusinessId,
        formData: {
          memberId: id,
        },
      });
      showToast("success", res.data.responseMessage);
    } catch (error) {
      showToast("error", error);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          {/* Header */}
          <DialogHeader>
            <div>
              <DialogTitle>{m("memberManagement")}</DialogTitle>
              <DialogDescription>
                {m("memberManagementDescription")}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto space-y-6 p-6">
            {/* Add New Member Section */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input
                      id="email"
                      placeholder={t("enterEmail")}
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">{t("role")}</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between"
                        >
                          {getMemberRoleLabel(formData.role, t)}
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {ROLE_OPTIONS.map((role) => (
                          <DropdownMenuItem
                            key={role.value}
                            onClick={() =>
                              setFormData({ ...formData, role: role.value })
                            }
                          >
                            {t(role.translationKey)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Button
                    onClick={handleAddMember}
                    className="bg-primary hover:bg-blue-700 text-white"
                    disabled={mInvite.isPending || !formData.email.trim()}
                  >
                    + {t("add")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Members Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">{t("currentMembers")}</h3>
              <div className="space-y-3">
                {members
                  ?.filter((member) => JOINED_STATUS.includes(member.status))
                  .map((member) => (
                    <Card key={member.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_7.25rem_9.5rem_2.25rem_2.25rem] sm:items-center sm:gap-3">
                          <div className="flex min-w-0 items-center space-x-3">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarFallback>
                                {member.profile.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {member.profile.name}
                              </div>
                              <div className="truncate text-sm text-muted-foreground">
                                {member.profile.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 sm:contents">
                            <Badge
                              variant="secondary"
                              className="border-0 bg-blue-100 text-blue-800 sm:justify-self-start"
                            >
                              {getMemberStatusLabel(member.status, t)}
                            </Badge>

                            <div className="flex items-center sm:w-full">
                              {member.role !== "Owner" &&
                              member.status === "Accepted" ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-auto p-0 font-normal sm:h-9 sm:w-full sm:justify-start sm:px-3"
                                      disabled={mUpdateRole.isPending}
                                    >
                                      <Shield className="h-4 w-4 mr-1" />
                                      {getMemberRoleLabel(member.role, t)}
                                      <ChevronDown className="h-4 w-4 ml-1" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    {ROLE_OPTIONS.map((role) => (
                                      <DropdownMenuItem
                                        key={role.value}
                                        onClick={() =>
                                          onChangeRole(member.id, role.value)
                                        }
                                      >
                                        {t(role.translationKey)}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto p-0 font-normal sm:h-9 sm:w-full sm:justify-start sm:px-3"
                                >
                                  <Shield className="h-4 w-4 mr-1" />
                                  {getMemberRoleLabel(member.role, t)}
                                </Button>
                              )}
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center">
                              {member.status === "Pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onResendInvite(member.id)}
                                  disabled={mResend.isPending}
                                  className="h-9 w-9 p-0"
                                >
                                  <Mail className="h-4 w-4" />
                                  <span className="sr-only">
                                    {t("resendInvite")}
                                  </span>
                                </Button>
                              )}
                            </div>

                            <div className="flex h-9 w-9 items-center justify-center">
                              {member.role !== "Owner" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenDeleteConfirmation(member)
                                  }
                                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
                                  disabled={mDelete.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">{m("delete")}</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooterWithButton buttonMessage={t("save")} onClick={onClose} />
        </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        isOpen={!!memberToDelete}
        onClose={handleCloseDeleteConfirmation}
        onConfirm={() =>
          memberToDelete && handleDeleteMember(memberToDelete.id)
        }
        title={m("deleteItemTitle")}
        description={m("deleteItemDescription")}
        itemName={
          memberToDelete
            ? `${memberToDelete.name} (${memberToDelete.email})`
            : ""
        }
        isLoading={mDelete.isPending}
      />
    </>
  );
}
