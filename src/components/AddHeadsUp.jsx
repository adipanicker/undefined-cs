import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { SUBJECTS, TYPES } from "../lib/constants";
import { todayStr } from "../lib/dates";

const EMPTY = {
  type: "assignment",
  subject: "AML",
  title: "",
  description: "",
  date: "",
};

export default function AddHeadsUp({ open, onClose, onAdded, editing = null }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fill the form each time the sheet opens (blank for new, existing values for edit)
  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      editing
        ? {
            type: editing.type,
            subject: editing.subject,
            title: editing.title,
            description: editing.description ?? "",
            date: editing.event_date ?? "",
          }
        : EMPTY,
    );
  }, [open, editing]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const needsDate = form.type !== "info";

  function pickType(code) {
    setForm((f) => ({
      ...f,
      type: code,
      subject: code === "event" ? "OTHER" : f.subject,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) return setError("Give it a title");
    if (needsDate && !form.date) return setError("Pick a date");

    const fields = {
      subject: form.subject,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: needsDate ? form.date : null,
    };

    setSaving(true);
    let failed = false;

    if (editing) {
      const { data, error: updateError } = await supabase
        .from("heads_ups")
        .update(fields)
        .eq("id", editing.id)
        .select("id");
      if (updateError) failed = true;
      else if (!data || data.length === 0) {
        setSaving(false);
        return setError("You can't edit this one");
      }
    } else {
      const { error: insertError } = await supabase
        .from("heads_ups")
        .insert(fields);
      if (insertError) failed = true;
    }

    setSaving(false);
    if (failed) return setError("Could not save. Try again");

    onAdded();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.45)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.form
            key="sheet"
            onSubmit={handleSubmit}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90vh] max-w-md space-y-5 overflow-y-auto p-5"
            style={{
              background: "var(--bg)",
              border: "2.5px solid var(--line)",
              borderBottom: "none",
              borderRadius: "24px 24px 0 0",
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {editing ? "✏️ Edit heads-up" : "📣 Drop a heads-up"}
              </h2>
              <button
                type="button"
                className="text-2xl"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="label">What kind?</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.code}
                    className="chip text-sm"
                    style={{ padding: "0.5rem 0.25rem" }}
                    aria-pressed={form.type === t.code}
                    onClick={() => pickType(t.code)}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Subject</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    type="button"
                    key={s.code}
                    className="chip text-sm"
                    style={{ padding: "0.4rem 0.8rem" }}
                    aria-pressed={form.subject === s.code}
                    onClick={() => set("subject", s.code)}
                  >
                    {s.emoji} {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Title</label>
              <input
                className="input"
                maxLength={100}
                placeholder="Maths report submission"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Details (optional)</label>
              <textarea
                className="input"
                rows={3}
                maxLength={1000}
                style={{ resize: "none" }}
                placeholder="Where to submit, format, anything useful…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {needsDate && (
              <div>
                <label className="label">Date</label>
                <input
                  className="input"
                  type="date"
                  min={editing ? undefined : todayStr()}
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </div>
            )}

            {error && <div className="alert">{error}</div>}

            <button className="btn w-full" disabled={saving}>
              {saving
                ? "Saving…"
                : editing
                  ? "Save changes ✨"
                  : "Post to the class →"}
            </button>
          </motion.form>
        </>
      )}
    </AnimatePresence>
  );
}
