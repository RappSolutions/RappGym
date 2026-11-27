/** Pure AI quota rules; the database (ai_quota_status) supplies the inputs. */
export type QuotaSource = "admin" | "blocked" | "custom" | "tier";
export type AiQuotaStatus = { tierId: string; tierName: string; quota: number | null; used: number; isBlocked: boolean; isAdmin: boolean; source: QuotaSource; periodStart: string; periodEnd: string };

/** Only admins are unlimited; a missing non-admin quota falls back to a finite 30. */
export function quotaAllowed(s: Pick<AiQuotaStatus, "quota" | "used" | "isBlocked" | "isAdmin">): boolean {
  if (s.isAdmin) return true;
  if (s.isBlocked) return false;
  return s.used < (s.quota ?? 30);
}

export function quotaRemaining(s: Pick<AiQuotaStatus, "quota" | "used" | "isBlocked" | "isAdmin">): number | null {
  if (s.isAdmin) return null;
  if (s.isBlocked) return 0;
  return Math.max(0, (s.quota ?? 30) - s.used);
}

export function mapQuotaRow(r: { tier_id: string; tier_name: string; quota: number | null; used: number; is_blocked: boolean; is_admin: boolean; source: string; period_start: string; period_end: string }): AiQuotaStatus {
  return { tierId: r.tier_id, tierName: r.tier_name, quota: r.quota, used: r.used, isBlocked: r.is_blocked, isAdmin: r.is_admin, source: r.source as QuotaSource, periodStart: r.period_start, periodEnd: r.period_end };
}

/** ISO month key (YYYY-MM) in UTC. */
export function monthKey(iso: string): string { return iso.slice(0, 7); }

/** Last n ISO months ending with the month of `today` (YYYY-MM-DD), oldest first. */
export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y!, m! - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}
