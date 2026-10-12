
import { NextResponse } from "next/server";
import { authenticateAgent } from "@/lib/server/agent-auth";
import { supabaseAdmin } from "@/lib/server/supabase";

export async function POST(request: Request) {
  const auth = await authenticateAgent(request);

  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const clientId = auth.id;
    const timestamp =
      body.timestamp || new Date().toISOString();

    const system = body.system || {};
    const onair = body.onair || {};

    const runtime =
      body.runtime ||
      body.container_runtime ||
      {};

    const containers = Array.isArray(body.containers)
      ? body.containers
      : Array.isArray(runtime.containers)
        ? runtime.containers
        : [];

    const images = Array.isArray(
      body.aircast_images?.images
    )
      ? body.aircast_images.images
      : Array.isArray(body.aircast_images)
        ? body.aircast_images
        : [];

    const onairStatus = normalizeOnAirStatus(
      onair.status
    );

    // 1. Ambil status OnAir sebelumnya
    const {
      data: previousLive,
      error: previousLiveError,
    } = await supabaseAdmin
      .from("client_live_state")
      .select("onair_status")
      .eq("client_id", clientId)
      .limit(1);

    if (previousLiveError) {
      throw previousLiveError;
    }

    const previousStatus =
      previousLive?.[0]?.onair_status || null;

    // 2. Tentukan perubahan status
    const statusChanged =
      previousStatus !== null &&
      previousStatus !== onairStatus;

    const incidentStarted =
      onairStatus === "hang" &&
      previousStatus !== "hang";

    const incidentRecovered =
      previousStatus === "hang" &&
      onairStatus === "running";

    const shouldSaveMetric =
      incidentStarted || incidentRecovered;

    // 3. Update informasi client
    const {
      error: clientError,
    } = await supabaseAdmin
      .from("clients")
      .update({
        hostname: body.hostname || null,
        ip_address: body.ip_address || null,
        agent_version: body.agent_version || null,
        last_seen: timestamp,
        status: "online",
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId);

    if (clientError) {
      throw clientError;
    }

    // 4. Update live state
    const liveRow = {
      client_id: clientId,
      timestamp,

      cpu_usage: numberOrNull(
        system.cpu_usage ?? system.cpu_percent
      ),

      ram_usage: numberOrNull(
        system.ram_usage ?? system.ram_percent
      ),

      disk_usage: numberOrNull(
        system.disk_usage ?? system.disk_percent
      ),

      disk_active_time: numberOrNull(
        system.disk_active_time ??
        body.disk_active_time
      ),

      disk_drives: Array.isArray(system.disk_drives)
        ? system.disk_drives
        : Array.isArray(body.disk_drives)
          ? body.disk_drives
          : [],

      onair_status: onairStatus,

      onair_cpu: numberOrNull(
        onair.cpu_usage ?? onair.cpu_percent
      ),

      onair_ram: numberOrNull(
        onair.ram_usage ?? onair.ram_gb
      ),

      containers,
      aircast_images: images,
      updated_at: new Date().toISOString(),
    };

    const {
      error: deleteLiveError,
    } = await supabaseAdmin
      .from("client_live_state")
      .delete()
      .eq("client_id", clientId);

    if (deleteLiveError) {
      throw deleteLiveError;
    }

    const {
      error: liveError,
    } = await supabaseAdmin
      .from("client_live_state")
      .insert(liveRow);

    if (liveError) {
      throw liveError;
    }

    // 5. Simpan riwayat grafik setiap 1 menit
    const {
      data: historyRows,
      error: historyError,
    } = await supabaseAdmin
      .from("dashboard_metric_history")
      .select("timestamp")
      .eq("client_id", clientId)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (historyError) {
      throw historyError;
    }

    const lastHistory =
      historyRows?.[0]?.timestamp;

    const currentTime =
      new Date(timestamp).getTime();

    const lastTime = lastHistory
      ? new Date(lastHistory).getTime()
      : 0;

    const shouldSaveHistory =
      !lastHistory ||
      (
        Number.isFinite(currentTime) &&
        Number.isFinite(lastTime) &&
        currentTime - lastTime >= 60_000
      );

    if (shouldSaveHistory) {
      const {
        error: historyInsertError,
      } = await supabaseAdmin
        .from("dashboard_metric_history")
        .insert({
          client_id: clientId,
          timestamp,

          cpu_usage: numberOrNull(
            system.cpu_usage ?? system.cpu_percent
          ),

          ram_usage: numberOrNull(
            system.ram_usage ?? system.ram_percent
          ),
        });

      if (historyInsertError) {
        throw historyInsertError;
      }
    }

    // 6. Simpan metric hanya ketika ada incident
    if (shouldSaveMetric) {
      const {
        error: metricError,
      } = await supabaseAdmin
        .from("client_metrics")
        .insert({
          client_id: clientId,
          timestamp,

          cpu_usage: numberOrNull(
            system.cpu_usage ?? system.cpu_percent
          ),

          ram_usage: numberOrNull(
            system.ram_usage ?? system.ram_percent
          ),

          disk_usage: numberOrNull(
            system.disk_usage ?? system.disk_percent
          ),

          onair_status: onairStatus,

          onair_cpu: numberOrNull(
            onair.cpu_usage ?? onair.cpu_percent
          ),

          onair_ram: numberOrNull(
            onair.ram_usage ?? onair.ram_gb
          ),
        });

      if (metricError) {
        throw metricError;
      }
    }

    // 7. Simpan Monitoring Events
    const eventRows: {
      client_id: string;
      event_type: string;
      message: string;
      created_at: string;
    }[] = [];

    if (
      previousStatus !== null &&
      previousStatus !== onairStatus
    ) {
      if (
        onairStatus === "hang" &&
        previousStatus !== "hang"
      ) {
        eventRows.push({
          client_id: clientId,
          event_type: "HANG",
          message:
            "OnAir terdeteksi tidak merespons.",
          created_at: timestamp,
        });
      } else if (
        previousStatus === "running" &&
        onairStatus === "not_running"
      ) {
        eventRows.push({
          client_id: clientId,
          event_type: "STOPPED",
          message:
            "OnAir berhenti berjalan.",
          created_at: timestamp,
        });
      } else if (
        previousStatus === "hang" &&
        onairStatus === "running"
      ) {
        eventRows.push({
          client_id: clientId,
          event_type: "RECOVERED",
          message:
            "OnAir kembali berjalan setelah terdeteksi hang.",
          created_at: timestamp,
        });
      } else if (
        previousStatus === "not_running" &&
        onairStatus === "running"
      ) {
        eventRows.push({
          client_id: clientId,
          event_type: "STARTED",
          message:
            "OnAir kembali berjalan.",
          created_at: timestamp,
        });
      }
    }

    let eventsSaved = 0;

    if (eventRows.length > 0) {
      const {
        error: eventError,
      } = await supabaseAdmin
        .from("client_events")
        .insert(eventRows);

      if (eventError) {
        throw eventError;
      }

      eventsSaved = eventRows.length;
    }

    // 8. Perbarui container
    const {
      error: deleteContainerError,
    } = await supabaseAdmin
      .from("client_containers")
      .delete()
      .eq("client_id", clientId);

    if (deleteContainerError) {
      throw deleteContainerError;
    }

    if (containers.length > 0) {
      const containerRows = containers.map(
        (container: any) => ({
          client_id: clientId,

          container_name:
            container.name ||
            container.container_name ||
            "unknown",

          image: container.image || null,

          status: normalizeContainerStatus(
            container.status
          ),

          cpu_usage: numberOrNull(
            container.cpu_value ??
            container.cpu_percent_value ??
            container.cpu ??
            container.cpu_percent
          ),

          memory_usage: parseMemoryMb(
            container.memory_mb ??
            container.memory_used_mb ??
            container.memory_used ??
            container.mem_usage ??
            container.memory_usage
          ),

          restart_count: numberOrNull(
            container.restartCount ??
            container.restart_count ??
            container.restarts ??
            0
          ),
        })
      );

      const {
        error: containerError,
      } = await supabaseAdmin
        .from("client_containers")
        .insert(containerRows);

      if (containerError) {
        throw containerError;
      }
    }

    // 9. Perbarui AirCast images
    const {
      error: deleteImageError,
    } = await supabaseAdmin
      .from("client_aircast_images")
      .delete()
      .eq("client_id", clientId);

    if (deleteImageError) {
      throw deleteImageError;
    }

    if (images.length > 0) {
      const imageRows = images.map(
        (image: any) => ({
          client_id: clientId,

          repository: image.repository || null,
          tag: image.tag || null,

          image:
            image.image ||
            `${image.repository || ""}:${image.tag || ""}`,

          version:
            image.version ||
            image.aircast_version ||
            null,

          image_id:
            image.id ||
            image.image_id ||
            null,

          size: image.size || null,
        })
      );

      const {
        error: imageError,
      } = await supabaseAdmin
        .from("client_aircast_images")
        .insert(imageRows);

      if (imageError) {
        throw imageError;
      }
    }

    // 10. Response
    return NextResponse.json({
      ok: true,
      client_id: clientId,
      received_at: new Date().toISOString(),
      live_updated: true,
      history_saved: shouldSaveHistory,
      previous_onair_status: previousStatus,
      current_onair_status: onairStatus,
      status_changed: statusChanged,
      incident_started: incidentStarted,
      incident_recovered: incidentRecovered,
      incident_saved: shouldSaveMetric,
      events_saved: eventsSaved,
    });
  } catch (error) {
    console.error("Heartbeat error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invalid heartbeat.",
      },
      { status: 400 }
    );
  }
}

