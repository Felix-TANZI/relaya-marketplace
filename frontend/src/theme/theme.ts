export type ThemeMode = "light" | "dark";

export function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}
