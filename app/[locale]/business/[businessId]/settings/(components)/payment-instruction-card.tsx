"use client";

import { Button } from "@/components/ui/button";
import { formatIdr } from "@/helper/formatter";
import { cn } from "@/lib/utils";
import { CheckCircle2, Copy, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

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
  expiresAtLabel?: string;
  paymentCountdown: PaymentCountdown;
  paymentActions: PaymentAction[];
  method?: string;
  isPending: boolean;
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
};

const getBankLogoByMethod = (method?: string) => {
  const normalized = (method || "").toLowerCase().replace(/[\s_-]/g, "");
  return BANK_LOGO_BY_METHOD[normalized];
};

const getBankLabelByMethod = (method?: string) =>
  (method || "Bank").replace(/[_-]/g, " ").toUpperCase();

const getPaymentCardClassName = (status?: string) => {
  if (status === "Pending" || !status) {
    return "border-amber-300 bg-amber-50/45 dark:border-amber-700 dark:bg-amber-950/20";
  }
  if (status === "Success") {
    return "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/20";
  }
  return "border-border bg-muted/20 dark:bg-zinc-900/60";
};

export function PaymentInstructionCard({
  status,
  statusTitle,
  statusDescription,
  totalAmount,
  expiresAtLabel,
  paymentCountdown,
  paymentActions,
  method,
  isPending,
  isRefreshing = false,
  onRefresh,
  onCopy,
}: PaymentInstructionCardProps) {
  const t = useTranslations("settings.topUpTokenDialog");
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

  const hasPaymentInstruction =
    isPending && Boolean(qrCodeAction || virtualAccountAction || textPaymentAction);
  const instructionBoxClassName =
    "grid h-28 w-28 shrink-0 place-items-center self-start rounded-md border bg-white p-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:h-56 sm:w-56 sm:p-3";

  return (
    <div
      className={cn("space-y-4 rounded-lg border p-5", getPaymentCardClassName(status))}
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
        </div>

        {hasPaymentInstruction ? (
          qrCodeAction ? (
            <a
              href={qrCodeAction.value}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                instructionBoxClassName,
                "cursor-zoom-in transition-opacity hover:opacity-90"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeAction.value}
                alt={t("qrisAlt")}
                className="h-24 w-24 object-contain sm:h-52 sm:w-52"
              />
            </a>
          ) : (
            <div className={instructionBoxClassName}>
              {virtualAccountAction ? (
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
                <div className="grid h-24 w-24 place-items-center text-center text-[10px] text-muted-foreground sm:h-52 sm:w-52 sm:text-sm">
                  {t("instructionUnavailable")}
                </div>
              )}
            </div>
          )
        ) : (
          <div className="grid h-28 w-28 shrink-0 place-items-center self-start rounded-md border bg-white p-2 text-center dark:border-zinc-700 dark:bg-zinc-900 sm:h-40 sm:w-56 sm:p-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 sm:h-24 sm:w-24" />
          </div>
        )}
      </div>

      {isPending && virtualAccountAction ? (
        <div className="mt-2 flex flex-col gap-2 rounded-lg border bg-white/80 p-2 dark:border-zinc-700 dark:bg-zinc-900/70 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 font-mono text-base font-semibold tracking-wide dark:border-zinc-700">
            {virtualAccountAction.value}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => onCopy(virtualAccountAction.value)}
            className="w-full sm:w-auto"
          >
            <Copy className="h-4 w-4" />
            {t("copy")}
          </Button>
        </div>
      ) : null}

      {isPending && onRefresh ? (
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          {t("checkPaymentStatus")}
        </Button>
      ) : null}
    </div>
  );
}

function VirtualAccountLogo({ method }: { method?: string }) {
  const logoSrc = getBankLogoByMethod(method);
  const bankLabel = getBankLabelByMethod(method);

  return (
    <div className="grid h-24 w-24 place-items-center rounded-md border border-muted bg-muted/10 p-2 sm:h-52 sm:w-52 sm:p-4">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={`Logo ${bankLabel}`}
          width={180}
          height={90}
          className="h-auto w-full object-contain"
        />
      ) : (
        <div className="text-center text-base font-semibold text-muted-foreground">
          Virtual Account {bankLabel}
        </div>
      )}
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
  const label =
    action === "virtual-account"
      ? `Virtual Account ${method?.toUpperCase() || ""}`.trim()
      : action;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 text-center sm:gap-3">
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
      <div className="rounded-lg border bg-muted/20 px-2 py-2 sm:px-4 sm:py-3">
        <p className="break-all font-mono text-sm font-semibold text-foreground sm:text-lg">
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => onCopy(value)}
        className="h-8 w-full text-xs sm:h-10 sm:text-sm"
      >
        <Copy className="h-4 w-4" />
        {copyLabel}
      </Button>
    </div>
  );
}
