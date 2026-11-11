
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  client_id: string;
  event_type: string | null;
  message: string | null;
  created_at: string;
}

interface ClientRow {
  id: string;
  hostname: string | null;
}

type AlertType =
  | "HANG"
  | "CRASH"
  | "WARNING"
  | "RECOVERED";

type AlertSeverity =
  | "critical"
  | "warning"
  | "info";

function normalizeAlertType(
  value: string | null
): AlertType | null {
  const type = String(value || "")
    .trim()
    .toUpperCase();

  switch (type) {
    case "HANG":
    case "CRASH":
    case "WARNING":
    case "RECOVERED":
      return type;

    default:
      return null;
  }
}

function getSeverity(
  type: AlertType
): AlertSeverity {
  switch (type) {
    case "HANG":
    case "CRASH":
      return "critical";

    case "WARNING":
      return "warning";

    case "RECOVERED":
      return "info";
  }
}

export async function GET() {
  try {
    // 1. Ambil event terbaru
    const { data: eventData, error: eventError } =
      await supabaseAdmin
        .from("client_events")
        .select(
          "id, client_id, event_type, message, created_at"
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(500);

    if (eventError) throw eventError;

    const events = (eventData ?? []) as EventRow[];

    // 2. Ambil daftar client
    const { data: clientData, error: clientError } =
      await supabaseAdmin
        .from("clients")
        .select("id, hostname");

    if (clientError) throw clientError;

    const clients = (clientData ?? []) as ClientRow[];

    const clientNames = new Map<string, string>();

    for (const client of clients) {
      clientNames.set(
        client.id,
        client.hostname || "PC tanpa nama"
      );
    }

    // 3. Filter event yang termasuk alert
    const alerts = [];

    for (const event of events) {
      const type = normalizeAlertType(
        event.event_type
      );

      if (!type) continue;

      const createdAt = new Date(
        event.created_at
      ).getTime();

      const minutesAgo = Number.isFinite(createdAt)
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - createdAt) / 60000
            )
          )
        : 0;

      alerts.push({
        id: event.id,
        clientId: event.client_id,
        clientName:
          clientNames.get(event.client_id) ||
          "PC tidak diketahui",
        type,
        description:
          event.message || "Tidak ada deskripsi",
        minutesAgo,
        severity: getSeverity(type),
      });
    }

    return NextResponse.json(
      {
        alerts,
        total: alerts.length,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Get alerts error:", error);

    return NextResponse.json(
      {
        error: "Gagal mengambil data alerts.",
      },
      { status: 500 }
    );
  }
}
