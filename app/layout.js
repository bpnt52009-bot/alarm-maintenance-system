import "@/app/globals.css";
import { AuthProvider } from "@/components/AuthContext";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata = {
  title: "Alarm & Maintenance Management System",
  description:
    "ระบบจัดการอัลาร์มและงานซ่อมบำรุงสำหรับโรงงาน — สร้างด้วย Next.js + Tailwind CSS + Supabase",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  );
}