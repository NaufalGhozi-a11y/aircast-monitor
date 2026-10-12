
"use client";

import { useEffect, useState } from "react";
import { ClientDetail } from "@/components/ClientDetail";
import type {
  Client,
  MonitoringData,
  MonitoringEvent,
} from "@/lib/types";

type DiskDrive = {
  device?: string;
  name?: string;
  mountpoint?: string;
  mount_point?: string;
  total?: number;
  used?: number;
  free?: number;
  percent?: number;
  usage_percent?: number;
};

export default function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<any>(null);
  const [series, setSeries] = useState<MonitoringData[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadClient = async () => {
      try {
        const response = await fetch(
          `/api/clients/${params.id}`,
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Failed to load client."
          );
        }

        if (!mounted) return;

        setData(result);
        setError("");

        // Data live untuk grafik.
        const live = result.live ?? null;
        const metrics = Array.isArray(result.metrics)
          ? result.metrics
          : [];

        const current = live ?? metrics[0] ?? null;

        if (!current) return;

        const currentPoint: MonitoringData = {
          label: formatLocalTime(current.timestamp),
          cpu: Number(current.cpu_usage ?? 0),
          ram: Number(current.ram_usage ?? 0),
          disk: Number(current.disk_usage ?? 0),
        };

        setSeries((previous) => {
          // Muat riwayat incident saat pertama kali dibuka.
          if (previous.length === 0) {
            const history: MonitoringData[] = metrics
              .slice(0, 23)
              .reverse()
              .map((m: any) => ({
                label: formatLocalTime(m.timestamp),
                cpu: Number(m.cpu_usage ?? 0),
                ram: Number(m.ram_usage ?? 0),
                disk: Number(m.disk_usage ?? 0),
              }));

            return [...history, currentPoint].slice(-24);
          }

          // Tambahkan titik data live setiap polling.
          return [...previous, currentPoint].slice(-24);
        });
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load client."
          );
        }
      }
    };

    loadClient();

    // Perbarui data setiap 5 detik.
    const interval = setInterval(loadClient, 5_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [params.id]);

  if (!data) {
    return (
      <div className="text-[13px] text-base-400">
        {error || "Loading client…"}
      </div>
    );
  }

  const c = data.client;
  const live = data.live ?? null;

  const metrics = Array.isArray(data.metrics)
    ? data.metrics
    : [];

  const containers = Array.isArray(data.containers)
    ? data.containers
    : [];

  // Utamakan data live, gunakan metrics sebagai fallback.
  const latest = live ?? metrics[0] ?? {};

  const lastSeen = c.last_seen
    ? new Date(c.last_seen)
    : null;

  const version = data.aircastVersion || "—";

  const client: Client = {
    id: c.id,
    name: c.pc_name,
    displayName: c.pc_name,
    location: c.location || "—",
    clientType: c.client_type || "—",
    status: c.status,

    cpu: Number(latest.cpu_usage ?? 0),
    ram: Number(latest.ram_usage ?? 0),
    disk: Number(latest.disk_usage ?? 0),

    onAir:
      latest.onair_status === "running"
        ? "running"
        : "stopped",

    ip: c.ip_address || "—",
    agentVersion: c.agent_version || "—",
    aircastVersion: version,

    targetVersion: "—",
    updateStatus: "up-to-date",
    uptimeHours: 0,

    containerCount: containers.length,

    containers: containers.map((x: any) => ({
      name: x.container_name || "—",
      image: x.image || "—",
      status: x.status || "—",
      cpu: Number(x.cpu_usage ?? 0),
      memory: Number(x.memory_usage ?? 0),
      restartCount: Number(x.restart_count ?? 0),
      created: x.created_at
        ? formatLocalDate(x.created_at)
        : "—",
    })),

    lastSeenMinutesAgo: lastSeen
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - lastSeen.getTime()) / 60000
          )
        )
      : 999999,
  };

  const events: MonitoringEvent[] =
    Array.isArray(data.events)
      ? data.events.map((e: any) => ({
          id: String(e.id),
          kind: e.event_type,
          minutesAgo: Math.max(
            0,
            Math.floor(
              (Date.now() -
                new Date(e.created_at).getTime()) /
                60000
            )
          ),
          description: e.message || e.event_type,
        }))
      : [];

  // Ambil informasi storage dari data live.
  const diskDrives: DiskDrive[] = Array.isArray(
    live?.disk_drives
  )
    ? live.disk_drives
    : [];

  const diskActiveTime =
    typeof live?.disk_active_time === "number"
      ? live.disk_active_time
      : null;

  return (
    <ClientDetail
      client={client}
      series={series}
      events={events}
      diskDrives={diskDrives}
      diskActiveTime={diskActiveTime}
    />
  );
}

function formatLocalTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatLocalDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });
}