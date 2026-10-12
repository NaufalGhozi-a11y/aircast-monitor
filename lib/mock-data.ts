import { clients } from "./generated-clients";
import { rngFor } from "./rng";
import type {
  Alert,
  Client,
  EventKind,
  MonitoringData,
  MonitoringEvent,
} from "./types";

export { clients };

export function getClientById(id: string): Client | undefined {
  return clients.find((c) => c.id === id);
}

export const uniqueLocations = Array.from(
  new Set(clients.map((c) => c.location))
).sort((a, b) => a.localeCompare(b));

export const uniqueAircastVersions = Array.from(
  new Set(clients.map((c) => c.aircastVersion))
).sort();

// ---------------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------------

export const summary = {
  total: clients.length,
  online: clients.filter((c) => c.status === "online").length,
  warning: clients.filter((c) => c.status === "warning").length,
  offline: clients.filter((c) => c.status === "offline").length,
};

export const statusDistribution = [
  { name: "Online", value: summary.online, key: "online" as const },
  { name: "Warning", value: summary.warning, key: "warning" as const },
  { name: "Offline", value: summary.offline, key: "offline" as const },
];

const activeClients = clients.filter((c) => c.status !== "offline");
const avgCpu =
  activeClients.reduce((sum, c) => sum + c.cpu, 0) / (activeClients.length || 1);
const avgRam =
  activeClients.reduce((sum, c) => sum + c.ram, 0) / (activeClients.length || 1);

/** 24 hourly points of fleet-wide average CPU / RAM, oscillating around today's live average. */
export const fleetOverviewSeries: MonitoringData[] = (() => {
  const rng = rngFor("fleet-overview");
  const points: MonitoringData[] = [];
  for (let h = 23; h >= 0; h--) {
    const wobbleCpu = (rng() - 0.5) * 14;
    const wobbleRam = (rng() - 0.5) * 10;
    const hour = (24 + new Date().getHours() - h) % 24;
    points.push({
      label: `${String(hour).padStart(2, "0")}:00`,
      cpu: Math.min(96, Math.max(4, Math.round((avgCpu + wobbleCpu) * 10) / 10)),
      ram: Math.min(95, Math.max(8, Math.round((avgRam + wobbleRam) * 10) / 10)),
      disk: 0,
    });
  }
  return points;
})();

/** Per-client time series for the detail page — deterministic, trends toward the client's current live value. */
export function generateClientSeries(client: Client, points = 24): MonitoringData[] {
  const rng = rngFor(client.id + "-series");
  const series: MonitoringData[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const drift = (points - i) / points; // 0 -> 1, approaches "now"
    const noiseCpu = (rng() - 0.5) * 16;
    const noiseRam = (rng() - 0.5) * 10;
    const noiseDisk = (rng() - 0.5) * 2;
    const baseCpu = client.status === "offline" ? 0 : client.cpu;
    const baseRam = client.status === "offline" ? 0 : client.ram;
    const cpu = Math.min(99, Math.max(1, Math.round((baseCpu * (0.55 + 0.45 * drift) + noiseCpu) * 10) / 10));
    const ram = Math.min(98, Math.max(3, Math.round((baseRam * (0.6 + 0.4 * drift) + noiseRam) * 10) / 10));
    const disk = Math.min(99, Math.max(1, Math.round((client.disk + noiseDisk) * 10) / 10));
    const hourOffset = i;
    const hour = (24 + new Date().getHours() - hourOffset) % 24;
    series.push({ label: `${String(hour).padStart(2, "0")}:00`, cpu, ram, disk });
  }
  return series;
}

// ---------------------------------------------------------------------------
// Recent alerts (dashboard + alerts page)
// ---------------------------------------------------------------------------

const alertPool: Array<{ type: EventKind; description: (c: Client) => string; severity: Alert["severity"] }> = [
  { type: "HANG", description: (c) => `OnAir process on ${c.displayName} stopped responding`, severity: "critical" },
  { type: "CRASH", description: (c) => `aircast-app container crashed and restarted`, severity: "critical" },
  { type: "WARNING", description: (c) => `CPU usage sustained above 85% for 10 minutes`, severity: "warning" },
  { type: "WARNING", description: (c) => `RAM usage sustained above 85% for 10 minutes`, severity: "warning" },
  { type: "WARNING", description: (c) => `Disk usage above 85%, cleanup recommended`, severity: "warning" },
  { type: "WARNING", description: (c) => `Agent heartbeat delayed by more than 5 minutes`, severity: "warning" },
  { type: "RECOVERED", description: (c) => `${c.displayName} back online after being unreachable`, severity: "info" },
  { type: "NORMAL", description: (c) => `Scheduled health check completed with no issues`, severity: "info" },
];

function buildAlerts(): Alert[] {
  const rng = rngFor("alerts-feed");
  const pool = [...clients.filter((c) => c.status !== "online"), ...clients].slice(0, 60);
  const shuffled = [...pool].sort(() => rng() - 0.5);
  const picked = shuffled.slice(0, 18);

  return picked.map((c, idx) => {
    const template = alertPool[Math.floor(rng() * alertPool.length)];
    const minutesAgo = Math.floor(rng() * 60 * 30); // within last ~30h, weighted recent by sort below
    return {
      id: `alert-${c.id}-${idx}`,
      clientId: c.id,
      clientName: c.displayName,
      type: template.type,
      description: template.description(c),
      minutesAgo,
      severity: template.severity,
    };
  }).sort((a, b) => a.minutesAgo - b.minutesAgo);
}

export const alerts: Alert[] = buildAlerts();

export function getAlertsForClient(clientId: string): Alert[] {
  return alerts.filter((a) => a.clientId === clientId);
}

// ---------------------------------------------------------------------------
// Monitoring event timeline (client detail page)
// ---------------------------------------------------------------------------

export function generateEventTimeline(client: Client): MonitoringEvent[] {
  const rng = rngFor(client.id + "-events");
  const events: MonitoringEvent[] = [];
  const count = client.status === "online" ? 4 : client.status === "warning" ? 6 : 7;

  let minutesAgo = 5;
  for (let i = 0; i < count; i++) {
    let kind: EventKind = "NORMAL";
    const roll = rng();
    if (i === 0 && client.status === "offline") kind = "CRASH";
    else if (i === 0 && client.status === "warning") kind = "WARNING";
    else if (roll > 0.88) kind = "CRASH";
    else if (roll > 0.75) kind = "HANG";
    else if (roll > 0.55) kind = "WARNING";
    else if (roll > 0.45) kind = "RECOVERED";
    else kind = "NORMAL";

    
    const descriptions: Record<EventKind, string> = {
      NORMAL: "Routine check-in, all metrics within range",
      WARNING: "Resource usage crossed warning threshold",
      HANG: "OnAir process unresponsive to health check",
      CRASH: "Process exited unexpectedly, container restarted",
      RECOVERED: "Metrics returned to normal range",
      STOPPED: "OnAir process stopped",
      STARTED: "OnAir process started",
    };


    events.push({
      id: `${client.id}-evt-${i}`,
      kind,
      minutesAgo,
      description: descriptions[kind],
    });
    minutesAgo += Math.floor(20 + rng() * 240);
  }
  return events;
}
