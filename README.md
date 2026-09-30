# 🔧 Alarm & Maintenance Management System

ระบบจัดการอัลาร์ม (Alarm) และงานซ่อมบำรุง (Maintenance) สำหรับโรงงาน / ระบบ Automation
พัฒนาเป็น Web Application เต็มรูปแบบ 3-Tier:

- **Frontend** : Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Database & Auth** : Supabase (PostgreSQL + Auth + Row Level Security)
- **Deploy** : Vercel + GitHub Actions (CI/CD)

> โปรเจกต์นี้เป็นส่วนหนึ่งของการประเมินหลักสูตร Full-Stack Developer

---

## 1. วัตถุประสงค์ของโครงการ

โรงงานขนาดกลางมักมีปัญหาในการติดตามสถานะเครื่องจักร อัลาร์ม และงานซ่อมบำรุง เพราะข้อมูลกระจัดกระจาย
อยู่ใน Excel / กระดาษ / เอกสารหลายฉบับ ทำให้:

- ไม่รู้ว่าเครื่องจักรตัวไหนกำลังมีอัลาร์มค้างอยู่
- งานซ่อมบำรุงตามรอบไม่ได้ถูกติดตามเป็นระบบ
- ไม่มีหลักฐานอ้างอิง (Audit Trail) กรณีเกิดข้อพิพาทหรือต้องวิเคราะห์สาเหตุ

ระบบนี้จึงถูกพัฒนาขึ้นเพื่อ **รวมศูนย์ข้อมูล** (Machine Master, Alarm Record, Maintenance Record)
เข้าด้วยกัน พร้อมสิทธิ์การเข้าถึงตามบทบาท (Role-Based Access Control) และรายงานสรุปผ่าน Dashboard

---

## 2. ฟังก์ชันหลัก

| ฟังก์ชัน | รายละเอียด |
| --- | --- |
| 🔐 Authentication | Login / Logout / Signup ผ่าน Supabase Auth (อีเมล + รหัสผ่าน) |
| 👑 Role-Based Access | **Admin** จัดการข้อมูลได้ทั้งหมด • **Technician** ดู/บันทึก/อัปเดตงานได้ |
| 🏭 Machine Master | CRUD เครื่องจักร, ตรวจ Machine ID ซ้ำ, Validation ฟอร์ม |
| 🚨 Alarm Records | บันทึก/อัปเดตสถานะอัลาร์ม (Open → In Progress → Closed) |
| 🔧 Maintenance | บันทึกงานซ่อมบำรุง, เปลี่ยนสถานะ, ระบุช่างผู้รับผิดชอบ |
| 📊 Dashboard | การ์ดสรุป + Chart สถานะเครื่องจักร (Pie) + อัลาร์มล่าสุด |
| 🔎 Search & Filter | ค้นหา/กรองหลายเงื่อนไขพร้อมกัน (สถานะ + เครื่อง + ช่วงวันที่ + ผู้ปฏิบัติ) |
| 📥 Export CSV | ส่งออก Machines / Alarms / Maintenance เป็นไฟล์ CSV |

**Automation (Trigger ใน Supabase)**
- สร้าง `profiles` อัตโนมัติเมื่อมีผู้ใช้ใหม่สมัครเข้าระบบ — **ผู้ใช้คนแรกได้ role `Admin`** ส่วนคนถัดไปได้ `Technician`
- ซิงก์สถานะเครื่องจักรอัตโนมัติ ตาม Alarm / งานซ่อมที่ค้างอยู่

---

## 3. เทคโนโลยีที่ใช้

| ชั้น | เทคโนโลยี |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| UI Components | Recharts (Pie Chart) |
| Backend-as-a-Service | Supabase (PostgreSQL, Auth, Realtime, RLS) |
| Language | JavaScript (ES2022) + JSX |
| CI/CD | GitHub Actions |
| Hosting | Vercel |

---

## 4. โครงสร้างฐานข้อมูล (Database Structure)

สถาปัตยกรรม: แต่ละตารางเปิด RLS (Row Level Security) โดย Technician
จะเห็นทุกข้อมูล (SELECT) แต่บันทึก/แก้ไขได้เฉพาะที่ได้รับอนุญาต
ส่วน Admin จัดการได้ครบทุกอย่าง

### ตารางหลัก

