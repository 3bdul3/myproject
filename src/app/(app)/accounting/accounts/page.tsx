"use client";

import { useState, useEffect } from "react";
import { listAccounts, getAccountHierarchy, getAccountsSummary, searchAccounts } from "@/lib/actions/accounting";
import { PageHeader, Card, Badge } from "@/components/ui";
import AccountCreateForm from "@/components/AccountCreateForm";
import type { Account, AccountCategory, AccountPostingType, AccountStatus, AccountType, SubLedgerType } from "@/types";

const typeTone: Record<string, "green" | "red" | "indigo" | "amber" | "slate"> = {
  asset: "indigo",
  liability: "amber",
  equity: "slate",
  revenue: "green",
  expense: "red",
};

const postingTypeTone: Record<AccountPostingType, "blue" | "green" | "purple"> = {
  header: "blue",
  posting: "green",
  control: "purple",
};

const statusTone: Record<AccountStatus, "green" | "gray"> = {
  active: "green",
  inactive: "gray",
};

// Search and Filter Component
function AccountFilters({ 
  searchQuery, 
  setSearchQuery, 
  filters, 
  setFilters 
}: { 
  searchQuery: string; 
  setSearchQuery: (value: string) => void; 
  filters: { type: string; category: string; status: string }; 
  setFilters: (value: { type: string; category: string; status: string }) => void; 
}) {
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
        value={filters.category}
        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">All Categories</option>
        <option value="cash">Cash</option>
        <option value="fixed_assets">Fixed Assets</option>
        <option value="receivables">Receivables</option>
        <option value="payables">Payables</option>
        <option value="tax">Tax</option>
        <option value="revenue">Revenue</option>
        <option value="expenses">Expenses</option>
        <option value="equity">Equity</option>
      </select>
      <select 
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}

