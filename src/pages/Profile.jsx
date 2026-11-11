import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { parseAvatar } from "../lib/constants";

import NotificationsCard from "../components/NotificationsCard";
import Avatar from "../components/Avatar";
import AvatarPicker from "../components/AvatarPicker";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MEDALS = ["🥇", "🥈", "🥉"];

const digitsOnly = (v, max) => v.replace(/\D/g, "").slice(0, max);

export default function Profile() {
  const { profile, refreshProfile, signOut } = useAuth();

  const start = parseAvatar(profile.avatar);

  const [name, setName] = useState(profile.name);
  const [emoji, setEmoji] = useState(start.emoji);
  const [color, setColor] = useState(start.color);
  const [month, setMonth] = useState(profile.birth_month ?? "");
  const [day, setDay] = useState(profile.birth_day ?? "");

  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const [board, setBoard] = useState([]);
  const [showBoard, setShowBoard] = useState(false);

  // Fetch leaderboard
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, name, avatar, points")
      .order("points", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => setBoard(data ?? []));
  }, []);

  // Save profile
  async function handleSave(e) {
    e.preventDefault();
    setMsg(null);

    if (!name.trim()) {
      return setMsg({
        ok: false,
        text: "Name cannot be empty",
      });
    }

    let d = null;
    let m = null;

    if (day || month) {
      d = Number(day);
      m = Number(month);

      const maxDay = m ? new Date(2024, m, 0).getDate() : 0;

      if (!m || !d || d < 1 || d > maxDay) {
        return setMsg({
          ok: false,
          text: "Check your birthday, or leave both fields empty",
        });
      }
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name.trim(),
        avatar: `${emoji}|${color}`,
        birth_day: d,
        birth_month: m,
      })
      .eq("id", profile.id);

    if (error) {
      setSaving(false);
      return setMsg({
        ok: false,
        text: "Could not save. Try again",
      });
    }

    await refreshProfile();

    setSaving(false);
    setMsg({
      ok: true,
      text: "Saved ✨",
    });
  }

  // Leaderboard calculations
  const top = board.slice(0, 3);

  const rankOf = (p) => board.findIndex((b) => b.points === p.points) + 1;

  const me = board.find((b) => b.id === profile.id);

  const above = me
    ? [...board].reverse().find((b) => b.points > me.points)
    : null;

  const nudge =
    !me || board[0]?.points === 0
      ? null
      : above
        ? `${above.points - me.points + 1} XP to pass ${above.name} 🏃`
        : "You're leading the class! 🔥";

  const ranked = top.map((p, i) => ({
    ...p,
    rank: i,
  }));

  const podium =
    ranked.length === 3 ? [ranked[1], ranked[0], ranked[2]] : ranked;

  const nobodyYet = top.length === 0 || top[0].points === 0;

  return (
    <div className="space-y-5">
      <div
        className="card flex items-center gap-4 p-4"
        style={{ background: "var(--yellow)", color: "var(--on-pastel)" }}
      >
        <Avatar avatar={profile.avatar} size={72} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-bold">{profile.name}</div>
          <div className="text-sm">Roll no. {profile.roll_no}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">⭐ {profile.points}</div>
          <div className="text-sm">XP</div>
        </div>
      </div>

      <div
        className="card p-4"
        style={{ background: "var(--lavender)", color: "var(--on-pastel)" }}
      >
        <h2 className="mb-3 text-lg font-bold">🏆 Top champions</h2>
        {nobodyYet ? (
          <p>No XP yet. Be the first to earn some ⭐</p>
        ) : (
          <div className="flex items-end justify-around">
            {podium.map((p) => (
              <div
                key={p.id}
                className={`flex flex-col items-center gap-1 text-center ${p.rank === 0 ? "pb-4" : ""}`}
              >
                <div className="text-xl">{MEDALS[p.rank]}</div>
                <Avatar avatar={p.avatar} size={p.rank === 0 ? 64 : 52} />
                <div className="max-w-20 truncate text-sm font-bold">
                  {p.name}
                </div>
                <div className="text-sm">{p.points} XP</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card space-y-3 p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowBoard((v) => !v)}
          aria-expanded={showBoard}
        >
          <span className="text-lg font-bold">📊 Full leaderboard</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--muted)" }}
          >
            {me ? `You're #${rankOf(me)} ` : ""}
            {showBoard ? "▲" : "▼"}
          </span>
        </button>

        {nudge && (
          <p className="font-medium" style={{ color: "var(--muted)" }}>
            {nudge}
          </p>
        )}

        {showBoard && (
          <div className="space-y-2">
            {board.map((p) => {
              const isMe = p.id === profile.id;
              const rank = rankOf(p);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{
                    border: "2.5px solid var(--line)",
                    background: isMe ? "var(--yellow)" : "var(--bg)",
                    color: isMe ? "var(--on-pastel)" : "var(--ink)",
                  }}
                >
                  <span className="w-8 shrink-0 text-center font-bold">
                    {rank <= 3 && p.points > 0 ? MEDALS[rank - 1] : rank}
                  </span>
                  <Avatar avatar={p.avatar} size={36} />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {p.name}
                    {isMe ? " (you)" : ""}
                  </span>
                  <span className="shrink-0 font-bold">⭐ {p.points}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="card space-y-5 p-5">
        <h2 className="text-lg font-bold">✏️ Edit my info</h2>

        <div>
          <label className="label">First name</label>
          <input
            className="input"
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Avatar</label>
          <AvatarPicker
            emoji={emoji}
            color={color}
            onEmoji={setEmoji}
            onColor={setColor}
          />
        </div>

        <div>
          <label className="label">Birthday 🎂</label>
          <div className="flex gap-2">
            <select
              className="input"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Month</option>
              {MONTHS.map((mo, i) => (
                <option key={mo} value={i + 1}>
                  {mo}
                </option>
              ))}
            </select>
            <input
              className="input"
              inputMode="numeric"
              placeholder="Day"
              value={day}
              onChange={(e) => setDay(digitsOnly(e.target.value, 2))}
            />
          </div>
        </div>

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Roll number can't be changed. Ask Aditya if it's wrong.
        </p>

        {msg && (
          <div
            className="alert"
            style={msg.ok ? { background: "var(--mint)" } : undefined}
          >
            {msg.text}
          </div>
        )}

        <button className="btn w-full" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
      <NotificationsCard />

      <button
        className="btn w-full"
        style={{ background: "var(--pink)" }}
        onClick={signOut}
      >
        Log out
      </button>
    </div>
  );
}
