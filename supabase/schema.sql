-- ============================================================================
-- Alarm & Maintenance Management System — Supabase SQL Schema
-- วิธีใช้: เปิด Supabase Dashboard > SQL Editor แล้ววางโค้ดทั้งหมดแล้วกด Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- ส่วนขยายที่จำเป็น
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) ตาราง profiles (เชื่อมกับ auth.users อัตโนมัติผ่าน Trigger)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'Technician'
             check (role in ('Admin', 'Technician')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2) ตาราง machines (Master เครื่องจักร)
-- ---------------------------------------------------------------------------
create table if not exists public.machines (
  id           uuid primary key default gen_random_uuid(),
  machine_id   text not null unique,
  machine_name text not null,
  machine_type text not null,
  location     text not null,
  status       text not null default 'Running'
               check (status in ('Running', 'Stop', 'Alarm', 'Maintenance')),
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3) ตาราง alarms (บันทึกสัญญาณเตือนของเครื่องจักร)
-- ---------------------------------------------------------------------------
create table if not exists public.alarms (
  id                uuid primary key default gen_random_uuid(),
  machine_id        uuid not null references public.machines (id) on delete cascade,
  alarm_code        text not null,
  alarm_description text not null,
  date_time         timestamptz not null default now(),
  cause             text,
  status            text not null default 'Open'
                    check (status in ('Open', 'In Progress', 'Closed')),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4) ตาราง maintenance_records (บันทึกงานซ่อมบำรุง)
-- ---------------------------------------------------------------------------
create table if not exists public.maintenance_records (
  id               uuid primary key default gen_random_uuid(),
  machine_id       uuid not null references public.machines (id) on delete cascade,
  maintenance_type text not null,
  problem          text not null,
  action_taken     text,
  technician_name  text not null,
  date             date not null default current_date,
  status           text not null default 'Pending'
                   check (status in ('Pending', 'In Progress', 'Completed')),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5) Trigger + Function อัตโนมัติ
-- ---------------------------------------------------------------------------

-- 5.1 สร้าง Record ใน profiles อัตโนมัติเมื่อมี User ใหม่ Signup/Login
--     ผู้ใช้คนแรกของระบบได้ role 'Admin' ส่วนคนถัดไปได้ 'Technician'
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select case
    when not exists (select 1 from public.profiles) then 'Admin'
    else 'Technician'
  end into v_role;

  insert into public.profiles (id, email, role)
  values (new.id, new.email, v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5.2 Sync สถานะเครื่องจักรอัตโนมัติ
--     หลักการ: ถ้ามี Alarm ค้าง (Open/In Progress) -> 'Alarm'
--             ไม่ก็ถ้ามีงานซ่อมค้าง (Pending/In Progress) -> 'Maintenance'
--             ไม่ก็ -> 'Running'
create or replace function public.sync_machine_status(p_machine_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.alarms
    where machine_id = p_machine_id and status in ('Open', 'In Progress')
  ) then
    update public.machines set status = 'Alarm' where id = p_machine_id;
  elsif exists (
    select 1 from public.maintenance_records
    where machine_id = p_machine_id and status in ('Pending', 'In Progress')
  ) then
    update public.machines set status = 'Maintenance' where id = p_machine_id;
  else
    update public.machines set status = 'Running' where id = p_machine_id;
  end if;
end;
$$;

-- สร้าง Alarm ใหม่ -> เครื่องจักรเป็น 'Alarm'
create or replace function public.trg_alarm_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_machine_status(new.machine_id);
  return new;
end;
$$;

drop trigger if exists on_alarm_insert on public.alarms;
create trigger on_alarm_insert
  after insert on public.alarms
  for each row execute procedure public.trg_alarm_after();

drop trigger if exists on_alarm_update on public.alarms;
create trigger on_alarm_update
  after update of status on public.alarms
  for each row execute procedure public.trg_alarm_after();

-- สร้าง/อัปเดตงานซ่อมบำรุง -> recal สถานะเครื่องจักร
create or replace function public.trg_maintenance_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_machine_status(new.machine_id);
  return new;
end;
$$;

drop trigger if exists on_maintenance_insert on public.maintenance_records;
create trigger on_maintenance_insert
  after insert on public.maintenance_records
  for each row execute procedure public.trg_maintenance_after();

drop trigger if exists on_maintenance_update on public.maintenance_records;
create trigger on_maintenance_update
  after update of status on public.maintenance_records
  for each row execute procedure public.trg_maintenance_after();

-- ---------------------------------------------------------------------------
-- 6) Row Level Security (RLS)
--    Admin      : จัดการข้อมูลได้ทั้งหมด (CRUD เต็ม)
--    Technician : ดูข้อมูลได้ และบันทึก/อัปเดตงานได้ (แต่ลบไม่ได้)
-- ---------------------------------------------------------------------------

