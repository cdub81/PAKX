export const CALENDAR_SERVER_TIME_ZONE = "Etc/GMT+2";
export const CALENDAR_SERVER_TIME_LABEL = "UTC-2";
export const CALENDAR_TIME_INPUT_MODES = [
  { id: "server", label: `Server Time (${CALENDAR_SERVER_TIME_LABEL})` },
  { id: "local", label: "My Local Time" }
];
export const CALENDAR_WHEEL_ITEM_HEIGHT = 40;
export const CALENDAR_WEEKDAY_OPTIONS = [
  { code: "sun", label: "Sun", index: 0 },
  { code: "mon", label: "Mon", index: 1 },
  { code: "tue", label: "Tue", index: 2 },
  { code: "wed", label: "Wed", index: 3 },
  { code: "thu", label: "Thu", index: 4 },
  { code: "fri", label: "Fri", index: 5 },
  { code: "sat", label: "Sat", index: 6 }
];
export const CALENDAR_TIME_ZONE_SUGGESTIONS = [
  "UTC",
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Seoul"
];
export const MAX_CALENDAR_EXPANSION_DAYS = 120;

export function startOfLocalDay(value = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseLocalDateKey(value);
  }
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatLocalDateKey(value = new Date()) {
  const date = startOfLocalDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(value) {
  const [year, month, day] = String(value || "").split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return startOfLocalDay();
  }
  return new Date(year, month - 1, day);
}

export function formatLocalDateTimeInput(value = new Date()) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toIsoDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || "") : date.toISOString();
}

