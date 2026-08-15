"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, nextNumber } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { TAX_RATES } from "@/lib/constants";
import { getAccountByCode, postJournalEntry } from "@/lib/actions/accounting";
import { ensureApprovalRequest } from "@/lib/actions/approvals";
import { logAudit } from "@/lib/actions/auditLog";
import type { Account, Bill, JournalEntry, JournalLine, Supplier, SupplierPayment } from "@/types";

export async function listBills() {
  const companyId = await getActiveCompanyId();
  return db.bills.findAsync<Bill>(companyId, {}).sort({ createdAt: -1 });
}

export async function getBill(id: string) {
  const companyId = await getActiveCompanyId();
  return db.bills.findOneAsync<Bill>(companyId, { _id: id });
}

export async function getBillByNumber(number: string) {
  const companyId = await getActiveCompanyId();
  return db.bills.findOneAsync<Bill>(companyId, { number });
}

export async function createBill(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const supplierId = String(formData.get("supplierId"));
  const supplier = await db.suppliers.findOneAsync<Supplier>(companyId, { _id: supplierId });
  if (supplier?.suspended) {
    redirect(
      `/accounting/payable/new?error=${encodeURIComponent(`${supplier.name} is suspended — reactivate them before recording a new bill.`)}`
    );
  }
  const purchaseOrderId = String(formData.get("purchaseOrderId") || "");
  const purchaseOrder = purchaseOrderId
    ? await db.purchaseOrders.findOneAsync<{ number: string }>(companyId, { _id: purchaseOrderId })
    : null;

  const rawVatRate = Number(formData.get("vatRate"));
  const vatRate = (TAX_RATES as readonly number[]).includes(rawVatRate) ? rawVatRate : 0.15;
  const hasVat = vatRate > 0;
  const subtotal = Number(formData.get("subtotal") || 0);
  const vat = hasVat ? Math.round(subtotal * vatRate * 100) / 100 : 0;
  const total = subtotal + vat;

  const count = await db.bills.countAsync(companyId, {});
  const number = nextNumber("BILL", count + 1);

  const created = await db.bills.insertAsync<Bill>(companyId, {
    number,
    supplierId,
    supplierName: supplier?.name ?? "Unknown",
    supplierInvoiceNumber: String(formData.get("supplierInvoiceNumber") || ""),
    purchaseOrderId: purchaseOrderId || undefined,
    purchaseOrderNumber: purchaseOrder?.number,
    date: String(formData.get("date")),
    dueDate: String(formData.get("dueDate")),
    hasVat,
    vatRate,
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
  const companyId = await getActiveCompanyId();
  const bill = await db.bills.findOneAsync<Bill>(companyId, { _id: id });
  if (!bill || bill.status !== "draft") return;

  const session = await auth();
  const approval = await ensureApprovalRequest(
    companyId,
    "bill",
    bill._id!,
    bill.number,
    session!.user.id,
    session!.user.name ?? ""
  );
  if (approval.status !== "approved") {
    redirect(
      `/accounting/payable/${bill.number}?error=${encodeURIComponent(
        "This bill requires admin/accountant approval before it can be posted."
      )}`
    );
  }

  const memo = String(formData.get("memo") || "").trim();
  if (!memo) return;

  const apTrade = await getAccountByCode(companyId, "2000");
  const debitAccount = bill.purchaseOrderId
    ? await getAccountByCode(companyId, "1200")
    : await getAccountByCode(companyId, "5200");

  const lines: JournalLine[] = [
    { accountId: debitAccount._id!, accountName: debitAccount.nameEn || debitAccount.nameAr || debitAccount.name || "", debit: bill.subtotal, credit: 0 },
  ];
  if (bill.hasVat && bill.vat > 0) {
    const vatReceivable = await getAccountByCode(companyId, "1150");
    lines.push({ accountId: vatReceivable._id!, accountName: vatReceivable.nameEn || vatReceivable.nameAr || vatReceivable.name || "", debit: bill.vat, credit: 0 });
  }
  lines.push({ accountId: apTrade._id!, accountName: apTrade.nameEn || apTrade.nameAr || apTrade.name || "", debit: 0, credit: bill.total });

  await postJournalEntry(companyId, memo, lines, "bill", id);
  await db.bills.updateAsync(companyId, { _id: id }, { $set: { status: "posted" } });
  await logAudit(
    companyId,
    session!.user.id,
    session!.user.name ?? "",
    "post_bill",
    "bill",
    id,
    `Posted bill ${bill.number} (${bill.total.toFixed(2)})`
  );

  revalidatePath("/accounting/payable");
  revalidatePath(`/accounting/payable/${bill.number}`);
  revalidatePath("/accounting/reports");
  revalidatePath("/accounting/accounts");
}

export async function recordSupplierPayment(billId: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const bill = await db.bills.findOneAsync<Bill>(companyId, { _id: billId });
  if (!bill || (bill.status !== "posted" && bill.status !== "partial")) return;

  const rawAmount = Number(formData.get("amount"));
  const date = String(formData.get("date"));
  const method = String(formData.get("method")) as SupplierPayment["method"];
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return;

  const outstanding = bill.total - bill.amountPaid;
  const amount = Math.min(rawAmount, outstanding);

  await db.supplierPayments.insertAsync<SupplierPayment>(companyId, {
    billId,
    amount,
    date,
    method,
    createdAt: new Date().toISOString(),
  });

  const apTrade = await getAccountByCode(companyId, "2000");
  const cashOrBank = await getAccountByCode(companyId, "1000");

  await postJournalEntry(
    companyId,
    `Payment to ${bill.supplierName} for ${bill.number}`,
    [
      { accountId: apTrade._id!, accountName: apTrade.nameEn || apTrade.nameAr || apTrade.name || "", debit: amount, credit: 0 },
      { accountId: cashOrBank._id!, accountName: cashOrBank.nameEn || cashOrBank.nameAr || cashOrBank.name || "", debit: 0, credit: amount },
    ],
    "payment",
    billId
  );

  const newAmountPaid = bill.amountPaid + amount;
  const status = newAmountPaid >= bill.total ? "paid" : "partial";

  await db.bills.updateAsync(companyId, { _id: billId }, { $set: { amountPaid: newAmountPaid, status } });

  revalidatePath("/accounting/payable");
  revalidatePath(`/accounting/payable/${bill.number}`);
  revalidatePath("/accounting/reports");
}

export async function listSupplierPayments(billId: string) {
  const companyId = await getActiveCompanyId();
  return db.supplierPayments.findAsync<SupplierPayment>(companyId, { billId }).sort({ date: 1 });
}

export async function getBillJournalEntries(billId: string) {
  const companyId = await getActiveCompanyId();
  return db.journalEntries.findAsync<JournalEntry>(companyId, { sourceId: billId }).sort({ createdAt: 1 });
}

export async function getApSummary() {
  const companyId = await getActiveCompanyId();
  const [accounts, bills] = await Promise.all([
    db.accounts.findAsync<Account>(companyId, {}),
    db.bills.findAsync<Bill>(companyId, { status: { $ne: "draft" } }),
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
