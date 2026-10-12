import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "neutral" | "online" | "warning" | "critical";
  hint?: string;
}

const TONE_ICON: Record<StatCardProps["tone"], string> = {
  neutral: "bg-base-700 text-base-200",
  online: "bg-status-online/12 text-status-online",
  warning: "bg-status-warning/12 text-status-warning",
  critical: "bg-status-critical/12 text-status-critical",
};

export function StatCard({ label, value, icon: Icon, tone, hint }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[12px] font-medium text-base-300">{label}</div>
          <div className="mt-1.5 font-mono text-[26px] font-semibold leading-none text-base-50">
            {value}
          </div>
          {hint && <div className="mt-1.5 text-[11px] text-base-400">{hint}</div>}
        </div>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded", TONE_ICON[tone])}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
      </div>
    </Card>
  );
}
