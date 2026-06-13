import { api } from "@/config/api";
import { BaseResponse } from "@/models/api/base-response.type";
import { ReferralBasicRes } from "@/models/api/referral/referral-basic.type";
import { useQuery } from "@tanstack/react-query";

const referralService = {
  getBasicCode: () =>
    api.get<BaseResponse<ReferralBasicRes>>("/affiliator/referral-basic"),
};

export const useReferralBasicGetCode = () => {
  return useQuery({
    queryKey: ["referralBasic"],
    queryFn: () => referralService.getBasicCode(),
  });
};

export default referralService;
