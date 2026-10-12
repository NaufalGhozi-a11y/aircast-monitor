"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Copy, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const CLIENT_TYPES = ["Studio PC", "Broadcast Server", "Relay Unit"];

export default function AddClientPage() {
  const [pcName, setPcName] = useState("");
  const [location, setLocation] = useState("");
  const [station, setStation] = useState("");
  const [clientType, setClientType] = useState(CLIENT_TYPES[0]);
  const [notes, setNotes] = useState("");

  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pcName,
          location,
          station,
          clientType,
          notes,
        }),
      });

      const text = await res.text();

      let data: any;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Backend returned an invalid response (HTTP ${res.status}). Check the Next.js terminal.`
        );
      }

      if (!res.ok) {
        throw new Error(data?.error || "Registration failed");
      }

      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Registration failed"
      );
    } finally {
      setSaving(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-base-400 hover:text-base-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to PC Clients
        </Link>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-status-online" />

            <div>
              <p className="text-[14px] font-medium text-base-50">
                {result.client.pc_name} registered
              </p>

              <p className="mt-1 text-[12.5px] text-base-400">
                The token below is shown now. Store it securely; it cannot be
                recovered later.
              </p>
            </div>

            <div className="w-full space-y-2 rounded bg-base-850 p-4 text-left text-[12px]">
              <p>
                <b>Client ID:</b>{" "}
                <span className="font-mono">
                  {result.agent.clientId}
                </span>
              </p>

              <p>
                <b>Client Code:</b>{" "}
                <span className="font-mono">
                  {result.client.client_code}
                </span>
              </p>

              <p>
                <b>Station:</b>{" "}
                {result.client.station || "—"}
              </p>

              <p>
                <b>API URL:</b>{" "}
                <span className="font-mono break-all">
                  {result.agent.apiUrl ||
                    `${window.location.origin}/api/agent/heartbeat`}
                </span>
              </p>

              <p>
                <b>Agent Token:</b>
              </p>

              <div className="flex gap-2">
                <Input
                  readOnly
                  value={result.agent.token}
                />

                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded border border-base-600 bg-base-850 px-3 text-base-300 hover:bg-base-800"
                  onClick={() =>
                    navigator.clipboard.writeText(result.agent.token)
                  }
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/clients">
                <Button variant="primary" size="sm">
                  Back to PC Clients
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-base-400 hover:text-base-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to PC Clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Client PC</CardTitle>

          <div className="flex items-center gap-1.5 rounded bg-base-850 px-2 py-1 font-mono text-[11px] text-base-300">
            <Hash className="h-3 w-3 text-base-400" />
            Generated on registration
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pcName">PC Name</Label>
                <Input
                  id="pcName"
                  placeholder="e.g. pro1bandung"
                  value={pcName}
                  onChange={(e) => setPcName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Bandung"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="station">Station / Unit</Label>
              <Input
                id="station"
                placeholder="e.g. RRI Bandung"
                value={station}
                onChange={(e) => setStation(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="clientType">Client Type</Label>

              <Select
                id="clientType"
                value={clientType}
                onChange={(e) => setClientType(e.target.value)}
              >
                {CLIENT_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>

              <Textarea
                id="notes"
                rows={3}
                placeholder="Optional notes about this client PC…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-[12px] text-status-critical">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-base-700 pt-4">
              <Link href="/clients">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                >
                  Cancel
                </Button>
              </Link>

              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={saving}
              >
                {saving ? "Registering…" : "Register Client PC"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}