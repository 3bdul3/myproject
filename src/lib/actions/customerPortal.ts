"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCustomerAuth } from "@/lib/customerAuth";
import { customerDisplayName } from "@/lib/customer";
import type { Customer, CustomerDocuments, Invoice, Payment } from "@/types";
import type { CustomerStatementRow } from "@/lib/actions/accounting";

export async function getMyInvoices() {
  const { customerId, companyId } = await requireCustomerAuth();
  return db.invoices
    .findAsync<Invoice>(companyId, { customerId, docType: "tax", status: { $ne: "draft" } })
    .sort({ date: -1 });
}

export async function getMyStatement() {
  const { customerId, companyId } = await requireCustomerAuth();
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

export async function getMyCustomerDocuments() {
  const { customerId, companyId } = await requireCustomerAuth();
  const existing = await db.customerDocuments.findOneAsync<CustomerDocuments>(companyId, { customerId });
  if (existing) return existing;
  return { customerId, createdAt: new Date().toISOString() } as CustomerDocuments;
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function uploadMyCustomerDocuments(formData: FormData) {
  const { customerId, companyId } = await requireCustomerAuth();
  const existing = await db.customerDocuments.findOneAsync<CustomerDocuments>(companyId, { customerId });

  const patch: Partial<CustomerDocuments> = {};

  const crFile = formData.get("crOrNationalIdFile");
  if (crFile instanceof File && crFile.size > 0) patch.crOrNationalIdFileDataUrl = await fileToDataUrl(crFile);

  const taxFile = formData.get("taxCertificateFile");
  if (taxFile instanceof File && taxFile.size > 0) patch.taxCertificateFileDataUrl = await fileToDataUrl(taxFile);

  const kycFile = formData.get("kycFile");
  if (kycFile instanceof File && kycFile.size > 0) patch.kycFileDataUrl = await fileToDataUrl(kycFile);

  if (existing) {
    await db.customerDocuments.updateAsync(companyId, { _id: existing._id }, { $set: patch });
  } else {
    await db.customerDocuments.insertAsync<CustomerDocuments>(companyId, {
      customerId,
      ...patch,
      createdAt: new Date().toISOString(),
    });
  }

  revalidatePath("/customer/documents");
}
