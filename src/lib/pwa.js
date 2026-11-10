export const SETUP_KEY = "undefined-cs-setup";

let deferredPrompt = null;
let installedThisSession = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

// Must be registered at import time: Chrome can fire this before React mounts
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  notify();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  installedThisSession = true;
  notify();
});

export function onInstallChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

export const isInstalled = () => isStandalone() || installedThisSession;

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const canPromptInstall = () => deferredPrompt !== null;

export async function promptInstall() {
  if (!deferredPrompt) return "unavailable";
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  if (outcome === "accepted") installedThisSession = true;
  notify();
  return outcome;
}

// On iPhone this is false inside a Safari tab and true only in the home-screen app
export const pushSupported = () =>
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

export const notifPermission = () =>
  "Notification" in window ? Notification.permission : "unsupported";

export const needsSetup = () =>
  !isInstalled() || (pushSupported() && notifPermission() === "default");

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

export async function showLocalNotification(title, body) {
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (!reg) return;
    await reg.showNotification(title, { body, icon: "/pwa-192x192.png" });
  } catch {
    // The permission is what matters; the test notification is a bonus
  }
}
