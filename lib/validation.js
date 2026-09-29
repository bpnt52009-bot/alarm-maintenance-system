// ---------------------------------------------------------------------------
// ฟังก์ชัน validate ฝั่ง Client (ป้อนข้อมูลซ้ำที่ฝั่ง Server + DB ก็ได้)
// เพิ่ม Error Message เป็นภาษาไทยเพื่อให้ผู้ใช้เข้าใจง่าย
// ---------------------------------------------------------------------------
export const MACHINE_STATUSES = ["Running", "Stop", "Alarm", "Maintenance"];
export const ALARM_STATUSES = ["Open", "In Progress", "Closed"];
export const MAINTENANCE_STATUSES = ["Pending", "In Progress", "Completed"];

export function validateMachine(values) {
  const errors = {};
  if (!values.machine_id?.trim())
    errors.machine_id = "กรุณากรอก Machine ID";
  else if (!/^[A-Za-z0-9_-]+$/.test(values.machine_id.trim()))
    errors.machine_id = "Machine ID อนุญาตเฉพาะ A-Z, 0-9, - และ _";
  if (!values.machine_name?.trim())
    errors.machine_name = "กรุณากรอกชื่อเครื่องจักร";
  if (!values.machine_type?.trim())
    errors.machine_type = "กรุณากรอกประเภทเครื่องจักร";
  if (!values.location?.trim())
    errors.location = "กรุณากรอกสถานที่ติดตั้ง";
  if (values.status && !MACHINE_STATUSES.includes(values.status))
    errors.status = "สถานะเครื่องจักรไม่ถูกต้อง";
  return errors;
}

export function validateAlarm(values) {
  const errors = {};
  if (!values.machine_id) errors.machine_id = "กรุณาเลือกเครื่องจักร";
  if (!values.alarm_code?.trim()) errors.alarm_code = "กรุณากรอก Alarm Code";
  if (!values.alarm_description?.trim())
    errors.alarm_description = "กรุณากรอกรายละเอียดอัลาร์ม";
  if (!values.date_time) errors.date_time = "กรุณากำหนดวัน-เวลา";
  if (values.status && !ALARM_STATUSES.includes(values.status))
    errors.status = "สถานะอัลาร์มไม่ถูกต้อง";
  return errors;
}

export function validateMaintenance(values) {
  const errors = {};
  if (!values.machine_id) errors.machine_id = "กรุณาเลือกเครื่องจักร";
  if (!values.maintenance_type?.trim())
    errors.maintenance_type = "กรุณากรอกประเภทงานซ่อมบำรุง";
  if (!values.problem?.trim()) errors.problem = "กรุณากรอกปัญหา/อาการ";
  if (!values.technician_name?.trim())
    errors.technician_name = "กรุณากรอกชื่อผู้ปฏิบัติงาน";
  if (!values.date) errors.date = "กรุณากำหนดวันที่";
  if (values.status && !MAINTENANCE_STATUSES.includes(values.status))
    errors.status = "สถานะงานซ่อมบำรุงไม่ถูกต้อง";
  return errors;
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}