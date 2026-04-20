"use client";

import { Info } from "lucide-react";

interface CurrencyDropdownProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  onFocus?: () => void;
  disabled?: boolean;
}

const CURRENCIES = [
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "VND", name: "Vietnamese Dong", symbol: "₫" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "MXN", name: "Mexican Peso", symbol: "$" },
];

export function CurrencyDropdown({
  value,
  onChange,
  placeholder = "Pilih mata uang",
  disabled = false,
  error,
  onFocus,
}: CurrencyDropdownProps) {
  return (
    <div className="space-y-1">
      <select
        className={`flex p-2 h-10 w-full items-center rounded-md border bg-background dark:bg-card text-sm shadow-xs ring-offset-background transition-[color,box-shadow] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? "border-red-500 focus:ring-red-500" : "border-input focus:ring-ring"
        }`}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        disabled={disabled}
        aria-invalid={!!error}
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {CURRENCIES.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {`${currency.symbol} ${currency.code} - ${currency.name}`}
          </option>
        ))}
      </select>
      {error && (
        <div className="flex items-center gap-1">
          <Info className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
    </div>
  );
}
