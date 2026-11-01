const indonesianDays = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const indonesianMonths = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const englishDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const englishMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const indonesianDate = (date: Date) => {
  return `${indonesianDays[date.getDay()]} ${date.getDate()} ${
    indonesianMonths[date.getMonth()]
  } ${date.getFullYear()}`;
};

const englishDate = (date: Date) => {
  return `${englishDays[date.getDay()]} ${date.getDate()} ${
    englishMonths[date.getMonth()]
  } ${date.getFullYear()}`;
};

export const formatDateByLocale = (date: Date, locale: string) => {
  switch (locale) {
    case "en":
      return englishDate(date);
    case "id":
    default:
      return indonesianDate(date);
  }
};

const getHhMm = (date: Date) => {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
};

// Local calendar date (YYYY-MM-DD), consistent with getHhMm which is local time.
// toISOString() would return the UTC date and shift early-morning times a day back.
const getDdMmYyyy = (date: Date) => {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Wall-clock date ("YYYY-MM-DD") and time ("HH:mm") of an instant in the given
// IANA time zone (e.g. the business time zone). Falls back to the browser's
// local time when no/an invalid time zone is given.
const getWallDateTimeInTimeZone = (date: Date, timeZone?: string | null) => {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(date);
      const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value || "";
      return {
        date: `${get("year")}-${get("month")}-${get("day")}`,
        time: `${get("hour")}:${get("minute")}`,
      };
    } catch {
      // invalid time zone -> fall back to local time
    }
  }
  return { date: getDdMmYyyy(date), time: getHhMm(date) };
};

export const dateFormat = {
  indonesianDate,
  getHhMm,
  getDdMmYyyy,
  getWallDateTimeInTimeZone,
};
