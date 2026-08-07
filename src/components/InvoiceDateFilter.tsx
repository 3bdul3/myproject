"use client";

import { useState } from "react";

type DateMode = "any" | "on" | "range";

export default function InvoiceDateFilter({
  initialDateFrom,
  initialDateTo,
}: {
  initialDateFrom?: string;
  initialDateTo?: string;
}) {
  const initialMode: DateMode =
    initialDateFrom && initialDateTo && initialDateFrom === initialDateTo
      ? "on"
      : initialDateFrom || initialDateTo
        ? "range"
        : "any";

  const [mode, setMode] = useState<DateMode>(initialMode);
  const [singleDate, setSingleDate] = useState(initialMode === "on" ? initialDateFrom ?? "" : "");
  const [fromDate, setFromDate] = useState(initialMode === "range" ? initialDateFrom ?? "" : "");
  const [toDate, setToDate] = useState(initialMode === "range" ? initialDateTo ?? "" : "");

  const inputClass =
    "w-full rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const datePattern = "\\d{4}-\\d{2}-\\d{2}";

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-600">Date Filter</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as DateMode)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="any">Any date</option>
          <option value="on">On a specific date</option>
          <option value="range">Date range</option>
        </select>
      </div>

      {mode === "on" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Date</label>
          <input
            type="text"
            name="dateFrom"
            value={singleDate}
            onChange={(e) => setSingleDate(e.target.value)}
            placeholder="YYYY-MM-DD"
            pattern={datePattern}
            className={inputClass}
          />
          <input type="hidden" name="dateTo" value={singleDate} />
        </div>
      )}

      {mode === "range" && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">From Date</label>
            <input
              type="text"
              name="dateFrom"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              pattern={datePattern}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">To Date</label>
            <input
              type="text"
              name="dateTo"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              pattern={datePattern}
              className={inputClass}
            />
          </div>
        </>
      )}
    </div>
  );
}
