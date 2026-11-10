import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const digitsOnly = (v) => v.replace(/\D/g, "").slice(0, 6);

export default function ResetPin() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <div className="grid min-h-screen place-items-center text-5xl">⏳</div>
    );
  }

  // Opening this page without a valid recovery link means no session
  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card space-y-4 p-5 text-center">
          <div className="text-5xl">⌛</div>
          <h2 className="text-xl font-bold">This link has expired</h2>
          <p style={{ color: "var(--muted)" }}>
            Reset links only work once and for a short time. Ask for a fresh
            one.
          </p>
          <Link to="/login" className="btn block w-full">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(pin))
      return setError("Your PIN must be exactly 6 digits");
    if (pin !== pin2) return setError("PINs don't match");

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: pin,
    });
    setLoading(false);

    if (updateError) {
      console.error("[reset]", updateError);
      setError(
        updateError.message?.toLowerCase().includes("different")
          ? "Pick a PIN different from your old one"
          : "Couldn't update your PIN. The link may have expired",
      );
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="mb-6 text-center">
        <div className="text-5xl">🔑</div>
        <h1 className="text-3xl font-bold">New PIN</h1>
        <p style={{ color: "var(--muted)" }}>Pick a fresh 6-digit PIN</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5">
        <div>
          <label className="label">New PIN</label>
          <input
            className="input text-center tracking-[0.5em]"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            autoFocus
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(digitsOnly(e.target.value))}
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
            value={pin2}
            onChange={(e) => setPin2(digitsOnly(e.target.value))}
          />
        </div>

        {error && <div className="alert">{error}</div>}

        <button className="btn w-full" disabled={loading}>
          {loading ? "Saving…" : "Save new PIN →"}
        </button>
      </form>
    </div>
  );
}
