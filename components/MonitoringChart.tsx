"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonitoringData } from "@/lib/types";

interface Metric {
  key: keyof Omit<MonitoringData, "label">;
  label: string;
  color: string;
}

interface MonitoringChartProps {
  data: MonitoringData[];
  metrics: Metric[];
  height?: number;
  unit?: string;
}

export function MonitoringChart({
  data,
  metrics,
  height = 220,
  unit = "%",
}: MonitoringChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          {metrics.map((m) => (
            <linearGradient key={m.key} id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={m.color} stopOpacity={0.28} />
              <stop offset="95%" stopColor={m.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke="#1B2432" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: "#7C8798", fontSize: 11 }}
          axisLine={{ stroke: "#232C3A" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: "#7C8798", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={50}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}${unit}`}
        />
        <Tooltip
          contentStyle={{
            background: "#141B26",
            border: "1px solid #232C3A",
            borderRadius: 6,
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
          labelStyle={{ color: "#A9B2C0", marginBottom: 4 }}
          formatter={(value: number, name: string) => [`${value}${unit}`, name]}
        />
        {metrics.length > 1 && (
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            iconSize={7}
            formatter={(v) => <span style={{ color: "#A9B2C0", fontSize: 12 }}>{v}</span>}
          />
        )}
        {metrics.map((m) => (
          <Area
            key={m.key}
            type="monotone"
            dataKey={m.key}
            name={m.label}
            stroke={m.color}
            strokeWidth={2}
            fill={`url(#fill-${m.key})`}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