| ตาราง | คำอธิบาย | โฟลเดอร์/ไฟล์อ้างอิง |
| --- | --- | --- |
| `profiles` | profile ผู้ใช้ (id, email, role) | `supabase/schema.sql` |
| `machines` | Master เครื่องจักร (machine_id, name, type, location, status) | `supabase/schema.sql` |
| `alarms` | บันทึกอัลาร์ม (alarm_code, description, date_time, cause, status) | `supabase/schema.sql` |
| `maintenance_records` | บันทึกงานซ่อม (maintenance_type, problem, action_taken, technician, date, status) | `supabase/schema.sql` |

> SQL Script ฉบับเต็ม: ดูไฟล์ [`supabase/schema.sql`](supabase/schema.sql)

### Diagram ความสัมพันธ์

```text
auth.users 1──∞  profiles (trigger สร้างอัตโนมัติ)
machines   1──∞  alarms              (FK: machine_id)
machines   1──∞  maintenance_records (FK: machine_id)
```

### สรุป (SQL — คำสั่งหลัก)

```sql
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'Technician' check (role in ('Admin','Technician')),
  created_at timestamptz not null default now()
);

create table public.machines (
  id           uuid primary key default gen_random_uuid(),
  machine_id   text not null unique,
  machine_name text not null,
  machine_type text not null,
  location     text not null,
  status       text not null default 'Running'
               check (status in ('Running','Stop','Alarm','Maintenance')),
  created_at   timestamptz not null default now()
);

create table public.alarms (
  id                uuid primary key default gen_random_uuid(),
  machine_id        uuid not null references public.machines (id) on delete cascade,
  alarm_code        text not null,
  alarm_description text not null,
  date_time         timestamptz not null default now(),
  cause             text,
  status            text not null default 'Open'
                    check (status in ('Open','In Progress','Closed')),
  created_at        timestamptz not null default now()
);

create table public.maintenance_records (
  id               uuid primary key default gen_random_uuid(),
  machine_id       uuid not null references public.machines (id) on delete cascade,
  maintenance_type text not null,
  problem          text not null,
  action_taken     text,
  technician_name  text not null,
  date             date not null default current_date,
  status           text not null default 'Pending'
                   check (status in ('Pending','In Progress','Completed')),
  created_at       timestamptz not null default now()
);
```

### RLS Policy ตัวอย่าง (สิทธิ์ตามบทบาท)

```sql
-- ทุกคนที่ login เห็นเครื่องจักรได้
create policy "machines_select" on public.machines
  for select to authenticated using (true);

-- เฉพาะ Admin เพิ่ม/แก้ไข/ลบเครื่องจักร
create policy "machines_insert_admin" on public.machines
  for insert to authenticated with check (public.is_admin());

-- Technician บันทึกอัลาร์มเพิ่มเองได้ (สอดคล้องกับ role)
create policy "alarms_insert" on public.alarms
  for insert to authenticated with check (public.is_authenticated());
```

---

## 5. ขั้นตอนการติดตั้งและใช้งาน (Installation & Setup)

### ความต้องการก่อนเริ่ม

- Node.js 20+ / npm
- บัญชี Supabase (ฟรี tier ก็พอ)
- (Vercel) สำหรับ Deploy + GitHub สำหรับ CI

### ขั้นตอน

```bash
# 1. Clone / สร้างโฟลเดอร์โปรเจกต์
git clone <repo-url>
cd alarm-maintenance-system

# 2. ติดตั้ง dependencies
npm install

# 3. ตั้งค่า Environment Variables
#    - สร้างไฟล์ .env.local จากตัวอย่าง
#    - วาง URL ด้วยค่าจาก Supabase ได้
copy .env.local.example .env.local

# 4. ตั้งค่าฐานข้อมูล (รันสคริปต์ใน Supabase)
#    เปิด Supabase Dashboard → SQL Editor → วางโค้ด schema.sql → Run

# 5. รันโปรเจกต์แบบ development
npm run dev
# เปิด http://localhost:3000
```

### ขั้นตอนการยืนยัน / ทดสอบใช้งาน

```bash
npm run lint   # ตรวจสอบโค้ด (ESLint)
npm run build  # สร้าง production build
```

### การสร้างบัญชีผู้ใช้ (สำหรับทดสอบ)

1. เปิดหน้า `http://localhost:3000/login`
2. กดแท็บ **สมัครสมาชิก** และกรอกอีเมล + รหัสผ่าน
3. **ผู้ใช้คนแรก** ที่สมัครจะได้ role = **Admin** อัตโนมัติ (คนถัดไปได้ Technician)
4. (ถ้าต้องการ Admin เพิ่มอีก) ให้แก้ role ในตาราง `profiles` ด้วย Supabase Dashboard
   หรือใช้ SQL: `update public.profiles set role='Admin' where email='...';`
