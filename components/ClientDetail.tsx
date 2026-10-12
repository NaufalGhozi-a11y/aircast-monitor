
import Link from "next/link";
import {
  ArrowLeft,
  Cpu,
  MemoryStick,
  HardDrive,
  MapPin,
  Radio,
  Database,
  Activity,
  Gauge,
} from "lucide-react";
import type { Client, MonitoringData, MonitoringEvent } from "@/lib/types";
import {
  StatusBadge,
  clientStatusTone,
  onAirTone,
  updateStatusTone,
  eventKindTone,
} from "@/components/StatusBadge";
import { ResourceUsage } from "@/components/ResourceUsage";
import { MonitoringChart } from "@/components/MonitoringChart";
import { ContainerTable } from "@/components/ContainerTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeMinutes, formatUptime } from "@/lib/utils";

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
  total_bytes?: number;
  used_bytes?: number;
  free_bytes?: number;
  total_gb?: number;
  used_gb?: number;
  free_gb?: number;
};

type ClientDetailProps = {
  client: Client;
  series?: MonitoringData[];
  events?: MonitoringEvent[];
  diskDrives?: DiskDrive[];
  diskActiveTime?: number | null;
};

function formatBytes(bytes?: number | null) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) {
    return "—";
  }

  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}

function formatGB(value?: number | null) {
  if (value == null || !Number.isFinite(value) || value < 0) {
    return "—";
  }

  return `${value.toFixed(2)} GB`;
}

function getCapacity(
  drive: DiskDrive,
  type: "total" | "used" | "free"
) {
  const gbKey = `${type}_gb` as
    | "total_gb"
    | "used_gb"
    | "free_gb";
  const bytesKey = `${type}_bytes` as
    | "total_bytes"
    | "used_bytes"
    | "free_bytes";

  // Prioritaskan data dalam GB jika tersedia.
  if (typeof drive[gbKey] === "number") {
    return formatGB(drive[gbKey]);
  }

  // Jika tersedia dalam byte, konversikan ke satuan yang sesuai.
  if (typeof drive[bytesKey] === "number") {
    return formatBytes(drive[bytesKey]);
  }

  // Fallback ke properti umum dari agent.
  const value = drive[type];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return formatBytes(value);
}

function getDrivePercent(drive: DiskDrive) {
  const value = drive.percent ?? drive.usage_percent;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, value));
  }

  const total = drive.total_bytes ?? drive.total;
  const used = drive.used_bytes ?? drive.used;

  if (
    typeof total === "number" &&
    total > 0 &&
    typeof used === "number"
  ) {
    return Math.max(0, Math.min(100, (used / total) * 100));
  }

  if (
    typeof drive.total_gb === "number" &&
    drive.total_gb > 0 &&
    typeof drive.used_gb === "number"
  ) {
    return Math.max(
      0,
      Math.min(100, (drive.used_gb / drive.total_gb) * 100)
    );
  }

  return null;
}

function getDriveName(drive: DiskDrive, index: number) {
  return (
    drive.mountpoint ||
    drive.mount_point ||
    drive.device ||
    drive.name ||
    `Drive ${index + 1}`
  );
}

function getUsageColor(value: number | null) {
  if (value == null) return "bg-base-600";
  if (value >= 90) return "bg-status-critical";
  if (value >= 75) return "bg-status-warning";
  return "bg-status-online";
}

function getActivityLabel(value: number | null) {
  if (value == null) return "Unavailable";
  if (value >= 90) return "Very high";
  if (value >= 70) return "High";
  if (value >= 30) return "Moderate";
  return "Low";
}

