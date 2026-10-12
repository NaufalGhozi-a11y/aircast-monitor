"use client";

import Link from "next/link";
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/StatCard";
import { MonitoringChart } from "@/components/MonitoringChart";
import { StatusDistributionChart } from "@/components/StatusDistributionChart";
import { AlertTimeline } from "@/components/AlertTimeline";
import { ClientCard } from "@/components/ClientCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { Client } from "@/lib/types";
import { alerts } from "@/lib/mock-data";

type DashboardData = {
  summary: {
    total: number;
    online: number;
    warning: number;
    offline: number;
    unknown: number;
  };

  statusDistribution: {
    key: string;
    name: string;
    value: number;
  }[];

  clients: Client[];

  fleet: {
    averageCpu: number;
    averageRam: number;

    history: {
      timestamp: string;
      cpu: number;
      ram: number;
    }[];
  };
};

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ==================================================
  // LOAD DASHBOARD
  // ==================================================

  async function loadDashboard() {
    try {
      setError("");

      const response =
        await fetch(
          "/api/dashboard",
          {
            cache: "no-store",
          }
        );

      const text =
        await response.text();

      let result: any;

      try {
        result = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          `Dashboard API returned invalid JSON (HTTP ${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            "Failed to load dashboard."
        );
      }

      setData(result);
    } catch (error) {
      console.error(
        "Dashboard loading error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // AUTO REFRESH
  // ==================================================

  useEffect(() => {
    loadDashboard();

    const interval =
      setInterval(
        loadDashboard,
        30_000
      );

    return () =>
      clearInterval(interval);
  }, []);

  // ==================================================
  // DEFAULT VALUES
  // ==================================================

  const summary =
    data?.summary ?? {
      total: 0,
      online: 0,
      warning: 0,
      offline: 0,
      unknown: 0,
    };

  const dashboardClients =
    data?.clients ?? [];

  const statusDistribution =
    data?.statusDistribution ??
    [];

  const fleetHistory =
    data?.fleet?.history ??
    [];

  // ==================================================
  // CHART DATA
  // ==================================================

  /*
   * MonitoringChart memakai tipe MonitoringData
   * yang juga memiliki property "disk".
   *
   * Chart dashboard hanya memakai CPU/RAM,
   * sehingga disk diberi nilai 0 sebagai property
   * pelengkap dan tidak pernah ditampilkan.
   */

  const chartData =
    fleetHistory.map(
      (item) => ({
        label:
          formatChartTime(
            item.timestamp
          ),

        cpu: item.cpu,

        ram: item.ram,

        disk: 0,
      })
    );

  // ==================================================
  // CLIENT OVERVIEW
  // ==================================================

  const overviewClients = [
    ...dashboardClients.filter(
      (client) =>
        client.status ===
        "offline"
    ),

    ...dashboardClients.filter(
      (client) =>
        client.status ===
        "warning"
    ),

    ...dashboardClients.filter(
      (client) =>
        client.status ===
        "online"
    ),

    ...dashboardClients.filter(
      (client) =>
        client.status ===
        "unknown"
    ),
  ].slice(0, 8);

  // ==================================================
  // LOADING
  // ==================================================

  if (
    loading &&
    !data
  ) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Clients"
            value={0}
            icon={Server}
            tone="neutral"
            hint="Registered PCs"
          />

          <StatCard
            label="Online"
            value={0}
            icon={CheckCircle2}
            tone="online"
            hint="Healthy right now"
          />

          <StatCard
            label="Warning"
            value={0}
            icon={AlertTriangle}
            tone="warning"
            hint="Needs attention"
          />

          <StatCard
            label="Offline"
            value={0}
            icon={XCircle}
            tone="critical"
            hint="Unreachable"
          />
        </div>

        <p className="text-[12px] text-base-400">
          Loading dashboard data…
        </p>
      </div>
    );
  }

  // ==================================================
  // DASHBOARD
  // ==================================================

  return (
    <div className="space-y-5">

      {/* ERROR */}

      {error && (
        <div className="rounded border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-[12px] text-status-critical">
          {error}
        </div>
      )}

      {/* ==================================================
          TOP SUMMARY CARDS
          ================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          label="Total Clients"
          value={
            summary.total
          }
          icon={Server}
          tone="neutral"
          hint="Registered PCs"
        />

        <StatCard
          label="Online"
          value={
            summary.online
          }
          icon={CheckCircle2}
          tone="online"
          hint="Healthy right now"
        />

        <StatCard
          label="Warning"
          value={
            summary.warning
          }
          icon={AlertTriangle}
          tone="warning"
          hint="Needs attention"
        />

        <StatCard
          label="Offline"
          value={
            summary.offline
          }
          icon={XCircle}
          tone="critical"
          hint="Unreachable"
        />

      </div>

      {/* ==================================================
          CPU / RAM / STATUS
          ================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* CPU */}

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              CPU Usage Overview
            </CardTitle>

            <span className="text-[11px] text-base-400">
              Fleet average · 24h
            </span>
          </CardHeader>

          <CardContent>
            <MonitoringChart
              data={
                chartData
              }
              metrics={[
                {
                  key: "cpu",
                  label: "CPU",
                  color: "#4C8DFF",
                },
              ]}
              height={200}
            />
          </CardContent>
        </Card>

        {/* RAM */}

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              RAM Usage Overview
            </CardTitle>

            <span className="text-[11px] text-base-400">
              Fleet average · 24h
            </span>
          </CardHeader>

          <CardContent>
            <MonitoringChart
              data={
                chartData
              }
              metrics={[
                {
                  key: "ram",
                  label: "RAM",
                  color: "#7CAEFF",
                },
              ]}
              height={200}
            />
          </CardContent>
        </Card>

        {/* STATUS */}

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              Client Status Distribution
            </CardTitle>
          </CardHeader>

          <CardContent className="flex items-center justify-center">
            <StatusDistributionChart
              data={
                statusDistribution
              }
              totalClients={
                summary.total
              }
            />
          </CardContent>
        </Card>

      </div>

      {/* ==================================================
          ALERTS / CLIENT OVERVIEW
          ================================================== */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* ALERTS */}

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>
              Recent Alerts
            </CardTitle>

            <Link
              href="/alerts"
              className="flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-bright"
            >
              View all

              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>

          <div className="max-h-[440px] overflow-y-auto">
            <AlertTimeline
              alerts={
                alerts.slice(
                  0,
                  8
                )
              }
            />
          </div>
        </Card>

        {/* CLIENT OVERVIEW */}

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>
              Client Overview
            </CardTitle>

            <Link
              href="/clients"
              className="flex items-center gap-1 text-[12px] font-medium text-accent hover:text-accent-bright"
            >
              View all clients

              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {overviewClients.map(
              (client) => (
                <ClientCard
                  key={
                    client.id
                  }
                  client={
                    client
                  }
                />
              )
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// ==================================================
// FORMAT WAKTU CHART
// ==================================================

function formatChartTime(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  );
}