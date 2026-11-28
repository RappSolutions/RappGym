import { describe, expect, it } from "vitest";
import { sortAdminUsers, type AdminUserListRow } from "@/lib/admin-user-list";

function user(id: string, values: Partial<AdminUserListRow> = {}): AdminUserListRow {
  return {
    id,
    name: id,
    email: `${id}@example.com`,
    lastSignIn: null,
    workouts: 0,
    sets: 0,
    aiRequestsThisMonth: 0,
    paidUntil: null,
    ...values,
  };
}

describe("admin user list sorting", () => {
  it("sorts by the person's displayed name without mutating the query result", () => {
    const users = [user("b", { name: "Östen" }), user("a", { name: "Anna" })];
    const sorted = sortAdminUsers(users, "name", "asc", "sv-SE");
    expect(sorted.map((u) => u.id)).toEqual(["a", "b"]);
    expect(users.map((u) => u.id)).toEqual(["b", "a"]);
  });

  it("sorts numeric training and current-month AI values in descending order", () => {
    const users = [
      user("a", { workouts: 2, sets: 20, aiRequestsThisMonth: 1 }),
      user("b", { workouts: 10, sets: 3, aiRequestsThisMonth: 12 }),
    ];
    expect(sortAdminUsers(users, "workouts", "desc", "en-GB").map((u) => u.id)).toEqual(["b", "a"]);
    expect(sortAdminUsers(users, "sets", "desc", "en-GB").map((u) => u.id)).toEqual(["a", "b"]);
    expect(sortAdminUsers(users, "aiRequestsThisMonth", "desc", "en-GB").map((u) => u.id)).toEqual(["b", "a"]);
  });

  it("uses ISO chronology and keeps missing sign-in or membership dates last", () => {
    const users = [
      user("none"),
      user("old", { lastSignIn: "2026-01-02T10:00:00Z", paidUntil: "2026-01-31" }),
      user("new", { lastSignIn: "2026-11-28T09:00:00Z", paidUntil: "2027-01-31" }),
    ];
    expect(sortAdminUsers(users, "lastSignIn", "desc", "en-GB").map((u) => u.id)).toEqual(["new", "old", "none"]);
    expect(sortAdminUsers(users, "lastSignIn", "asc", "en-GB").map((u) => u.id)).toEqual(["old", "new", "none"]);
    expect(sortAdminUsers(users, "paidUntil", "desc", "en-GB").map((u) => u.id)).toEqual(["new", "old", "none"]);
  });
});
