import { db } from "@/lib/db";
import type { InvoiceDocType } from "@/types";

export async function getNextDocNumber(docType: InvoiceDocType): Promise<string> {
  const count = await db.invoices.countAsync({ docType });
  const seq = String(count + 1).padStart(5, "0");
  switch (docType) {
    case "proforma":
      return `${seq}-01`;
    case "tax":
      return `TAX_INV_${seq}`;
    case "credit_note":
      return `CM_INV_${seq}`;
    case "debit_note":
      return `DM_INV_${seq}`;
  }
}

export function periodErrorMessage(dateStr: string): string | null {
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const targetKey = target.getFullYear() * 12 + target.getMonth();
  const nowKey = now.getFullYear() * 12 + now.getMonth();
  if (targetKey < nowKey) {
    return `The accounting period for ${dateStr.slice(0, 7)} is closed. Documents can no longer be created or posted with a date in a previous month.`;
  }
  return null;
}
