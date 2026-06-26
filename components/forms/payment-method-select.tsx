"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type PaymentMethodSelectOption = {
  code: string;
  name: string;
  type: string;
  image?: string;
};

type PaymentMethodSelectProps = {
  value: string;
  options: PaymentMethodSelectOption[];
  disabled?: boolean;
  placeholder: string;
  onValueChange: (value: string) => void;
};

const PAYMENT_LOGO_BY_METHOD: Record<string, string> = {
  bca: "/bca.png",
  bni: "/bni.png",
  mandiri: "/mandiri.png",
  permata: "/permata.png",
  cimb: "/cimbniaga.png",
  cimbniaga: "/cimbniaga.png",
  gopay: "/gopay-logo.png",
  qris: "/qrislogo.png",
};

const normalizePaymentMethod = (method?: string) =>
  (method || "").toLowerCase().replace(/[\s_-]/g, "");

const getPaymentLogo = (method: PaymentMethodSelectOption) =>
  PAYMENT_LOGO_BY_METHOD[normalizePaymentMethod(method.code)] ||
  PAYMENT_LOGO_BY_METHOD[normalizePaymentMethod(method.name)];

const getPaymentMethodLabel = (method: PaymentMethodSelectOption) =>
  `${method.name} - ${method.type}`;

function PaymentMethodLogo({ method }: { method: PaymentMethodSelectOption }) {
  const logoSrc = getPaymentLogo(method);

  return (
    <span className="flex h-7 w-10 shrink-0 items-center justify-center rounded-md bg-white p-1 shadow-sm ring-1 ring-black/5">
      {logoSrc ? (
        <Image
          src={logoSrc}
          alt={`Logo ${method.name}`}
          width={36}
          height={24}
          className="max-h-5 w-auto object-contain"
        />
      ) : (
        <span className="text-[10px] font-semibold text-muted-foreground">
          {method.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

function PaymentMethodLabel({ method }: { method: PaymentMethodSelectOption }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <PaymentMethodLogo method={method} />
      <span className="truncate">{getPaymentMethodLabel(method)}</span>
    </span>
  );
}

export function PaymentMethodSelect({
  value,
  options,
  disabled = false,
  placeholder,
  onValueChange,
}: PaymentMethodSelectProps) {
  const selectedOption = options.find((method) => method.code === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between border-input bg-background px-3 font-normal text-foreground hover:bg-background"
          disabled={disabled || options.length === 0}
        >
          {selectedOption ? (
            <PaymentMethodLabel method={selectedOption} />
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {options.map((method) => (
          <DropdownMenuItem
            key={method.code}
            textValue={getPaymentMethodLabel(method)}
            className={cn(
              "gap-3 py-2",
              value === method.code && "bg-accent text-accent-foreground"
            )}
            onSelect={() => onValueChange(method.code)}
          >
            <PaymentMethodLabel method={method} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
