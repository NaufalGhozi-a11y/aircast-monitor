
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Client, ClientStatus } from "@/lib/types";
import {
  StatusBadge,
  clientStatusTone,
  onAirTone,
} from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  formatPercent,
  formatRelativeMinutes,
} from "@/lib/utils";

type SortKey =
  | "name"
  | "cpu"
  | "ram"
  | "disk"
  | "lastSeenMinutesAgo";

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "name", label: "PC Name" },
  { key: "cpu", label: "CPU" },
  { key: "ram", label: "RAM" },
  { key: "disk", label: "Disk" },
  { key: "lastSeenMinutesAgo", label: "Last Seen" },
];

export function ClientTable({
  clients,
  onRefresh,
}: {
  clients: Client[];
  onRefresh: () => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [status, setStatus] = useState<"all" | ClientStatus>("all");
  const [version, setVersion] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setIsAdmin(false);
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setIsAdmin(
            data.profile?.role === "admin" &&
            data.profile?.is_active === true
          );
        }
      } catch (error) {
        console.error("Failed to load client permissions:", error);
        if (!cancelled) setIsAdmin(false);
      }
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const uniqueLocations = useMemo(
    () => [...new Set(clients.map((client) => client.location))].sort(),
    [clients]
  );

  const uniqueAircastVersions = useMemo(
    () =>
      [
        ...new Set(
          clients
            .map((client) => client.aircastVersion)
            .filter((value) => value !== "—")
        ),
      ].sort(),
    [clients]
  );

  const filtered = useMemo(() => {
    let rows = clients.filter((client) => {
      const query = search.toLowerCase();

      if (
        search &&
        !client.displayName.toLowerCase().includes(query) &&
        !client.name.toLowerCase().includes(query)
      ) {
        return false;
      }

      if (location !== "all" && client.location !== location) {
        return false;
      }

      if (status !== "all" && client.status !== status) {
        return false;
      }

      if (version !== "all" && client.aircastVersion !== version) {
        return false;
      }

      return true;
    });

    rows = [...rows].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "name") {
        comparison = a.displayName.localeCompare(b.displayName);
      } else if (sortKey === "lastSeenMinutesAgo") {
        comparison = a.lastSeenMinutesAgo - b.lastSeenMinutesAgo;
      } else {
        comparison = a[sortKey] - b[sortKey];
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    return rows;
  }, [clients, search, location, status, version, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((direction) =>
        direction === "asc" ? "desc" : "asc"
      );
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleEdit(client: Client) {
    if (!isAdmin) return;

    const pcName = window.prompt("Masukkan nama PC:", client.displayName);
    if (pcName === null) return;

    const newName = pcName.trim();

    if (!newName) {
      window.alert("Nama PC tidak boleh kosong.");
      return;
    }

    const newLocation = window.prompt(
      "Masukkan lokasi PC:",
      client.location === "—" ? "" : client.location
    );

    if (newLocation === null) return;

    if (!newLocation.trim()) {
      window.alert("Lokasi PC tidak boleh kosong.");
      return;
    }

    setBusyClientId(client.id);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pcName: newName,
          location: newLocation.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Gagal memperbarui PC.");
      }

      window.alert("Data PC berhasil diperbarui.");
      await onRefresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengedit PC."
      );
    } finally {
      setBusyClientId(null);
    }
  }

  async function handleDelete(client: Client) {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Yakin ingin menghapus PC "${client.displayName}"?\n\nData monitoring dan data terkait PC ini juga akan dihapus.`
    );

    if (!confirmed) return;

    setBusyClientId(client.id);

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Gagal menghapus PC.");
      }

      window.alert(data?.message || "PC berhasil dihapus.");
      await onRefresh();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus PC."
      );
    } finally {
      setBusyClientId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-base-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by PC name…"
            className="pl-8"
          />
        </div>

        <Select
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="w-44"
        >
          <option value="all">All locations</option>
          {uniqueLocations.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as "all" | ClientStatus)
          }
          className="w-36"
        >
          <option value="all">All statuses</option>
          <option value="online">Online</option>
          <option value="warning">Warning</option>
          <option value="offline">Offline</option>
        </Select>

        <Select
          value={version}
          onChange={(event) => setVersion(event.target.value)}
          className="w-40"
        >
          <option value="all">All versions</option>
          {uniqueAircastVersions.map((item) => (
            <option key={item} value={item}>v{item}</option>
          ))}
        </Select>

        <span className="ml-auto whitespace-nowrap text-[12px] text-base-400">
          {filtered.length} of {clients.length} clients
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border border-base-700 bg-base-900">
        <table className="w-full min-w-[1000px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-base-700 text-[11px] uppercase tracking-wide text-base-400">
              {SORT_LABELS.map(({ key, label }) => (
                <th key={key} className="whitespace-nowrap px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort(key)}
                    className="flex items-center gap-1 hover:text-base-100"
                  >
                    {label}
                    {sortKey === key ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 font-medium">Location</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">OnAir</th>
              <th className="whitespace-nowrap px-4 py-3 font-medium">Containers</th>
              <th className="whitespace-nowrap px-4 py-3 text-center font-medium">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-base-700">
            {filtered.map((client) => {
              const busy = busyClientId === client.id;

              return (
                <tr
                  key={client.id}
                  className="text-base-200 transition-colors hover:bg-base-850"
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-base-100">
                    {client.displayName}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatPercent(client.cpu)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatPercent(client.ram)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatPercent(client.disk)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-base-400">
                    {formatRelativeMinutes(client.lastSeenMinutesAgo)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-base-400">
                    {client.location}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      tone={clientStatusTone(client.status)}
                      label={client.status}
                      className="capitalize"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      tone={onAirTone(client.onAir)}
                      label={client.onAir}
                      className="capitalize"
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-base-400">
                    {client.containerCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        title="Lihat detail PC"
                        aria-label={`Lihat ${client.displayName}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-base-600 px-3 text-xs font-medium text-base-200 transition-colors hover:border-base-400 hover:bg-base-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>

                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleEdit(client)}
                            disabled={busy}
                            title="Edit PC"
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-base-600 px-3 text-xs font-medium text-base-200 transition-colors hover:border-base-400 hover:bg-base-800 disabled:opacity-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDelete(client)}
                            disabled={busy}
                            title="Hapus PC"
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-red-500/50 px-3 text-xs font-medium text-red-500 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-base-400">
                  No clients match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
