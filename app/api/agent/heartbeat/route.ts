
import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/server/agent-auth";
import { supabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

function numberOrNull(value: any): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function arrayOrEmpty(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function objectOrEmpty(value: any): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

export async function POST(request: Request) {
  try {
    // 1. Autentikasi agent
    const client = await authenticateAgent(request);

    if (!client) {
      return NextResponse.json(
        { error: "Unauthorized agent." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const clientId = client.id;
    const timestamp = new Date().toISOString();

    const system = objectOrEmpty(body.system);
    const onair = objectOrEmpty(body.onair);

    const runtime = objectOrEmpty(body.runtime);

    const containers = arrayOrEmpty(
      body.containers ?? runtime.containers
    );

    const aircastImages = arrayOrEmpty(
      body.aircast_images ??
      body.aircastImages ??
      body.aircast_images_list
    );

    const diskDrives = arrayOrEmpty(
      body.disk_drives ?? system.disk_drives
    );

    // 2. Normalisasi status On Air
    const onairStatus = String(
      onair.status ?? body.onair_status ?? "unknown"
    )
      .trim()
      .toLowerCase();

    const cpuUsage = numberOrNull(
      system.cpu_usage ?? system.cpu_percent ?? system.cpu
    );

    const ramUsage = numberOrNull(
      system.ram_usage ?? system.ram_percent ?? system.ram
    );

    const diskUsage = numberOrNull(
      system.disk_usage ?? system.disk_percent ?? system.disk
    );

    const onairCpu = numberOrNull(
      onair.cpu_usage ?? onair.cpu
    );

    const onairRam = numberOrNull(
      onair.ram_usage ?? onair.ram
    );

    const diskActiveTime = numberOrNull(
      system.disk_active_time
    );

    // 3. Ambil status sebelumnya
    const { data: previousState, error: previousError } =
      await supabaseAdmin
        .from("client_live_state")
        .select("onair_status")
        .eq("client_id", clientId)
        .maybeSingle();

    if (previousError) throw previousError;

    const previousStatus =
      previousState?.onair_status ?? null;

    // 4. Deteksi insiden
    const incidentStarted =
      onairStatus === "hang" &&
      previousStatus !== "hang";

    const incidentRecovered =
      previousStatus === "hang" &&
      onairStatus === "running";

    // 5. Update informasi client
    const { error: clientError } = await supabaseAdmin
      .from("clients")
      .update({
        hostname: system.hostname ?? client.pc_name,
        ip_address: system.ip_address ?? undefined,
        agent_version: body.agent_version ?? undefined,
        last_seen: timestamp,
        status: "online",
        updated_at: timestamp,
      })
      .eq("id", clientId);

    if (clientError) throw clientError;

    // 6. Simpan live state sesuai schema database
    const liveRow = {
      client_id: clientId,
      timestamp,
      cpu_usage: cpuUsage,
      ram_usage: ramUsage,
      disk_usage: diskUsage,
      onair_status: onairStatus,
      onair_cpu: onairCpu,
      onair_ram: onairRam,
      containers,
      aircast_images: aircastImages,
      disk_active_time: diskActiveTime,
      disk_drives: diskDrives,
      updated_at: timestamp,
    };

    const { error: liveError } = await supabaseAdmin
      .from("client_live_state")
      .upsert(liveRow, {
        onConflict: "client_id",
      });

    if (liveError) throw liveError;

    // 7. Simpan dashboard history
    const { error: historyError } = await supabaseAdmin
      .from("dashboard_metric_history")
      .insert({
        client_id: clientId,
        timestamp,
        cpu_usage: cpuUsage,
        ram_usage: ramUsage,
      });

    if (historyError) throw historyError;

    // 8. Simpan metrics saat terjadi insiden
    const incidentDetected =
      incidentStarted || incidentRecovered;

    if (incidentDetected) {
      const { error: metricError } = await supabaseAdmin
        .from("client_metrics")
        .insert({
          client_id: clientId,
          timestamp,
          cpu_usage: cpuUsage,
          ram_usage: ramUsage,
          disk_usage: diskUsage,
          onair_status: onairStatus,
          onair_cpu: onairCpu,
          onair_ram: onairRam,
        });

      if (metricError) throw metricError;
    }

    // 9. Simpan event HANG dan RECOVERED saja
    const eventRows: {
      client_id: string;
      event_type: string;
      message: string;
      created_at: string;
    }[] = [];

    if (incidentStarted) {
      eventRows.push({
        client_id: clientId,
        event_type: "HANG",
        message: "On Air terdeteksi tidak merespons.",
        created_at: timestamp,
      });
    }

    if (incidentRecovered) {
      eventRows.push({
        client_id: clientId,
        event_type: "RECOVERED",
        message: "On Air kembali berjalan setelah terdeteksi hang.",
        created_at: timestamp,
      });
    }

    let eventsSaved = 0;

    if (eventRows.length > 0) {
      const { error: eventError } = await supabaseAdmin
        .from("client_events")
        .insert(eventRows);

      if (eventError) throw eventError;

      eventsSaved = eventRows.length;
    }

    return NextResponse.json({
      ok: true,
      client_id: clientId,
      received_at: timestamp,
      live_updated: true,
      history_saved: true,
      metrics_saved: incidentDetected,
      previous_status: previousStatus,
      current_status: onairStatus,
      status_changed:
        previousStatus !== null &&
        previousStatus !== onairStatus,
      incident_started: incidentStarted,
      incident_recovered: incidentRecovered,
      events_saved: eventsSaved,
      containers_received: containers.length,
      images_received: aircastImages.length,
    });
  } catch (error) {
    console.error("Heartbeat error:", error);

    return NextResponse.json(
      {
        error: "Gagal memproses heartbeat.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
