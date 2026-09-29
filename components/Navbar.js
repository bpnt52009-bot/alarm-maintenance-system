"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/components/AuthContext";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/machines", label: "Machines" },
  { href: "/alarms", label: "Alarms" },
  { href: "/maintenance", label: "Maintenance" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdminUser } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-slate-900">
            🔧 Alarm &amp; Maintenance System
          </span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 md:hidden"
          >
            Logout
          </button>
        </div>

        <nav className="mt-3 hidden items-center gap-1 md:mt-0 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="mt-3 hidden items-center gap-4 md:mt-0 md:flex">
          {profile && (
            <div className="text-right text-sm">
              <div className="font-medium text-slate-800">{profile.email}</div>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                  isAdminUser
                    ? "bg-purple-100 text-purple-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {isAdminUser ? "Admin" : "Technician"}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                pathname === l.href
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}