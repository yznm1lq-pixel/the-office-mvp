"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ChatLiveRefresh({ companyId }: { companyId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: number | undefined;
    const channel = supabase
      .channel(`company-chat-${companyId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `company_id=eq.${companyId}`,
      }, () => {
        window.clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(() => router.refresh(), 180);
      })
      .subscribe();
    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [companyId, router]);
  return <span className="chat-live-indicator"><i /> مباشر</span>;
}
