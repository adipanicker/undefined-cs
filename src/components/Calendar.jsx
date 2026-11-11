import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { TYPES } from "../lib/constants";
import { useSemester } from "../context/SemesterContext";
import { prettyDate, todayStr } from "../lib/dates";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Which emoji wins when a day has several events
const PRIORITY = [
  "sem_exam",
  "series",
  "lab_exam",
  "report",
  "assignment",
  "project",
  "seminar",
  "event",
  "info",
];
const EXAMS = ["sem_exam", "series", "lab_exam"];
const TYPE_COLOR = {
  sem_exam: "var(--orange)",
  series: "var(--orange)",
  lab_exam: "var(--orange)",
  assignment: "var(--yellow)",
  report: "var(--yellow)",
  project: "var(--yellow)",
  seminar: "var(--lavender)",
  event: "var(--pink)",
  info: "var(--mint)",
};

const pad = (n) => String(n).padStart(2, "0");
const byPriority = (a, b) =>
  PRIORITY.indexOf(a.type) - PRIORITY.indexOf(b.type);

export default function Calendar({ version = 0 }) {
  const now = new Date();
  const today = todayStr();
  const { semester, getSubject } = useSemester();

  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(today);
  const [error, setError] = useState(false);
  const { y, m } = cursor;

  useEffect(() => {
    let cancelled = false;
    const last = new Date(y, m + 1, 0).getDate();
    const first = `${y}-${pad(m + 1)}-01`;
    const end = `${y}-${pad(m + 1)}-${pad(last)}`;

    supabase
      .from("heads_ups")
      .select("id, subject, type, title, event_date")
      .eq("semester_id", semester.id)
      .gte("event_date", first)
      .lte("event_date", end)
      .order("event_date")
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(true);
        } else {
          setEvents(data);
          setError(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [y, m, version, semester.id]);

  const byDate = useMemo(() => {
    const map = {};
    for (const e of events) (map[e.event_date] ||= []).push(e);
    return map;
  }, [events]);

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const cells = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isThisMonth = y === now.getFullYear() && m === now.getMonth();
  const selectedEvents = selected
    ? [...(byDate[selected] ?? [])].sort(byPriority)
    : [];

  function shift(delta) {
    const d = new Date(y, m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(null);
  }

  function goToday() {
    const n = new Date();
    setCursor({ y: n.getFullYear(), m: n.getMonth() });
    setSelected(todayStr());
  }

  return (
    <div className="card p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          className="btn"
          style={{ padding: "0.25rem 0.8rem" }}
          onClick={() => shift(-1)}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-lg font-bold">
            📅 {MONTHS[m]} {y}
          </div>
          {!isThisMonth && (
            <button
              className="text-sm font-semibold underline"
              onClick={goToday}
            >
              Back to today
            </button>
          )}
        </div>
        <button
          className="btn"
          style={{ padding: "0.25rem 0.8rem" }}
          onClick={() => shift(1)}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div
        className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-bold"
        style={{ color: "var(--muted)" }}
      >
        {WEEKDAYS.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>

      <motion.div
        key={`${y}-${m}`}
        className="grid grid-cols-7 gap-1"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {cells.map((d, i) => {
          if (d === null) return <div key={`blank-${i}`} />;

          const ds = `${y}-${pad(m + 1)}-${pad(d)}`;
          const list = byDate[ds];
          const top = list ? [...list].sort(byPriority)[0] : null;
          const isToday = ds === today;
          const isPast = ds < today;
          const isSel = ds === selected;
          const topType = top ? TYPES.find((t) => t.code === top.type) : null;

          return (
            <button
              key={ds}
              type="button"
              onClick={() => setSelected(isSel ? null : ds)}
              className="relative flex h-14 min-w-0 flex-col items-center justify-between rounded-xl py-1 leading-none"
              style={{
                background: top ? TYPE_COLOR[top.type] : "transparent",
                color: top ? "var(--on-pastel)" : "var(--ink)",
                border: `2.5px solid ${top ? "var(--line)" : "transparent"}`,
                boxShadow: top && !isPast ? "2px 2px 0 var(--shadow)" : "none",
                opacity: isPast ? 0.5 : 1,
                outline: isSel ? "3px solid var(--ink)" : "none",
                outlineOffset: 2,
              }}
            >
              <span
                className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                style={
                  isToday
                    ? top
                      ? { background: "#1A1A1A", color: "#FFF8E7" }
                      : { background: "var(--ink)", color: "var(--bg)" }
                    : undefined
                }
              >
                {d}
              </span>

              {topType && (
                <span
                  className={`text-lg ${EXAMS.includes(top.type) && !isPast ? "wiggle" : ""}`}
                >
                  {topType.emoji}
                </span>
              )}

              {list && list.length > 1 && (
                <span
                  className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold"
                  style={{ background: "#1A1A1A", color: "#fff" }}
                >
                  {list.length}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {error && <div className="alert mt-3">Couldn't load this month</div>}

      <div className="mt-4 space-y-2">
        {selected ? (
          <>
            <div className="font-bold">{prettyDate(selected)}</div>
            {selectedEvents.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Nothing on this day 😌</p>
            ) : (
              selectedEvents.map((e) => {
                const type = TYPES.find((t) => t.code === e.type);
                const subject = getSubject(e.subject);
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-2 rounded-xl px-3 py-2"
                    style={{
                      border: "2.5px solid var(--line)",
                      background: "var(--bg)",
                    }}
                  >
                    <span className="text-xl">{type?.emoji}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {e.title}
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: subject?.color,
                        color: "var(--on-pastel)",
                        border: "2px solid var(--line)",
                      }}
                    >
                      {subject?.short_label}
                    </span>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <p style={{ color: "var(--muted)" }}>Tap a day to see what's up</p>
        )}
      </div>
    </div>
  );
}
