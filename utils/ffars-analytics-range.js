import CustomError from "./custom-error.js";

const TZ_OFFSET_HOURS = 3;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
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

function pad(value) {
  return String(value).padStart(2, "0");
}

export function zonedParts(date = new Date()) {
  const shifted = new Date(date.getTime() + TZ_OFFSET_HOURS * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: WEEKDAYS[shifted.getUTCDay()],
  };
}

export function zonedStart(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, -TZ_OFFSET_HOURS, 0, 0, 0));
}

function addDays(parts, delta) {
  const utc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + delta));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function nextMonth(year, month) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function assertYear(year) {
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    throw new CustomError("Choose a year from 2020 onward.", 400);
  }
}

function assertMonth(month) {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new CustomError("Choose a month from 1 to 12.", 400);
  }
}

/**
 * FFARS timeline. Dates are Africa/Dar_es_Salaam civil days.
 * `to` is exclusive.
 */
export function parseFfarsAnalyticsRange(query = {}) {
  const now = zonedParts();
  const preset = String(query.preset || "month").toLowerCase();
  const year = query.year === undefined || query.year === "" ? null : Number(query.year);
  const month = query.month === undefined || query.month === "" ? null : Number(query.month);

  if (preset === "week") {
    const index = WEEKDAYS.indexOf(now.weekday);
    const mondayOffset = index === 0 ? 6 : index - 1;
    const start = addDays(now, -mondayOffset);
    const end = addDays(now, 1);
    return {
      preset: "week",
      bucket: "day",
      label: "This week",
      from: zonedStart(start.year, start.month, start.day),
      to: zonedStart(end.year, end.month, end.day),
    };
  }

  if (preset === "month") {
    const end = addDays(now, 1);
    return {
      preset: "month",
      bucket: "day",
      label: "This month",
      from: zonedStart(now.year, now.month, 1),
      to: zonedStart(end.year, end.month, end.day),
    };
  }

  if (preset === "year-month") {
    const selectedYear = year ?? now.year;
    const selectedMonth = month ?? now.month;
    assertYear(selectedYear);
    assertMonth(selectedMonth);
    if (selectedYear !== now.year) {
      throw new CustomError("Pick a month in the current year, or choose a past year.", 400);
    }
    if (selectedMonth > now.month) {
      throw new CustomError("That month has not started.", 400);
    }
    const end = nextMonth(selectedYear, selectedMonth);
    return {
      preset: "year-month",
      bucket: "day",
      label: `${MONTHS[selectedMonth - 1]} ${selectedYear}`,
      from: zonedStart(selectedYear, selectedMonth, 1),
      to: zonedStart(end.year, end.month, 1),
    };
  }

  if (preset === "year") {
    if (year == null || Number.isNaN(year)) {
      throw new CustomError("Choose a past year.", 400);
    }
    assertYear(year);
    if (year >= now.year) {
      throw new CustomError("Past years are before this year.", 400);
    }
    if (month == null || Number.isNaN(month)) {
      return {
        preset: "year",
        bucket: "month",
        label: String(year),
        from: zonedStart(year, 1, 1),
        to: zonedStart(year + 1, 1, 1),
      };
    }
    assertMonth(month);
    const end = nextMonth(year, month);
    return {
      preset: "year",
      bucket: "day",
      label: `${MONTHS[month - 1]} ${year}`,
      from: zonedStart(year, month, 1),
      to: zonedStart(end.year, end.month, 1),
    };
  }

  throw new CustomError("Choose this week, this month, a month this year, or a past year.", 400);
}

export function iterBucketKeys(from, to, bucket) {
  const keys = [];
  const last = zonedParts(new Date(to.getTime() - 1));
  if (bucket === "month") {
    let cursor = zonedParts(from);
    while (cursor.year < last.year || (cursor.year === last.year && cursor.month <= last.month)) {
      keys.push(`${cursor.year}-${pad(cursor.month)}-01`);
      const next = nextMonth(cursor.year, cursor.month);
      cursor = { ...cursor, year: next.year, month: next.month, day: 1 };
      if (keys.length > 24) break;
    }
    return keys;
  }

  let cursor = zonedParts(from);
  while (
    cursor.year < last.year ||
    (cursor.year === last.year && cursor.month < last.month) ||
    (cursor.year === last.year && cursor.month === last.month && cursor.day <= last.day)
  ) {
    keys.push(`${cursor.year}-${pad(cursor.month)}-${pad(cursor.day)}`);
    cursor = addDays(cursor, 1);
    if (keys.length > 400) break;
  }
  return keys;
}
