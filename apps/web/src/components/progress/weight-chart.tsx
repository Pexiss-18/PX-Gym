"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BodyHistoryPoint } from "@/lib/types";

export function WeightChart({ history }: { history: BodyHistoryPoint[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="oklch(1 0 0 / 6%)" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="oklch(0.63 0.014 264)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <YAxis
            yAxisId="weight"
            stroke="oklch(0.63 0.014 264)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            domain={["dataMin - 2", "dataMax + 2"]}
          />
          <YAxis
            yAxisId="fat"
            orientation="right"
            stroke="oklch(0.63 0.014 264)"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            domain={["dataMin - 2", "dataMax + 2"]}
          />
          <Tooltip
            contentStyle={{
              background: "oklch(0.21 0.008 264)",
              border: "1px solid oklch(1 0 0 / 10%)",
              borderRadius: "0.9rem",
              fontSize: 12,
            }}
            labelStyle={{ color: "oklch(0.97 0.004 264)" }}
          />
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="weightKg"
            name="Peso (kg)"
            stroke="oklch(0.87 0.23 126)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "oklch(0.87 0.23 126)", strokeWidth: 0 }}
          />
          <Line
            yAxisId="fat"
            type="monotone"
            dataKey="bodyFatPct"
            name="Gordura (%)"
            stroke="oklch(0.72 0.17 32)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "oklch(0.72 0.17 32)", strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
