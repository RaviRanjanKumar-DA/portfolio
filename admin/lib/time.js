// IST (Asia/Kolkata) formatting. Data is stored as UTC ISO strings.
const TZ = "Asia/Kolkata";

function parts(iso, opts) {
  const o = {};
  for (const p of new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).formatToParts(new Date(iso))) o[p.type] = p.value;
  return o;
}

export function fmtIST(iso) {
  if (!iso) return "—";
  const p = parts(iso, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${String(p.dayPeriod).toUpperCase()}`;
}

export function fmtISTDate(iso) {
  if (!iso) return "—";
  const p = parts(iso, { day: "2-digit", month: "short", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}`;
}

// "YYYY-MM-DD" of the IST calendar day
export function istDate(iso) {
  if (!iso) return "";
  const p = parts(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${p.year}-${p.month}-${p.day}`;
}

// IST calendar day "YYYY-MM-DD" → UTC ISO of IST midnight
export function istDayStart(day) {
  return new Date(`${day}T00:00:00+05:30`).toISOString();
}

// Monday (IST) of the week containing iso, as "YYYY-MM-DD"
export function istWeekStart(iso) {
  const d = new Date(istDayStart(istDate(iso)));
  const dow = new Date(`${istDate(iso)}T12:00:00Z`).getUTCDay(); // 0 = Sun
  return istDate(new Date(d.getTime() - ((dow + 6) % 7) * 864e5 + 6 * 3600e3).toISOString());
}
