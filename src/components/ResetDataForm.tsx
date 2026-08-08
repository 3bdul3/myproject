"use client";

import { useActionState } from "react";
import { resetTransactionalData } from "@/lib/actions/dataCleanup";

export default function ResetDataForm() {
  const [state, formAction, pending] = useActionState(resetTransactionalData, undefined);

  if (state?.success) {
    return (
      <p className="text-sm text-emerald-700">
        Done — all invoices, customers, suppliers, and related data have been cleared, and account balances reset
        to zero.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-stone-500">
        Permanently deletes every invoice, customer, supplier, purchase order, bill, and their related
        payments/documents across all companies, and resets every account balance to zero. Users, warehouses,
        products, employees, and everything else stay untouched. This cannot be undone — take a backup above
        first if you haven&apos;t already.
      </p>
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">
          Type <span className="font-mono font-semibold">DELETE</span> to confirm
        </label>
        <input
          name="confirmation"
          required
          autoComplete="off"
          className="w-full max-w-xs rounded-lg border border-red-300 px-3 py-1.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting..." : "Permanently Delete"}
      </button>
    </form>
  );
}
