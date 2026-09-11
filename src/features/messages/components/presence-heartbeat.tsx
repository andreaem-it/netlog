"use client";
import { useEffect } from "react";
import { pingPresenceAction } from "../actions";

// ponytail: heartbeat only while the messages section is open, not app-wide
// presence — good enough for "online in chat", add a global heartbeat if
// online status should ever appear outside messaging.
const HEARTBEAT_INTERVAL_MS = 10_000;

export function PresenceHeartbeat() {
  useEffect(() => {
    pingPresenceAction();
    const id = setInterval(() => pingPresenceAction(), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
  return null;
}
