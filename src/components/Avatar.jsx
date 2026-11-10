import { parseAvatar } from "../lib/constants";

export default function Avatar({ avatar, size = 48 }) {
  const { emoji, color } = parseAvatar(avatar);
  return (
    <div
      className="grid shrink-0 select-none place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.55,
        border: "2.5px solid var(--line)",
      }}
    >
      {emoji}
    </div>
  );
}
