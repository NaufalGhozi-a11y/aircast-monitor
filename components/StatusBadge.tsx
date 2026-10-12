
import { cn } from "@/lib/utils";

export type StatusTone =
  | "online"
  | "warning"
  | "critical"
  | "unknown";

const TONE_STYLES: Record<StatusTone, string> = {
  online: "bg-status-online/12 text-status-online",
  warning: "bg-status-warning/12 text-status-warning",
  critical: "bg-status-critical/12 text-status-critical",
  unknown: "bg-status-unknown/15 text-base-300",
};

const DOT_STYLES: Record<StatusTone, string> = {
  online: "bg-status-online",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
  unknown: "bg-status-unknown",
};

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

export function StatusBadge({
  tone,
  label,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium",
        TONE_STYLES[tone],
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          DOT_STYLES[tone]
        )}
      />
      {label}
    </span>
  );
}

// Client status
export function clientStatusTone(
  status: "online" | "warning" | "offline" | "unknown"
): StatusTone {
  if (status === "online") return "online";
  if (status === "warning") return "warning";
  if (status === "offline") return "critical";
  return "unknown";
}

// OnAir status
export function onAirTone(
  onAir: "running" | "stopped"
): StatusTone {
  return onAir === "running" ? "online" : "unknown";
}

// Container status
export function containerStatusTone(
  status: "running" | "restarting" | "exited"
): StatusTone {
  if (status === "running") return "online";
  if (status === "restarting") return "warning";
  return "critical";
}

// Update status
export function updateStatusTone(
  status: "up-to-date" | "update-available" | "updating"
): StatusTone {
  if (status === "up-to-date") return "online";
  if (status === "updating") return "warning";
  return "unknown";
}

// Monitoring event
export function eventKindTone(
  kind: string
): StatusTone {
  const event = kind.trim().toUpperCase();

  switch (event) {
    case "NORMAL":
    case "STARTED":
    case "RECOVERED":
      return "online";

    case "WARNING":
    case "HANG":
      return "warning";

    case "STOPPED":
    case "CRASH":
      return "critical";

    default:
      return "unknown";
  }
}