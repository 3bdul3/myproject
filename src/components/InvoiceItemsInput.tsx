"use client";

import { useState } from "react";
import type { LineItem } from "@/types";

export default function InvoiceItemsInput({ showDiscount = false }: { showDiscount?: boolean }) {
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, price: 0 }]);
  const [discount, setDiscount] = useState(0);

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxable * 0.15 * 100) / 100;
  const total = taxable + tax;

  function update(index: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  return (
    <div>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input
              className="col-span-6 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              placeholder="Description"
              value={item.description}
              onChange={(e) => update(i, { description: e.target.value })}
            />
            <input
              type="number"
              min={1}
              className="col-span-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              placeholder="Qty"
              value={item.qty}
              onChange={(e) => update(i, { qty: Number(e.target.value) })}
            />
            <input
              type="number"
              step="0.01"
              className="col-span-3 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              placeholder="Price"
              value={item.price}
              onChange={(e) => update(i, { price: Number(e.target.value) })}
            />
            <button
              type="button"
              onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
              className="col-span-1 rounded-lg text-sm text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, { description: "", qty: 1, price: 0 }])}
        className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-800"
      >
        + Add line
      </button>

      <div className="mt-4 space-y-2 border-t border-stone-200 pt-3 text-sm">
        {showDiscount && (
          <div className="flex items-center justify-between">
            <label className="text-stone-500">Discount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              name="discount"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-28 rounded-lg border border-stone-300 px-2 py-1 text-right text-sm"
            />
          </div>
        )}
        <div className="flex justify-between text-stone-500">
          <span>Subtotal</span>
          <span>{subtotal.toFixed(2)}</span>
        </div>
        {showDiscount && discount > 0 && (
          <div className="flex justify-between text-stone-500">
            <span>Taxable Amount (after discount)</span>
            <span>{taxable.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-stone-500">
          <span>Tax (15%)</span>
          <span>{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-semibold text-stone-800">
          <span>Total</span>
          <span>{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