function numberOrNull(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n =
    typeof value === "string"
      ? Number(value.replace("%", "").trim())
      : Number(value);

  return Number.isFinite(n) ? n : null;
}

function parseMemoryMb(value: unknown) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value)
    .trim()
    .replace(",", ".");

  const match = text.match(
    /^([\d.]+)\s*(B|KiB|MiB|GiB|TiB|KB|MB|GB|TB)?$/i
  );

  if (!match) {
    return null;
  }

  const number = Number(match[1]);

  if (!Number.isFinite(number)) {
    return null;
  }

  const unit = (match[2] || "MB").toUpperCase();

  switch (unit) {
    case "B":
      return number / 1024 / 1024;

    case "KIB":
    case "KB":
      return number / 1024;

    case "MIB":
    case "MB":
      return number;

    case "GIB":
      return number * 1024;

    case "GB":
      return number * 1000;

    case "TIB":
      return number * 1024 * 1024;

    case "TB":
      return number * 1000 * 1000;

    default:
      return number;
  }
}

function normalizeOnAirStatus(value: unknown) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status === "hang") {
    return "hang";
  }

  if (
    status === "not_running" ||
    status === "not running" ||
    status === "stopped"
  ) {
    return "not_running";
  }

  if (
    status === "running" ||
    status === "normal"
  ) {
    return "running";
  }

  return "unknown";
}

function normalizeContainerStatus(value: unknown) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (!status) {
    return "unknown";
  }

  if (
    status.includes("restarting") ||
    status.includes("restart")
  ) {
    return "restarting";
  }

  if (
    status.includes("running") ||
    status.startsWith("up ")
  ) {
    return "running";
  }

  if (
    status.includes("exited") ||
    status.includes("dead")
  ) {
    return "exited";
  }

  if (status.includes("created")) {
    return "created";
  }

  return "unknown";
}