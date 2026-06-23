"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { SearchableCountrySelect } from "@/app/[locale]/profile/(components)/searchable-select-content";
import { UploadPhoto } from "@/components/forms/upload-photo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helper/show-toast";
import countryCodes from "@/lib/country-code.json";
import { useAuthProfileGetProfile } from "@/services/auth.api";
import {
  useTicketCategories,
  useTicketWebsiteCreate,
} from "@/services/ticket.api";

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReportForm {
  name: string;
  email: string;
  reportType: string;
  details: string;
  countryCode: string;
  phoneNumber: string;
  attachments: string[];
}

const DEFAULT_COUNTRY_CODE = "+62";
const OTHER_REPORT_TYPE = "other";

const createInitialForm = (): ReportForm => ({
  name: "",
  email: "",
  reportType: "",
  details: "",
  countryCode: "",
  phoneNumber: "",
  attachments: [],
});

function resolveCountryCode(
  rawCountryCode?: string | null,
  rawPhone?: string | null
) {
  const normalizedCountryCode = rawCountryCode?.trim() ?? "";

  if (/^\+\d+$/.test(normalizedCountryCode)) return normalizedCountryCode;
  if (/^\d+$/.test(normalizedCountryCode)) return `+${normalizedCountryCode}`;

  if (/^[A-Za-z]{2}$/.test(normalizedCountryCode)) {
    const match = (
      countryCodes as Array<{ code: string; dial_code: string }>
    ).find(
      (item) => item.code.toUpperCase() === normalizedCountryCode.toUpperCase()
    );
    if (match?.dial_code) return match.dial_code;
  }

  const fromPhone = rawPhone?.trim().match(/^\+(\d{1,4})/);
  if (fromPhone?.[1]) return `+${fromPhone[1]}`;

  return DEFAULT_COUNTRY_CODE;
}

function stripCountryCodeFromPhone(
  rawPhone?: string | null,
  countryCode = DEFAULT_COUNTRY_CODE
) {
  const phoneDigits = rawPhone?.replace(/[^\d]/g, "") ?? "";
  const countryDigits = countryCode.replace(/[^\d]/g, "");

  if (!phoneDigits) return "";
  if (!countryDigits) return phoneDigits;
  if (!phoneDigits.startsWith(countryDigits)) return phoneDigits;

  return phoneDigits.slice(countryDigits.length);
}

function sanitizePhoneNumber(rawPhone: string, countryCode: string) {
  let normalizedPhone = stripCountryCodeFromPhone(rawPhone, countryCode).replace(
    /[^\d]/g,
    ""
  );

  while (normalizedPhone.startsWith("0")) {
    normalizedPhone = normalizedPhone.slice(1);
  }

  return normalizedPhone;
}