-- Helper ตรวจว่า user นี้เป็น Admin หรือไม่
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'Admin'
  );
$$;

-- Helper ตรวจว่า user authenticated แล้วหรือไม่
create or replace function public.is_authenticated()
returns boolean
language sql
stable
as $$
  select auth.uid() is not null;
$$;

-- เปิดใช้ RLS ทุกตาราง
alter table public.profiles            enable row level security;
alter table public.machines            enable row level security;
alter table public.alarms              enable row level security;
alter table public.maintenance_records enable row level security;

-- ---------------- POLICIES: profiles ----------------
drop policy if exists "profiles_select_own"    on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_select_admin"   on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "profiles_update_admin"   on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------- POLICIES: machines ----------------
-- ทุกคนที่ login ดูได้
drop policy if exists "machines_select" on public.machines;
create policy "machines_select"
  on public.machines for select
  to authenticated
  using (true);

-- เฉพาะ Admin: เพิ่ม / แก้ไข / ลบ
drop policy if exists "machines_insert_admin" on public.machines;
create policy "machines_insert_admin"
  on public.machines for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "machines_update_admin" on public.machines;
create policy "machines_update_admin"
  on public.machines for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "machines_delete_admin" on public.machines;
create policy "machines_delete_admin"
  on public.machines for delete
  to authenticated
  using (public.is_admin());

-- ---------------- POLICIES: alarms ----------------
-- ทุกคนที่ login: ดู / เพิ่ม / อัปเดต (เปลี่ยนสถานะได้); เฉพาะ Admin ลบได้
drop policy if exists "alarms_select" on public.alarms;
create policy "alarms_select"
  on public.alarms for select
  to authenticated
  using (true);

drop policy if exists "alarms_insert" on public.alarms;
create policy "alarms_insert"
  on public.alarms for insert
  to authenticated
  with check (true);

drop policy if exists "alarms_update" on public.alarms;
create policy "alarms_update"
  on public.alarms for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "alarms_delete_admin" on public.alarms;
create policy "alarms_delete_admin"
  on public.alarms for delete
  to authenticated
  using (public.is_admin());

-- ---------------- POLICIES: maintenance_records ----------------
drop policy if exists "maintenance_select" on public.maintenance_records;
create policy "maintenance_select"
  on public.maintenance_records for select
  to authenticated
  using (true);

drop policy if exists "maintenance_insert" on public.maintenance_records;
create policy "maintenance_insert"
  on public.maintenance_records for insert
  to authenticated
  with check (true);

drop policy if exists "maintenance_update" on public.maintenance_records;
create policy "maintenance_update"
  on public.maintenance_records for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "maintenance_delete_admin" on public.maintenance_records;
create policy "maintenance_delete_admin"
  on public.maintenance_records for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7) Seed Data ตัวอย่างสำหรับทดสอบ
-- ---------------------------------------------------------------------------
insert into public.machines (machine_id, machine_name, machine_type, location, status) values
  ('MACH-001', 'CNC Milling Machine 01', 'CNC Machine', 'Building A - Zone 1', 'Running'),
  ('MACH-002', 'Injection Molding 02', 'Injection Molding', 'Building B - Zone 2', 'Stop'),
  ('MACH-003', 'Robot Arm 03', 'Industrial Robot', 'Assembly Line 1', 'Alarm'),
  ('MACH-004', 'Conveyor Belt 04', 'Conveyor', 'Packaging Area', 'Maintenance')
on conflict (machine_id) do nothing;

-- บันทึกอัลาร์มตัวอย่าง (ผูกกับเครื่องจักรที่เพิ่งสร้าง)
insert into public.alarms (machine_id, alarm_code, alarm_description, date_time, cause, status)
select m.id, 'AL-101', 'Overload Current Detected', now() - interval '3 hours', 'Motor bearing worn out', 'Open'
from public.machines m where m.machine_id = 'MACH-003'
on conflict do nothing;

insert into public.alarms (machine_id, alarm_code, alarm_description, date_time, cause, status)
select m.id, 'AL-102', 'Emergency Stop Pressed', now() - interval '1 day', 'Operator intervention', 'Closed'
from public.machines m where m.machine_id = 'MACH-002'
on conflict do nothing;

-- บันทึกงานซ่อมบำรุงตัวอย่าง
insert into public.maintenance_records (machine_id, maintenance_type, problem, action_taken, technician_name, date, status)
select m.id, 'Preventive', 'Loose bolts on base plate', 'Retightened and applied thread locker', 'Somchai Tech', current_date, 'Completed'
from public.machines m where m.machine_id = 'MACH-004'
on conflict do nothing;