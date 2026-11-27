import { z } from "zod";
import { addMonths, format, parseISO } from "date-fns";
export const deleteAccountSchema = z.object({ confirmation: z.literal("DELETE") });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid date");
export const membershipSchema = z
  .object({
    userId: z.string().uuid(),
    startsOn: isoDate,
    endsOn: isoDate,
    stripeReference: z.string().trim().max(255).refine((v) => v === "" || v.length >= 3).default(""),
    note: z.string().trim().max(255).default(""),
  })
  .refine((d) => d.endsOn >= d.startsOn, "End precedes start");
export function membershipActive(startsOn: string, endsOn: string, today: string) {
  return startsOn <= today && today <= endsOn;
}
export function membershipEndDate(today: string, months: 1 | 3 | 12) {
  return format(addMonths(parseISO(today), months), "yyyy-MM-dd");
}