export function ClientDetail({
  client,
  series = [],
  events = [],
  diskDrives = [],
  diskActiveTime = null,
}: ClientDetailProps) {
  const activeTime =
    typeof diskActiveTime === "number" &&
    Number.isFinite(diskActiveTime)
      ? Math.max(0, Math.min(100, diskActiveTime))
      : null;

  return (
    <div className="space-y-5">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-base-400 hover:text-base-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to PC Clients
      </Link>

      {/* Client header */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-[18px] font-semibold text-base-50">
                {client.displayName}
              </h2>
              <StatusBadge
                tone={clientStatusTone(client.status)}
                label={client.status}
                className="capitalize"
              />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-base-400">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {client.location}
              </span>
              <span>
                Last seen {formatRelativeMinutes(client.lastSeenMinutesAgo)}
              </span>
              <span className="font-mono">{client.ip}</span>
              <span>Agent v{client.agentVersion}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded border border-base-600 bg-base-850 px-3 py-2">
            <Radio className="h-4 w-4 text-base-400" />
            <div className="text-[12px]">
              <div className="text-base-400">OnAir process</div>
              <StatusBadge
                tone={onAirTone(client.onAir)}
                label={client.onAir}
                className="mt-0.5 capitalize"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* System overview */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-base-400" />
          <h3 className="text-sm font-semibold text-base-100">
            System Overview
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-[11px] text-base-400">
              <Cpu className="h-3.5 w-3.5" />
              CPU Usage
            </div>
            <ResourceUsage label="" value={client.cpu} className="mt-2" />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-[11px] text-base-400">
              <MemoryStick className="h-3.5 w-3.5" />
              RAM Usage
            </div>
            <ResourceUsage label="" value={client.ram} className="mt-2" />
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-[11px] text-base-400">
              <HardDrive className="h-3.5 w-3.5" />
              Disk Usage
            </div>
            <ResourceUsage label="" value={client.disk} className="mt-2" />
          </Card>
        </div>
      </div>

      {/* Storage and disk activity */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-base-400" />
            <h3 className="text-sm font-semibold text-base-100">
              Storage & Disk Activity
            </h3>
          </div>
          <span className="text-[11px] text-base-400">
            {diskDrives.length} drives detected
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Disk activity card */}
          <Card className="relative overflow-hidden p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] text-base-400">
                <Gauge className="h-4 w-4" />
                Disk Active Time
              </div>
              <span className="rounded-full border border-base-600 bg-base-850 px-2 py-1 text-[10px] text-base-300">
                Live
              </span>
            </div>

            <div className="mt-5 flex items-end gap-2">
              <span className="font-mono text-3xl font-semibold tracking-tight text-base-50">
                {activeTime == null ? "—" : `${activeTime.toFixed(1)}%`}
              </span>
              {activeTime != null && (
                <span className="mb-1 text-[11px] text-base-400">
                  {getActivityLabel(activeTime)}
                </span>
              )}
            </div>

            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-base-700">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeTime == null
                    ? "bg-base-600"
                    : activeTime >= 90
                    ? "bg-status-critical"
                    : activeTime >= 70
                    ? "bg-status-warning"
                    : "bg-status-online"
                }`}
                style={{ width: `${activeTime ?? 0}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-[10px] text-base-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-base-400">
              Persentase waktu disk sedang melakukan aktivitas.
            </p>
          </Card>

          {/* Individual drives */}
          {diskDrives.map((drive, index) => {
            const percent = getDrivePercent(drive);
            const name = getDriveName(drive, index);

            return (
              <Card key={`${name}-${index}`} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="rounded-md border border-base-600 bg-base-850 p-2">
                      <HardDrive className="h-4 w-4 text-base-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-base-100">
                        {name}
                      </div>
                      <div className="text-[10px] text-base-500">
                        Storage capacity
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-medium text-base-100">
                    {percent == null ? "—" : `${percent.toFixed(1)}%`}
                  </span>
                </div>

                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-base-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getUsageColor(percent)}`}
                    style={{ width: `${percent ?? 0}%` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-base-700 bg-base-850/60 p-3">
                    <div className="text-[10px] text-base-400">
                      Used
                    </div>
                    <div className="mt-1 break-words font-mono text-sm font-semibold text-base-100">
                      {getCapacity(drive, "used")}
                    </div>
                  </div>
                  <div className="rounded-md border border-base-700 bg-base-850/60 p-3">
                    <div className="text-[10px] text-base-400">
                      Free
                    </div>
                    <div className="mt-1 break-words font-mono text-sm font-semibold text-base-100">
                      {getCapacity(drive, "free")}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-base-700 pt-3">
                  <span className="text-[11px] text-base-400">
                    Total capacity
                  </span>
                  <span className="font-mono text-xs font-medium text-base-100">
                    {getCapacity(drive, "total")}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {diskDrives.length === 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-base-600 p-5 text-center">
            <HardDrive className="mx-auto h-6 w-6 text-base-500" />
            <p className="mt-2 text-xs text-base-300">
              No drive information available.
            </p>
            <p className="mt-1 text-[11px] text-base-500">
              Check the disk_drives data from the agent.
            </p>
          </div>
        )}
      </div>

      {/* Monitoring history */}
      <div>
        <div className="mb-3 text-sm font-semibold text-base-100">
          Monitoring History
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>CPU Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <MonitoringChart
                data={series}
                metrics={[{ key: "cpu", label: "CPU", color: "#4C8DFF" }]}
                height={180}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>RAM Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <MonitoringChart
                data={series}
                metrics={[{ key: "ram", label: "RAM", color: "#2FBF71" }]}
                height={180}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disk Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <MonitoringChart
                data={series}
                metrics={[{ key: "disk", label: "Disk", color: "#E8A33D" }]}
                height={180}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AirCast and events */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>AirCast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base-400">OnAir status</span>
              <StatusBadge
                tone={onAirTone(client.onAir)}
                label={client.onAir}
                className="capitalize"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-base-400">AirCast version</span>
              <span className="font-mono text-base-100">
                v{client.aircastVersion}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-base-400">Target version</span>
              <span className="font-mono text-base-100">
                v{client.targetVersion}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-base-400">Update status</span>
              <StatusBadge
                tone={updateStatusTone(client.updateStatus)}
                label={client.updateStatus.replace("-", " ")}
                className="capitalize"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Monitoring Events</CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="py-4 text-center text-xs text-base-400">
                No monitoring events available.
              </p>
            ) : (
              <ol className="space-y-0">
                {events.map((event, idx) => (
                  <li
                    key={event.id}
                    className="relative flex gap-3 pb-4 last:pb-0"
                  >
                    {idx !== events.length - 1 && (
                      <span className="absolute left-[5px] top-3 h-full w-px bg-base-700" />
                    )}
                    <span
                      className={
                        "relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-base-900 " +
                        (eventKindTone(event.kind) === "online"
                          ? "bg-status-online"
                          : eventKindTone(event.kind) === "warning"
                          ? "bg-status-warning"
                          : "bg-status-critical")
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge
                          tone={eventKindTone(event.kind)}
                          label={event.kind}
                        />
                        <span className="shrink-0 text-[11px] text-base-400">
                          {formatRelativeMinutes(event.minutesAgo)}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] text-base-300">
                        {event.description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Containers */}
      <Card>
        <CardHeader>
          <CardTitle>Containers</CardTitle>
          <span className="text-[11px] text-base-400">
            {client.containers.length} tracked
          </span>
        </CardHeader>
        <ContainerTable containers={client.containers} />
      </Card>
    </div>
  );
}