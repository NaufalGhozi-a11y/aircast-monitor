import Link from "next/link";
import { ChevronRight, Boxes } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonitoringChart } from "@/components/MonitoringChart";
import { ResourceUsage } from "@/components/ResourceUsage";
import { StatusBadge, clientStatusTone } from "@/components/StatusBadge";
import { clients, fleetOverviewSeries } from "@/lib/mock-data";
import { formatRelativeMinutes } from "@/lib/utils";

export default function MonitoringPage() {
  const attention = [...clients]
    .filter((c) => c.status !== "offline")
    .sort((a, b) => Math.max(b.cpu, b.ram) - Math.max(a.cpu, a.ram))
    .slice(0, 10);

  const containerTotals = clients
    .flatMap((c) => c.containers)
    .reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Fleet Resource Trend</CardTitle>
          <span className="text-[11px] text-base-400">Average across active clients · 24h</span>
        </CardHeader>
        <CardContent>
          <MonitoringChart
            data={fleetOverviewSeries}
            metrics={[
              { key: "cpu", label: "CPU", color: "#4C8DFF" },
              { key: "ram", label: "RAM", color: "#2FBF71" },
            ]}
            height={260}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Needs Attention</CardTitle>
            <span className="text-[11px] text-base-400">Highest CPU / RAM right now</span>
          </CardHeader>
          <ul className="divide-y divide-base-700">
            {attention.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-40 shrink-0">
                  <Link
                    href={`/clients/${c.id}`}
                    className="truncate text-[12.5px] font-medium text-base-100 hover:text-accent"
                  >
                    {c.displayName}
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <StatusBadge tone={clientStatusTone(c.status)} label={c.status} className="capitalize" />
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <ResourceUsage label="CPU" value={c.cpu} />
                  <ResourceUsage label="RAM" value={c.ram} />
                </div>
                <span className="w-16 shrink-0 text-right text-[11px] text-base-400">
                  {formatRelativeMinutes(c.lastSeenMinutesAgo)}
                </span>
                <Link href={`/clients/${c.id}`} className="text-base-400 hover:text-base-100">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Container Health</CardTitle>
            <Boxes className="h-4 w-4 text-base-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "running", label: "Running", tone: "text-status-online" },
              { key: "restarting", label: "Restarting", tone: "text-status-warning" },
              { key: "exited", label: "Exited", tone: "text-status-critical" },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between text-[12.5px]">
                <span className="text-base-300">{row.label}</span>
                <span className={`font-mono font-semibold ${row.tone}`}>
                  {containerTotals[row.key] ?? 0}
                </span>
              </div>
            ))}
            <p className="border-t border-base-700 pt-3 text-[11px] leading-relaxed text-base-400">
              Container state is tracked per client — open a client's detail page to see
              aircast-app, aircast-db, and aircast-gosrv individually.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
