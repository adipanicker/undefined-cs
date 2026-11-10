import { AVATAR_EMOJIS, AVATAR_COLORS } from "../lib/constants";
import Avatar from "./Avatar";

export default function AvatarPicker({ emoji, color, onEmoji, onColor }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar avatar={`${emoji}|${color}`} size={72} />
        <div className="grid flex-1 grid-cols-6 gap-2">
          {AVATAR_EMOJIS.map((em) => (
            <button
              type="button"
              key={em}
              className="chip aspect-square text-xl"
              aria-pressed={emoji === em}
              onClick={() => onEmoji(em)}
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
            aria-pressed={color === c}
            onClick={() => onColor(c)}
          />
        ))}
      </div>
    </div>
  );
}
