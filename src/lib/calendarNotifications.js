import { addLocalDays, expandCalendarEntries, formatLocalDateKey, startOfLocalDay } from "./calendarHelpers";

export const CALENDAR_NOTIFICATION_CHANNEL_ID = "calendar-events";
export const CALENDAR_NOTIFICATION_LOOKAHEAD_DAYS = 30;
export const CALENDAR_NOTIFICATION_STORAGE_PREFIX = "lwadmin-calendar-notifications";

export function getCalendarNotificationStorageKey(memberId) {
  return `${CALENDAR_NOTIFICATION_STORAGE_PREFIX}:${String(memberId || "guest")}`;
}

export function formatCalendarNotificationBody(entry) {
  if (!entry) {
    return "Your calendar event is starting.";
  }
  if (entry.localDisplayDateTime && entry.serverDisplayDateTime) {
    return `Local: ${entry.localDisplayDateTime} • Server: ${entry.serverDisplayDateTime}`;
  }
  if (entry.localDisplayTime && entry.serverDisplayTime) {
    return `Local: ${entry.localDisplayTime} • Server: ${entry.serverDisplayTime}`;
  }
  return entry.description || "Your calendar event is starting.";
}

export function buildCalendarNotificationCandidates(entries, now = new Date()) {
  const startDate = startOfLocalDay(now);
  const startDateKey = formatLocalDateKey(startDate);
  const endDateKey = formatLocalDateKey(addLocalDays(startDate, CALENDAR_NOTIFICATION_LOOKAHEAD_DAYS));
  const seen = new Set();

  return expandCalendarEntries(entries || [], startDateKey, endDateKey)
    .filter((entry) => entry && entry.allDay === false && entry.occurrenceId && entry.startsAt)
    .filter((entry) => {
      const startsAtMs = new Date(entry.startsAt).getTime();
      return Number.isFinite(startsAtMs) && startsAtMs > now.getTime() + 5000;
    })
    .filter((entry) => {
      if (seen.has(entry.occurrenceId)) {
        return false;
      }
      seen.add(entry.occurrenceId);
      return true;
    })
    .map((entry) => ({
      occurrenceId: entry.occurrenceId,
      sourceEntryId: entry.sourceEntryId || entry.id || "",
      title: entry.title || "Calendar Event",
      body: formatCalendarNotificationBody(entry),
      startsAt: entry.startsAt,
      localDisplayDateTime: entry.localDisplayDateTime || "",
      serverDisplayDateTime: entry.serverDisplayDateTime || ""
    }))
    .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
}
