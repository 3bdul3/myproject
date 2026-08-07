"use client";

import { useState } from "react";
import {
  createCreditNote,
  createDebitNote,
  createProformaInvoice,
  createTaxInvoice,
} from "@/lib/actions/accounting";
import { Field, Select, SubmitButton } from "@/components/ui";
import InvoiceItemsInput from "@/components/InvoiceItemsInput";
import type { Customer, Invoice, InvoiceDocType, Proposal } from "@/types";

const DOC_TYPES: Array<{ value: InvoiceDocType; label: string }> = [
  { value: "tax", label: "Tax Invoice" },
  { value: "proforma", label: "Proforma Invoice" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
];

const ACTIONS: Record<InvoiceDocType, (formData: FormData) => void> = {
  tax: createTaxInvoice,
  proforma: createProformaInvoice,
  credit_note: createCreditNote,
  debit_note: createDebitNote,
};

const SUBMIT_LABELS: Record<InvoiceDocType, string> = {
  tax: "Create Tax Invoice",
  proforma: "Create Proforma Invoice",
  credit_note: "Create Credit Note",
  debit_note: "Create Debit Note",
};

export default function InvoiceCreateForm({
  customers,
  signedProposals,
  postedTaxInvoices,
}: {
  customers: Customer[];
  signedProposals: Proposal[];
  postedTaxInvoices: Invoice[];
}) {
  const [docType, setDocType] = useState<InvoiceDocType>("tax");

  const customerOptions = customers.map((c) => ({
    value: c._id!,
    label: `${c.customerCode ?? "—"} — ${c.nameAr} / ${c.nameEn}`,
  }));

  return (
    <div>
      <div className="mb-6 max-w-xs">
        <label className="mb-1 block text-xs font-medium text-stone-600">Document Type</label>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as InvoiceDocType)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {docType === "tax" && signedProposals.length === 0 ? (
        <p className="text-sm text-stone-400">
          No signed proposals yet. A tax invoice can only be issued against a signed Proposal, once the
          customer&apos;s document checklist (CR/National ID, National Address, KYC, Service Contract) is complete —
          see Sales &gt; Proposals and the customer&apos;s Documents page.
        </p>
      ) : (docType === "credit_note" || docType === "debit_note") && postedTaxInvoices.length === 0 ? (
        <p className="text-sm text-stone-400">
          A credit/debit note must reference a posted tax invoice — create and post a tax invoice first.
        </p>
      ) : (
        <form key={docType} action={ACTIONS[docType]} className="space-y-4">
          {(docType === "proforma" || docType === "tax") && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select label="Customer" name="customerId" required options={customerOptions} />
                {docType === "tax" && (
                  <Select
                    label="Signed Proposal"
                    name="proposalId"
                    required
                    options={signedProposals.map((p) => ({
                      value: p._id!,
                      label: `${p.number} — ${p.customerName} (${p.amount.toFixed(2)})`,
                    }))}
                  />
                )}
                <Field label="Issue Date" name="date" type="date" required />
                <Field label="Due Date" name="dueDate" type="date" required />
                <Field label="Supply Date" name="supplyDate" type="date" />
                <Field label="Customer PO Number" name="poNumber" />
                <Field label="Project Duration" name="projectDuration" placeholder="e.g. 1 Jul – 31 Jul 2026" />
                {docType === "proforma" && (
                  <>
                    <Field label="Project Start Date" name="projectStartDate" type="date" />
                    <Field label="Project End Date" name="projectEndDate" type="date" />
                  </>
                )}
              </div>
              <InvoiceItemsInput showDiscount />
            </>
          )}

          {(docType === "credit_note" || docType === "debit_note") && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  label="Related Tax Invoice"
                  name="relatedInvoiceId"
                  required
                  options={postedTaxInvoices.map((inv) => ({
                    value: inv._id!,
                    label: `${inv.number} — ${inv.customerName} (${inv.total.toFixed(2)})`,
                  }))}
                />
                <Field label="Date" name="date" type="date" required />
              </div>
              <InvoiceItemsInput />
            </>
          )}

          <SubmitButton label={SUBMIT_LABELS[docType]} />
        </form>
      )}
    </div>
  );
}
