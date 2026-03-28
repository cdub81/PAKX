const SERVER_TIME_ZONE = "Etc/GMT+2";
const SERVER_TIME_LABEL = "UTC-2";

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function getReminderServerTimeZone() {
  return SERVER_TIME_ZONE;
}

export function getReminderServerTimeLabel() {
  return SERVER_TIME_LABEL;
}

export function getReminderDeviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function normalizeReminderTimeZone(value) {
  const timeZone = String(value || "").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function parseReminderTimeValue(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return { hours, minutes };
}

export function formatReminderDateKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

export function isValidReminderDateKey(value) {
  const match = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseReminderDateKey(value) {
  const [year, month, day] = String(value || "").split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, month - 1, day);
}

function getTimeZoneDateParts(value, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(new Date(value));
  const lookup = {};
  parts.forEach((part) => {
    lookup[part.type] = part.value;
  });
  return {
    year: Number.parseInt(lookup.year || "0", 10),
    month: Number.parseInt(lookup.month || "0", 10),
    day: Number.parseInt(lookup.day || "0", 10),
    hour: Number.parseInt(lookup.hour || "0", 10),
    minute: Number.parseInt(lookup.minute || "0", 10),
    second: Number.parseInt(lookup.second || "0", 10)
  };
}

export function toUtcIsoFromReminderTimeZone(dateKey, timeValue, timeZone) {
  const parsedTime = parseReminderTimeValue(timeValue || "00:00") || { hours: 0, minutes: 0 };
  const [year, month, day] = String(dateKey).split("-").map((part) => Number.parseInt(part, 10));
  let guess = Date.UTC(year, month - 1, day, parsedTime.hours, parsedTime.minutes, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const actual = getTimeZoneDateParts(guess, timeZone);
    const desiredMs = Date.UTC(year, month - 1, day, parsedTime.hours, parsedTime.minutes, 0);
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second || 0);
    const diff = desiredMs - actualMs;
    if (diff === 0) {
      break;
    }
    guess += diff;
  }
  return new Date(guess).toISOString();
}

export function convertReminderUtcToTimeZoneDateTime(isoValue, timeZone) {
  const parts = getTimeZoneDateParts(isoValue, timeZone);
  return {
    dateKey: `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`,
    timeValue: `${pad2(parts.hour)}:${pad2(parts.minute)}`
  };
}

export function buildReminderSchedule({
  mode,
  title,
  notes,
  durationDays = 0,
  durationHours = 0,
  durationMinutes = 0,
  dateKey,
  timeValue,
  localTimeZone
}) {
  const normalizedMode = mode === "serverTime" || mode === "localTime" ? mode : "elapsed";
  const normalizedLocalTimeZone = normalizeReminderTimeZone(localTimeZone || getReminderDeviceTimeZone());
  if (normalizedMode === "elapsed") {
    const totalMinutes = Math.max(0, Number(durationDays) || 0) * 24 * 60 + Math.max(0, Number(durationHours) || 0) * 60 + Math.max(0, Number(durationMinutes) || 0);
    const scheduled = new Date(Date.now() + totalMinutes * 60 * 1000);
    const scheduledForUtc = scheduled.toISOString();
    const local = convertReminderUtcToTimeZoneDateTime(scheduledForUtc, normalizedLocalTimeZone);
    const server = convertReminderUtcToTimeZoneDateTime(scheduledForUtc, SERVER_TIME_ZONE);
    return {
      title: String(title || "").trim() || "Reminder",
      notes: String(notes || "").trim(),
      mode: "elapsed",
      durationDays: Math.max(0, Number(durationDays) || 0),
      durationHours: Math.max(0, Number(durationHours) || 0),
      durationMinutes: Math.max(0, Number(durationMinutes) || 0),
      scheduledForUtc,
      originalLocalDateTime: `${local.dateKey}T${local.timeValue}`,
      originalServerDateTime: `${server.dateKey}T${server.timeValue}`
    };
  }
  const sourceZone = normalizedMode === "serverTime" ? SERVER_TIME_ZONE : normalizedLocalTimeZone;
  const scheduledForUtc = toUtcIsoFromReminderTimeZone(dateKey, timeValue, sourceZone);
  const local = convertReminderUtcToTimeZoneDateTime(scheduledForUtc, normalizedLocalTimeZone);
  const server = convertReminderUtcToTimeZoneDateTime(scheduledForUtc, SERVER_TIME_ZONE);
  return {
    title: String(title || "").trim() || "Reminder",
    notes: String(notes || "").trim(),
    mode: normalizedMode,
    durationDays: 0,
    durationHours: 0,
    durationMinutes: 0,
    scheduledForUtc,
    originalLocalDateTime: `${local.dateKey}T${local.timeValue}`,
    originalServerDateTime: `${server.dateKey}T${server.timeValue}`
  };
}

export function formatReminderDateTimeDisplay(isoValue, timeZone, language) {
  const formatter = new Intl.DateTimeFormat(language || undefined, {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
  return formatter.format(new Date(isoValue));
}
