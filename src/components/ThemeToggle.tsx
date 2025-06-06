import { useEffect, useState } from "react";
import { Switch } from "./ui/switch";

const ThemeToggle = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setEnabled(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggle = () => {
    const newTheme = enabled ? "light" : "dark";
    setEnabled(!enabled);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm">Dark Mode</span>
      <Switch checked={enabled} onCheckedChange={toggle} />
    </div>
  );
};

export default ThemeToggle;
