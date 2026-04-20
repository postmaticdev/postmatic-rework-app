"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import "flag-icons/css/flag-icons.min.css";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";

type LocaleItem = { label: string; value: string; flag: string };

const LOCALES: LocaleItem[] = [
  { label: "ID", value: "id", flag: "fi fi-id" },
  { label: "EN", value: "en", flag: "fi fi-us" }, 
];

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const active = LOCALES.find((l) => l.value === locale);
  const triggerLabel = active?.label ?? locale?.toUpperCase() ?? "ID";
  const triggerFlag = active?.flag ?? "fi fi-xx";

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const changeLocale = async (next: string) => {
    if (!next || next === locale) return;
    router.replace(pathname, { locale: next });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 gap-2"
          aria-label="Choose language"
        >
          <span className={`fi ${triggerFlag}`}></span>
          <span className="font-medium">{triggerLabel}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Pilih Bahasa / Choose Language</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => {
          const selected = l.value === locale;
          return (
            <DropdownMenuItem
              key={l.value}
              role="menuitemradio"
              aria-checked={selected}
              onClick={() => changeLocale(l.value)}
              className="flex items-center gap-2"
            >
              <span className={`fi ${l.flag ?? "fi-xx"}`}></span>
              <span className="flex-1">{l.label}</span>
              <Check
                className={`h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`}
              />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
