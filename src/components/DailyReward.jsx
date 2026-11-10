import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { todayStr } from "../lib/dates";

const BURST = [
  "⭐",
  "✨",
  "🎉",
  "⭐",
  "✨",
  "🎊",
  "⭐",
  "✨",
  "🎉",
  "⭐",
  "✨",
  "🎊",
];
const DIST = [130, 150, 120, 160, 125, 145, 135, 155, 120, 150, 130, 140];

export default function DailyReward({ onFinished }) {
  const { refreshProfile } = useAuth();
  const reduceMotion = useReducedMotion();
  const [reward, setReward] = useState(null);
  const checkedDay = useRef(null);
  const finished = useRef(false);

  const signalDone = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinished?.();
  }, [onFinished]);

  const claim = useCallback(async () => {
    const day = todayStr();
    if (checkedDay.current === day) return;
    checkedDay.current = day; // also acts as an "in flight" guard

    const { data, error } = await supabase.rpc("claim_daily_login");
    if (error) {
      checkedDay.current = null; // allow a retry next time the app is opened
      signalDone();
      return;
    }
    if (data?.awarded) {
      setReward(data);
      refreshProfile();
    } else {
      signalDone();
    }
  }, [refreshProfile, signalDone]);

  useEffect(() => {
    claim();
    // Covers the app staying open in the background overnight
    const onVisible = () => {
      if (document.visibilityState === "visible") claim();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [claim]);

  const dismiss = useCallback(() => {
    setReward(null);
    signalDone();
  }, [signalDone]);

  useEffect(() => {
    if (!reward) return;
    const t = setTimeout(dismiss, 2800);
    return () => clearTimeout(t);
  }, [reward, dismiss]);

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          key="reward"
          className="fixed inset-0 z-60 grid place-items-center px-6"
          style={{ background: "rgba(0,0,0,0.5)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
        >
          <div className="relative">
            {!reduceMotion &&
              BURST.map((emoji, i) => {
                const angle = (i / BURST.length) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    className="pointer-events-none absolute left-1/2 top-1/2 -ml-3 -mt-3 text-2xl"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                    animate={{
                      x: Math.cos(angle) * DIST[i],
                      y: Math.sin(angle) * DIST[i],
                      opacity: 0,
                      scale: 1.2,
                      rotate: i % 2 ? 180 : -180,
                    }}
                    transition={{ duration: 1.1, delay: 0.25, ease: "easeOut" }}
                  >
                    {emoji}
                  </motion.span>
                );
              })}

            <motion.div
              className="card px-10 py-6 text-center"
              style={{ background: "var(--yellow)", color: "var(--on-pastel)" }}
              initial={{ scale: 0.3, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
            >
              <div className="text-5xl">🎁</div>
              <div className="mt-2 text-lg font-bold">Daily login bonus!</div>
              <motion.div
                className="text-5xl font-bold"
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.3, 1] }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                +{reward.xp} XP
              </motion.div>
              <div className="mt-1 text-sm font-medium">
                Total: ⭐ {reward.points} · see you tomorrow ✨
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
