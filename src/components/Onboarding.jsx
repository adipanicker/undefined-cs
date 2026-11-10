import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  isIOS,
  isInstalled,
  canPromptInstall,
  onInstallChange,
  promptInstall,
  pushSupported,
  notifPermission,
  showLocalNotification,
} from "../lib/pwa";
import { ensurePushSubscription, sendTestPush } from "../lib/push";

function StepCard({ n, title, done, children }) {
  return (
    <div
      className="card space-y-3 p-4"
      style={{
        background: done ? "var(--mint)" : "var(--surface)",
        color: done ? "var(--on-pastel)" : "var(--ink)",
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold"
          style={{
            border: "2.5px solid var(--line)",
            background: done ? "#fff" : "var(--yellow)",
            color: "var(--on-pastel)",
          }}
        >
          {done ? "✓" : n}
        </span>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Sheet({ onClose }) {
  const [installed, setInstalled] = useState(isInstalled);
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  const [perm, setPerm] = useState(notifPermission);
  const [busy, setBusy] = useState(false);
  const ios = isIOS();
  const pushOk = pushSupported();

  useEffect(
    () =>
      onInstallChange(() => {
        setInstalled(isInstalled());
        setCanPrompt(canPromptInstall());
      }),
    [],
  );

  const allDone = installed && (perm === "granted" || perm === "denied");

  async function install() {
    setBusy(true);
    await promptInstall();
    setBusy(false);
  }

  async function enableNotifications() {
    setBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPerm(result);
      if (result === "granted") {
        const subscribed = await ensurePushSubscription();
        const test = subscribed ? await sendTestPush() : { ok: false };
        if (!test.ok) {
          showLocalNotification(
            "🎉 Notifications are on!",
            "You'll hear about new heads-ups here.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <motion.div
        key="overlay"
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.45)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => onClose(allDone)}
      />
      <motion.div
        key="sheet"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] max-w-md space-y-4 overflow-y-auto p-5"
        style={{
          background: "var(--bg)",
          border: "2.5px solid var(--line)",
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "tween", duration: 0.2 }}
      >
        <div>
          <h2 className="text-xl font-bold">🚀 Let's get you set up</h2>
          <p style={{ color: "var(--muted)" }}>
            Two quick things so you never miss a deadline.
          </p>
        </div>

        <StepCard n={1} title="Add to home screen" done={installed}>
          {installed ? (
            <p className="font-medium">You're all set 👌</p>
          ) : ios ? (
            <ol className="list-decimal space-y-1 pl-5 font-medium">
              <li>
                Open this site in <b>Safari</b> (not inside WhatsApp or
                Instagram)
              </li>
              <li>
                Tap the <b>Share</b> button ⬆️ at the bottom
              </li>
              <li>
                Scroll down and tap <b>Add to Home Screen</b>
              </li>
              <li>
                Tap <b>Add</b>, then open <b>undefined.cs</b> from your home
                screen
              </li>
            </ol>
          ) : canPrompt ? (
            <button className="btn w-full" disabled={busy} onClick={install}>
              📲 Install app
            </button>
          ) : (
            <p className="font-medium">
              Open your browser menu (⋮) and tap <b>Install app</b> or{" "}
              <b>Add to Home screen</b>. If you opened this link inside
              WhatsApp, open it in Chrome first.
            </p>
          )}
        </StepCard>

        <StepCard n={2} title="Turn on notifications" done={perm === "granted"}>
          {perm === "granted" ? (
            <p className="font-medium">Notifications are on 🔔</p>
          ) : perm === "denied" ? (
            <p className="font-medium">
              Notifications are blocked. You can switch them on in your browser
              or phone settings for this site.
            </p>
          ) : pushOk ? (
            <>
              <p className="font-medium">
                Get pinged the moment someone drops a deadline.
              </p>
              <button
                className="btn w-full"
                disabled={busy}
                onClick={enableNotifications}
              >
                🔔 Turn on notifications
              </button>
            </>
          ) : ios && !installed ? (
            <p className="font-medium">
              Do step 1 first, then open the app from your home screen. It will
              ask you there.
            </p>
          ) : (
            <p className="font-medium">
              This browser doesn't support notifications.
            </p>
          )}
        </StepCard>

        <button
          className="btn w-full"
          style={
            allDone
              ? undefined
              : { background: "var(--surface)", color: "var(--ink)" }
          }
          onClick={() => onClose(allDone)}
        >
          {allDone ? "Let's go 🎉" : "Maybe later"}
        </button>
      </motion.div>
    </>
  );
}

export default function Onboarding({ open, onClose }) {
  // Sheet mounts fresh each time it opens, so its state always reflects the device right now
  return (
    <AnimatePresence>
      {open && <Sheet key="sheet" onClose={onClose} />}
    </AnimatePresence>
  );
}
