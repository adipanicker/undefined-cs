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
function sameKey(sub, keyBytes) {
  const current = sub.options?.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  return a.length === keyBytes.length && a.every((v, i) => v === keyBytes[i]);
}

let lastError = "";
export const getPushError = () => lastError;

export async function ensurePushSubscription({ fresh = false } = {}) {
  lastError = "";
  try {
    if (!pushSupported()) {
      lastError = "this browser has no push support";
      return false;
    }
    if (!VAPID_PUBLIC_KEY) {
      lastError = "VITE_VAPID_PUBLIC_KEY is missing in this build";
      return false;
    }
    if (Notification.permission !== "granted") {
      lastError = `permission is ${Notification.permission}`;
      return false;
    }

    const key = VAPID_PUBLIC_KEY.trim();
    let keyBytes;
    try {
      keyBytes = urlBase64ToUint8Array(key);
    } catch {
      lastError = "public key is not valid base64";
      return false;
    }
    if (keyBytes.length !== 65) {
      lastError = `public key decodes to ${keyBytes.length} bytes (must be 65)`;
      return false;
    }

    const reg = await getRegistration();
    if (!reg) {
      lastError = "service worker never became ready";
      return false;
    }

    let sub = await reg.pushManager.getSubscription();
    if (sub && (fresh || !sameKey(sub, keyBytes))) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        });
      } catch (e) {
        lastError = `subscribe failed: ${e.name}: ${e.message}`;
        return false;
      }
    }

    const json = sub.toJSON();
    const { error } = await supabase.rpc("save_push_subscription", {
      p_endpoint: json.endpoint,
      p_p256dh: json.keys.p256dh,
      p_auth: json.keys.auth,
      p_user_agent: navigator.userAgent.slice(0, 200),
    });
    if (error) {
      lastError = `database save failed: ${error.message}`;
      return false;
    }
    return true;
  } catch (e) {
    lastError = `unexpected: ${e?.message ?? e}`;
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
    if (error) {
      return {
        ok: false,
        sent: 0,
        stale: false,
        detail: `function error: ${error.message ?? "unknown"}`,
      };
    }
    const sent = data?.sent ?? 0;
    const first = data?.failed?.[0];
    let detail = "";
    if (!sent) {
      detail = first
        ? `push service said ${first.status ?? "?"} ${first.body ?? ""}`
        : data?.removed
          ? "this device was stale"
          : "the server has no subscription for you";
    }
    return { ok: sent > 0, sent, stale: !!data?.removed, detail };
  } catch (e) {
    return { ok: false, sent: 0, stale: false, detail: String(e) };
  }
}
