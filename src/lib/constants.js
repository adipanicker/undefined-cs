// Cosmetic check only. The real lock is the trigger in the database.
export const CLASS_PIN = "8585";

export const AVATAR_EMOJIS = [
  "😀",
  "😎",
  "🤓",
  "🥳",
  "😴",
  "🤠",
  "🦊",
  "🐼",
  "🐸",
  "🐙",
  "🦄",
  "👾",
];
export const AVATAR_COLORS = [
  "#FFD966",
  "#8FCB9B",
  "#C4B8FF",
  "#FF8A4C",
  "#FFB5C5",
  "#9AD1F5",
];

export function parseAvatar(avatar) {
  const [emoji = "😀", color = "#FFD966"] = (avatar || "").split("|");
  return { emoji, color };
}

export const SUBJECTS = [
  { code: "AML", label: "AML", emoji: "🤖", color: "#C4B8FF" },
  { code: "ADM", label: "ADM", emoji: "🗄️", color: "#9AD1F5" },
  { code: "IPR", label: "IPR", emoji: "📘", color: "#FFB5C5" },
  { code: "MAT", label: "MAT", emoji: "📐", color: "#FFD966" },
  { code: "CC", label: "CC", emoji: "🖥️", color: "#8FCB9B" },
  { code: "PR", label: "PR", emoji: "🔍", color: "#FF8A4C" },
  { code: "LAB", label: "Computing Lab", emoji: "💻", color: "#B8E0D2" },
  { code: "OTHER", label: "Others", emoji: "🎈", color: "#F2C6FF" },
];

export const TYPES = [
  { code: "assignment", label: "Assignment", emoji: "📝" },
  { code: "report", label: "Report", emoji: "📄" },
  { code: "series", label: "Series exam", emoji: "😱" },
  { code: "sem_exam", label: "Sem exam", emoji: "💀" },
  { code: "lab_exam", label: "Lab exam", emoji: "🧪" },
  { code: "seminar", label: "Seminar", emoji: "🎤" },
  { code: "project", label: "Project", emoji: "🛠️" },
  { code: "event", label: "Event / outing", emoji: "🎉" },
  { code: "info", label: "Info", emoji: "📢" },
];

export const XP_BY_TYPE = {
  assignment: 20,
  report: 20,
  project: 20,
  series: 30,
  sem_exam: 30,
  lab_exam: 30,
  seminar: 10,
  event: 5,
  info: 0,
};

// Things you attend or take can only be ticked on/after the day.
// Things you submit can be ticked anytime.
export const ATTEND_TYPES = [
  "series",
  "sem_exam",
  "lab_exam",
  "seminar",
  "event",
];
