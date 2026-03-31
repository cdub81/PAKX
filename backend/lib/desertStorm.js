const SERVER_OFFSET_MINUTES = -120;
const SERVER_OFFSET_MS = SERVER_OFFSET_MINUTES * 60 * 1000;

function pad2(value) {
  return String(Number.parseInt(String(value || 0), 10) || 0).padStart(2, "0");
}

function formatDateKey(parts) {
  return `${String(parts.year).padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    throw new Error("A valid date key is required.");
  }
  return { year, month, day };
}

function getServerShiftedDateParts(value = new Date()) {
  const utcDate = value instanceof Date ? value : new Date(value);
  const shifted = new Date(utcDate.getTime() + SERVER_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay()
  };
}

function buildUtcIsoFromServerParts(year, month, day, hour = 0, minute = 0, second = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second) - SERVER_OFFSET_MS).toISOString();
}

function addDaysToDateKey(dateKey, deltaDays) {
  const base = parseDateKey(dateKey);
  const utcDate = new Date(Date.UTC(base.year, base.month - 1, base.day + deltaDays, 0, 0, 0));
  return formatDateKey({
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  });
}

function getDesertStormWeekKey(value = new Date()) {
  const parts = getServerShiftedDateParts(value);
  const daysSinceSaturday = (parts.weekday + 1) % 7;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - daysSinceSaturday, 0, 0, 0));
  return formatDateKey({
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate()
  });
}

function getDesertStormCycleForDate(value = new Date()) {
  const weekKey = getDesertStormWeekKey(value);
  const start = parseDateKey(weekKey);
  const wednesdayKey = addDaysToDateKey(weekKey, 4);
  const fridayKey = addDaysToDateKey(weekKey, 6);
  const friday = parseDateKey(fridayKey);
  const wednesday = parseDateKey(wednesdayKey);
  return {
    weekKey,
    votingOpenAt: buildUtcIsoFromServerParts(start.year, start.month, start.day, 0, 0, 0),
    votingCloseAt: buildUtcIsoFromServerParts(wednesday.year, wednesday.month, wednesday.day, 23, 59, 59),
    matchStartsAt: buildUtcIsoFromServerParts(friday.year, friday.month, friday.day, 23, 0, 0),
    matchDateKey: fridayKey
  };
}

function hasTimestampPassed(isoValue, now = new Date()) {
  if (!isoValue) {
    return false;
  }
  const target = new Date(isoValue).getTime();
  return !Number.isNaN(target) && target <= now.getTime();
}

module.exports = {
  getDesertStormCycleForDate,
  getDesertStormWeekKey,
  getServerShiftedDateParts,
  hasTimestampPassed
};
