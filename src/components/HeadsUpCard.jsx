import { supabase } from "../lib/supabase";
import { TYPES } from "../lib/constants";
import { useSemester } from "../context/SemesterContext";
import { daysFromToday, dueLabel, prettyDate, timeAgo } from "../lib/dates";
import Avatar from "./Avatar";

export default function HeadsUpCard({
  item,
  mine,
  canEdit,
  onEdit,
  onDeleted,
}) {
  const { getSubject } = useSemester();
  const type = TYPES.find((t) => t.code === item.type);
  const subject = getSubject(item.subject);
  const days = item.event_date ? daysFromToday(item.event_date) : null;
  const urgent = days !== null && days <= 2;

  async function handleDelete() {
    const who = mine ? "your" : `${item.author?.name ?? "someone's"}'s`;
    if (!window.confirm(`Delete ${who} heads-up "${item.title}" for everyone?`))
      return;

    const { data, error } = await supabase
      .from("heads_ups")
      .delete()
      .eq("id", item.id)
      .select("id");

    if (error || !data || data.length === 0) {
      window.alert("Couldn't delete this one");
      return;
    }
    onDeleted();
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
          {subject?.emoji} {subject?.short_label ?? item.subject}
        </span>
        {item.event_date && (
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              background: urgent ? "var(--orange)" : "var(--surface)",
              color: urgent ? "var(--on-pastel)" : "var(--ink)",
              border: "2.5px solid var(--line)",
            }}
          >
            {urgent ? "🔥 " : ""}
            {dueLabel(item.event_date)}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold">
          {type?.emoji} {item.title}
        </h3>
        {item.event_date && (
          <div
            className="text-sm font-medium"
            style={{ color: "var(--muted)" }}
          >
            {prettyDate(item.event_date)}
          </div>
        )}
        {item.description && (
          <p className="mt-2 whitespace-pre-wrap break-words">
            {item.description}
          </p>
        )}
      </div>

      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: "var(--muted)" }}
      >
        <Avatar avatar={item.author?.avatar} size={28} />
        <span className="font-semibold">{item.author?.name ?? "Someone"}</span>
        <span>· {timeAgo(item.created_at)}</span>
        {item.updated_at && <span>· ✏️ edited {timeAgo(item.updated_at)}</span>}

        <div className="ml-auto flex items-center gap-3">
          {canEdit && (
            <button
              className="text-lg"
              onClick={onEdit}
              aria-label="Edit heads-up"
            >
              ✏️
            </button>
          )}
          {canEdit && (
            <button
              className="text-lg"
              onClick={handleDelete}
              aria-label="Delete heads-up"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
