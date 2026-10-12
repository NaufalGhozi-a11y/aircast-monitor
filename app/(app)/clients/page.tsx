
"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ClientTable } from "@/components/ClientTable";
import { Button } from "@/components/ui/button";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/clients", {
        cache: "no-store",
      });

      const text = await res.text();

      let data: unknown;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Backend returned an invalid response (HTTP ${res.status}). Check the server logs for the API error.`
        );
      }

      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Failed to load clients";

        throw new Error(message);
      }

      const rows = Array.isArray(data) ? data : [];
      setClients(rows.map(toClient));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to load clients"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-base-400">
          {loading
            ? "Loading clients…"
            : `${clients.length} AirCast client PCs registered across the fleet.`}
        </p>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                loading ? "animate-spin" : ""
              }`}
            />
            {loading ? "Refreshing…" : "Refresh"}
          </Button>

          <Link href="/clients/add">
            <Button variant="primary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              Add Client PC
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-[12px] text-status-critical"
        >
          {error}
        </p>
      )}

      <ClientTable
        clients={clients}
        onRefresh={load}
      />
    </div>
  );
}

function toClient(c: any): Client {
  const lastSeen = c.last_seen
    ? new Date(c.last_seen)
    : null;

  return {
    id: c.id,
    name: c.pc_name,

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
      typeof c.lastSeenMinutesAgo === "number"
        ? c.lastSeenMinutesAgo
        : lastSeen &&
            !Number.isNaN(lastSeen.getTime())
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - lastSeen.getTime()) /
                  60000
              )
            )
          : 999999,
  };
}
