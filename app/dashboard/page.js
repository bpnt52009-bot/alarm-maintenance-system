"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import MachineStatusChart from "@/components/MachineStatusChart";
import StatusBadge from "@/components/StatusBadge";
import ExportCSV from "@/components/ExportCSV";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [machines, setMachines] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [openAlarms, setOpenAlarms] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    const [mRes, aRes, mtRes, openRes] = await Promise.all([
      supabase.from("machines").select("*").order("created_at", { ascending: true }),
      supabase
        .from("alarms")
        .select("*")
        .order("date_time", { ascending: false })
        .limit(5),
      supabase
        .from("maintenance_records")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("alarms")
        .select("id", { count: "exact", head: true })
        .in("status", ["Open", "In Progress"]),
    ]);
    setMachines(mRes.data ?? []);
    setAlarms(aRes.data ?? []);
    setMaintenance(mtRes.data ?? []);
    setOpenAlarms(openRes.count ?? 0);
    setLoading(false);
  };

  // สรุปจำนวนตามสถานะ
  const statusCounts = useMemo(() => {
    const base = { Running: 0, Stop: 0, Alarm: 0, Maintenance: 0 };
    machines.forEach((m) => {
      if (base[m.status] !== undefined) base[m.status] += 1;
    });
    return base;
  }, [machines]);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* สรุปการ์ด */}
        <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="เครื่องจักรทั้งหมด"
            value={machines.length}
            icon="🏭"
            color="bg-blue-50 text-blue-700"
          />
          <StatCard
            title="สถานะ Alarm"
            value={statusCounts.Alarm}
            icon="🚨"
            color="bg-red-50 text-red-700"
          />
          <StatCard
            title="สถานะ Maintenance"
            value={statusCounts.Maintenance}
            icon="🔧"
            color="bg-amber-50 text-amber-700"
          />
          <StatCard
            title="อัลาร์มที่ยังไม่ปิด"
            value={openAlarms}
            icon="📟"
            color="bg-purple-50 text-purple-700"
          />
        </section>

        {/* ชาร์ต + อัลาร์มล่าสุด */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="card p-5 lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              สถานะเครื่องจักร
            </h2>
            <MachineStatusChart data={machines} />
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                อัลาร์มล่าสุด
              </h2>
              <Link
                href="/alarms"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                ดูทั้งหมด →
              </Link>
            </div>
            {alarms.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                ยังไม่มีอัลาร์ม
              </p>
            ) : (
              <ul className="space-y-3">
                {alarms.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {a.alarm_code}
                      </span>
                      <StatusBadge value={a.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {a.alarm_description}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      🕒{" "}
                      {new Date(a.date_time).toLocaleString("th-TH", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ตารางงานซ่อมล่าสุด */}
        <section className="card mt-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              งานซ่อมบำรุงล่าสุด
            </h2>
            <div className="flex gap-2">
              <ExportCSV
                data={maintenance}
                filename="maintenance_recent"
                columns={[
                  { key: "machine_id", label: "Machine ID" },
                  { key: "maintenance_type", label: "Type" },
                  { key: "problem", label: "Problem" },
                  { key: "technician_name", label: "Technician" },
                  { key: "date", label: "Date" },
                  { key: "status", label: "Status" },
                ]}
              />
              <Link
                href="/maintenance"
                className="btn-secondary"
              >
                จัดการงาน →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="th">เครื่องจักร</th>
                  <th className="th">ประเภท</th>
                  <th className="th">ปัญหา</th>
                  <th className="th">ผู้ปฏิบัติ</th>
                  <th className="th">วันที่</th>
                  <th className="th">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenance.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td className="td">
                      {machines.find((m) => m.id === r.machine_id)
                        ?.machine_id ?? r.machine_id}
                    </td>
                    <td className="td">{r.maintenance_type}</td>
                    <td className="td max-w-[240px] truncate">{r.problem}</td>
                    <td className="td">{r.technician_name}</td>
                    <td className="td">{r.date}</td>
                    <td className="td">
                      <StatusBadge value={r.status} />
                    </td>
                  </tr>
                ))}
                {maintenance.length === 0 && (
                  <tr>
                    <td colSpan={6} className="td py-10 text-center text-slate-400">
                      ยังไม่มีงานซ่อมบำรุง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </ProtectedRoute>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${color}`}
      >
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-sm text-slate-500">{title}</div>
      </div>
    </div>
  );
}