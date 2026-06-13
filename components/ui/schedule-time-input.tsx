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
    if (minTime && value && value < minTime) {
      onValueChange(minTime);
    }
  }, [minTime, onValueChange, value]);

  return (
    <Input
      type="time"
      value={value}
      min={minTime}
      step={60}
      disabled={disabled}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (minTime && nextValue && nextValue < minTime) return;
        onValueChange(nextValue);
      }}
      className={className}
    />
  );
}
