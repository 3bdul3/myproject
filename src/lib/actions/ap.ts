"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, nextNumber } from "@/lib/db";
import { getAccountByCode, postJournalEntry } from "@/lib/actions/accounting";
import type { Account, Bill, JournalEntry, JournalLine, Supplier, SupplierPayment } from "@/types";

export async function listBills() {
  return db.bills.findAsync<Bill>({}).sort({ createdAt: -1 });
}

export async function getBill(id: string) {
  return db.bills.findOneAsync<Bill>({ _id: id });
}

export async function getBillByNumber(number: string) {
  return db.bills.findOneAsync<Bill>({ number });
}

export async function createBill(formData: FormData) {
  const supplierId = String(formData.get("supplierId"));
  const supplier = await db.suppliers.findOneAsync<Supplier>({ _id: supplierId });
  const purchaseOrderId = String(formData.get("purchaseOrderId") || "");
  const purchaseOrder = purchaseOrderId
    ? await db.purchaseOrders.findOneAsync<{ number: string }>({ _id: purchaseOrderId })
    : null;

  const hasVat = formData.get("hasVat") === "on";
  const subtotal = Number(formData.get("subtotal") || 0);
  const vat = hasVat ? Math.round(subtotal * 0.15 * 100) / 100 : 0;
  const total = subtotal + vat;

  const count = await db.bills.countAsync({});
  const number = nextNumber("BILL", count + 1);

  const created = await db.bills.insertAsync<Bill>({
    number,
    supplierId,
    supplierName: supplier?.name ?? "Unknown",
    supplierInvoiceNumber: String(formData.get("supplierInvoiceNumber") || ""),
    purchaseOrderId: purchaseOrderId || undefined,
    purchaseOrderNumber: purchaseOrder?.number,
    date: String(formData.get("date")),
    dueDate: String(formData.get("dueDate")),
    hasVat,
    subtotal,
    vat,
    total,
    amountPaid: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/accounting/payable");
  redirect(`/accounting/payable/${created.number}`);
}

export async function postBill(id: string, formData: FormData) {
  const bill = await db.bills.findOneAsync<Bill>({ _id: id });
  if (!bill || bill.status !== "draft") return;

  const memo = String(formData.get("memo") || "").trim();
  if (!memo) return;

  const apTrade = await getAccountByCode("2000");
  const debitAccount = bill.purchaseOrderId ? await getAccountByCode("1200") : await getAccountByCode("5200");

  const lines: JournalLine[] = [
    { accountId: debitAccount._id!, accountName: debitAccount.name, debit: bill.subtotal, credit: 0 },
  ];
  if (bill.hasVat && bill.vat > 0) {
    const vatReceivable = await getAccountByCode("1150");
    lines.push({ accountId: vatReceivable._id!, accountName: vatReceivable.name, debit: bill.vat, credit: 0 });
  }
  lines.push({ accountId: apTrade._id!, accountName: apTrade.name, debit: 0, credit: bill.total });

  await postJournalEntry(memo, lines, "bill", id);
  await db.bills.updateAsync({ _id: id }, { $set: { status: "posted" } });

  revalidatePath("/accounting/payable");
  revalidatePath(`/accounting/payable/${bill.number}`);
  revalidatePath("/accounting/reports");
  revalidatePath("/accounting/accounts");
}

export async function recordSupplierPayment(billId: string, formData: FormData) {
  const bill = await db.bills.findOneAsync<Bill>({ _id: billId });
  if (!bill || (bill.status !== "posted" && bill.status !== "partial")) return;

  const rawAmount = Number(formData.get("amount"));
  const date = String(formData.get("date"));
  const method = String(formData.get("method")) as SupplierPayment["method"];
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return;

  const outstanding = bill.total - bill.amountPaid;
  const amount = Math.min(rawAmount, outstanding);

  await db.supplierPayments.insertAsync<SupplierPayment>({
    billId,
    amount,
    date,
    method,
    createdAt: new Date().toISOString(),
  });

  const apTrade = await getAccountByCode("2000");
  const cashOrBank = await getAccountByCode("1000");

  await postJournalEntry(
    `Payment to ${bill.supplierName} for ${bill.number}`,
    [
      { accountId: apTrade._id!, accountName: apTrade.name, debit: amount, credit: 0 },
      { accountId: cashOrBank._id!, accountName: cashOrBank.name, debit: 0, credit: amount },
    ],
    "payment",
    billId
  );

  const newAmountPaid = bill.amountPaid + amount;
  const status = newAmountPaid >= bill.total ? "paid" : "partial";

  await db.bills.updateAsync({ _id: billId }, { $set: { amountPaid: newAmountPaid, status } });

  revalidatePath("/accounting/payable");
  revalidatePath(`/accounting/payable/${bill.number}`);
  revalidatePath("/accounting/reports");
}

export async function listSupplierPayments(billId: string) {
  return db.supplierPayments.findAsync<SupplierPayment>({ billId }).sort({ date: 1 });
}

export async function getBillJournalEntries(billId: string) {
  return db.journalEntries.findAsync<JournalEntry>({ sourceId: billId }).sort({ createdAt: 1 });
}

export async function getApSummary() {
  const [accounts, bills] = await Promise.all([
    db.accounts.findAsync<Account>({}),
    db.bills.findAsync<Bill>({ status: { $ne: "draft" } }),
  ]);

  const apTrade = accounts.find((a) => a.code === "2000");
  const zakatAccounts = accounts.filter((a) => (a.group ?? "general") === "ap_zakat");

  const bySupplier = new Map<string, { supplierName: string; outstanding: number }>();
  for (const bill of bills) {
    const outstanding = bill.total - bill.amountPaid;
    const entry = bySupplier.get(bill.supplierId) ?? { supplierName: bill.supplierName, outstanding: 0 };
    entry.outstanding += outstanding;
    bySupplier.set(bill.supplierId, entry);
  }

  return {
    apTradeBalance: apTrade?.balance ?? 0,
    zakatAccounts,
    supplierBalances: Array.from(bySupplier.entries()).map(([supplierId, v]) => ({ supplierId, ...v })),
  };
}
