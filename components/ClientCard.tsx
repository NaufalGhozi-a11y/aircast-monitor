import Link from "next/link";
import { MapPin, Radio } from "lucide-react";
import type { Client } from "@/lib/types";
import { StatusBadge, clientStatusTone, onAirTone } from "@/components/StatusBadge";
import { ResourceUsage } from "@/components/ResourceUsage";
import { formatRelativeMinutes } from "@/lib/utils";

export function ClientCard({ client }: { client: Client }) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="block rounded-md border border-base-700 bg-base-900 p-4 transition-colors hover:border-base-500 hover:bg-base-850"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-base-50">
            {client.displayName}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-base-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{client.location}</span>
          </div>
        </div>
        <StatusBadge
          tone={clientStatusTone(client.status)}
          label={client.status}
          className="shrink-0 capitalize"
        />
      </div>

      <div className="mt-3.5 space-y-2.5">
        <ResourceUsage label="CPU" value={client.cpu} />
        <ResourceUsage label="RAM" value={client.ram} />
      </div>

      <div className="mt-3.5 flex items-center justify-between border-t border-base-700 pt-2.5 text-[11px] text-base-400">
        <span className="flex items-center gap-1">
          <Radio className="h-3 w-3" />
          <StatusBadge tone={onAirTone(client.onAir)} label={client.onAir} className="capitalize" />
        </span>
        <span>{formatRelativeMinutes(client.lastSeenMinutesAgo)}</span>
      </div>
    </Link>
  );
}
