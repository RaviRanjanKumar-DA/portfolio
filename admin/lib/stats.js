// Dashboard aggregates, computed in the browser from applications + events.
import { istDate, istWeekStart, istDayStart } from "./time.js";

export const STATUSES = ["saved", "applied", "shortlisted", "interview", "offer", "joined", "rejected", "withdrawn", "no_response"];
export const PLATFORMS = ["Email", "Naukri", "LinkedIn", "Indeed", "Instahyre", "Foundit", "Company site", "Referral", "Other"];
const RANK = { applied: 1, shortlisted: 2, interview: 3, offer: 4, joined: 5 };
const RESPONSE = new Set(["shortlisted", "interview", "offer", "joined", "rejected"]);
export const FUNNEL = ["applied", "shortlisted", "interview", "offer", "joined"];

const isApplied = (a) => !!a.applied_at || a.status !== "saved";
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

export function computeStats(apps, events, { now = new Date().toISOString(), from = null } = {}) {
  const inRange = from ? apps.filter((a) => (a.applied_at || a.created_at) >= from) : apps;
  const evBy = new Map();
  for (const e of events) {
    if (!evBy.has(e.application_id)) evBy.set(e.application_id, []);
    evBy.get(e.application_id).push(e);
  }
  const maxRank = (a) => Math.max(isApplied(a) ? 1 : 0, RANK[a.status] || 0, ...(evBy.get(a.id) || []).map((e) => RANK[e.to_status] || 0));
  const responded = (a) => RESPONSE.has(a.status) || (evBy.get(a.id) || []).some((e) => RESPONSE.has(e.to_status));

  const applied = inRange.filter(isApplied);
  const resp = applied.filter(responded);
  const weekAgo = new Date(new Date(now).getTime() - 7 * 864e5).toISOString();

  const funnel = FUNNEL.map((key) => ({ key, count: applied.filter((a) => maxRank(a) >= RANK[key]).length }));
  const interviews = funnel[2].count;
  const offers = funnel[3].count;

  const byPlatform = {}, respByPlatform = {};
  for (const a of applied) {
    byPlatform[a.platform] = (byPlatform[a.platform] || 0) + 1;
    if (responded(a)) respByPlatform[a.platform] = (respByPlatform[a.platform] || 0) + 1;
  }
  const responseByPlatform = Object.fromEntries(Object.entries(byPlatform).map(([p, n]) => [p, pct(respByPlatform[p] || 0, n)]));

  const statusMix = Object.fromEntries(STATUSES.map((s) => [s, inRange.filter((a) => a.status === s).length]).filter(([, n]) => n));

  const delays = [];
  for (const a of resp) {
    const first = (evBy.get(a.id) || []).filter((e) => RESPONSE.has(e.to_status)).sort((x, y) => (x.created_at < y.created_at ? -1 : 1))[0];
    if (first && a.applied_at) delays.push((new Date(first.created_at) - new Date(a.applied_at)) / 864e5);
  }
  const avgDaysToResponse = delays.length ? Math.round((delays.reduce((s, d) => s + d, 0) / delays.length) * 10) / 10 : null;

  // last 12 IST weeks (Monday start), oldest first
  const thisWeek = istWeekStart(now);
  const weekly = [];
  for (let i = 11; i >= 0; i--) {
    const w = istDate(new Date(new Date(istDayStart(thisWeek)).getTime() - i * 7 * 864e5 + 6 * 3600e3).toISOString());
    weekly.push({ week: w, count: apps.filter((a) => a.applied_at && istWeekStart(a.applied_at) === w).length });
  }

  const today = istDate(now);
  const OPEN = new Set(["applied", "shortlisted", "interview"]);
  const followUps = apps
    .filter((a) => a.follow_up_at && OPEN.has(a.status) && istDate(a.follow_up_at) <= today)
    .map((a) => ({ ...a, overdue: istDate(a.follow_up_at) < today }))
    .sort((x, y) => (x.follow_up_at < y.follow_up_at ? -1 : 1));

  const roleCount = {};
  for (const a of applied) roleCount[a.role] = (roleCount[a.role] || 0) + 1;
  const topRoles = Object.entries(roleCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([role, count]) => ({ role, count }));

  return {
    kpis: {
      total: inRange.length,
      applied: applied.length,
      thisWeek: applied.filter((a) => a.applied_at && a.applied_at >= weekAgo).length,
      responseRate: pct(resp.length, applied.length),
      interviews,
      interviewRate: pct(interviews, applied.length),
      offers
    },
    funnel, byPlatform, responseByPlatform, statusMix, avgDaysToResponse, weekly, followUps, topRoles
  };
}
