"use server";

import { getAccountByCode, listInvoicesByType } from "@/lib/actions/accounting";
import { listBills } from "@/lib/actions/ap";
import { listEmployees } from "@/lib/actions/hr";
import { getStockLevels } from "@/lib/actions/inventory";
import type { Employee, Invoice } from "@/types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthEndDatesWithin(startDateStr: string, endDateStr: string) {
  const dates: string[] = [];
  const cursor = new Date(startDateStr + "T00:00:00Z");
  cursor.setUTCDate(1);
  while (true) {
    const monthEnd = new Date(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0);
    const monthEndStr = monthEnd.toISOString().slice(0, 10);
    if (monthEndStr > endDateStr) break;
    if (monthEndStr >= startDateStr) dates.push(monthEndStr);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return dates;
}

export interface CashProjectionPoint {
  date: string;
  arInflow: number;
  apOutflow: number;
  payrollOutflow: number;
  cumulativeNetCash: number;
}

export interface CashProjection {
  asOf: string;
  horizonDays: 30 | 45 | 60;
  startingCash: number;
  points: CashProjectionPoint[];
  totals: { arInflow: number; apOutflow: number; payrollOutflow: number; projectedCash: number };
}

export async function getCashPositionProjection(horizonDays: 30 | 45 | 60 = 30): Promise<CashProjection> {
  const today = todayStr();
  const horizonEnd = addDays(today, horizonDays);

  const [cash, taxInvoices, bills, employees] = await Promise.all([
    getAccountByCode("1000"),
    listInvoicesByType("tax"),
    listBills(),
    listEmployees(),
  ]);

  const byDate = new Map<string, { arInflow: number; apOutflow: number; payrollOutflow: number }>();
  const entry = (date: string) => {
    let e = byDate.get(date);
    if (!e) {
      e = { arInflow: 0, apOutflow: 0, payrollOutflow: 0 };
      byDate.set(date, e);
    }
    return e;
  };

  for (const inv of taxInvoices) {
    if (inv.status !== "posted" && inv.status !== "partial") continue;
    const outstanding = inv.total - inv.amountPaid;
    if (outstanding <= 0) continue;
    const effectiveDate = inv.dueDate < today ? today : inv.dueDate;
    if (effectiveDate > horizonEnd) continue;
    entry(effectiveDate).arInflow += outstanding;
  }

  for (const bill of bills) {
    if (bill.status !== "posted" && bill.status !== "partial") continue;
    const outstanding = bill.total - bill.amountPaid;
    if (outstanding <= 0) continue;
    const effectiveDate = bill.dueDate < today ? today : bill.dueDate;
    if (effectiveDate > horizonEnd) continue;
    entry(effectiveDate).apOutflow += outstanding;
  }

  const activeEmployees = employees.filter((e: Employee) => e.status === "active");
  const monthlyPayroll = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  for (const monthEnd of monthEndDatesWithin(today, horizonEnd)) {
    entry(monthEnd).payrollOutflow += monthlyPayroll;
  }

  const sortedDates = Array.from(byDate.keys()).sort();
  let running = cash.balance;
  const points: CashProjectionPoint[] = sortedDates.map((date) => {
    const e = byDate.get(date)!;
    running = running + e.arInflow - e.apOutflow - e.payrollOutflow;
    return { date, ...e, cumulativeNetCash: running };
  });

  const totals = points.reduce(
    (acc, p) => ({
      arInflow: acc.arInflow + p.arInflow,
      apOutflow: acc.apOutflow + p.apOutflow,
      payrollOutflow: acc.payrollOutflow + p.payrollOutflow,
      projectedCash: cash.balance,
    }),
    { arInflow: 0, apOutflow: 0, payrollOutflow: 0, projectedCash: cash.balance }
  );
  totals.projectedCash = points.length > 0 ? points[points.length - 1].cumulativeNetCash : cash.balance;

  return { asOf: today, horizonDays, startingCash: cash.balance, points, totals };
}

export type AttentionItemKind = "overdue_ar" | "bill_due_soon" | "low_stock" | "draft_pending";

export interface AttentionItem {
  kind: AttentionItemKind;
  severity: "high" | "medium";
  title: string;
  detail: string;
  amount?: number;
  href: string;
  date?: string;
}

export async function getAttentionItems(): Promise<AttentionItem[]> {
  const [taxInvoices, bills, stockLevels] = await Promise.all([
    listInvoicesByType("tax"),
    listBills(),
    getStockLevels(),
  ]);
  const today = todayStr();
  const soon = addDays(today, 7);

  const items: AttentionItem[] = [];

  for (const inv of taxInvoices as Invoice[]) {
    if ((inv.status === "posted" || inv.status === "partial") && inv.dueDate < today) {
      items.push({
        kind: "overdue_ar",
        severity: "high",
        title: `${inv.number} overdue`,
        detail: `${inv.customerName} — due ${inv.dueDate}`,
        amount: inv.total - inv.amountPaid,
        href: `/accounting/invoices/${inv.number}`,
        date: inv.dueDate,
      });
    }
    if (inv.status === "draft") {
      items.push({
        kind: "draft_pending",
        severity: "medium",
        title: `${inv.number} awaiting posting`,
        detail: `${inv.customerName} — created ${inv.date}`,
        amount: inv.total,
        href: `/accounting/invoices/${inv.number}`,
        date: inv.date,
      });
    }
  }

  for (const bill of bills) {
    if ((bill.status === "posted" || bill.status === "partial") && bill.dueDate >= today && bill.dueDate <= soon) {
      items.push({
        kind: "bill_due_soon",
        severity: "medium",
        title: `${bill.number} due soon`,
        detail: `${bill.supplierName} — due ${bill.dueDate}`,
        amount: bill.total - bill.amountPaid,
        href: `/accounting/payable/${bill.number}`,
        date: bill.dueDate,
      });
    }
    if (bill.status === "draft") {
      items.push({
        kind: "draft_pending",
        severity: "medium",
        title: `${bill.number} awaiting posting`,
        detail: `${bill.supplierName} — created ${bill.date}`,
        amount: bill.total,
        href: `/accounting/payable/${bill.number}`,
        date: bill.date,
      });
    }
  }

  for (const s of stockLevels) {
    if (s.lowStock) {
      items.push({
        kind: "low_stock",
        severity: "high",
        title: `${s.product.name} low on stock`,
        detail: `${s.quantity} units remaining (reorder at ${s.product.reorderLevel})`,
        href: "/inventory/products",
      });
    }
  }

  const severityRank = { high: 0, medium: 1 } as const;
  return items.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || (a.date ?? "").localeCompare(b.date ?? ""));
}
