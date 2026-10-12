
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

// ============================================================
// GET: DETAIL CLIENT
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // CLIENT
    const {
      data: client,
      error: clientError,
    } = await supabaseAdmin
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError) {
      return NextResponse.json(
        { error: clientError.message },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: "Client tidak ditemukan." },
        { status: 404 }
      );
    }

    // LIVE STATE
    const {
      data: liveRows,
      error: liveError,
    } = await supabaseAdmin
      .from("client_live_state")
      .select("*")
      .eq("client_id", clientId)
      .limit(1);

    if (liveError) {
      throw liveError;
    }

    const live = liveRows?.[0] ?? null;

    // INCIDENT HISTORY
    const {
      data: metrics,
      error: metricsError,
    } = await supabaseAdmin
      .from("client_metrics")
      .select("*")
      .eq("client_id", clientId)
      .order("timestamp", {
        ascending: false,
      })
      .limit(100);

    if (metricsError) {
      console.error("Metrics error:", metricsError);
    }

    // CURRENT CONTAINERS
    const {
      data: containers,
      error: containersError,
    } = await supabaseAdmin
      .from("client_containers")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", {
        ascending: false,
      });

    if (containersError) {
      console.error(
        "Containers error:",
        containersError
      );
    }

    // CURRENT AIRCAST IMAGES
    const {
      data: images,
      error: imagesError,
    } = await supabaseAdmin
      .from("client_aircast_images")
      .select("*")
      .eq("client_id", clientId)
      .order("updated_at", {
        ascending: false,
      });

    if (imagesError) {
      console.error("Images error:", imagesError);
    }

    // ACTIVE AIRCAST VERSION
    const containerList = containers ?? [];

    const aircastContainer =
      containerList.find(
        (container: any) =>
          normalizeContainerStatus(container.status) ===
            "running" &&
          (
            String(container.container_name || "")
              .toLowerCase()
              .includes("aircast-app") ||
            String(container.image || "")
              .toLowerCase()
              .includes("/aircast/aircast-app:")
          )
      ) ??
      containerList.find(
        (container: any) =>
          String(container.container_name || "")
            .toLowerCase()
            .includes("aircast-app") ||
          String(container.image || "")
            .toLowerCase()
            .includes("/aircast/aircast-app:")
      );

    const aircastImage = String(
      aircastContainer?.image || ""
    );

    const versionMatch = aircastImage.match(
      /:(\d+\.\d+\.\d+)(?:\s|$)/
    );

    const aircastVersion =
      versionMatch?.[1] || "—";

    // EVENTS
    const {
      data: events,
      error: eventsError,
    } = await supabaseAdmin
      .from("client_events")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (eventsError) {
      console.error("Events error:", eventsError);
    }

    // STATUS BERDASARKAN HEARTBEAT TERAKHIR
    const lastSeen = client.last_seen
      ? new Date(client.last_seen).getTime()
      : null;

    const now = Date.now();

    const baseStatus =
      lastSeen !== null &&
      Number.isFinite(lastSeen) &&
      now - lastSeen <= 60_000
        ? "online"
        : lastSeen !== null &&
            Number.isFinite(lastSeen)
          ? "offline"
          : "unknown";

    const cpu = Number(live?.cpu_usage ?? 0);
    const ram = Number(live?.ram_usage ?? 0);

    const status =
      baseStatus === "online" &&
      (cpu >= 85 || ram >= 85)
        ? "warning"
        : baseStatus;

    return NextResponse.json(
      {
        client: {
          ...client,
          status,
          lastSeenMinutesAgo:
            lastSeen !== null &&
            Number.isFinite(lastSeen)
              ? Math.max(
                  0,
                  Math.floor(
                    (now - lastSeen) / 60000
                  )
                )
              : 999999,
        },
        live,
        metrics: metrics ?? [],
        containers: containerList,
        images: images ?? [],
        events: events ?? [],
        aircastVersion,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Client detail error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load client detail.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT: EDIT CLIENT
// ============================================================

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;
    const body = await request.json();

    // CEK CLIENT
    const {
      data: existingClient,
      error: findError,
    } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("id", clientId)
      .single();

    if (findError || !existingClient) {
      return NextResponse.json(
        { error: "PC tidak ditemukan." },
        { status: 404 }
      );
    }

    // VALIDASI NAMA DAN LOKASI
    const pcName =
      body.pcName !== undefined
        ? String(body.pcName).trim()
        : undefined;

    const location =
      body.location !== undefined
        ? String(body.location).trim()
        : undefined;

    if (
      (pcName !== undefined && !pcName) ||
      (location !== undefined && !location)
    ) {
      return NextResponse.json(
        {
          error: "Nama PC dan lokasi tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    // DATA YANG BOLEH DIEDIT
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (pcName !== undefined) {
      updateData.pc_name = pcName;
    }

    if (location !== undefined) {
      updateData.location = location;
    }

    if (body.station !== undefined) {
      updateData.station =
        String(body.station).trim() || null;
    }

    if (body.clientType !== undefined) {
      const clientType =
        String(body.clientType).trim();

      if (!clientType) {
        return NextResponse.json(
          { error: "Jenis PC wajib diisi." },
          { status: 400 }
        );
      }

      updateData.client_type = clientType;
    }

    if (body.notes !== undefined) {
      updateData.notes =
        String(body.notes).trim() || null;
    }

    // UPDATE DATABASE
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("clients")
      .update(updateData)
      .eq("id", clientId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      ok: true,
      message: "Data PC berhasil diperbarui.",
    });
  } catch (error) {
    console.error("Edit client error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memperbarui data PC.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: HAPUS CLIENT
// ============================================================

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    // CEK CLIENT
    const {
      data: client,
      error: findError,
    } = await supabaseAdmin
      .from("clients")
      .select("id, pc_name")
      .eq("id", clientId)
      .single();

    if (findError || !client) {
      return NextResponse.json(
        { error: "PC tidak ditemukan." },
        { status: 404 }
      );
    }

    // HAPUS DATA TERKAIT
    // Urutan ini menghindari konflik foreign key
    // jika tabel tidak menggunakan ON DELETE CASCADE.

    const relatedTables = [
      "client_live_state",
      "client_metrics",
      "client_containers",
      "client_aircast_images",
      "client_events",
    ];

    for (const table of relatedTables) {
      const { error } = await supabaseAdmin
        .from(table)
        .delete()
        .eq("client_id", clientId);

      if (error) {
        throw new Error(
          `Gagal menghapus ${table}: ${error.message}`
        );
      }
    }

    // HAPUS DATA CLIENT
    const {
      error: deleteError,
    } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      ok: true,
      message: `PC ${client.pc_name} berhasil dihapus.`,
    });
  } catch (error) {
    console.error("Delete client error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal menghapus PC.",
      },
      { status: 500 }
    );
  }
}

// ============================================================
// CONTAINER STATUS
// ============================================================

function normalizeContainerStatus(value: unknown) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

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