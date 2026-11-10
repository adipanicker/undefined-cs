import { useState } from "react";
import { notifPermission, pushSupported } from "../lib/pwa";
import {
  ensurePushSubscription,
  sendTestPush,
  getPushError,
} from "../lib/push";

export default function NotificationsCard() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const perm = notifPermission();
  const on = pushSupported() && perm === "granted";

  async function test() {
    setBusy(true);
    setMsg(null);
    const subscribed = await ensurePushSubscription();
    if (!subscribed) {
      setBusy(false);
      return setMsg({
        ok: false,
        text: `Couldn't register this device: ${getPushError() || "unknown"}`,
      });
    }

    let res = await sendTestPush();
    if (!res.ok && res.stale) {
      await ensurePushSubscription({ fresh: true });
      res = await sendTestPush();
    }
    setBusy(false);
    setMsg(
      res.ok
        ? { ok: true, text: "Sent! Check your notifications 🔔" }
        : { ok: false, text: `Couldn't deliver: ${res.detail}` },
    );
  }

  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-lg font-bold">🔔 Notifications</h2>
      {on ? (
        <>
          <p style={{ color: "var(--muted)" }}>
            You'll be pinged when someone drops a heads-up. Not seeing them?
            Send yourself a test.
          </p>
          <button className="btn w-full" disabled={busy} onClick={test}>
            {busy ? "Sending…" : "Send me a test 🔔"}
          </button>
        </>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          Notifications are off on this device. Open the menu and tap{" "}
          <b>📲 Install & notifications</b>.
        </p>
      )}
      {msg && (
        <div
          className="alert"
          style={msg.ok ? { background: "var(--mint)" } : undefined}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
