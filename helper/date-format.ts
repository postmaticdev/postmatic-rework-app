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

const getDdMmYyyy = (date: Date) => {
  return new Date(date).toISOString().split("T")[0];
};

export const dateFormat = {
  indonesianDate,
  getHhMm,
  getDdMmYyyy,
};
