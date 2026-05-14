/**
 * DatePickerIT — Custom Italian date picker, design system coerente all'app.
 * - Formato display: GG/MM/AAAA  (italiano)
 * - Value: "YYYY-MM-DD" (standard ISO, compatibile con tutti gli handler esistenti)
 * - Settimana inizia da Lunedì
 * - Nomi mesi/giorni in italiano
 * - Design: rounded-2xl, stone #7c7266, bg #080808, marble surfaces
 */
import { useState, useRef, useEffect } from "react";

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const DAYS_IT_SHORT = ["Lu","Ma","Me","Gi","Ve","Sa","Do"];

function toDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-based: Mon=0 … Sun=6
function startDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay(); // 0=Sun,1=Mon...6=Sat
  return (d + 6) % 7;
}

interface DatePickerITProps {
  value: string;           // "YYYY-MM-DD" or ""
  onChange: (val: string) => void;
  min?: string;            // "YYYY-MM-DD" — dates before this are disabled
  className?: string;
  placeholder?: string;
  inputClassName?: string;
}

export default function DatePickerIT({
  value,
  onChange,
  min,
  className = "",
  placeholder = "GG/MM/AAAA",
  inputClassName = "",
}: DatePickerITProps) {
  const today = new Date();
  const initDate = value ? new Date(value + "T12:00:00") : today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T12:00:00");
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const iso = toISO(new Date(viewYear, viewMonth, day));
    onChange(iso);
    setOpen(false);
  }

  function isDisabled(day: number) {
    if (!min) return false;
    const iso = toISO(new Date(viewYear, viewMonth, day));
    return iso < min;
  }

  function isSelected(day: number) {
    return value === toISO(new Date(viewYear, viewMonth, day));
  }

  function isToday(day: number) {
    return toISO(new Date(viewYear, viewMonth, day)) === toISO(today);
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = startDayOfMonth(viewYear, viewMonth);
  // Build grid: cells before first day + actual days
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger input */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full text-left flex items-center gap-2 ${inputClassName}`}
      >
        <span className="material-symbols-outlined text-[#a8a29a] text-base flex-shrink-0">calendar_today</span>
        <span className={value ? "text-[#f5f2ea] font-medium" : "text-[#a8a29a]"}>
          {value ? toDisplay(value) : placeholder}
        </span>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          className="absolute z-50 top-full mt-2 left-0 bg-[#101010] rounded-2xl border border-[#303030]/60 shadow-xl overflow-hidden"
          style={{ minWidth: "280px" }}
        >
          {/* Header: prev / Month Year / next */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#303030]/40">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#161616] transition-colors text-[#f5f2ea]"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <span className="font-bold text-sm font-headline text-[#f5f2ea]">
              {MONTHS_IT[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-[#161616] transition-colors text-[#f5f2ea]"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS_IT_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-[#a8a29a] py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const disabled = isDisabled(day);
              const selected = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => !disabled && selectDay(day)}
                  disabled={disabled}
                  className={`
                    w-9 h-9 mx-auto rounded-xl text-sm font-semibold transition-all
                    flex items-center justify-center
                    ${selected
                      ? "bg-[#7c7266] text-white shadow-md shadow-[#7c7266]/25"
                      : tod
                        ? "bg-[#7c7266]/8 text-[#c9c1b6] font-bold"
                        : disabled
                          ? "text-[#8c8478] cursor-not-allowed"
                          : "text-[#f5f2ea] hover:bg-[#7c7266]/8 hover:text-[#c9c1b6]"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
