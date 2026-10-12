import type { Container } from "@/lib/types";
import { StatusBadge, containerStatusTone } from "@/components/StatusBadge";
import { formatMemory, formatPercent } from "@/lib/utils";

export function ContainerTable({ containers }: { containers: Container[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-base-700 text-[11px] uppercase tracking-wide text-base-400">
            <th className="px-4 py-2.5 font-medium">Container</th>
            <th className="px-4 py-2.5 font-medium">Image</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">CPU</th>
            <th className="px-4 py-2.5 font-medium">Memory</th>
            <th className="px-4 py-2.5 font-medium">Restarts</th>
            <th className="px-4 py-2.5 font-medium">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-base-700">
          {containers.map((c) => (
            <tr key={c.name} className="text-base-200">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-base-100">
                {c.name}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-base-400">
                {c.image}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5">
                <StatusBadge
                  tone={containerStatusTone(c.status)}
                  label={c.status}
                  className="capitalize"
                />
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono">
                {formatPercent(c.cpu)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono">
                {formatMemory(c.memory)}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono">
                {c.restartCount}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-base-400">
                {c.created}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
