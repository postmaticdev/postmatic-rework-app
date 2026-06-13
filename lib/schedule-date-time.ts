import { dateManipulation } from "@/helper/date-manipulation";

export function getNextSchedulableDate(date = new Date()) {
  const nextDate = new Date(date);
  nextDate.setSeconds(0, 0);
  nextDate.setMinutes(nextDate.getMinutes() + 1);
  return nextDate;
}

export function formatScheduleTimeInput(date: Date) {
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

export function getCurrentScheduleInput(date = new Date()) {
  const nextDate = getNextSchedulableDate(date);

  return {
    date: dateManipulation.ymd(nextDate),
    time: formatScheduleTimeInput(nextDate),
  };
}
