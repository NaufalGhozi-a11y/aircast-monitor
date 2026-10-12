import { cn, formatPercent } from "@/lib/utils";

interface ResourceUsageProps {
  label: string;
  value: number;
  className?: string;
}

function toneForValue(value: number) {
  if (value >= 85) return { bar: "bg-status-critical", text: "text-status-critical" };
  if (value >= 70) return { bar: "bg-status-warning", text: "text-status-warning" };
  return { bar: "bg-status-online", text: "text-status-online" };
}

export function ResourceUsage({ label, value, className }: ResourceUsageProps) {
  const tone = toneForValue(value);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-base-300">{label}</span>
        <span className={cn("font-mono font-medium", tone.text)}>
          {formatPercent(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-700">
        <div
          className={cn("h-full rounded-full", tone.bar)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