export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function normalizeCalendarTimeZone(value) {
  const timeZone = String(value || "").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function formatTwoDigits(value) {
  return String(Number.parseInt(String(value || "0"), 10) || 0).padStart(2, "0");
}

export function formatTimeValueFromParts(hours, minutes) {
  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}`;
}

export function formatDateKeyFromParts(parts) {
  return `${String(parts.year).padStart(4, "0")}-${formatTwoDigits(parts.month)}-${formatTwoDigits(parts.day)}`;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }
  const [year, month, day] = String(value).split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) {
    return false;
  }
  return day >= 1 && day <= getDaysInMonth(year, month);
}

export function formatCalendarDateButtonLabel(dateKey, language) {
  if (!isValidDateKey(dateKey)) {
    return "";
  }
  return parseLocalDateKey(dateKey).toLocaleDateString(language || undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function getServerTimeZone() {
  return CALENDAR_SERVER_TIME_ZONE;
}

export function getServerTimeLabel() {
  return CALENDAR_SERVER_TIME_LABEL;
}

export function getCalendarWeekdayLabel(code, language) {
  const option = CALENDAR_WEEKDAY_OPTIONS.find((entry) => entry.code === code);
  if (!option) return code;
  try {
    return new Intl.DateTimeFormat(language || undefined, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + option.index)));
  } catch {
    return option.label;
  }
}

export function convertUtcIsoToTimeZoneDateAndTime(isoValue, timeZone) {
  const parts = getTimeZoneDateParts(isoValue, timeZone);
  return {
    dateKey: formatDateKeyFromParts(parts),
    timeValue: formatTimeValueFromParts(parts.hour, parts.minute)
  };
}

export function buildCalendarTimedPreview(startDateKey, startTime, endDateKey, endTime, inputMode, localTimeZone) {
  if (!startDateKey || !endDateKey || !startTime) {
    return null;
  }
  const sourceTimeZone = inputMode === "server" ? getServerTimeZone() : normalizeCalendarTimeZone(localTimeZone || getDeviceTimeZone());
  const startIso = toUtcIsoFromTimeZone(startDateKey, startTime, sourceTimeZone);
  const endIso = endTime ? toUtcIsoFromTimeZone(endDateKey, endTime, sourceTimeZone) : null;
  if (!endIso) {
    return null;
  }
  if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
    return null;
  }
  const serverStart = convertUtcIsoToTimeZoneDateAndTime(startIso, getServerTimeZone());
  const localStart = convertUtcIsoToTimeZoneDateAndTime(startIso, normalizeCalendarTimeZone(localTimeZone || getDeviceTimeZone()));
  const serverEnd = endIso ? convertUtcIsoToTimeZoneDateAndTime(endIso, getServerTimeZone()) : null;
  const localEnd = endIso ? convertUtcIsoToTimeZoneDateAndTime(endIso, normalizeCalendarTimeZone(localTimeZone || getDeviceTimeZone())) : null;
  return {
    startsAt: startIso,
    endAt: endIso,
    serverStartDate: serverStart.dateKey,
    serverStartTime: serverStart.timeValue,
    serverEndDate: serverEnd ? serverEnd.dateKey : "",
    serverEndTime: serverEnd ? serverEnd.timeValue : "",
    serverDisplay: `${serverStart.dateKey} ${serverStart.timeValue}${serverEnd ? ` - ${serverEnd.dateKey === serverStart.dateKey ? serverEnd.timeValue : `${serverEnd.dateKey} ${serverEnd.timeValue}`}` : ""} (${getServerTimeLabel()})`,
    localDisplay: `${localStart.dateKey} ${localStart.timeValue}${localEnd ? ` - ${localEnd.dateKey === localStart.dateKey ? localEnd.timeValue : `${localEnd.dateKey} ${localEnd.timeValue}`}` : ""}`
  };
}

export function getLinkableCalendarEvents(events) {
  return (events || []).filter((event) => event.status !== "archived");
}

export function buildDesertStormCalendarLinkSeed(event) {
  return {
    entryType: "linked_desert_storm",
    linkedType: "desertStorm",
    linkedEventId: event?.id || ""
  };
}

export function buildZombieSiegeCalendarLinkSeed(event) {
  return {
    entryType: "linked_zombie_siege",
    linkedType: "zombieSiege",
    linkedEventId: event?.id || ""
  };
}

export function resolveCalendarLinkedEventId(entryType, selectedLinkedEventId, desertStormEvents, zombieSiegeEvents, activeDesertStormEvent, selectedZombieSiegeEvent) {
  if (entryType === "linked_desert_storm") {
    return selectedLinkedEventId || activeDesertStormEvent?.id || getLinkableCalendarEvents(desertStormEvents)[0]?.id || "";
  }
  if (entryType === "linked_zombie_siege") {
    return selectedLinkedEventId || selectedZombieSiegeEvent?.id || getLinkableCalendarEvents(zombieSiegeEvents)[0]?.id || "";
  }
  return "";
}

export function addLocalDays(value, amount) {
  const date = startOfLocalDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

export function parseTimeValue(value) {
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

export function getTimeValueMinutes(value) {
  const parsed = parseTimeValue(value);
  if (!parsed) {
    return null;
  }
  return parsed.hours * 60 + parsed.minutes;
}

export function getTimeZoneDateParts(value, timeZone) {
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

export function toUtcIsoFromTimeZone(dateKey, timeValue, timeZone, dayOffset = 0) {
  const parsedTime = parseTimeValue(timeValue || "00:00") || { hours: 0, minutes: 0 };
  const shiftedDateKey = formatLocalDateKey(addLocalDays(parseLocalDateKey(dateKey), dayOffset));
  const [year, month, day] = shiftedDateKey.split("-").map((part) => Number.parseInt(part, 10));
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

export function formatCalendarTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function toggleWeekdaySelection(currentWeekdays, code) {
  const values = Array.isArray(currentWeekdays) ? currentWeekdays : [];
  return values.includes(code) ? values.filter((entry) => entry !== code) : [...values, code];
}

export function normalizeCalendarRecurrence(entry) {
  const recurrence = entry?.recurrence && typeof entry.recurrence === "object" ? entry.recurrence : {};
  const weekdays = Array.isArray(recurrence.weekdays)
    ? recurrence.weekdays.filter((value) => CALENDAR_WEEKDAY_OPTIONS.some((option) => option.code === value))
    : [];
  return {
    repeat: ["none", "daily", "every_other_day", "weekly", "custom_weekdays"].includes(recurrence.repeat) ? recurrence.repeat : "none",
    weekdays: CALENDAR_WEEKDAY_OPTIONS.map((option) => option.code).filter((code) => weekdays.includes(code)),
    endDate: /^\d{4}-\d{2}-\d{2}$/.test(String(recurrence.endDate || "").slice(0, 10)) ? String(recurrence.endDate).slice(0, 10) : ""
  };
}

export function clampCalendarWindowEndDateKey(startDateKey, endDateKey) {
  const startDate = parseLocalDateKey(startDateKey);
  const endDate = parseLocalDateKey(endDateKey);
  const maxEndDateKey = formatLocalDateKey(addLocalDays(startDate, MAX_CALENDAR_EXPANSION_DAYS));
  return formatLocalDateKey(endDate) > maxEndDateKey ? maxEndDateKey : formatLocalDateKey(endDate);
}

export function buildCalendarOccurrence(entry, occurrenceDateKey) {
  const recurrence = normalizeCalendarRecurrence(entry);
  if (entry.allDay !== false) {
    return {
      ...entry,
      occurrenceId: `${entry.id}:${occurrenceDateKey}`,
      sourceEntryId: entry.id,
      occurrenceDateKey,
      localDateKey: occurrenceDateKey,
      displayTime: "All day",
      startsAt: occurrenceDateKey,
      endAt: null,
      recurrence
    };
  }
  const timeZone = getServerTimeZone();
  const startTime = entry.serverStartTime || entry.startTime || "00:00";
  const baseOccurrenceDateKey = occurrenceDateKey || entry.serverStartDate || entry.startDate || "";
  const startIso = recurrence.repeat === "none" && entry.startsAt ? String(entry.startsAt) : toUtcIsoFromTimeZone(baseOccurrenceDateKey, startTime, timeZone);
  const durationMs = entry.endAt && entry.startsAt ? Math.max(0, new Date(entry.endAt).getTime() - new Date(entry.startsAt).getTime()) : 0;
  const endIso = entry.endAt
    ? (recurrence.repeat === "none" && entry.endAt ? String(entry.endAt) : new Date(new Date(startIso).getTime() + durationMs).toISOString())
    : null;
  const serverStart = convertUtcIsoToTimeZoneDateAndTime(startIso, getServerTimeZone());
  const localStart = convertUtcIsoToTimeZoneDateAndTime(startIso, getDeviceTimeZone());
  const serverEnd = endIso ? convertUtcIsoToTimeZoneDateAndTime(endIso, getServerTimeZone()) : null;
  const localEnd = endIso ? convertUtcIsoToTimeZoneDateAndTime(endIso, getDeviceTimeZone()) : null;
  return {
    ...entry,
    occurrenceId: `${entry.id}:${baseOccurrenceDateKey}`,
    sourceEntryId: entry.id,
    occurrenceDateKey: baseOccurrenceDateKey,
    localDateKey: formatLocalDateKey(startIso),
    displayTime: endIso ? `${formatCalendarTimeLabel(startIso)} - ${formatCalendarTimeLabel(endIso)}` : formatCalendarTimeLabel(startIso),
    serverDisplayTime: `${serverStart.timeValue}${serverEnd ? ` - ${serverEnd.timeValue}` : ""} (${getServerTimeLabel()})`,
    serverDisplayDateTime: `${serverStart.dateKey} ${serverStart.timeValue}${serverEnd ? ` - ${serverEnd.dateKey === serverStart.dateKey ? serverEnd.timeValue : `${serverEnd.dateKey} ${serverEnd.timeValue}`}` : ""} (${getServerTimeLabel()})`,
    localDisplayTime: `${localStart.timeValue}${localEnd ? ` - ${localEnd.timeValue}` : ""}`,
    localDisplayDateTime: `${localStart.dateKey} ${localStart.timeValue}${localEnd ? ` - ${localEnd.dateKey === localStart.dateKey ? localEnd.timeValue : `${localEnd.dateKey} ${localEnd.timeValue}`}` : ""}`,
    startsAt: startIso,
    endAt: endIso,
    recurrence
  };
}

export function expandCalendarEntries(entries, startDateKey, endDateKey) {
  const clampedEndDateKey = clampCalendarWindowEndDateKey(startDateKey, endDateKey);
  const paddedStartDateKey = formatLocalDateKey(addLocalDays(parseLocalDateKey(startDateKey), -1));
  const paddedEndDateKey = formatLocalDateKey(addLocalDays(parseLocalDateKey(clampedEndDateKey), 1));
  const expanded = [];
  (entries || []).forEach((entry) => {
    const recurrence = normalizeCalendarRecurrence(entry);
    const baseDateKey = (entry.allDay !== false ? entry.startDate : (entry.serverStartDate || entry.startDate)) || (entry.startsAt ? formatLocalDateKey(entry.startsAt) : "");
    if (!baseDateKey) {
      return;
    }
    const recurrenceEndDate = recurrence.endDate || "";
    const finalDateKey = recurrenceEndDate && recurrenceEndDate < paddedEndDateKey ? recurrenceEndDate : paddedEndDateKey;
    if (recurrence.repeat === "none") {
      const occurrence = buildCalendarOccurrence(entry, baseDateKey);
      if (occurrence.localDateKey >= startDateKey && occurrence.localDateKey <= endDateKey) {
        expanded.push(occurrence);
      }
      return;
    }
    if (recurrence.repeat === "daily" || recurrence.repeat === "every_other_day" || recurrence.repeat === "weekly") {
      const stepDays = recurrence.repeat === "every_other_day" ? 2 : recurrence.repeat === "weekly" ? 7 : 1;
      let cursor = parseLocalDateKey(baseDateKey);
      while (formatLocalDateKey(cursor) < paddedStartDateKey) {
        cursor = addLocalDays(cursor, stepDays);
      }
      while (formatLocalDateKey(cursor) <= finalDateKey) {
        const occurrence = buildCalendarOccurrence(entry, formatLocalDateKey(cursor));
        if (occurrence.localDateKey >= startDateKey && occurrence.localDateKey <= endDateKey) {
          expanded.push(occurrence);
        }
        cursor = addLocalDays(cursor, stepDays);
      }
      return;
    }
    if (recurrence.repeat === "custom_weekdays") {
      const selectedWeekdays = recurrence.weekdays.length ? recurrence.weekdays : [CALENDAR_WEEKDAY_OPTIONS[parseLocalDateKey(baseDateKey).getDay()].code];
      let cursor = parseLocalDateKey(paddedStartDateKey);
      while (formatLocalDateKey(cursor) <= finalDateKey) {
        const cursorKey = formatLocalDateKey(cursor);
        if (cursorKey >= baseDateKey) {
          const weekdayCode = CALENDAR_WEEKDAY_OPTIONS[cursor.getDay()]?.code;
          if (selectedWeekdays.includes(weekdayCode)) {
            const occurrence = buildCalendarOccurrence(entry, cursorKey);
            if (occurrence.localDateKey >= startDateKey && occurrence.localDateKey <= endDateKey) {
              expanded.push(occurrence);
            }
          }
        }
        cursor = addLocalDays(cursor, 1);
      }
    }
  });
  return expanded.sort((a, b) => {
    if (a.localDateKey !== b.localDateKey) {
      return String(a.localDateKey).localeCompare(String(b.localDateKey));
    }
    return String(a.startsAt || a.occurrenceDateKey).localeCompare(String(b.startsAt || b.occurrenceDateKey));
  });
}
