"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FeedbackToastCard } from "@/components/FeedbackToastCard";
import { fetchMyReferralRequests, fetchMyReferrerProfile, fetchMySentReferralRequests } from "@/lib/companyReferrers";
import {
  REFERRAL_INBOX_POLL_MS,
  isReferralInboxOpen,
  loadNoticeState,
  notificationFeed,
  outcomeToastForUnseen,
  pendingProductNotice,
  persistDismissedNotice,
  persistLastSeenReferral,
  persistLastSeenSentReferral,
  publishNotificationFeed,
  publishReferralAlerts,
  readLastSeenReferralAt,
  readLastSeenSentReferralAt,
  readToastedReferralIds,
  readToastedSentReferralIds,
  referralToastForUnread,
  rememberToastedReferralIds,
  rememberToastedSentReferralIds,
  requestReferralInboxRefresh,
  requestSentReferralRefresh,
  subscribeReferralAlerts,
  subscribeSentReferralSeen,
  unreadReferralRequests,
  unseenReferralOutcomes,
  type ProductNotice,
} from "@/lib/productNotices";
import { getSupabaseClient } from "@/lib/supabase";

type ToastCopy = { title: string; description: string };

/**
 * Shell-level notices. What's new stays until dismissed. A referral toast
 * auto-hides; the Referrals tab keeps the unread count until the inbox opens.
 */
