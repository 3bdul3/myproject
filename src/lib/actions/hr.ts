"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getAccountByCode, postJournalEntry } from "@/lib/actions/accounting";
import type { Attendance, Department, Employee, Payroll } from "@/types";

export async function listEmployees() {
  return db.employees.findAsync<Employee>({}).sort({ createdAt: -1 });
}

export async function createEmployee(formData: FormData) {
  await db.employees.insertAsync<Employee>({
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
  await db.employees.updateAsync({ _id: id }, { $set: { status } });
  revalidatePath("/hr/employees");
}

export async function listDepartments() {
  return db.departments.findAsync<Department>({}).sort({ name: 1 });
}

export async function createDepartment(formData: FormData) {
  await db.departments.insertAsync<Department>({
    name: String(formData.get("name")),
    managerName: String(formData.get("managerName") || ""),
    createdAt: new Date().toISOString(),
  });
  revalidatePath("/hr/departments");
}

export async function listAttendance() {
  return db.attendance.findAsync<Attendance>({}).sort({ createdAt: -1 }).limit(100);
}

export async function createAttendance(formData: FormData) {
  const employeeId = String(formData.get("employeeId"));
  const employee = await db.employees.findOneAsync<Employee>({ _id: employeeId });

  await db.attendance.insertAsync<Attendance>({
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
  return db.payroll.findAsync<Payroll>({}).sort({ createdAt: -1 });
}

export async function runPayroll(formData: FormData) {
  const month = String(formData.get("month"));
  const employees = await db.employees.findAsync<Employee>({ status: "active" });

  const existing = await db.payroll.findAsync<Payroll>({ month });
  const alreadyRun = new Set(existing.map((p) => p.employeeId));

  for (const emp of employees) {
    if (alreadyRun.has(emp._id!)) continue;
    const deductions = Math.round(emp.salary * 0.1 * 100) / 100;
    const bonuses = 0;
    const netPay = emp.salary - deductions + bonuses;

    await db.payroll.insertAsync<Payroll>({
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
  const record = await db.payroll.findOneAsync<Payroll>({ _id: id });
  if (!record || record.status === "paid") return;

  const cash = await getAccountByCode("1000");
  const payrollExpense = await getAccountByCode("5100");

  await postJournalEntry(
    `Payroll for ${record.employeeName} - ${record.month}`,
    [
      { accountId: payrollExpense._id!, accountName: payrollExpense.name, debit: record.netPay, credit: 0 },
      { accountId: cash._id!, accountName: cash.name, debit: 0, credit: record.netPay },
    ],
    "manual",
    id
  );

  await db.payroll.updateAsync({ _id: id }, { $set: { status: "paid" } });
  revalidatePath("/hr/payroll");
  revalidatePath("/accounting/reports");
}