// Tree View Component
function AccountTree({ accounts, filteredAccounts, level = 0 }: { accounts: Account[]; filteredAccounts?: Account[]; level?: number }) {
  const displayAccounts = filteredAccounts || accounts;
  
  if (displayAccounts.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-stone-400">No accounts found.</p>;
  }

  return (
    <div className="space-y-1">
      {displayAccounts.map((account) => (
        <div key={account._id}>
          <div
            className="flex items-center gap-3 border-b border-stone-100 px-4 py-2 hover:bg-stone-50"
            style={{ paddingLeft: `${16 + level * 20}px` }}
          >
            <span className="font-mono text-sm text-stone-500">{account.code}</span>
            <span className="flex-1 font-medium text-stone-800">
              {account.nameEn} ({account.nameAr})
            </span>
            <Badge text={account.type} tone={typeTone[account.type]} />
            <Badge text={account.postingType} tone={postingTypeTone[account.postingType]} />
            {account.status === "inactive" && <Badge text="Inactive" tone="gray" />}
            <span className="font-mono text-sm text-stone-600">{account.balance.toFixed(2)}</span>
          </div>
          {account.children && account.children.length > 0 && (
            <AccountTree accounts={account.children} level={level + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

// Table View Component
function AccountTable({ accounts }: { accounts: Account[] }) {
  if (accounts.length === 0) {
    return <p className="px-4 py-6 text-center text-sm text-stone-400">No accounts found.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-400">
        <tr>
          <th className="px-4 py-3">Code</th>
          <th className="px-4 py-3">Name (EN/AR)</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Category</th>
          <th className="px-4 py-3">Posting Type</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 text-right">Balance</th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((a) => (
          <tr key={a._id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
            <td className="px-4 py-3 font-mono text-stone-500">{a.code}</td>
            <td className="px-4 py-3">
              <div className="font-medium text-stone-800">{a.nameEn}</div>
              <div className="text-xs text-stone-500">{a.nameAr}</div>
            </td>
            <td className="px-4 py-3">
              <Badge text={a.type} tone={typeTone[a.type]} />
            </td>
            <td className="px-4 py-3 text-xs text-stone-600 capitalize">{a.category.replace('_', ' ')}</td>
            <td className="px-4 py-3">
              <Badge text={a.postingType} tone={postingTypeTone[a.postingType]} />
            </td>
            <td className="px-4 py-3">
              <Badge text={a.status} tone={statusTone[a.status]} />
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
  const [hierarchy, setHierarchy] = useState<Account[]>([]);
  const [summary, setSummary] = useState({ totalAccounts: 0, activeAccounts: 0, inactiveAccounts: 0, headerAccounts: 0, controlAccounts: 0 });
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ type: "", category: "", status: "" });

  useEffect(() => {
    async function loadData() {
      const [accountsData, hierarchyData, summaryData] = await Promise.all([
        listAccounts(),
        getAccountHierarchy(),
        getAccountsSummary(),
      ]);
      setAccounts(accountsData);
      setHierarchy(hierarchyData);
      setSummary(summaryData);
    }
    loadData();
  }, []);

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = !searchQuery || 
      account.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.code.includes(searchQuery);
    
    const matchesType = !filters.type || account.type === filters.type;
    const matchesCategory = !filters.category || account.category === filters.category;
    const matchesStatus = !filters.status || account.status === filters.status;
    
    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  return (
    <div>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Hierarchical account structure with parent/sub-accounts, control accounts for sub-ledgers, and detailed categorization"
      />

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="p-4">
          <div className="text-2xl font-bold text-stone-800">{summary.totalAccounts}</div>
          <div className="text-xs text-stone-500">Total Accounts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{summary.activeAccounts}</div>
          <div className="text-xs text-stone-500">Active</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-stone-400">{summary.inactiveAccounts}</div>
          <div className="text-xs text-stone-500">Inactive</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-blue-600">{summary.headerAccounts}</div>
          <div className="text-xs text-stone-500">Header Accounts</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{summary.controlAccounts}</div>
          <div className="text-xs text-stone-500">Control Accounts</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-0">
            <div className="flex items-center justify-between border-b border-stone-200 p-4">
              <h3 className="text-sm font-semibold text-stone-700">Accounts</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("tree")}
                  className={`rounded px-3 py-1 text-xs ${viewMode === "tree" ? "bg-brand-500 text-white" : "bg-stone-100 text-stone-600"}`}
                >
                  Tree View
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`rounded px-3 py-1 text-xs ${viewMode === "table" ? "bg-brand-500 text-white" : "bg-stone-100 text-stone-600"}`}
                >
                  Table View
                </button>
              </div>
            </div>
            
            <AccountFilters 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filters={filters}
              setFilters={setFilters}
            />
            
            <div className="overflow-x-auto">
              {viewMode === "tree" ? (
                <AccountTree accounts={hierarchy} filteredAccounts={filteredAccounts} />
              ) : (
                <AccountTable accounts={filteredAccounts} />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <AccountCreateForm parentAccounts={accounts.filter(a => a.postingType === "header")} />
            <p className="mt-3 text-xs text-stone-400">
              Account codes are auto-generated based on type, category, and parent account. 
              Header accounts cannot have direct journal entries.
            </p>
          </Card>
          
          <Card className="p-4">
            <h4 className="mb-2 text-sm font-semibold text-stone-700">Account Structure</h4>
            <ul className="space-y-1 text-xs text-stone-600">
              <li>• <strong>Header Accounts:</strong> Parent accounts only (no direct entries)</li>
              <li>• <strong>Posting Accounts:</strong> Regular accounts for journal entries</li>
              <li>• <strong>Control Accounts:</strong> Summary for sub-ledgers (AR/AP)</li>
              <li>• <strong>Categories:</strong> Cash, Fixed Assets, Receivables, Payables, Tax, Revenue, Expenses, Equity</li>
              <li>• <strong>Sub-ledgers:</strong> General, Customer, Supplier</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
