"use client";

import { Button } from "@/components/ui/button";
import {
  formatIdrStable,
} from "@/app/[locale]/business/[businessId]/pricing/checkout/(components)/product-display";
import { cn } from "@/lib/utils";
import { ChevronDown, Copy, Info, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type PaymentAction = {
  action: string;
  value: string;
  type: "image" | "redirect" | "text" | "claim";
};

type PaymentCountdown = {
  text: string;
  expired: boolean;
} | null;

interface PaymentInstructionCardProps {
  status?: string;
  statusTitle: string;
  statusDescription: string;
  totalAmount: number;
  paymentStatusLabel?: string;
  expiresAtLabel?: string;
  paymentCountdown: PaymentCountdown;
  paymentActions: PaymentAction[];
  method?: string;
  isPending: boolean;
  persistPaymentMedia?: boolean;
  showStatusBadge?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onCopy: (value: string) => void;
}

const BANK_LOGO_BY_METHOD: Record<string, string> = {
  bca: "/bca.png",
  bni: "/bni.png",
  mandiri: "/mandiri.png",
  permata: "/permata.png",
  cimb: "/cimbniaga.png",
  cimbniaga: "/cimbniaga.png",
  gopay: "/gopay-logo.png",
};

const normalizePaymentMethod = (method?: string) =>
  (method || "").toLowerCase().replace(/[\s_-]/g, "");

const getBankLogoByMethod = (method?: string) => {
  return BANK_LOGO_BY_METHOD[normalizePaymentMethod(method)];
};

const getBankLabelByMethod = (method?: string) =>
  (method || "Bank").replace(/[_-]/g, " ").toUpperCase();

const isQrisMethod = (method?: string) => normalizePaymentMethod(method) === "qris";

const getPaymentCardClassName = (status?: string) => {
  if (status === "Pending" || !status) {
    return "border-amber-300 bg-amber-50/45 dark:border-amber-700 dark:bg-amber-950/20";
  }
  if (status === "Success") {
    return "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20";
  }
  return "border-border bg-muted/20 dark:bg-zinc-900/60";
};

const getPaymentStatusBadgeClassName = (status?: string) => {
  switch (status) {
    case "Success":
      return "border-green-200 bg-green-50 text-green-700";
    case "Expired":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Failed":
    case "Denied":
    case "Canceled":
      return "border-red-200 bg-red-50 text-red-700";
    case "Refunded":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "Pending":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

export function PaymentInstructionCard({
  status,
  statusTitle,
  statusDescription,
  totalAmount,
  paymentStatusLabel,
  expiresAtLabel,
  paymentCountdown,
  paymentActions,
  method,
  isPending,
  persistPaymentMedia = false,
  showStatusBadge = false,
  isRefreshing = false,
  onRefresh,
  onCopy,
}: PaymentInstructionCardProps) {
  const t = useTranslations("settings.topUpTokenDialog");
  const locale = useLocale();
  const formatIdr = (amount: number) => formatIdrStable(amount, locale);
  const qrCodeAction =
    paymentActions.find(
      (action) => action.type === "image" && action.action === "generate-qr-code"
    ) ||
    paymentActions.find(
      (action) => action.type === "image" && action.action === "generate-qr-code-v2"
    ) ||
    paymentActions.find((action) => action.type === "image");
  const virtualAccountAction = paymentActions.find(
    (action) => action.type === "text" && action.action === "virtual-account"
  );
  const textPaymentAction = paymentActions.find(
    (action) => action.type === "text" && action.action !== "virtual-account"
  );
  const qrCodeActionValue = qrCodeAction?.value;

  const hasPaymentInstruction = Boolean(
    qrCodeAction || virtualAccountAction || textPaymentAction
  );
  const shouldShowPaymentInstruction =
    hasPaymentInstruction && (isPending || persistPaymentMedia);
  const shouldShowQrCodeImage = Boolean(qrCodeActionValue) && isPending;
  const shouldShowQrisLogo = !isPending && (Boolean(qrCodeAction) || isQrisMethod(method));
  const instructionBoxClassName =
    "grid h-28 w-28 shrink-0 place-items-center self-start rounded-md border bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:h-56 sm:w-56 sm:p-3";

  return (
    <div
      className={cn("space-y-4 rounded-lg border p-4 sm:p-5", getPaymentCardClassName(status))}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-lg font-semibold text-foreground">{statusTitle}</h3>
          <div className="space-y-1 text-sm text-foreground">
            <p>{statusDescription}</p>
            <p>
              {t("totalToPay")}: {" "}
              <span className="font-semibold">{formatIdr(totalAmount)}</span>
            </p>
            {showStatusBadge && paymentStatusLabel ? (
              <div
                className={cn(
                  "inline-flex w-fit rounded-md border px-2 py-1 text-sm font-medium",
                  getPaymentStatusBadgeClassName(status)
                )}
              >
                {t("statusBadge", { status: paymentStatusLabel.trim() })}
              </div>
            ) : null}
            {isPending && expiresAtLabel ? (
              <p className="text-muted-foreground">
                {t("validUntil", { date: expiresAtLabel })}
              </p>
            ) : null}
            {isPending && paymentCountdown ? (
              <p
                className={cn(
                  "font-medium",
                  paymentCountdown.expired
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-700 dark:text-amber-400"
                )}
              >
                {paymentCountdown.text}
              </p>
            ) : null}
          </div>
          {isPending && onRefresh ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="mt-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {t("checkPaymentStatus")}
            </Button>
          ) : null}
        </div>

        {shouldShowPaymentInstruction ? (
          shouldShowQrCodeImage && qrCodeActionValue ? (
            <a
              href={qrCodeActionValue}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                instructionBoxClassName,
                "cursor-zoom-in transition-opacity hover:opacity-90"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeActionValue}
                alt={t("qrisAlt")}
                className="h-24 w-24 object-contain sm:h-52 sm:w-52"
              />
            </a>
          ) : (
            <div className={instructionBoxClassName}>
              {shouldShowQrisLogo ? (
                <QrisLogoPlaceholder />
              ) : virtualAccountAction ? (
                <VirtualAccountLogo method={method} />
              ) : textPaymentAction ? (
                <PaymentTextInstruction
                  action={textPaymentAction.action}
                  value={textPaymentAction.value}
                  method={method}
                  onCopy={onCopy}
                  copyLabel={t("copy")}
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center text-center text-xs text-muted-foreground sm:h-52 sm:w-52 sm:text-sm">
                  {t("instructionUnavailable")}
                </div>
              )}
            </div>
          )
        ) : (
          <div className={instructionBoxClassName}>
            {shouldShowQrisLogo ? (
              <QrisLogoPlaceholder />
            ) : (
              <PaymentMethodVisual method={method} />
            )}
          </div>
        )}
      </div>

      {isPending && virtualAccountAction ? (
        <CopyableCodeField
          value={virtualAccountAction.value}
          onCopy={onCopy}
          copyLabel={t("copy")}
        />
      ) : null}

      {/* Langkah-langkah pembayaran (collapsible) sesuai metode */}
      {isPending && hasPaymentInstruction ? (
        <PaymentStepsCollapsible
          kind={
            qrCodeAction || isQrisMethod(method)
              ? "qris"
              : virtualAccountAction
                ? "virtualAccount"
                : "redirect"
          }
        />
      ) : null}

    </div>
  );
}

function VirtualAccountLogo({ method }: { method?: string }) {
  const t = useTranslations("settings.topUpTokenDialog");
  const logoSrc = getBankLogoByMethod(method);
  const bankLabel = getBankLabelByMethod(method);

  return (
    <div className="grid h-24 w-24 place-items-center rounded-md border border-muted bg-muted/10 p-2 sm:h-52 sm:w-52 sm:p-4">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={t("bankLogoAlt", { bank: bankLabel })}
          width={180}
          height={90}
          className="h-auto w-full object-contain"
        />
      ) : (
        <div className="text-center text-base font-semibold text-muted-foreground">
          {t("virtualAccountLabel", { bank: bankLabel })}
        </div>
      )}
    </div>
  );
}

