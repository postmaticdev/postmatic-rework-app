"use client";

import { Input } from "@/components/ui/input";

interface TimeInputProps {
  hour: string;
  minute: string;
  onHourChange: (value: string) => void;
  onMinuteChange: (value: string) => void;
  className?: string;
}

export function TimeInput({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
  className = "",
}: TimeInputProps) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Input
        type="number"
        placeholder="09"
        value={hour}
        onChange={(e) => onHourChange(e.target.value)}
        className="w-16 text-center"
        min="0"
        max="23"
        autoFocus={false}
      />
      <span className="text-muted-foreground">:</span>
      <Input
        type="number"
        placeholder="00"
        value={minute}
        onChange={(e) => onMinuteChange(e.target.value)}
        className="w-16 text-center"
        min="0"
        max="59"
        autoFocus={false}
      />
    </div>
  );
}
