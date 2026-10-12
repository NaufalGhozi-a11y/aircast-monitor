
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Monitor,
  MapPin,
  Server,
  Loader2,
  AlertCircle,
} from "lucide-react";

type ClientForm = {
  pcName: string;
  location: string;
  clientType: string;
  status: string;
};

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [form, setForm] = useState<ClientForm>({
    pcName: "",
    location: "",
    clientType: "Studio PC",
    status: "unknown",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadClient() {
      setLoading(true);
      setError("");
      setNotFound(false);

      try {
        const res = await fetch(`/api/clients/${id}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true);
            throw new Error("PC tidak ditemukan.");
          }

          throw new Error(
            data?.error || "Gagal mengambil data PC."
          );
        }

        const client = data?.client ?? data?.data ?? data;

        if (!active) return;

        setForm({
          pcName:
            client.pc_name ??
            client.pcName ??
            client.name ??
            "",
          location: client.location ?? "",
          clientType:
            client.client_type ??
            client.clientType ??
            "Studio PC",
          status: client.status ?? "unknown",
        });
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Terjadi kesalahan."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadClient();

    return () => {
      active = false;
    };
  }, [id]);

  function updateField(
    field: "pcName" | "location",
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const pcName = form.pcName.trim();
    const location = form.location.trim();

    if (!pcName || !location) {
      setError("Nama PC dan lokasi wajib diisi.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pcName,
          location,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          data?.error || "Gagal menyimpan perubahan."
        );
      }

      router.push("/clients");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan."
      );
    } finally {
      setSaving(false);
    }
  }

  const statusLabel: Record<string, string> = {
    online: "Online",
    warning: "Warning",
    offline: "Offline",
    unknown: "Unknown",
  };

  const statusColor: Record<string, string> = {
    online: "text-emerald-400",
    warning: "text-amber-400",
    offline: "text-red-400",
    unknown: "text-slate-400",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <Link
          href="/clients"
          aria-label="Kembali ke PC Clients"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-base-700 text-base-300 transition-colors hover:bg-base-800 hover:text-base-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold text-base-100">
            Edit Client PC
          </h1>
          <p className="text-xs text-base-400">
            Perbarui informasi perangkat yang terdaftar.
          </p>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-base-700 bg-base-900 py-16 text-sm text-base-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data PC...
        </div>
      )}

      {/* ERROR / NOT FOUND */}
      {!loading && (error || notFound) && (
        <div className="space-y-4 rounded-lg border border-status-critical/30 bg-status-critical/5 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-critical" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-base-100">
                {notFound ? "PC tidak ditemukan" : "Gagal memuat data"}
              </p>
              <p className="text-xs text-base-400">{error}</p>
            </div>
          </div>

          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke PC Clients
          </Link>
        </div>
      )}

      {/* EDIT FORM */}
      {!loading && !error && !notFound && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* DEVICE INFORMATION */}
          <section className="overflow-hidden rounded-lg border border-base-700 bg-base-900">
            <div className="flex items-center gap-3 border-b border-base-700 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/10 text-accent">
                <Monitor className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-base-100">
                  Informasi Perangkat
                </h2>
                <p className="text-xs text-base-400">
                  Informasi dasar PC client.
                </p>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {/* PC NAME */}
              <div className="space-y-1.5">
                <label
                  htmlFor="pcName"
                  className="flex items-center gap-1.5 text-xs font-medium text-base-200"
                >
                  <Monitor className="h-3.5 w-3.5 text-base-400" />
                  Nama PC
                  <span className="text-red-400">*</span>
                </label>

                <input
                  id="pcName"
                  type="text"
                  required
                  maxLength={100}
                  value={form.pcName}
                  onChange={(e) =>
                    updateField("pcName", e.target.value)
                  }
                  placeholder="Contoh: PC Bandung"
                  className="h-10 w-full rounded-md border border-base-700 bg-base-850 px-3 text-sm text-base-100 outline-none transition-colors placeholder:text-base-500 focus:border-accent focus:ring-1 focus:ring-accent"
                />

                <p className="text-[11px] text-base-400">
                  Nama untuk mengidentifikasi PC pada dashboard.
                </p>
              </div>

              {/* LOCATION */}
              <div className="space-y-1.5">
                <label
                  htmlFor="location"
                  className="flex items-center gap-1.5 text-xs font-medium text-base-200"
                >
                  <MapPin className="h-3.5 w-3.5 text-base-400" />
                  Lokasi
                  <span className="text-red-400">*</span>
                </label>

                <input
                  id="location"
                  type="text"
                  required
                  maxLength={150}
                  value={form.location}
                  onChange={(e) =>
                    updateField("location", e.target.value)
                  }
                  placeholder="Contoh: Bandung"
                  className="h-10 w-full rounded-md border border-base-700 bg-base-850 px-3 text-sm text-base-100 outline-none transition-colors placeholder:text-base-500 focus:border-accent focus:ring-1 focus:ring-accent"
                />

                <p className="text-[11px] text-base-400">
                  Lokasi stasiun atau tempat PC berada.
                </p>
              </div>

              {/* CLIENT TYPE */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-base-200">
                  <Server className="h-3.5 w-3.5 text-base-400" />
                  Tipe Perangkat
                </label>

                <div className="flex h-10 items-center rounded-md border border-base-700 bg-base-850 px-3 text-sm text-base-400">
                  {form.clientType}
                  <span className="ml-auto text-[10px] text-base-500">
                    Read only
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* CURRENT STATUS */}
          <section className="rounded-lg border border-base-700 bg-base-900 p-5">
            <h2 className="mb-3 text-sm font-semibold text-base-100">
              Status Perangkat
            </h2>

            <div className="flex items-center justify-between rounded-md border border-base-700 bg-base-850 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-xs text-base-400">
                  Status koneksi terakhir
                </p>
                <p
                  className={`text-sm font-medium ${
                    statusColor[form.status] ?? "text-base-300"
                  }`}
                >
                  {statusLabel[form.status] ?? form.status}
                </p>
              </div>

              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  form.status === "online"
                    ? "bg-emerald-400"
                    : form.status === "warning"
                      ? "bg-amber-400"
                      : form.status === "offline"
                        ? "bg-red-400"
                        : "bg-slate-500"
                }`}
              />
            </div>

            <p className="mt-2 text-[11px] text-base-400">
              Status dikelola otomatis berdasarkan data monitoring.
            </p>
          </section>

          {/* ERROR WHILE SAVING */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-status-critical/30 bg-status-critical/10 px-3 py-2.5 text-xs text-status-critical"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* FORM ACTIONS */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-base-700 pt-4">
            <Link
              href="/clients"
              className="inline-flex h-9 items-center justify-center rounded-md border border-base-700 px-4 text-xs font-medium text-base-300 transition-colors hover:bg-base-800 hover:text-base-100"
            >
              Batal
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-accent px-4 text-xs font-medium text-white transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}