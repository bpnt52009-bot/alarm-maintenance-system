"use client";

/** Badge แสดงสถานะพร้อมสี (ใช้ร่วมกับ machines/alarms/maintenance) */
const STATUS_STYLES = {
  Running: "bg-emerald-100 text-emerald-700",
  Stop: "bg-slate-200 text-slate-700",
  Alarm: "bg-red-100 text-red-700",
  Maintenance: "bg-amber-100 text-amber-700",
  Open: "bg-red-100 text-red-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Closed: "bg-emerald-100 text-emerald-700",
  Pending: "bg-slate-200 text-slate-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

export default function StatusBadge({ value }) {
  const style = STATUS_STYLES[value] || "bg-slate-100 text-slate-500";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {value}
    </span>
  );
}