5. กลับมาเข้าสู่ระบบใหม่เพื่อยืนยันสิทธิ์

---

## 6. การ Deploy บน Vercel

1. Push โค้ดขึ้น GitHub (branch `main`)
2. ไปที่ [vercel.com](https://vercel.com) → **New Project** → import repo
3. ตั้งค่า Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. คลิก **Deploy**
5. URL ตัวอย่าง (ช่องว่างสำหรับกรอกภายหลัง):

```
<https://alarm-maintenance-system.vercel.app>
```

---

## 7. โครงสร้างไฟล์หลัก (Folder Structure)

```text
alarm-maintenance-system/
├─ .github/workflows/          # CI/CD Pipeline (GitHub Actions)
│  └─ ci.yml
├─ app/                        # App Router Pages
│  ├─ layout.js                # Root Layout (AuthProvider + Toast)
│  ├─ page.js                  # Redirect ไป /dashboard
│  ├─ globals.css              # Tailwind CSS
│  ├─ login/page.js            # หน้าเข้าสู่ระบบ/สมัคร
│  ├─ dashboard/page.js        # Dashboard สรุป + Chart
│  ├─ machines/page.js         # หน้าเครื่องจักร (CRUD)
│  ├─ alarms/page.js           # หน้า Alarms (CRUD)
│  └─ maintenance/page.js      # หน้า Maintenance (CRUD)
├─ components/                 # เรือ UI
│  ├─ AuthContext.js           # Auth Provider
│  ├─ Navbar.js                # แถบนำทาง + แสดง role
│  ├─ ProtectedRoute.js        # Guard หน้า
│  ├─ StatusBadge.js           # Badge สถานะ
│  ├─ MachineStatusChart.js    # Recharts Pie Chart
│  ├─ ExportCSV.js             # ปุ่มส่งออก CSV
│  └─ Toast.js                 # Toast Notifications
├─ lib/                        # Logic + Utilities
│  ├─ supabaseClient.js        # Supabase Client (browser)
│  ├─ auth.js                  # auth helpers
│  └─ validation.js            # Validation ฟอร์ม
├─ supabase/
│  └─ schema.sql               # SQL Schema + Trigger + RLS
├─ middleware.js               # ตรวจ auth session ระหว่างทุก request
├─ .env.local.example
└─ package.json
```

---

## 8. รายละเอียดการใช้ AI ในการพัฒนา

ส่วนนี้เป็นการบันทึกว่า AI (ผู้ช่วยเขียนโค้ด) มีส่วนช่วยในงานนี้อย่างไร:

| หัวข้อ | บทบาท / การช่วยเหลือของ AI |
| --- | --- |
| ออกแบบฐานข้อมูล (DB Design) | AI เสนอโครงสร้างตาราง (ER) ที่เหมาะสมกับ domain (Machine Master, Alarm, Maintenance) และความสัมพันธ์แบบ 1:many พร้อม FK และ index ที่จำเป็น |
| เขียน SQL | AI เขียน SQL Schema, RLS Policies, Trigger/Function (auto-create profile, auto-sync machine status) อย่างครบถ้วน และอธิบายวิธีรันใน Supabase |
| เขียน Code UI | AI เขียนหน้าจอ React/Next.js ทั้ง Dashboard, CRUD form, ตาราง, Navigation, Status Badge, Export CSV และ Chart ด้วย Tailwind CSS |
| Debug | AI ช่วยแก้ปัญหาที่พบ เช่น การตั้ง query กับ Supabase ที่ผิด syntax, ปัญหา cookie/session ใน middleware และ Next.js, รวมไปถึง logic การ Convert CSV/วันที่ |
| Flashcode / Best Practice | ช่วยจัดโครงสร้างให้เป็นไปตาม Next.js App Router conventions, แยก logic (lib/) ออกจาก UI และใช้ `@/` path alias |

> หมายเหตุ: AI มีบทบาทเป็น **ผู้ช่วยออกแบบและเขียนโค้ดเริ่มต้น** (scaffolding) ส่วนการยืนยันการทำงาน
> และการตั้งค่าจริงของ Supabase Project ยังต้องผ่านการทดสอบโดย Developer

---

## License

MIT — นำไปใช้เพื่อการศึกษาได้อย่างอิสระ เพียงแค่อ้างอิงแหล่งที่มาเท่านั้น
