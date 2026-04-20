// Indonesian date formatting
const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
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

// English date formatting
const englishDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

// Japanese date formatting
const japaneseDays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
const japaneseMonths = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
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

const japaneseDate = (date: Date) => {
  return `${japaneseDays[date.getDay()]} ${date.getDate()} ${
    japaneseMonths[date.getMonth()]
  } ${date.getFullYear()}`;
};

// i18n date formatting function
export const formatDateByLocale = (date: Date, locale: string) => {
  switch (locale) {
    case "en":
      return englishDate(date);
    case "jp":
      return japaneseDate(date);
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
