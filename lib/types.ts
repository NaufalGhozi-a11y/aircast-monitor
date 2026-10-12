
export type ClientStatus = "online" | "warning" | "offline" | "unknown";

export type OnAirStatus = "running" | "stopped";

export type ContainerStatus = "running" | "restarting" | "exited";

export type UpdateStatus =
  | "up-to-date"
  | "update-available"
  | "updating";

export interface Container {
  name: string;
  image: string;
  status: ContainerStatus;
  cpu: number;
  memory: number; // MB
  restartCount: number;
  created: string; // YYYY-MM-DD
}

export interface Client {
  id: string;
  name: string;
  displayName: string;
  location: string;
  clientType: string;
  status: ClientStatus;
  cpu: number;
  ram: number;
  disk: number;
  onAir: OnAirStatus;
  ip: string;
  agentVersion: string;
  aircastVersion: string;
  targetVersion: string;
  updateStatus: UpdateStatus;
  uptimeHours: number;
  containerCount: number;
  containers: Container[];
  lastSeenMinutesAgo: number;
}

export interface MonitoringData {
  label: string;
  cpu: number;
  ram: number;
  disk: number;
}

export interface AirCastInfo {
  onAirStatus: OnAirStatus;
  version: string;
  targetVersion: string;
  updateStatus: UpdateStatus;
}

export type AlertSeverity = "info" | "warning" | "critical";

export type EventKind =
  | "NORMAL"
  | "WARNING"
  | "HANG"
  | "CRASH"
  | "RECOVERED"
  | "STARTED"
  | "STOPPED";

export interface Alert {
  id: string;
  clientId: string;
  clientName: string;
  type: EventKind;
  description: string;
  minutesAgo: number;
  severity: AlertSeverity;
}

export interface MonitoringEvent {
  id: string;
  kind: EventKind;
  minutesAgo: number;
  description: string;
}