export function ProductNoticesHost() {
  const router = useRouter();
  const [notice, setNotice] = useState<ProductNotice | null>(null);
  const [toast, setToast] = useState<ToastCopy | null>(null);
  const [outcome, setOutcome] = useState<ToastCopy | null>(null);
  const [inboxUnread, setInboxUnread] = useState(0);
  const [outcomeUnread, setOutcomeUnread] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!outcome) return;
    const timer = window.setTimeout(() => setOutcome(null), 6000);
    return () => window.clearTimeout(timer);
  }, [outcome]);

  useEffect(() => subscribeReferralAlerts((snap) => {
    if (snap.unread === 0) {
      setToast(null);
      setInboxUnread(0);
    }
  }), []);

  useEffect(() => subscribeSentReferralSeen(() => {
    setOutcome(null);
    setOutcomeUnread(0);
  }), []);

  useEffect(() => {
    publishNotificationFeed(notificationFeed({ notice, inboxUnread, outcomeUnread }));
  }, [notice, inboxUnread, outcomeUnread]);

  useEffect(() => () => {
    publishNotificationFeed(notificationFeed({ notice: null, inboxUnread: 0, outcomeUnread: 0 }));
  }, []);

  useEffect(() => {
    const onDismiss = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      setNotice((current) => (current?.id === id ? null : current));
    };
    window.addEventListener("rn:dismiss-notice", onDismiss);
    return () => window.removeEventListener("rn:dismiss-notice", onDismiss);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let poll: number | undefined;
    const channels: Array<{ unsubscribe?: () => void }> = [];
    const supabase = getSupabaseClient();

    const stopWatch = () => {
      if (poll) window.clearInterval(poll);
      poll = undefined;
      while (channels.length) {
        const channel = channels.pop();
        if (channel) void supabase.removeChannel(channel as never);
      }
    };

    const start = async () => {
      const gen = ++generation;
      stopWatch();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId || cancelled || gen !== generation) return;
      const state = await loadNoticeState();
      if (cancelled || gen !== generation) return;
      setNotice(pendingProductNotice(state.dismissedIds));

      const profile = await fetchMyReferrerProfile();
      if (cancelled || gen !== generation) return;

      const refreshSent = async () => {
        const rows = await fetchMySentReferralRequests();
        if (cancelled || gen !== generation || rows === null) return;
        const lastSeen = readLastSeenSentReferralAt();
        if (!lastSeen) {
          setOutcomeUnread(0);
          void persistLastSeenSentReferral();
          return;
        }
        const unseen = unseenReferralOutcomes(rows, lastSeen);
        // Never suppress candidate outcome toasts when the referrer inbox is
        // open. That shared flag used to hide "reviewing" updates for askers.
        const decision = outcomeToastForUnseen(unseen, readToastedSentReferralIds(), false);
        setOutcomeUnread(decision.markSeen ? 0 : unseen.length);
        if (decision.markSeen) {
          void persistLastSeenSentReferral();
          setOutcome(null);
          requestSentReferralRefresh();
          return;
        }
        if (unseen.length > 0) requestSentReferralRefresh();
        if (!decision.toast || decision.newlyToasted.length === 0) return;
        rememberToastedSentReferralIds(decision.newlyToasted);
        setOutcome(decision.toast);
      };

      const refreshInbox = async () => {
        if (!profile) {
          setInboxUnread(0);
          publishReferralAlerts({ unread: 0, company: "" });
          return;
        }
        const rows = await fetchMyReferralRequests(profile.id);
        if (cancelled || gen !== generation || rows === null) return;
        const lastSeen = readLastSeenReferralAt() ?? state.lastSeenReferralAt;
        const unread = unreadReferralRequests(rows, lastSeen);
        const decision = referralToastForUnread(
          unread,
          readToastedReferralIds(),
          profile.company,
          isReferralInboxOpen(),
          lastSeen,
        );
        const unreadCount = decision.markSeen ? 0 : unread.length;
        setInboxUnread(unreadCount);
        publishReferralAlerts({
          unread: unreadCount,
          company: profile.company,
        });
        if (decision.markSeen) {
          void persistLastSeenReferral();
          requestReferralInboxRefresh();
          setToast(null);
          return;
        }
        if (!decision.toast || decision.newlyToasted.length === 0) return;
        rememberToastedReferralIds(decision.newlyToasted);
        setToast(decision.toast);
      };

      await refreshSent();
      await refreshInbox();
      if (cancelled || gen !== generation) return;

      const sentChannel = supabase.channel(`sent-referrals-${userId}`);
      sentChannel.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "company_referral_requests",
          filter: `candidate_user_id=eq.${userId}`,
        },
        () => {
          void refreshSent();
        },
      );
      sentChannel.subscribe();
      channels.push(sentChannel);

      if (profile) {
        const inboxChannel = supabase.channel(`referral-inbox-${profile.id}`);
        inboxChannel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "company_referral_requests",
            filter: `referrer_id=eq.${profile.id}`,
          },
          () => {
            void refreshInbox();
          },
        );
        inboxChannel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "company_referral_requests",
            filter: `referrer_id=eq.${profile.id}`,
          },
          () => {
            void refreshInbox();
          },
        );
        inboxChannel.subscribe();
        channels.push(inboxChannel);
      }

      poll = window.setInterval(() => {
        void refreshSent();
        void refreshInbox();
      }, REFERRAL_INBOX_POLL_MS);
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) void start();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === "SIGNED_OUT") {
        stopWatch();
        setNotice(null);
        setToast(null);
        setOutcome(null);
        setInboxUnread(0);
        setOutcomeUnread(0);
        publishReferralAlerts({ unread: 0, company: "" });
        return;
      }
      if (event === "SIGNED_IN") void start();
    });

    return () => {
      cancelled = true;
      stopWatch();
      subscription.unsubscribe();
    };
  }, []);

  if (!notice && !toast && !outcome) return null;

  const dismissNotice = () => {
    if (!notice) return;
    const id = notice.id;
    setNotice(null);
    void persistDismissedNotice(id);
  };

  return (
    <div className="fixed bottom-20 right-4 z-[80] flex w-[min(22.5rem,calc(100vw-2rem))] flex-col-reverse gap-3 md:bottom-6 md:right-6">
      {outcome ? (
        <FeedbackToastCard
          embedded
          variant="info"
          title={outcome.title}
          description={outcome.description}
          onDismiss={() => setOutcome(null)}
          primaryAction={{
            label: "View requests",
            onClick: () => {
              setOutcome(null);
              router.push("/profile?tab=referrals");
            },
          }}
        />
      ) : null}
      {toast ? (
        <FeedbackToastCard
          embedded
          variant="info"
          title={toast.title}
          description={toast.description}
          onDismiss={() => setToast(null)}
          primaryAction={{
            label: "Open inbox",
            onClick: () => {
              setToast(null);
              router.push("/profile?tab=referrals");
            },
          }}
        />
      ) : null}
      {notice ? (
        <FeedbackToastCard
          embedded
          variant="info"
          title={notice.title}
          description={notice.body}
          onDismiss={dismissNotice}
          secondaryAction={{ label: "Dismiss", onClick: dismissNotice }}
          primaryAction={{
            label: notice.cta,
            onClick: () => {
              const href = notice.href;
              dismissNotice();
              router.push(href);
            },
          }}
        />
      ) : null}
    </div>
  );
}
