import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CLASS_PIN, AVATAR_EMOJIS, AVATAR_COLORS } from "../lib/constants";
import Avatar from "../components/Avatar";

const ROLLS = Array.from({ length: 18 }, (_, i) => i + 1);
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
const digitsOnly = (v, max) => v.replace(/\D/g, "").slice(0, max);

export default function Signup() {
  const navigate = useNavigate();
  const [taken, setTaken] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    classPin: "",
    name: "",
    email: "",
    roll: null,
    emoji: AVATAR_EMOJIS[0],
    color: AVATAR_COLORS[0],
    month: "",
    day: "",
    pin: "",
    pin2: "",
  });

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  async function loadTaken() {
    const { data } = await supabase.rpc("taken_roll_numbers");
    setTaken(data ?? []);
  }

  useEffect(() => {
    loadTaken();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (form.classPin !== CLASS_PIN)
      return setError("Wrong class PIN. Ask in the group 🙈");
    if (!form.name.trim()) return setError("Add your first name");
    if (!form.roll) return setError("Pick your roll number");
    if (!/^\d{6}$/.test(form.pin))
      return setError("Your PIN must be exactly 6 digits");
    if (form.pin !== form.pin2) return setError("PINs don't match");

    let day = null;
    let month = null;
    if (form.day || form.month) {
      day = Number(form.day);
      month = Number(form.month);
      const maxDay = month ? new Date(2024, month, 0).getDate() : 0;
      if (!month || !day || day < 1 || day > maxDay) {
        return setError("Check your birthday, or leave both fields empty");
      }
    }

    setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.pin,
      options: {
        data: {
          name: form.name.trim(),
          roll_no: form.roll,
          avatar: `${form.emoji}|${form.color}`,
          birth_day: day,
          birth_month: month,
          class_pin: form.classPin,
        },
      },
    });
    setLoading(false);

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes("already registered")) {
        setError("This email already has an account. Try logging in");
      } else {
        setError(
          "Could not create account. Maybe that roll number was just taken, pick again",
        );
        loadTaken();
      }
      return;
    }

    navigate("/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 text-center">
        <div className="text-5xl">🎓</div>
        <h1 className="text-3xl font-bold">undefined.cs</h1>
        <p style={{ color: "var(--muted)" }}>
          Our class's little corner of the internet
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5">
        <h2 className="text-xl font-bold">Join the class</h2>

        <div>
          <label className="label">Class PIN</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="Ask in the group"
            value={form.classPin}
            onChange={(e) => set("classPin", digitsOnly(e.target.value, 4))}
          />
        </div>

        <div>
          <label className="label">First name</label>
          <input
            className="input"
            placeholder="eg. Aditya"
            maxLength={30}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div>
          <label className="label">
            Email (for PIN recovery & update notifications) 100% SAFE trust guys
            😭
          </label>
          <input
            className="input"
            type="email"
            required
            placeholder="you@gmail.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Your roll number</label>
          <div className="grid grid-cols-6 gap-2">
            {ROLLS.map((n) => (
              <button
                type="button"
                key={n}
                className="chip aspect-square"
                disabled={taken.includes(n)}
                aria-pressed={form.roll === n}
                onClick={() => set("roll", n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Pick your avatar</label>
          <div className="flex items-center gap-4">
            <Avatar avatar={`${form.emoji}|${form.color}`} size={72} />
            <div className="grid flex-1 grid-cols-6 gap-2">
              {AVATAR_EMOJIS.map((em) => (
                <button
                  type="button"
                  key={em}
                  className="chip aspect-square text-xl"
                  aria-pressed={form.emoji === em}
                  onClick={() => set("emoji", em)}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            {AVATAR_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className="chip h-9 w-9"
                style={{ background: c, borderRadius: "9999px" }}
                aria-pressed={form.color === c}
                onClick={() => set("color", c)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Birthday (optional) 🎂</label>
          <div className="flex gap-2">
            <select
              className="input"
              value={form.month}
              onChange={(e) => set("month", e.target.value)}
            >
              <option value="">Month</option>
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <input
              className="input"
              inputMode="numeric"
              placeholder="Day"
              value={form.day}
              onChange={(e) => set("day", digitsOnly(e.target.value, 2))}
            />
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Only day and month are saved. Used so the class can send you wishes.
          </p>
        </div>

        <div>
          <label className="label">Make a 6-digit PIN</label>
          <input
            className="input text-center tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="••••••"
            value={form.pin}
            onChange={(e) => set("pin", digitsOnly(e.target.value, 6))}
          />
        </div>

        <div>
          <label className="label">Confirm PIN</label>
          <input
            className="input text-center tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            placeholder="••••••"
            value={form.pin2}
            onChange={(e) => set("pin2", digitsOnly(e.target.value, 6))}
          />
        </div>

        {error && <div className="alert">{error}</div>}

        <button className="btn w-full" disabled={loading}>
          {loading ? "Creating…" : "Join the class →"}
        </button>
      </form>

      <p className="mt-5 text-center">
        Already in?{" "}
        <Link to="/login" className="font-semibold underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
