"use client";

import * as React from "react";
import {
  useContentSchedulerTimezoneGetTimezone,
  useContentSchedulerTimezoneUpsertTimezone,
} from "@/services/content/content.api";
import { useParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import { showToast } from "@/helper/show-toast";
import { useLibraryTime } from "@/services/library.api";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function TimezoneSelector() {
  const { businessId } = useParams() as { businessId: string };
  const { data: timezone } = useContentSchedulerTimezoneGetTimezone(businessId);
  const { data: libraryTimezone } = useLibraryTime();
  const timezones = React.useMemo(
    () => libraryTimezone?.data.data || [],
    [libraryTimezone?.data.data]
  );
  const mUpdateTimezone = useContentSchedulerTimezoneUpsertTimezone();
  const selectedTimezone = timezone?.data.data.timezone;
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const listboxId = React.useId();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const filteredTimezones = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return timezones;
    }

    return timezones.filter((timezone) => {
      const label = `(${timezone.offset}) ${timezone.name}`.toLowerCase();

      return (
        label.includes(query) ||
        timezone.name.toLowerCase().includes(query) ||
        timezone.offset.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, timezones]);

  const selectedTimezoneData = React.useMemo(
    () => timezones.find((timezone) => timezone.name === selectedTimezone),
    [selectedTimezone, timezones]
  );

  const onUpdate = async (value: string) => {
    try {
      const res = await mUpdateTimezone.mutateAsync({
        businessId,
        formData: {
          timezone: value,
        },
      });
      showToast("success", res.data.responseMessage);
    } catch {}
  };

  const handleSelectTimezone = (value: string) => {
    setIsOpen(false);
    setSearchQuery("");
    onUpdate(value);
  };

  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        dropdownRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
      setSearchQuery("");
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;

    const timeout = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen ? "true" : "false"}
        aria-haspopup="listbox"
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="truncate">
          {selectedTimezoneData
            ? `(${selectedTimezoneData.offset}) ${selectedTimezoneData.name}`
            : selectedTimezone || "Select timezone"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          <div className="border-b bg-popover p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search timezone..."
                className="h-9 pl-9"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsOpen(false);
                    setSearchQuery("");
                    triggerRef.current?.focus();
                  }
                }}
              />
            </div>
          </div>

          <div
            id={listboxId}
            className="max-h-72 overflow-y-auto p-1"
            role="listbox"
          >
            {filteredTimezones.length > 0 ? (
              filteredTimezones.map((timezone) => (
                <button
                  key={timezone.name}
                  type="button"
                  role="option"
                  aria-selected={selectedTimezone === timezone.name}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    selectedTimezone === timezone.name &&
                      "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleSelectTimezone(timezone.name)}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    {selectedTimezone === timezone.name && (
                      <Check className="h-4 w-4" />
                    )}
                  </span>
                  <span className="truncate">
                    ({timezone.offset}) {timezone.name}
                  </span>
                </button>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Timezone tidak ditemukan
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
