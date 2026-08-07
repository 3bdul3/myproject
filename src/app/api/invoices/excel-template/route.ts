import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import type { InvoiceDocType } from "@/types";

const PREFILLED_ROWS = 300;

const INVOICE_HEADERS = [
  "invoiceNumber (auto)",
  "customerCode",
  "date",
  "dueDate",
  "poNumber",
  "description",
  "qty",
  "price",
  "discount",
];
const INVOICE_EXAMPLE = [
  "",
  "CUST-00001",
  "2026-07-16",
  "2026-08-15",
  "",
  "Event staging & production (EXAMPLE - delete this row)",
  1,
  15000,
  0,
];
const INVOICE_DATA_END_COL = "I";

const NOTE_HEADERS = ["noteNumber (auto)", "relatedInvoiceNumber", "date", "description", "qty", "price"];
const NOTE_EXAMPLE = [
  "",
  "TAX_INV_00001",
  "2026-07-16",
  "Price adjustment (EXAMPLE - delete this row)",
  1,
  500,
];
const NOTE_DATA_END_COL = "F";

function buildSheet(
  headers: string[],
  exampleRow: (string | number)[],
  dataEndCol: string,
  numberFormula: (row: number) => string
) {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  for (let i = 0; i < PREFILLED_ROWS; i++) {
    const row = i + 2;
    worksheet[`A${row}`] = { t: "str", v: "", f: numberFormula(row) };
  }

  const range = XLSX.utils.decode_range(worksheet["!ref"] || `A1:${dataEndCol}2`);
  range.e.r = Math.max(range.e.r, PREFILLED_ROWS + 1);
  worksheet["!ref"] = XLSX.utils.encode_range(range);
  worksheet["!cols"] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));

  return worksheet;
}

export async function GET() {
  const [taxCount, proformaCount, creditCount, debitCount] = await Promise.all(
    (["tax", "proforma", "credit_note", "debit_note"] as InvoiceDocType[]).map((docType) =>
      db.invoices.countAsync({ docType })
    )
  );

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(
      INVOICE_HEADERS,
      INVOICE_EXAMPLE,
      INVOICE_DATA_END_COL,
      (row) => `IF(COUNTA(B${row}:${INVOICE_DATA_END_COL}${row})>0,"TAX_INV_"&TEXT(${taxCount}+${row}-1,"00000"),"")`
    ),
    "Tax Invoices"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(
      INVOICE_HEADERS,
      INVOICE_EXAMPLE,
      INVOICE_DATA_END_COL,
      (row) =>
        `IF(COUNTA(B${row}:${INVOICE_DATA_END_COL}${row})>0,TEXT(${proformaCount}+${row}-1,"00000")&"-01","")`
    ),
    "Proforma Invoices"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(
      NOTE_HEADERS,
      NOTE_EXAMPLE,
      NOTE_DATA_END_COL,
      (row) => `IF(COUNTA(B${row}:${NOTE_DATA_END_COL}${row})>0,"CM_INV_"&TEXT(${creditCount}+${row}-1,"00000"),"")`
    ),
    "Credit Notes"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    buildSheet(
      NOTE_HEADERS,
      NOTE_EXAMPLE,
      NOTE_DATA_END_COL,
      (row) => `IF(COUNTA(B${row}:${NOTE_DATA_END_COL}${row})>0,"DM_INV_"&TEXT(${debitCount}+${row}-1,"00000"),"")`
    ),
    "Debit Notes"
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="invoices_template.xlsx"',
    },
  });
}
