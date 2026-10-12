"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

type StatusDistributionItem = {
  key: string;
  name: string;
  value: number;
};

type Props = {
  data: StatusDistributionItem[];
  totalClients: number;
};

const COLORS: Record<string, string> = {
  online: "#2FBF71",
  warning: "#E8A33D",
  offline: "#E5484D",
};

export function StatusDistributionChart({
  data,
  totalClients,
}: Props) {
  return (
    <div className="flex items-center gap-6">

      <div className="relative h-[160px] w-[160px] shrink-0">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>

            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={3}
              stroke="none"
            >
              {data.map(
                (entry) => (
                  <Cell
                    key={entry.key}
                    fill={
                      COLORS[
                        entry.key
                      ] || "#64748B"
                    }
                  />
                )
              )}
            </Pie>

            <Tooltip
              contentStyle={{
                background: "#141B26",
                border:
                  "1px solid #232C3A",
                borderRadius: 6,
                fontSize: 12,
              }}
            />

          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">

          <div className="font-mono text-[22px] font-semibold text-base-50">
            {totalClients}
          </div>

          <div className="text-[10px] text-base-400">
            clients
          </div>

        </div>
      </div>

      <div className="space-y-2.5">

        {data.map(
          (entry) => (
            <div
              key={entry.key}
              className="flex items-center gap-2 text-[12px]"
            >

              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    COLORS[
                      entry.key
                    ] || "#64748B",
                }}
              />

              <span className="text-base-300">
                {entry.name}
              </span>

              <span className="ml-auto font-mono font-medium text-base-100">
                {entry.value}
              </span>

            </div>
          )
        )}

      </div>

    </div>
  );
}