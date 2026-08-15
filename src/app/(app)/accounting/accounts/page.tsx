"use client";

import { useState, useEffect } from "react";
import { listAccounts } from "@/lib/actions/accounting";
import { PageHeader, Card, Badge } from "@/components/ui";
import AccountCreateForm from "@/components/AccountCreateForm";
import type { Account } from "@/types";

const typeTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  asset: "indigo",
  liability: "amber",
  equity: "slate",
  revenue: "green",
  expense: "red",
};

// Search and Filter Component
function AccountFilters({ 
  searchQuery, 
  setSearchQuery, 
  filters, 
  setFilters 
}: any) {
  return (
    <div className="mb-4 flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Search by name, code..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <select 
        value={filters.type}
        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">All Types</option>
        <option value="asset">Asset</option>
        <option value="liability">Liability</option>
        <option value="equity">Equity</option>
        <option value="revenue">Revenue</option>
        <option value="expense">Expense</option>
      </select>
      <select 
        value={filters.group}
        onChange={(e) => setFilters({ ...filters, group: e.target.value })}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">All Groups</option>
        <option value="general">General</option>
        <option value="ar">Accounts Receivable</option>
        <option value="ap_trade">Accounts Payable — Trade</option>
        <option value="ap_zakat">Accounts Payable — Zakat & Tax</option>
      </select>

    </div>
  );
}

// Simple Table View Component
function AccountTable({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-stone-400">No accounts found.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
        <tr>
          <th className="px-4 py-3">Code</th>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3 text-right">Balance</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((a) => (
          <tr key={a._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
            <td className="px-4 py-3 font-mono text-stone-500">{a.code}</td>
            <td className="px-4 py-3 font-medium text-stone-800">{a.nameEn || a.nameAr}</td>
            <td className="px-4 py-3">
              <Badge text={a.type} tone={typeTone[a.type]} />
            </td>
            <td className="px-4 py-3 text-right font-mono">{a.balance.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ type: "" });

  useEffect(() => {
    async function loadData() {
      const accountsData = await listAccounts();
      setAccounts(accountsData);
    }
    loadData();
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const accountName = account.nameEn || "";
    const matchesSearch = !searchQuery || 
      accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.code.includes(searchQuery);
    
    const matchesType = !filters.type || account.type === filters.type;
    
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <PageHeader title="Chart of Accounts" subtitle="Manage your financial accounts" />

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4">
          <h3 className="text-sm font-semibold text-stone-700">Accounts</h3>
          <AccountCreateForm />
        </div>

        <AccountFilters 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filters={filters}
          setFilters={setFilters}
        />

        <AccountTable accounts={filteredAccounts} />
      </Card>
    </div>
  );
}