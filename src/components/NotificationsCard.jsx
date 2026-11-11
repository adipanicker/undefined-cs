import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { notifPermission, pushSupported } from "../lib/pwa";
import {
  ensurePushSubscription,
  sendTestPush,
  getPushError,
} from "../lib/push";

export default function NotificationsCard() {
  const { profile, refreshProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const perm = notifPermission();
  const on = pushSupported() && perm === "granted";
  const emailOn = profile.email_notify !== false;

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

  async function toggleEmail() {
    setSavingEmail(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_notify: !emailOn })
      .eq("id", profile.id);
    if (!error) await refreshProfile();
    setSavingEmail(false);
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-lg font-bold">🔔 Notifications</h2>

      {on ? (
        <div className="space-y-3">
          <p style={{ color: "var(--muted)" }}>
            You'll be pinged when someone drops a heads-up. Not seeing them?
            Send yourself a test.
          </p>
          <button className="btn w-full" disabled={busy} onClick={test}>
            {busy ? "Sending…" : "Send me a test 🔔"}
          </button>
        </div>
      ) : (
        <p style={{ color: "var(--muted)" }}>
          Push is off on this device. Open the menu and tap{" "}
          <b>📲 Install & notifications</b>.
        </p>
      )}

      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left font-semibold"
        style={{ border: "2.5px solid var(--line)", background: "var(--bg)" }}
        disabled={savingEmail}
        onClick={toggleEmail}
        aria-pressed={emailOn}
      >
        <span>✉️ Email me updates</span>
        <span
          className="rounded-full px-3 py-1 text-sm"
          style={{
            background: emailOn ? "var(--mint)" : "var(--surface)",
            color: emailOn ? "var(--on-pastel)" : "var(--ink)",
            border: "2.5px solid var(--line)",
          }}
        >
          {emailOn ? "On" : "Off"}
        </span>
      </button>

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
