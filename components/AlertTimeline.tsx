
import Link from "next/link";
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import type { Alert, EventKind } from "@/lib/types";
import { formatRelativeMinutes } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

const KIND_ICON: Record<EventKind, typeof AlertTriangle> = {
  HANG: AlertTriangle,
  CRASH: XCircle,
  WARNING: AlertTriangle,
  STOPPED: AlertTriangle,
  RECOVERED: CheckCircle2,
  STARTED: Info,
  NORMAL: Info,
};

const SEVERITY_TONE: Record<
  Alert["severity"],
  "online" | "warning" | "critical"
> = {
  info: "online",
  warning: "warning",
  critical: "critical",
};

export function AlertTimeline({
  alerts,
  emptyLabel = "No alerts to show",
}: {
  alerts: Alert[];
  emptyLabel?: string;
}) {
  if (alerts.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-[12px] text-base-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-base-700">
      {alerts.map((alert) => {
        const Icon = KIND_ICON[alert.type];

        return (
          <li
            key={alert.id}
            className="flex items-start gap-3 px-4 py-3"
          >
            <div
              className={
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded " +
                (alert.severity === "critical"
                  ? "bg-status-critical/12 text-status-critical"
                  : alert.severity === "warning"
                    ? "bg-status-warning/12 text-status-warning"
                    : "bg-status-online/12 text-status-online")
              }
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/clients/${alert.clientId}`}
                  className="truncate text-[12.5px] font-medium text-base-100 hover:text-accent"
                >
                  {alert.clientName}
                </Link>

                <span className="shrink-0 text-[11px] text-base-400">
                  {formatRelativeMinutes(alert.minutesAgo)}
                </span>
              </div>

              <p className="mt-0.5 truncate text-[12px] text-base-300">
                {alert.description}
              </p>
            </div>

            <StatusBadge
              tone={SEVERITY_TONE[alert.severity]}
              label={alert.type}
              className="shrink-0"
            />
          </li>
        );
      })}
    </ul>
  );
}