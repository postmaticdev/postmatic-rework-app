"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { getCurrentScheduleInput } from "@/lib/schedule-date-time";

interface ScheduleTimeInputProps {
  date: string;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function ScheduleTimeInput({
  date,
  value,
  onValueChange,
  className,
  disabled,
}: ScheduleTimeInputProps) {
  const [currentMinimum, setCurrentMinimum] = useState(() =>
    getCurrentScheduleInput()
  );

  useEffect(() => {
    const updateMinimum = () => setCurrentMinimum(getCurrentScheduleInput());
    const intervalId = window.setInterval(updateMinimum, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const minTime = useMemo(
    () => (date === currentMinimum.date ? currentMinimum.time : undefined),
    [currentMinimum, date]
  );

  useEffect(() => {
    // Optionally we can auto-correct if it's strictly less than minTime on mount/update,
    // but doing it aggressively causes jumping.
    // If we want to ensure valid time when submitting, we should check there.
  }, [minTime, onValueChange, value]);

  return (
    <Input
      type="time"
      value={value}
      min={minTime}
      step={60}
      disabled={disabled}
      onChange={(event) => {
        onValueChange(event.target.value);
      }}
      onBlur={() => {
        if (minTime && value && value < minTime) {
          onValueChange(minTime);
        }
      }}
      className={className}
    />
  );
}
