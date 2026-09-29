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
        <table className="w-full min-w-[860px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="th">เครื่องจักร</th>
              <th className="th">ประเภทงาน</th>
              <th className="th">ปัญหา/อาการ</th>
              <th className="th">ผู้ปฏิบัติงาน</th>
              <th className="th">วันที่</th>
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
    </ProtectedRoute>
  );
}