function PaymentMethodVisual({ method }: { method?: string }) {
  return <VirtualAccountLogo method={method} />;
}

function QrisLogoPlaceholder() {
  const t = useTranslations("settings.topUpTokenDialog");
  return (
    <div className="grid h-24 w-24 place-items-center rounded-md border border-muted bg-muted/10 p-2 sm:h-52 sm:w-52 sm:p-4">
      <Image
        src="/qrislogo.png"
        alt={t("qrisLogoAlt")}
        width={180}
        height={180}
        className="h-auto w-full object-contain"
      />
    </div>
  );
}

function PaymentTextInstruction({
  action,
  value,
  method,
  onCopy,
  copyLabel,
}: {
  action: string;
  value: string;
  method?: string;
  onCopy: (value: string) => void;
  copyLabel: string;
}) {
  const t = useTranslations("settings.topUpTokenDialog");
  const label =
    action === "virtual-account"
      ? t("virtualAccountLabel", { bank: method?.toUpperCase() || "" }).trim()
      : action;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 text-center sm:gap-3">
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
      <CopyableCodeField
        value={value}
        onCopy={onCopy}
        copyLabel={copyLabel}
        className="mt-0"
        valueClassName="text-sm sm:text-lg"
      />
    </div>
  );
}

/** Kolom kode (VA / kode bayar) dengan tombol salin berbentuk icon di dalam kolom. */
function CopyableCodeField({
  value,
  onCopy,
  copyLabel,
  className,
  valueClassName,
}: {
  value: string;
  onCopy: (value: string) => void;
  copyLabel: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2 rounded-md border bg-background py-1.5 pl-3 pr-1.5 dark:border-zinc-700",
        className
      )}
    >
      <span
        className={cn(
          "min-w-0 flex-1 break-all text-left font-mono text-base font-semibold tracking-wide",
          valueClassName
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onCopy(value)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={copyLabel}
        title={copyLabel}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );
}

