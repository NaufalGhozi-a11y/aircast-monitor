
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTimeline } from "@/components/AlertTimeline";
import type { Alert } from "@/lib/types";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const response = await fetch("/api/alerts", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal mengambil data alerts.");
        }

        const data = await response.json();

        if (active) {
          setAlerts(data.alerts ?? []);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const critical = alerts.filter(
    (alert) => alert.severity === "critical"
  );

  const warning = alerts.filter(
    (alert) => alert.severity === "warning"
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-[12px] text-base-400">
            Total alerts
          </div>
          <div className="mt-1 font-mono text-[22px] font-semibold text-base-50">
            {loading ? "—" : alerts.length}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[12px] text-base-400">
            Critical
          </div>
          <div className="mt-1 font-mono text-[22px] font-semibold text-status-critical">
            {loading ? "—" : critical.length}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-[12px] text-base-400">
            Warning
          </div>
          <div className="mt-1 font-mono text-[22px] font-semibold text-status-warning">
            {loading ? "—" : warning.length}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex w-full items-center justify-between gap-3">
            <CardTitle>All Alerts</CardTitle>
            <span className="flex items-center gap-1.5 text-[11px] text-base-400">
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
              />
              Auto refresh · 15s
            </span>
          </div>
        </CardHeader>

        {error && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded border border-status-critical/30 bg-status-critical/5 px-3 py-2 text-[12px] text-status-critical">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <AlertTimeline
          alerts={alerts}
          emptyLabel={
            loading
              ? "Loading alerts..."
              : error
                ? "Alerts could not be loaded"
                : "No alerts to show"
          }
        />
      </Card>
    </div>
  );
}