import { formatISO } from "date-fns";

// Return the ISO formatted current date in UTC
export function getCurrentUTCTimestamp(): string {
  return formatISO(new Date());
}
