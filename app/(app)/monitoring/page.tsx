
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { ResourceUsage } from "@/components/ResourceUsage";

import {
  StatusBadge,
  clientStatusTone,
} from "@/components/StatusBadge";

import type { Client } from "@/lib/types";
import { formatRelativeMinutes } from "@/lib/utils";

export default function MonitoringPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadClients = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/clients", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error || "Failed to load monitoring data."
        );
      }

      if (!Array.isArray(result)) {
        throw new Error("Invalid clients API response.");
      }

      setClients(result.map(toClient));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load monitoring data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClients();

    const interval = setInterval(() => {
      void loadClients();
    }, 30_000);

    return () => clearInterval(interval);
  }, [loadClients]);

  // Hanya client online dan warning yang masuk
  // ke daftar penggunaan resource saat ini.
  const attention = [...clients]
    .filter(
      (client) =>
        client.status === "online" ||
        client.status === "warning"
    )
    .sort(
      (a, b) =>
        Math.max(b.cpu, b.ram, b.disk) -
        Math.max(a.cpu, a.ram, a.disk)
    )
    .slice(0, 10);

  const totalContainers = clients.reduce(
    (total, client) => total + client.containerCount,
    0
  );

  const clientsWithContainers = clients.filter(
    (client) => client.containerCount > 0
  ).length;

  const onlineClients = clients.filter(
    (client) =>
      client.status === "online" ||
      client.status === "warning"
  ).length;

  return (
    <div className="space-y-4">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] text-base-400">
            Live infrastructure monitoring
          </p>

          <p className="mt-1 text-[11px] text-base-500">
            Auto refresh every 30 seconds
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void loadClients()}
          disabled={loading}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              loading ? "animate-spin" : ""
            }`}
          />

          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="rounded border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-[12px] text-status-critical"
        >
          {error}
        </div>
      )}

      {/* MONITORING CONTENT */}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">

        {/* NEEDS ATTENTION */}

        <Card className="xl:col-span-2">

          <CardHeader>
            <CardTitle>
              Needs Attention
            </CardTitle>

            <span className="text-[11px] text-base-400">
              Highest CPU / RAM / Disk usage
            </span>
          </CardHeader>

          {loading && clients.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-base-400">
              Loading monitoring data...
            </p>
          ) : attention.length === 0 ? (
            <p className="px-4 pb-4 text-[12px] text-base-400">
              No online clients available.
            </p>
          ) : (
            <ul className="divide-y divide-base-700">

              {attention.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center gap-4 px-4 py-3"
                >

                  <div className="w-40 shrink-0">
                    <Link
                      href={`/clients/${client.id}`}
                      className="truncate text-[12.5px] font-medium text-base-100 hover:text-accent"
                    >
                      {client.displayName}
                    </Link>

                    <div className="mt-1">
                      <StatusBadge
                        tone={clientStatusTone(client.status)}
                        label={client.status}
                        className="capitalize"
                      />
                    </div>
                  </div>

                  <div className="grid flex-1 grid-cols-3 gap-3">
                    <ResourceUsage
                      label="CPU"
                      value={client.cpu}
                    />

                    <ResourceUsage
                      label="RAM"
                      value={client.ram}
                    />

                    <ResourceUsage
                      label="Disk"
                      value={client.disk}
                    />
                  </div>

                  <span className="w-16 shrink-0 text-right text-[11px] text-base-400">
                    {formatRelativeMinutes(
                      client.lastSeenMinutesAgo
                    )}
                  </span>

                  <Link
                    href={`/clients/${client.id}`}
                    className="text-base-400 hover:text-base-100"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>

                </li>
              ))}

            </ul>
          )}

          <div className="border-t border-base-700 px-4 py-2">
            <p className="text-[10px] text-base-500">
              Resource readings are based on the latest reported heartbeat.
            </p>
          </div>

        </Card>

        {/* CONTAINER OVERVIEW */}

        <Card>

          <CardHeader>
            <CardTitle>
              Container Overview
            </CardTitle>

            <Boxes className="h-4 w-4 text-base-400" />
          </CardHeader>

          <CardContent className="space-y-4">

            <div>
              <p className="text-[11px] text-base-400">
                Registered containers
              </p>

              <p className="mt-1 text-3xl font-semibold text-base-100">
                {totalContainers}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-base-700 pt-3 text-[12px]">
              <span className="text-base-300">
                Clients with containers
              </span>

              <span className="font-mono font-semibold text-base-100">
                {clientsWithContainers}
              </span>
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-base-300">
                Online clients
              </span>

              <span className="font-mono font-semibold text-status-online">
                {onlineClients}
              </span>
            </div>

            <p className="border-t border-base-700 pt-3 text-[11px] leading-relaxed text-base-400">
              Container totals are based on registered
              container records. Individual running,
              restarting, and exited states will be
              integrated after verifying the container
              data structure.
            </p>

          </CardContent>

        </Card>

      </div>

    </div>
  );
}

// Normalize API response into the Client type.
function toClient(c: any): Client {
  return {
    id: String(c.id),
    name: c.pc_name || "Unknown Client",

    displayName:
      c.pc_name ||
      c.client_code ||
      "Unknown Client",

    location: c.location || "—",
    clientType: c.client_type || "Studio PC",
    status: c.status || "unknown",

    cpu: Number(c.cpu ?? 0),
    ram: Number(c.ram ?? 0),
    disk: Number(c.disk ?? 0),

    onAir:
      c.onAir === "running"
        ? "running"
        : "stopped",

    ip: c.ip_address || "—",
    agentVersion: c.agent_version || "—",
    aircastVersion: c.aircastVersion || "—",
    targetVersion: c.targetVersion || "—",
    updateStatus: c.updateStatus || "up-to-date",

    uptimeHours: Number(c.uptimeHours ?? 0),
    containerCount: Number(c.containerCount ?? 0),

    containers: Array.isArray(c.containers)
      ? c.containers
      : [],

    lastSeenMinutesAgo:
      Number(c.lastSeenMinutesAgo ?? 999999),
  };
}
