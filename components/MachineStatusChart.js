"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = {
  Running: "#10b981",
  Stop: "#64748b",
  Alarm: "#ef4444",
  Maintenance: "#f59e0b",
};

/** กราฟ Pie แสดงสัดส่วนสถานะของเครื่องจักร (Running/Stop/Alarm/Maintenance) */
export default function MachineStatusChart({ data = [] }) {
  const chartData = useMemo(() => {
    const counts = { Running: 0, Stop: 0, Alarm: 0, Maintenance: 0 };
    data.forEach((m) => {
      if (counts[m.status] !== undefined) counts[m.status] += 1;
    });
    return Object.keys(counts).map((status) => ({
      name: status,
      value: counts[status],
      color: STATUS_COLORS[status],
    }));
  }, [data]);

  return (
    <div className="h-64 w-full">
      {chartData.every((d) => d.value === 0) ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-400">
          ยังไม่มีข้อมูลเครื่องจักร
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}