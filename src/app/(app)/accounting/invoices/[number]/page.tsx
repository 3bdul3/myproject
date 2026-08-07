import Link from "next/link";
import { notFound } from "next/navigation";
import {
  convertProformaToTaxInvoice,
  getAdjacentInvoiceNumbers,
  getInvoiceByNumber,
  getInvoiceJournalEntries,
  listPayments,
  postCreditNote,
  postDebitNote,
  postInvoice,
  recordPayment,
} from "@/lib/actions/accounting";
import { getCustomer } from "@/lib/actions/crm";
import { getCompanySettings } from "@/lib/actions/settings";
import { getZatcaQrDataUrl } from "@/lib/zatca";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";
import InvoiceDocument from "@/components/InvoiceDocument";
import type { InvoiceDocType } from "@/types";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  draft: "slate",
  posted: "indigo",
  partial: "amber",
  paid: "green",
  void: "red",
  converted: "slate",
};

const DOC_LABELS: Record<InvoiceDocType, string> = {
  proforma: "Proforma Invoice",
  tax: "Tax Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { number } = await params;
  const { error } = await searchParams;
  const invoice = await getInvoiceByNumber(number);
  if (!invoice) notFound();

  const id = invoice._id!;

  const [payments, journalEntries, customer, company, { prevNumber, nextNumber }] = await Promise.all([
    listPayments(id),
    getInvoiceJournalEntries(id),
    getCustomer(invoice.customerId),
    getCompanySettings(),
    getAdjacentInvoiceNumbers(invoice.docType, invoice.number),
  ]);
  const boundRecordPayment = recordPayment.bind(null, id);

  const isFinalized = invoice.status !== "draft";
  const isTaxDocument = invoice.docType === "tax" || invoice.docType === "credit_note" || invoice.docType === "debit_note";

  const qrDataUrl =
    isTaxDocument && isFinalized
      ? await getZatcaQrDataUrl({
          sellerName: company.nameEn || company.nameAr,
          vatNumber: company.vatNumber,
          timestamp: new Date(invoice.date).toISOString(),
          total: invoice.total.toFixed(2),
          vatTotal: invoice.tax.toFixed(2),
        })
      : null;

  return (
    <div>
      <PageHeader
        title={`${DOC_LABELS[invoice.docType]} ${invoice.number}`}
        subtitle={invoice.relatedInvoiceNumber ? `Ref. ${invoice.relatedInvoiceNumber}` : undefined}
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Transactions", href: "/accounting/invoices" },
          { label: invoice.number },
        ]}
        action={
          <div className="flex items-center gap-3">
            <Link
              href={`/accounting/invoices/${invoice.number}/preview`}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
            >
              Preview &amp; Download PDF
            </Link>
            <Badge text={invoice.status} tone={statusTone[invoice.status]} />
          </div>
        }
      />

      <div className="mb-6 flex items-center justify-between text-sm">
        {prevNumber ? (
          <Link href={`/accounting/invoices/${prevNumber}`} className="font-medium text-brand-600 hover:underline">
            ← {prevNumber}
          </Link>
        ) : (
          <span />
        )}
        {nextNumber ? (
          <Link href={`/accounting/invoices/${nextNumber}`} className="font-medium text-brand-600 hover:underline">
            {nextNumber} →
          </Link>
        ) : (
          <span />
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-lg border border-stone-200 shadow-sm">
            <InvoiceDocument invoice={invoice} customer={customer} company={company} qrDataUrl={qrDataUrl} />
          </div>

          <Card>
            {invoice.docType === "proforma" && invoice.status === "draft" && (
              <form
                action={async () => {
                  "use server";
                  await convertProformaToTaxInvoice(id);
                }}
              >
                <SubmitButton label="Convert to Tax Invoice" />
              </form>
            )}

            {invoice.docType === "tax" && invoice.status === "draft" && (
              <form action={postInvoice.bind(null, id)} className="space-y-3">
                <Field
                  label="Journal Description"
                  name="memo"
                  placeholder="e.g. Tax invoice for stage 1 event production"
                  required
                />
                <SubmitButton label="Post Invoice to Ledger" />
              </form>
            )}

            {invoice.docType === "credit_note" && invoice.status === "draft" && (
              <form action={postCreditNote.bind(null, id)} className="space-y-3">
                <Field label="Journal Description" name="memo" placeholder="Reason for the credit note" required />
                <SubmitButton label="Post Credit Note to Ledger" />
              </form>
            )}

            {invoice.docType === "debit_note" && invoice.status === "draft" && (
              <form action={postDebitNote.bind(null, id)} className="space-y-3">
                <Field label="Journal Description" name="memo" placeholder="Reason for the debit note" required />
                <SubmitButton label="Post Debit Note to Ledger" />
              </form>
            )}

            {invoice.status !== "draft" && (
              <p className="text-sm text-stone-400">This document has already been posted to the ledger.</p>
            )}
          </Card>

          <Card className="bg-stone-50">
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Journal Vouchers (JV)</h3>
            {journalEntries.length === 0 ? (
              <p className="text-sm text-stone-400">Not posted to the ledger yet.</p>
            ) : (
              <div className="space-y-2">
                {journalEntries.map((e) => (
                  <Link
                    key={e._id}
                    href={`/accounting/journal-vouchers/${e._id}`}
                    className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm hover:border-brand-300"
                  >
                    <span>
                      <span className="font-mono font-medium text-stone-800">{e.number}</span>
                      <span className="ml-2 text-stone-500">{e.memo}</span>
                    </span>
                    <span className="text-xs text-stone-400">{e.date}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {invoice.docType === "tax" && (invoice.status === "posted" || invoice.status === "partial") && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Record Payment</h3>
              <form action={boundRecordPayment} className="space-y-3">
                <Field label="Amount" name="amount" type="number" step="0.01" required />
                <Field label="Date" name="date" type="date" required />
                <Select
                  label="Method"
                  name="method"
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "bank", label: "Bank Transfer" },
                    { value: "card", label: "Card" },
                  ]}
                />
                <Field label="Allocated Amount Ref. No." name="allocationNumber" placeholder="e.g. DP-0001" />
                <Field label="Receipt Date" name="receiptDate" type="date" />
                <Field label="Approval Date" name="approvalDate" type="date" />
                <SubmitButton label="Record Payment" />
              </form>
            </Card>
          )}

          {invoice.docType === "tax" && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Payment History</h3>
              {payments.length === 0 && <p className="text-sm text-stone-400">No payments recorded.</p>}
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p._id} className="flex justify-between text-sm">
                    <span className="text-stone-500">
                      {p.date} · {p.method}
                    </span>
                    <span className="font-mono font-medium">{p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {invoice.relatedInvoiceNumber && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Related Document</h3>
              <Link
                href={`/accounting/invoices/${invoice.relatedInvoiceNumber}`}
                className="text-sm text-brand-600 hover:underline"
              >
                {invoice.relatedInvoiceNumber}
              </Link>
            </Card>
          )}

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-stone-700">Customer</h3>
            <p className="text-sm text-stone-700">{invoice.customerName}</p>
            <Link
              href={`/sales/customers/${invoice.customerId}/statement`}
              className="mt-2 inline-block text-xs text-brand-600 hover:underline"
            >
              View account statement
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
