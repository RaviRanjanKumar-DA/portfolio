// Job duration from "Mon YYYY" strings, counted inclusively (Aug 2018 – Nov 2020 = 2 yrs 4 mos), like LinkedIn.
const M = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function parse(s, now) {
  if (/present|current|now/i.test(String(s))) {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(now);
    return Number(p.find((x) => x.type === "year").value) * 12 + Number(p.find((x) => x.type === "month").value) - 1;
  }
  const m = String(s).trim().toLowerCase().match(/^([a-z]{3})[a-z]*\.?\s+(\d{4})$/);
  return m && m[1] in M ? Number(m[2]) * 12 + M[m[1]] : null;
}

export function monthsBetween(start, end, now = new Date()) {
  const a = parse(start, now), b = parse(end, now);
  return a === null || b === null || b < a ? null : b - a + 1;
}

export function formatMonths(n) {
  if (!n) return "";
  const y = Math.floor(n / 12), m = n % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}

export const durationLabel = (start, end, now = new Date()) => formatMonths(monthsBetween(start, end, now));
