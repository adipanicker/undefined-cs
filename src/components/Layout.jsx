import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../lib/theme";
import { needsSetup, SETUP_KEY } from "../lib/pwa";
import { ensurePushSubscription } from "../lib/push";
import Avatar from "./Avatar";
import DailyReward from "./DailyReward";
import Onboarding from "./Onboarding";

const NAV = [
  { to: "/", label: "Home", emoji: "🏠", end: true },
  { to: "/quests", label: "My Quests", emoji: "🎯" },
  { to: "/profile", label: "Profile", emoji: "👤" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [rewardDone, setRewardDone] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const { profile } = useAuth();
  const [theme, toggleTheme] = useTheme();

  const markRewardDone = useCallback(() => setRewardDone(true), []);
  // Re-sync this device's push subscription on every app start
  useEffect(() => {
    ensurePushSubscription();
  }, [profile.id]);

  // Auto-open the setup sheet once, after the daily reward is out of the way
  useEffect(() => {
    if (rewardDone && !localStorage.getItem(SETUP_KEY) && needsSetup()) {
      setSetupOpen(true);
    }
  }, [rewardDone]);

  function closeSetup(completed) {
    localStorage.setItem(SETUP_KEY, completed ? "done" : "later");
    setSetupOpen(false);
  }

  function openSetup() {
    setOpen(false);
    setSetupOpen(true);
  }

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{
          background: "var(--bg)",
          borderBottom: "2.5px solid var(--line)",
        }}
      >
        <button
          className="btn"
          style={{ padding: "0.35rem 0.8rem" }}
          onClick={() => setOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="text-xl font-bold">undefined.cs</div>
        <NavLink to="/profile" aria-label="Profile">
          <Avatar avatar={profile.avatar} size={40} />
        </NavLink>
      </header>

      <main className="mx-auto max-w-md px-4 py-5">
        <Outlet />
      </main>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
        )}
        {open && (
          <motion.aside
            key="drawer"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col p-4"
            style={{
              background: "var(--bg)",
              borderRight: "2.5px solid var(--line)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div
              className="card flex items-center gap-3 p-3"
              style={{ background: "var(--yellow)", color: "var(--on-pastel)" }}
            >
              <Avatar avatar={profile.avatar} size={48} />
              <div className="min-w-0">
                <div className="truncate font-bold">{profile.name}</div>
                <div className="text-sm">Roll no. {profile.roll_no}</div>
              </div>
            </div>

            <nav className="mt-5 flex flex-col gap-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold"
                  style={({ isActive }) => ({
                    background: isActive ? "var(--yellow)" : "var(--surface)",
                    color: isActive ? "var(--on-pastel)" : "var(--ink)",
                    border: "2.5px solid var(--line)",
                    boxShadow: isActive ? "3px 3px 0 var(--shadow)" : "none",
                  })}
                >
                  <span className="text-xl">{item.emoji}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto space-y-3">
              {needsSetup() && (
                <button
                  className="btn w-full"
                  style={{ background: "var(--lavender)" }}
                  onClick={openSetup}
                >
                  📲 Install & notifications
                </button>
              )}
              <button
                className="btn w-full"
                style={{ background: "var(--surface)", color: "var(--ink)" }}
                onClick={toggleTheme}
              >
                {theme === "dark" ? "☀️ Light mode" : "🌙 Dark mode"}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <DailyReward onFinished={markRewardDone} />
      <Onboarding open={setupOpen} onClose={closeSetup} />
    </div>
  );
}