export function ReportIssueModal({
  isOpen,
  onClose,
}: ReportIssueModalProps) {
  const t = useTranslations("reportIssueModal");
  const { data: profileData } = useAuthProfileGetProfile();
  const { data: categoryData, isLoading: isCategoryLoading } =
    useTicketCategories(isOpen);
  const mCreateTicket = useTicketWebsiteCreate();
  const [form, setForm] = useState<ReportForm>(createInitialForm);

  const profile = profileData?.data?.data;
  const categories = useMemo(
    () => categoryData?.data?.data ?? [],
    [categoryData?.data?.data]
  );
  const defaultCategoryId = useMemo(() => {
    if (categories.length === 0) return "";

    const preferredCategory = categories.find((category) => category.id === 3);
    return String(preferredCategory?.id ?? categories[0]?.id ?? "");
  }, [categories]);

  const selectedCategory = useMemo(
    () =>
      categories.find((category) => String(category.id) === form.reportType),
    [categories, form.reportType]
  );
  const submittedCategoryId = useMemo(() => {
    if (form.reportType === OTHER_REPORT_TYPE) {
      return Number(defaultCategoryId);
    }

    return Number(form.reportType);
  }, [defaultCategoryId, form.reportType]);

  const updateField = <K extends keyof ReportForm>(
    field: K,
    value: ReportForm[K]
  ) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  useEffect(() => {
    if (!isOpen || !profile) return;

    const resolvedCountryCode = resolveCountryCode(
      profile.countryCode,
      profile.phone
    );
    const resolvedPhone = stripCountryCodeFromPhone(
      profile.phone,
      resolvedCountryCode
    );

    setForm((currentForm) => ({
      ...currentForm,
      name: currentForm.name || profile.name || "",
      email: currentForm.email || profile.email || "",
      countryCode: currentForm.countryCode || resolvedCountryCode,
      phoneNumber: currentForm.phoneNumber || resolvedPhone,
    }));
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen || !defaultCategoryId) return;

    setForm((currentForm) =>
      currentForm.reportType
        ? currentForm
        : { ...currentForm, reportType: defaultCategoryId }
    );
  }, [defaultCategoryId, isOpen]);

  const handleClose = () => {
    setForm(createInitialForm());
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedName = form.name.trim();
    const normalizedEmail = form.email.trim();
    const normalizedDetails = form.details.trim();
    const normalizedPhone = sanitizePhoneNumber(
      form.phoneNumber,
      form.countryCode
    );

    if (
      !normalizedName ||
      !normalizedEmail ||
      !form.reportType ||
      Number.isNaN(submittedCategoryId) ||
      !normalizedDetails ||
      !normalizedPhone
    ) {
      showToast("error", t("validation"));
      return;
    }

    try {
      const firstLine = normalizedDetails.split(/\r?\n/)[0]?.trim() ?? "";
      const subject =
        firstLine.slice(0, 120) || selectedCategory?.name || t("defaultSubject");

      const response = await mCreateTicket.mutateAsync({
        subject,
        body: normalizedDetails,
        countryCode: form.countryCode.replace(/[^\d]/g, "") || "62",
        phone: normalizedPhone,
        email: normalizedEmail,
        priority: "high",
        appTicketCategoryId: submittedCategoryId,
        attachments: form.attachments,
      });

      showToast("success", response.data.responseMessage);
      handleClose();
    } catch (error) {
      showToast("error", error);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form
          id="report-issue-form"
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="report-name">{t("name")}</Label>
              <Input
                id="report-name"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-email">{t("email")}</Label>
              <Input
                id="report-email"
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={t("emailPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-phone-number">{t("phoneNumber")}</Label>
            <div className="flex space-x-2">
              <SearchableCountrySelect
                countries={countryCodes}
                value={form.countryCode || DEFAULT_COUNTRY_CODE}
                onValueChange={(value) => updateField("countryCode", value)}
                placeholder={t("countryCode")}
                searchPlaceholder={t("countryCodeSearch")}
                className="w-40 bg-card"
              />
              <Input
                id="report-phone-number"
                type="tel"
                value={form.phoneNumber}
                onChange={(event) =>
                  updateField(
                    "phoneNumber",
                    event.target.value.replace(/[^\d]/g, "")
                  )
                }
                placeholder={t("phoneNumberPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-type">{t("reportType")}</Label>
            <Select
              value={form.reportType}
              onValueChange={(value) => updateField("reportType", value)}
            >
              <SelectTrigger id="report-type">
                <SelectValue placeholder={t("reportTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {isCategoryLoading ? (
                  <SelectItem value="__loading__" disabled>
                    {t("reportTypeLoading")}
                  </SelectItem>
                ) : categories.length > 0 ? (
                  <>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={OTHER_REPORT_TYPE}>
                      {t("reportTypeOther")}
                    </SelectItem>
                  </>
                ) : (
                  <SelectItem value="__empty__" disabled>
                    {t("reportTypeEmpty")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <UploadPhoto
            label={t("photo")}
            multiple
            currentImages={form.attachments}
            onImagesChange={(imageUrls: string[]) =>
              updateField("attachments", imageUrls)
            }
            emptyText={t("photoPlaceholder")}
            uploadingText={t("photoUploading")}
          />

          <div className="space-y-2">
            <Label htmlFor="report-details">{t("details")}</Label>
            <Textarea
              id="report-details"
              rows={5}
              value={form.details}
              onChange={(event) => updateField("details", event.target.value)}
              placeholder={t("detailsPlaceholder")}
            />
          </div>
        </form>

        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              form="report-issue-form"
              disabled={mCreateTicket.isPending || isCategoryLoading}
            >
              {mCreateTicket.isPending ? t("submitting") : t("submit")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
