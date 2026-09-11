"use client";
import { useEffect, useState } from "react";
import { subscribePushAction, unsubscribePushAction } from "../actions";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

type Status = "unsupported" | "checking" | "off" | "on";

function pushSupported() {
  return (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    "PushManager" in window
  );
}

export function PushSubscribeButton({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>(() =>
    pushSupported() ? "checking" : "unsupported",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pushSupported()) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? "on" : "off"))
      .catch(() => setStatus("off"));
  }, []);

  async function enable() {
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Devi consentire le notifiche dal browser per attivarle.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      await subscribePushAction(JSON.stringify(subscription.toJSON()));
      setStatus("on");
    } catch {
      setError("Non è stato possibile attivare le notifiche push.");
    }
  }

  async function disable() {
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePushAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("Non è stato possibile disattivare le notifiche push.");
    }
  }

  if (status === "unsupported")
    return <p className="muted">Il tuo browser non supporta le notifiche push.</p>;
  if (status === "checking") return null;

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button
        type="button"
        className="button"
        onClick={status === "on" ? disable : enable}
      >
        {status === "on" ? "Disattiva notifiche push" : "Attiva notifiche push"}
      </button>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
