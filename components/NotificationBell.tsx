"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { persistDismissedNotice, subscribeNotificationFeed, REFERRAL_ITEM_PREFIX, type AppNotification } from "@/lib/productNotices";

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.2 1.2 5.8 1.8 6.4H4.7c.6-.6 1.8-2.2 1.8-6.4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

/** Top-of-app notification icon. Parent renders this only for a signed-in user. */
export function NotificationBell() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => subscribeNotificationFeed((feed) => {
    setItems(feed.items);
    setCount(feed.count);
  }), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (item: AppNotification) => {
    setOpen(false);
    // Referral rows are transient — they clear when the inbox is opened, not
    // by dismissal. ⚠️ This was an equality check against two fixed ids; the
    // per-row ids would have fallen through it and written every referral
    // into the user's dismissed_notices jsonb permanently.
    if (!item.id.startsWith(REFERRAL_ITEM_PREFIX)) {
      void persistDismissedNotice(item.id);
      window.dispatchEvent(new CustomEvent("rn:dismiss-notice", { detail: item.id }));
    }
    router.push(item.href);
  };

  const label = count > 0 ? `Notifications, ${count} new` : "Notifications";
  const badge = count > 99 ? "99+" : String(count);

  return (
    <div ref={rootRef} className="fixed top-3 right-3 z-[70] md:top-4 md:right-5">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex size-11 items-center justify-center rounded-full border border-black/10 bg-card text-foreground shadow-[var(--md-elevation-2)]"
      >
        <BellIcon />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold leading-none text-white"
          >
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute top-12 right-0 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-black/10 bg-card text-card-foreground shadow-[var(--md-elevation-4)]"
        >
          <div className="border-b border-border/70 px-3 py-2 text-[13px] font-semibold">Notifications</div>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-[13px] text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openItem(item)}
                    className="block w-full px-3 py-3 text-left hover:bg-muted/60"
                  >
                    <span className="block text-[14px] font-semibold">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">{item.body}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
