"use client";

/**
 * ปุ่ม "Export CSV" — ส่งออกข้อมูลเป็นไฟล์ CSV สำหรับวิเคราะห์เพิ่มเติม
 *
 * @param {Array}  data      รายการข้อมูล (array ของ object)
 * @param {string} filename  ชื่อไฟล์ปลายทาง (ไม่ต้องใส่ .csv)
 * @param {Array}  columns   [{ key, label, accessor? }] ถ้าไม่ระบุใช้ทุก key ของ row แรก
 * @param {string} label     ข้อความบนปุ่ม
 */
export default function ExportCSV({
  data = [],
  filename = "export",
  columns = [],
  label = "Export CSV",
}) {
  const escapeCell = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).replace(/"/g, '""');
  };

  const getValue = (row, col) =>
    col.accessor ? col.accessor(row) : row[col.key];

  const toCsv = () => {
    const cols =
      columns.length > 0
        ? columns
        : Object.keys(data[0] || {}).map((k) => ({ key: k, label: k }));
    const header = cols.map((c) => `"${escapeCell(c.label)}"`).join(",");
    const rows = data.map((row) =>
      cols.map((c) => `"${escapeCell(getValue(row, c))}"`).join(",")
    );
    return [header, ...rows].join("\n");
  };

  const handleExport = () => {
    if (!data || data.length === 0) return;
    const csv = toCsv();
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        />
      </svg>
      {label}
    </button>
  );
}