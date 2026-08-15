"use client";

import { useState } from "react";
import { createAccount } from "@/lib/actions/accounting";
import { Field } from "@/components/ui";


export default function AccountCreateForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createAccount(formData);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create account:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
      >
        + New Account
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-stone-700">Create Account</h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xs text-stone-500 hover:text-stone-700"
        >
          Cancel
        </button>
      </div>

      <form action={handleSubmit} className="space-y-3">
        <Field
          label="Account Name"
          name="name"
          type="text"
          required
          placeholder="Enter account name"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Type</label>
            <select
              name="type"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select type</option>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Group</label>
            <select
              name="group"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Select group</option>
              <option value="general">General</option>
              <option value="ar">Accounts Receivable</option>
              <option value="ap_trade">Accounts Payable — Trade</option>
              <option value="ap_zakat">Accounts Payable — Zakat & Tax</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:bg-stone-300"
        >
          {isSubmitting ? "Creating..." : "Create Account"}
        </button>
      </form>
    </div>
  );
}