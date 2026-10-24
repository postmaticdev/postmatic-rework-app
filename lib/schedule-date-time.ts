import { dateFormat } from "@/helper/date-format";
import { dateManipulation } from "@/helper/date-manipulation";

// Date whose local fields are the wall-clock time of `instant` in the business
// time zone (the backend reads publishAt as wall time in that zone). Falls back
// to the browser's local time when no time zone is known yet.
export function toBusinessWallDate(
  instant: Date,
  businessTimeZone?: string | null
) {
  const { date, time } = dateFormat.getWallDateTimeInTimeZone(
    instant,
    businessTimeZone
  );
  return new Date(`${date}T${time}`);
}

export function getNextSchedulableDate(
  date = new Date(),
  businessTimeZone?: string | null
) {
  const nextDate = toBusinessWallDate(date, businessTimeZone);
  nextDate.setSeconds(0, 0);
  nextDate.setMinutes(nextDate.getMinutes() + 1);
  return nextDate;
}

export function formatScheduleTimeInput(date: Date) {
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

export function getCurrentScheduleInput(
  date = new Date(),
  businessTimeZone?: string | null
) {
  const nextDate = getNextSchedulableDate(date, businessTimeZone);

  return {
    date: dateManipulation.ymd(nextDate),
    time: formatScheduleTimeInput(nextDate),
  };
}
