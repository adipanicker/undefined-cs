import { useState } from "react";

const KEY = "undefined-cs-theme";

// Apply saved choice before React renders
const saved = localStorage.getItem(KEY);
document.documentElement.dataset.theme = saved || "light";

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(KEY) || "light",
  );

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
    setTheme(next);
  };

  return [theme, toggle];
}
