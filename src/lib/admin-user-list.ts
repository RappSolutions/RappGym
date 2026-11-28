export type AdminUserSortKey =
  | "name"
  | "lastSignIn"
  | "workouts"
  | "sets"
  | "aiRequestsThisMonth"
  | "paidUntil";

export type SortDirection = "asc" | "desc";

export type AdminUserListRow = {
  id: string;
  name: string;
  email: string;
  lastSignIn: string | null;
  workouts: number;
  sets: number;
  aiRequestsThisMonth: number;
  paidUntil: string | null;
};

function displayName(user: Pick<AdminUserListRow, "name" | "email">) {
  return user.name || user.email;
}

/** Sort a snapshot only; missing dates remain last in both directions. */
export function sortAdminUsers<T extends AdminUserListRow>(
  users: readonly T[],
  key: AdminUserSortKey,
  direction: SortDirection,
  locale: string,
): T[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...users].sort((a, b) => {
    let result = 0;
    if (key === "name") {
      result = displayName(a).localeCompare(displayName(b), locale, { sensitivity: "base" });
    } else if (key === "lastSignIn" || key === "paidUntil") {
      const left = a[key];
      const right = b[key];
      if (left === null && right !== null) return 1;
      if (left !== null && right === null) return -1;
      if (left !== null && right !== null) result = left.localeCompare(right) * factor;
    } else {
      result = (a[key] - b[key]) * factor;
    }
    return result || displayName(a).localeCompare(displayName(b), locale, { sensitivity: "base" }) || a.id.localeCompare(b.id);
  });
}
