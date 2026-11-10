import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const EMAIL_KEY = "undefined-cs-email";

export default function Login() {
  const { session, loading: authLoading } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'forgot'
  const [email, setEmail] = useState(
    () => localStorage.getItem(EMAIL_KEY) ?? "",
  );
  const [remembered, setRemembered] = useState(
    () => !!localStorage.getItem(EMAIL_KEY),
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  if (!authLoading && session) return <Navigate to="/" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Enter your email");
    if (!/^\d{6}$/.test(pin)) return setError("Your PIN is 6 digits");

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pin,
    });
    setLoading(false);

    if (signInError) {
      setPin("");
      setError("Wrong email or PIN 🙈");
      return;
    }
    localStorage.setItem(EMAIL_KEY, cleanEmail);
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Enter your email");

    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      cleanEmail,
      {
        redirectTo: `${window.location.origin}/reset-pin`,
      },
    );
    setLoading(false);

    if (resetError) {
      console.error("[reset]", resetError);
      if (resetError.status === 429) {
        setError("Too many tries. Wait a minute and try again");
      } else {
        setError("Couldn't send the email. Try again in a bit");
      }
      return;
    }
    setSent(true);
  }

  function notYou() {
    localStorage.removeItem(EMAIL_KEY);
    setRemembered(false);
    setEmail("");
    setPin("");
  }

  function openForgot() {
    setError("");
    setSent(false);
    setMode("forgot");
  }

  function backToLogin() {
    setError("");
    setSent(false);
    setPin("");
    setMode("login");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-5xl">🎓</div>
        <h1 className="text-3xl font-bold">undefined.cs</h1>
        <p style={{ color: "var(--muted)" }}>
          {mode === "forgot" ? "No stress, we got you 🛟" : "Welcome back 👋"}
        </p>
      </div>

      {mode === "login" && (
        <form onSubmit={handleSubmit} className="card space-y-5 p-5">
          {remembered ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm" style={{ color: "var(--muted)" }}>
                  Logging in as
                </div>
                <div className="truncate font-semibold">{email}</div>
              </div>
              <button
                type="button"
                className="shrink-0 text-sm font-semibold underline"
                onClick={notYou}
              >
                Not you?
              </button>
            </div>
          ) : (
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="label">Your 6-digit PIN</label>
            <input
              className="input text-center tracking-[0.5em]"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              autoFocus={remembered}
              placeholder="••••••"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </div>

          {error && <div className="alert">{error}</div>}

          <button className="btn w-full" disabled={loading}>
            {loading ? "Logging in…" : "Let's go →"}
          </button>

          <button
            type="button"
            className="w-full text-center text-sm font-semibold underline"
            onClick={openForgot}
          >
            Forgot your PIN?
          </button>
        </form>
      )}

      {mode === "forgot" && !sent && (
        <form onSubmit={handleForgot} className="card space-y-5 p-5">
          <div>
            <h2 className="text-xl font-bold">Forgot your PIN? 🙈</h2>
            <p style={{ color: "var(--muted)" }}>
              Enter the email you signed up with and we'll send you a link to
              set a new one.
            </p>
          </div>

          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <div className="alert">{error}</div>}

          <button className="btn w-full" disabled={loading}>
            {loading ? "Sending…" : "Send reset link ✉️"}
          </button>

          <button
            type="button"
            className="w-full text-center text-sm font-semibold underline"
            onClick={backToLogin}
          >
            Back to login
          </button>
        </form>
      )}

      {mode === "forgot" && sent && (
        <div
          className="card space-y-4 p-5 text-center"
          style={{ background: "var(--mint)", color: "var(--on-pastel)" }}
        >
          <div className="text-5xl">📬</div>
          <h2 className="text-xl font-bold">Check your inbox</h2>
          <p>
            If <b>{email.trim()}</b> has an account, a reset link is on its way.
            Check spam too.
          </p>
          <button
            className="btn w-full"
            style={{ background: "var(--surface)", color: "var(--ink)" }}
            onClick={backToLogin}
          >
            Back to login
          </button>
        </div>
      )}

      <p className="mt-5 text-center">
        New here?{" "}
        <Link to="/signup" className="font-semibold underline">
          Join the class
        </Link>
      </p>
    </div>
  );
}
