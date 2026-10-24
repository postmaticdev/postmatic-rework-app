import { api } from "@/config/api";
import {
  BaseResponse,
  BaseResponseFiltered,
  FilterQuery,
} from "@/models/api/base-response.type";
import {
  BusinessDetailRes,
  BusinessRes,
  BussinessPld,
  MemberRole,
} from "@/models/api/business/index.type";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type NewBusinessMember = {
  id?: string | number;
  status: string;
  role: string;
  profile: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
    image?: string | null;
  };
};

type NewBusiness = Omit<BusinessDetailRes, "id" | "members" | "userPosition"> & {
  id: string | number;
  primaryLogoUrl?: string | null;
  logo?: string | null;
  businessKnowledge?: {
    primaryLogo?: string | null;
    primaryLogoUrl?: string | null;
  };
  knowledge?: {
    primaryLogo?: string | null;
    primaryLogoUrl?: string | null;
  };
  members?: NewBusinessMember[];
  userPosition?: NewBusinessMember;
};

const sanitizePhone = (phone: string) =>
  phone.replace(/[^\d]/g, "").replace(/^0+/, "");

const sanitizeCountryCode = (countryCode: string) =>
  countryCode.replace(/[^\d]/g, "") || "62";

// Go mewajibkan colorTone 6-hex. Color picker menampilkan #FAFAFA saat nilai
// masih kosong tapi tidak mengirim onChange, jadi samakan fallback-nya.
const sanitizeColorTone = (colorTone?: string) => {
  const hex = (colorTone ?? "").trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(hex) ? hex : "FAFAFA";
};

const toCreateBusinessPayload = (formData: BussinessPld) => ({
  businessKnowledge: {
    primaryLogoUrl: formData.businessKnowledge.primaryLogo,
    name: formData.businessKnowledge.name,
    category: formData.businessKnowledge.category,
    description: formData.businessKnowledge.description,
    ...(formData.businessKnowledge.website.trim()
      ? { websiteUrl: formData.businessKnowledge.website.trim() }
      : {}),
    colorTone: sanitizeColorTone(formData.businessKnowledge.colorTone),
    businessPhone: sanitizePhone(formData.businessKnowledge.businessPhone),
    countryCode: sanitizeCountryCode(formData.businessKnowledge.countryCode),
  },
  productKnowledge: {
    name: formData.productKnowledge.name,
    category: formData.productKnowledge.category,
    description: formData.productKnowledge.description,
    price: Number(formData.productKnowledge.price),
    currency: formData.productKnowledge.currency,
    imageUrls: formData.productKnowledge.images,
  },
  roleKnowledge: {
    targetAudience: formData.roleKnowledge.targetAudience,
    tone: formData.roleKnowledge.tone,
    hashtags: formData.roleKnowledge.hashtags.map((hashtag) =>
      hashtag.startsWith("#") ? hashtag : `#${hashtag}`
    ),
  },
});

const toRole = (role?: string): MemberRole => {
  const normalized = role?.toLowerCase();
  if (normalized === "owner") return "Owner";
  if (normalized === "admin") return "Admin";
  return "Member";
};

const mapMember = (member: NewBusinessMember) => ({
  ...member,
  id: String(member.id ?? member.profile.id),
  role: toRole(member.role),
  profile: {
    ...member.profile,
    image: member.profile.image ?? member.profile.imageUrl ?? "",
  },
});

const mapBusiness = <T extends BusinessRes | BusinessDetailRes>(
  business: NewBusiness
): T =>
  ({
    ...business,
    id: String(business.id),
    logo:
      business.logo ??
      business.primaryLogoUrl ??
      business.businessKnowledge?.primaryLogoUrl ??
      business.businessKnowledge?.primaryLogo ??
      business.knowledge?.primaryLogoUrl ??
      business.knowledge?.primaryLogo ??
      "",
    members: business.members?.map(mapMember) ?? [],
    userPosition: business.userPosition
      ? mapMember(business.userPosition)
      : undefined,
    information: (business as BusinessDetailRes).information ?? {
      knowledge: { business: true, product: true, role: true, rss: true },
      social: { linkedIn: false },
      scheduler: { timeZone: false },
    },
  } as unknown as T);

