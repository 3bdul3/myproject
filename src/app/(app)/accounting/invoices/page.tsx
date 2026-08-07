import Link from "next/link";
import { convertProformaToTaxInvoice, searchInvoices } from "@/lib/actions/accounting";
import { importInvoicesFromExcel } from "@/lib/actions/invoiceImport";
import { PageHeader, Card, Badge, SubmitButton } from "@/components/ui";
import InvoiceDateFilter from "@/components/InvoiceDateFilter";
import type { InvoiceDocType } from "@/types";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  draft: "slate",
  posted: "indigo",
  partial: "amber",
  paid: "green",
  void: "red",
  converted: "slate",
};

const TABS: Array<{ type: InvoiceDocType; label: string }> = [
  { type: "tax", label: "Tax Invoices" },
  { type: "proforma", label: "Proforma Invoices" },
  { type: "credit_note", label: "Credit Notes" },
  { type: "debit_note", label: "Debit Notes" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    error?: string;
    number?: string;
    customerName?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const { type, error, number, customerName, dateFrom, dateTo } = await searchParams;
  const activeType: InvoiceDocType = (["tax", "proforma", "credit_note", "debit_note"] as string[]).includes(
    type ?? ""
  )
    ? (type as InvoiceDocType)
    : "tax";

  const documents = await searchInvoices(activeType, { number, customerName, dateFrom, dateTo });

  const exportParams = new URLSearchParams({ type: activeType });
  if (number) exportParams.set("number", number);
  if (customerName) exportParams.set("customerName", customerName);
  if (dateFrom) exportParams.set("dateFrom", dateFrom);
  if (dateTo) exportParams.set("dateTo", dateTo);

  return (
    <div>
      <PageHeader
        title="Transactions"
        subtitle="Proforma, tax invoices, credit and debit notes"
        action={
          <div className="flex items-center gap-3">
            <a
              href={`/api/invoices/export?${exportParams.toString()}`}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              Export to Excel
            </a>
            <Link
              href="/accounting/invoices/new"
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
            >
              + New Invoice
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="mb-6 flex gap-1 border-b border-stone-200">
        {TABS.map((tab) => (
          <Link
            key={tab.type}
            href={`/accounting/invoices?type=${tab.type}`}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeType === tab.type
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-0 overflow-x-auto lg:col-span-2">
          <table className="w-full text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                {(activeType === "credit_note" || activeType === "debit_note") && (
                  <th className="px-4 py-3">Ref. Invoice</th>
                )}
                <th className="px-4 py-3 text-right">Total</th>
                {activeType === "tax" && <th className="px-4 py-3 text-right">Paid</th>}
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link href={`/accounting/invoices/${doc.number}`} className="font-medium text-brand-600">
                      {doc.number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{doc.customerName}</td>
                  <td className="px-4 py-3 text-stone-500">{doc.date}</td>
                  {(activeType === "credit_note" || activeType === "debit_note") && (
                    <td className="px-4 py-3 text-stone-500">{doc.relatedInvoiceNumber}</td>
                  )}
                  <td className="px-4 py-3 text-right font-mono">{doc.total.toFixed(2)}</td>
                  {activeType === "tax" && (
                    <td className="px-4 py-3 text-right font-mono">{doc.amountPaid.toFixed(2)}</td>
                  )}
                  <td className="px-4 py-3">
                    <Badge text={doc.status} tone={statusTone[doc.status]} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {activeType === "proforma" && doc.status === "draft" && (
                      <form
                        action={async () => {
                          "use server";
                          await convertProformaToTaxInvoice(doc._id!);
                        }}
                      >
                        <button className="text-xs font-medium text-brand-600 hover:underline">
                          Convert to Tax Invoice
                        </button>
                      </form>
                    )}
                    {(activeType === "credit_note" || activeType === "debit_note") && doc.status === "draft" && (
                      <Link href={`/accounting/invoices/${doc.number}`} className="text-xs font-medium text-brand-600 hover:underline">
                        Post…
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {documents.length === 0 && (
                <tr>
                  <td
                    colSpan={
                      5 + (activeType === "credit_note" || activeType === "debit_note" ? 1 : 0) + (activeType === "tax" ? 1 : 0)
                    }
                    className="px-4 py-8 text-center text-stone-400"
                  >
                    No documents match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          <Card>
            <form method="get" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="type" value={activeType} />
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Invoice Number</label>
                <input
                  type="text"
                  name="number"
                  defaultValue={number}
                  placeholder="e.g. TAX_INV_00001"
                  className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">Customer Name</label>
                <input
                  type="text"
                  name="customerName"
                  defaultValue={customerName}
                  placeholder="e.g. Ahmed"
                  className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <InvoiceDateFilter initialDateFrom={dateFrom} initialDateTo={dateTo} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
                >
                  Search
                </button>
                {(number || customerName || dateFrom || dateTo) && (
                  <Link
                    href={`/accounting/invoices?type=${activeType}`}
                    className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
                  >
                    Clear
                  </Link>
                )}
              </div>
            </form>
          </Card>

          <Card>
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-brand-600">
                + Import Transactions from Excel
              </summary>
              <div className="mt-4 space-y-3">
                <p className="text-sm text-stone-500">
                  Bulk-create Tax Invoices, Proforma Invoices, Credit Notes, and Debit Notes from one Excel file (one
                  sheet per type). Document numbers are assigned automatically — the template shows a live preview
                  as you fill in a row. Credit/Debit Notes reference the related Tax Invoice number instead of a
                  customer. Each imported document has a single combined line item and is created as a draft — post
                  it manually from its detail page, same as documents created one at a time.
                </p>
                <a
                  href="/api/invoices/excel-template"
                  className="inline-block text-xs font-medium text-brand-600 hover:underline"
                >
                  Download Excel template
                </a>
                <form action={importInvoicesFromExcel} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-stone-600">Excel File</label>
                    <input
                      type="file"
                      name="file"
                      accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      required
                      className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-stone-700 hover:file:bg-stone-200"
                    />
                  </div>
                  <SubmitButton label="Import" />
                </form>
              </div>
            </details>
          </Card>
        </div>
      </div>
    </div>
  );
}
