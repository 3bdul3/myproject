"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActiveCompanyId } from "@/lib/authz";
import { getAccountByCode, postJournalEntry } from "@/lib/actions/accounting";
import type { Attendance, Department, Employee, Payroll } from "@/types";

export async function listEmployees() {
  const companyId = await getActiveCompanyId();
  return db.employees.findAsync<Employee>(companyId, {}).sort({ createdAt: -1 });
}

export async function createEmployee(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await db.employees.insertAsync<Employee>(companyId, {
    name: String(formData.get("name")),
    email: String(formData.get("email")),
    phone: String(formData.get("phone")),
    department: String(formData.get("department")),
    position: String(formData.get("position")),
    hireDate: String(formData.get("hireDate")),
    salary: Number(formData.get("salary")),
    status: "active",
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/hr/employees");
}

export async function updateEmployeeStatus(id: string, status: Employee["status"]) {
  const companyId = await getActiveCompanyId();
  await db.employees.updateAsync(companyId, { _id: id }, { $set: { status } });
  revalidatePath("/hr/employees");
}

export async function listDepartments() {
  const companyId = await getActiveCompanyId();
  return db.departments.findAsync<Department>(companyId, {}).sort({ name: 1 });
}

export async function createDepartment(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await db.departments.insertAsync<Department>(companyId, {
    name: String(formData.get("name")),
    managerName: String(formData.get("managerName") || ""),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/hr/departments");
}

export async function listAttendance() {
  const companyId = await getActiveCompanyId();
  return db.attendance.findAsync<Attendance>(companyId, {}).sort({ createdAt: -1 }).limit(100);
}

export async function createAttendance(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const employeeId = String(formData.get("employeeId"));
  const employee = await db.employees.findOneAsync<Employee>(companyId, { _id: employeeId });

  await db.attendance.insertAsync<Attendance>(companyId, {
    employeeId,
    employeeName: employee?.name ?? "Unknown",
    date: String(formData.get("date")),
    checkIn: String(formData.get("checkIn") || ""),
    checkOut: String(formData.get("checkOut") || ""),
    status: String(formData.get("status")) as Attendance["status"],
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/hr/attendance");
}

export async function listPayroll() {
  const companyId = await getActiveCompanyId();
  return db.payroll.findAsync<Payroll>(companyId, {}).sort({ createdAt: -1 });
}

export async function runPayroll(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const month = String(formData.get("month"));
  const employees = await db.employees.findAsync<Employee>(companyId, { status: "active" });

  const existing = await db.payroll.findAsync<Payroll>(companyId, { month });
  const alreadyRun = new Set(existing.map((p) => p.employeeId));

  for (const emp of employees) {
    if (alreadyRun.has(emp._id!)) continue;
    const deductions = Math.round(emp.salary * 0.1 * 100) / 100;
    const bonuses = 0;
    const netPay = emp.salary - deductions + bonuses;

    await db.payroll.insertAsync<Payroll>(companyId, {
      employeeId: emp._id!,
      employeeName: emp.name,
      month,
      baseSalary: emp.salary,
      deductions,
      bonuses,
      netPay,
      status: "draft",
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath("/hr/payroll");
}

export async function markPayrollPaid(id: string) {
  const companyId = await getActiveCompanyId();
  const record = await db.payroll.findOneAsync<Payroll>(companyId, { _id: id });
  if (!record || record.status === "paid") return;

  const cash = await getAccountByCode(companyId, "1000");
  const payrollExpense = await getAccountByCode(companyId, "5100");

  await postJournalEntry(
    companyId,
    `Payroll for ${record.employeeName} - ${record.month}`,
    [
      { accountId: payrollExpense._id!, accountName: payrollExpense.nameEn || payrollExpense.nameAr || payrollExpense.name || "", debit: record.netPay, credit: 0 },
      { accountId: cash._id!, accountName: cash.nameEn || cash.nameAr || cash.name || "", debit: 0, credit: record.netPay },
    ],
    "manual",
    id
  );

  await db.payroll.updateAsync(companyId, { _id: id }, { $set: { status: "paid" } });
  revalidatePath("/hr/payroll");
  revalidatePath("/accounting/reports");
}
