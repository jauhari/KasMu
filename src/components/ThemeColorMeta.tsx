"use client";

import { useEffect } from "react";
import { useTheme } from "./ThemeProvider";

const THEME_COLORS: Record<string, string> = {
  dark: "#050507",
  light: "#fafafa",
};

export default function ThemeColorMeta() {
  const { theme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.dark);
    }
  }, [theme]);

  return null;
}
