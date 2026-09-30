"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Toast";
import ExportCSV from "@/components/ExportCSV";
import StatusBadge from "@/components/StatusBadge";
import { validateMachine } from "@/lib/validation";

const MACHINE_STATUSES = ["Running", "Stop", "Alarm", "Maintenance"];
const EMPTY = {
  machine_id: "",
  machine_name: "",
  machine_type: "",
  location: "",
  status: "Running",
};

export default function MachinesPage() {
  const { profile, isAdminUser } = useAuth();
  const { notify } = useToast();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟิลเตอร์/ค้นหา
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  // ฟอร์ม
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadMachines = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("machine_id");
    if (error) {
      notify("โหลดข้อมูลไม่สำเร็จ: " + error.message, "error");
      setMachines([]);
    } else {
      setMachines(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ใช้ memo เพื่อกรองข้อมูลตามเงื่อนไข (ค้นหา + กรอง 2+ เงื่อนไขพร้อมกัน)
  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return machines.filter((m) => {
      const matchSearch =
        !kw ||
        [m.machine_id, m.machine_name, m.machine_type, m.location]
          .some((v) => (v || "").toLowerCase().includes(kw));
      const matchStatus = !filterStatus || m.status === filterStatus;
      const matchType = !filterType || m.machine_type === filterType;
      return matchSearch && matchStatus && matchType;
    });
  }, [machines, search, filterStatus, filterType]);

  const machineTypes = useMemo(
    () => [...new Set(machines.map((m) => m.machine_type).filter(Boolean))],
    [machines]
  );

  const openEdit = (machine) => {
    setEditing(machine);
    setForm({
      machine_id: machine.machine_id,
      machine_name: machine.machine_name,
      machine_type: machine.machine_type,
      location: machine.location,
      status: machine.status,
    });
    setErrors({});
    setShowForm(true);
  };

  const handleDelete = async (machine) => {
    if (!window.confirm(`ต้องการลบเครื่องจักร "${machine.machine_name}" จริงหรือไม่?`))
      return;
    const { error } = await supabase
      .from("machines")
      .delete()
      .eq("id", machine.id);
    if (error) notify("ลบไม่สำเร็จ: " + error.message, "error");
    else {
      notify("ลบเครื่องจักรเรียบร้อย ✓");
      loadMachines();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateMachine(form);
    if (Object.keys(err).length > 0) {
      setErrors(err);
      notify("กรุณาตรวจสอบข้อมูลที่กรอก", "error");
      return;
    }

    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from("machines")
        .update({
          machine_name: form.machine_name.trim(),
          machine_type: form.machine_type.trim(),
          location: form.location.trim(),
          status: form.status,
        })
        .eq("id", editing.id);
      if (error) {
        notify("อัปเดตไม่สำเร็จ: " + error.message, "error");
        setSaving(false);
        return;
      }
      notify("อัปเดตเครื่องจักรเรียบร้อย ✓");
    } else {
      // ตรวจ Machine ID ซ้ำก่อน insert
      const { data: dup } = await supabase
        .from("machines")
        .select("id")
        .eq("machine_id", form.machine_id.trim())
        .maybeSingle();
      if (dup) {
        notify("Machine ID นี้มีอยู่แล้วในระบบ", "error");
        setErrors({ machine_id: "Machine ID นี้ซ้ำกับเครื่องที่มีอยู่แล้ว" });
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("machines").insert({
        machine_id: form.machine_id.trim(),
        machine_name: form.machine_name.trim(),
        machine_type: form.machine_type.trim(),
        location: form.location.trim(),
        status: form.status,
      });
      if (error) {
        // ป้องกัน error จาก unique constraint ที่ DB
        if (error.code === "23505")
          notify("Machine ID นี้ซ้ำกับเครื่องที่มีอยู่แล้ว", "error");
        else notify("บันทึกไม่สำเร็จ: " + error.message, "error");
        setSaving(false);
        return;
      }
      notify("เพิ่มเครื่องจักรเรียบร้อย ✓");
    }

    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
    setSaving(false);
    loadMachines();
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">เครื่องจักร (Machines)</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              จัดการข้อมูล Master เครื่องจักรทั้งหมด
              {isAdminUser ? " (Admin: เพิ่ม/แก้ไข/ลบได้)" : " (Technician: ดูได้เท่านั้น)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportCSV
              data={filtered}
              filename="machines"
              label="Export CSV"
              columns={[
                { key: "machine_id", label: "Machine ID" },
                { key: "machine_name", label: "Name" },
                { key: "machine_type", label: "Type" },
                { key: "location", label: "Location" },
                { key: "status", label: "Status" },
              ]}
            />
            {isAdminUser && (
              <button
                onClick={() => {
                  setEditing(null);
                  setForm(EMPTY);
                  setErrors({});
                  setShowForm(true);
                }}
                className="btn-primary"
              >
                + เพิ่มเครื่องจักร
              </button>
            )}
          </div>
        </div>

        {/* แถบกรอง: ค้นหา + สถานะ + ประเภท */}
        <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-3">
          <div>
            <label className="label">ค้นหา</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID / ชื่อ / ประเภท / ตำแหน่ง..."
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
              {MACHINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">ประเภท</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input"
            >
              <option value="">ทั้งหมด</option>
              {machineTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                {["Machine ID", "ชื่อเครื่อง", "ประเภท", "ตำแหน่ง", "สถานะ", "จัดการ"].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="td py-8 text-center text-slate-400">
                    กำลังโหลด...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="td py-8 text-center text-slate-400">
                    ไม่พบข้อมูลเครื่องจักร
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/40">
                    <td className="td font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {m.machine_id}
                    </td>
                    <td className="td font-medium text-slate-800 dark:text-slate-200">{m.machine_name}</td>
                    <td className="td">{m.machine_type}</td>
                    <td className="td">{m.location}</td>
                    <td className="td">
                      <StatusBadge value={m.status} />
                    </td>
                    <td className="td">
                      {isAdminUser && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="text-sm font-medium text-blue-600 hover:underline"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="text-sm font-medium text-red-600 hover:underline"
                          >
                            ลบ
                          </button>
                        </div>
                      )}
                      {!isAdminUser && <span className="text-sm text-slate-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal เพิ่ม/แก้ไข */}
        {showForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {editing ? "แก้ไขเครื่องจักร" : "เพิ่มเครื่องจักร"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label className="label">Machine ID *</label>
                  <input
                    type="text"
                    value={form.machine_id}
                    disabled={!!editing}
                    onChange={(e) => setForm({ ...form, machine_id: e.target.value })}
                    placeholder="เช่น MACH-001"
                    className={`input ${editing ? "bg-slate-100 dark:bg-slate-700" : ""} ${
                      errors.machine_id ? "border-red-400" : ""
                    }`}
                  />
                  {errors.machine_id && (
                    <p className="mt-1 text-xs text-red-600">{errors.machine_id}</p>
                  )}
                </div>
                <div>
                  <label className="label">ชื่อเครื่องจักร *</label>
                  <input
                    type="text"
                    value={form.machine_name}
                    onChange={(e) => setForm({ ...form, machine_name: e.target.value })}
                    placeholder="เช่น CNC Milling 01"
                    className={`input ${errors.machine_name ? "border-red-400" : ""}`}
                  />
                  {errors.machine_name && (
                    <p className="mt-1 text-xs text-red-600">{errors.machine_name}</p>
                  )}
                </div>
                <div>
                  <label className="label">ประเภทเครื่องจักร *</label>
                  <input
                    type="text"
                    value={form.machine_type}
                    onChange={(e) => setForm({ ...form, machine_type: e.target.value })}
                    placeholder="เช่น CNC / Injection / Robot"
                    className={`input ${errors.machine_type ? "border-red-400" : ""}`}
                  />
                  {errors.machine_type && (
                    <p className="mt-1 text-xs text-red-600">{errors.machine_type}</p>
                  )}
                </div>
                <div>
                  <label className="label">ตำแหน่งติดตั้ง *</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="เช่น Building A - Zone 1"
                    className={`input ${errors.location ? "border-red-400" : ""}`}
                  />
                  {errors.location && (
                    <p className="mt-1 text-xs text-red-600">{errors.location}</p>
                  )}
                </div>
                <div>
                  <label className="label">สถานะ</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input"
                  >
                    {MACHINE_STATUSES.map((s) => (
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