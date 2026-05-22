const DAYS_IT_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const DAYS_IT_LONG = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const MONTHS_IT_LONG = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const MONTHS_IT_SHORT = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toLocalDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function formatDateLabelShort(dateString: string) {
  const date = parseLocalDate(dateString);
  return `${DAYS_IT_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_IT_LONG[date.getMonth()]}`;
}

export function formatDateLabelCompact(dateString: string) {
  const date = parseLocalDate(dateString);
  return `${DAYS_IT_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_IT_SHORT[date.getMonth()]}`;
}

export function formatDateLabelLong(dateString: string) {
  const date = parseLocalDate(dateString);
  return `${DAYS_IT_LONG[date.getDay()]}, ${date.getDate()} ${MONTHS_IT_LONG[date.getMonth()]} ${date.getFullYear()}`;
}
