import { EnumPaymentStatus } from "@/models/api/purchase/business.type";

const getStatusColor = (status: EnumPaymentStatus) => {
  switch (status) {
    case "Success":
      return "bg-green-100 text-green-800";
    case "Expired":
      return "bg-gray-100 text-gray-800";
    case "Failed":
      return "bg-red-100 text-red-800";
    case "Canceled":
      return "bg-gray-100 text-gray-800";
    case "Refunded":
      return "bg-gray-100 text-gray-800";
    case "Pending":
      return "bg-yellow-100 text-yellow-800";
    case "Denied":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getStatusLabel = (status: EnumPaymentStatus, tStatus: (key: string) => string) => {
  switch (status) {
    case "Success":
      return tStatus("success");
    case "Expired":
      return tStatus("expired");
    case "Failed":
      return tStatus("failed");
    case "Canceled":
      return tStatus("canceled");
    case "Refunded":
      return tStatus("refunded");
    case "Pending":
      return tStatus("pending");
    case "Denied":
      return tStatus("denied");
    default:
      return tStatus("pending");
  }
};

const getStatusDescription = (status: EnumPaymentStatus, t: (key: string) => string) => {
  switch (status) {
    case "Success":
      return t("checkout.paymentStatus.success");
    case "Expired":
      return t("checkout.paymentStatus.expired");
    case "Failed":
      return t("checkout.paymentStatus.failed");
    case "Canceled":
      return t("checkout.paymentStatus.canceled");
    case "Refunded":
      return t("checkout.paymentStatus.refunded");
    case "Pending":
      return t("checkout.paymentStatus.pending");
    case "Denied":
      return t("checkout.paymentStatus.denied");
    default:
      return t("checkout.paymentStatus.pending");
  }
};

export const mapEnumPaymentStatus = {
  getStatusColor,
  getStatusLabel,
  getStatusDescription,
};