const PAYMENT_STEP_COUNT: Record<"virtualAccount" | "qris" | "redirect", number> = {
  virtualAccount: 6,
  qris: 6,
  redirect: 4,
};

/** Langkah-langkah pembayaran yang bisa dibuka/tutup, memakai teks checkout.Instructions.* */
function PaymentStepsCollapsible({
  kind,
}: {
  kind: "virtualAccount" | "qris" | "redirect";
}) {
  const tSteps = useTranslations("checkout.Instructions");
  const [isOpen, setIsOpen] = useState(false);
  const steps = Array.from({ length: PAYMENT_STEP_COUNT[kind] }, (_, i) => i + 1);

  return (
    <div className="overflow-hidden rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-blue-100/60 dark:hover:bg-blue-900/40"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-blue-900 dark:text-blue-100">
          <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          {tSteps("title")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-blue-700 transition-transform duration-200 dark:text-blue-300",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen ? (
        <div className="space-y-3 border-t border-blue-200 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:text-blue-200">
          <p className="font-semibold text-blue-900 dark:text-blue-100">
            {tSteps(`${kind}.title`)}
          </p>
          <ol className="space-y-2">
            {steps.map((n) => (
              <li key={n} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold leading-none text-white">
                  {n}
                </span>
                <span className="leading-relaxed">{tSteps(`${kind}.step${n}`)}</span>
              </li>
            ))}
          </ol>
          <p className="rounded-md bg-blue-100/70 px-3 py-2 text-xs text-blue-900 dark:bg-blue-900/40 dark:text-blue-100">
            {tSteps(`${kind}.note`)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
