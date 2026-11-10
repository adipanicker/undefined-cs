import { supabase } from "./supabase";
import { pushSupported } from "./pwa";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function getRegistration() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}

// Makes sure this device has a subscription and that the server knows about it.
// Safe to call on every app start.
export async function ensurePushSubscription() {
  try {
    if (
      !pushSupported() ||
      !VAPID_PUBLIC_KEY ||
      Notification.permission !== "granted"
    ) {
      return false;
    }
    const reg = await getRegistration();
    if (!reg) return false;

    const subscribe = () =>
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await subscribe();
    }

    const json = sub.toJSON();
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent.slice(0, 200),
    });
    return !error;
  } catch {
    return false;
  }
}

// Called on logout so the next person on this device doesn't get your pings
export async function removeThisDevice() {
  try {
    if (!pushSupported()) return;
    const reg = await getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub)
      await supabase.rpc("remove_push_subscription", {
        p_endpoint: sub.endpoint,
      });
  } catch {
    // Logging out must never fail because of this
  }
}

export async function sendTestPush() {
  try {
    const { data, error } = await supabase.functions.invoke("send-push", {
      body: { test: true },
    });
    if (error) return { ok: false, sent: 0 };
    return { ok: (data?.sent ?? 0) > 0, sent: data?.sent ?? 0 };
  } catch {
    return { ok: false, sent: 0 };
  }
}
