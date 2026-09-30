"use client";

/** Badge แสดงสถานะพร้อมสี (ใช้ร่วมกับ machines/alarms/maintenance) */
const STATUS_STYLES = {
  Running: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Stop: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  Alarm: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Maintenance:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Open: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "In Progress":
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Closed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Pending: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  Completed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export default function StatusBadge({ value }) {
  const style =
    STATUS_STYLES[value] ||
    "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}
    >
      {value}
    </span>
  );
}