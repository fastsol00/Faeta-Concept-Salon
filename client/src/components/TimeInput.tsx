/**
 * TimeInput — always shows 24h HH:MM format regardless of browser locale.
 * Uses a plain text input with live validation to avoid AM/PM browser UI.
 */
import { useState, useEffect } from "react";

interface TimeInputProps {
  value: string;           // "HH:MM"
  onChange: (val: string) => void;
  className?: string;
  disabled?: boolean;
}

function isValidTime(s: string) {
  return /^\d{2}:\d{2}$/.test(s) && Number(s.split(":")[0]) < 24 && Number(s.split(":")[1]) < 60;
}

export default function TimeInput({ value, onChange, className = "", disabled = false }: TimeInputProps) {
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setError(false);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let v = e.target.value;
    // Auto-insert colon after 2 digits
    if (/^\d{2}$/.test(v) && draft.length < 3) v = v + ":";
    // Cap length at 5
    if (v.length > 5) return;
    setDraft(v);
    if (isValidTime(v)) {
      setError(false);
      onChange(v);
    } else {
      setError(v.length === 5);
    }
  }

  function handleBlur() {
    if (!isValidTime(draft)) {
      setDraft(value ?? "");
      setError(false);
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      placeholder="HH:MM"
      maxLength={5}
      className={`${className} ${error ? "ring-2 ring-red-400/40" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    />
  );
}
