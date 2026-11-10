import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { SUBJECTS, TYPES, XP_BY_TYPE, ATTEND_TYPES } from "../lib/constants";
import { daysFromToday, dueLabel, prettyDate } from "../lib/dates";

const subjectName = (s) =>
  s.code === "LAB" ? "Lab" : s.code === "OTHER" ? "Others" : s.label;

function QuestCard({ item, busy, onDone, onSkip }) {
  const type = TYPES.find((t) => t.code === item.type);
  const subject = SUBJECTS.find((s) => s.code === item.subject);
  const days = daysFromToday(item.event_date);
  const attend = ATTEND_TYPES.includes(item.type);
  const locked = attend && days > 0;
  const overdue = days < 0 && !attend;
  const urgent = days >= 0 && days <= 2;

  let pillText = dueLabel(item.event_date);
  let pillBg = "var(--surface)";
  let pillColor = "var(--ink)";
  if (overdue) {
    pillText = `⚠️ ${-days}d overdue`;
    pillBg = "var(--pink)";
    pillColor = "var(--on-pastel)";
  } else if (urgent) {
    pillText = `🔥 ${pillText}`;
    pillBg = "var(--orange)";
    pillColor = "var(--on-pastel)";
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{
            background: subject?.color,
            color: "var(--on-pastel)",
            border: "2.5px solid var(--line)",
          }}
        >
          {subject?.emoji} {subject && subjectName(subject)}
        </span>
        <span
          className="rounded-full px-3 py-1 text-sm font-semibold"
          style={{
            background: pillBg,
            color: pillColor,
            border: "2.5px solid var(--line)",
          }}
        >
          {pillText}
        </span>
      </div>

      <div>
        <h3 className="text-lg font-bold">
          {type?.emoji} {item.title}
        </h3>
        <div className="text-sm font-medium" style={{ color: "var(--muted)" }}>
          {prettyDate(item.event_date)}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="btn flex-1"
          style={{
            background: "var(--mint)",
            cursor: locked ? "not-allowed" : undefined,
          }}
          disabled={busy || locked}
          onClick={onDone}
        >
          {locked
            ? "🔒 Opens on the day"
            : `✓ Done · +${XP_BY_TYPE[item.type]} XP`}
        </button>
        {item.subject === "OTHER" && (
          <button
            className="btn"
            style={{ background: "var(--surface)", color: "var(--ink)" }}
            disabled={busy}
            onClick={onSkip}
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function DoneRow({ item, mark, busy, onUndo }) {
  const subject = SUBJECTS.find((s) => s.code === item.subject);
  const done = mark.status === "done";

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{
        border: "2.5px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      <span className="text-xl">{done ? "✅" : "⏭️"}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{item.title}</div>
        <div className="text-xs" style={{ color: "var(--muted)" }}>
          {subject && subjectName(subject)} ·{" "}
          {done ? (mark.xp > 0 ? `+${mark.xp} XP` : "Done") : "Skipped"}
        </div>
      </div>
      <button
        className="shrink-0 text-sm font-semibold underline"
        disabled={busy}
        onClick={onUndo}
      >
        Undo
      </button>
    </div>
  );
}

export default function Quests() {
  const { profile, refreshProfile } = useAuth();
  const [items, setItems] = useState([]);
  const [marks, setMarks] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [showDone, setShowDone] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    const [hu, cp] = await Promise.all([
      supabase
        .from("heads_ups")
        .select("id, subject, type, title, event_date")
        .not("event_date", "is", null)
        .order("event_date"),
      supabase.from("completions").select("heads_up_id, status, xp"),
    ]);
    if (hu.error || cp.error) {
      setLoadError(true);
    } else {
      setItems(hu.data);
      setMarks(Object.fromEntries(cp.data.map((c) => [c.heads_up_id, c])));
      setLoadError(false);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (text, bad = false) =>
    setToast({ text, bad, id: Date.now() });

  async function mark(item, status) {
    setBusyId(item.id);
    const { data, error } = await supabase
      .from("completions")
      .insert({ heads_up_id: item.id, status })
      .select("heads_up_id, status, xp")
      .single();
    setBusyId(null);

    if (error) {
      if (error.message?.includes("Too early"))
        showToast("Too early, wait for the day 😅", true);
      else if (error.code !== "23505")
        showToast("Could not save. Try again", true);
      load();
      return;
    }

    setMarks((m) => ({ ...m, [item.id]: data }));
    if (status === "done") {
      showToast(data.xp > 0 ? `+${data.xp} XP ⭐` : "Done ✅");
      refreshProfile();
    }
  }

  async function undo(item) {
    setBusyId(item.id);
    const wasDone = marks[item.id]?.status === "done";
    const { error } = await supabase
      .from("completions")
      .delete()
      .eq("heads_up_id", item.id);
    setBusyId(null);

    if (error) return showToast("Could not undo. Try again", true);
    setMarks((m) => {
      const next = { ...m };
      delete next[item.id];
      return next;
    });
    if (wasDone) refreshProfile();
  }

  const stats = useMemo(() => {
    const s = Object.fromEntries(
      SUBJECTS.map((sub) => [sub.code, { total: 0, done: 0 }]),
    );
    for (const i of items) {
      const st = marks[i.id]?.status;
      if (st === "ignored") continue;
      s[i.subject].total++;
      if (st === "done") s[i.subject].done++;
    }
    return s;
  }, [items, marks]);

  const totalAll = Object.values(stats).reduce((a, s) => a + s.total, 0);
  const doneAll = Object.values(stats).reduce((a, s) => a + s.done, 0);
  const pct = totalAll ? Math.round((doneAll / totalAll) * 100) : 0;

  const visible = items.filter((i) => filter === "ALL" || i.subject === filter);
  const todo = visible.filter((i) => !marks[i.id]);
  const finished = visible.filter((i) => marks[i.id]).reverse();

  if (!loaded) return <div className="py-10 text-center text-4xl">⏳</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">🎯 My Quests</h1>
        <p style={{ color: "var(--muted)" }}>
          Everything on your plate, subject by subject.
        </p>
      </div>

      {loadError && (
        <div className="alert">
          Couldn't load your quests. Refresh and try again
        </div>
      )}

      <div
        className="card space-y-3 p-4"
        style={{ background: "var(--mint)", color: "var(--on-pastel)" }}
      >
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">
              {doneAll} / {totalAll}
            </div>
            <div className="text-sm font-medium">quests done</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">⭐ {profile.points}</div>
            <div className="text-sm font-medium">XP</div>
          </div>
        </div>
        <div
          className="h-4 w-full overflow-hidden rounded-full"
          style={{ background: "#fff", border: "2.5px solid #1A1A1A" }}
        >
          <div
            className="h-full"
            style={{
              width: `${pct}%`,
              background: "var(--orange)",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      <div className="card space-y-1 p-3">
        <div className="px-2 pb-1">
          <h2 className="text-lg font-bold">📚 By subject</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {filter === "ALL"
              ? "Tap a subject to filter the list"
              : "Tap it again to clear the filter"}
          </p>
        </div>
        {SUBJECTS.map((s) => {
          const st = stats[s.code];
          const p = st.total ? (st.done / st.total) * 100 : 0;
          return (
            <button
              key={s.code}
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left"
              style={{
                outline: filter === s.code ? "3px solid var(--ink)" : "none",
                outlineOffset: 1,
              }}
              onClick={() => setFilter((f) => (f === s.code ? "ALL" : s.code))}
            >
              <span className="w-24 shrink-0 font-semibold">
                {s.emoji} {subjectName(s)}
              </span>
              <div
                className="h-3 flex-1 overflow-hidden rounded-full"
                style={{
                  background: "var(--bg)",
                  border: "2px solid var(--line)",
                }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${p}%`,
                    background: s.color,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-semibold">
                {st.total ? `${st.done}/${st.total}` : "–"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">📝 To do ({todo.length})</h2>

        {todo.length === 0 && (
          <div className="card p-6 text-center">
            <div className="text-4xl">{items.length ? "🎉" : "🌱"}</div>
            <p className="mt-2 font-semibold">
              {items.length ? "All caught up!" : "No quests yet"}
            </p>
            <p style={{ color: "var(--muted)" }}>
              {items.length
                ? "Nothing left here"
                : "They appear when someone drops a heads-up with a date"}
            </p>
          </div>
        )}

        {todo.map((item) => (
          <QuestCard
            key={item.id}
            item={item}
            busy={busyId === item.id}
            onDone={() => mark(item, "done")}
            onSkip={() => mark(item, "ignored")}
          />
        ))}
      </div>

      {finished.length > 0 && (
        <div className="space-y-3">
          <button
            className="flex w-full items-center justify-between text-xl font-bold"
            onClick={() => setShowDone((v) => !v)}
          >
            <span>✅ Done & skipped ({finished.length})</span>
            <span>{showDone ? "▲" : "▼"}</span>
          </button>
          {showDone &&
            finished.map((item) => (
              <DoneRow
                key={item.id}
                item={item}
                mark={marks[item.id]}
                busy={busyId === item.id}
                onUndo={() => undo(item)}
              />
            ))}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="card fixed inset-x-0 bottom-6 z-50 mx-auto w-fit px-5 py-3 font-bold"
            style={{
              background: toast.bad ? "var(--pink)" : "var(--mint)",
              color: "var(--on-pastel)",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
