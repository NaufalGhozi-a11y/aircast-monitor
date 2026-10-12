
"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut } from "lucide-react";
import { alerts } from "@/lib/mock-data";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/clients": "PC Clients",
  "/monitoring": "Monitoring",
  "/alerts": "Alerts",
  "/settings": "Settings",
};

function resolveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/clients/add")) return "Add Client PC";
  if (pathname.startsWith("/clients/")) return "Client Detail";
  return "AirCast Monitor";
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = resolveTitle(pathname);

  const unread = alerts.filter(
    (a) => a.severity !== "info"
  ).length;

  function handleLogout() {
    router.push("/login");
  }

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-base-700 bg-base-900/70 px-6 backdrop-blur">
      {/* Page title */}
      <h1 className="text-[15px] font-semibold text-base-50">
        {title}
      </h1>

      {/* Right section */}
      <div className="ml-auto flex shrink-0 items-center gap-4">
        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => router.push("/alerts")}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-base-300 transition-colors hover:bg-base-800 hover:text-base-100"
        >
          <Bell className="h-4 w-4" />

          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-status-critical px-1 text-[9px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {/* Admin profile */}
        <div className="flex items-center gap-3 border-l border-base-700 pl-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-base-700 text-xs font-semibold text-base-100">
            AD
          </div>

          <div className="hidden leading-tight sm:block">
            <div className="text-[12px] font-semibold text-base-100">
              Admin
            </div>
            <div className="text-[10px] text-base-400">
              Broadcast Ops
            </div>
          </div>

          {/* Logout */}
          <button
            type="button"
            aria-label="Sign out"
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-md text-base-400 transition-colors hover:bg-base-800 hover:text-status-critical"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}