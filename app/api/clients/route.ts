
import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  generateAgentToken,
  hashToken,
} from "@/lib/server/agent-auth";
import { supabaseAdmin } from "@/lib/server/supabase";
import {
  getCurrentAppUser,
  requireAdmin,
} from "@/lib/server/user-admin";

export async function GET() {
  try {
    // Pengguna harus login dan akunnya aktif.
    const auth = await getCurrentAppUser();

    if (auth.responseStatus !== 200 || !auth.profile) {
      return NextResponse.json(
        { error: "Unauthorized or inactive account." },
        { status: auth.responseStatus }
      );
    }

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
          supabaseAdmin
            .from("client_live_state")
            .select("*")
            .eq("client_id", c.id)
            .maybeSingle(),

          supabaseAdmin
            .from("client_metrics")
            .select("*")
            .eq("client_id", c.id)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabaseAdmin
            .from("client_containers")
            .select("id, container_name, image")
            .eq("client_id", c.id),

          supabaseAdmin
            .from("client_aircast_images")
            .select("version, tag")
            .eq("client_id", c.id)
            .order("updated_at", { ascending: false }),
        ]);

        if (liveResult.error) throw liveResult.error;
        if (metricResult.error) throw metricResult.error;
        if (containerResult.error) throw containerResult.error;
        if (imageResult.error) throw imageResult.error;

        // Utamakan data live, gunakan metric sebagai fallback.
        const live = liveResult.data;
        const metric = metricResult.data;
        const current = live ?? metric;

        const lastSeen = c.last_seen
          ? new Date(c.last_seen).getTime()
          : null;

        const baseStatus =
          lastSeen !== null && now - lastSeen <= 60_000
            ? "online"
            : lastSeen !== null
              ? "offline"
              : "unknown";

        const cpu = Number(current?.cpu_usage ?? 0);
        const ram = Number(current?.ram_usage ?? 0);

        const status =
          baseStatus === "online" && (cpu >= 85 || ram >= 85)
            ? "warning"
            : baseStatus;

        // Versi image AirCast aktif.
        const containers = containerResult.data ?? [];

        const aircastContainer = containers.find(
          (container: any) =>
            String(container.container_name || "")
              .toLowerCase()
              .includes("aircast-app")
        );

        const activeAircastImage = aircastContainer?.image || "";

        const activeVersionMatch =
          activeAircastImage.match(/:(\d+\.\d+\.\d+)$/);

        const aircastVersion = activeVersionMatch?.[1] || "—";

        // Jangan pernah kirim hash token agent ke browser.
        const safeClient = Object.fromEntries(
          Object.entries(c).filter(
            ([key]) => key !== "agent_token_hash"
          )
        );

        return {
          ...safeClient,

          status,

          // System metrics.
          cpu,
          ram,
          disk: Number(current?.disk_usage ?? 0),

          // Disk live data.
          diskActiveTime: live?.disk_active_time ?? null,
          diskDrives: Array.isArray(live?.disk_drives)
            ? live.disk_drives
            : [],

          // OnAir status.
          onAir:
            current?.onair_status === "running"
              ? "running"
              : "stopped",

          // Containers.
          containerCount: containers.length,

          // AirCast version.
          aircastVersion,

          // Last seen.
          lastSeenMinutesAgo:
            lastSeen !== null
              ? Math.max(
                  0,
                  Math.floor((now - lastSeen) / 60_000)
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
      { error: "Failed to load clients." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Hanya Admin yang boleh menambahkan client.
    const auth = await requireAdmin();

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: auth.responseStatus }
      );
    }

    const body = await request.json();

    const pcName = String(body.pcName ?? "").trim();
    const location = String(body.location ?? "").trim();
    const station = String(body.station ?? "").trim();
    const clientType = String(
      body.clientType ?? "Studio PC"
    ).trim();
    const notes = String(body.notes ?? "").trim();

    if (!pcName || !location) {
      return NextResponse.json(
        { error: "PC Name and Location are required." },
        { status: 400 }
      );
    }

    // Generate agent token.
    const token = generateAgentToken();

    // Generate client code.
    const clientCode = `AC-${
      pcName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()
        || "CLIENT"
    }-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    // Insert client.
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
      console.error("Insert client error:", error);

      return NextResponse.json(
        { error: "Failed to create client." },
        { status: 500 }
      );
    }

    // Token asli hanya diberikan saat client dibuat oleh Admin.
    return NextResponse.json(
      {
        client: data,
        agent: {
          apiUrl: process.env.AGENT_PUBLIC_API_URL || "",
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
