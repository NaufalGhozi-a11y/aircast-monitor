import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

type DashboardStatus =
  | "online"
  | "warning"
  | "offline"
  | "unknown";

type DashboardClient = {
  id: string;
  name: string;
  displayName: string;
  location: string;
  clientType: string;
  status: DashboardStatus;
  cpu: number;
  ram: number;
  disk: number;
  onAir: "running" | "stopped";
  ip: string;
  agentVersion: string;
  aircastVersion: string;
  targetVersion: string;
  updateStatus:
    | "up-to-date"
    | "update-available"
    | "updating";
  uptimeHours: number;
  containerCount: number;
  containers: unknown[];
  lastSeenMinutesAgo: number;
};

type FleetHistoryPoint = {
  timestamp: string;
  cpu: number;
  ram: number;
};

type FleetBucket = {
  cpuTotal: number;
  cpuCount: number;
  ramTotal: number;
  ramCount: number;
};

export async function GET() {
  try {
    // 1. Ambil semua client
    const {
      data: clientRows,
      error: clientsError,
    } = await supabaseAdmin
      .from("clients")
      .select("*")
      .order("pc_name", {
        ascending: true,
      });

    if (clientsError) {
      throw clientsError;
    }

    const allClients: any[] = clientRows ?? [];

    // 2. Ambil live state setiap client
    const liveStates = new Map<string, any>();

    await Promise.all(
      allClients.map(async (client: any) => {
        const {
          data: rows,
          error,
        } = await supabaseAdmin
          .from("client_live_state")
          .select("*")
          .eq("client_id", client.id)
          .limit(1);

        if (error) {
          throw error;
        }

        if (rows?.[0]) {
          liveStates.set(
            String(client.id),
            rows[0]
          );
        }
      })
    );

    // 3. Buat data client
    const now = Date.now();

    const dashboardClients: DashboardClient[] =
      allClients.map((client: any) => {
        const live = liveStates.get(
          String(client.id)
        );

        const lastSeen = client.last_seen
          ? new Date(client.last_seen).getTime()
          : null;

        const cpu = Number(
          live?.cpu_usage ?? 0
        );

        const ram = Number(
          live?.ram_usage ?? 0
        );

        const disk = Number(
          live?.disk_usage ?? 0
        );

        let status: DashboardStatus;

        if (
          !lastSeen ||
          !Number.isFinite(lastSeen)
        ) {
          status = "unknown";
        } else if (now - lastSeen > 60_000) {
          status = "offline";
        } else if (cpu >= 85 || ram >= 85) {
          status = "warning";
        } else {
          status = "online";
        }

        return {
          id: String(client.id),

          name:
            client.pc_name ||
            "Unknown Client",

          displayName:
            client.pc_name ||
            client.client_code ||
            "Unknown Client",

          location:
            client.location || "—",

          clientType:
            client.client_type || "Studio PC",

          status,
          cpu,
          ram,
          disk,

          onAir:
            live?.onair_status === "running"
              ? "running"
              : "stopped",

          ip:
            client.ip_address || "—",

          agentVersion:
            client.agent_version || "—",

          aircastVersion: "—",
          targetVersion: "—",
          updateStatus: "up-to-date",
          uptimeHours: 0,
          containerCount: Array.isArray(live?.containers)
            ? live.containers.length
            : 0,
          containers: Array.isArray(live?.containers)
            ? live.containers
            : [],

          lastSeenMinutesAgo:
            lastSeen && Number.isFinite(lastSeen)
              ? Math.max(
                  0,
                  Math.floor((now - lastSeen) / 60000)
                )
              : 999999,
        };
      });

    // 4. Summary
    const total = dashboardClients.length;

    const online = dashboardClients.filter(
      (client) => client.status === "online"
    ).length;

    const warning = dashboardClients.filter(
      (client) => client.status === "warning"
    ).length;

    const offline = dashboardClients.filter(
      (client) => client.status === "offline"
    ).length;

    const unknown = dashboardClients.filter(
      (client) => client.status === "unknown"
    ).length;

    const summary = {
      total,
      online,
      warning,
      offline,
      unknown,
    };

    // 5. Status distribution
    const statusDistribution = [
      {
        key: "online",
        name: "Online",
        value: online,
      },
      {
        key: "warning",
        name: "Warning",
        value: warning,
      },
      {
        key: "offline",
        name: "Offline",
        value: offline,
      },
    ];

    // 6. Current fleet average
    const clientsWithMetrics =
      dashboardClients.filter(
        (client) =>
          client.status !== "unknown" &&
          client.status !== "offline"
      );

    const averageCpu =
      clientsWithMetrics.length > 0
        ? clientsWithMetrics.reduce(
            (sum, client) => sum + client.cpu,
            0
          ) / clientsWithMetrics.length
        : 0;

    const averageRam =
      clientsWithMetrics.length > 0
        ? clientsWithMetrics.reduce(
            (sum, client) => sum + client.ram,
            0
          ) / clientsWithMetrics.length
        : 0;

    // 7. Siapkan bucket riwayat 24 jam
    const historyStart = new Date(
      now - 24 * 60 * 60 * 1000
    );

    const fleetBuckets = new Map<
      string,
      FleetBucket
    >();

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(
        now - i * 60 * 60 * 1000
      );

      hour.setMinutes(0, 0, 0);

      fleetBuckets.set(
        hour.toISOString(),
        {
          cpuTotal: 0,
          cpuCount: 0,
          ramTotal: 0,
          ramCount: 0,
        }
      );
    }

    // 8. Ambil riwayat grafik setiap client
    await Promise.all(
      allClients.map(async (client: any) => {
        const {
          data: rows,
          error,
        } = await supabaseAdmin
          .from("dashboard_metric_history")
          .select("timestamp, cpu_usage, ram_usage")
          .eq("client_id", client.id)
          .order("timestamp", {
            ascending: false,
          })
          .limit(2000);

        if (error) {
          throw error;
        }

        for (const row of rows ?? []) {
          const timestamp = new Date(
            row.timestamp
          );

          if (
            Number.isNaN(timestamp.getTime()) ||
            timestamp < historyStart
          ) {
            continue;
          }

          const bucketDate = new Date(timestamp);
          bucketDate.setMinutes(0, 0, 0);

          const bucket = fleetBuckets.get(
            bucketDate.toISOString()
          );

          if (!bucket) {
            continue;
          }

          if (row.cpu_usage !== null) {
            const cpu = Number(row.cpu_usage);

            if (Number.isFinite(cpu)) {
              bucket.cpuTotal += cpu;
              bucket.cpuCount += 1;
            }
          }

          if (row.ram_usage !== null) {
            const ram = Number(row.ram_usage);

            if (Number.isFinite(ram)) {
              bucket.ramTotal += ram;
              bucket.ramCount += 1;
            }
          }
        }
      })
    );

    // 9. Bentuk data chart
    const fleetHistory: FleetHistoryPoint[] =
      Array.from(fleetBuckets.entries()).map(
        ([timestamp, bucket]) => ({
          timestamp,

          cpu:
            bucket.cpuCount > 0
              ? Number(
                  (
                    bucket.cpuTotal /
                    bucket.cpuCount
                  ).toFixed(2)
                )
              : 0,

          ram:
            bucket.ramCount > 0
              ? Number(
                  (
                    bucket.ramTotal /
                    bucket.ramCount
                  ).toFixed(2)
                )
              : 0,
        })
      );

    // 10. Response
    return NextResponse.json(
      {
        summary,
        statusDistribution,
        clients: dashboardClients,

        fleet: {
          averageCpu: Number(
            averageCpu.toFixed(2)
          ),
          averageRam: Number(
            averageRam.toFixed(2)
          ),
          history: fleetHistory,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Dashboard API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load dashboard data.",
      },
      { status: 500 }
    );
  }
}