
"use client";

import { useMemo, useState } from "react";
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

  // FILTER OPTIONS
  const uniqueLocations = Array.from(
    new Set(clients.map((c) => c.location))
  ).sort();

  const uniqueAircastVersions = Array.from(
    new Set(
      clients
        .map((c) => c.aircastVersion)
        .filter((v) => v !== "—")
    )
  ).sort();

  // SEARCH, FILTER, AND SORT
  const filtered = useMemo(() => {
    let rows = clients.filter((c) => {
      const query = search.toLowerCase();

      if (
        search &&
        !c.displayName.toLowerCase().includes(query) &&
        !c.name.toLowerCase().includes(query)
      ) {
        return false;
      }

      if (location !== "all" && c.location !== location) {
        return false;
      }

      if (status !== "all" && c.status !== status) {
        return false;
      }

      if (version !== "all" && c.aircastVersion !== version) {
        return false;
      }

      return true;
    });

    rows = [...rows].sort((a, b) => {
      let cmp = 0;

      if (sortKey === "name") {
        cmp = a.displayName.localeCompare(b.displayName);
      } else if (sortKey === "lastSeenMinutesAgo") {
        cmp = a.lastSeenMinutesAgo - b.lastSeenMinutesAgo;
      } else {
        cmp = a[sortKey] - b[sortKey];
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [
    clients,
    search,
    location,
    status,
    version,
    sortKey,
    sortDir,
  ]);

  // SORT HANDLER
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // EDIT CLIENT
  async function handleEdit(client: Client) {
    const pcName = window.prompt(
      "Masukkan nama PC:",
      client.displayName
    );

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
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pcName: newName,
          location: newLocation.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || "Gagal memperbarui PC."
        );
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

  // DELETE CLIENT
  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus PC "${client.displayName}"?\n\nData monitoring dan data terkait PC ini juga akan dihapus.`
    );

    if (!confirmed) return;

    setBusyClientId(client.id);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || "Gagal menghapus PC."
        );
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
      {/* SEARCH AND FILTER */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-base-400" />

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PC name…"
            className="pl-8"
          />
        </div>

        <Select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-44"
        >
          <option value="all">All locations</option>
          {uniqueLocations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </Select>

        <Select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "all" | ClientStatus)
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
          onChange={(e) => setVersion(e.target.value)}
          className="w-40"
        >
          <option value="all">All versions</option>
          {uniqueAircastVersions.map((v) => (
            <option key={v} value={v}>
              v{v}
            </option>
          ))}
        </Select>

        <span className="ml-auto whitespace-nowrap text-[12px] text-base-400">
          {filtered.length} of {clients.length} clients
        </span>
      </div>

      {/* CLIENT TABLE */}
      <div className="overflow-x-auto rounded-md border border-base-700 bg-base-900">
        <table className="w-full min-w-[1000px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-base-700 text-[11px] uppercase tracking-wide text-base-400">
              {SORT_LABELS.map(({ key, label }) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-4 py-3 font-medium"
                >
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

              <th className="whitespace-nowrap px-4 py-3 font-medium">
                Location
              </th>

              <th className="whitespace-nowrap px-4 py-3 font-medium">
                Status
              </th>

              <th className="whitespace-nowrap px-4 py-3 font-medium">
                OnAir
              </th>

              <th className="whitespace-nowrap px-4 py-3 font-medium">
                Containers
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-center font-medium">
                Action
              </th>
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
                  {/* PC NAME */}
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-base-100">
                    {client.displayName}
                  </td>

                  {/* CPU */}
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatPercent(client.cpu)}
                  </td>

                  {/* RAM */}
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatPercent(client.ram)}
                  </td>

                  {/* DISK */}
                  <td className="whitespace-nowrap px-4 py-3 font-mono">
                    {formatPercent(client.disk)}
                  </td>

                  {/* LAST SEEN */}
                  <td className="whitespace-nowrap px-4 py-3 text-base-400">
                    {formatRelativeMinutes(client.lastSeenMinutesAgo)}
                  </td>

                  {/* LOCATION */}
                  <td className="whitespace-nowrap px-4 py-3 text-base-400">
                    {client.location}
                  </td>

                  {/* STATUS */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      tone={clientStatusTone(client.status)}
                      label={client.status}
                      className="capitalize"
                    />
                  </td>

                  {/* ONAIR STATUS */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <StatusBadge
                      tone={onAirTone(client.onAir)}
                      label={client.onAir}
                      className="capitalize"
                    />
                  </td>

                  {/* CONTAINER COUNT */}
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-base-400">
                    {client.containerCount}
                  </td>

                  {/* ACTION */}
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {/* VIEW */}
                      <Link
                        href={`/clients/${client.id}`}
                        title="Lihat detail PC"
                        aria-label={`Lihat ${client.displayName}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-base-600 px-3 text-xs font-medium text-base-200 transition-colors hover:border-base-400 hover:bg-base-800"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>

                      {/* EDIT */}
                      
                      <Link
                        href={`/clients/${client.id}/edit`}
                        title="Edit PC"
                        aria-label={`Edit ${client.displayName}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-base-600 px-3 text-xs font-medium text-base-200 transition-colors hover:border-base-400 hover:bg-base-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>

                      {/* DELETE */}
                      <button
                        type="button"
                        onClick={() => handleDelete(client)}
                        disabled={busy}
                        title="Hapus PC"
                        aria-label={`Hapus ${client.displayName}`}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-red-500/50 px-3 text-xs font-medium text-red-500 transition-colors hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-10 text-center text-base-400"
                >
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