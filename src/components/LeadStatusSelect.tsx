"use client";

import { updateLeadStatus } from "@/lib/actions/crm";
import type { LeadStatus } from "@/types";
import { useTransition } from "react";

const options: LeadStatus[] = ["new", "qualified", "won", "lost"];

export default function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={pending}
      onChange={(e) => startTransition(() => updateLeadStatus(id, e.target.value as LeadStatus))}
      className="rounded-full border-0 bg-stone-100 px-2 py-1 text-xs font-medium capitalize"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
