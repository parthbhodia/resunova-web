"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import AdminAnalyticsPanel from "@/components/AdminAnalyticsPanel";

export default function AdminAnalyticsPage() {
  const [ready, setReady] = useState(false);

  // Resolve session once so the panel can send auth headers.
  useEffect(() => {
    getSupabaseClient().auth.getSession().then(() => setReady(true));
  }, []);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 16px 60px" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Admin Analytics</h1>
        <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: 14 }}>
          Token consumption, tool usage, and analyst commentary.
        </p>
      </div>
      {ready && <AdminAnalyticsPanel />}
    </main>
  );
}
