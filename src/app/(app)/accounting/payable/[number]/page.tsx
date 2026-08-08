import Link from "next/link";
import { notFound } from "next/navigation";
import { getBillByNumber, getBillJournalEntries, listSupplierPayments, postBill, recordSupplierPayment } from "@/lib/actions/ap";
import { getApprovalRequestFor } from "@/lib/actions/approvals";
import { PageHeader, Card, Field, Select, SubmitButton, Badge } from "@/components/ui";

const statusTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  draft: "slate",
  posted: "indigo",
  partial: "amber",
  paid: "green",
};

export default async function BillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ number: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { number } = await params;
  const { error } = await searchParams;
  const bill = await getBillByNumber(number);
  if (!bill) notFound();

  const id = bill._id!;
  const [journalEntries, payments, approval] = await Promise.all([
    getBillJournalEntries(id),
    listSupplierPayments(id),
    bill.status === "draft" ? getApprovalRequestFor("bill", id) : null,
  ]);
  const boundRecordPayment = recordSupplierPayment.bind(null, id);
  const needsApproval = approval && approval.status !== "approved";

  return (
    <div>
      <PageHeader
        title={`Bill ${bill.number}`}
        subtitle={`${bill.supplierName} · Supplier Invoice ${bill.supplierInvoiceNumber || "—"}${bill.purchaseOrderNumber ? ` · Ref. ${bill.purchaseOrderNumber}` : ""}`}
        breadcrumb={[
          { label: "Home", href: "/dashboard" },
          { label: "Accounts Payable", href: "/accounting/payable" },
          { label: bill.number },
        ]}
        action={
          <div className="flex items-center gap-3">
            <a
              href={`/api/supplier-bills/${bill.number}/pdf`}
              className="text-xs font-medium text-brand-600 hover:underline"
            >
              PDF
            </a>
            <Badge text={bill.status} tone={statusTone[bill.status]} />
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {needsApproval && approval && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                approval.status === "rejected"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <p className="font-medium">
                {approval.status === "rejected" ? "Approval rejected" : "Pending admin/accountant approval"}
              </p>
              {approval.note && <p className="mt-1 text-xs">{approval.note}</p>}
            </div>
          )}

          <Card>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Bill Date</p>
                <p className="text-stone-700">{bill.date}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Due Date</p>
                <p className="text-stone-700">{bill.dueDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">VAT Registered Supplier</p>
                <p className="text-stone-700">{bill.hasVat ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Purchase Order</p>
                <p className="text-stone-700">{bill.purchaseOrderNumber || "—"}</p>
              </div>
            </div>

            <div className="ml-auto mt-4 w-64 space-y-1 text-sm">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="font-mono">{bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Input VAT</span>
                <span className="font-mono">{bill.vat.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-800">
                <span>Total</span>
                <span className="font-mono">{bill.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Paid</span>
                <span className="font-mono">{bill.amountPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-800">
                <span>Balance</span>
                <span className="font-mono">{(bill.total - bill.amountPaid).toFixed(2)}</span>
              </div>
            </div>
          </Card>

          <Card>
            {bill.status === "draft" ? (
              <form action={postBill.bind(null, id)} className="space-y-3">
                <Field
                  label="Journal Description"
                  name="memo"
                  placeholder="e.g. Supplier bill for stage lighting rental"
                  required
                />
                <SubmitButton label="Post Bill to Ledger" />
              </form>
            ) : (
              <p className="text-sm text-stone-400">This bill has already been posted to the ledger.</p>
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
          {(bill.status === "posted" || bill.status === "partial") && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-stone-700">Record Payment to Supplier</h3>
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
                <SubmitButton label="Record Payment" />
              </form>
            </Card>
          )}

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
        </div>
      </div>
    </div>
  );
}
