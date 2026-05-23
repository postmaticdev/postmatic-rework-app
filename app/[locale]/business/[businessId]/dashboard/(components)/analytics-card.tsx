import type { ReactNode } from "react";

interface AnalyticsCardProps {
  title: string;
  subtitle: string;
  value: string;
  breakdown?: Array<{ label: string; value: number; color: string }>;
  details?: Array<{ label: string; value: string }>;
  titleIcon?: ReactNode;
}

export function AnalyticsCard({
  title,
  subtitle,
  value,
  breakdown,
  details,
  titleIcon,
}: AnalyticsCardProps) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
      <div className="mb-1 flex items-center gap-2">
        {titleIcon && (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {titleIcon}
          </span>
        )}
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>

      <div className="text-3xl font-bold text-foreground mb-4">{value}</div>

      {breakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {breakdown.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
              <span className="text-muted-foreground">
                {item.label} ({item.value})
              </span>
            </div>
          ))}
        </div>
      )}

      {details && (
        <div className="space-y-1">
          {details.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