// Dedupe only by id: different businesses may legitimately share a name/description.
const dedupeBusinesses = (businesses: BusinessRes[]) => {
  const seenIds = new Set<string>();
  const result: BusinessRes[] = [];

  businesses.forEach((business) => {
    const id = String(business.id);
    if (seenIds.has(id)) return;
    seenIds.add(id);
    result.push(business);
  });

  return result;
};

export const businessService = {
  getAll: (filterQuery?: Partial<FilterQuery>) => {
    return api
      .get<BaseResponseFiltered<BusinessRes[]>>("/business/information", {
        params: filterQuery,
      })
      .then((res) => {
        res.data.data = dedupeBusinesses(
          ((res.data.data ?? []) as unknown as NewBusiness[]).map((business) =>
            mapBusiness<BusinessRes>(business)
          )
        );
        return res;
      });
  },
  getById: (idData: string) => {
    if (!idData) return;
    return api
      .get<BaseResponse<BusinessDetailRes>>(`/business/information/${idData}`)
      .then((res) => {
        res.data.data = mapBusiness<BusinessDetailRes>(
          res.data.data as unknown as NewBusiness
        );
        return res;
      });
  },
  create: (formData: BussinessPld) => {
    return api.post<BaseResponse<BusinessRes>>(
      `/business/information`,
      toCreateBusinessPayload(formData)
    );
  },
  update: (idData: string, formData: BussinessPld) => {
    return api.put<BaseResponse<BusinessRes>>(
      `/business/information/${idData}`,
      formData
    );
  },
  delete: (idData: string) => {
    return api.delete<BaseResponse<BusinessRes>>(
      `/business/information/${idData}`
    );
  },
};

// Hanya butuh jumlah total: minta 1 item dan baca total dari pagination.
export const countBusiness = async () => {
  const res = await businessService.getAll({ limit: 1 });
  return res.data.pagination?.total ?? res.data.data.length;
};

export const useBusinessGetAll = (filterQuery?: Partial<FilterQuery>) =>
  useQuery({
    queryKey: ["businesses", filterQuery],
    queryFn: () =>
      businessService.getAll({
        ...filterQuery,
        // Use the limit from filterQuery, default to 10 if not provided
        limit: filterQuery?.limit || 10,
      }),
    // Tetap tampilkan daftar sebelumnya saat pindah halaman/pencarian.
    placeholderData: keepPreviousData,
  });

// Business switcher list in the header and mobile menu. Both use this exact
// filter so they share one cached request.
export const BUSINESS_SWITCHER_FILTER: Partial<FilterQuery> = {
  limit: 40,
  sort: "asc",
  sortBy: "name",
};

export const useBusinessGetById = (idData: string) =>
  useQuery({
    queryKey: ["business", idData],
    queryFn: () => businessService.getById(idData),
    enabled: !!idData,
  });

export type BusinessAccessManagementRes = {
  isMustShareContent: boolean;
  isWatermarked: boolean;
  accessPremiumModel: boolean;
};

export const useBusinessAccessManagementGet = (businessId: string) =>
  useQuery({
    queryKey: ["businessAccessManagement", businessId],
    queryFn: () =>
      api.get<BaseResponse<BusinessAccessManagementRes>>(
        `/business/access-management/${businessId}`
      ),
    enabled: !!businessId,
  });

export const useBusinessCreate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: BussinessPld) => businessService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
    onError: (error) => {
      throw error;
    },
  });
};

export const useBusinessUpdate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      idData,
      formData,
    }: {
      idData: string;
      formData: BussinessPld;
    }) => businessService.update(idData, formData),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.invalidateQueries({
        queryKey: ["business", variables.idData],
      });
    },
  });
};

export const useBusinessDelete = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (idData: string) => businessService.delete(idData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
    },
  });
};
