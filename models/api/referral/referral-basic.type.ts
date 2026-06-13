export interface ReferralBasicRes {
  id: number;
  code: string;
  totalDiscount: number;
  discountType: string;
  expiredDays: number | null;
  maxDiscount: number | null;
  maxUsage: number | null;
  rewardPerReferral: number;
  createdAt: string;
  updatedAt: string;
}
