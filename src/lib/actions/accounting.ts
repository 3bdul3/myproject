"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, nextNumber } from "@/lib/db";
import { auth } from "@/auth";
import { getActiveCompanyId } from "@/lib/authz";
import { customerDisplayName } from "@/lib/customer";
import { TAX_RATE, TAX_RATES, TAX_INVOICE_APPROVAL_THRESHOLD } from "@/lib/constants";
import { getNextDocNumber, periodErrorMessage } from "@/lib/invoiceNumbering";
import { ensureApprovalRequest } from "@/lib/actions/approvals";
import { logAudit } from "@/lib/actions/auditLog";
import type {
  Account,
  AccountGroup,
  AccountType,
  Bill,
  Customer,
  CustomerDocuments,
  Invoice,
  InvoiceDocType,
  JournalEntry,
  JournalLine,
  LineItem,
  Payment,
  Proposal,
} from "@/types";

/** Reads the selected VAT rate off a submitted invoice form, falling back to the standard rate for anything not in the allowed set. */
function taxRateFromFormData(formData: FormData): number {
  const raw = Number(formData.get("taxRate"));
  return (TAX_RATES as readonly number[]).includes(raw) ? raw : TAX_RATE;
}

export async function getMissingRequirementsForTaxInvoice(customerId: string, proposalId: string) {
  const companyId = await getActiveCompanyId();
  const missing: string[] = [];
  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: customerId });
  if (!customer) return ["Customer not found"];

  const docs = await db.customerDocuments.findOneAsync<CustomerDocuments>(companyId, { customerId });

  if (!customer.crNumber && !docs?.crOrNationalIdFileDataUrl) {
    missing.push("Commercial Registration (or National ID)");
  }

  const addr = customer.nationalAddress;
  if (!addr?.buildingNumber || !addr?.streetName || !addr?.district || !addr?.city || !addr?.postalCode) {
    missing.push("Complete National Address");
  }

  if (!docs?.kycFileDataUrl) missing.push("KYC form");

  const proposal = proposalId ? await db.proposals.findOneAsync<Proposal>(companyId, { _id: proposalId }) : null;
  if (!proposal || proposal.customerId !== customerId || proposal.status !== "signed" || !proposal.signedFileDataUrl) {
    missing.push("Signed Proposal");
  } else if (!proposal.serviceContractFileDataUrl) {
    missing.push("Service Contract");
  }

  return missing;
}

export async function listAccounts() {
  const companyId = await getActiveCompanyId();
  return db.accounts.findAsync<Account>(companyId, {}).sort({ code: 1 });
}

const ACCOUNT_BASE_CODE: Record<AccountType, Partial<Record<AccountGroup, number>>> = {
  asset: { ar: 1100, general: 1000 },
  liability: { ap_trade: 2000, ap_zakat: 2050, general: 2200 },
  equity: { general: 3000 },
  revenue: { general: 4000 },
  expense: { general: 5000 },
};

async function getNextAccountCode(companyId: string, type: AccountType, group: AccountGroup): Promise<string> {
  const existing = await db.accounts.findAsync<Account>(companyId, { type });
  const used = new Set(existing.map((a) => a.code));
  let code = ACCOUNT_BASE_CODE[type][group] ?? ACCOUNT_BASE_CODE[type].general ?? 9000;
  while (used.has(String(code))) {
    code += 10;
  }
  return String(code);
}

