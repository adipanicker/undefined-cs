import { useState } from "react";

const KEY = "undefined-cs-theme";

// Apply the saved choice before React renders, so there's no flash
const saved = localStorage.getItem(KEY);
if (saved) document.documentElement.dataset.theme = saved;

export function useTheme() {
  const [theme, setTheme] = useState(
    () =>
      document.documentElement.dataset.theme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"),
  );

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
    setTheme(next);
  };

  return [theme, toggle];
}
