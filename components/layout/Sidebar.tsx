
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Server,
  ActivitySquare,
  BellRing,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AppRole = "admin" | "user";

type ClientSummary = {
  status?: string | null;
};

type CurrentUserResponse = {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    full_name: string | null;
    role: AppRole;
    is_active: boolean;
  };
};

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "PC Clients", icon: Server },
  { href: "/monitoring", label: "Monitoring", icon: ActivitySquare },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

const ADMIN_NAV_ITEMS = [
  { href: "/users", label: "User Management", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const [role, setRole] = useState<AppRole | null>(null);
  const [profileName, setProfileName] = useState("");
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userError, setUserError] = useState(false);

  const loadUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        cache: "no-store",
      });

      if (!response.ok) {
        setRole(null);
        setProfileName("");
        setUserError(true);
        return;
      }

      const data: CurrentUserResponse = await response.json();
      const nextRole = data.profile?.role;

      if (
        data.profile?.is_active !== true ||
        (nextRole !== "admin" && nextRole !== "user")
      ) {
        setRole(null);
        setProfileName("");
        setUserError(true);
        return;
      }

      setRole(nextRole);
      setProfileName(
        data.profile.full_name || data.user.email || ""
      );
      setUserError(false);
    } catch (err) {
      console.error("Failed to load current user:", err);
      setRole(null);
      setProfileName("");
      setUserError(true);
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const response = await fetch("/api/clients", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load clients");
      }

      const data = await response.json();

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.clients)
          ? data.clients
          : [];

      setClients(rows);
      setError(false);
    } catch (err) {
      console.error("Failed to load fleet status:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUser();
    void loadClients();

    const interval = setInterval(() => {
      void loadUser();
      void loadClients();
    }, 15000);

    return () => clearInterval(interval);
  }, [loadUser, loadClients]);

  const navItems = [
    ...BASE_NAV_ITEMS,
    ...(role === "admin" ? ADMIN_NAV_ITEMS : []),
  ];

  const total = clients.length;

  const online = clients.filter(
    (client) => client.status?.toLowerCase() === "online"
  ).length;

  const alerts = clients.filter((client) =>
    ["warning", "offline"].includes(
      (client.status || "").toLowerCase()
    )
  ).length;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-base-700 bg-base-900">
      <div className="flex h-14 items-center gap-2 border-b border-base-700 px-5">
        <div className="flex h-12 w-12 items-center justify-center">
          <img
            src="/svara-logo.png"
            alt="Logo Perusahaan"
            className="h-20 w-auto object-contain"
          />
        </div>

        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight text-base-50">
            OnAir Monitor
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-accent/12 text-accent"
                  : "text-base-300 hover:bg-base-800 hover:text-base-100"
              )}
            >
              <Icon
                className="h-[16px] w-[16px] shrink-0"
                strokeWidth={2}
              />

              <span>{item.label}</span>

              {item.href === "/alerts" && (
                <span className="ml-auto rounded-full bg-status-critical/15 px-1.5 py-0.5 text-[10px] font-semibold text-status-critical">
                  {loading ? "—" : alerts}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-base-700 px-5 py-3">
        {userError ? (
          <div className="mb-2 text-[11px] text-status-critical">
            Role pengguna gagal dimuat
          </div>
        ) : role ? (
          <div className="mb-2 truncate text-[11px] text-base-400">
            {profileName} · {role === "admin" ? "Admin" : "User"}
          </div>
        ) : (
          <div className="mb-2 text-[11px] text-base-400">
            Memuat role...
          </div>
        )}

        <div className="flex items-center justify-between text-[11px] text-base-400">
          <span>Fleet status</span>

          <span
            className={cn(
              "font-mono",
              error
                ? "text-status-critical"
                : "text-status-online"
            )}
            title={
              error
                ? "Gagal mengambil data PC"
                : "Jumlah PC berdasarkan status dari API"
            }
          >
            {loading
              ? "Loading..."
              : error
                ? "Unavailable"
                : `${online}/${total} online`}
          </span>
        </div>
      </div>
    </aside>
  );
}
