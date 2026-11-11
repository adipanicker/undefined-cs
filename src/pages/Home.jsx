import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useSemester } from "../context/SemesterContext";
import { todayStr } from "../lib/dates";
import Avatar from "../components/Avatar";
import AddHeadsUp from "../components/AddHeadsUp";
import HeadsUpCard from "../components/HeadsUpCard";
import Calendar from "../components/Calendar";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good Morning", emoji: "☀️" };
  if (h < 17) return { text: "Good Afternoon", emoji: "🌤️" };
  return { text: "Good Evening", emoji: "🌙" };
}

export default function Home() {
  const { profile, refreshProfile } = useAuth();
  const { semester, subjects } = useSemester();
  const g = getGreeting();
  const semesterId = semester.id;

  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [version, setVersion] = useState(0);
  const [remaining, setRemaining] = useState(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("heads_ups")
      .select("*, author:profiles!heads_ups_created_by_fkey(name, avatar)")
      .eq("semester_id", semesterId)
      .or(`event_date.gte.${todayStr()},event_date.is.null`)
      .order("created_at", { ascending: false });

    if (error) {
      setLoadError(true);
    } else {
      setItems(data);
      setLoadError(false);
    }
    setLoaded(true);
    setVersion((v) => v + 1);
  }, [semesterId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase.rpc("is_admin").then(({ data }) => setIsAdmin(data === true));
  }, []);

  // How many quests are still open (same logic as the My Quests page)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase
        .from("heads_ups")
        .select("id")
        .eq("semester_id", semesterId)
        .not("event_date", "is", null),
      supabase
        .from("completions")
        .select("heads_up_id")
        .eq("semester_id", semesterId),
    ]).then(([hu, cp]) => {
      if (cancelled || hu.error || cp.error) return;
      const handled = new Set(cp.data.map((c) => c.heads_up_id));
      setRemaining(hu.data.filter((h) => !handled.has(h.id)).length);
    });
    return () => {
      cancelled = true;
    };
  }, [version, semesterId]);

  const shown = items
    .filter((i) => filter === "ALL" || i.subject === filter)
    .sort((a, b) => {
      if (a.event_date && b.event_date)
        return a.event_date.localeCompare(b.event_date);
      if (a.event_date) return -1;
      if (b.event_date) return 1;
      return 0;
    });

  const questLabel =
    remaining === null
      ? "🎯 My Quests →"
      : remaining === 0
        ? "🎉 All caught up · view quests"
        : `🎯 ${remaining} ${remaining === 1 ? "quest" : "quests"} left · ${
            remaining === 1 ? "knock it out" : "knock them out"
          } →`;

  return (
    <div className="space-y-5">
      <div
        className="card space-y-3 p-4"
        style={{ background: "var(--yellow)", color: "var(--on-pastel)" }}
      >
        <div className="flex items-center gap-4">
          <Avatar avatar={profile.avatar} size={64} />
          <div className="min-w-0">
            <div className="text-sm font-medium">
              {g.text} {g.emoji}
            </div>
            <div className="truncate text-2xl font-bold">{profile.name}</div>
          </div>
        </div>

        <Link
          to="/quests"
          className="btn block w-full text-center"
          style={{ background: "var(--surface)", color: "var(--ink)" }}
        >
          {questLabel}
        </Link>
      </div>

      <Calendar version={version} />

      <button className="btn w-full text-lg" onClick={() => setAdding(true)}>
        ＋ Drop a heads-up
      </button>

      <div>
        <h2 className="mb-3 text-xl font-bold">📣 Upcoming wall</h2>

        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto p-2">
          {[{ code: "ALL", label: "All", emoji: "✨" }, ...subjects].map(
            (s) => (
              <button
                key={s.code}
                className="chip shrink-0 text-sm"
                style={{ padding: "0.4rem 0.8rem" }}
                aria-pressed={filter === s.code}
                onClick={() => setFilter(s.code)}
              >
                {s.emoji} {s.short_label ?? s.label}
              </button>
            ),
          )}
        </div>

        {!loaded && <div className="py-8 text-center text-4xl">⏳</div>}

        {loadError && (
          <div className="alert">
            Couldn't load the wall. Refresh and try again
          </div>
        )}

        {loaded && !loadError && shown.length === 0 && (
          <div className="card p-6 text-center">
            <div className="text-4xl">🎉</div>
            <p className="mt-2 font-semibold">Nothing coming up here</p>
            <p style={{ color: "var(--muted)" }}>Enjoy it while it lasts</p>
          </div>
        )}

        <div className="space-y-4">
          {shown.map((item) => (
            <HeadsUpCard
              key={item.id}
              item={item}
              mine={item.created_by === profile.id}
              canEdit={isAdmin || item.created_by === profile.id}
              onEdit={() => setEditing(item)}
              onDeleted={() => {
                load();
                refreshProfile();
              }}
            />
          ))}
        </div>
      </div>

      <AddHeadsUp
        open={adding || !!editing}
        editing={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onAdded={load}
      />
    </div>
  );
}
