
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

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("client_events")
      .select("id, client_id, event_type, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const events = (data ?? []) as EventRow[];

    // Ambil semua client untuk menghindari penggunaan .in()
    const { data: clientData, error: clientError } =
      await supabaseAdmin
        .from("clients")
        .select("id, hostname");

    if (clientError) throw clientError;

    const clients = (clientData ?? []) as ClientRow[];

    const clientNames = new Map<string, string>(
      clients.map((client: ClientRow) => [
        client.id,
        client.hostname || "PC tanpa nama",
      ])
    );

    const alerts = events.map((event: EventRow) => {
      const rawType = String(event.event_type || "WARNING")
        .trim()
        .toUpperCase();

      const allowedTypes = [
        "NORMAL",
        "WARNING",
        "HANG",
        "CRASH",
        "RECOVERED",
        "STARTED",
        "STOPPED",
      ] as const;

      type AlertType = (typeof allowedTypes)[number];

      const type: AlertType = allowedTypes.includes(
        rawType as AlertType
      )
        ? (rawType as AlertType)
        : "WARNING";

      const severity =
        type === "HANG" || type === "CRASH"
          ? "critical"
          : type === "STOPPED" || type === "WARNING"
            ? "warning"
            : "info";

      const createdAt = new Date(event.created_at).getTime();

      const minutesAgo = Number.isFinite(createdAt)
        ? Math.max(
            0,
            Math.floor((Date.now() - createdAt) / 60000)
          )
        : 0;

      return {
        id: event.id,
        clientId: event.client_id,
        clientName:
          clientNames.get(event.client_id) ||
          "PC tidak diketahui",
        type,
        description: event.message || "Tidak ada deskripsi",
        minutesAgo,
        severity,
      };
    });

    return NextResponse.json(
      { alerts },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Get alerts error:", error);

    return NextResponse.json(
      { error: "Gagal mengambil data alerts." },
      { status: 500 }
    );
  }
}