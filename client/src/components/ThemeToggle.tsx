import { useTheme } from "@/App";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light-marble";
  const label = isLight ? "Tema nero marmo" : "Tema bianco marmo";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`theme-toggle inline-flex items-center rounded-full border font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
        compact ? "gap-1 px-2 py-1.5 text-[10px]" : "gap-2 px-3 py-2 text-xs"
      }`}
    >
      <span className="theme-toggle__track relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full">
        <span
          className={`theme-toggle__thumb absolute h-4 w-4 rounded-full transition-transform ${
            isLight ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </span>
      {!compact && <span>{isLight ? "Bianco" : "Nero"}</span>}
      <span className="material-symbols-outlined text-sm">{isLight ? "light_mode" : "dark_mode"}</span>
    </button>
  );
}
