import { api } from "@/config/api";
import { BaseResponse } from "@/models/api/base-response.type";
import {
  EditRolePld,
  MembersInvitePld,
  MembersInviteRes,
  MembersRes,
  MemberRole,
  MemberStatus,
  ResendEmailPld,
} from "@/models/api/member/index.type";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const toApiRole = (role: string) => role.toLowerCase();
const toUiRole = (role: string): MemberRole => {
  const normalized = role.toLowerCase();
  if (normalized === "owner") return "Owner";
  if (normalized === "admin") return "Admin";
  return "Member";
};
const toUiStatus = (status: string): MemberStatus => {
  const normalized = status.toLowerCase();
  if (normalized === "accepted") return "Accepted";
  if (normalized === "rejected") return "Rejected";
  if (normalized === "left") return "Left";
  if (normalized === "kicked") return "Kicked";
  return "Pending";
};
const mapMember = (member: MembersRes & { profile?: { imageUrl?: string | null } }) => ({
  ...member,
  id: String(member.id),
  role: toUiRole(member.role),
  status: toUiStatus(member.status),
  profile: {
    ...member.profile,
    image: member.profile?.image ?? member.profile?.imageUrl ?? "",
  },
});

const memberService = {
  getAllMembers: (businessId: string) => {
    return api
      .get<BaseResponse<MembersRes[]>>(`/business/member/${businessId}`)
      .then((res) => {
        res.data.data = ((res.data.data ?? []) as MembersRes[]).map(mapMember);
        return res;
      });
  },
  invite: (businessId: string, formData: MembersInvitePld) => {
    return api.post<BaseResponse<MembersInviteRes>>(
      `/business/member/${businessId}`,
      { ...formData, role: toApiRole(formData.role) }
    );
  },
  resend: (businessId: string, formData: ResendEmailPld) => {
    return api.post<BaseResponse<MembersInviteRes>>(
      `/business/member/${businessId}/resend-invitation`,
      formData
    );
  },

  updateRole: (businessId: string, formData: EditRolePld) => {
    return api.put<BaseResponse<MembersInviteRes>>(
      `/business/member/${businessId}`,
      { ...formData, role: toApiRole(formData.role) }
    );
  },

  delete: (businessId: string, idData: string) => {
    return api.delete<BaseResponse<MembersInviteRes>>(
      `/business/member/${businessId}/${idData}`
    );
  },
};

export const useMemberGetAllMembers = (businessId: string) => {
  return useQuery({
    queryKey: ["members", businessId],
    queryFn: () => memberService.getAllMembers(businessId),
    enabled: !!businessId,
  });
};

export const useMemberInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: MembersInvitePld;
    }) => memberService.invite(businessId, formData),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: ["members", data.data.rootBusinessId],
      });
    },
  });
};

export const useMemberResend = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: ResendEmailPld;
    }) => memberService.resend(businessId, formData),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: ["members", data.data.rootBusinessId],
      });
    },
  });
};

export const useMemberUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      businessId,
      formData,
    }: {
      businessId: string;
      formData: EditRolePld;
    }) => memberService.updateRole(businessId, formData),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: ["members", data.data.rootBusinessId],
      });
    },
  });
};

export const useMemberDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({
        queryKey: ["members", data.data.rootBusinessId],
      });
    },
    mutationFn: ({
      businessId,
      idData,
    }: {
      businessId: string;
      idData: string;
    }) => memberService.delete(businessId, idData),
  });
};