export async function createAccount(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const name = String(formData.get("name"));
  const type = String(formData.get("type")) as AccountType;
  const group = (String(formData.get("group") || "general") as AccountGroup) ?? "general";
  const code = await getNextAccountCode(companyId, type, group);

  await db.accounts.insertAsync<Account>(companyId, {
    code,
    codeKey: `${companyId}:${code}`,
    name,
    type,
    group,
    balance: 0,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/accounting/accounts");
}

export async function listInvoicesByType(docType: InvoiceDocType) {
  const companyId = await getActiveCompanyId();
  return db.invoices.findAsync<Invoice>(companyId, { docType }).sort({ createdAt: -1 });
}

export interface InvoiceSearchFilters {
  number?: string;
  customerName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function searchInvoices(docType: InvoiceDocType, filters: InvoiceSearchFilters) {
  const companyId = await getActiveCompanyId();
  const docs = await db.invoices.findAsync<Invoice>(companyId, { docType }).sort({ createdAt: -1 });
  return docs.filter((doc) => {
    if (filters.number && !doc.number.toLowerCase().includes(filters.number.toLowerCase())) return false;
    if (filters.customerName && !doc.customerName.toLowerCase().includes(filters.customerName.toLowerCase()))
      return false;
    if (filters.dateFrom && doc.date < filters.dateFrom) return false;
    if (filters.dateTo && doc.date > filters.dateTo) return false;
    return true;
  });
}

export async function getAdjacentInvoiceNumbers(docType: InvoiceDocType, number: string) {
  const companyId = await getActiveCompanyId();
  const docs = await db.invoices.findAsync<Invoice>(companyId, { docType }).sort({ createdAt: 1 });
  const index = docs.findIndex((d) => d.number === number);
  if (index === -1) return { prevNumber: null, nextNumber: null };
  return {
    prevNumber: index > 0 ? docs[index - 1].number : null,
    nextNumber: index < docs.length - 1 ? docs[index + 1].number : null,
  };
}

export async function listPostedTaxInvoices() {
  const companyId = await getActiveCompanyId();
  return db.invoices
    .findAsync<Invoice>(companyId, { docType: "tax", status: { $in: ["posted", "partial", "paid"] } })
    .sort({ createdAt: -1 });
}

export async function getInvoice(id: string) {
  const companyId = await getActiveCompanyId();
  return db.invoices.findOneAsync<Invoice>(companyId, { _id: id });
}

export async function getInvoiceByNumber(number: string) {
  const companyId = await getActiveCompanyId();
  return db.invoices.findOneAsync<Invoice>(companyId, { number });
}

export async function getInvoiceJournalEntries(invoiceId: string) {
  const companyId = await getActiveCompanyId();
  return db.journalEntries.findAsync<JournalEntry>(companyId, { sourceId: invoiceId }).sort({ createdAt: 1 });
}

export async function createProformaInvoice(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const customerId = String(formData.get("customerId"));
  const date = String(formData.get("date"));

  const periodErr = periodErrorMessage(date);
  if (periodErr) redirect(`/accounting/invoices?type=proforma&error=${encodeURIComponent(periodErr)}`);

  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: customerId });
  if (customer?.suspended) {
    redirect(
      `/accounting/invoices?type=proforma&error=${encodeURIComponent(`${customerDisplayName(customer)} is suspended — reactivate them before issuing a new invoice.`)}`
    );
  }
  const dueDate = String(formData.get("dueDate"));
  const items: LineItem[] = JSON.parse(String(formData.get("items") || "[]"));
  const discount = Number(formData.get("discount") || 0);

  const grossSubtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const taxable = grossSubtotal - discount;
  const taxRate = taxRateFromFormData(formData);
  const tax = Math.round(taxable * taxRate * 100) / 100;
  const total = taxable + tax;
  const number = await getNextDocNumber(companyId, "proforma");

  const created = await db.invoices.insertAsync<Invoice>(companyId, {
    docType: "proforma",
    number,
    customerId,
    customerName: customer ? customerDisplayName(customer) : "Unknown",
    date,
    dueDate,
    supplyDate: String(formData.get("supplyDate") || ""),
    poNumber: String(formData.get("poNumber") || ""),
    projectDuration: String(formData.get("projectDuration") || ""),
    projectStartDate: String(formData.get("projectStartDate") || ""),
    projectEndDate: String(formData.get("projectEndDate") || ""),
    items,
    discount,
    subtotal: grossSubtotal,
    taxRate,
    tax,
    total,
    amountPaid: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/accounting/invoices");
  redirect(`/accounting/invoices/${created.number}`);
}

export async function createTaxInvoice(formData: FormData) {
  const companyId = await getActiveCompanyId();
  const customerId = String(formData.get("customerId"));
  const date = String(formData.get("date"));

  const periodErr = periodErrorMessage(date);
  if (periodErr) redirect(`/accounting/invoices?type=tax&error=${encodeURIComponent(periodErr)}`);

  const proposalId = String(formData.get("proposalId") || "");
  const missing = await getMissingRequirementsForTaxInvoice(customerId, proposalId);
  if (missing.length > 0) {
    redirect(
      `/accounting/invoices?type=tax&error=${encodeURIComponent(`Cannot issue tax invoice — missing: ${missing.join(", ")}`)}`
    );
  }

  const customer = await db.customers.findOneAsync<Customer>(companyId, { _id: customerId });
  if (customer?.suspended) {
    redirect(
      `/accounting/invoices?type=tax&error=${encodeURIComponent(`${customerDisplayName(customer)} is suspended — reactivate them before issuing a new invoice.`)}`
    );
  }
  const proposal = await db.proposals.findOneAsync<Proposal>(companyId, { _id: proposalId });
  const dueDate = String(formData.get("dueDate"));
  const items: LineItem[] = JSON.parse(String(formData.get("items") || "[]"));
  const discount = Number(formData.get("discount") || 0);

  const grossSubtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const taxable = grossSubtotal - discount;
  const taxRate = taxRateFromFormData(formData);
  const tax = Math.round(taxable * taxRate * 100) / 100;
  const total = taxable + tax;
  const number = await getNextDocNumber(companyId, "tax");

  const created = await db.invoices.insertAsync<Invoice>(companyId, {
    docType: "tax",
    number,
    customerId,
    customerName: customer ? customerDisplayName(customer) : "Unknown",
    date,
    dueDate,
    supplyDate: String(formData.get("supplyDate") || ""),
    poNumber: String(formData.get("poNumber") || ""),
    projectDuration: String(formData.get("projectDuration") || ""),
    projectStartDate: proposal?.projectStartDate || "",
    projectEndDate: proposal?.projectEndDate || "",
    proposalId: proposal?._id,
    proposalNumber: proposal?.number,
    items,
    discount,
    subtotal: grossSubtotal,
    taxRate,
    tax,
    total,
    amountPaid: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/accounting/invoices");
  redirect(`/accounting/invoices/${created.number}`);
}

export async function convertProformaToTaxInvoice(proformaId: string) {
  const companyId = await getActiveCompanyId();
  const proforma = await db.invoices.findOneAsync<Invoice>(companyId, { _id: proformaId });
  if (!proforma || proforma.docType !== "proforma" || proforma.status === "converted") return;

  const periodErr = periodErrorMessage(proforma.date);
  if (periodErr) redirect(`/accounting/invoices/${proforma.number}?error=${encodeURIComponent(periodErr)}`);

  const signedProposal = await db.proposals.findOneAsync<Proposal>(companyId, {
    customerId: proforma.customerId,
    status: "signed",
  });
  const missing = await getMissingRequirementsForTaxInvoice(proforma.customerId, signedProposal?._id ?? "");
  if (missing.length > 0) {
    redirect(
      `/accounting/invoices/${proforma.number}?error=${encodeURIComponent(`Cannot issue tax invoice — missing: ${missing.join(", ")}`)}`
    );
  }

  const number = await getNextDocNumber(companyId, "tax");

  const created = await db.invoices.insertAsync<Invoice>(companyId, {
    docType: "tax",
    number,
    customerId: proforma.customerId,
    customerName: proforma.customerName,
    date: new Date().toISOString().slice(0, 10),
    dueDate: proforma.dueDate,
    projectStartDate: signedProposal?.projectStartDate || "",
    projectEndDate: signedProposal?.projectEndDate || "",
    proposalId: signedProposal?._id,
    proposalNumber: signedProposal?.number,
    items: proforma.items,
    discount: proforma.discount,
    subtotal: proforma.subtotal,
    taxRate: proforma.taxRate,
    tax: proforma.tax,
    total: proforma.total,
    amountPaid: 0,
    status: "draft",
    relatedInvoiceId: proforma._id,
    relatedInvoiceNumber: proforma.number,
    createdAt: new Date().toISOString(),
  });

  await db.invoices.updateAsync(companyId, { _id: proformaId }, { $set: { status: "converted" } });

  revalidatePath("/accounting/invoices");
  revalidatePath(`/accounting/invoices/${proforma.number}`);
  redirect(`/accounting/invoices/${created.number}`);
}

async function createNote(companyId: string, formData: FormData, docType: "credit_note" | "debit_note") {
  const relatedInvoiceId = String(formData.get("relatedInvoiceId"));
  const relatedInvoice = await db.invoices.findOneAsync<Invoice>(companyId, { _id: relatedInvoiceId });
  if (!relatedInvoice) throw new Error("Original tax invoice not found");

  const date = String(formData.get("date"));
  const periodErr = periodErrorMessage(date);
  if (periodErr) redirect(`/accounting/invoices?type=${docType}&error=${encodeURIComponent(periodErr)}`);

  const items: LineItem[] = JSON.parse(String(formData.get("items") || "[]"));

  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const taxRate = taxRateFromFormData(formData);
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = subtotal + tax;
  const number = await getNextDocNumber(companyId, docType);

  const created = await db.invoices.insertAsync<Invoice>(companyId, {
    docType,
    number,
    customerId: relatedInvoice.customerId,
    customerName: relatedInvoice.customerName,
    date,
    dueDate: date,
    items,
    subtotal,
    taxRate,
    tax,
    total,
    amountPaid: 0,
    status: "draft",
    relatedInvoiceId: relatedInvoice._id,
    relatedInvoiceNumber: relatedInvoice.number,
    createdAt: new Date().toISOString(),
  });

  revalidatePath("/accounting/invoices");
  redirect(`/accounting/invoices/${created.number}`);
}

export async function createCreditNote(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await createNote(companyId, formData, "credit_note");
}

export async function createDebitNote(formData: FormData) {
  const companyId = await getActiveCompanyId();
  await createNote(companyId, formData, "debit_note");
}

export async function getAccountByCode(companyId: string, code: string) {
  const account = await db.accounts.findOneAsync<Account>(companyId, { code });
  if (!account) throw new Error(`Missing required account ${code}`);
  return account;
}

export async function postJournalEntry(
  companyId: string,
  memo: string,
  lines: JournalLine[],
  sourceType: JournalEntry["sourceType"],
  sourceId: string
) {
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.round((totalDebit - totalCredit) * 100) !== 0) {
    throw new Error(`Journal entry is not balanced: debit ${totalDebit} vs credit ${totalCredit}`);
  }

  const accounts = await Promise.all(
    lines.map(async (line) => {
      const account = await db.accounts.findOneAsync<Account>(companyId, { _id: line.accountId });
      if (!account) throw new Error(`Journal line references missing account ${line.accountId}`);
      return account;
    })
  );

  const count = await db.journalEntries.countAsync(companyId, {});
  const number = nextNumber("JV", count + 1);

  await db.journalEntries.insertAsync<JournalEntry>(companyId, {
    number,
    date: new Date().toISOString().slice(0, 10),
    memo,
    lines,
    sourceType,
    sourceId,
    createdAt: new Date().toISOString(),
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const account = accounts[i];
    const delta = ["asset", "expense"].includes(account.type)
      ? line.debit - line.credit
      : line.credit - line.debit;
    await db.accounts.updateAsync(companyId, { _id: line.accountId }, { $inc: { balance: delta } });
  }
}

export async function postInvoice(invoiceId: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const invoice = await db.invoices.findOneAsync<Invoice>(companyId, { _id: invoiceId });
  if (!invoice || invoice.docType !== "tax" || invoice.status !== "draft") return;

  const session = await auth();

  if (invoice.total > TAX_INVOICE_APPROVAL_THRESHOLD) {
    const approval = await ensureApprovalRequest(
      companyId,
      "invoice",
      invoice._id!,
      invoice.number,
      session!.user.id,
      session!.user.name ?? ""
    );
    if (approval.status !== "approved") {
      redirect(
        `/accounting/invoices/${invoice.number}?error=${encodeURIComponent(
          `This invoice is over ${TAX_INVOICE_APPROVAL_THRESHOLD.toLocaleString()} SAR and requires admin/accountant approval before it can be posted.`
        )}`
      );
    }
  }

  const periodErr = periodErrorMessage(invoice.date);
  if (periodErr) redirect(`/accounting/invoices/${invoice.number}?error=${encodeURIComponent(periodErr)}`);

  const memo = String(formData.get("memo") || "").trim();
  if (!memo) {
    redirect(
      `/accounting/invoices/${invoice.number}?error=${encodeURIComponent("A journal description is required to post this invoice.")}`
    );
  }

  const ar = await getAccountByCode(companyId, "1100");
  const revenue = await getAccountByCode(companyId, "4000");
  const taxPayable = await getAccountByCode(companyId, "2100");
  const discount = invoice.discount ?? 0;

  const lines: JournalLine[] = [
    { accountId: ar._id!, accountName: ar.name, debit: invoice.total, credit: 0 },
    { accountId: revenue._id!, accountName: revenue.name, debit: 0, credit: invoice.subtotal },
  ];
  if (discount > 0) {
    const salesDiscounts = await getAccountByCode(companyId, "4900");
    lines.push({ accountId: salesDiscounts._id!, accountName: salesDiscounts.name, debit: discount, credit: 0 });
  }
  if (invoice.tax > 0) {
    lines.push({ accountId: taxPayable._id!, accountName: taxPayable.name, debit: 0, credit: invoice.tax });
  }

  await postJournalEntry(companyId, memo, lines, "invoice", invoiceId);
  await db.invoices.updateAsync(companyId, { _id: invoiceId }, { $set: { status: "posted" } });
  await logAudit(
    companyId,
    session!.user.id,
    session!.user.name ?? "",
    "post_invoice",
    "invoice",
    invoiceId,
    `Posted invoice ${invoice.number} (${invoice.total.toFixed(2)})`
  );

  revalidatePath("/accounting/invoices");
  revalidatePath(`/accounting/invoices/${invoice.number}`);
  revalidatePath("/accounting/reports");
}

export async function postCreditNote(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const note = await db.invoices.findOneAsync<Invoice>(companyId, { _id: id });
  if (!note || note.docType !== "credit_note" || note.status !== "draft") return;

  const periodErr = periodErrorMessage(note.date);
  if (periodErr) redirect(`/accounting/invoices/${note.number}?error=${encodeURIComponent(periodErr)}`);

  const memo = String(formData.get("memo") || "").trim();
  if (!memo) {
    redirect(
      `/accounting/invoices/${note.number}?error=${encodeURIComponent("A journal description is required to post this credit note.")}`
    );
  }

  const ar = await getAccountByCode(companyId, "1100");
  const revenue = await getAccountByCode(companyId, "4000");
  const taxPayable = await getAccountByCode(companyId, "2100");

  const lines: JournalLine[] = [{ accountId: revenue._id!, accountName: revenue.name, debit: note.subtotal, credit: 0 }];
  if (note.tax > 0) {
    lines.push({ accountId: taxPayable._id!, accountName: taxPayable.name, debit: note.tax, credit: 0 });
  }
  lines.push({ accountId: ar._id!, accountName: ar.name, debit: 0, credit: note.total });

  await postJournalEntry(companyId, memo, lines, "credit_note", id);
  await db.invoices.updateAsync(companyId, { _id: id }, { $set: { status: "posted" } });

  revalidatePath("/accounting/invoices");
  revalidatePath(`/accounting/invoices/${note.number}`);
  revalidatePath("/accounting/reports");
}

export async function postDebitNote(id: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const note = await db.invoices.findOneAsync<Invoice>(companyId, { _id: id });
  if (!note || note.docType !== "debit_note" || note.status !== "draft") return;

  const periodErr = periodErrorMessage(note.date);
  if (periodErr) redirect(`/accounting/invoices/${note.number}?error=${encodeURIComponent(periodErr)}`);

  const memo = String(formData.get("memo") || "").trim();
  if (!memo) {
    redirect(
      `/accounting/invoices/${note.number}?error=${encodeURIComponent("A journal description is required to post this debit note.")}`
    );
  }

  const ar = await getAccountByCode(companyId, "1100");
  const revenue = await getAccountByCode(companyId, "4000");
  const taxPayable = await getAccountByCode(companyId, "2100");

  const lines: JournalLine[] = [{ accountId: ar._id!, accountName: ar.name, debit: note.total, credit: 0 }];
  lines.push({ accountId: revenue._id!, accountName: revenue.name, debit: 0, credit: note.subtotal });
  if (note.tax > 0) {
    lines.push({ accountId: taxPayable._id!, accountName: taxPayable.name, debit: 0, credit: note.tax });
  }

  await postJournalEntry(companyId, memo, lines, "debit_note", id);
  await db.invoices.updateAsync(companyId, { _id: id }, { $set: { status: "posted" } });

  revalidatePath("/accounting/invoices");
  revalidatePath(`/accounting/invoices/${note.number}`);
  revalidatePath("/accounting/reports");
}

export async function recordPayment(invoiceId: string, formData: FormData) {
  const companyId = await getActiveCompanyId();
  const rawAmount = Number(formData.get("amount"));
  const date = String(formData.get("date"));
  const method = String(formData.get("method")) as Payment["method"];
  const allocationNumber = String(formData.get("allocationNumber") || "");
  const receiptDate = String(formData.get("receiptDate") || date);
  const approvalDate = String(formData.get("approvalDate") || "");

  const invoice = await db.invoices.findOneAsync<Invoice>(companyId, { _id: invoiceId });
  if (!invoice || invoice.docType !== "tax") return;
  if (invoice.status !== "posted" && invoice.status !== "partial") return;
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) return;

  const outstanding = invoice.total - invoice.amountPaid;
  const amount = Math.min(rawAmount, outstanding);

  await db.payments.insertAsync<Payment>(companyId, {
    invoiceId,
    amount,
    date,
    method,
    allocationNumber,
    receiptDate,
    approvalDate,
    createdAt: new Date().toISOString(),
  });

  const cash = await getAccountByCode(companyId, "1000");
  const ar = await getAccountByCode(companyId, "1100");

  await postJournalEntry(
    companyId,
    `Payment received for ${invoice.number}`,
    [
      { accountId: cash._id!, accountName: cash.name, debit: amount, credit: 0 },
      { accountId: ar._id!, accountName: ar.name, debit: 0, credit: amount },
    ],
    "payment",
    invoiceId
  );

  const newAmountPaid = invoice.amountPaid + amount;
  const status = newAmountPaid >= invoice.total ? "paid" : "partial";

  await db.invoices.updateAsync(companyId, { _id: invoiceId }, { $set: { amountPaid: newAmountPaid, status } });

  revalidatePath("/accounting/invoices");
  revalidatePath(`/accounting/invoices/${invoice.number}`);
  revalidatePath("/accounting/reports");
  revalidatePath(`/sales/customers/${invoice.customerId}/statement`);
}

export async function listPayments(invoiceId: string) {
  const companyId = await getActiveCompanyId();
  return db.payments.findAsync<Payment>(companyId, { invoiceId }).sort({ date: 1 });
}

export async function listJournalEntries() {
  const companyId = await getActiveCompanyId();
  return db.journalEntries.findAsync<JournalEntry>(companyId, {}).sort({ createdAt: -1 });
}

export async function getJournalEntry(id: string) {
  const companyId = await getActiveCompanyId();
  return db.journalEntries.findOneAsync<JournalEntry>(companyId, { _id: id });
}

export async function getTrialBalanceCheck() {
  const companyId = await getActiveCompanyId();
  const entries = await db.journalEntries.findAsync<JournalEntry>(companyId, {});
  let totalDebit = 0;
  let totalCredit = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      totalDebit += line.debit;
      totalCredit += line.credit;
    }
  }
  const balanced = Math.round((totalDebit - totalCredit) * 100) === 0;
  return { balanced, totalDebit, totalCredit };
}

export async function getFinancialSummary() {
  const companyId = await getActiveCompanyId();
  const accounts = await db.accounts.findAsync<Account>(companyId, {}).sort({ code: 1 });

  const byType = (type: AccountType) => accounts.filter((a) => a.type === type);

  const totalAssets = byType("asset").reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = byType("liability").reduce((s, a) => s + a.balance, 0);
  const totalEquity = byType("equity").reduce((s, a) => s + a.balance, 0);
  const totalRevenue = byType("revenue").reduce((s, a) => s + a.balance, 0);
  const totalExpense = byType("expense").reduce((s, a) => s + a.balance, 0);
  const netIncome = totalRevenue - totalExpense;

  return {
    accounts,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalRevenue,
    totalExpense,
    netIncome,
  };
}

export interface CustomerStatementRow {
  customerCode: string;
  customerName: string;
  projectStartDate: string;
  projectEndDate: string;
  invoiceNumber: string;
  proposalNumber: string;
  invoiceDate: string;
  valueExclVat: number;
  vat: number;
  total: number;
  allocatedAmount: number;
  allocationNumber: string;
  receiptDate: string;
  approvalDate: string;
  amountReceived: number;
  net: number;
}

export async function getCustomerStatement(customerId: string) {
  const companyId = await getActiveCompanyId();
  const [customer, taxInvoices, allPayments] = await Promise.all([
    db.customers.findOneAsync<Customer>(companyId, { _id: customerId }),
    db.invoices.findAsync<Invoice>(companyId, { customerId, docType: "tax", status: { $ne: "draft" } }).sort({ date: 1 }),
    db.payments.findAsync<Payment>(companyId, {}),
  ]);

  const rows: CustomerStatementRow[] = taxInvoices.map((inv) => {
    const payments = allPayments.filter((p) => p.invoiceId === inv._id).sort((a, b) => a.date.localeCompare(b.date));
    const amountReceived = payments.reduce((s, p) => s + p.amount, 0);
    const latestPayment = payments[payments.length - 1];

    return {
      customerCode: customer?.customerCode ?? "—",
      customerName: customer ? customerDisplayName(customer) : inv.customerName,
      projectStartDate: inv.projectStartDate || "—",
      projectEndDate: inv.projectEndDate || "—",
      invoiceNumber: inv.number,
      proposalNumber: inv.proposalNumber || "—",
      invoiceDate: inv.date,
      valueExclVat: inv.subtotal - (inv.discount ?? 0),
      vat: inv.tax,
      total: inv.total,
      allocatedAmount: amountReceived,
      allocationNumber: latestPayment?.allocationNumber || "—",
      receiptDate: latestPayment?.receiptDate || "—",
      approvalDate: latestPayment?.approvalDate || "—",
      amountReceived,
      net: inv.total - amountReceived,
    };
  });

  const closingBalance = rows.reduce((s, r) => s + r.net, 0);

  return { customer, rows, closingBalance };
}

export interface ArCustomerBalance {
  customerId: string;
  customerCode: string;
  customerName: string;
  outstanding: number;
}

export async function getArSummary() {
  const companyId = await getActiveCompanyId();
  const [customers, taxInvoices, notes, allPayments, arAccount] = await Promise.all([
    db.customers.findAsync<Customer>(companyId, {}),
    db.invoices.findAsync<Invoice>(companyId, { docType: "tax", status: { $ne: "draft" } }),
    db.invoices.findAsync<Invoice>(companyId, { docType: { $in: ["credit_note", "debit_note"] }, status: { $ne: "draft" } }),
    db.payments.findAsync<Payment>(companyId, {}),
    db.accounts.findOneAsync<Account>(companyId, { code: "1100" }),
  ]);

  const receivedByInvoice = new Map<string, number>();
  for (const p of allPayments) {
    receivedByInvoice.set(p.invoiceId, (receivedByInvoice.get(p.invoiceId) ?? 0) + p.amount);
  }

  const byCustomer = new Map<string, ArCustomerBalance>();
  const entryFor = (customerId: string, customerName: string) => {
    let entry = byCustomer.get(customerId);
    if (!entry) {
      const customer = customers.find((c) => c._id === customerId);
      entry = {
        customerId,
        customerCode: customer?.customerCode ?? "—",
        customerName: customer ? customerDisplayName(customer) : customerName,
        outstanding: 0,
      };
      byCustomer.set(customerId, entry);
    }
    return entry;
  };

  for (const inv of taxInvoices) {
    const received = receivedByInvoice.get(inv._id!) ?? 0;
    entryFor(inv.customerId, inv.customerName).outstanding += inv.total - received;
  }
  // Credit/debit notes adjust AR directly (they're never partially paid — recordPayment only
  // applies to tax invoices), matching how postCreditNote/postDebitNote post to account 1100.
  for (const note of notes) {
    const sign = note.docType === "credit_note" ? -1 : 1;
    entryFor(note.customerId, note.customerName).outstanding += sign * note.total;
  }

  const customerBalances = Array.from(byCustomer.values()).sort((a, b) => b.outstanding - a.outstanding);

  return { arBalance: arAccount?.balance ?? 0, customerBalances };
}

export interface MonthlyRevenuePoint {
  month: string;
  invoicedTotal: number;
  cashCollected: number;
}

export async function getRevenueTrend(): Promise<MonthlyRevenuePoint[]> {
  const companyId = await getActiveCompanyId();
  const [invoices, allPayments] = await Promise.all([
    db.invoices.findAsync<Invoice>(companyId, { docType: "tax", status: { $ne: "draft" } }),
    db.payments.findAsync<Payment>(companyId, {}),
  ]);

  const buckets = new Map<string, MonthlyRevenuePoint>();
  const bucket = (month: string) => {
    let point = buckets.get(month);
    if (!point) {
      point = { month, invoicedTotal: 0, cashCollected: 0 };
      buckets.set(month, point);
    }
    return point;
  };

  for (const inv of invoices) bucket(inv.date.slice(0, 7)).invoicedTotal += inv.subtotal;
  for (const p of allPayments) bucket(p.date.slice(0, 7)).cashCollected += p.amount;

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getVatReport(month: string) {
  const companyId = await getActiveCompanyId();
  const [docs, bills] = await Promise.all([
    db.invoices.findAsync<Invoice>(companyId, {
      docType: { $in: ["tax", "credit_note", "debit_note"] },
      status: { $ne: "draft" },
    }),
    db.bills.findAsync<Bill>(companyId, { status: { $ne: "draft" }, hasVat: true }),
  ]);

  const documents = docs.filter((d) => d.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const vatBills = bills.filter((b) => b.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));

  const sign = (d: Invoice) => (d.docType === "credit_note" ? -1 : 1);
  const totalSales = documents.reduce((sum, d) => sum + sign(d) * d.subtotal, 0);
  const outputVat = documents.reduce((sum, d) => sum + sign(d) * d.tax, 0);
  const inputVat = vatBills.reduce((sum, b) => sum + b.vat, 0);

  return { month, documents, vatBills, totalSales, outputVat, inputVat, netVatDue: outputVat - inputVat };
}
