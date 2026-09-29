"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Toast";
import ExportCSV from "@/components/ExportCSV";
import StatusBadge from "@/components/StatusBadge";
import { validateAlarm } from "@/lib/validation";

const ALARM_STATUSES = ["Open", "In Progress", "Closed"];
const EMPTY = {
  machine_id: "",
  alarm_code: "",
  alarm_description: "",
  date_time: new Date().toISOString().slice(0, 16),
  cause: "",
  status: "Open",
};

export default function AlarmsPage() {
  const { notify } = useToast();
  const { profile, isAdminUser } = useAuth();
  const [alarms, setAlarms] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟิลเตอร์/ค้นหา
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ฟอร์ม
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadAlarms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("alarms")
      .select("*, machines(machine_id, machine_name)")
      .order("date_time", { ascending: false });
    if (error) notify("โหลดข้อมูลอัลาร์มไม่สำเร็จ: " + error.message, "error");
    else setAlarms(data ?? []);
    setLoading(false);
  };

  const loadMachines = async () => {
    const { data } = await supabase
      .from("machines")
      .select("id, machine_id, machine_name")
      .order("machine_id");
    setMachines(data ?? []);
  };

  useEffect(() => {
    loadAlarms();
    loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // กรองหลายเงื่อนไขพร้อมกัน: ค้นหา + สถานะ + เครื่อง + ช่วงวันที่
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return alarms.filter((a) => {
      const mm = a.machines ?? {};
      const matchSearch =
        !kw ||
        [a.alarm_code, a.alarm_description, a.cause, mm.machine_id, mm.machine_name]
          .some((v) => (v || "").toLowerCase().includes(kw));
      const matchStatus = !filterStatus || a.status === filterStatus;
      const matchMachine = !filterMachine || a.machine_id === filterMachine;
      const matchFrom = !fromDate || (a.date_time || "") >= fromDate;
      const matchTo = !toDate || (a.date_time || "").slice(0, 10) <= toDate;
      return matchSearch && matchStatus && matchMachine && matchFrom && matchTo;
    });
  }, [alarms, search, filterStatus, filterMachine, fromDate, toDate]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      machine_id: a.machine_id,
      alarm_code: a.alarm_code,
      alarm_description: a.alarm_description,
      date_time: (a.date_time || "").slice(0, 16),
      cause: a.cause || "",
      status: a.status,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`ต้องการลบอัลาร์ม "${a.alarm_code}" จริงหรือไม่?`))
      return;
    const { error } = await supabase.from("alarms").delete().eq("id", a.id);
    if (error) notify("ลบไม่สำเร็จ: " + error.message, "error");
    else {
      notify("ลบอัลาร์มเรียบร้อย ✓");
      loadAlarms();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // update สถานะ alarm -> ไม่ต้อง round-trip ผ่าน DB trigger
    const errs = validateAlarm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      notify("กรุณาแก้ไขข้อมูลให้ถูกต้อง", "error");
      return;
    }
    setSaving(true);

    if (editing) {
      const { error } = await supabase
        .from("alarms")
        .update({
          machine_id: form.machine_id,
          alarm_code: form.alarm_code.trim(),
          alarm_description: form.alarm_description.trim(),
          date_time: form.date_time,
          cause: form.cause?.trim() || null,
          status: form.status,
        })
        .eq("id", editing.id);
      if (error) {
        notify("อัปเดตไม่สำเร็จ: " + error.message, "error");
        setSaving(false);
        return;
      }
      notify("อัปเดตอัลาร์มเรียบร้อย ✓");
    } else {
      const { error } = await supabase.from("alarms").insert({
        machine_id: form.machine_id,
        alarm_code: form.alarm_code.trim(),
        alarm_description: form.alarm_description.trim(),
        date_time: form.date_time,
        cause: form.cause?.trim() || null,
        status: form.status,
      });
      if (error) {
        notify("บันทึกไม่สำเร็จ: " + error.message, "error");
        setSaving(false);
        return;
      }
      notify("บันทึกอัลาร์มเรียบร้อย ✓");
    }

    setShowForm(false);
    setErrors({});
    setSaving(false);
    loadAlarms();
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Alarm Records</h1>
            <p className="mt-1 text-sm text-slate-500">
              บันทึกและจัดการอัลาร์มของเครื่องจักร
              {isAdminUser ? " (Admin: จัดการได้ทั้งหมด)" : " (Technician: เพิ่ม/แก้ไขสถานะได้)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCSV
              data={filtered}
              filename="alarms"
              columns={[
                { key: "alarm_code", label: "Alarm Code" },
                { key: "alarm_description", label: "Description" },
                {
                  key: "machine_id",
                  label: "Machine",
                  accessor: (a) => a.machines?.machine_id ?? "-",
                },
                { key: "date_time", label: "Date Time" },
                { key: "cause", label: "Cause" },
                { key: "status", label: "Status" },
              ]}
            />
            <button onClick={openNew} className="btn-primary">
              + บันทึกอัลาร์ม
            </button>
          </div>
        </div>

        {/* กรอง: ค้นหา + สถานะ + เครื่อง + ช่วงวันที่ */}
        <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">ค้นหา</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code / รายละเอียด / สาเหตุ..."
              className="input"
            />
          </div>
          <div>
            <label className="label">สถานะอัลาร์ม</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="">ทั้งหมด</option>
              {ALARM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">เครื่องจักร</label>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="input"
            >
              <option value="">ทั้งหมด</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_id} — {m.machine_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">จากวันที่</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">ถึงวันที่</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input"
            />
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="th">Alarm Code</th>
                <th className="th">เครื่องจักร</th>
                <th className="th">รายละเอียด</th>
                <th className="th">วัน-เวลา</th>
                <th className="th">สาเหตุ</th>
                <th className="th">สถานะ</th>
                <th className="th">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="td py-8 text-center text-slate-400">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="td py-8 text-center text-slate-400">
                    ไม่พบข้อมูลอัลาร์ม
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="td font-mono text-xs font-semibold text-slate-800">
                      {a.alarm_code}
                    </td>
                    <td className="td">
                      <div className="font-medium text-slate-800">
                        {a.machines?.machine_name ?? "-"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {a.machines?.machine_id ?? "-"}
                      </div>
                    </td>
                    <td className="td max-w-[260px]">{a.alarm_description}</td>
                    <td className="td">
                      {new Date(a.date_time).toLocaleString("th-TH")}
                    </td>
                    <td className="td max-w-[200px] truncate">{a.cause || "-"}</td>
                    <td className="td">
                      <StatusBadge value={a.status} />
                    </td>
                    <td className="td">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(a)}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          แก้ไข
                        </button>
                        {isAdminUser && (
                          <button
                            onClick={() => handleDelete(a)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal ฟอร์ม */}
        {showForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  {editing ? "แก้ไขอัลาร์ม" : "บันทึกอัลาร์ม"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="label">เครื่องจักร *</label>
                  <select
                    value={form.machine_id}
                    onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                    className={`input ${errors.machine_id ? "border-red-400" : ""}`}
                  >
                    <option value="">— เลือกเครื่องจักร —</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machine_id} — {m.machine_name}
                      </option>
                    ))}
                  </select>
                  {errors.machine_id && (
                    <p className="mt-1 text-xs text-red-600">{errors.machine_id}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label">Alarm Code *</label>
                    <input
                      type="text"
                      value={form.alarm_code}
                      onChange={(e) => setForm({ ...form, alarm_code: e.target.value })}
                      placeholder="เช่น AL-001"
                      className={`input ${errors.alarm_code ? "border-red-400" : ""}`}
                    />
                    {errors.alarm_code && (
                      <p className="mt-1 text-xs text-red-600">{errors.alarm_code}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">วัน-เวลา *</label>
                    <input
                      type="datetime-local"
                      value={form.date_time}
                      onChange={(e) => setForm({ ...form, date_time: e.target.value })}
                      className={`input ${errors.date_time ? "border-red-400" : ""}`}
                    />
                    {errors.date_time && (
                      <p className="mt-1 text-xs text-red-600">{errors.date_time}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">รายละเอียดอัลาร์ม *</label>
                  <textarea
                    rows={3}
                    value={form.alarm_description}
                    onChange={(e) =>
                      setForm({ ...form, alarm_description: e.target.value })
                    }
                    placeholder="เช่น Overload Current Detected"
                    className={`input ${errors.alarm_description ? "border-red-400" : ""}`}
                  />
                  {errors.alarm_description && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.alarm_description}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">สาเหตุ</label>
                  <textarea
                    rows={2}
                    value={form.cause}
                    onChange={(e) => setForm({ ...form, cause: e.target.value })}
                    placeholder="เช่น มอเตอร์แบกสึกหรอ"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">สถานะ</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input"
                  >
                    {ALARM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? "กำลังบันทึก..." : "บันทึก"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </ProtectedRoute>
  );
}