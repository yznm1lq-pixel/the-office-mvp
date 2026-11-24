"use client";

import { useEffect } from "react";

export function PresenceHeartbeat({ companyId }: { companyId: string }) {
  useEffect(() => {
    let active = true;
    const sendHeartbeat = async () => {
      if (!active) return;
      try {
        await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId }),
          keepalive: true,
        });
      } catch {
        // A missed heartbeat naturally expires from the live count after five minutes.
      }
    };

    void sendHeartbeat();
    const interval = window.setInterval(() => void sendHeartbeat(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [companyId]);

  return null;
}
