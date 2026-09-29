import "@/app/globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { ToastProvider } from "@/components/Toast";

export const metadata = {
  title: "Alarm & Maintenance Management System",
  description:
    "ระบบจัดการอัลาร์มและงานซ่อมบำรุงสำหรับโรงงาน — สร้างด้วย Next.js + Tailwind CSS + Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <ToastProvider>
          <AuthProvider>{children}</AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}