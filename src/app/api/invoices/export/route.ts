import * as XLSX from "xlsx";
import { searchInvoices } from "@/lib/actions/accounting";
import type { InvoiceDocType } from "@/types";

const DOC_TYPES: InvoiceDocType[] = ["tax", "proforma", "credit_note", "debit_note"];
const SHEET_NAMES: Record<InvoiceDocType, string> = {
  tax: "Tax Invoices",
  proforma: "Proforma Invoices",
  credit_note: "Credit Notes",
  debit_note: "Debit Notes",
};

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const typeParam = searchParams.get("type") ?? "tax";
  const docType: InvoiceDocType = DOC_TYPES.includes(typeParam as InvoiceDocType)
    ? (typeParam as InvoiceDocType)
    : "tax";

  const documents = await searchInvoices(docType, {
    number: searchParams.get("number") ?? undefined,
    customerName: searchParams.get("customerName") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  });

  const rows = documents.map((doc) => ({
    Number: doc.number,
    Customer: doc.customerName,
    Date: doc.date,
    "Due Date": doc.dueDate,
    "Related Invoice": doc.relatedInvoiceNumber ?? "",
    "PO Number": doc.poNumber ?? "",
    Subtotal: doc.subtotal,
    Tax: doc.tax,
    Total: doc.total,
    Paid: doc.amountPaid,
    Balance: doc.total - doc.amountPaid,
    Status: doc.status,
    Link: `${origin}/accounting/invoices/${doc.number}/preview`,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  if (rows.length > 0) {
    const linkColIndex = Object.keys(rows[0]).indexOf("Link");
    documents.forEach((doc, rowIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIdx + 1, c: linkColIndex });
      const cell = worksheet[cellRef];
      if (cell) {
        cell.l = { Target: `${origin}/accounting/invoices/${doc.number}/preview` };
      }
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAMES[docType]);

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${docType}-invoices.xlsx"`,
    },
  });
}
