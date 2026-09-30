"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        notify(error.message, "error");
        setLoading(false);
        return;
      }
      notify("เข้าสู่ระบบสำเร็จ ✓");
      router.push("/dashboard");
      router.refresh();
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) {
        notify(error.message, "error");
        setLoading(false);
        return;
      }
      notify(
        data.session
          ? "สมัครสมาชิกสำเร็จ เข้าสู่ระบบแล้ว ✓"
          : "สมัครสมาชิกสำเร็จ — กรุณายืนยันอีเมล (เปิดลิงก์ที่ส่งให้) แล้วกลับมาเข้าสู่ระบบ",
        data.session ? "success" : "info"
      );
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mb-2 text-4xl">🔧</div>
            <h1 className="text-xl font-bold text-slate-900">
              Alarm &amp; Maintenance System
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              ระบบจัดการอัลาร์มและงานซ่อมบำรุงโรงงาน
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`rounded-md py-2 text-sm font-medium transition ${
                mode === "signin"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              เข้าสู่ระบบ
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`rounded-md py-2 text-sm font-medium transition ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              สมัครสมาชิก
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                รหัสผ่าน
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "กำลังดำเนินการ..."
                : mode === "signin"
                ? "เข้าสู่ระบบ"
                : "สมัครสมาชิก"}
            </button>
          </form>

          <div className="mt-6 rounded-md bg-blue-50 p-3 text-xs text-blue-800">
            <p className="mb-1 font-semibold">💡 วิธีเริ่มต้นใช้งาน</p>
            <p>
              สมัครสมาชิก → <b>ผู้ใช้คนแรกได้ role Admin</b> คนถัดไปได้ Technician
              (Admin จัดการเครื่องจักรได้ทั้งหมด).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}