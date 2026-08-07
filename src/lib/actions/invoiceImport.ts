"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { TAX_RATE } from "@/lib/constants";
import { getNextDocNumber, periodErrorMessage } from "@/lib/invoiceNumbering";
import type { Customer, Invoice, InvoiceDocType, LineItem } from "@/types";

const SHEET_DOC_TYPE: Record<string, InvoiceDocType> = {
  "Tax Invoices": "tax",
  "Proforma Invoices": "proforma",
  "Credit Notes": "credit_note",
  "Debit Notes": "debit_note",
};

export async function importInvoicesFromExcel(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });

  for (const sheetName of workbook.SheetNames) {
    const docType = SHEET_DOC_TYPE[sheetName];
    if (!docType) continue;

    const rows: Record<string, string | number>[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
    });

    for (const row of rows) {
      const date = String(row.date || "").trim();
      const description = String(row.description || "").trim();
      const qty = Number(row.qty || 0);
      const price = Number(row.price || 0);
      if (!date || !description || !qty) continue;
      if (periodErrorMessage(date)) continue;

      let customerId = "";
      let customerName = "";
      let relatedInvoiceId: string | undefined;
      let relatedInvoiceNumber: string | undefined;

      if (docType === "credit_note" || docType === "debit_note") {
        const relatedNumber = String(row.relatedInvoiceNumber || "").trim();
        if (!relatedNumber) continue;
        const related = await db.invoices.findOneAsync<Invoice>({ number: relatedNumber, docType: "tax" });
        if (!related) continue;
        customerId = related.customerId;
        customerName = related.customerName;
        relatedInvoiceId = related._id;
        relatedInvoiceNumber = related.number;
      } else {
        const customerCode = String(row.customerCode || "").trim();
        if (!customerCode) continue;
        const customer = await db.customers.findOneAsync<Customer>({ customerCode });
        if (!customer) continue;
        customerId = customer._id!;
        customerName = customer.nameAr || customer.nameEn;
      }

      const items: LineItem[] = [{ description, qty, price }];
      const grossSubtotal = qty * price;
      const discount = docType === "tax" || docType === "proforma" ? Number(row.discount || 0) : 0;
      const taxable = grossSubtotal - discount;
      const tax = Math.round(taxable * TAX_RATE * 100) / 100;
      const total = taxable + tax;
      const dueDate = String(row.dueDate || "").trim() || date;
      const number = await getNextDocNumber(docType);

      await db.invoices.insertAsync<Invoice>({
        docType,
        number,
        customerId,
        customerName,
        date,
        dueDate,
        poNumber: String(row.poNumber || ""),
        items,
        discount,
        subtotal: grossSubtotal,
        tax,
        total,
        amountPaid: 0,
        status: "draft",
        relatedInvoiceId,
        relatedInvoiceNumber,
        createdAt: new Date().toISOString(),
      });
    }
  }

  revalidatePath("/accounting/invoices");
}
