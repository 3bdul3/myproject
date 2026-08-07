"use client";

import { useState } from "react";
import type { Product } from "@/types";

type Row = { productId: string; qty: number; price: number };

export default function ProductLineItemsInput({
  products,
  priceField,
}: {
  products: Product[];
  priceField: "salePrice" | "costPrice";
}) {
  const [rows, setRows] = useState<Row[]>([
    { productId: products[0]?._id ?? "", qty: 1, price: products[0]?.[priceField] ?? 0 },
  ]);

  const total = rows.reduce((s, r) => s + r.qty * r.price, 0);

  function update(index: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function serialized() {
    return rows.map((r) => {
      const product = products.find((p) => p._id === r.productId);
      return {
        productId: r.productId,
        productName: product?.name ?? "Unknown",
        qty: r.qty,
        [priceField === "salePrice" ? "price" : "cost"]: r.price,
      };
    });
  }

  return (
    <div>
      <input type="hidden" name="items" value={JSON.stringify(serialized())} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="min-w-0 space-y-1.5 rounded-lg border border-stone-200 p-2">
            <select
              className="w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm"
              value={row.productId}
              onChange={(e) => {
                const product = products.find((p) => p._id === e.target.value);
                update(i, { productId: e.target.value, price: product?.[priceField] ?? 0 });
              }}
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                type="number"
                min={1}
                className="w-full min-w-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                value={row.qty}
                onChange={(e) => update(i, { qty: Number(e.target.value) })}
              />
              <input
                type="number"
                step="0.01"
                className="w-full min-w-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
                value={row.price}
                onChange={(e) => update(i, { price: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                className="rounded-lg px-2 text-sm text-red-500 hover:bg-red-50"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((prev) => [
            ...prev,
            { productId: products[0]?._id ?? "", qty: 1, price: products[0]?.[priceField] ?? 0 },
          ])
        }
        className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-800"
      >
        + Add line
      </button>

      <div className="mt-4 flex justify-between border-t border-stone-200 pt-3 text-sm font-semibold text-stone-800">
        <span>Total</span>
        <span>{total.toFixed(2)}</span>
      </div>
    </div>
  );
}
