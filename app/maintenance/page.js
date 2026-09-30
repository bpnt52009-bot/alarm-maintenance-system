"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Toast";
import ExportCSV from "@/components/ExportCSV";
import StatusBadge from "@/components/StatusBadge";
import { validateMaintenance } from "@/lib/validation";

const MAINTENANCE_STATUSES = ["Pending", "In Progress", "Completed"];
const EMPTY = {
  machine_id: "",
  maintenance_type: "",
  problem: "",
  action_taken: "",
  technician_name: "",
  date: new Date().toISOString().slice(0, 10),
  status: "Pending",
};

export default function MaintenancePage() {
  const { notify } = useToast();
  const { profile, isAdminUser } = useAuth();
  const [records, setRecords] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // ตัวกรอง (ค้นหา + สถานะ + เครื่อง + ช่าง + ช่วงวันที่)
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMachine, setFilterMachine] = useState("");
  const [filterTech, setFilterTech] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // ฟอร์ม
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("maintenance_records")
      .select("*, machines(machine_id, machine_name)")
      .order("date", { ascending: false });
    if (error) {
      notify("โหลดข้อมูลไม่สำเร็จ: " + error.message, "error");
      setRecords([]);
    } else {
      setRecords(data ?? []);
    }
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
    loadRecords();
    loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // กรองข้อมูลตามเงื่อนไขหลายรายการพร้อมกัน
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return records.filter((r) => {
      const mm = r.machines ?? {};
      const matchSearch =
        !kw ||
        [r.maintenance_type, r.problem, r.technician_name, mm.machine_id, mm.machine_name]
          .some((v) => (v || "").toLowerCase().includes(kw));
      const matchStatus = !filterStatus || r.status === filterStatus;
      const matchMachine = !filterMachine || r.machine_id === filterMachine;
      const matchTech = !filterTech || r.technician_name === filterTech;
      const matchFrom = !fromDate || (r.date || "") >= fromDate;
      const matchTo = !toDate || (r.date || "") <= toDate;
      return matchSearch && matchStatus && matchMachine && matchTech && matchFrom && matchTo;
    });
  }, [records, search, filterStatus, filterMachine, filterTech, fromDate, toDate]);

  const technicians = useMemo(
    () => [...new Set(records.map((r) => r.technician_name).filter(Boolean))],
    [records]
  );

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, date: new Date().toISOString().slice(0, 10) });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({
      machine_id: r.machine_id,
      maintenance_type: r.maintenance_type,
      problem: r.problem,
      action_taken: r.action_taken || "",
      technician_name: r.technician_name,
      date: (r.date || "").slice(0, 10),
      status: r.status,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`ต้องการลบบันทึกงานของ "${r.technician_name}" จริงหรือไม่?`))
      return;
    const { error } = await supabase
      .from("maintenance_records")
      .delete()
      .eq("id", r.id);
    if (error) notify("ลบไม่สำเร็จ: " + error.message, "error");
    else {
      notify("ลบบันทึกงานเรียบร้อย ✓");
      loadRecords();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateMaintenance(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      notify("กรุณาตรวจสอบข้อมูลที่กรอก", "error");
      return;
    }

    setSaving(true);
    const payload = {
      machine_id: form.machine_id,
      maintenance_type: form.maintenance_type.trim(),
      problem: form.problem.trim(),
      action_taken: form.action_taken?.trim() || null,
      technician_name: form.technician_name.trim(),
      date: form.date,
      status: form.status,
    };

    if (editing) {
      const { error } = await supabase
        .from("maintenance_records")
        .update(payload)
        .eq("id", editing.id);
      if (error) {
        notify("อัปเดตไม่สำเร็จ: " + error.message, "error");
        setSaving(false);
        return;
      }
      notify("อัปเดตงานซ่อมบำรุงเรียบร้อย ✓");
    } else {
      const { error } = await supabase.from("maintenance_records").insert(payload);
      if (error) {
        notify("บันทึกไม่สำเร็จ: " + error.message, "error");
        setSaving(false);
        return;
      }
      notify("บันทึกงานซ่อมบำรุงเรียบร้อย ✓");
    }

    setShowForm(false);
    setErrors({});
    setSaving(false);
    loadRecords();
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">งานซ่อมบำรุง (Maintenance)</h1>
            <p className="mt-1 text-sm text-slate-500">
              บันทึกและจัดการงานซ่อมบำรุงของเครื่องจักร
              {isAdminUser
                ? " (Admin: จัดการได้ทั้งหมด)"
                : " (Technician: เพิ่ม/แก้ไขสถานะได้)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCSV
              data={filtered}
              filename="maintenance"
              columns={[
                { key: "maintenance_type", label: "Type" },
                { key: "problem", label: "Problem" },
                { key: "action_taken", label: "Action Taken" },
                { key: "technician_name", label: "Technician" },
                { key: "date", label: "Date" },
                { key: "status", label: "Status" },
              ]}
            />
            <button onClick={openNew} className="btn-primary">
              + บันทึกงานซ่อม
            </button>
          </div>
        </div>

        {/* แผงกรองข้อมูล */}
      <div className="card mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div>
          <label className="label">ค้นหา</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ประเภท / ปัญหา / ช่าง..."
            className="input"
          />
        </div>
        <div>
          <label className="label">สถานะ</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="">ทั้งหมด</option>
            {MAINTENANCE_STATUSES.map((s) => (
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
          <label className="label">ช่างซ่อม</label>
          <select
            value={filterTech}
            onChange={(e) => setFilterTech(e.target.value)}
            className="input"
          >
            <option value="">ทั้งหมด</option>
            {technicians.map((t) => (
              <option key={t} value={t}>
                {t}
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
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="th">เครื่องจักร</th>
              <th className="th">ประเภทงาน</th>
              <th className="th">ปัญหา/อาการ</th>
              <th className="th">การแก้ไข/งานที่ทำ</th>
              <th className="th">ผู้ปฏิบัติงาน</th>
              <th className="th">วันที่</th>
              <th className="th">สถานะ</th>
              <th className="th">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="td py-8 text-center text-slate-400">
                  กำลังโหลด...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="td py-8 text-center text-slate-400">
                  ไม่พบรายการงานซ่อมบำรุง
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="td">
                    <div className="text-sm font-medium text-slate-800">
                      {r.machines?.machine_name ?? "-"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {r.machines?.machine_id ?? "-"}
                    </div>
                  </td>
                  <td className="td">{r.maintenance_type}</td>
                  <td className="td max-w-[280px]">{r.problem}</td>
                  <td className="td max-w-[280px]">{r.action_taken || "-"}</td>
                  <td className="td">{r.technician_name}</td>
                  <td className="td">{r.date}</td>
                  <td className="td">
                    <StatusBadge value={r.status} />
                  </td>
                  <td className="td">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      แก้ไข
                    </button>
                    {isAdminUser && (
                      <button
                        onClick={() => handleDelete(r)}
                        className="ml-3 text-sm font-medium text-red-600 hover:underline"
                      >
                        ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </main>

      {/* Modal แบบฟอร์มเพิ่ม/แก้ไข */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editing ? "แก้ไขงานซ่อมบำรุง" : "บันทึกงานซ่อมบำรุง"}
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
              <div>
                <label className="label">ประเภทงานซ่อมบำรุง *</label>
                <input
                  type="text"
                  value={form.maintenance_type}
                  onChange={(e) =>
                    setForm({ ...form, maintenance_type: e.target.value })
                  }
                  placeholder="เช่น Preventive / Corrective"
                  className={`input ${errors.maintenance_type ? "border-red-400" : ""}`}
                />
                {errors.maintenance_type && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.maintenance_type}
                  </p>
                )}
              </div>
              <div>
                <label className="label">ปัญหา/อาการ *</label>
                <textarea
                  rows={3}
                  value={form.problem}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                  placeholder="เช่น Loose bolts on base plate"
                  className={`input ${errors.problem ? "border-red-400" : ""}`}
                />
                {errors.problem && (
                  <p className="mt-1 text-xs text-red-600">{errors.problem}</p>
                )}
              </div>
              <div>
                <label className="label">การแก้ไข/งานที่ทำ</label>
                <textarea
                  rows={2}
                  value={form.action_taken}
                  onChange={(e) =>
                    setForm({ ...form, action_taken: e.target.value })
                  }
                  placeholder="เช่น Retightened and applied thread locker"
                  className="input"
                />
              </div>
              <div>
                <label className="label">ผู้ปฏิบัติงาน *</label>
                <input
                  type="text"
                  value={form.technician_name}
                  onChange={(e) =>
                    setForm({ ...form, technician_name: e.target.value })
                  }
                  placeholder="เช่น Somchai Tech"
                  className={`input ${errors.technician_name ? "border-red-400" : ""}`}
                />
                {errors.technician_name && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.technician_name}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">วันที่ *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={`input ${errors.date ? "border-red-400" : ""}`}
                  />
                  {errors.date && (
                    <p className="mt-1 text-xs text-red-600">{errors.date}</p>
                  )}
                </div>
                <div>
                  <label className="label">สถานะ</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input"
                  >
                    {MAINTENANCE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
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
    </ProtectedRoute>
  );
}