import { format } from "date-fns";

/** Local "YYYY-MM-DD HH:mm" stamp for when a workout row was created. */
export function createdStamp(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd HH:mm");
}
