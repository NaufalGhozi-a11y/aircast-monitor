
import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  generateAgentToken,
  hashToken,
} from "@/lib/server/agent-auth";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("clients")
      .select("*")
      .order("pc_name", { ascending: true });

    if (error) {
      throw error;
    }

    const now = Date.now();

    const clients = await Promise.all(
      (data ?? []).map(async (c: any) => {
        const [
          liveResult,
          metricResult,
          containerResult,
          imageResult,
        ] = await Promise.all([
          // DATA LIVE TERBARU
          supabaseAdmin
            .from("client_live_state")
            .select("*")
            .eq("client_id", c.id)
            .maybeSingle(),

          // FALLBACK RIWAYAT METRIC
          supabaseAdmin
            .from("client_metrics")
            .select("*")
            .eq("client_id", c.id)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle(),

          // CONTAINERS
          supabaseAdmin
            .from("client_containers")
            .select("id, container_name, image")
            .eq("client_id", c.id),

          // AIRCAST IMAGES
          supabaseAdmin
            .from("client_aircast_images")
            .select("version, tag")
            .eq("client_id", c.id)
            .order("updated_at", { ascending: false }),
        ]);

        if (liveResult.error) {
          throw liveResult.error;
        }

        if (metricResult.error) {
          throw metricResult.error;
        }

        if (containerResult.error) {
          throw containerResult.error;
        }

        if (imageResult.error) {
          throw imageResult.error;
        }

        // UTAMAKAN DATA LIVE
        const live = liveResult.data;
        const metric = metricResult.data;
        const current = live ?? metric;

        // CLIENT STATUS
        const lastSeen = c.last_seen
          ? new Date(c.last_seen).getTime()
          : null;

        const baseStatus =
          lastSeen !== null &&
          now - lastSeen <= 60_000
            ? "online"
            : lastSeen !== null
              ? "offline"
              : "unknown";

        const cpu = Number(current?.cpu_usage ?? 0);
        const ram = Number(current?.ram_usage ?? 0);

        const status =
          baseStatus === "online" &&
          (cpu >= 85 || ram >= 85)
            ? "warning"
            : baseStatus;

        // ACTIVE AIRCAST VERSION
        const containers = containerResult.data ?? [];

        const aircastContainer = containers.find(
          (container: any) =>
            String(container.container_name || "")
              .toLowerCase()
              .includes("aircast-app")
        );

        const activeAircastImage =
          aircastContainer?.image || "";

        const activeVersionMatch =
          activeAircastImage.match(
            /:(\d+\.\d+\.\d+)$/
          );

        const aircastVersion =
          activeVersionMatch?.[1] || "—";

        // RETURN CLIENT
        return {
          ...c,

          status,

          // SYSTEM METRICS
          cpu,
          ram,
          disk: Number(current?.disk_usage ?? 0),

          // DISK LIVE DATA
          diskActiveTime:
            live?.disk_active_time ?? null,

          diskDrives:
            Array.isArray(live?.disk_drives)
              ? live.disk_drives
              : [],

          // ONAIR STATUS
          onAir:
            current?.onair_status === "running"
              ? "running"
              : "stopped",

          // CONTAINERS
          containerCount: containers.length,

          // AIRCAST VERSION
          aircastVersion,

          // LAST SEEN
          lastSeenMinutesAgo:
            lastSeen !== null
              ? Math.max(
                  0,
                  Math.floor(
                    (now - lastSeen) / 60000
                  )
                )
              : 999999,
        };
      })
    );

    return NextResponse.json(clients, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Get clients error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load clients.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pcName = String(body.pcName ?? "").trim();
    const location = String(body.location ?? "").trim();
    const station = String(body.station ?? "").trim();
    const clientType = String(
      body.clientType ?? "Studio PC"
    );
    const notes = String(body.notes ?? "").trim();

    // VALIDATION
    if (!pcName || !location) {
      return NextResponse.json(
        {
          error: "PC Name and Location are required.",
        },
        { status: 400 }
      );
    }

    // GENERATE AGENT TOKEN
    const token = generateAgentToken();

    // GENERATE CLIENT CODE
    const clientCode = `AC-${pcName
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "CLIENT"}-${crypto
      .randomUUID()
      .slice(0, 6)
      .toUpperCase()}`;

    // INSERT CLIENT
    const { data, error } = await supabaseAdmin
      .from("clients")
      .insert({
        client_code: clientCode,
        pc_name: pcName,
        location,
        station: station || null,
        client_type: clientType,
        notes,
        agent_token_hash: hashToken(token),
        status: "unknown",
      })
      .select(`
        id,
        client_code,
        pc_name,
        location,
        station,
        client_type,
        notes,
        status,
        created_at
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // AGENT CONFIG
    return NextResponse.json(
      {
        client: data,
        agent: {
          apiUrl:
            process.env.AGENT_PUBLIC_API_URL || "",
          clientId: data.id,
          token,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create client error:", error);

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}