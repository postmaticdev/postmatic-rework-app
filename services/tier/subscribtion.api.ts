import { api } from "@/config/api";
import { BaseResponse } from "@/models/api/base-response.type";
import { StatusSubscribtionRes } from "@/models/api/tier/subsription.type";
import { useQuery } from "@tanstack/react-query";

const subscribtionService = {
  getSubscription: (businessId: string) => {
    return Promise.resolve({
      data: {
        metaData: { code: 200, message: "OK" },
        responseMessage: "SUBSCRIPTION_NOT_AVAILABLE",
        data: {
          valid: true,
          expiredAt: null,
          subscription: {
            productName: "Token Based",
            productType: "image_token",
            subscriptionValidFor: 0,
          },
        },
      },
    }) as unknown as ReturnType<
      typeof api.get<BaseResponse<StatusSubscribtionRes>>
    >;
  },
};

export const useSubscribtionGetSubscription = (businessId: string) => {
  return useQuery({
    queryKey: ["subscribtionSubscription", businessId],
    queryFn: () => subscribtionService.getSubscription(businessId),
    enabled: !!businessId,
  });
};
