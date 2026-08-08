"use client";

import { useState } from "react";
import Link from "next/link";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/types";

export interface LiveAlert {
  title: string;
  detail: string;
  href: string;
  severity: "high" | "medium";
}

export default function NotificationBell({
  notifications,
  unreadCount,
  liveAlerts = [],
}: {
  notifications: Notification[];
  unreadCount: number;
  liveAlerts?: LiveAlert[];
}) {
  const [open, setOpen] = useState(false);
  const totalCount = unreadCount + liveAlerts.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-lg border border-stone-200 p-2 hover:bg-stone-50"
      >
        <span aria-hidden className="block text-base leading-none">
          🔔
        </span>
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-lg border border-stone-200 bg-white shadow-lg">
            {liveAlerts.length > 0 && (
              <div className="border-b border-stone-100 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">Needs Attention</p>
                <div className="space-y-2">
                  {liveAlerts.map((a, i) => (
                    <Link
                      key={i}
                      href={a.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50"
                    >
                      <p className={`font-medium ${a.severity === "high" ? "text-red-600" : "text-amber-600"}`}>
                        {a.title}
                      </p>
                      <p className="text-xs text-stone-500">{a.detail}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Notifications</p>
              {unreadCount > 0 && (
                <form action={markAllNotificationsRead}>
                  <button className="text-xs font-medium text-brand-600 hover:underline">Mark all read</button>
                </form>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-stone-400">No notifications yet.</p>
            ) : (
              <div className="pb-2">
                {notifications.map((n) => {
                  const content = (
                    <>
                      <p className={`text-sm ${n.read ? "text-stone-600" : "font-semibold text-stone-800"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-stone-500">{n.body}</p>
                    </>
                  );
                  const rowClass = `block w-full px-3 py-2 text-left hover:bg-stone-50 ${!n.read ? "bg-brand-50/40" : ""}`;
                  const handleClick = () => {
                    if (!n.read) markNotificationRead(n._id!);
                    setOpen(false);
                  };
                  return n.href ? (
                    <Link key={n._id} href={n.href} onClick={handleClick} className={rowClass}>
                      {content}
                    </Link>
                  ) : (
                    <button key={n._id} type="button" onClick={handleClick} className={rowClass}>
                      {content}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
