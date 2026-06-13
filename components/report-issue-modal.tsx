"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";

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

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = "bug" | "suggestion" | "question" | "other";

interface ReportForm {
  name: string;
  email: string;
  reportType: ReportType | "";
  details: string;
  phoneNumber: string;
}

const initialForm: ReportForm = {
  name: "",
  email: "",
  reportType: "",
  details: "",
  phoneNumber: "",
};

export function ReportIssueModal({
  isOpen,
  onClose,
}: ReportIssueModalProps) {
  const t = useTranslations("reportIssueModal");
  const [form, setForm] = useState<ReportForm>(initialForm);

  const updateField = <K extends keyof ReportForm>(
    field: K,
    value: ReportForm[K]
  ) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
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
            <Label htmlFor="report-type">{t("reportType")}</Label>
            <Select
              value={form.reportType}
              onValueChange={(value: ReportType) =>
                updateField("reportType", value)
              }
            >
              <SelectTrigger id="report-type">
                <SelectValue placeholder={t("reportTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">{t("types.bug")}</SelectItem>
                <SelectItem value="suggestion">
                  {t("types.suggestion")}
                </SelectItem>
                <SelectItem value="question">{t("types.question")}</SelectItem>
                <SelectItem value="other">{t("types.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="report-phone-number">{t("phoneNumber")}</Label>
            <Input
              id="report-phone-number"
              type="tel"
              value={form.phoneNumber}
              onChange={(event) =>
                updateField("phoneNumber", event.target.value)
              }
              placeholder={t("phoneNumberPlaceholder")}
            />
          </div>
        </form>

        <DialogFooter>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" form="report-issue-form">
              {t("submit")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
