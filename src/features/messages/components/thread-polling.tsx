"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// ponytail: plain polling, not a websocket/SSE channel — good enough for a
// two-person thread; revisit if message volume ever demands push updates.
const POLL_INTERVAL_MS = 5000;

export function ThreadPolling() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
