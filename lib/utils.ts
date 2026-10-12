import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeMinutes(minutesAgo: number): string {
  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}m ago`;
  const hours = minutesAgo / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = hours / 24;
  return `${Math.round(days)}d ago`;
}

export function formatUptime(hours: number): string {
  if (hours <= 0) return "—";
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  if (days === 0) return `${rem}h`;
  return `${days}d ${rem}h`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";

  return `${Number(value.toFixed(2))}%`;
}

export function formatMemory(mb: number): string {
  if (mb <= 0) return "—";
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export function titleCaseStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
