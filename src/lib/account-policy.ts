import { z } from "zod";
export const deleteAccountSchema = z.object({ confirmation: z.literal("DELETE") });
export const membershipSchema = z
  .object({
    userId: z.string().uuid(),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    stripeReference: z.string().trim().min(3).max(255),
  })
  .refine((d) => d.endsOn >= d.startsOn, "End precedes start");
export function membershipActive(startsOn: string, endsOn: string, today: string) {
  return startsOn <= today && today <= endsOn;
}
