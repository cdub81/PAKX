import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AppBackHeader as SharedAppBackHeader, AppCard as SharedAppCard, BottomSheetModal as SharedBottomSheetModal, ListRow as SharedListRow, PrimaryButton as SharedPrimaryButton, ScreenContainer as SharedScreenContainer, SectionHeader as SharedSectionHeader, SecondaryButton as SharedSecondaryButton, StatusBadge as SharedStatusBadge } from "./src/components/ui/primitives";
import { CalendarDatePickerModal as SharedCalendarDatePickerModal, CalendarTimePickerModal as SharedCalendarTimePickerModal, ReminderDurationPickerModal as SharedReminderDurationPickerModal } from "./src/components/Pickers";
import { LanguageSelector as SharedLanguageSelector, RankSelector as SharedRankSelector } from "./src/components/Selectors";
import { FeedbackScreen } from "./src/screens/FeedbackScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { DesertStormScreen } from "./src/screens/DesertStormScreen";
import { EventsHubScreen } from "./src/screens/EventsHubScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LeaderControlsScreen } from "./src/screens/LeaderControlsScreen.js";
import { MembersScreen } from "./src/screens/MembersScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { RemindersScreen } from "./src/screens/RemindersScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ZombieSiegeScreen } from "./src/screens/ZombieSiegeScreen";
import { DESIGN_TOKENS } from "./src/theme/designSystem";
import { addFeedback as addFeedbackRequest, addFeedbackComment as addFeedbackCommentRequest, addMember, approveJoinRequest, archiveDesertStormEvent as archiveDesertStormEventRequest, beginDesertStormEditing as beginDesertStormEditingRequest, closeDesertStormVote as closeDesertStormVoteRequest, createAccount, createAlliance, createCalendarEntry as createCalendarEntryRequest, createDesertStormEvent as createDesertStormEventRequest, createReminder as createReminderRequest, createZombieSiegeEvent as createZombieSiegeEventRequest, deleteCalendarEntry as deleteCalendarEntryRequest, deleteDesertStormEvent as deleteDesertStormEventRequest, deleteReminder as deleteReminderRequest, discardZombieSiegeDraft as discardZombieSiegeDraftRequest, endDesertStormEvent as endDesertStormEventRequest, endZombieSiegeEvent as endZombieSiegeEventRequest, getAllianceBroadcastPushHistory as getAllianceBroadcastPushHistoryRequest, getAlliancePreview, getAlliancePushReachability as getAlliancePushReachabilityRequest, getJoinRequests, getMe, getReminders as getRemindersRequest, joinAlliance, leaveAlliance, moveDesertStormEventPlayer as moveDesertStormEventPlayerRequest, normalizeBaseUrl, openDesertStormVote as openDesertStormVoteRequest, publishDesertStormEvent as publishDesertStormEventRequest, publishZombieSiegePlan as publishZombieSiegePlanRequest, registerExpoPushToken as registerExpoPushTokenRequest, rejectJoinRequest, removeMember, reopenDesertStormVote as reopenDesertStormVoteRequest, runZombieSiegePlan as runZombieSiegePlanRequest, sendAllianceBroadcastPush as sendAllianceBroadcastPushRequest, signIn, submitDesertStormVote as submitDesertStormVoteRequest, submitZombieSiegeAvailability as submitZombieSiegeAvailabilityRequest, updateAllianceCode, updateCalendarEntry as updateCalendarEntryRequest, updateDesertStormEventSlot as updateDesertStormEventSlotRequest, updateMember, updateReminder as updateReminderRequest, updateZombieSiegeWaveOneReview as updateZombieSiegeWaveOneReviewRequest } from "./src/lib/api";
import { buildDashboard, buildTaskForceView, createPlayerOptions } from "./src/lib/roster";
import { buildReminderSchedule, formatReminderDateKey, formatReminderDateTimeDisplay, getReminderDeviceTimeZone, getReminderServerTimeLabel, getReminderServerTimeZone, isValidReminderDateKey, parseReminderTimeValue } from "./src/lib/reminders";
import { CALENDAR_SERVER_TIME_LABEL, CALENDAR_TIME_INPUT_MODES, CALENDAR_WEEKDAY_OPTIONS, CALENDAR_WHEEL_ITEM_HEIGHT, addLocalDays, buildCalendarTimedPreview, buildDesertStormCalendarLinkSeed, buildZombieSiegeCalendarLinkSeed, expandCalendarEntries, formatCalendarDateButtonLabel, formatLocalDateKey, formatLocalDateTimeInput, getDeviceTimeZone, getLinkableCalendarEvents, getServerTimeLabel, getTimeValueMinutes, isSameLocalDay, normalizeCalendarRecurrence, normalizeCalendarTimeZone, parseLocalDateKey, parseTimeValue, resolveCalendarLinkedEventId, startOfLocalDay, toIsoDateTime, toUtcIsoFromTimeZone } from "./src/lib/calendarHelpers";
import { buildCalendarNotificationCandidates, CALENDAR_NOTIFICATION_CHANNEL_ID, getCalendarNotificationStorageKey } from "./src/lib/calendarNotifications";
import { findCurrentDesertStormEvent, getAssignedPlayerNames, getDesertStormHistoryEvents, getDesertStormStatusLabel, getDesertStormViewState, getDesertStormVoteOptionLabel } from "./src/lib/desertStormHelpers";
import { formatReminderCountdown, formatReminderDuration } from "./src/lib/uiFormatters";

const DEFAULT_BACKEND_URL = "https://pakx-production.up.railway.app";
const SESSION_STORAGE_KEY = "lwadmin-session";
const LANGUAGE_STORAGE_KEY = "lwadmin-language";
const PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY = "lwadmin-push-notifications-prompt-dismissed";
const ALL_TABS = ["home", "calendar", "events", "reminders", "more"];
const emptyTaskForces = () => ({ taskForceA: { key: "taskForceA", label: "Task Force A", squads: [] }, taskForceB: { key: "taskForceB", label: "Task Force B", squads: [] } });
const isLeader = (rank) => rank === "R5" || rank === "R4";
const APP_VERSION = Application.nativeApplicationVersion || Constants.expoConfig?.version || "0.1.0";
const APP_BUILD = Application.nativeBuildVersion || Constants.nativeBuildVersion || (Platform.OS === "ios" ? String(Constants.expoConfig?.ios?.buildNumber || "") : String(Constants.expoConfig?.android?.versionCode || ""));
const RANK_OPTIONS = ["R5", "R4", "R3", "R2", "R1"];
const POWER_INPUT_HINT = "Please enter power value in millions. Ex. 12,700,000 = 12.7";
const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";

function repairMojibakeString(value) {
  const getMojibakeScore = (text) => {
    const matches = String(text ?? "").match(/Ã.|Â.|â€|â€¢|ðŸ|ìÂ|ëÂ|íÂ|êÂ|éÂ|áÂ|óÂ|úÂ/g);
    return matches ? matches.length : 0;
  };
  let current = String(value ?? "");
  for (let index = 0; index < 3; index += 1) {
    const currentScore = getMojibakeScore(current);
    if (!currentScore) {
      break;
    }
    try {
      const repaired = decodeURIComponent(escape(current));
      if (!repaired || repaired === current) {
        break;
      }
      const repairedScore = getMojibakeScore(repaired);
      if (repairedScore >= currentScore) {
        break;
      }
      current = repaired;
    } catch {
      break;
    }
  }
  return current;
}

function hasMojibake(value) {
  return /Ã.|Â.|â€|â€¢|ðŸ|ìÂ|ëÂ|íÂ|êÂ|éÂ|áÂ|óÂ|úÂ/.test(String(value ?? ""));
}

function repairMojibakeDeep(value) {
  if (Array.isArray(value)) {
    return value.map(repairMojibakeDeep);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, repairMojibakeDeep(entry)]));
  }
  return typeof value === "string" ? repairMojibakeString(value) : value;
}

const RAW_CALENDAR_TRANSLATIONS = {
  en: { title: "Alliance Calendar", hint: "Tap a day to see what is scheduled and what needs attention.", today: "Today", week: "Week", month: "Month", selectedDay: "Selected Day", noEventsScheduled: "No events scheduled", oneEventScheduled: "1 event scheduled", manyEventsScheduled: "{count} events scheduled", allDay: "All day", leaderOnly: "Leader Only", edit: "Edit", delete: "Delete", anchoredTo: "Anchored to {value}", linkedDesertStorm: "Linked to Desert Storm", linkedZombieSiege: "Linked to Zombie Siege", addedBy: "Added by {name}", nothingToday: "Nothing is scheduled for today.", tapAnotherDay: "Tap another day to review what is planned.", editEntry: "Edit Calendar Entry", addEntry: "Add Calendar Entry", manualEvent: "Manual Event", reminder: "Reminder", linkDesertStorm: "Link Desert Storm", linkZombieSiege: "Link Zombie Siege", eventTitle: "Event title", startDate: "Start Date", endDate: "End Date", chooseDate: "Choose Date", allDayEntry: "All-day entry", timeSpecificEntry: "Time-specific entry", startTime: "Start Time", endTime: "End Time", eventTimezone: "Event timezone (IANA, ex. America/Chicago)", chooseLinkedEvent: "Choose the linked event", repeat: "Repeat", noRepeat: "No Repeat", daily: "Daily", everyOtherDay: "Every Other Day", weekly: "Weekly", customWeekdays: "Custom Weekdays", repeatEndDate: "Repeat End Date", setRepeatEndDate: "Set Repeat End Date", clearRepeatEndDate: "Clear End Date", reminderPlaceholder: "What should members remember to do?", manualPlaceholder: "What should members know or do?", leaderNotes: "Leader-only notes", timezoneHint: "Timed entries are anchored to {value} and shown in each member's local time.", visibleToEveryone: "Visible To Everyone", leaderOnlyEntry: "Leader Only Entry", saveChanges: "Save Changes", addToCalendar: "Add To Calendar", cancelEditing: "Cancel Editing", repeatsDaily: "Repeats daily", repeatsEveryOtherDay: "Repeats every other day", repeatsWeekly: "Repeats weekly", repeatsWeekdays: "Repeats {value}", inputMode: "Enter Time As", inputModeHint: "Choose whether you are entering the time in server time or your own local time.", serverInputMode: "Server Time (UTC-2)", localInputMode: "My Local Time", timePreview: "Before You Save", previewEnteredAs: "Entered as {value}", serverTime: "Server Time", localTime: "My Local Time", memberLocalTime: "Your Local Time", recurringServerAnchor: "Recurring timed entries will follow Server Time (UTC-2).", pickStartTime: "Select Start Time", pickEndTime: "Select End Time", pickDate: "Select Date", chooseMonth: "Month", chooseDay: "Day", chooseYear: "Year", chooseHour: "Hour", chooseMinute: "Minute", done: "Done", dateRequiredError: "Choose a start date before saving.", endDateRequiredError: "Choose an end date before saving.", repeatEndDateError: "Choose a valid repeat end date or clear it.", startTimeRequiredError: "Choose a start time before saving.", endTimeRequiredError: "Choose an end time before saving.", endTimeInvalidError: "End time must be after start time" },
  ko: { title: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã¬ÂºÂ˜Ã«Â¦Â°Ã«ÂÂ”", hint: "Ã«Â‚Â Ã¬Â§ÂœÃ«Â¥Â¼ Ã«ÂˆÂŒÃ«ÂŸÂ¬ Ã¬ÂÂ¼Ã¬Â Â•ÃªÂ³Â¼ Ã­Â•Â´Ã¬Â•Â¼ Ã­Â•Â  Ã¬ÂÂ¼Ã¬ÂÂ„ Ã­Â™Â•Ã¬ÂÂ¸Ã­Â•Â˜Ã¬Â„Â¸Ã¬ÂšÂ”.", today: "Ã¬Â˜Â¤Ã«ÂŠÂ˜", week: "Ã¬Â£Â¼ÃªÂ°Â„", month: "Ã¬Â›Â”ÃªÂ°Â„", selectedDay: "Ã¬Â„Â Ã­ÂƒÂÃ­Â•Âœ Ã«Â‚Â Ã¬Â§Âœ", noEventsScheduled: "Ã¬Â˜ÂˆÃ¬Â Â•Ã«ÂÂœ Ã¬ÂÂ¼Ã¬Â Â•Ã¬ÂÂ´ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤", oneEventScheduled: "Ã¬ÂÂ¼Ã¬Â Â• 1ÃªÂ°Âœ", manyEventsScheduled: "Ã¬ÂÂ¼Ã¬Â Â• {count}ÃªÂ°Âœ", allDay: "Ã­Â•Â˜Ã«Â£Â¨ Ã¬Â¢Â…Ã¬ÂÂ¼", leaderOnly: "Ã«Â¦Â¬Ã«ÂÂ” Ã¬Â Â„Ã¬ÂšÂ©", edit: "Ã¬ÂˆÂ˜Ã¬Â Â•", delete: "Ã¬Â‚Â­Ã¬Â Âœ", anchoredTo: "{value} ÃªÂ¸Â°Ã¬Â¤Â€", linkedDesertStorm: "Ã«ÂÂ°Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â°ÃªÂ³Â¼ Ã¬Â—Â°ÃªÂ²Â°Ã«ÂÂ¨", linkedZombieSiege: "Ã¬Â¢Â€Ã«Â¹Â„ Ã¬Â‹ÂœÃ¬Â¦ÂˆÃ¬Â™Â€ Ã¬Â—Â°ÃªÂ²Â°Ã«ÂÂ¨", addedBy: "{name} Ã«Â‹Â˜Ã¬ÂÂ´ Ã¬Â¶Â”ÃªÂ°Â€", nothingToday: "Ã¬Â˜Â¤Ã«ÂŠÂ˜ Ã¬Â˜ÂˆÃ¬Â Â•Ã«ÂÂœ Ã¬ÂÂ¼Ã¬Â Â•Ã¬ÂÂ´ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.", tapAnotherDay: "Ã«Â‹Â¤Ã«Â¥Â¸ Ã«Â‚Â Ã¬Â§ÂœÃ«Â¥Â¼ Ã«ÂˆÂŒÃ«ÂŸÂ¬ ÃªÂ³Â„Ã­ÂšÂÃ¬ÂÂ„ Ã­Â™Â•Ã¬ÂÂ¸Ã­Â•Â˜Ã¬Â„Â¸Ã¬ÂšÂ”.", editEntry: "Ã¬ÂºÂ˜Ã«Â¦Â°Ã«ÂÂ” Ã­Â•Â­Ã«ÂªÂ© Ã¬ÂˆÂ˜Ã¬Â Â•", addEntry: "Ã¬ÂºÂ˜Ã«Â¦Â°Ã«ÂÂ” Ã­Â•Â­Ã«ÂªÂ© Ã¬Â¶Â”ÃªÂ°Â€", manualEvent: "Ã¬ÂˆÂ˜Ã«ÂÂ™ Ã¬ÂÂ¼Ã¬Â Â•", reminder: "Ã«Â¦Â¬Ã«Â§ÂˆÃ¬ÂÂ¸Ã«ÂÂ”", linkDesertStorm: "Ã«ÂÂ°Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â° Ã¬Â—Â°ÃªÂ²Â°", linkZombieSiege: "Ã¬Â¢Â€Ã«Â¹Â„ Ã¬Â‹ÂœÃ¬Â¦Âˆ Ã¬Â—Â°ÃªÂ²Â°", eventTitle: "Ã¬ÂÂ´Ã«Â²Â¤Ã­ÂŠÂ¸ Ã¬Â ÂœÃ«ÂªÂ©", allDayEntry: "Ã­Â•Â˜Ã«Â£Â¨ Ã¬Â¢Â…Ã¬ÂÂ¼ Ã¬ÂÂ¼Ã¬Â Â•", timeSpecificEntry: "Ã¬Â‹ÂœÃªÂ°Â„ Ã¬Â§Â€Ã¬Â Â• Ã¬ÂÂ¼Ã¬Â Â•", startTime: "Ã¬Â‹ÂœÃ¬ÂžÂ‘ HH:MM", endTime: "Ã¬Â¢Â…Ã«Â£ÂŒ HH:MM", eventTimezone: "Ã¬ÂÂ´Ã«Â²Â¤Ã­ÂŠÂ¸ Ã¬Â‹ÂœÃªÂ°Â„Ã«ÂŒÂ€ (IANA, Ã¬Â˜Âˆ: America/Chicago)", chooseLinkedEvent: "Ã¬Â—Â°ÃªÂ²Â°Ã­Â•Â  Ã¬ÂÂ´Ã«Â²Â¤Ã­ÂŠÂ¸ Ã¬Â„Â Ã­ÂƒÂ", repeat: "Ã«Â°Â˜Ã«Â³Âµ", noRepeat: "Ã«Â°Â˜Ã«Â³Âµ Ã¬Â—Â†Ã¬ÂÂŒ", daily: "Ã«Â§Â¤Ã¬ÂÂ¼", everyOtherDay: "ÃªÂ²Â©Ã¬ÂÂ¼", weekly: "Ã«Â§Â¤Ã¬Â£Â¼", customWeekdays: "Ã¬ÂšÂ”Ã¬ÂÂ¼ Ã¬Â§Â€Ã¬Â Â•", repeatEndDate: "Ã«Â°Â˜Ã«Â³Âµ Ã¬Â¢Â…Ã«Â£ÂŒÃ¬ÂÂ¼ (Ã¬Â„Â Ã­ÂƒÂ YYYY-MM-DD)", reminderPlaceholder: "Ã«Â©Â¤Ã«Â²Â„Ã«Â“Â¤Ã¬ÂÂ´ Ã«Â¬Â´Ã¬Â—Â‡Ã¬ÂÂ„ ÃªÂ¸Â°Ã¬Â–ÂµÃ­Â•Â´Ã¬Â•Â¼ Ã­Â•Â˜Ã«Â‚Â˜Ã¬ÂšÂ”?", manualPlaceholder: "Ã«Â©Â¤Ã«Â²Â„Ã«Â“Â¤Ã¬Â—ÂÃªÂ²ÂŒ Ã«Â¬Â´Ã¬Â—Â‡Ã¬ÂÂ„ Ã¬Â•ÂŒÃ«Â Â¤Ã¬Â•Â¼ Ã­Â•Â˜Ã«Â‚Â˜Ã¬ÂšÂ”?", leaderNotes: "Ã«Â¦Â¬Ã«ÂÂ” Ã¬Â Â„Ã¬ÂšÂ© Ã«Â©Â”Ã«ÂªÂ¨", timezoneHint: "Ã¬Â‹ÂœÃªÂ°Â„ Ã¬Â§Â€Ã¬Â Â• Ã¬ÂÂ¼Ã¬Â Â•Ã¬ÂÂ€ {value} ÃªÂ¸Â°Ã¬Â¤Â€Ã¬ÂÂ´Ã«Â©Â°, ÃªÂ°Â Ã«Â©Â¤Ã«Â²Â„Ã¬ÂÂ˜ Ã­Â˜Â„Ã¬Â§Â€ Ã¬Â‹ÂœÃªÂ°Â„Ã¬ÂœÂ¼Ã«Â¡Âœ Ã­Â‘ÂœÃ¬Â‹ÂœÃ«ÂÂ©Ã«Â‹ÂˆÃ«Â‹Â¤.", visibleToEveryone: "Ã¬Â Â„Ã¬Â²Â´ ÃªÂ³ÂµÃªÂ°Âœ", leaderOnlyEntry: "Ã«Â¦Â¬Ã«ÂÂ” Ã¬Â Â„Ã¬ÂšÂ© Ã¬ÂÂ¼Ã¬Â Â•", saveChanges: "Ã«Â³Â€ÃªÂ²Â½ Ã¬Â Â€Ã¬ÂžÂ¥", addToCalendar: "Ã¬ÂºÂ˜Ã«Â¦Â°Ã«ÂÂ”Ã¬Â—Â Ã¬Â¶Â”ÃªÂ°Â€", cancelEditing: "Ã¬ÂˆÂ˜Ã¬Â Â• Ã¬Â·Â¨Ã¬Â†ÂŒ", repeatsDaily: "Ã«Â§Â¤Ã¬ÂÂ¼ Ã«Â°Â˜Ã«Â³Âµ", repeatsEveryOtherDay: "ÃªÂ²Â©Ã¬ÂÂ¼ Ã«Â°Â˜Ã«Â³Âµ", repeatsWeekly: "Ã«Â§Â¤Ã¬Â£Â¼ Ã«Â°Â˜Ã«Â³Âµ", repeatsWeekdays: "{value} Ã«Â°Â˜Ã«Â³Âµ", startDate: "시작 날짜", endDate: "종료 날짜", chooseDate: "날짜 선택", setRepeatEndDate: "반복 종료 날짜 설정", clearRepeatEndDate: "종료 날짜 지우기", inputModeHint: "서버 시간으로 입력할지 내 현지 시간으로 입력할지 선택하세요.", serverInputMode: "서버 시간 (UTC-2)", localInputMode: "내 현지 시간", localTime: "내 현지 시간", memberLocalTime: "내 현지 시간", recurringServerAnchor: "반복 시간 일정은 서버 시간 (UTC-2)을 따릅니다.", pickStartTime: "시작 시간 선택", pickEndTime: "종료 시간 선택", pickDate: "날짜 선택" },
  es: { title: "Calendario de la alianza", hint: "Toca un dÃƒÂ­a para ver lo programado y lo que requiere atenciÃƒÂ³n.", today: "Hoy", week: "Semana", month: "Mes", selectedDay: "DÃƒÂ­a seleccionado", noEventsScheduled: "No hay eventos programados", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Todo el dÃƒÂ­a", leaderOnly: "Solo lÃƒÂ­deres", edit: "Editar", delete: "Eliminar", anchoredTo: "Anclado a {value}", linkedDesertStorm: "Vinculado a Desert Storm", linkedZombieSiege: "Vinculado a Zombie Siege", addedBy: "Agregado por {name}", nothingToday: "No hay nada programado para hoy.", tapAnotherDay: "Toca otro dÃƒÂ­a para revisar lo planeado.", editEntry: "Editar entrada del calendario", addEntry: "Agregar entrada al calendario", manualEvent: "Evento manual", reminder: "Recordatorio", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "TÃƒÂ­tulo del evento", allDayEntry: "Evento de todo el dÃƒÂ­a", timeSpecificEntry: "Evento con hora", startTime: "Inicio HH:MM", endTime: "Fin HH:MM", eventTimezone: "Zona horaria del evento (IANA, ej. America/Chicago)", chooseLinkedEvent: "Elige el evento vinculado", repeat: "Repetir", noRepeat: "No repetir", daily: "Diario", everyOtherDay: "Cada dos dÃƒÂ­as", weekly: "Semanal", customWeekdays: "DÃƒÂ­as personalizados", repeatEndDate: "Fecha de fin de repeticiÃƒÂ³n (opcional YYYY-MM-DD)", reminderPlaceholder: "Ã‚Â¿QuÃƒÂ© deben recordar hacer los miembros?", manualPlaceholder: "Ã‚Â¿QuÃƒÂ© deben saber o hacer los miembros?", leaderNotes: "Notas solo para lÃƒÂ­deres", timezoneHint: "Las entradas con hora se anclan a {value} y se muestran en la hora local de cada miembro.", visibleToEveryone: "Visible para todos", leaderOnlyEntry: "Entrada solo para lÃƒÂ­deres", saveChanges: "Guardar cambios", addToCalendar: "Agregar al calendario", cancelEditing: "Cancelar ediciÃƒÂ³n", repeatsDaily: "Se repite a diario", repeatsEveryOtherDay: "Se repite cada dos dÃƒÂ­as", repeatsWeekly: "Se repite semanalmente", repeatsWeekdays: "Se repite {value}", startDate: "Fecha de inicio", endDate: "Fecha de fin", chooseDate: "Elegir fecha", setRepeatEndDate: "Definir fecha final de repetición", clearRepeatEndDate: "Borrar fecha final", inputModeHint: "Elige si vas a ingresar la hora en horario del servidor o en tu horario local.", serverInputMode: "Hora del servidor (UTC-2)", localInputMode: "Mi hora local", localTime: "Hora local", memberLocalTime: "Tu hora local", recurringServerAnchor: "Las entradas recurrentes con hora seguirán la hora del servidor (UTC-2).", pickStartTime: "Seleccionar hora de inicio", pickEndTime: "Seleccionar hora de fin", pickDate: "Seleccionar fecha" },
  pt: { title: "CalendÃƒÂ¡rio da alianÃƒÂ§a", hint: "Toque em um dia para ver o que estÃƒÂ¡ programado e o que precisa de atenÃƒÂ§ÃƒÂ£o.", today: "Hoje", week: "Semana", month: "MÃƒÂªs", selectedDay: "Dia selecionado", noEventsScheduled: "Nenhum evento programado", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Dia inteiro", leaderOnly: "Somente lÃƒÂ­deres", edit: "Editar", delete: "Excluir", anchoredTo: "Ancorado em {value}", linkedDesertStorm: "Vinculado ao Desert Storm", linkedZombieSiege: "Vinculado ao Zombie Siege", addedBy: "Adicionado por {name}", nothingToday: "Nada estÃƒÂ¡ programado para hoje.", tapAnotherDay: "Toque em outro dia para revisar o planejamento.", editEntry: "Editar entrada do calendÃƒÂ¡rio", addEntry: "Adicionar entrada ao calendÃƒÂ¡rio", manualEvent: "Evento manual", reminder: "Lembrete", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "TÃƒÂ­tulo do evento", allDayEntry: "Evento de dia inteiro", timeSpecificEntry: "Evento com horÃƒÂ¡rio", startTime: "InÃƒÂ­cio HH:MM", endTime: "Fim HH:MM", eventTimezone: "Fuso do evento (IANA, ex. America/Chicago)", chooseLinkedEvent: "Escolha o evento vinculado", repeat: "Repetir", noRepeat: "NÃƒÂ£o repetir", daily: "Diariamente", everyOtherDay: "Dia sim, dia nÃƒÂ£o", weekly: "Semanal", customWeekdays: "Dias personalizados", repeatEndDate: "Data final da repetiÃƒÂ§ÃƒÂ£o (opcional YYYY-MM-DD)", reminderPlaceholder: "O que os membros precisam lembrar de fazer?", manualPlaceholder: "O que os membros precisam saber ou fazer?", leaderNotes: "Notas apenas para lÃƒÂ­deres", timezoneHint: "Entradas com horÃƒÂ¡rio sÃƒÂ£o ancoradas em {value} e mostradas no horÃƒÂ¡rio local de cada membro.", visibleToEveryone: "VisÃƒÂ­vel para todos", leaderOnlyEntry: "Entrada sÃƒÂ³ para lÃƒÂ­deres", saveChanges: "Salvar alteraÃƒÂ§ÃƒÂµes", addToCalendar: "Adicionar ao calendÃƒÂ¡rio", cancelEditing: "Cancelar ediÃƒÂ§ÃƒÂ£o", repeatsDaily: "Repete diariamente", repeatsEveryOtherDay: "Repete em dias alternados", repeatsWeekly: "Repete semanalmente", repeatsWeekdays: "Repete {value}", startDate: "Data de início", endDate: "Data de término", chooseDate: "Escolher data", setRepeatEndDate: "Definir data final da repetição", clearRepeatEndDate: "Limpar data final", inputModeHint: "Escolha se você está informando o horário em horário do servidor ou no seu horário local.", serverInputMode: "Horário do servidor (UTC-2)", localInputMode: "Meu horário local", localTime: "Horário local", memberLocalTime: "Seu horário local", recurringServerAnchor: "Entradas recorrentes com horário seguirão o horário do servidor (UTC-2).", pickStartTime: "Selecionar horário de início", pickEndTime: "Selecionar horário de término", pickDate: "Selecionar data" }
};
const CALENDAR_TRANSLATIONS = {
  en: RAW_CALENDAR_TRANSLATIONS.en,
  ko: {
    title: "얼라이언스 캘린더",
    hint: "날짜를 눌러 일정과 확인이 필요한 항목을 보세요.",
    today: "오늘",
    week: "주간",
    month: "월간",
    selectedDay: "선택한 날짜",
    noEventsScheduled: "예정된 일정이 없습니다",
    oneEventScheduled: "일정 1개",
    manyEventsScheduled: "일정 {count}개",
    allDay: "하루 종일",
    leaderOnly: "리더 전용",
    edit: "수정",
    delete: "삭제",
    anchoredTo: "{value} 기준",
    linkedDesertStorm: "Desert Storm 연결됨",
    linkedZombieSiege: "Zombie Siege 연결됨",
    addedBy: "{name} 님이 추가",
    nothingToday: "오늘 예정된 일정이 없습니다.",
    tapAnotherDay: "다른 날짜를 눌러 계획을 확인하세요.",
    editEntry: "캘린더 항목 수정",
    addEntry: "캘린더 항목 추가",
    manualEvent: "수동 일정",
    reminder: "리마인더",
    linkDesertStorm: "Desert Storm 연결",
    linkZombieSiege: "Zombie Siege 연결",
    eventTitle: "이벤트 제목",
    startDate: "시작 날짜",
    endDate: "종료 날짜",
    chooseDate: "날짜 선택",
    allDayEntry: "하루 종일 일정",
    timeSpecificEntry: "시간 지정 일정",
    startTime: "시작 시간",
    endTime: "종료 시간",
    eventTimezone: "이벤트 시간대 (IANA, 예: America/Chicago)",
    chooseLinkedEvent: "연결할 이벤트 선택",
    repeat: "반복",
    noRepeat: "반복 없음",
    daily: "매일",
    everyOtherDay: "격일",
    weekly: "매주",
    customWeekdays: "요일 지정",
    repeatEndDate: "반복 종료 날짜",
    setRepeatEndDate: "반복 종료 날짜 설정",
    clearRepeatEndDate: "종료 날짜 지우기",
    reminderPlaceholder: "멤버들이 무엇을 기억해야 하나요?",
    manualPlaceholder: "멤버들에게 무엇을 알려야 하나요?",
    leaderNotes: "리더 전용 메모",
    timezoneHint: "시간 지정 일정은 {value} 기준이며 각 멤버의 현지 시간으로 표시됩니다.",
    visibleToEveryone: "전체 공개",
    leaderOnlyEntry: "리더 전용 일정",
    saveChanges: "변경 저장",
    addToCalendar: "캘린더에 추가",
    cancelEditing: "수정 취소",
    repeatsDaily: "매일 반복",
    repeatsEveryOtherDay: "격일 반복",
    repeatsWeekly: "매주 반복",
    repeatsWeekdays: "{value} 반복",
    inputMode: "시간 입력 방식",
    inputModeHint: "서버 시간으로 입력할지 내 현지 시간으로 입력할지 선택하세요.",
    serverInputMode: "서버 시간 (UTC-2)",
    localInputMode: "내 현지 시간",
    timePreview: "저장 전 미리보기",
    previewEnteredAs: "{value} 기준 입력",
    serverTime: "서버 시간",
    localTime: "내 현지 시간",
    memberLocalTime: "내 현지 시간",
    recurringServerAnchor: "반복 시간 일정은 서버 시간 (UTC-2)을 따릅니다.",
    pickStartTime: "시작 시간 선택",
    pickEndTime: "종료 시간 선택",
    pickDate: "날짜 선택",
    chooseMonth: "월",
    chooseDay: "일",
    chooseYear: "연도",
    chooseHour: "시",
    chooseMinute: "분",
    done: "완료",
    dateRequiredError: "저장하기 전에 시작 날짜를 선택하세요.",
    endDateRequiredError: "저장하기 전에 종료 날짜를 선택하세요.",
    repeatEndDateError: "유효한 반복 종료 날짜를 선택하거나 지우세요.",
    startTimeRequiredError: "저장하기 전에 시작 시간을 선택하세요.",
    endTimeRequiredError: "저장하기 전에 종료 시간을 선택하세요.",
    endTimeInvalidError: "종료 시간은 시작 시간 이후여야 합니다."
  },
  es: {
    title: "Calendario de la alianza",
    hint: "Toca un día para ver lo programado y lo que requiere atención.",
    today: "Hoy",
    week: "Semana",
    month: "Mes",
    selectedDay: "Día seleccionado",
    noEventsScheduled: "No hay eventos programados",
    oneEventScheduled: "1 evento programado",
    manyEventsScheduled: "{count} eventos programados",
    allDay: "Todo el día",
    leaderOnly: "Solo líderes",
    edit: "Editar",
    delete: "Eliminar",
    anchoredTo: "Anclado a {value}",
    linkedDesertStorm: "Vinculado a Desert Storm",
    linkedZombieSiege: "Vinculado a Zombie Siege",
    addedBy: "Agregado por {name}",
    nothingToday: "No hay nada programado para hoy.",
    tapAnotherDay: "Toca otro día para revisar lo planeado.",
    editEntry: "Editar entrada del calendario",
    addEntry: "Agregar entrada al calendario",
    manualEvent: "Evento manual",
    reminder: "Recordatorio",
    linkDesertStorm: "Vincular Desert Storm",
    linkZombieSiege: "Vincular Zombie Siege",
    eventTitle: "Título del evento",
    startDate: "Fecha de inicio",
    endDate: "Fecha de fin",
    chooseDate: "Elegir fecha",
    allDayEntry: "Evento de todo el día",
    timeSpecificEntry: "Entrada con horario",
    startTime: "Hora de inicio",
    endTime: "Hora de fin",
    eventTimezone: "Zona horaria del evento (IANA, ej. America/Chicago)",
    chooseLinkedEvent: "Elige el evento vinculado",
    repeat: "Repetir",
    noRepeat: "No repetir",
    daily: "Diario",
    everyOtherDay: "Cada dos días",
    weekly: "Semanal",
    customWeekdays: "Días personalizados",
    repeatEndDate: "Fecha final de repetición",
    setRepeatEndDate: "Definir fecha final de repetición",
    clearRepeatEndDate: "Borrar fecha final",
    reminderPlaceholder: "¿Qué deben recordar hacer los miembros?",
    manualPlaceholder: "¿Qué deben saber o hacer los miembros?",
    leaderNotes: "Notas solo para líderes",
    timezoneHint: "Las entradas con hora se anclan a {value} y se muestran en la hora local de cada miembro.",
    visibleToEveryone: "Visible para todos",
    leaderOnlyEntry: "Entrada solo para líderes",
    saveChanges: "Guardar cambios",
    addToCalendar: "Agregar al calendario",
    cancelEditing: "Cancelar edición",
    repeatsDaily: "Se repite a diario",
    repeatsEveryOtherDay: "Se repite cada dos días",
    repeatsWeekly: "Se repite semanalmente",
    repeatsWeekdays: "Se repite {value}",
    inputMode: "Ingresar hora como",
    inputModeHint: "Elige si vas a ingresar la hora en horario del servidor o en tu horario local.",
    serverInputMode: "Hora del servidor (UTC-2)",
    localInputMode: "Mi hora local",
    timePreview: "Antes de guardar",
    previewEnteredAs: "Ingresado como {value}",
    serverTime: "Hora del servidor",
    localTime: "Mi hora local",
    memberLocalTime: "Tu hora local",
    recurringServerAnchor: "Las entradas recurrentes con hora seguirán la hora del servidor (UTC-2).",
    pickStartTime: "Seleccionar hora de inicio",
    pickEndTime: "Seleccionar hora de fin",
    pickDate: "Seleccionar fecha",
    chooseMonth: "Mes",
    chooseDay: "Día",
    chooseYear: "Año",
    chooseHour: "Hora",
    chooseMinute: "Minuto",
    done: "Listo",
    dateRequiredError: "Elige una fecha de inicio antes de guardar.",
    endDateRequiredError: "Elige una fecha de fin antes de guardar.",
    repeatEndDateError: "Elige una fecha final válida o bórrala.",
    startTimeRequiredError: "Elige una hora de inicio antes de guardar.",
    endTimeRequiredError: "Elige una hora de fin antes de guardar.",
    endTimeInvalidError: "La hora de fin debe ser posterior a la hora de inicio"
  },
  pt: {
    title: "Calendário da aliança",
    hint: "Toque em um dia para ver o que está programado e o que precisa de atenção.",
    today: "Hoje",
    week: "Semana",
    month: "Mês",
    selectedDay: "Dia selecionado",
    noEventsScheduled: "Nenhum evento programado",
    oneEventScheduled: "1 evento programado",
    manyEventsScheduled: "{count} eventos programados",
    allDay: "Dia inteiro",
    leaderOnly: "Somente líderes",
    edit: "Editar",
    delete: "Excluir",
    anchoredTo: "Ancorado em {value}",
    linkedDesertStorm: "Vinculado ao Desert Storm",
    linkedZombieSiege: "Vinculado ao Zombie Siege",
    addedBy: "Adicionado por {name}",
    nothingToday: "Nada está programado para hoje.",
    tapAnotherDay: "Toque em outro dia para revisar o planejamento.",
    editEntry: "Editar entrada do calendário",
    addEntry: "Adicionar entrada ao calendário",
    manualEvent: "Evento manual",
    reminder: "Lembrete",
    linkDesertStorm: "Vincular Desert Storm",
    linkZombieSiege: "Vincular Zombie Siege",
    eventTitle: "Título do evento",
    startDate: "Data de início",
    endDate: "Data de término",
    chooseDate: "Escolher data",
    allDayEntry: "Evento de dia inteiro",
    timeSpecificEntry: "Entrada com horário",
    startTime: "Horário de início",
    endTime: "Horário de término",
    eventTimezone: "Fuso do evento (IANA, ex. America/Chicago)",
    chooseLinkedEvent: "Escolha o evento vinculado",
    repeat: "Repetir",
    noRepeat: "Não repetir",
    daily: "Diariamente",
    everyOtherDay: "Dia sim, dia não",
    weekly: "Semanal",
    customWeekdays: "Dias personalizados",
    repeatEndDate: "Data final da repetição",
    setRepeatEndDate: "Definir data final da repetição",
    clearRepeatEndDate: "Limpar data final",
    reminderPlaceholder: "O que os membros precisam lembrar de fazer?",
    manualPlaceholder: "O que os membros precisam saber ou fazer?",
    leaderNotes: "Notas apenas para líderes",
    timezoneHint: "Entradas com horário são ancoradas em {value} e mostradas no horário local de cada membro.",
    visibleToEveryone: "Visível para todos",
    leaderOnlyEntry: "Entrada só para líderes",
    saveChanges: "Salvar alterações",
    addToCalendar: "Adicionar ao calendário",
    cancelEditing: "Cancelar edição",
    repeatsDaily: "Repete diariamente",
    repeatsEveryOtherDay: "Repete em dias alternados",
    repeatsWeekly: "Repete semanalmente",
    repeatsWeekdays: "Repete {value}",
    inputMode: "Inserir horário como",
    inputModeHint: "Escolha se você está informando o horário em horário do servidor ou no seu horário local.",
    serverInputMode: "Horário do servidor (UTC-2)",
    localInputMode: "Meu horário local",
    timePreview: "Antes de salvar",
    previewEnteredAs: "Informado como {value}",
    serverTime: "Horário do servidor",
    localTime: "Meu horário local",
    memberLocalTime: "Seu horário local",
    recurringServerAnchor: "Entradas recorrentes com horário seguirão o horário do servidor (UTC-2).",
    pickStartTime: "Selecionar horário de início",
    pickEndTime: "Selecionar horário de término",
    pickDate: "Selecionar data",
    chooseMonth: "Mês",
    chooseDay: "Dia",
    chooseYear: "Ano",
    chooseHour: "Hora",
    chooseMinute: "Minuto",
    done: "Concluir",
    dateRequiredError: "Escolha uma data de início antes de salvar.",
    endDateRequiredError: "Escolha uma data de término antes de salvar.",
    repeatEndDateError: "Escolha uma data final válida ou limpe-a.",
    startTimeRequiredError: "Escolha um horário de início antes de salvar.",
    endTimeRequiredError: "Escolha um horário de término antes de salvar.",
    endTimeInvalidError: "O horário de término deve ser depois do horário de início"
  }
};
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" }
];
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});
const RAW_TRANSLATIONS = {
  en: {
    appTitle: "PAKX Alliance App",
    authSignIn: "Sign In",
    authCreateAccount: "Create Account",
    username: "Username",
    password: "Password",
    welcome: "Welcome, {name}",
    notInAlliance: "This account is not associated with an alliance yet.",
    joinAlliance: "Join Alliance",
    createAlliance: "Create Alliance",
    allianceName: "Alliance name",
    allianceCode: "Alliance code",
    previewAlliance: "Preview Alliance",
    foundAlliance: "Found: {name}",
    signOut: "Sign Out",
    joinRequestPending: "Join Request Pending",
    pendingApproval: "Your request is waiting for an R4 or R5 to approve it.",
    refreshStatus: "Refresh Status",
    language: "Language",
    signedInAs: "Signed in as {name} ({rank})",
    allianceCommand: "Alliance Command",
    playersWaiting: "{count} players are waiting for approval",
    onePlayerWaiting: "1 player is waiting for approval",
    tapReviewRequests: "Tap to review join requests in the Alliance tab.",
    restoringSession: "Restoring your session...",
    sessionExpired: "Your session expired. Please sign in again.",
    choosePlayer: "Choose Player",
    votedMembers: "Voted Members",
    entireAlliance: "Entire Alliance",
    showingAllAlliance: "Showing every member in the alliance for this slot.",
    searchNameOrRank: "Search name or rank",
    clearSelection: "Clear selection",
    noPlayersMatchSearch: "No players match that search.",
    noMembersMatchVoteFilter: "No members match this Desert Storm vote filter.",
    tabHome: "Home",
    tabCalendar: "Calendar",
    tabEvents: "Events",
    tabMore: "More",
    tabMyInfo: "My Info",
    tabMembers: "Members",
    tabReminders: "Reminders",
    tabAlliance: "Settings",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "DS History",
    tabFeedback: "Feedback",
    tabDashboard: "Dashboard",
    "picker.eyebrow": "Picker",
    "picker.reminderEyebrow": "Reminder",
    "picker.detail": "Set hours, minutes, and seconds for the countdown.",
    "picker.hour": "Hour",
    "picker.minute": "Minute",
    "picker.second": "Second",
    "picker.hours": "Hours",
    "picker.minutes": "Minutes",
    "picker.seconds": "Seconds",
    "picker.month": "Month",
    "picker.day": "Day",
    "picker.year": "Year",
    "picker.done": "Done",
    feedbackTitle: "App Feedback",
    feedbackHint: "Share comments, bugs, and recommended updates with the alliance.",
    feedbackExample: "Example:\nI think the Desert Storm history tab should show power totals too.",
    submitFeedback: "Submit Feedback",
    allianceFeedback: "Alliance Feedback",
    noFeedback: "No feedback has been submitted yet.",
    feedbackFrom: "From {name} - {date}",
    allianceTitle: "Alliance",
    accountLabel: "Account: {value}",
    allianceLabel: "Alliance: {value}",
    codeLabel: "Code: {value}",
    signedInAsPlayer: "Signed in as: {value}",
    pendingJoinRequests: "Pending Join Requests",
    noPendingRequests: "No pending join requests.",
    requestedWithCode: "Requested with code {code}",
    approve: "Approve",
    reject: "Reject",
    rotateCode: "Rotate Code",
    updateCode: "Update Code",
    addMember: "Add Member",
    name: "Name",
    rank: "Rank",
    power: "Power",
    memberOptions: "Member Options",
    leaveAnyTime: "You can leave this alliance at any time.",
    leaveAlliance: "Leave Alliance",
    leaveAllianceTitle: "Leave Alliance",
    leaveAllianceConfirm: "Are you sure you want to leave this alliance?",
    cancel: "Cancel",
    leave: "Leave",
    signedInPlayer: "Signed-In Player",
    totalBasePower: "Total Base Power",
    heroPower: "Hero Power",
    totalSquadPower: "Total Squad Power",
    desertStormTitle: "Desert Storm",
    selectedForDesertStorm: "Selected for Desert Storm",
    notCurrentlyAssigned: "Not currently assigned",
    taskForceLabel: "Task Force: {value}",
    squadLabel: "Squad: {value}",
    slotLabel: "Slot: {value}",
    notListedInTaskForces: "You are not currently listed in Task Force A or Task Force B.",
    desertStormRecord: "Desert Storm Record",
    lockInsPlayed: "{count} Desert Storm's Played",
    noLockedHistoryYet: "No locked Desert Storm history yet",
    appearancesWillShow: "Once leaders lock in a Desert Storm layout, your appearances will show here.",
    basePowerSection: "Base Power",
    squadPowerBreakdown: "Squad Power Breakdown",
    squadNumber: "Squad {number}",
    resultPending: "Pending",
    resultWin: "Win",
    resultLoss: "Loss",
    "common.back": "Back",
    "common.cancel": "Cancel",
    "settings.title": "Settings",
    "settings.hero.eyebrow": "Settings",
    "settings.hero.description": "Manage account context, app preferences, alerts, and alliance controls from grouped sections.",
    "settings.hero.statusLeader": "Leader Access",
    "settings.hero.statusMember": "Member Access",
    "settings.hero.statusStable": "Stable",
    "settings.hero.statusPending": "{count} Pending",
    "settings.account.eyebrow": "Account",
    "settings.account.title": "Signed-in context",
    "settings.account.description": "Current account, alliance, and player identity are grouped here for quick reference.",
    "settings.account.accountLabel": "Account: {value}",
    "settings.account.allianceLabel": "Alliance: {value}",
    "settings.account.codeLabel": "Code: {value}",
    "settings.account.playerLabel": "Signed in as: {value}",
    "settings.notifications.eyebrow": "Notifications",
    "settings.notifications.title": "Alert preferences",
    "settings.notifications.description": "Manage personal alert preferences without changing existing reminder or event logic.",
    "settings.notifications.desertStormVoteAlerts.title": "Desert Storm vote alerts",
    "settings.notifications.desertStormVoteAlerts.enabled": "Enabled for your account.",
    "settings.notifications.desertStormVoteAlerts.disabled": "Disabled for your account.",
    "settings.notifications.dig.title": "Dig notifications",
    "settings.notifications.dig.enabled": "Enabled for your account.",
    "settings.notifications.dig.disabled": "Opted out for your account.",
    "settings.notifications.badgeEnabled": "Enabled",
    "settings.notifications.badgeDisabled": "Disabled",
    "settings.notifications.enablePush.title": "Enable push notifications",
    "settings.notifications.enablePush.description": "Turn on device notifications to receive Desert Storm vote alerts on this device.",
    "settings.notifications.enablePush.button": "Enable Notifications",
    "settings.notifications.enablePush.buttonLoading": "Enabling...",
    "settings.notifications.enablePush.alertTitle": "Enable notifications",
    "settings.notifications.enablePush.alertDescription": "Push notifications were not enabled. You can try again later on this screen.",
    "settings.preferences.eyebrow": "Preferences",
    "settings.language.title": "Language",
    "settings.language.description": "Update app-level preferences without changing alliance data.",
    "settings.appControls.eyebrow": "App Controls",
    "settings.session.title": "Session and device actions",
    "settings.session.description": "Keep account-level controls separated from alliance management actions.",
    "settings.session.signOut": "Sign Out",
    "settings.requests.eyebrow": "Requests",
    "settings.requests.title": "Pending Join Requests",
    "settings.requests.description": "Approve or reject new join requests without leaving the settings workflow.",
    "settings.requests.requestedWithCode": "Requested with code {code}",
    "settings.requests.emptyTitle": "No pending join requests.",
    "settings.requests.emptyDescription": "New join requests will appear here when they are ready for review.",
    "settings.requests.approve": "Approve",
    "settings.requests.reject": "Reject",
    "settings.alliance.eyebrow": "Alliance",
    "settings.alliance.rotateCode": "Rotate Code",
    "settings.alliance.description": "Rotate or update the alliance code with a single clear action.",
    "settings.alliance.updateCode": "Update Code",
    "settings.roster.eyebrow": "Roster",
    "settings.roster.title": "Add Member",
    "settings.roster.description": "Leaders can add members directly from settings without changing roster behavior.",
    "settings.roster.namePlaceholder": "Name",
    "settings.roster.powerPlaceholder": "Power",
    "settings.roster.powerHint": "Please enter power value in millions. Ex. 12,700,000 = 12.7",
    "settings.roster.addMember": "Add Member",
    "settings.danger.eyebrow": "Danger Zone",
    "settings.danger.title": "Member Options",
    "settings.danger.description": "Important account and alliance actions are isolated here so they stay clear but restrained.",
    "settings.danger.leaveAnyTime": "You can leave this alliance at any time.",
    "settings.danger.leaveTitle": "Leave Alliance",
    "settings.danger.leaveConfirm": "Are you sure you want to leave this alliance?",
    "settings.danger.leaveButton": "Leave Alliance",
    "more.selected.eyebrow": "More",
    "more.selected.description": "Use More for secondary destinations without adding extra top-level tabs.",
    "more.root.eyebrow": "More",
    "more.root.title": "More Tools",
    "more.root.description": "Open secondary destinations from a clean vertical list.",
    "more.badgeOpen": "Open",
    "more.badgeLeader": "Leader",
    "more.badgeAction": "Action",
    "more.settings.description": "Account context, notifications, preferences, and alliance controls.",
    "more.feedback.title": "Feedback",
    "more.feedback.description": "Submit app notes and review recent feedback history.",
    "more.leaderControls.title": "Leader Controls",
    "more.leaderControls.description": "Open leader-only tools, including alliance-wide broadcast controls.",
    "more.members.title": "Members",
    "more.members.description": "Review and edit the alliance roster.",
    "more.members.requestsWaiting": "{count} join requests waiting for leader review.",
    "common.member": "Member",
    "common.delete": "Delete",
    "home.title": "Home",
    "home.memberFallback": "Member",
    "home.signedIn": "Signed in",
    "home.activeOperations": "Active Operations",
    "home.recentActivity": "Recent Activity",
    "home.today": "Today",
    "home.todayDetail": "Today's agenda and current operation context.",
    "home.allDay": "All day",
    "home.scheduled": "Scheduled",
    "home.nothingToday": "Nothing is scheduled for today.",
    "home.zombieSiegeCurrent": "Zombie Siege: {title}",
    "home.powerEyebrow": "Power",
    "home.personalPower": "Personal power",
    "home.personalPowerDetail": "Update your own power values without changing calculation behavior.",
    "home.totalPower": "Total Power",
    "home.heroPower": "Hero Power",
    "home.squadTotal": "Squad Total",
    "home.squadPlaceholder": "Squad {number}",
    "home.desertStorm.responseNeeded": "Response needed",
    "home.desertStorm.voteSubmitted": "Vote submitted",
    "home.desertStorm.teamsPublished": "Teams published",
    "home.desertStorm.idle": "Idle",
    "home.desertStorm.taskForceFallback": "task force",
    "home.desertStorm.assignedTo": "Assigned to {value}",
    "home.desertStorm.teamsPublishedDetail": "Teams are published for members.",
    "home.desertStorm.voteWaitingDetail": "Your vote is in. Wait for leaders to publish the roster.",
    "home.desertStorm.voteOpenDetail": "Voting is open. Respond before the Wednesday cutoff.",
    "home.desertStorm.noAssignmentPublished": "No current assignment published.",
    "members.operationalRoster": "Operational roster",
    "members.operationalRosterDetail": "Search, filter, and manage alliance members without changing roster logic.",
    "members.visible": "Visible",
    "members.totalPower": "Total Power",
    "members.heroPower": "Hero Power",
    "members.squadTotal": "Squad Total",
    "members.filters": "Filters",
    "members.rosterControls": "Roster controls",
    "members.rosterControlsDetail": "Keep the list tight and focused while preserving the existing search and sort rules.",
    "members.sortRank": "Rank",
    "members.sortName": "Name",
    "members.allRanks": "All Ranks",
    "members.totalPowerShort": "Total {value}M",
    "members.heroPowerShort": "Hero {value}M",
    "members.dsCount": "{count} DS",
    "members.dsPlayed": "Desert Storm Played",
    "members.dsMissed": "Desert Storm Missed",
    "members.editMember": "Edit Member",
    "members.memberName": "Member name",
    "members.saveChanges": "Save Changes",
    "members.noMembersFound": "No members found",
    "members.noMembersHint": "Try another search or rank filter.",
    "members.removeTitle": "Remove Member",
    "members.removeConfirm": "Are you sure you want to remove {name} from the alliance?",
    "members.removeButton": "Remove",
    "feedback.section": "Feedback",
    "feedback.entriesCount": "{count} entries",
    "feedback.noEntriesBadge": "No entries",
    "feedback.submitSection": "Submit",
    "feedback.shareTitle": "Share feedback",
    "feedback.shareDetail": "Send clear notes to the alliance team without changing the existing submission flow.",
    "feedback.currentBuild": "Current Build",
    "feedback.recentSection": "Recent",
    "feedback.historyDetail": "Recent feedback and follow-up comments stay readable in a single history stream.",
    "feedback.commentCount": "{count} comments",
    "feedback.noCommentsYet": "No comments yet.",
    "feedback.addComment": "Add a comment",
    "feedback.commentButton": "Comment",
    "feedback.noFeedbackTitle": "No feedback yet",
    "events.selected.eyebrow": "Events",
    "events.selected.description": "Review the selected event workflow without changing the top-level navigation.",
    "events.root.eyebrow": "Events",
    "events.root.title": "Active Event Workflows",
    "events.root.description": "Open the current Desert Storm or Zombie Siege workflow from one shared event hub.",
    "events.cardEyebrow": "Event",
    "events.operational": "Operational",
    "events.desertStorm.title": "Desert Storm",
    "events.desertStorm.description": "Vote, publish teams, and review the current Desert Storm event.",
    "events.desertStorm.open": "Open Desert Storm",
    "events.zombieSiege.title": "Zombie Siege",
    "events.zombieSiege.description": "Open the current Zombie Siege planning and roster workflow.",
    "events.zombieSiege.open": "Open Zombie Siege",
    "reminders.title": "Active reminders",
    "reminders.description": "Operational reminders",
    "reminders.activeCount": "{count} active",
    "reminders.createEyebrow": "Create",
    "reminders.newReminder": "New reminder",
    "reminders.newReminderDetail": "The reminder fires on this device using the existing local notification flow.",
    "reminders.titlePlaceholder": "Reminder title",
    "reminders.notesPlaceholder": "Optional notes",
    "reminders.modeElapsed": "After Duration",
    "reminders.modeAtLocal": "At Local Time",
    "reminders.modeAtServer": "At Server Time",
    "reminders.modeServerTime": "Server time ({value})",
    "reminders.modeLocalTime": "Local time",
    "reminders.durationLabel": "Duration: {value}",
    "reminders.elapsedHint": "The countdown starts when you tap Create Reminder.",
    "reminders.dateLabel": "Date: {value}",
    "reminders.timeLabel": "Time: {value}",
    "reminders.serverTimeHint": "This reminder will be anchored to server time ({value}).",
    "reminders.preview": "Preview",
    "reminders.createButton": "Create Reminder",
    "reminders.activeEyebrow": "Active",
    "reminders.activeTitle": "Active reminders",
    "reminders.activeDetail": "Upcoming reminders that still have scheduled local notifications.",
    "reminders.noActiveTitle": "No active reminders",
    "reminders.noActiveDetail": "Create a reminder to start tracking your next action window.",
    "reminders.inactiveEyebrow": "History",
    "reminders.inactiveTitle": "Past and cancelled",
    "reminders.inactiveDetail": "Completed or cancelled reminders stay here for quick review.",
    "reminders.nothingArchivedTitle": "No reminder history yet",
    "reminders.nothingArchivedDetail": "Completed and cancelled reminders will appear here.",
    "reminders.selectDuration": "Select duration",
    "reminders.selectDate": "Select date",
    "reminders.selectTime": "Select time",
    "reminders.errorDuration": "Choose a duration greater than zero.",
    "reminders.errorDate": "Choose a valid date.",
    "reminders.errorTime": "Choose a valid time.",
    "reminders.errorFuture": "Reminder time must be in the future.",
    "reminders.dueNow": "Due now",
    "reminders.fallbackTitle": "Reminder",
    "reminders.statusActive": "Active",
    "reminders.statusCancelled": "Cancelled",
    "reminders.statusCompleted": "Completed",
    "reminders.localTime": "Local Time",
    "reminders.serverTime": "Server Time ({value})",
    "reminders.repeat": "Repeat",
    "reminders.oneTime": "One-time",
    "calendar.screenEyebrow": "Calendar",
    "calendar.leaderControlsEyebrow": "Leader Controls",
    "calendar.leaderControlsDescription": "Create and update alliance calendar entries without changing the underlying event logic.",
    "calendar.timeEntryEyebrow": "Time Entry",
    "calendar.leaderFallback": "Leader",
    "leaderControls.hero.eyebrow": "Leader Controls",
    "leaderControls.hero.title": "Alliance Broadcasts",
    "leaderControls.hero.description": "Use leader-only tools to communicate quickly across the alliance without changing existing event workflows.",
    "leaderControls.hero.badgeLeaderOnly": "Leader Only",
    "leaderControls.hero.badgePushReady": "Push Ready",
    "leaderControls.hero.badgePushLimited": "Push Limited",
    "leaderControls.presets.eyebrow": "Quick Presets",
    "leaderControls.presets.title": "All-member shortcuts",
    "leaderControls.presets.description": "Use a preset when you need to notify the full alliance without typing a custom message.",
    "leaderControls.presets.digHint": "This preset sends the exact message `dig` to all members who have not opted out.",
    "leaderControls.presets.memberCount": "{count} Members",
    "leaderControls.presets.digButton": "Send \"dig\" to All Members",
    "leaderControls.common.sending": "Sending...",
    "leaderControls.reachability.eyebrow": "Push Reachability",
    "leaderControls.reachability.title": "Who can receive dig right now",
    "leaderControls.reachability.description": "Reachability depends on each member's dig preference plus whether this backend has a registered push token for their device.",
    "leaderControls.reachability.reachableMembers": "{count} reachable members",
    "leaderControls.reachability.reachableDevices": "{count} push-ready devices",
    "leaderControls.reachability.noToken": "{count} missing push setup",
    "leaderControls.reachability.optedOut": "{count} opted out",
    "leaderControls.reachability.noIssues": "Everyone currently looks reachable for dig notifications.",
    "leaderControls.reachability.noTokenTitle": "Missing push setup",
    "leaderControls.reachability.optedOutTitle": "Opted out of dig",
    "leaderControls.reachability.noTokenReason": "No push token saved yet",
    "leaderControls.reachability.optedOutReason": "Dig notifications turned off",
    "leaderControls.broadcast.eyebrow": "Push Notification",
    "leaderControls.broadcast.titleAll": "Send to all members",
    "leaderControls.broadcast.titleSelected": "Send to specific members",
    "leaderControls.broadcast.description": "Use the current alliance push flow, but choose whether this notification goes to everyone or only selected members.",
    "leaderControls.broadcast.audienceAll": "All Members",
    "leaderControls.broadcast.audienceSelected": "Specific Members",
    "leaderControls.broadcast.selectedTitle": "Selected Members",
    "leaderControls.broadcast.selectedCount": "{count} Selected",
    "leaderControls.broadcast.searchPlaceholder": "Search members by name or rank",
    "leaderControls.broadcast.memberSelected": "Selected",
    "leaderControls.broadcast.memberTapToAdd": "Tap to add",
    "leaderControls.broadcast.noMembersTitle": "No members found",
    "leaderControls.broadcast.noMembersDescription": "Adjust the search to find alliance members to notify.",
    "leaderControls.broadcast.messagePlaceholder": "Enter the note you want to send to the alliance.",
    "leaderControls.broadcast.selectedHint": "Only the selected members with registered push-enabled devices will receive this alert.",
    "leaderControls.broadcast.allHint": "This sends a direct alliance-wide alert using the current Expo push-token setup. Devices without registered push tokens will not receive it.",
    "leaderControls.broadcast.sendButton": "Send Push Notification",
    "leaderControls.history.eyebrow": "History",
    "leaderControls.history.title": "Recent Pushes",
    "leaderControls.history.openDetail": "Tap to hide recent push history.",
    "leaderControls.history.closedDetail": "Tap to open the recent push history folder.",
    "leaderControls.history.loggedCount": "{count} Logged",
    "leaderControls.history.emptyBadge": "Empty",
    "leaderControls.history.openBadge": "Open",
    "leaderControls.history.closedBadge": "Closed",
    "leaderControls.history.unknownTime": "Unknown time",
    "leaderControls.history.unknownSender": "Unknown sender",
    "leaderControls.history.audienceSelected": "Selected",
    "leaderControls.history.audienceAll": "All",
    "leaderControls.history.noMessage": "No message recorded",
    "leaderControls.history.oneDeviceTargeted": "1 device targeted",
    "leaderControls.history.devicesTargeted": "{count} devices targeted",
    "leaderControls.history.membersSelected": "{count} members selected",
    "leaderControls.history.noHistoryTitle": "No push history yet",
    "leaderControls.history.noHistoryDescription": "New broadcasts and dig presets will appear here after they are sent.",
  },
  ko: {
    appTitle: "PAKX Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã¬Â•Â±",
    authSignIn: "Ã«Â¡ÂœÃªÂ·Â¸Ã¬ÂÂ¸",
    authCreateAccount: "ÃªÂ³Â„Ã¬Â Â• Ã«Â§ÂŒÃ«Â“Â¤ÃªÂ¸Â°",
    username: "Ã¬Â‚Â¬Ã¬ÂšÂ©Ã¬ÂžÂ Ã¬ÂÂ´Ã«Â¦Â„",
    password: "Ã«Â¹Â„Ã«Â°Â€Ã«Â²ÂˆÃ­Â˜Â¸",
    welcome: "{name}Ã«Â‹Â˜, Ã­Â™Â˜Ã¬Â˜ÂÃ­Â•Â©Ã«Â‹ÂˆÃ«Â‹Â¤",
    notInAlliance: "Ã¬ÂÂ´ ÃªÂ³Â„Ã¬Â Â•Ã¬ÂÂ€ Ã¬Â•Â„Ã¬Â§Â Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤Ã¬Â—Â Ã¬Â—Â°ÃªÂ²Â°Ã«ÂÂ˜Ã¬Â–Â´ Ã¬ÂžÂˆÃ¬Â§Â€ Ã¬Â•ÂŠÃ¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    joinAlliance: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ ÃªÂ°Â€Ã¬ÂžÂ…",
    createAlliance: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã¬ÂƒÂÃ¬Â„Â±",
    allianceName: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã¬ÂÂ´Ã«Â¦Â„",
    allianceCode: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã¬Â½Â”Ã«Â“Âœ",
    previewAlliance: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã«Â¯Â¸Ã«Â¦Â¬Ã«Â³Â´ÃªÂ¸Â°",
    foundAlliance: "Ã¬Â°Â¾Ã¬ÂÂŒ: {name}",
    signOut: "Ã«Â¡ÂœÃªÂ·Â¸Ã¬Â•Â„Ã¬Â›Âƒ",
    joinRequestPending: "ÃªÂ°Â€Ã¬ÂžÂ… Ã¬ÂšÂ”Ã¬Â²Â­ Ã«ÂŒÂ€ÃªÂ¸Â° Ã¬Â¤Â‘",
    pendingApproval: "R4 Ã«Â˜ÂÃ«ÂŠÂ” R5Ã¬ÂÂ˜ Ã¬ÂŠÂ¹Ã¬ÂÂ¸Ã¬ÂÂ„ ÃªÂ¸Â°Ã«Â‹Â¤Ã«Â¦Â¬ÃªÂ³Â  Ã¬ÂžÂˆÃ¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    refreshStatus: "Ã¬ÂƒÂÃ­ÂƒÂœ Ã¬ÂƒÂˆÃ«Â¡ÂœÃªÂ³Â Ã¬Â¹Â¨",
    language: "Ã¬Â–Â¸Ã¬Â–Â´",
    signedInAs: "{name} ({rank})로 로그인됨",
    allianceCommand: "얼라이언스 지휘",
    playersWaiting: "{count}Ã«ÂªÂ…Ã¬ÂÂ˜ Ã­Â”ÂŒÃ«Â ÂˆÃ¬ÂÂ´Ã¬Â–Â´ÃªÂ°Â€ Ã¬ÂŠÂ¹Ã¬ÂÂ¸ Ã«ÂŒÂ€ÃªÂ¸Â° Ã¬Â¤Â‘Ã¬ÂžÂ…Ã«Â‹ÂˆÃ«Â‹Â¤",
    onePlayerWaiting: "1Ã«ÂªÂ…Ã¬ÂÂ˜ Ã­Â”ÂŒÃ«Â ÂˆÃ¬ÂÂ´Ã¬Â–Â´ÃªÂ°Â€ Ã¬ÂŠÂ¹Ã¬ÂÂ¸ Ã«ÂŒÂ€ÃªÂ¸Â° Ã¬Â¤Â‘Ã¬ÂžÂ…Ã«Â‹ÂˆÃ«Â‹Â¤",
    tapReviewRequests: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã­ÂƒÂ­Ã¬Â—ÂÃ¬Â„Âœ ÃªÂ°Â€Ã¬ÂžÂ… Ã¬ÂšÂ”Ã¬Â²Â­Ã¬ÂÂ„ Ã­Â™Â•Ã¬ÂÂ¸Ã­Â•Â˜Ã¬Â„Â¸Ã¬ÂšÂ”.",
    restoringSession: "세션을 복원하는 중...",
    sessionExpired: "Ã¬Â„Â¸Ã¬Â…Â˜Ã¬ÂÂ´ Ã«Â§ÂŒÃ«Â£ÂŒÃ«ÂÂ˜Ã¬Â—ÂˆÃ¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤. Ã«Â‹Â¤Ã¬Â‹Âœ Ã«Â¡ÂœÃªÂ·Â¸Ã¬ÂÂ¸Ã­Â•Â´ Ã¬Â£Â¼Ã¬Â„Â¸Ã¬ÂšÂ”.",
    choosePlayer: "플레이어 선택",
    votedMembers: "Ã­ÂˆÂ¬Ã­Â‘ÂœÃ­Â•Âœ Ã«Â©Â¤Ã«Â²Â„",
    entireAlliance: "Ã¬Â Â„Ã¬Â²Â´ Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤",
    showingAllAlliance: "Ã¬ÂÂ´ Ã¬ÂŠÂ¬Ã«Â¡Â¯Ã¬Â—Â Ã«ÂŒÂ€Ã­Â•Â´ Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã¬Â Â„Ã¬Â²Â´ Ã«Â©Â¤Ã«Â²Â„Ã«Â¥Â¼ Ã­Â‘ÂœÃ¬Â‹ÂœÃ­Â•Â©Ã«Â‹ÂˆÃ«Â‹Â¤.",
    searchNameOrRank: "이름 또는 등급 검색",
    clearSelection: "선택 해제",
    noPlayersMatchSearch: "ÃªÂ²Â€Ã¬ÂƒÂ‰ÃªÂ³Â¼ Ã¬ÂÂ¼Ã¬Â¹Â˜Ã­Â•Â˜Ã«ÂŠÂ” Ã­Â”ÂŒÃ«Â ÂˆÃ¬ÂÂ´Ã¬Â–Â´ÃªÂ°Â€ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    noMembersMatchVoteFilter: "Ã«Â”Â”Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â° Ã­ÂˆÂ¬Ã­Â‘Âœ Ã¬Â¡Â°ÃªÂ±Â´Ã¬Â—Â Ã«Â§ÂžÃ«ÂŠÂ” Ã«Â©Â¤Ã«Â²Â„ÃªÂ°Â€ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    tabHome: "홈",
    tabCalendar: "캘린더",
    tabEvents: "이벤트",
    tabMore: "더보기",
    tabMyInfo: "Ã«Â‚Â´ Ã¬Â Â•Ã«Â³Â´",
    tabMembers: "멤버",
    tabReminders: "리마인더",
    tabAlliance: "Ã¬Â„Â¤Ã¬Â Â•",
    tabTaskForceA: "Ã­ÂƒÂœÃ¬ÂŠÂ¤Ã­ÂÂ¬Ã­ÂÂ¬Ã¬ÂŠÂ¤ A",
    tabTaskForceB: "Ã­ÂƒÂœÃ¬ÂŠÂ¤Ã­ÂÂ¬Ã­ÂÂ¬Ã¬ÂŠÂ¤ B",
    tabDSHistory: "DS ÃªÂ¸Â°Ã«Â¡Â",
    tabFeedback: "Ã­Â”Â¼Ã«Â“ÂœÃ«Â°Â±",
    tabDashboard: "Ã«ÂŒÂ€Ã¬Â‹ÂœÃ«Â³Â´Ã«Â“Âœ",
    "picker.eyebrow": "선택기",
    "picker.reminderEyebrow": "리마인더",
    "picker.detail": "카운트다운의 시간, 분, 초를 설정하세요.",
    "picker.hour": "시",
    "picker.minute": "분",
    "picker.second": "초",
    "picker.hours": "시간",
    "picker.minutes": "분",
    "picker.seconds": "초",
    "picker.month": "월",
    "picker.day": "일",
    "picker.year": "연도",
    "picker.done": "완료",
    feedbackTitle: "앱 피드백",
    feedbackHint: "앱에 대한 의견, 버그, 개선 제안을 얼라이언스와 공유하세요.",
    feedbackExample: "예시:\nDesert Storm 기록 탭에 전투력 합계도 표시되면 좋겠습니다.",
    submitFeedback: "피드백 보내기",
    allianceFeedback: "얼라이언스 피드백",
    noFeedback: "Ã¬Â•Â„Ã¬Â§Â Ã«Â“Â±Ã«Â¡ÂÃ«ÂÂœ Ã­Â”Â¼Ã«Â“ÂœÃ«Â°Â±Ã¬ÂÂ´ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    feedbackFrom: "{name} - {date}",
    allianceTitle: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤",
    accountLabel: "ÃªÂ³Â„Ã¬Â Â•: {value}",
    allianceLabel: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤: {value}",
    codeLabel: "Ã¬Â½Â”Ã«Â“Âœ: {value}",
    signedInAsPlayer: "Ã«Â¡ÂœÃªÂ·Â¸Ã¬ÂÂ¸ Ã­Â”ÂŒÃ«Â ÂˆÃ¬ÂÂ´Ã¬Â–Â´: {value}",
    pendingJoinRequests: "Ã«ÂŒÂ€ÃªÂ¸Â° Ã¬Â¤Â‘Ã¬ÂÂ¸ ÃªÂ°Â€Ã¬ÂžÂ… Ã¬ÂšÂ”Ã¬Â²Â­",
    noPendingRequests: "Ã«ÂŒÂ€ÃªÂ¸Â° Ã¬Â¤Â‘Ã¬ÂÂ¸ ÃªÂ°Â€Ã¬ÂžÂ… Ã¬ÂšÂ”Ã¬Â²Â­Ã¬ÂÂ´ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    requestedWithCode: "Ã¬ÂšÂ”Ã¬Â²Â­ Ã¬Â½Â”Ã«Â“Âœ: {code}",
    approve: "Ã¬ÂŠÂ¹Ã¬ÂÂ¸",
    reject: "ÃªÂ±Â°Ã¬Â Âˆ",
    rotateCode: "Ã¬Â½Â”Ã«Â“Âœ Ã«Â³Â€ÃªÂ²Â½",
    updateCode: "Ã¬Â½Â”Ã«Â“Âœ Ã¬Â—Â…Ã«ÂÂ°Ã¬ÂÂ´Ã­ÂŠÂ¸",
    addMember: "Ã«Â©Â¤Ã«Â²Â„ Ã¬Â¶Â”ÃªÂ°Â€",
    name: "Ã¬ÂÂ´Ã«Â¦Â„",
    rank: "Ã«Â“Â±ÃªÂ¸Â‰",
    power: "Ã¬Â Â„Ã­ÂˆÂ¬Ã«Â Â¥",
    memberOptions: "Ã«Â©Â¤Ã«Â²Â„ Ã¬Â˜ÂµÃ¬Â…Â˜",
    leaveAnyTime: "Ã¬Â–Â¸Ã¬Â ÂœÃ«Â“Â Ã¬Â§Â€ Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤Ã«Â¥Â¼ Ã«Â–Â Ã«Â‚Â  Ã¬ÂˆÂ˜ Ã¬ÂžÂˆÃ¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    leaveAlliance: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã­ÂƒÂˆÃ­Â‡Â´",
    leaveAllianceTitle: "Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤ Ã­ÂƒÂˆÃ­Â‡Â´",
    leaveAllianceConfirm: "Ã¬Â Â•Ã«Â§Â Ã¬ÂÂ´ Ã¬Â–Â¼Ã«ÂÂ¼Ã¬ÂÂ´Ã¬Â–Â¸Ã¬ÂŠÂ¤Ã«Â¥Â¼ Ã«Â–Â Ã«Â‚Â˜Ã¬Â‹ÂœÃªÂ²Â Ã¬ÂŠÂµÃ«Â‹ÂˆÃªÂ¹ÂŒ?",
    cancel: "Ã¬Â·Â¨Ã¬Â†ÂŒ",
    leave: "Ã­ÂƒÂˆÃ­Â‡Â´",
    signedInPlayer: "Ã«Â¡ÂœÃªÂ·Â¸Ã¬ÂÂ¸Ã­Â•Âœ Ã­Â”ÂŒÃ«Â ÂˆÃ¬ÂÂ´Ã¬Â–Â´",
    totalBasePower: "Ã¬Â´Â ÃªÂ¸Â°Ã«Â³Â¸ Ã¬Â Â„Ã­ÂˆÂ¬Ã«Â Â¥",
    totalSquadPower: "Ã¬Â´Â Ã«Â¶Â„Ã«ÂŒÂ€ Ã¬Â Â„Ã­ÂˆÂ¬Ã«Â Â¥",
    desertStormTitle: "데저트 스톰",
    selectedForDesertStorm: "Ã«Â”Â”Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â°Ã¬Â—Â Ã¬Â„Â Ã­ÂƒÂÃ«ÂÂ¨",
    notCurrentlyAssigned: "Ã­Â˜Â„Ã¬ÂžÂ¬ Ã«Â°Â°Ã¬Â Â•Ã«ÂÂ˜Ã¬Â§Â€ Ã¬Â•ÂŠÃ¬ÂÂŒ",
    taskForceLabel: "Ã­ÂƒÂœÃ¬ÂŠÂ¤Ã­ÂÂ¬Ã­ÂÂ¬Ã¬ÂŠÂ¤: {value}",
    squadLabel: "Ã«Â¶Â„Ã«ÂŒÂ€: {value}",
    slotLabel: "Ã¬ÂŠÂ¬Ã«Â¡Â¯: {value}",
    notListedInTaskForces: "Ã­Â˜Â„Ã¬ÂžÂ¬ Task Force A Ã«Â˜ÂÃ«ÂŠÂ” Task Force BÃ¬Â—Â Ã«Â°Â°Ã¬Â Â•Ã«ÂÂ˜Ã¬Â–Â´ Ã¬ÂžÂˆÃ¬Â§Â€ Ã¬Â•ÂŠÃ¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤.",
    desertStormRecord: "Ã«Â”Â”Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â° ÃªÂ¸Â°Ã«Â¡Â",
    lockInsPlayed: "Ã«Â”Â”Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â° {count}Ã­ÂšÂŒ Ã­Â”ÂŒÃ«Â ÂˆÃ¬ÂÂ´",
    noLockedHistoryYet: "Ã¬Â•Â„Ã¬Â§Â Ã¬ÂžÂ ÃªÂ¸Â´ Ã«Â”Â”Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â° ÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂ´ Ã¬Â—Â†Ã¬ÂŠÂµÃ«Â‹ÂˆÃ«Â‹Â¤",
    appearancesWillShow: "Ã«Â¦Â¬Ã«ÂÂ”ÃªÂ°Â€ Ã«Â”Â”Ã¬Â Â€Ã­ÂŠÂ¸ Ã¬ÂŠÂ¤Ã­Â†Â° Ã«Â°Â°Ã¬Â¹Â˜Ã«Â¥Â¼ Ã¬ÂžÂ ÃªÂ·Â¸Ã«Â©Â´ Ã¬Â—Â¬ÃªÂ¸Â°Ã¬Â—Â Ã¬Â°Â¸Ã¬Â—Â¬ ÃªÂ¸Â°Ã«Â¡ÂÃ¬ÂÂ´ Ã­Â‘ÂœÃ¬Â‹ÂœÃ«ÂÂ©Ã«Â‹ÂˆÃ«Â‹Â¤.",
    basePowerSection: "ÃªÂ¸Â°Ã«Â³Â¸ Ã¬Â Â„Ã­ÂˆÂ¬Ã«Â Â¥",
    squadPowerBreakdown: "Ã«Â¶Â„Ã«ÂŒÂ€ Ã¬Â Â„Ã­ÂˆÂ¬Ã«Â Â¥ Ã¬Â„Â¸Ã«Â¶Â€",
    squadNumber: "{number} Ã«Â¶Â„Ã«ÂŒÂ€",
    resultPending: "Ã«ÂŒÂ€ÃªÂ¸Â° Ã¬Â¤Â‘",
    resultWin: "Ã¬ÂŠÂ¹Ã«Â¦Â¬",
    resultLoss: "Ã­ÂŒÂ¨Ã«Â°Â°",
    "common.back": "뒤로",
    "common.cancel": "취소",
    "settings.title": "설정",
    "settings.hero.eyebrow": "설정",
    "settings.hero.description": "계정 정보, 앱 환경설정, 알림, 얼라이언스 제어 항목을 한곳에서 관리하세요.",
    "settings.hero.statusLeader": "리더 권한",
    "settings.hero.statusMember": "멤버 권한",
    "settings.hero.statusStable": "안정",
    "settings.hero.statusPending": "{count}건 대기 중",
    "settings.account.eyebrow": "계정",
    "settings.account.title": "로그인 정보",
    "settings.account.description": "현재 계정, 얼라이언스, 플레이어 정보를 빠르게 확인할 수 있습니다.",
    "settings.account.accountLabel": "계정: {value}",
    "settings.account.allianceLabel": "얼라이언스: {value}",
    "settings.account.codeLabel": "코드: {value}",
    "settings.account.playerLabel": "로그인한 플레이어: {value}",
    "settings.notifications.eyebrow": "알림",
    "settings.notifications.title": "알림 설정",
    "settings.notifications.description": "기존 리마인더나 이벤트 로직을 바꾸지 않고 개인 알림 설정을 관리합니다.",
    "settings.notifications.desertStormVoteAlerts.title": "데저트 스톰 투표 알림",
    "settings.notifications.desertStormVoteAlerts.enabled": "이 계정에 대해 활성화됨.",
    "settings.notifications.desertStormVoteAlerts.disabled": "이 계정에 대해 비활성화됨.",
    "settings.notifications.dig.title": "Dig 알림",
    "settings.notifications.dig.enabled": "이 계정에 대해 활성화됨.",
    "settings.notifications.dig.disabled": "이 계정은 수신 거부 상태입니다.",
    "settings.notifications.badgeEnabled": "활성화",
    "settings.notifications.badgeDisabled": "비활성화",
    "settings.notifications.enablePush.title": "푸시 알림 활성화",
    "settings.notifications.enablePush.description": "이 기기에서 데저트 스톰 투표 알림을 받으려면 기기 알림을 켜세요.",
    "settings.notifications.enablePush.button": "알림 켜기",
    "settings.notifications.enablePush.buttonLoading": "활성화 중...",
    "settings.notifications.enablePush.alertTitle": "알림 활성화",
    "settings.notifications.enablePush.alertDescription": "푸시 알림이 활성화되지 않았습니다. 이 화면에서 나중에 다시 시도할 수 있습니다.",
    "settings.preferences.eyebrow": "환경설정",
    "settings.language.title": "언어",
    "settings.language.description": "얼라이언스 데이터는 변경하지 않고 앱 언어만 업데이트합니다.",
    "settings.appControls.eyebrow": "앱 제어",
    "settings.session.title": "세션 및 기기 작업",
    "settings.session.description": "계정 수준 제어 항목을 얼라이언스 관리 작업과 분리해 둡니다.",
    "settings.session.signOut": "로그아웃",
    "settings.requests.eyebrow": "요청",
    "settings.requests.title": "대기 중인 가입 요청",
    "settings.requests.description": "설정 화면을 벗어나지 않고 새 가입 요청을 승인하거나 거절할 수 있습니다.",
    "settings.requests.requestedWithCode": "요청 코드: {code}",
    "settings.requests.emptyTitle": "대기 중인 가입 요청이 없습니다.",
    "settings.requests.emptyDescription": "검토할 준비가 된 새 가입 요청이 여기에 표시됩니다.",
    "settings.requests.approve": "승인",
    "settings.requests.reject": "거절",
    "settings.alliance.eyebrow": "얼라이언스",
    "settings.alliance.rotateCode": "코드 변경",
    "settings.alliance.description": "하나의 명확한 작업으로 얼라이언스 코드를 변경하거나 업데이트합니다.",
    "settings.alliance.updateCode": "코드 업데이트",
    "settings.roster.eyebrow": "로스터",
    "settings.roster.title": "멤버 추가",
    "settings.roster.description": "리더는 로스터 동작을 바꾸지 않고 설정에서 직접 멤버를 추가할 수 있습니다.",
    "settings.roster.namePlaceholder": "이름",
    "settings.roster.powerPlaceholder": "전투력",
    "settings.roster.powerHint": "전투력은 백만 단위로 입력하세요. 예: 12,700,000 = 12.7",
    "settings.roster.addMember": "멤버 추가",
    "settings.danger.eyebrow": "주의 구역",
    "settings.danger.title": "멤버 옵션",
    "settings.danger.description": "중요한 계정 및 얼라이언스 작업은 명확하게 보이도록 이곳에 분리되어 있습니다.",
    "settings.danger.leaveAnyTime": "원할 때 언제든 이 얼라이언스를 떠날 수 있습니다.",
    "settings.danger.leaveTitle": "얼라이언스 떠나기",
    "settings.danger.leaveConfirm": "정말로 이 얼라이언스를 떠나시겠습니까?",
    "settings.danger.leaveButton": "얼라이언스 떠나기",
    "more.selected.eyebrow": "더보기",
    "more.selected.description": "상위 탭을 더 늘리지 않고 보조 화면으로 이동할 때 사용합니다.",
    "more.root.eyebrow": "더보기",
    "more.root.title": "추가 도구",
    "more.root.description": "깔끔한 세로 목록에서 보조 화면을 여세요.",
    "more.badgeOpen": "열기",
    "more.badgeLeader": "리더",
    "more.badgeAction": "조치",
    "more.settings.description": "계정 정보, 알림, 환경설정, 얼라이언스 제어를 관리합니다.",
    "more.feedback.title": "피드백",
    "more.feedback.description": "앱 관련 의견을 보내고 최근 피드백 기록을 확인합니다.",
    "more.leaderControls.title": "리더 제어",
    "more.leaderControls.description": "얼라이언스 전체 공지 기능을 포함한 리더 전용 도구를 엽니다.",
    "more.members.title": "멤버",
    "more.members.description": "얼라이언스 로스터를 검토하고 수정합니다.",
    "more.members.requestsWaiting": "리더 검토 대기 중인 가입 요청 {count}건",
    "common.member": "멤버",
    "common.delete": "삭제",
    "home.title": "홈",
    "home.memberFallback": "멤버",
    "home.signedIn": "로그인됨",
    "home.activeOperations": "진행 중 작전",
    "home.recentActivity": "최근 활동",
    "home.today": "오늘",
    "home.todayDetail": "오늘의 일정과 현재 작전 상황입니다.",
    "home.allDay": "하루 종일",
    "home.scheduled": "예정됨",
    "home.nothingToday": "오늘 예정된 일정이 없습니다.",
    "home.zombieSiegeCurrent": "좀비 시즈: {title}",
    "home.powerEyebrow": "전투력",
    "home.personalPower": "개인 전투력",
    "home.personalPowerDetail": "계산 로직을 바꾸지 않고 자신의 전투력을 업데이트합니다.",
    "home.totalPower": "총 전투력",
    "home.heroPower": "영웅 전투력",
    "home.squadTotal": "분대 총합",
    "home.squadPlaceholder": "분대 {number}",
    "home.desertStorm.responseNeeded": "응답 필요",
    "home.desertStorm.voteSubmitted": "투표 제출됨",
    "home.desertStorm.teamsPublished": "팀 공개됨",
    "home.desertStorm.idle": "대기",
    "home.desertStorm.taskForceFallback": "태스크포스",
    "home.desertStorm.assignedTo": "{value} 배정",
    "home.desertStorm.teamsPublishedDetail": "멤버용 팀이 공개되었습니다.",
    "home.desertStorm.voteWaitingDetail": "투표가 저장되었습니다. 리더가 로스터를 공개할 때까지 기다리세요.",
    "home.desertStorm.voteOpenDetail": "투표가 열려 있습니다. 수요일 마감 전에 응답하세요.",
    "home.desertStorm.noAssignmentPublished": "현재 공개된 배정이 없습니다.",
    "members.operationalRoster": "운영 로스터",
    "members.operationalRosterDetail": "로스터 로직은 유지한 채 얼라이언스 멤버를 검색, 필터링, 관리합니다.",
    "members.visible": "표시",
    "members.totalPower": "총 전투력",
    "members.heroPower": "영웅 전투력",
    "members.squadTotal": "분대 총합",
    "members.filters": "필터",
    "members.rosterControls": "로스터 제어",
    "members.rosterControlsDetail": "기존 검색 및 정렬 규칙을 유지하면서 목록을 간결하게 유지합니다.",
    "members.sortRank": "등급",
    "members.sortName": "이름",
    "members.allRanks": "모든 등급",
    "members.totalPowerShort": "총합 {value}M",
    "members.heroPowerShort": "영웅 {value}M",
    "members.dsCount": "DS {count}회",
    "members.dsPlayed": "데저트 스톰 참여",
    "members.dsMissed": "데저트 스톰 결석",
    "members.editMember": "멤버 수정",
    "members.memberName": "멤버 이름",
    "members.saveChanges": "변경 저장",
    "members.noMembersFound": "멤버를 찾을 수 없습니다",
    "members.noMembersHint": "다른 검색어나 등급 필터를 사용해 보세요.",
    "members.removeTitle": "멤버 삭제",
    "members.removeConfirm": "{name}님을 얼라이언스에서 삭제하시겠습니까?",
    "members.removeButton": "삭제",
    "feedback.section": "피드백",
    "feedback.entriesCount": "항목 {count}개",
    "feedback.noEntriesBadge": "항목 없음",
    "feedback.submitSection": "제출",
    "feedback.shareTitle": "피드백 공유",
    "feedback.shareDetail": "기존 제출 흐름을 바꾸지 않고 얼라이언스 팀에 명확한 의견을 보냅니다.",
    "feedback.currentBuild": "현재 빌드",
    "feedback.recentSection": "최근",
    "feedback.historyDetail": "최근 피드백과 후속 댓글을 하나의 기록 흐름에서 읽기 쉽게 보여줍니다.",
    "feedback.commentCount": "댓글 {count}개",
    "feedback.noCommentsYet": "아직 댓글이 없습니다.",
    "feedback.addComment": "댓글 추가",
    "feedback.commentButton": "댓글",
    "feedback.noFeedbackTitle": "아직 피드백이 없습니다",
    "events.selected.eyebrow": "이벤트",
    "events.selected.description": "상위 탐색을 바꾸지 않고 선택한 이벤트 흐름을 검토합니다.",
    "events.root.eyebrow": "이벤트",
    "events.root.title": "진행 중인 이벤트 흐름",
    "events.root.description": "하나의 공용 이벤트 허브에서 현재 데저트 스톰 또는 좀비 시즈 흐름을 여세요.",
    "events.cardEyebrow": "이벤트",
    "events.operational": "운영 중",
    "events.desertStorm.title": "데저트 스톰",
    "events.desertStorm.description": "현재 데저트 스톰 이벤트에서 투표하고 팀을 공개하며 검토합니다.",
    "events.desertStorm.open": "데저트 스톰 열기",
    "events.zombieSiege.title": "좀비 시즈",
    "events.zombieSiege.description": "현재 좀비 시즈 계획 및 로스터 흐름을 엽니다.",
    "events.zombieSiege.open": "좀비 시즈 열기",
    "reminders.title": "활성 리마인더",
    "reminders.description": "운영 리마인더",
    "reminders.activeCount": "활성 {count}개",
    "reminders.createEyebrow": "생성",
    "reminders.newReminder": "새 리마인더",
    "reminders.newReminderDetail": "이 리마인더는 기존 로컬 알림 흐름을 사용해 이 기기에서 실행됩니다.",
    "reminders.titlePlaceholder": "리마인더 제목",
    "reminders.notesPlaceholder": "선택 메모",
    "reminders.modeElapsed": "경과 후",
    "reminders.modeAtLocal": "로컬 시간에",
    "reminders.modeAtServer": "서버 시간에",
    "reminders.modeServerTime": "서버 시간 ({value})",
    "reminders.modeLocalTime": "로컬 시간",
    "reminders.durationLabel": "지속 시간: {value}",
    "reminders.elapsedHint": "카운트다운은 리마인더 만들기를 누를 때 시작됩니다.",
    "reminders.dateLabel": "날짜: {value}",
    "reminders.timeLabel": "시간: {value}",
    "reminders.serverTimeHint": "이 리마인더는 서버 시간 ({value}) 기준으로 고정됩니다.",
    "reminders.preview": "미리보기",
    "reminders.createButton": "리마인더 만들기",
    "reminders.activeEyebrow": "활성",
    "reminders.activeTitle": "활성 리마인더",
    "reminders.activeDetail": "아직 로컬 알림이 예약된 예정 리마인더입니다.",
    "reminders.noActiveTitle": "활성 리마인더가 없습니다",
    "reminders.noActiveDetail": "다음 행동 시간을 추적하려면 리마인더를 만드세요.",
    "reminders.inactiveEyebrow": "기록",
    "reminders.inactiveTitle": "지난 항목 및 취소됨",
    "reminders.inactiveDetail": "완료되었거나 취소된 리마인더는 빠른 검토를 위해 여기에 남습니다.",
    "reminders.nothingArchivedTitle": "리마인더 기록이 아직 없습니다",
    "reminders.nothingArchivedDetail": "완료되거나 취소된 리마인더가 여기에 표시됩니다.",
    "reminders.selectDuration": "지속 시간 선택",
    "reminders.selectDate": "날짜 선택",
    "reminders.selectTime": "시간 선택",
    "reminders.errorDuration": "0보다 큰 지속 시간을 선택하세요.",
    "reminders.errorDate": "유효한 날짜를 선택하세요.",
    "reminders.errorTime": "유효한 시간을 선택하세요.",
    "reminders.errorFuture": "리마인더 시간은 미래여야 합니다.",
    "reminders.dueNow": "지금 알림",
    "reminders.fallbackTitle": "리마인더",
    "reminders.statusActive": "활성",
    "reminders.statusCancelled": "취소됨",
    "reminders.statusCompleted": "완료됨",
    "reminders.localTime": "로컬 시간",
    "reminders.serverTime": "서버 시간 ({value})",
    "reminders.repeat": "반복",
    "reminders.oneTime": "일회성",
    "calendar.screenEyebrow": "캘린더",
    "calendar.leaderControlsEyebrow": "리더 제어",
    "calendar.leaderControlsDescription": "기본 이벤트 로직을 바꾸지 않고 얼라이언스 캘린더 항목을 만들고 업데이트합니다.",
    "calendar.timeEntryEyebrow": "시간 입력",
    "calendar.leaderFallback": "리더",
    "leaderControls.hero.eyebrow": "리더 제어",
    "leaderControls.hero.title": "얼라이언스 공지",
    "leaderControls.hero.description": "기존 이벤트 흐름을 바꾸지 않고 리더 전용 도구로 얼라이언스에 빠르게 알립니다.",
    "leaderControls.hero.badgeLeaderOnly": "리더 전용",
    "leaderControls.hero.badgePushReady": "푸시 준비됨",
    "leaderControls.hero.badgePushLimited": "푸시 제한",
    "leaderControls.presets.eyebrow": "빠른 프리셋",
    "leaderControls.presets.title": "전체 멤버 단축 동작",
    "leaderControls.presets.description": "직접 메시지를 입력하지 않고 전체 얼라이언스에 알릴 때 프리셋을 사용하세요.",
    "leaderControls.presets.digHint": "이 프리셋은 수신 거부하지 않은 모든 멤버에게 정확히 `dig` 메시지를 보냅니다.",
    "leaderControls.presets.memberCount": "멤버 {count}명",
    "leaderControls.presets.digButton": "\"dig\"를 전체 멤버에게 보내기",
    "leaderControls.common.sending": "전송 중...",
    "leaderControls.reachability.eyebrow": "푸시 도달 가능 상태",
    "leaderControls.reachability.title": "지금 dig를 받을 수 있는 멤버",
    "leaderControls.reachability.description": "도달 가능 여부는 각 멤버의 dig 설정과 이 백엔드에 기기 푸시 토큰이 저장되어 있는지에 따라 결정됩니다.",
    "leaderControls.reachability.reachableMembers": "도달 가능 멤버 {count}명",
    "leaderControls.reachability.reachableDevices": "푸시 가능 기기 {count}대",
    "leaderControls.reachability.noToken": "푸시 설정 누락 {count}명",
    "leaderControls.reachability.optedOut": "수신 거부 {count}명",
    "leaderControls.reachability.noIssues": "현재 모든 멤버가 dig 알림을 받을 수 있어 보입니다.",
    "leaderControls.reachability.noTokenTitle": "푸시 설정 누락",
    "leaderControls.reachability.optedOutTitle": "dig 수신 거부",
    "leaderControls.reachability.noTokenReason": "저장된 푸시 토큰이 아직 없습니다",
    "leaderControls.reachability.optedOutReason": "dig 알림이 꺼져 있습니다",
    "leaderControls.broadcast.eyebrow": "푸시 알림",
    "leaderControls.broadcast.titleAll": "전체 멤버에게 보내기",
    "leaderControls.broadcast.titleSelected": "특정 멤버에게 보내기",
    "leaderControls.broadcast.description": "현재 얼라이언스 푸시 흐름을 사용하되 이 알림을 전체에게 보낼지 선택한 멤버에게만 보낼지 정합니다.",
    "leaderControls.broadcast.audienceAll": "전체 멤버",
    "leaderControls.broadcast.audienceSelected": "특정 멤버",
    "leaderControls.broadcast.selectedTitle": "선택된 멤버",
    "leaderControls.broadcast.selectedCount": "{count}명 선택됨",
    "leaderControls.broadcast.searchPlaceholder": "이름 또는 등급으로 멤버 검색",
    "leaderControls.broadcast.memberSelected": "선택됨",
    "leaderControls.broadcast.memberTapToAdd": "탭하여 추가",
    "leaderControls.broadcast.noMembersTitle": "멤버를 찾을 수 없습니다",
    "leaderControls.broadcast.noMembersDescription": "검색을 조정하여 알릴 얼라이언스 멤버를 찾으세요.",
    "leaderControls.broadcast.messagePlaceholder": "얼라이언스에 보낼 메모를 입력하세요.",
    "leaderControls.broadcast.selectedHint": "푸시가 등록된 선택된 멤버 기기만 이 알림을 받습니다.",
    "leaderControls.broadcast.allHint": "현재 Expo 푸시 토큰 설정을 사용해 얼라이언스 전체에 직접 알림을 보냅니다. 등록된 푸시 토큰이 없는 기기는 받지 못합니다.",
    "leaderControls.broadcast.sendButton": "푸시 알림 보내기",
    "leaderControls.history.eyebrow": "기록",
    "leaderControls.history.title": "최근 푸시",
    "leaderControls.history.openDetail": "탭하여 최근 푸시 기록을 숨깁니다.",
    "leaderControls.history.closedDetail": "탭하여 최근 푸시 기록 폴더를 엽니다.",
    "leaderControls.history.loggedCount": "{count}개 기록됨",
    "leaderControls.history.emptyBadge": "비어 있음",
    "leaderControls.history.openBadge": "열림",
    "leaderControls.history.closedBadge": "닫힘",
    "leaderControls.history.unknownTime": "알 수 없는 시간",
    "leaderControls.history.unknownSender": "알 수 없는 발신자",
    "leaderControls.history.audienceSelected": "선택",
    "leaderControls.history.audienceAll": "전체",
    "leaderControls.history.noMessage": "기록된 메시지 없음",
    "leaderControls.history.oneDeviceTargeted": "기기 1대 대상",
    "leaderControls.history.devicesTargeted": "기기 {count}대 대상",
    "leaderControls.history.membersSelected": "멤버 {count}명 선택",
    "leaderControls.history.noHistoryTitle": "아직 푸시 기록이 없습니다",
    "leaderControls.history.noHistoryDescription": "새 공지와 dig 프리셋은 전송 후 여기에 표시됩니다.",
  },
  es: {
    appTitle: "App de Alianza PAKX",
    authSignIn: "Iniciar sesiÃƒÂ³n",
    authCreateAccount: "Crear cuenta",
    username: "Usuario",
    password: "ContraseÃƒÂ±a",
    welcome: "Bienvenido, {name}",
    notInAlliance: "Esta cuenta todavÃƒÂ­a no estÃƒÂ¡ asociada a una alianza.",
    joinAlliance: "Unirse a alianza",
    createAlliance: "Crear alianza",
    allianceName: "Nombre de la alianza",
    allianceCode: "CÃƒÂ³digo de alianza",
    previewAlliance: "Ver alianza",
    foundAlliance: "Encontrada: {name}",
    signOut: "Cerrar sesiÃƒÂ³n",
    joinRequestPending: "Solicitud de ingreso pendiente",
    pendingApproval: "Tu solicitud estÃƒÂ¡ esperando la aprobaciÃƒÂ³n de un R4 o R5.",
    refreshStatus: "Actualizar estado",
    language: "Idioma",
    signedInAs: "Sesión iniciada como {name} ({rank})",
    allianceCommand: "Comando de la alianza",
    playersWaiting: "{count} jugadores esperan aprobaciÃƒÂ³n",
    onePlayerWaiting: "1 jugador espera aprobaciÃƒÂ³n",
    tapReviewRequests: "Toca para revisar solicitudes en la pestaÃƒÂ±a Alianza.",
    restoringSession: "Restaurando tu sesión...",
    sessionExpired: "Tu sesiÃƒÂ³n expirÃƒÂ³. Vuelve a iniciar sesiÃƒÂ³n.",
    choosePlayer: "Elegir jugador",
    votedMembers: "Miembros que votaron",
    entireAlliance: "Toda la alianza",
    showingAllAlliance: "Mostrando todos los miembros de la alianza para este puesto.",
    searchNameOrRank: "Buscar por nombre o rango",
    clearSelection: "Quitar selección",
    noPlayersMatchSearch: "No hay jugadores que coincidan con la bÃƒÂºsqueda.",
    noMembersMatchVoteFilter: "No hay miembros que coincidan con ese filtro de voto de Desert Storm.",
    tabHome: "Inicio",
    tabCalendar: "Calendario",
    tabEvents: "Eventos",
    tabMore: "Más",
    tabMyInfo: "Mi informaciÃƒÂ³n",
    tabMembers: "Miembros",
    tabReminders: "Recordatorios",
    tabAlliance: "Configuracion",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "Historial DS",
    tabFeedback: "Comentarios",
    tabDashboard: "Panel",
    "picker.eyebrow": "Selector",
    "picker.reminderEyebrow": "Recordatorio",
    "picker.detail": "Configura horas, minutos y segundos para la cuenta regresiva.",
    "picker.hour": "Hora",
    "picker.minute": "Minuto",
    "picker.second": "Segundo",
    "picker.hours": "Horas",
    "picker.minutes": "Minutos",
    "picker.seconds": "Segundos",
    "picker.month": "Mes",
    "picker.day": "Día",
    "picker.year": "Año",
    "picker.done": "Listo",
    feedbackTitle: "Comentarios de la app",
    feedbackHint: "Comparte comentarios, errores y mejoras recomendadas con la alianza.",
    feedbackExample: "Ejemplo:\nCreo que el historial de Desert Storm debería mostrar también el poder total.",
    submitFeedback: "Enviar comentario",
    allianceFeedback: "Comentarios de la alianza",
    noFeedback: "TodavÃƒÂ­a no hay comentarios.",
    feedbackFrom: "De {name} - {date}",
    allianceTitle: "Alianza",
    accountLabel: "Cuenta: {value}",
    allianceLabel: "Alianza: {value}",
    codeLabel: "CÃƒÂ³digo: {value}",
    signedInAsPlayer: "SesiÃƒÂ³n iniciada como: {value}",
    pendingJoinRequests: "Solicitudes pendientes",
    noPendingRequests: "No hay solicitudes pendientes.",
    requestedWithCode: "SolicitÃƒÂ³ con el cÃƒÂ³digo {code}",
    approve: "Aprobar",
    reject: "Rechazar",
    rotateCode: "Cambiar cÃƒÂ³digo",
    updateCode: "Actualizar cÃƒÂ³digo",
    addMember: "Agregar miembro",
    name: "Nombre",
    rank: "Rango",
    power: "Poder",
    memberOptions: "Opciones de miembro",
    leaveAnyTime: "Puedes salir de esta alianza en cualquier momento.",
    leaveAlliance: "Salir de la alianza",
    leaveAllianceTitle: "Salir de la alianza",
    leaveAllianceConfirm: "Ã‚Â¿Seguro que quieres salir de esta alianza?",
    cancel: "Cancelar",
    leave: "Salir",
    signedInPlayer: "Jugador conectado",
    totalBasePower: "Poder Base Total",
    totalSquadPower: "Poder Total de Escuadra",
    desertStormTitle: "Desert Storm",
    selectedForDesertStorm: "Seleccionado para Desert Storm",
    notCurrentlyAssigned: "No asignado actualmente",
    taskForceLabel: "Task Force: {value}",
    squadLabel: "Escuadra: {value}",
    slotLabel: "Puesto: {value}",
    notListedInTaskForces: "No apareces actualmente en Task Force A ni Task Force B.",
    desertStormRecord: "Historial de Desert Storm",
    lockInsPlayed: "{count} Desert Storm jugados",
    noLockedHistoryYet: "TodavÃƒÂ­a no hay historial bloqueado de Desert Storm",
    appearancesWillShow: "Cuando los lÃƒÂ­deres bloqueen una alineaciÃƒÂ³n de Desert Storm, tus apariciones se mostrarÃƒÂ¡n aquÃƒÂ­.",
    basePowerSection: "Poder Base",
    squadPowerBreakdown: "Desglose de poder por escuadra",
    squadNumber: "Escuadra {number}",
    resultPending: "Pendiente",
    resultWin: "Victoria",
    resultLoss: "Derrota",
    "common.back": "Atrás",
    "common.cancel": "Cancelar",
    "settings.title": "Configuración",
    "settings.hero.eyebrow": "Configuración",
    "settings.hero.description": "Administra el contexto de la cuenta, las preferencias de la app, las alertas y los controles de la alianza desde secciones agrupadas.",
    "settings.hero.statusLeader": "Acceso de líder",
    "settings.hero.statusMember": "Acceso de miembro",
    "settings.hero.statusStable": "Estable",
    "settings.hero.statusPending": "{count} pendientes",
    "settings.account.eyebrow": "Cuenta",
    "settings.account.title": "Contexto de la sesión",
    "settings.account.description": "La cuenta actual, la alianza y la identidad del jugador están agrupadas aquí para una referencia rápida.",
    "settings.account.accountLabel": "Cuenta: {value}",
    "settings.account.allianceLabel": "Alianza: {value}",
    "settings.account.codeLabel": "Código: {value}",
    "settings.account.playerLabel": "Sesión iniciada como: {value}",
    "settings.notifications.eyebrow": "Notificaciones",
    "settings.notifications.title": "Preferencias de alertas",
    "settings.notifications.description": "Administra tus preferencias personales de alertas sin cambiar la lógica existente de recordatorios o eventos.",
    "settings.notifications.desertStormVoteAlerts.title": "Alertas de voto de Desert Storm",
    "settings.notifications.desertStormVoteAlerts.enabled": "Habilitadas para tu cuenta.",
    "settings.notifications.desertStormVoteAlerts.disabled": "Deshabilitadas para tu cuenta.",
    "settings.notifications.dig.title": "Notificaciones de dig",
    "settings.notifications.dig.enabled": "Habilitadas para tu cuenta.",
    "settings.notifications.dig.disabled": "Desactivadas para tu cuenta.",
    "settings.notifications.badgeEnabled": "Habilitado",
    "settings.notifications.badgeDisabled": "Deshabilitado",
    "settings.notifications.enablePush.title": "Habilitar notificaciones push",
    "settings.notifications.enablePush.description": "Activa las notificaciones del dispositivo para recibir alertas de voto de Desert Storm en este dispositivo.",
    "settings.notifications.enablePush.button": "Habilitar notificaciones",
    "settings.notifications.enablePush.buttonLoading": "Habilitando...",
    "settings.notifications.enablePush.alertTitle": "Habilitar notificaciones",
    "settings.notifications.enablePush.alertDescription": "Las notificaciones push no se habilitaron. Puedes intentarlo de nuevo más tarde en esta pantalla.",
    "settings.preferences.eyebrow": "Preferencias",
    "settings.language.title": "Idioma",
    "settings.language.description": "Actualiza las preferencias de la app sin cambiar los datos de la alianza.",
    "settings.appControls.eyebrow": "Controles de la app",
    "settings.session.title": "Acciones de sesión y dispositivo",
    "settings.session.description": "Mantén los controles de la cuenta separados de las acciones de gestión de la alianza.",
    "settings.session.signOut": "Cerrar sesión",
    "settings.requests.eyebrow": "Solicitudes",
    "settings.requests.title": "Solicitudes pendientes",
    "settings.requests.description": "Aprueba o rechaza nuevas solicitudes de ingreso sin salir del flujo de configuración.",
    "settings.requests.requestedWithCode": "Solicitado con el código {code}",
    "settings.requests.emptyTitle": "No hay solicitudes pendientes.",
    "settings.requests.emptyDescription": "Las nuevas solicitudes de ingreso aparecerán aquí cuando estén listas para revisión.",
    "settings.requests.approve": "Aprobar",
    "settings.requests.reject": "Rechazar",
    "settings.alliance.eyebrow": "Alianza",
    "settings.alliance.rotateCode": "Cambiar código",
    "settings.alliance.description": "Cambia o actualiza el código de la alianza con una sola acción clara.",
    "settings.alliance.updateCode": "Actualizar código",
    "settings.roster.eyebrow": "Plantilla",
    "settings.roster.title": "Agregar miembro",
    "settings.roster.description": "Los líderes pueden agregar miembros directamente desde configuración sin cambiar el comportamiento del roster.",
    "settings.roster.namePlaceholder": "Nombre",
    "settings.roster.powerPlaceholder": "Poder",
    "settings.roster.powerHint": "Ingresa el valor de poder en millones. Ej.: 12,700,000 = 12.7",
    "settings.roster.addMember": "Agregar miembro",
    "settings.danger.eyebrow": "Zona de peligro",
    "settings.danger.title": "Opciones de miembro",
    "settings.danger.description": "Las acciones importantes de cuenta y alianza están aisladas aquí para mantenerlas claras pero discretas.",
    "settings.danger.leaveAnyTime": "Puedes salir de esta alianza en cualquier momento.",
    "settings.danger.leaveTitle": "Salir de la alianza",
    "settings.danger.leaveConfirm": "¿Seguro que quieres salir de esta alianza?",
    "settings.danger.leaveButton": "Salir de la alianza",
    "more.selected.eyebrow": "Más",
    "more.selected.description": "Usa Más para destinos secundarios sin agregar más pestañas principales.",
    "more.root.eyebrow": "Más",
    "more.root.title": "Más herramientas",
    "more.root.description": "Abre destinos secundarios desde una lista vertical limpia.",
    "more.badgeOpen": "Abrir",
    "more.badgeLeader": "Líder",
    "more.badgeAction": "Acción",
    "more.settings.description": "Contexto de cuenta, notificaciones, preferencias y controles de la alianza.",
    "more.feedback.title": "Comentarios",
    "more.feedback.description": "Envía notas sobre la app y revisa el historial reciente de comentarios.",
    "more.leaderControls.title": "Controles de líder",
    "more.leaderControls.description": "Abre herramientas solo para líderes, incluidos los controles de difusión a toda la alianza.",
    "more.members.title": "Miembros",
    "more.members.description": "Revisa y edita el roster de la alianza.",
    "more.members.requestsWaiting": "{count} solicitudes de ingreso esperando revisión del líder.",
    "common.member": "Miembro",
    "common.delete": "Eliminar",
    "home.title": "Inicio",
    "home.memberFallback": "Miembro",
    "home.signedIn": "Conectado",
    "home.activeOperations": "Operaciones activas",
    "home.recentActivity": "Actividad reciente",
    "home.today": "Hoy",
    "home.todayDetail": "Agenda de hoy y contexto operativo actual.",
    "home.allDay": "Todo el día",
    "home.scheduled": "Programado",
    "home.nothingToday": "No hay nada programado para hoy.",
    "home.zombieSiegeCurrent": "Zombie Siege: {title}",
    "home.powerEyebrow": "Poder",
    "home.personalPower": "Poder personal",
    "home.personalPowerDetail": "Actualiza tus valores de poder sin cambiar el comportamiento del cálculo.",
    "home.totalPower": "Poder total",
    "home.heroPower": "Poder de héroe",
    "home.squadTotal": "Total de escuadra",
    "home.squadPlaceholder": "Escuadra {number}",
    "home.desertStorm.responseNeeded": "Respuesta necesaria",
    "home.desertStorm.voteSubmitted": "Voto enviado",
    "home.desertStorm.teamsPublished": "Equipos publicados",
    "home.desertStorm.idle": "Inactivo",
    "home.desertStorm.taskForceFallback": "task force",
    "home.desertStorm.assignedTo": "Asignado a {value}",
    "home.desertStorm.teamsPublishedDetail": "Los equipos ya fueron publicados para los miembros.",
    "home.desertStorm.voteWaitingDetail": "Tu voto está guardado. Espera a que los líderes publiquen la alineación.",
    "home.desertStorm.voteOpenDetail": "La votación está abierta. Responde antes del cierre del miércoles.",
    "home.desertStorm.noAssignmentPublished": "No hay una asignación publicada actualmente.",
    "members.operationalRoster": "Roster operativo",
    "members.operationalRosterDetail": "Busca, filtra y administra miembros sin cambiar la lógica del roster.",
    "members.visible": "Visibles",
    "members.totalPower": "Poder total",
    "members.heroPower": "Poder de héroe",
    "members.squadTotal": "Total de escuadra",
    "members.filters": "Filtros",
    "members.rosterControls": "Controles del roster",
    "members.rosterControlsDetail": "Mantén la lista enfocada sin cambiar las reglas actuales de búsqueda y orden.",
    "members.sortRank": "Rango",
    "members.sortName": "Nombre",
    "members.allRanks": "Todos los rangos",
    "members.totalPowerShort": "Total {value}M",
    "members.heroPowerShort": "Héroe {value}M",
    "members.dsCount": "{count} DS",
    "members.dsPlayed": "Desert Storm jugados",
    "members.dsMissed": "Desert Storm perdidos",
    "members.editMember": "Editar miembro",
    "members.memberName": "Nombre del miembro",
    "members.saveChanges": "Guardar cambios",
    "members.noMembersFound": "No se encontraron miembros",
    "members.noMembersHint": "Prueba otra búsqueda o filtro de rango.",
    "members.removeTitle": "Eliminar miembro",
    "members.removeConfirm": "¿Seguro que quieres eliminar a {name} de la alianza?",
    "members.removeButton": "Eliminar",
    "feedback.section": "Comentarios",
    "feedback.entriesCount": "{count} entradas",
    "feedback.noEntriesBadge": "Sin entradas",
    "feedback.submitSection": "Enviar",
    "feedback.shareTitle": "Compartir comentarios",
    "feedback.shareDetail": "Envía notas claras al equipo de la alianza sin cambiar el flujo actual.",
    "feedback.currentBuild": "Build actual",
    "feedback.recentSection": "Recientes",
    "feedback.historyDetail": "Los comentarios recientes y sus respuestas se muestran en una sola línea de historial.",
    "feedback.commentCount": "{count} comentarios",
    "feedback.noCommentsYet": "Todavía no hay comentarios.",
    "feedback.addComment": "Agregar comentario",
    "feedback.commentButton": "Comentar",
    "feedback.noFeedbackTitle": "Aún no hay comentarios",
    "events.selected.eyebrow": "Eventos",
    "events.selected.description": "Revisa el flujo del evento seleccionado sin cambiar la navegación principal.",
    "events.root.eyebrow": "Eventos",
    "events.root.title": "Flujos de eventos activos",
    "events.root.description": "Abre el flujo actual de Desert Storm o Zombie Siege desde un mismo centro de eventos.",
    "events.cardEyebrow": "Evento",
    "events.operational": "Activo",
    "events.desertStorm.title": "Desert Storm",
    "events.desertStorm.description": "Vota, publica equipos y revisa el evento actual de Desert Storm.",
    "events.desertStorm.open": "Abrir Desert Storm",
    "events.zombieSiege.title": "Zombie Siege",
    "events.zombieSiege.description": "Abre el flujo actual de planificación y roster de Zombie Siege.",
    "events.zombieSiege.open": "Abrir Zombie Siege",
    "reminders.title": "Recordatorios activos",
    "reminders.description": "Recordatorios operativos",
    "reminders.activeCount": "{count} activos",
    "reminders.createEyebrow": "Crear",
    "reminders.newReminder": "Nuevo recordatorio",
    "reminders.newReminderDetail": "El recordatorio se activa en este dispositivo usando el flujo actual de notificaciones locales.",
    "reminders.titlePlaceholder": "Título del recordatorio",
    "reminders.notesPlaceholder": "Notas opcionales",
    "reminders.modeElapsed": "Después de un tiempo",
    "reminders.modeAtLocal": "A hora local",
    "reminders.modeAtServer": "A hora del servidor",
    "reminders.modeServerTime": "Hora del servidor ({value})",
    "reminders.modeLocalTime": "Hora local",
    "reminders.durationLabel": "Duración: {value}",
    "reminders.elapsedHint": "La cuenta regresiva comienza cuando tocas Crear recordatorio.",
    "reminders.dateLabel": "Fecha: {value}",
    "reminders.timeLabel": "Hora: {value}",
    "reminders.serverTimeHint": "Este recordatorio quedará anclado a la hora del servidor ({value}).",
    "reminders.preview": "Vista previa",
    "reminders.createButton": "Crear recordatorio",
    "reminders.activeEyebrow": "Activos",
    "reminders.activeTitle": "Recordatorios activos",
    "reminders.activeDetail": "Próximos recordatorios que todavía tienen notificaciones locales programadas.",
    "reminders.noActiveTitle": "No hay recordatorios activos",
    "reminders.noActiveDetail": "Crea un recordatorio para empezar a seguir tu próxima ventana de acción.",
    "reminders.inactiveEyebrow": "Historial",
    "reminders.inactiveTitle": "Anteriores y cancelados",
    "reminders.inactiveDetail": "Los recordatorios completados o cancelados permanecen aquí para revisión rápida.",
    "reminders.nothingArchivedTitle": "Aún no hay historial de recordatorios",
    "reminders.nothingArchivedDetail": "Los recordatorios cancelados y completados aparecerán aquí.",
    "reminders.selectDuration": "Seleccionar duración",
    "reminders.selectDate": "Seleccionar fecha",
    "reminders.selectTime": "Seleccionar hora",
    "reminders.errorDuration": "Elige una duración mayor que cero.",
    "reminders.errorDate": "Elige una fecha válida.",
    "reminders.errorTime": "Elige una hora válida.",
    "reminders.errorFuture": "La hora del recordatorio debe estar en el futuro.",
    "reminders.dueNow": "Vence ahora",
    "reminders.fallbackTitle": "Recordatorio",
    "reminders.statusActive": "Activo",
    "reminders.statusCancelled": "Cancelado",
    "reminders.statusCompleted": "Completado",
    "reminders.localTime": "Hora Local",
    "reminders.serverTime": "Hora del Servidor ({value})",
    "reminders.repeat": "Repetición",
    "reminders.oneTime": "Una sola vez",
    "calendar.screenEyebrow": "Calendario",
    "calendar.leaderControlsEyebrow": "Controles de líder",
    "calendar.leaderControlsDescription": "Crea y actualiza entradas del calendario de la alianza sin cambiar la lógica base del evento.",
    "calendar.timeEntryEyebrow": "Entrada de hora",
    "calendar.leaderFallback": "Líder",
    "leaderControls.hero.eyebrow": "Controles de líder",
    "leaderControls.hero.title": "Avisos de la alianza",
    "leaderControls.hero.description": "Usa herramientas solo para líderes para comunicarte rápidamente con la alianza sin cambiar los flujos actuales de eventos.",
    "leaderControls.hero.badgeLeaderOnly": "Solo líder",
    "leaderControls.hero.badgePushReady": "Push listo",
    "leaderControls.hero.badgePushLimited": "Push limitado",
    "leaderControls.presets.eyebrow": "Accesos rápidos",
    "leaderControls.presets.title": "Atajos para todos los miembros",
    "leaderControls.presets.description": "Usa un preset cuando necesites avisar a toda la alianza sin escribir un mensaje personalizado.",
    "leaderControls.presets.digHint": "Este preset envía el mensaje exacto `dig` a todos los miembros que no se hayan excluido.",
    "leaderControls.presets.memberCount": "{count} miembros",
    "leaderControls.presets.digButton": "Enviar \"dig\" a todos",
    "leaderControls.common.sending": "Enviando...",
    "leaderControls.reachability.eyebrow": "Alcance de push",
    "leaderControls.reachability.title": "Quién puede recibir dig ahora mismo",
    "leaderControls.reachability.description": "El alcance depende de la preferencia de dig de cada miembro y de si este backend tiene un token push registrado para su dispositivo.",
    "leaderControls.reachability.reachableMembers": "{count} miembros alcanzables",
    "leaderControls.reachability.reachableDevices": "{count} dispositivos listos para push",
    "leaderControls.reachability.noToken": "{count} sin configuración push",
    "leaderControls.reachability.optedOut": "{count} excluidos",
    "leaderControls.reachability.noIssues": "Por ahora todos parecen alcanzables para las notificaciones de dig.",
    "leaderControls.reachability.noTokenTitle": "Falta configuración push",
    "leaderControls.reachability.optedOutTitle": "Excluidos de dig",
    "leaderControls.reachability.noTokenReason": "Todavía no hay token push guardado",
    "leaderControls.reachability.optedOutReason": "Las notificaciones de dig están desactivadas",
    "leaderControls.broadcast.eyebrow": "Notificación push",
    "leaderControls.broadcast.titleAll": "Enviar a todos los miembros",
    "leaderControls.broadcast.titleSelected": "Enviar a miembros específicos",
    "leaderControls.broadcast.description": "Usa el flujo push actual de la alianza, pero elige si esta notificación va para todos o solo para los miembros seleccionados.",
    "leaderControls.broadcast.audienceAll": "Todos los miembros",
    "leaderControls.broadcast.audienceSelected": "Miembros específicos",
    "leaderControls.broadcast.selectedTitle": "Miembros seleccionados",
    "leaderControls.broadcast.selectedCount": "{count} seleccionados",
    "leaderControls.broadcast.searchPlaceholder": "Buscar miembros por nombre o rango",
    "leaderControls.broadcast.memberSelected": "Seleccionado",
    "leaderControls.broadcast.memberTapToAdd": "Toca para agregar",
    "leaderControls.broadcast.noMembersTitle": "No se encontraron miembros",
    "leaderControls.broadcast.noMembersDescription": "Ajusta la búsqueda para encontrar miembros de la alianza a los que notificar.",
    "leaderControls.broadcast.messagePlaceholder": "Escribe la nota que quieres enviar a la alianza.",
    "leaderControls.broadcast.selectedHint": "Solo los miembros seleccionados con dispositivos registrados para push recibirán esta alerta.",
    "leaderControls.broadcast.allHint": "Esto envía una alerta directa a toda la alianza usando la configuración actual de tokens Expo push. Los dispositivos sin token registrado no la recibirán.",
    "leaderControls.broadcast.sendButton": "Enviar notificación push",
    "leaderControls.history.eyebrow": "Historial",
    "leaderControls.history.title": "Push recientes",
    "leaderControls.history.openDetail": "Toca para ocultar el historial reciente de push.",
    "leaderControls.history.closedDetail": "Toca para abrir la carpeta del historial reciente de push.",
    "leaderControls.history.loggedCount": "{count} registrados",
    "leaderControls.history.emptyBadge": "Vacío",
    "leaderControls.history.openBadge": "Abierto",
    "leaderControls.history.closedBadge": "Cerrado",
    "leaderControls.history.unknownTime": "Hora desconocida",
    "leaderControls.history.unknownSender": "Remitente desconocido",
    "leaderControls.history.audienceSelected": "Seleccionados",
    "leaderControls.history.audienceAll": "Todos",
    "leaderControls.history.noMessage": "No se registró ningún mensaje",
    "leaderControls.history.oneDeviceTargeted": "1 dispositivo objetivo",
    "leaderControls.history.devicesTargeted": "{count} dispositivos objetivo",
    "leaderControls.history.membersSelected": "{count} miembros seleccionados",
    "leaderControls.history.noHistoryTitle": "Aún no hay historial de push",
    "leaderControls.history.noHistoryDescription": "Los nuevos avisos y presets de dig aparecerán aquí después de enviarse.",
  },
  pt: {
    appTitle: "App da AlianÃƒÂ§a PAKX",
    authSignIn: "Entrar",
    authCreateAccount: "Criar conta",
    username: "UsuÃƒÂ¡rio",
    password: "Senha",
    welcome: "Bem-vindo, {name}",
    notInAlliance: "Esta conta ainda nÃƒÂ£o estÃƒÂ¡ associada a uma alianÃƒÂ§a.",
    joinAlliance: "Entrar na alianÃƒÂ§a",
    createAlliance: "Criar alianÃƒÂ§a",
    allianceName: "Nome da alianÃƒÂ§a",
    allianceCode: "CÃƒÂ³digo da alianÃƒÂ§a",
    previewAlliance: "Ver alianÃƒÂ§a",
    foundAlliance: "Encontrada: {name}",
    signOut: "Sair",
    joinRequestPending: "Pedido de entrada pendente",
    pendingApproval: "Seu pedido estÃƒÂ¡ aguardando aprovaÃƒÂ§ÃƒÂ£o de um R4 ou R5.",
    refreshStatus: "Atualizar status",
    language: "Idioma",
    signedInAs: "Conectado como {name} ({rank})",
    allianceCommand: "Comando da aliança",
    playersWaiting: "{count} jogadores aguardando aprovaÃƒÂ§ÃƒÂ£o",
    onePlayerWaiting: "1 jogador aguardando aprovaÃƒÂ§ÃƒÂ£o",
    tapReviewRequests: "Toque para revisar pedidos na aba AlianÃƒÂ§a.",
    restoringSession: "Restaurando sua sessão...",
    sessionExpired: "Sua sessÃƒÂ£o expirou. Entre novamente.",
    choosePlayer: "Escolher jogador",
    votedMembers: "Membros que votaram",
    entireAlliance: "AlianÃƒÂ§a inteira",
    showingAllAlliance: "Mostrando todos os membros da alianÃƒÂ§a para esta vaga.",
    searchNameOrRank: "Buscar por nome ou patente",
    clearSelection: "Limpar seleção",
    noPlayersMatchSearch: "Nenhum jogador corresponde ÃƒÂ  busca.",
    noMembersMatchVoteFilter: "Nenhum membro corresponde a esse filtro de voto do Desert Storm.",
    tabHome: "Início",
    tabCalendar: "Calendário",
    tabEvents: "Eventos",
    tabMore: "Mais",
    tabMyInfo: "Minhas informaÃƒÂ§ÃƒÂµes",
    tabMembers: "Membros",
    tabReminders: "Lembretes",
    tabAlliance: "Configuracoes",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "HistÃƒÂ³rico DS",
    tabFeedback: "Feedback",
    tabDashboard: "Painel",
    "picker.eyebrow": "Seletor",
    "picker.reminderEyebrow": "Lembrete",
    "picker.detail": "Defina horas, minutos e segundos para a contagem regressiva.",
    "picker.hour": "Hora",
    "picker.minute": "Minuto",
    "picker.second": "Segundo",
    "picker.hours": "Horas",
    "picker.minutes": "Minutos",
    "picker.seconds": "Segundos",
    "picker.month": "Mês",
    "picker.day": "Dia",
    "picker.year": "Ano",
    "picker.done": "Concluir",
    feedbackTitle: "Feedback do app",
    feedbackHint: "Compartilhe comentários, bugs e melhorias sugeridas com a aliança.",
    feedbackExample: "Exemplo:\nAcho que o histórico do Desert Storm deveria mostrar também o poder total.",
    submitFeedback: "Enviar feedback",
    allianceFeedback: "Feedback da aliança",
    noFeedback: "Nenhum feedback foi enviado ainda.",
    feedbackFrom: "De {name} - {date}",
    allianceTitle: "AlianÃƒÂ§a",
    accountLabel: "Conta: {value}",
    allianceLabel: "AlianÃƒÂ§a: {value}",
    codeLabel: "CÃƒÂ³digo: {value}",
    signedInAsPlayer: "Conectado como: {value}",
    pendingJoinRequests: "Pedidos pendentes",
    noPendingRequests: "NÃƒÂ£o hÃƒÂ¡ pedidos pendentes.",
    requestedWithCode: "Solicitado com o cÃƒÂ³digo {code}",
    approve: "Aprovar",
    reject: "Rejeitar",
    rotateCode: "Alterar cÃƒÂ³digo",
    updateCode: "Atualizar cÃƒÂ³digo",
    addMember: "Adicionar membro",
    name: "Nome",
    rank: "Patente",
    power: "Poder",
    memberOptions: "OpÃƒÂ§ÃƒÂµes do membro",
    leaveAnyTime: "VocÃƒÂª pode sair desta alianÃƒÂ§a a qualquer momento.",
    leaveAlliance: "Sair da alianÃƒÂ§a",
    leaveAllianceTitle: "Sair da alianÃƒÂ§a",
    leaveAllianceConfirm: "Tem certeza de que deseja sair desta alianÃƒÂ§a?",
    cancel: "Cancelar",
    leave: "Sair",
    signedInPlayer: "Jogador conectado",
    totalBasePower: "Poder Base Total",
    totalSquadPower: "Poder Total de EsquadrÃƒÂ£o",
    desertStormTitle: "Desert Storm",
    selectedForDesertStorm: "Selecionado para Desert Storm",
    notCurrentlyAssigned: "NÃƒÂ£o atribuÃƒÂ­do no momento",
    taskForceLabel: "Task Force: {value}",
    squadLabel: "EsquadrÃƒÂ£o: {value}",
    slotLabel: "PosiÃƒÂ§ÃƒÂ£o: {value}",
    notListedInTaskForces: "VocÃƒÂª nÃƒÂ£o estÃƒÂ¡ listado atualmente na Task Force A ou Task Force B.",
    desertStormRecord: "HistÃƒÂ³rico do Desert Storm",
    lockInsPlayed: "{count} Desert Storm jogados",
    noLockedHistoryYet: "Ainda nÃƒÂ£o hÃƒÂ¡ histÃƒÂ³rico travado de Desert Storm",
    appearancesWillShow: "Quando os lÃƒÂ­deres travarem uma formaÃƒÂ§ÃƒÂ£o do Desert Storm, suas participaÃƒÂ§ÃƒÂµes aparecerÃƒÂ£o aqui.",
    basePowerSection: "Poder Base",
    squadPowerBreakdown: "Detalhamento do poder dos esquadrÃƒÂµes",
    squadNumber: "EsquadrÃƒÂ£o {number}",
    resultPending: "Pendente",
    resultWin: "VitÃƒÂ³ria",
    resultLoss: "Derrota",
    "common.back": "Voltar",
    "common.cancel": "Cancelar",
    "settings.title": "Configurações",
    "settings.hero.eyebrow": "Configurações",
    "settings.hero.description": "Gerencie o contexto da conta, as preferências do app, os alertas e os controles da aliança em seções agrupadas.",
    "settings.hero.statusLeader": "Acesso de líder",
    "settings.hero.statusMember": "Acesso de membro",
    "settings.hero.statusStable": "Estável",
    "settings.hero.statusPending": "{count} pendentes",
    "settings.account.eyebrow": "Conta",
    "settings.account.title": "Contexto da sessão",
    "settings.account.description": "A conta atual, a aliança e a identidade do jogador ficam agrupadas aqui para referência rápida.",
    "settings.account.accountLabel": "Conta: {value}",
    "settings.account.allianceLabel": "Aliança: {value}",
    "settings.account.codeLabel": "Código: {value}",
    "settings.account.playerLabel": "Conectado como: {value}",
    "settings.notifications.eyebrow": "Notificações",
    "settings.notifications.title": "Preferências de alertas",
    "settings.notifications.description": "Gerencie suas preferências pessoais de alertas sem mudar a lógica existente de lembretes ou eventos.",
    "settings.notifications.desertStormVoteAlerts.title": "Alertas de voto do Desert Storm",
    "settings.notifications.desertStormVoteAlerts.enabled": "Ativados para sua conta.",
    "settings.notifications.desertStormVoteAlerts.disabled": "Desativados para sua conta.",
    "settings.notifications.dig.title": "Notificações de dig",
    "settings.notifications.dig.enabled": "Ativadas para sua conta.",
    "settings.notifications.dig.disabled": "Desativadas para sua conta.",
    "settings.notifications.badgeEnabled": "Ativado",
    "settings.notifications.badgeDisabled": "Desativado",
    "settings.notifications.enablePush.title": "Ativar notificações push",
    "settings.notifications.enablePush.description": "Ative as notificações do dispositivo para receber alertas de voto do Desert Storm neste aparelho.",
    "settings.notifications.enablePush.button": "Ativar notificações",
    "settings.notifications.enablePush.buttonLoading": "Ativando...",
    "settings.notifications.enablePush.alertTitle": "Ativar notificações",
    "settings.notifications.enablePush.alertDescription": "As notificações push não foram ativadas. Você pode tentar novamente mais tarde nesta tela.",
    "settings.preferences.eyebrow": "Preferências",
    "settings.language.title": "Idioma",
    "settings.language.description": "Atualize as preferências do app sem alterar os dados da aliança.",
    "settings.appControls.eyebrow": "Controles do app",
    "settings.session.title": "Ações de sessão e dispositivo",
    "settings.session.description": "Mantenha os controles da conta separados das ações de gerenciamento da aliança.",
    "settings.session.signOut": "Sair",
    "settings.requests.eyebrow": "Solicitações",
    "settings.requests.title": "Solicitações pendentes",
    "settings.requests.description": "Aprove ou rejeite novas solicitações de entrada sem sair do fluxo de configurações.",
    "settings.requests.requestedWithCode": "Solicitado com o código {code}",
    "settings.requests.emptyTitle": "Não há solicitações pendentes.",
    "settings.requests.emptyDescription": "Novas solicitações de entrada aparecerão aqui quando estiverem prontas para revisão.",
    "settings.requests.approve": "Aprovar",
    "settings.requests.reject": "Rejeitar",
    "settings.alliance.eyebrow": "Aliança",
    "settings.alliance.rotateCode": "Alterar código",
    "settings.alliance.description": "Altere ou atualize o código da aliança com uma ação clara e única.",
    "settings.alliance.updateCode": "Atualizar código",
    "settings.roster.eyebrow": "Elenco",
    "settings.roster.title": "Adicionar membro",
    "settings.roster.description": "Líderes podem adicionar membros diretamente pelas configurações sem mudar o comportamento do elenco.",
    "settings.roster.namePlaceholder": "Nome",
    "settings.roster.powerPlaceholder": "Poder",
    "settings.roster.powerHint": "Digite o valor de poder em milhões. Ex.: 12.700.000 = 12,7",
    "settings.roster.addMember": "Adicionar membro",
    "settings.danger.eyebrow": "Zona de perigo",
    "settings.danger.title": "Opções do membro",
    "settings.danger.description": "Ações importantes da conta e da aliança ficam isoladas aqui para permanecerem claras, mas discretas.",
    "settings.danger.leaveAnyTime": "Você pode sair desta aliança a qualquer momento.",
    "settings.danger.leaveTitle": "Sair da aliança",
    "settings.danger.leaveConfirm": "Tem certeza de que deseja sair desta aliança?",
    "settings.danger.leaveButton": "Sair da aliança",
    "more.selected.eyebrow": "Mais",
    "more.selected.description": "Use Mais para destinos secundários sem adicionar mais abas de nível superior.",
    "more.root.eyebrow": "Mais",
    "more.root.title": "Mais ferramentas",
    "more.root.description": "Abra destinos secundários a partir de uma lista vertical limpa.",
    "more.badgeOpen": "Abrir",
    "more.badgeLeader": "Líder",
    "more.badgeAction": "Ação",
    "more.settings.description": "Contexto da conta, notificações, preferências e controles da aliança.",
    "more.feedback.title": "Feedback",
    "more.feedback.description": "Envie notas sobre o app e revise o histórico recente de feedback.",
    "more.leaderControls.title": "Controles de líder",
    "more.leaderControls.description": "Abra ferramentas exclusivas para líderes, incluindo controles de aviso para toda a aliança.",
    "more.members.title": "Membros",
    "more.members.description": "Revise e edite o elenco da aliança.",
    "more.members.requestsWaiting": "{count} solicitações de entrada aguardando revisão do líder.",
    "common.member": "Membro",
    "common.delete": "Excluir",
    "home.title": "Início",
    "home.memberFallback": "Membro",
    "home.signedIn": "Conectado",
    "home.activeOperations": "Operações ativas",
    "home.recentActivity": "Atividade recente",
    "home.today": "Hoje",
    "home.todayDetail": "Agenda de hoje e contexto operacional atual.",
    "home.allDay": "Dia inteiro",
    "home.scheduled": "Agendado",
    "home.nothingToday": "Nada está programado para hoje.",
    "home.zombieSiegeCurrent": "Zombie Siege: {title}",
    "home.powerEyebrow": "Poder",
    "home.personalPower": "Poder pessoal",
    "home.personalPowerDetail": "Atualize seus valores de poder sem alterar o comportamento do cálculo.",
    "home.totalPower": "Poder total",
    "home.heroPower": "Poder de herói",
    "home.squadTotal": "Total de esquadrão",
    "home.squadPlaceholder": "Esquadrão {number}",
    "home.desertStorm.responseNeeded": "Resposta necessária",
    "home.desertStorm.voteSubmitted": "Voto enviado",
    "home.desertStorm.teamsPublished": "Times publicados",
    "home.desertStorm.idle": "Inativo",
    "home.desertStorm.taskForceFallback": "força-tarefa",
    "home.desertStorm.assignedTo": "Atribuído a {value}",
    "home.desertStorm.teamsPublishedDetail": "Os times foram publicados para os membros.",
    "home.desertStorm.voteWaitingDetail": "Seu voto foi salvo. Aguarde os líderes publicarem a escalação.",
    "home.desertStorm.voteOpenDetail": "A votação está aberta. Responda antes do fechamento de quarta-feira.",
    "home.desertStorm.noAssignmentPublished": "Nenhuma atribuição publicada no momento.",
    "members.operationalRoster": "Elenco operacional",
    "members.operationalRosterDetail": "Pesquise, filtre e gerencie membros da aliança sem mudar a lógica do elenco.",
    "members.visible": "Visíveis",
    "members.totalPower": "Poder total",
    "members.heroPower": "Poder de herói",
    "members.squadTotal": "Total de esquadrão",
    "members.filters": "Filtros",
    "members.rosterControls": "Controles do elenco",
    "members.rosterControlsDetail": "Mantenha a lista focada sem alterar as regras atuais de busca e ordenação.",
    "members.sortRank": "Patente",
    "members.sortName": "Nome",
    "members.allRanks": "Todas as patentes",
    "members.totalPowerShort": "Total {value}M",
    "members.heroPowerShort": "Herói {value}M",
    "members.dsCount": "{count} DS",
    "members.dsPlayed": "Desert Storm jogados",
    "members.dsMissed": "Desert Storm perdidos",
    "members.editMember": "Editar membro",
    "members.memberName": "Nome do membro",
    "members.saveChanges": "Salvar alterações",
    "members.noMembersFound": "Nenhum membro encontrado",
    "members.noMembersHint": "Tente outra busca ou filtro de patente.",
    "members.removeTitle": "Remover membro",
    "members.removeConfirm": "Tem certeza de que deseja remover {name} da aliança?",
    "members.removeButton": "Remover",
    "feedback.section": "Feedback",
    "feedback.entriesCount": "{count} entradas",
    "feedback.noEntriesBadge": "Sem entradas",
    "feedback.submitSection": "Enviar",
    "feedback.shareTitle": "Compartilhar feedback",
    "feedback.shareDetail": "Envie notas claras para a equipe da aliança sem mudar o fluxo atual de envio.",
    "feedback.currentBuild": "Build atual",
    "feedback.recentSection": "Recentes",
    "feedback.historyDetail": "Feedbacks recentes e comentários de acompanhamento permanecem legíveis em um único histórico.",
    "feedback.commentCount": "{count} comentários",
    "feedback.noCommentsYet": "Ainda não há comentários.",
    "feedback.addComment": "Adicionar comentário",
    "feedback.commentButton": "Comentar",
    "feedback.noFeedbackTitle": "Ainda não há feedback",
    "events.selected.eyebrow": "Eventos",
    "events.selected.description": "Revise o fluxo do evento selecionado sem mudar a navegação principal.",
    "events.root.eyebrow": "Eventos",
    "events.root.title": "Fluxos de eventos ativos",
    "events.root.description": "Abra o fluxo atual de Desert Storm ou Zombie Siege em um único hub de eventos.",
    "events.cardEyebrow": "Evento",
    "events.operational": "Ativo",
    "events.desertStorm.title": "Desert Storm",
    "events.desertStorm.description": "Vote, publique times e revise o evento atual de Desert Storm.",
    "events.desertStorm.open": "Abrir Desert Storm",
    "events.zombieSiege.title": "Zombie Siege",
    "events.zombieSiege.description": "Abra o fluxo atual de planejamento e elenco do Zombie Siege.",
    "events.zombieSiege.open": "Abrir Zombie Siege",
    "reminders.title": "Lembretes ativos",
    "reminders.description": "Lembretes operacionais",
    "reminders.activeCount": "{count} ativos",
    "reminders.createEyebrow": "Criar",
    "reminders.newReminder": "Novo lembrete",
    "reminders.newReminderDetail": "O lembrete dispara neste dispositivo usando o fluxo atual de notificações locais.",
    "reminders.titlePlaceholder": "Título do lembrete",
    "reminders.notesPlaceholder": "Notas opcionais",
    "reminders.modeElapsed": "Após duração",
    "reminders.modeAtLocal": "No horário local",
    "reminders.modeAtServer": "No horário do servidor",
    "reminders.modeServerTime": "Horário do servidor ({value})",
    "reminders.modeLocalTime": "Horário local",
    "reminders.durationLabel": "Duração: {value}",
    "reminders.elapsedHint": "A contagem regressiva começa quando você tocar em Criar lembrete.",
    "reminders.dateLabel": "Data: {value}",
    "reminders.timeLabel": "Hora: {value}",
    "reminders.serverTimeHint": "Este lembrete ficará ancorado ao horário do servidor ({value}).",
    "reminders.preview": "Prévia",
    "reminders.createButton": "Criar lembrete",
    "reminders.activeEyebrow": "Ativos",
    "reminders.activeTitle": "Lembretes ativos",
    "reminders.activeDetail": "Próximos lembretes que ainda têm notificações locais agendadas.",
    "reminders.noActiveTitle": "Nenhum lembrete ativo",
    "reminders.noActiveDetail": "Crie um lembrete para começar a acompanhar sua próxima janela de ação.",
    "reminders.inactiveEyebrow": "Histórico",
    "reminders.inactiveTitle": "Anteriores e cancelados",
    "reminders.inactiveDetail": "Lembretes concluídos ou cancelados ficam aqui para revisão rápida.",
    "reminders.nothingArchivedTitle": "Ainda não há histórico de lembretes",
    "reminders.nothingArchivedDetail": "Lembretes concluídos e cancelados aparecerão aqui.",
    "reminders.selectDuration": "Selecionar duração",
    "reminders.selectDate": "Selecionar data",
    "reminders.selectTime": "Selecionar horário",
    "reminders.errorDuration": "Escolha uma duração maior que zero.",
    "reminders.errorDate": "Escolha uma data válida.",
    "reminders.errorTime": "Escolha um horário válido.",
    "reminders.errorFuture": "O horário do lembrete deve estar no futuro.",
    "reminders.dueNow": "Vence agora",
    "reminders.fallbackTitle": "Lembrete",
    "reminders.statusActive": "Ativo",
    "reminders.statusCancelled": "Cancelado",
    "reminders.statusCompleted": "Concluído",
    "reminders.localTime": "Hora Local",
    "reminders.serverTime": "Hora do Servidor ({value})",
    "reminders.repeat": "Repetição",
    "reminders.oneTime": "Única vez",
    "calendar.screenEyebrow": "Calendário",
    "calendar.leaderControlsEyebrow": "Controles de líder",
    "calendar.leaderControlsDescription": "Crie e atualize entradas do calendário da aliança sem alterar a lógica base do evento.",
    "calendar.timeEntryEyebrow": "Entrada de horário",
    "calendar.leaderFallback": "Líder",
    "leaderControls.hero.eyebrow": "Controles de líder",
    "leaderControls.hero.title": "Avisos da aliança",
    "leaderControls.hero.description": "Use ferramentas exclusivas para líderes para se comunicar rapidamente com a aliança sem alterar os fluxos atuais de evento.",
    "leaderControls.hero.badgeLeaderOnly": "Só líder",
    "leaderControls.hero.badgePushReady": "Push pronto",
    "leaderControls.hero.badgePushLimited": "Push limitado",
    "leaderControls.presets.eyebrow": "Presets rápidos",
    "leaderControls.presets.title": "Atalhos para todos os membros",
    "leaderControls.presets.description": "Use um preset quando precisar avisar toda a aliança sem digitar uma mensagem personalizada.",
    "leaderControls.presets.digHint": "Este preset envia a mensagem exata `dig` para todos os membros que não optaram por sair.",
    "leaderControls.presets.memberCount": "{count} membros",
    "leaderControls.presets.digButton": "Enviar \"dig\" para todos",
    "leaderControls.common.sending": "Enviando...",
    "leaderControls.reachability.eyebrow": "Alcance de push",
    "leaderControls.reachability.title": "Quem pode receber dig agora",
    "leaderControls.reachability.description": "O alcance depende da preferência de dig de cada membro e de este backend ter um token push registrado para o dispositivo dele.",
    "leaderControls.reachability.reachableMembers": "{count} membros alcançáveis",
    "leaderControls.reachability.reachableDevices": "{count} dispositivos prontos para push",
    "leaderControls.reachability.noToken": "{count} sem configuração de push",
    "leaderControls.reachability.optedOut": "{count} desativaram",
    "leaderControls.reachability.noIssues": "No momento todos parecem alcançáveis para notificações de dig.",
    "leaderControls.reachability.noTokenTitle": "Falta configuração de push",
    "leaderControls.reachability.optedOutTitle": "Optaram por sair do dig",
    "leaderControls.reachability.noTokenReason": "Ainda não há token push salvo",
    "leaderControls.reachability.optedOutReason": "As notificações de dig estão desligadas",
    "leaderControls.broadcast.eyebrow": "Notificação push",
    "leaderControls.broadcast.titleAll": "Enviar para todos os membros",
    "leaderControls.broadcast.titleSelected": "Enviar para membros específicos",
    "leaderControls.broadcast.description": "Use o fluxo atual de push da aliança, mas escolha se essa notificação vai para todos ou apenas para os membros selecionados.",
    "leaderControls.broadcast.audienceAll": "Todos os membros",
    "leaderControls.broadcast.audienceSelected": "Membros específicos",
    "leaderControls.broadcast.selectedTitle": "Membros selecionados",
    "leaderControls.broadcast.selectedCount": "{count} selecionados",
    "leaderControls.broadcast.searchPlaceholder": "Buscar membros por nome ou patente",
    "leaderControls.broadcast.memberSelected": "Selecionado",
    "leaderControls.broadcast.memberTapToAdd": "Toque para adicionar",
    "leaderControls.broadcast.noMembersTitle": "Nenhum membro encontrado",
    "leaderControls.broadcast.noMembersDescription": "Ajuste a busca para encontrar membros da aliança para notificar.",
    "leaderControls.broadcast.messagePlaceholder": "Digite a nota que deseja enviar para a aliança.",
    "leaderControls.broadcast.selectedHint": "Somente os membros selecionados com dispositivos registrados para push receberão este alerta.",
    "leaderControls.broadcast.allHint": "Isto envia um alerta direto para toda a aliança usando a configuração atual de tokens Expo push. Dispositivos sem token registrado não receberão.",
    "leaderControls.broadcast.sendButton": "Enviar notificação push",
    "leaderControls.history.eyebrow": "Histórico",
    "leaderControls.history.title": "Pushes recentes",
    "leaderControls.history.openDetail": "Toque para ocultar o histórico recente de push.",
    "leaderControls.history.closedDetail": "Toque para abrir a pasta do histórico recente de push.",
    "leaderControls.history.loggedCount": "{count} registrados",
    "leaderControls.history.emptyBadge": "Vazio",
    "leaderControls.history.openBadge": "Aberto",
    "leaderControls.history.closedBadge": "Fechado",
    "leaderControls.history.unknownTime": "Horário desconhecido",
    "leaderControls.history.unknownSender": "Remetente desconhecido",
    "leaderControls.history.audienceSelected": "Selecionados",
    "leaderControls.history.audienceAll": "Todos",
    "leaderControls.history.noMessage": "Nenhuma mensagem registrada",
    "leaderControls.history.oneDeviceTargeted": "1 dispositivo alvo",
    "leaderControls.history.devicesTargeted": "{count} dispositivos alvo",
    "leaderControls.history.membersSelected": "{count} membros selecionados",
    "leaderControls.history.noHistoryTitle": "Ainda não há histórico de push",
    "leaderControls.history.noHistoryDescription": "Novos avisos e presets de dig aparecerão aqui depois de serem enviados."
  }
};
const TRANSLATIONS = {
  en: RAW_TRANSLATIONS.en,
  ko: repairMojibakeDeep(RAW_TRANSLATIONS.ko),
  es: repairMojibakeDeep(RAW_TRANSLATIONS.es),
  pt: repairMojibakeDeep(RAW_TRANSLATIONS.pt)
};

function getTranslator(language) {
  const locale = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (key, values = {}) => {
    const localizedTemplate = locale[key];
    const shouldFallback = !localizedTemplate || hasMojibake(localizedTemplate);
    if (__DEV__ && language && language !== "en" && shouldFallback && TRANSLATIONS.en[key]) {
      console.warn(`[i18n] Missing or invalid translation for "${key}" in ${language}; falling back to English.`);
    }
    const template = shouldFallback ? TRANSLATIONS.en[key] || localizedTemplate || key : localizedTemplate;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "");
  };
}

function getCalendarTranslator(language) {
  const locale = CALENDAR_TRANSLATIONS[language] || CALENDAR_TRANSLATIONS.en;
  return (key, values = {}) => {
    const localizedTemplate = locale[key];
    const shouldFallback = !localizedTemplate || hasMojibake(localizedTemplate);
    if (__DEV__ && language && language !== "en" && shouldFallback && CALENDAR_TRANSLATIONS.en[key]) {
      console.warn(`[i18n] Missing or invalid calendar translation for "${key}" in ${language}; falling back to English.`);
    }
    const template = shouldFallback ? CALENDAR_TRANSLATIONS.en[key] || localizedTemplate || key : localizedTemplate;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "");
  };
}

function getCalendarWeekdayLabel(code, language) {
  const option = CALENDAR_WEEKDAY_OPTIONS.find((entry) => entry.code === code);
  if (!option) return code;
  try {
    return new Intl.DateTimeFormat(language || undefined, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, 7 + option.index)));
  } catch {
    return option.label;
  }
}

function tabLabel(tab, leader, joinRequests, t) {
  if (tab === "home") return t("tabHome");
  if (tab === "calendar") return t("tabCalendar");
  if (tab === "events") return t("tabEvents");
  if (tab === "reminders") return t("tabReminders");
  if (tab === "more") return `${t("tabMore")}${leader && joinRequests.length ? ` (${joinRequests.length})` : ""}`;
  return t("tabDashboard");
}

function getTabIconName(tab, active) {
  if (tab === "home") return active ? "home" : "home-outline";
  if (tab === "calendar") return active ? "calendar" : "calendar-outline";
  if (tab === "events") return active ? "flash" : "flash-outline";
  if (tab === "reminders") return active ? "notifications" : "notifications-outline";
  if (tab === "more") return active ? "ellipsis-horizontal-circle" : "ellipsis-horizontal";
  return active ? "grid" : "grid-outline";
}

function ScreenContainer(props) {
  return <SharedScreenContainer {...props} styles={styles} />;
}

function SectionHeader(props) {
  return <SharedSectionHeader {...props} styles={styles} />;
}

function AppBackHeader(props) {
  return <SharedAppBackHeader {...props} styles={styles} />;
}

function AppCard(props) {
  return <SharedAppCard {...props} styles={styles} />;
}

function StatusBadge(props) {
  return <SharedStatusBadge {...props} styles={styles} />;
}

function PrimaryButton(props) {
  return <SharedPrimaryButton {...props} styles={styles} />;
}

function SecondaryButton(props) {
  return <SharedSecondaryButton {...props} styles={styles} />;
}

function ListRow(props) {
  return <SharedListRow {...props} styles={styles} />;
}

function BottomSheetModal(props) {
  return <SharedBottomSheetModal {...props} styles={styles} />;
}

function LanguageSelector(props) {
  return <SharedLanguageSelector {...props} options={SUPPORTED_LANGUAGES} styles={styles} />;
}

function RankSelector(props) {
  return <SharedRankSelector {...props} options={RANK_OPTIONS} styles={styles} />;
}

function CalendarTimePickerModal(props) {
  return <SharedCalendarTimePickerModal {...props} styles={styles} itemHeight={CALENDAR_WHEEL_ITEM_HEIGHT} BottomSheetModal={BottomSheetModal} SectionHeader={SectionHeader} PrimaryButton={PrimaryButton} />;
}

function CalendarDatePickerModal(props) {
  return <SharedCalendarDatePickerModal {...props} styles={styles} itemHeight={CALENDAR_WHEEL_ITEM_HEIGHT} BottomSheetModal={BottomSheetModal} SectionHeader={SectionHeader} PrimaryButton={PrimaryButton} />;
}

function ReminderDurationPickerModal(props) {
  return <SharedReminderDurationPickerModal {...props} styles={styles} itemHeight={CALENDAR_WHEEL_ITEM_HEIGHT} BottomSheetModal={BottomSheetModal} SectionHeader={SectionHeader} PrimaryButton={PrimaryButton} />;
}

function AuthScreen({ authMode, setAuthMode, authUsername, setAuthUsername, authPassword, setAuthPassword, loading, errorMessage, language, onChangeLanguage, t, onSignIn, onCreate }) {
  return <ScreenContainer>
    <View style={styles.screen}>
      <AppCard style={styles.homeHeroCard}>
        <SectionHeader eyebrow="Alliance Command" title="LW Admin" detail="Sign in or create an account to access alliance operations." />
        <StatusBadge label={authMode === "signin" ? "Sign In" : "Create Account"} tone="info" />
      </AppCard>
      <AppCard>
        <SectionHeader eyebrow="Access" title={authMode === "signin" ? "Sign in" : "Create account"} detail="Your existing authentication flow is unchanged." />
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half, authMode === "signin" && styles.modeButtonActive]} onPress={() => setAuthMode("signin")}><Text style={[styles.secondaryButtonText, authMode === "signin" && styles.modeButtonTextActive]}>Sign In</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, authMode === "create" && styles.modeButtonActive]} onPress={() => setAuthMode("create")}><Text style={[styles.secondaryButtonText, authMode === "create" && styles.modeButtonTextActive]}>Create</Text></Pressable>
        </View>
        <TextInput value={authUsername} onChangeText={setAuthUsername} style={styles.input} placeholder="Username" autoCapitalize="none" />
        <TextInput value={authPassword} onChangeText={setAuthPassword} style={styles.input} placeholder="Password" secureTextEntry />
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        <PrimaryButton label={loading ? "Working..." : authMode === "signin" ? "Sign In" : "Create Account"} onPress={authMode === "signin" ? onSignIn : onCreate} disabled={loading} />
      </AppCard>
      <AppCard>
        <SectionHeader eyebrow="Preferences" title="Language" detail="Choose your app language before signing in." />
        <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} />
      </AppCard>
    </View>
  </ScreenContainer>;
}

function AllianceSetupScreen({ account, setupMode, setSetupMode, allianceCodeInput, setAllianceCodeInput, allianceNameInput, setAllianceNameInput, alliancePreview, joinRequest, loading, errorMessage, language, onChangeLanguage, t, onPreview, onJoin, onCreateAlliance, onRefreshStatus, onSignOut }) {
  return <ScreenContainer>
    <View style={styles.screen}>
      <AppCard style={styles.settingsHeroCard}>
        <SectionHeader eyebrow="Alliance Setup" title="Join or create an alliance" detail={`Signed in as ${account?.username || "member"}.`} />
        <StatusBadge label={setupMode === "create" ? "Create Alliance" : "Join Alliance"} tone="info" />
      </AppCard>
      <AppCard>
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half, setupMode === "join" && styles.modeButtonActive]} onPress={() => setSetupMode("join")}><Text style={[styles.secondaryButtonText, setupMode === "join" && styles.modeButtonTextActive]}>Join Mode</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, setupMode === "create" && styles.modeButtonActive]} onPress={() => setSetupMode("create")}><Text style={[styles.secondaryButtonText, setupMode === "create" && styles.modeButtonTextActive]}>Create Mode</Text></Pressable>
        </View>
        {setupMode === "join" ? <>
          <TextInput value={allianceCodeInput} onChangeText={setAllianceCodeInput} style={styles.input} placeholder="Alliance code" autoCapitalize="characters" />
          <View style={styles.row}>
            <PrimaryButton label="Preview Alliance" onPress={onPreview} style={styles.half} disabled={loading} />
            <PrimaryButton label={joinRequest ? "Request Pending" : "Join Alliance"} onPress={onJoin} style={styles.half} disabled={Boolean(joinRequest) || loading || !String(allianceCodeInput || "").trim()} tone="blue" />
          </View>
          <SecondaryButton label="Refresh Status" onPress={onRefreshStatus} disabled={loading} />
          {alliancePreview ? <AppCard style={styles.settingsNestedCard}><Text style={styles.cardTitle}>{alliancePreview.name}</Text><Text style={styles.hint}>Code: {alliancePreview.code}</Text><PrimaryButton label={joinRequest ? "Request Pending" : "Join Alliance"} onPress={onJoin} disabled={Boolean(joinRequest) || loading} /></AppCard> : null}
          {joinRequest ? <Text style={styles.hint}>Your join request is pending leader approval.</Text> : null}
        </> : <>
          <TextInput value={allianceNameInput} onChangeText={setAllianceNameInput} style={styles.input} placeholder="Alliance name" />
          <TextInput value={allianceCodeInput} onChangeText={setAllianceCodeInput} style={styles.input} placeholder="Alliance code" autoCapitalize="characters" />
          <PrimaryButton label="Create Alliance" onPress={onCreateAlliance} disabled={loading} />
        </>}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
      </AppCard>
      <AppCard>
        <SectionHeader eyebrow="Preferences" title="Language" detail="Update language before you join or create." />
        <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} />
        <SecondaryButton label="Sign Out" onPress={onSignOut} />
      </AppCard>
    </View>
  </ScreenContainer>;
}

export default function App() {
  const [backendUrlInput, setBackendUrlInput] = useState(DEFAULT_BACKEND_URL);
  const [language, setLanguage] = useState("en");
  const [authMode, setAuthMode] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [setupMode, setSetupMode] = useState("join");
  const [allianceCodeInput, setAllianceCodeInput] = useState("PAKX2023");
  const [allianceNameInput, setAllianceNameInput] = useState("");
  const [session, setSession] = useState({ backendUrl: "", token: "" });
  const [account, setAccount] = useState(null);
  const [alliance, setAlliance] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [joinRequest, setJoinRequest] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("home");
  const [eventsSelection, setEventsSelection] = useState("");
  const [moreSelection, setMoreSelection] = useState("");
  const [alliancePreview, setAlliancePreview] = useState(null);
  const [playerModal, setPlayerModal] = useState(null);
  const [playerPickerFilter, setPlayerPickerFilter] = useState("players");
  const [searchText, setSearchText] = useState("");
  const [memberSearchText, setMemberSearchText] = useState("");
  const [memberSortMode, setMemberSortMode] = useState("rankDesc");
  const [memberRankFilter, setMemberRankFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRank, setNewMemberRank] = useState("R1");
  const [newMemberPower, setNewMemberPower] = useState("");
  const [leaderBroadcastMessage, setLeaderBroadcastMessage] = useState("");
  const [leaderBroadcastAudience, setLeaderBroadcastAudience] = useState("all");
  const [leaderBroadcastSelectedMemberIds, setLeaderBroadcastSelectedMemberIds] = useState([]);
  const [leaderBroadcastMemberSearchText, setLeaderBroadcastMemberSearchText] = useState("");
  const [leaderBroadcastHistory, setLeaderBroadcastHistory] = useState([]);
  const [leaderBroadcastReachability, setLeaderBroadcastReachability] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [calendarView, setCalendarView] = useState("today");
  const [newCalendarTitle, setNewCalendarTitle] = useState("");
  const [newCalendarDescription, setNewCalendarDescription] = useState("");
  const [newCalendarDate, setNewCalendarDate] = useState(formatLocalDateKey(new Date()));
  const [newCalendarEndDate, setNewCalendarEndDate] = useState(formatLocalDateKey(new Date()));
  const [newCalendarStartTime, setNewCalendarStartTime] = useState("09:00");
  const [newCalendarEndTime, setNewCalendarEndTime] = useState("10:00");
  const [newCalendarTimeInputMode, setNewCalendarTimeInputMode] = useState("server");
  const [newCalendarAllDay, setNewCalendarAllDay] = useState(true);
  const [newCalendarEntryType, setNewCalendarEntryType] = useState("manual");
  const [newCalendarRepeat, setNewCalendarRepeat] = useState("none");
  const [newCalendarRepeatEndDate, setNewCalendarRepeatEndDate] = useState("");
  const [newCalendarRepeatWeekdays, setNewCalendarRepeatWeekdays] = useState([]);
  const [newCalendarLinkedType, setNewCalendarLinkedType] = useState("");
  const [newCalendarLinkedEventId, setNewCalendarLinkedEventId] = useState("");
  const [newCalendarEventTimeZone, setNewCalendarEventTimeZone] = useState(getDeviceTimeZone());
  const [newCalendarLeaderNotes, setNewCalendarLeaderNotes] = useState("");
  const [newCalendarLeaderOnly, setNewCalendarLeaderOnly] = useState(false);
  const [editingCalendarEntryId, setEditingCalendarEntryId] = useState("");
  const [newAllianceCode, setNewAllianceCode] = useState("");
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [pushPromptDismissed, setPushPromptDismissed] = useState(false);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState("unknown");
  const [notificationSetupInFlight, setNotificationSetupInFlight] = useState(false);
  const [selectedDesertStormEventId, setSelectedDesertStormEventId] = useState("");
  const [desertStormSection, setDesertStormSection] = useState("vote");
  const [newDesertStormEventTitle, setNewDesertStormEventTitle] = useState("");
  const [desertStormMoveSource, setDesertStormMoveSource] = useState(null);
  const [selectedZombieSiegeEventId, setSelectedZombieSiegeEventId] = useState("");
  const [newZombieSiegeTitle, setNewZombieSiegeTitle] = useState("");
  const [newZombieSiegeStartAt, setNewZombieSiegeStartAt] = useState(formatLocalDateTimeInput(new Date()));
  const [newZombieSiegeEndAt, setNewZombieSiegeEndAt] = useState(formatLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [newZombieSiegeVoteClosesAt, setNewZombieSiegeVoteClosesAt] = useState(formatLocalDateTimeInput(new Date()));
  const [newZombieSiegeThreshold, setNewZombieSiegeThreshold] = useState("");
  const [calendarTimePickerTarget, setCalendarTimePickerTarget] = useState("");
  const [calendarDatePickerTarget, setCalendarDatePickerTarget] = useState("");
  const [calendarFormError, setCalendarFormError] = useState("");
  const reminderSyncInFlight = useRef(false);
  const t = useMemo(() => getTranslator(language), [language]);

  const players = alliance?.players || [];
  const calendarEntries = alliance?.calendarEntries || [];
  const desertStormEvents = alliance?.desertStormEvents || [];
  const feedbackEntries = alliance?.feedbackEntries || [];
  const zombieSiegeEvents = alliance?.zombieSiegeEvents || [];
  const leader = currentUser ? isLeader(currentUser.rank) : false;
  const tabs = ALL_TABS;

  function openEventsDestination(destination) {
    setActiveTab("events");
    setEventsSelection(destination);
  }

  function openMoreDestination(destination) {
    setActiveTab("more");
    setMoreSelection(destination);
  }

  function handleTabPress(nextTab) {
    setActiveTab(nextTab);
    if (nextTab !== "events") {
      setEventsSelection("");
    }
    if (nextTab !== "more") {
      setMoreSelection("");
    }
  }

  const backNavigation = useMemo(() => {
    if (activeTab === "events" && eventsSelection) {
      return {
        visible: true,
        title: eventsSelection === "desertStorm" ? "Desert Storm" : "Zombie Siege",
        onBack: () => setEventsSelection("")
      };
    }
    if (activeTab === "more" && moreSelection) {
      return {
        visible: true,
        title: moreSelection === "leaderControls"
          ? "Leader Controls"
          : moreSelection === "members"
            ? "Members"
            : moreSelection === "settings"
              ? t("settings.title")
              : "Feedback",
        onBack: () => setMoreSelection("")
      };
    }
    return { visible: false, title: "", onBack: null };
  }, [activeTab, eventsSelection, moreSelection, t]);
  const options = useMemo(() => createPlayerOptions(players), [players]);
  const activeDesertStormEvent = useMemo(() => findCurrentDesertStormEvent(desertStormEvents), [desertStormEvents]);
  const archivedDesertStormEvents = useMemo(() => getDesertStormHistoryEvents(desertStormEvents), [desertStormEvents]);
  const selectedDesertStormEvent = useMemo(() => {
    if (!desertStormEvents.length) return null;
    return desertStormEvents.find((event) => event.id === selectedDesertStormEventId) || activeDesertStormEvent || desertStormEvents[0];
  }, [desertStormEvents, selectedDesertStormEventId, activeDesertStormEvent]);
  const desertStormLeaderTaskForces = selectedDesertStormEvent?.draftTaskForces || emptyTaskForces();
  const desertStormMemberTaskForces = selectedDesertStormEvent?.publishedTaskForces || emptyTaskForces();
  const desertStormVisibleTaskForces = leader ? desertStormLeaderTaskForces : desertStormMemberTaskForces;
  const desertStormDashboard = useMemo(() => buildDashboard(desertStormVisibleTaskForces, options), [desertStormVisibleTaskForces, options]);
  const taskForceA = useMemo(() => buildTaskForceView(desertStormVisibleTaskForces.taskForceA || emptyTaskForces().taskForceA, "Task Force A", options, desertStormDashboard.duplicatePlayers), [desertStormVisibleTaskForces, options, desertStormDashboard.duplicatePlayers]);
  const taskForceB = useMemo(() => buildTaskForceView(desertStormVisibleTaskForces.taskForceB || emptyTaskForces().taskForceB, "Task Force B", options, desertStormDashboard.duplicatePlayers), [desertStormVisibleTaskForces, options, desertStormDashboard.duplicatePlayers]);
  const selectedTaskForce = desertStormSection === "taskForceB" ? taskForceB : taskForceA;
  const desertStormAssignment = useMemo(() => activeDesertStormEvent?.myAssignment || null, [activeDesertStormEvent]);
  const assignedPlayerNames = useMemo(() => getAssignedPlayerNames(desertStormLeaderTaskForces, playerModal), [desertStormLeaderTaskForces, playerModal]);
  const selectedZombieSiegeEvent = useMemo(() => {
    if (!zombieSiegeEvents.length) return null;
    return zombieSiegeEvents.find((event) => event.id === selectedZombieSiegeEventId) || zombieSiegeEvents[0];
  }, [zombieSiegeEvents, selectedZombieSiegeEventId]);
  const desertStormVoteResponseByPlayerId = useMemo(() => {
    const entries = selectedDesertStormEvent?.vote?.responses || [];
    return new Map(entries.map((entry) => [entry.playerId, entry]));
  }, [selectedDesertStormEvent?.vote?.responses]);
  const defaultPlayerPickerFilter = playerModal?.memberType === "Sub" ? "subs" : "players";
  const filteredOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const issueNames = new Set(desertStormDashboard.duplicatePlayers || []);
    const filtered = options.filter((player) => {
      const response = desertStormVoteResponseByPlayerId.get(player.id);
      const isAssigned = assignedPlayerNames.has(player.name);
      if (!playerModal) {
        return !isAssigned;
      }
      switch (playerPickerFilter) {
        case "players":
          return response?.optionId === "play" && !isAssigned;
        case "subs":
          return response?.optionId === "sub" && !isAssigned;
        case "all":
          return true;
        case "assigned":
          return isAssigned;
        case "unassigned":
          return !isAssigned;
        case "issues":
          return issueNames.has(player.name) || isAssigned || !response || response.optionId === "no";
        default:
          return !isAssigned;
      }
    });
    return !q ? filtered : filtered.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q));
  }, [options, searchText, playerModal, playerPickerFilter, assignedPlayerNames, desertStormVoteResponseByPlayerId, desertStormDashboard.duplicatePlayers]);
  const playerPickerRows = useMemo(() => {
    const duplicateNames = new Set(desertStormDashboard.duplicatePlayers || []);
    return filteredOptions.map((player) => {
      const response = desertStormVoteResponseByPlayerId.get(player.id);
      const isAssigned = assignedPlayerNames.has(player.name);
      const issueBadges = [];
      if (!response) {
        issueBadges.push({ label: "No Vote", tone: "warning" });
      } else if (response.optionId === "no") {
        issueBadges.push({ label: "Not Playing", tone: "danger" });
      }
      if (duplicateNames.has(player.name)) {
        issueBadges.push({ label: "Duplicate", tone: "danger" });
      }
      if (isAssigned) {
        issueBadges.push({ label: "Assigned", tone: "info" });
      }
      return {
        ...player,
        voteLabel: !response ? "No response" : response.optionId === "play" ? "Player" : response.optionId === "sub" ? "Sub" : "Not Playing",
        statusLabel: isAssigned ? "Assigned" : "Available",
        statusTone: isAssigned ? "info" : "success",
        issueBadges
      };
    });
  }, [filteredOptions, desertStormDashboard.duplicatePlayers, desertStormVoteResponseByPlayerId, assignedPlayerNames]);
  const filteredMembers = useMemo(() => { const q = memberSearchText.trim().toLowerCase(); const rankWeight = { R5: 5, R4: 4, R3: 3, R2: 2, R1: 1 }; const rankFilteredPlayers = memberRankFilter === "all" ? players : players.filter((p) => p.rank === memberRankFilter); const matchingPlayers = !q ? rankFilteredPlayers : rankFilteredPlayers.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q)); return [...matchingPlayers].sort((a, b) => memberSortMode === "name" ? a.name.localeCompare(b.name) : (rankWeight[b.rank] || 0) - (rankWeight[a.rank] || 0) || a.name.localeCompare(b.name)); }, [players, memberSearchText, memberSortMode, memberRankFilter]);
  const activeDesertStormVote = activeDesertStormEvent?.vote?.status === "open" ? activeDesertStormEvent.vote : null;
  const desertStormViewState = useMemo(() => getDesertStormViewState({
    activeEvent: activeDesertStormEvent,
    hasVoted: Boolean(activeDesertStormEvent?.vote?.didVote),
    isPublished: Boolean(activeDesertStormEvent?.publishedAt) || activeDesertStormEvent?.status === "published"
  }), [activeDesertStormEvent]);
  const desertStormVoteNeedsResponse = desertStormViewState === "vote_open_not_voted";
  const androidPushTemporarilyDisabled = Platform.OS === "android";
  const shouldShowPushNotificationsPrompt = Boolean(session.token && alliance && currentUser && !androidPushTemporarilyDisabled && currentUser.desertStormVoteNotificationsEnabled !== false && !currentUser.hasExpoPushToken && notificationPermissionStatus !== "granted" && !pushPromptDismissed);
  const todayCalendarEntries = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date());
    return expandCalendarEntries(calendarEntries, todayKey, todayKey);
  }, [calendarEntries]);
  const editingCalendarEntry = useMemo(() => calendarEntries.find((entry) => entry.id === editingCalendarEntryId) || null, [calendarEntries, editingCalendarEntryId]);
  const currentZombieSiegeAssignment = selectedZombieSiegeEvent?.myAssignment || null;

  useEffect(() => {
    if (!calendarFormError) {
      return;
    }
    setCalendarFormError("");
  }, [newCalendarDate, newCalendarEndDate, newCalendarStartTime, newCalendarEndTime, newCalendarAllDay, newCalendarRepeatEndDate, newCalendarTimeInputMode]);

  useEffect(() => {
    if (newCalendarAllDay) {
      setCalendarTimePickerTarget("");
    }
  }, [newCalendarAllDay]);

  useEffect(() => {
    if (newCalendarAllDay) {
      return;
    }
    if (newCalendarEndDate < newCalendarDate) {
      setNewCalendarEndDate(newCalendarDate);
      return;
    }
    const startMinutes = getTimeValueMinutes(newCalendarStartTime);
    const endMinutes = getTimeValueMinutes(newCalendarEndTime);
    if (newCalendarEndDate === newCalendarDate && startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      setNewCalendarEndTime(newCalendarStartTime);
    }
  }, [newCalendarAllDay, newCalendarDate, newCalendarEndDate, newCalendarStartTime, newCalendarEndTime]);

  function clearSessionState(message = "") {
    const nextMessage = typeof message === "string" ? message : "";
    setSession({ backendUrl: "", token: "" });
    setAccount(null);
    setAlliance(null);
    setCurrentUser(null);
    setReminders([]);
    setJoinRequest(null);
    setJoinRequests([]);
    setLeaderBroadcastHistory([]);
    setAuthMode("");
    setSetupMode("join");
    setAlliancePreview(null);
    setActiveTab("home");
    setEventsSelection("");
    setMoreSelection("");
    setNewAllianceCode("");
    if (nextMessage) {
      setErrorMessage(nextMessage);
    }
  }

  function openDesertStormVoteArea(eventId = "") {
    openEventsDestination("desertStorm");
    setDesertStormSection("vote");
    if (eventId) {
      setSelectedDesertStormEventId(eventId);
    } else if (activeDesertStormEvent?.id) {
      setSelectedDesertStormEventId(activeDesertStormEvent.id);
    }
  }

  function openDesertStormTaskForceArea(eventId = "") {
    const targetEvent = (desertStormEvents || []).find((event) => event.id === eventId)
      || (activeDesertStormEvent?.id === eventId ? activeDesertStormEvent : null)
      || activeDesertStormEvent
      || null;
    const targetSection = targetEvent?.myAssignment?.taskForceKey === "taskForceB" ? "taskForceB" : "taskForceA";
    openEventsDestination("desertStorm");
    setDesertStormSection(targetSection);
    if (eventId) {
      setSelectedDesertStormEventId(eventId);
    } else if (targetEvent?.id) {
      setSelectedDesertStormEventId(targetEvent.id);
    }
  }

  function openLinkedCalendarEntry(entry) {
    if (!entry?.linkedType) {
      return;
    }
    if (entry.linkedType === "desertStorm") {
      openEventsDestination("desertStorm");
      setDesertStormSection("vote");
      if (entry.linkedEventId) {
        setSelectedDesertStormEventId(entry.linkedEventId);
      }
      return;
    }
    if (entry.linkedType === "zombieSiege") {
      openEventsDestination("zombieSiege");
      if (entry.linkedEventId) {
        setSelectedZombieSiegeEventId(entry.linkedEventId);
      }
    }
  }

  function resetCalendarForm() {
    setEditingCalendarEntryId("");
    setNewCalendarTitle("");
    setNewCalendarDescription("");
    setNewCalendarDate(formatLocalDateKey(new Date()));
    setNewCalendarEndDate(formatLocalDateKey(new Date()));
    setNewCalendarStartTime("09:00");
    setNewCalendarEndTime("10:00");
    setNewCalendarTimeInputMode("server");
    setNewCalendarAllDay(true);
    setNewCalendarEntryType("manual");
    setNewCalendarRepeat("none");
    setNewCalendarRepeatEndDate("");
    setNewCalendarRepeatWeekdays([]);
    setNewCalendarLinkedType("");
    setNewCalendarLinkedEventId("");
    setNewCalendarEventTimeZone(getDeviceTimeZone());
    setNewCalendarLeaderNotes("");
    setNewCalendarLeaderOnly(false);
    setCalendarTimePickerTarget("");
    setCalendarDatePickerTarget("");
    setCalendarFormError("");
  }

  function beginCalendarEntryEdit(entry) {
    if (!entry) {
      return;
    }
    const recurrence = normalizeCalendarRecurrence(entry);
    setEditingCalendarEntryId(entry.sourceEntryId || entry.id || "");
    setNewCalendarTitle(entry.title || "");
    setNewCalendarDescription(entry.description || "");
    setNewCalendarDate(entry.allDay !== false ? (entry.startDate || formatLocalDateKey(entry.startsAt || new Date())) : (entry.serverStartDate || entry.startDate || formatLocalDateKey(entry.startsAt || new Date())));
    setNewCalendarEndDate(entry.allDay !== false ? (entry.endDate || entry.startDate || formatLocalDateKey(entry.endAt || entry.startsAt || new Date())) : (entry.serverEndDate || entry.endDate || entry.serverStartDate || entry.startDate || formatLocalDateKey(entry.endAt || entry.startsAt || new Date())));
    setNewCalendarStartTime(entry.serverStartTime || entry.startTime || "09:00");
    setNewCalendarEndTime(entry.serverEndTime || entry.endTime || "10:00");
    setNewCalendarTimeInputMode("server");
    setNewCalendarAllDay(entry.allDay !== false);
    setNewCalendarEntryType(entry.entryType || "manual");
    setNewCalendarRepeat(recurrence.repeat || "none");
    setNewCalendarRepeatEndDate(recurrence.endDate || "");
    setNewCalendarRepeatWeekdays(recurrence.weekdays || []);
    setNewCalendarLinkedType(entry.linkedType || "");
    setNewCalendarLinkedEventId(entry.linkedEventId || "");
    setNewCalendarEventTimeZone(getDeviceTimeZone());
    setNewCalendarLeaderNotes(entry.leaderNotes || "");
    setNewCalendarLeaderOnly(Boolean(entry.leaderOnly));
    setCalendarDatePickerTarget("");
    setCalendarFormError("");
    setActiveTab("calendar");
  }

  async function persistSession(nextSession) {
    setSession(nextSession);
    setBackendUrlInput(nextSession?.backendUrl || DEFAULT_BACKEND_URL);
    if (nextSession?.token && nextSession?.backendUrl) {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }

  async function changeLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  async function signOut(message = "") {
    const nextMessage = typeof message === "string" ? message : "";
    if (currentUser?.id) {
      await clearCalendarNotificationsForMember(currentUser.id).catch(() => {});
    }
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    clearSessionState(nextMessage);
  }

  async function dismissPushNotificationsPrompt() {
    setPushPromptDismissed(true);
    await AsyncStorage.setItem(PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY, "true");
  }

  async function syncPushNotifications({ requestPermission = false } = {}) {
    if (!session.token || !session.backendUrl || !currentUser || !alliance) {
      return false;
    }
    if (Platform.OS === "android") {
      return false;
    }
    try {
      setNotificationSetupInFlight(true);
      let permission = await Notifications.getPermissionsAsync();
      let status = permission.status || "undetermined";
      if (status !== "granted" && requestPermission) {
        permission = await Notifications.requestPermissionsAsync();
        status = permission.status || "undetermined";
      }
      setNotificationPermissionStatus(status);
      if (status !== "granted") {
        return false;
      }
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Expo project ID is missing for push notifications.");
      }
      const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
      const expoPushToken = String(tokenResponse?.data || "");
      if (!expoPushToken) {
        throw new Error("Unable to get an Expo push token for this device.");
      }
      await registerExpoPushTokenRequest(session.backendUrl, session.token, expoPushToken);
      setPushPromptDismissed(true);
      await AsyncStorage.setItem(PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY, "true");
      await refresh();
      return true;
    } catch (error) {
      setErrorMessage(error.message || "Unable to enable push notifications.");
      return false;
    } finally {
      setNotificationSetupInFlight(false);
    }
  }

  async function handleRequestError(error) {
    if (error?.status === 401) {
      await signOut(t("sessionExpired"));
      return;
    }
    setErrorMessage(error.message || "Request failed.");
  }

  async function run(work) {
    try {
      setLoading(true);
      setErrorMessage("");
      await work();
    } catch (error) {
      await handleRequestError(error);
    } finally {
      setLoading(false);
    }
  }

  async function refresh(token = session.token, backendUrl = session.backendUrl) {
    const me = await getMe(backendUrl, token);
    const reminderResponse = me.player ? await getRemindersRequest(backendUrl, token) : { reminders: [] };
    setAccount(me.account);
    setAlliance(me.alliance);
    setCurrentUser(me.player);
    setReminders(reminderResponse.reminders || []);
    setJoinRequest(me.joinRequest || null);
    setAlliancePreview((current) => me.alliance
      ? { id: me.alliance.id, name: me.alliance.name, code: me.alliance.code, players: me.alliance.players }
      : (me.joinRequest ? current : null));
    setNewAllianceCode(me.alliance?.code || "");
    if (me.alliance && me.player && isLeader(me.player.rank)) {
      const jr = await getJoinRequests(backendUrl, token);
      setJoinRequests(jr.joinRequests || []);
      const historyResponse = await getAllianceBroadcastPushHistoryRequest(backendUrl, token);
      setLeaderBroadcastHistory(historyResponse.history || []);
      const reachabilityResponse = await getAlliancePushReachabilityRequest(backendUrl, token);
      setLeaderBroadcastReachability(reachabilityResponse || null);
    } else {
      setJoinRequests([]);
      setLeaderBroadcastHistory([]);
      setLeaderBroadcastReachability(null);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        const storedPushPromptDismissed = await AsyncStorage.getItem(PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY);
        if (storedLanguage && TRANSLATIONS[storedLanguage]) {
          setLanguage(storedLanguage);
        }
        if (alive) {
          setPushPromptDismissed(storedPushPromptDismissed === "true");
        }
        try {
          const permission = await Notifications.getPermissionsAsync();
          if (alive) {
            setNotificationPermissionStatus(permission.status || "undetermined");
          }
        } catch {
          if (alive) {
            setNotificationPermissionStatus("unknown");
          }
        }
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (!(parsed?.token && parsed?.backendUrl)) return;
        if (!alive) return;
        setSession(parsed);
        setBackendUrlInput(parsed.backendUrl);
        await refresh(parsed.token, parsed.backendUrl);
      } catch (error) {
        if (!alive) return;
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        clearSessionState(error?.status === 401 ? t("sessionExpired") : "");
      } finally {
        if (alive) setSessionReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!session.token || !session.backendUrl || (!alliance && !joinRequest)) {
      return undefined;
    }
    const intervalMs = alliance ? 30000 : 15000;
    const intervalId = setInterval(() => {
      refresh().catch((error) => {
        handleRequestError(error).catch(() => {});
      });
    }, intervalMs);
    return () => clearInterval(intervalId);
  }, [session.token, session.backendUrl, alliance, joinRequest?.id, activeTab]);

  useEffect(() => {
    const handleNotificationNavigation = (response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data?.type === "desertStormVote") {
        openDesertStormVoteArea(String(data.eventId || ""));
      } else if (data?.type === "desertStormAssignmentsPublished") {
        openDesertStormTaskForceArea(String(data.eventId || ""));
      } else if (data?.type === "calendarEvent") {
        handleTabPress("calendar");
      } else if (data?.type === "reminder") {
        handleTabPress("reminders");
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      handleNotificationNavigation(response);
    }).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationNavigation(response);
    });
    return () => subscription.remove();
  }, [desertStormEvents, activeDesertStormEvent?.id]);

  useEffect(() => {
    if (!session.token || !session.backendUrl || !alliance || !currentUser) {
      return;
    }
    if (Platform.OS === "android" || notificationPermissionStatus !== "granted" || currentUser.hasExpoPushToken) {
      return;
    }
    syncPushNotifications().catch(() => {});
  }, [session.token, session.backendUrl, alliance, currentUser?.id, currentUser?.hasExpoPushToken, notificationPermissionStatus]);

  useEffect(() => {
    if (!session.token || !currentUser?.id || !alliance) {
      return;
    }
    (async () => {
      try {
        await reconcileCalendarNotifications(calendarEntries, currentUser.id);
      } catch {
        // Swallow calendar notification reconciliation failures to avoid blocking app usage.
      }
    })();
  }, [session.token, currentUser?.id, alliance, calendarEntries]);

  useEffect(() => {
    if (!session.token || !session.backendUrl || !currentUser?.id || !reminders.length || reminderSyncInFlight.current) {
      return;
    }
    let alive = true;
    (async () => {
      const permissionGranted = await ensureReminderNotificationPermission();
      if (!alive || !permissionGranted || reminderSyncInFlight.current) {
        return;
      }
      reminderSyncInFlight.current = true;
      try {
        for (const reminder of reminders) {
          const fireAt = new Date(reminder.scheduledForUtc).getTime();
          const isFuture = !Number.isNaN(fireAt) && fireAt > Date.now();
          if (reminder.status === "active" && isFuture && !reminder.notificationId) {
            const notificationId = await scheduleReminderNotification(reminder);
            if (!alive) return;
            await updateReminderRequest(session.backendUrl, session.token, reminder.id, { notificationId });
          } else if ((!isFuture || reminder.status !== "active") && reminder.notificationId) {
            await cancelReminderNotification(reminder.notificationId);
            if (!alive) return;
            await updateReminderRequest(session.backendUrl, session.token, reminder.id, { notificationId: "" });
          }
        }
        if (alive) {
          const reminderResponse = await getRemindersRequest(session.backendUrl, session.token);
          if (alive) {
            setReminders(reminderResponse.reminders || []);
          }
        }
      } catch {
        // Leave reminders intact if local notification reconciliation fails on a device.
      } finally {
        reminderSyncInFlight.current = false;
      }
    })();
    return () => {
      alive = false;
    };
  }, [session.token, session.backendUrl, currentUser?.id, reminders]);

  useEffect(() => {
    if (!desertStormEvents.length) {
      setSelectedDesertStormEventId("");
      setDesertStormSection("vote");
      setDesertStormMoveSource(null);
      return;
    }
    if (!selectedDesertStormEventId || !desertStormEvents.some((event) => event.id === selectedDesertStormEventId)) {
      setSelectedDesertStormEventId(activeDesertStormEvent?.id || desertStormEvents[0].id);
    }
  }, [desertStormEvents, selectedDesertStormEventId, activeDesertStormEvent]);

  useEffect(() => {
    setDesertStormMoveSource(null);
  }, [selectedDesertStormEventId]);

  useEffect(() => {
    if (!zombieSiegeEvents.length) {
      setSelectedZombieSiegeEventId("");
      return;
    }
    if (!selectedZombieSiegeEventId || !zombieSiegeEvents.some((event) => event.id === selectedZombieSiegeEventId)) {
      setSelectedZombieSiegeEventId(zombieSiegeEvents[0].id);
    }
  }, [zombieSiegeEvents, selectedZombieSiegeEventId]);

  function saveMember(playerId, field, value) {
    if (!(currentUser && (leader || currentUser.id === playerId))) return;
    const payload = field === "overallPower"
      ? { overallPower: Number.parseFloat(value) || 0 }
      : field === "heroPower"
        ? { heroPower: Number.parseFloat(value) || 0 }
        : field === "squadPowers"
          ? { squadPowers: { squad1: Number.parseFloat(value.squad1) || 0, squad2: Number.parseFloat(value.squad2) || 0, squad3: Number.parseFloat(value.squad3) || 0, squad4: Number.parseFloat(value.squad4) || 0 } }
          : leader ? { [field]: value } : null;
    if (!payload) return;
    run(async () => { await updateMember(session.backendUrl, session.token, playerId, payload); await refresh(); });
  }

  function saveMyInfo(field, value) {
    if (!currentUser) return;
    const payload = field === "overallPower"
      ? { overallPower: Number.parseFloat(value) || 0 }
      : field === "heroPower"
        ? { heroPower: Number.parseFloat(value) || 0 }
      : field === "desertStormVoteNotificationsEnabled"
        ? { desertStormVoteNotificationsEnabled: Boolean(value) }
        : { squadPowers: { [field]: Number.parseFloat(value) || 0 } };
    run(async () => { await updateMember(session.backendUrl, session.token, currentUser.id, payload); await refresh(); });
  }

  function applyUpdatedCurrentPlayer(updatedPlayer) {
    if (!updatedPlayer?.id) {
      return;
    }
    setCurrentUser(updatedPlayer);
    setAlliance((current) => current ? {
      ...current,
      players: (current.players || []).map((player) => player.id === updatedPlayer.id ? { ...player, ...updatedPlayer } : player)
    } : current);
  }

  const handleSetDesertStormVoteNotificationsEnabled = (enabled) => run(async () => {
    if (enabled) {
      setPushPromptDismissed(false);
      await AsyncStorage.removeItem(PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY);
    }
    const updatedPlayer = await updateMember(session.backendUrl, session.token, currentUser.id, { desertStormVoteNotificationsEnabled: Boolean(enabled) });
    applyUpdatedCurrentPlayer(updatedPlayer);
    await refresh();
  });

  const handleSetDigNotificationsEnabled = (enabled) => run(async () => {
    const updatedPlayer = await updateMember(session.backendUrl, session.token, currentUser.id, { digNotificationsEnabled: Boolean(enabled) });
    applyUpdatedCurrentPlayer(updatedPlayer);
    await refresh();
  });

  async function ensureReminderNotificationPermission({ requestPermission = false } = {}) {
    let permission = await Notifications.getPermissionsAsync();
    let status = permission.status || "undetermined";
    if (status !== "granted" && requestPermission) {
      permission = await Notifications.requestPermissionsAsync();
      status = permission.status || "undetermined";
    }
    return status === "granted";
  }

  async function ensureReminderNotificationChannel() {
    if (Platform.OS !== "android") {
      return;
    }
    await Notifications.setNotificationChannelAsync(REMINDER_NOTIFICATION_CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: DESIGN_TOKENS.colors.green
    });
  }

  async function ensureCalendarNotificationChannel() {
    if (Platform.OS !== "android") {
      return;
    }
    await Notifications.setNotificationChannelAsync(CALENDAR_NOTIFICATION_CHANNEL_ID, {
      name: "Calendar Events",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: DESIGN_TOKENS.colors.blue
    });
  }

  async function scheduleCalendarNotification(candidate) {
    if (!candidate?.startsAt) {
      throw new Error("Calendar notification is missing a scheduled time.");
    }
    const fireDate = new Date(candidate.startsAt);
    if (Number.isNaN(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
      throw new Error("Calendar event time must be in the future.");
    }
    await ensureCalendarNotificationChannel();
    return Notifications.scheduleNotificationAsync({
      content: {
        title: candidate.title || "Calendar Event",
        body: candidate.body || "Your calendar event is starting.",
        ...(Platform.OS === "android" ? { sound: "default" } : {}),
        data: {
          type: "calendarEvent",
          entryId: candidate.sourceEntryId,
          occurrenceId: candidate.occurrenceId
        }
      },
      trigger: Platform.OS === "android"
        ? {
            type: "date",
            date: fireDate,
            channelId: CALENDAR_NOTIFICATION_CHANNEL_ID
          }
        : {
            type: "date",
            date: fireDate
          }
    });
  }

  async function loadCalendarNotificationState(memberId) {
    if (!memberId) {
      return {};
    }
    try {
      const raw = await AsyncStorage.getItem(getCalendarNotificationStorageKey(memberId));
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  async function saveCalendarNotificationState(memberId, value) {
    if (!memberId) {
      return;
    }
    const nextValue = value && typeof value === "object" ? value : {};
    if (!Object.keys(nextValue).length) {
      await AsyncStorage.removeItem(getCalendarNotificationStorageKey(memberId));
      return;
    }
    await AsyncStorage.setItem(getCalendarNotificationStorageKey(memberId), JSON.stringify(nextValue));
  }

  async function clearCalendarNotificationsForMember(memberId) {
    if (!memberId) {
      return;
    }
    const current = await loadCalendarNotificationState(memberId);
    await Promise.all(Object.values(current).map(async (entry) => {
      if (entry?.notificationId) {
        await cancelReminderNotification(entry.notificationId);
      }
    }));
    await AsyncStorage.removeItem(getCalendarNotificationStorageKey(memberId));
  }

  async function reconcileCalendarNotifications(entries, memberId) {
    if (!memberId) {
      return;
    }
    const permissionGranted = await ensureReminderNotificationPermission({ requestPermission: false });
    if (!permissionGranted) {
      return;
    }
    const candidates = buildCalendarNotificationCandidates(entries, new Date());
    const desiredById = Object.fromEntries(candidates.map((candidate) => [candidate.occurrenceId, candidate]));
    const currentState = await loadCalendarNotificationState(memberId);
    const nextState = {};

    for (const [occurrenceId, stored] of Object.entries(currentState)) {
      const desired = desiredById[occurrenceId];
      if (!desired || stored?.startsAt !== desired.startsAt) {
        if (stored?.notificationId) {
          await cancelReminderNotification(stored.notificationId);
        }
      } else {
        nextState[occurrenceId] = stored;
      }
    }

    for (const candidate of candidates) {
      if (nextState[candidate.occurrenceId]) {
        continue;
      }
      try {
        const notificationId = await scheduleCalendarNotification(candidate);
        nextState[candidate.occurrenceId] = {
          notificationId,
          startsAt: candidate.startsAt
        };
      } catch {
        // Skip device-specific scheduling failures so calendar rendering still works.
      }
    }

    await saveCalendarNotificationState(memberId, nextState);
  }

  async function scheduleReminderNotification(reminder) {
    if (!reminder?.scheduledForUtc) {
      throw new Error("Reminder is missing a scheduled time.");
    }
    const fireDate = new Date(reminder.scheduledForUtc);
    if (Number.isNaN(fireDate.getTime()) || fireDate.getTime() <= Date.now()) {
      throw new Error("Reminder time must be in the future.");
    }
    await ensureReminderNotificationChannel();
    return Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title || "Reminder",
        body: reminder.notes || "Your reminder is ready.",
        ...(Platform.OS === "android" ? { sound: "default" } : {}),
        data: {
          type: "reminder",
          reminderId: reminder.id
        }
      },
      trigger: Platform.OS === "android"
        ? {
            type: "date",
            date: fireDate,
            channelId: REMINDER_NOTIFICATION_CHANNEL_ID
          }
        : {
            type: "date",
            date: fireDate
          }
    });
  }

  async function cancelReminderNotification(notificationId) {
    if (!notificationId) {
      return;
    }
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
      // Swallow device-specific notification cancellation failures.
    }
  }

  async function handleCreateReminder(draft) {
    try {
      setLoading(true);
      setErrorMessage("");
      const schedule = buildReminderSchedule({
        mode: draft.mode,
        title: draft.title,
        notes: draft.notes,
        durationDays: draft.durationDays,
        durationHours: draft.durationHours,
        durationMinutes: draft.durationMinutes,
        durationSeconds: draft.durationSeconds,
        dateKey: draft.dateKey,
        timeValue: draft.timeValue,
        localTimeZone: getReminderDeviceTimeZone()
      });
      const scheduledAt = new Date(schedule.scheduledForUtc).getTime();
      if (Number.isNaN(scheduledAt) || scheduledAt <= Date.now()) {
        throw new Error("Reminder time must be in the future.");
      }
      const permissionGranted = await ensureReminderNotificationPermission({ requestPermission: true });
      if (!permissionGranted) {
        throw new Error("Enable notifications on this device to create reminders.");
      }
      const created = await createReminderRequest(session.backendUrl, session.token, schedule);
      try {
        const notificationId = await scheduleReminderNotification(created);
        await updateReminderRequest(session.backendUrl, session.token, created.id, { notificationId });
      } catch (error) {
        await deleteReminderRequest(session.backendUrl, session.token, created.id).catch(() => {});
        throw error;
      }
      await refresh();
      return true;
    } catch (error) {
      await handleRequestError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelReminder(reminder) {
    try {
      setLoading(true);
      setErrorMessage("");
      await cancelReminderNotification(reminder?.notificationId);
      await updateReminderRequest(session.backendUrl, session.token, reminder.id, {
        status: "cancelled",
        notificationId: ""
      });
      await refresh();
      return true;
    } catch (error) {
      await handleRequestError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSendAllianceBroadcastPush() {
    const message = String(leaderBroadcastMessage || "").trim();
    if (!message) {
      setErrorMessage("Enter a note before sending the alliance push notification.");
      return false;
    }
    if (leaderBroadcastAudience === "selected" && !leaderBroadcastSelectedMemberIds.length) {
      Alert.alert("Select members", "Choose at least one member before sending a targeted notification.");
      return false;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      const result = await sendAllianceBroadcastPushRequest(session.backendUrl, session.token, {
        message,
        audience: leaderBroadcastAudience,
        memberIds: leaderBroadcastAudience === "selected" ? leaderBroadcastSelectedMemberIds : []
      });
      await refresh();
      setLeaderBroadcastMessage("");
      setLeaderBroadcastSelectedMemberIds([]);
      setLeaderBroadcastMemberSearchText("");
      Alert.alert(
        "Broadcast sent",
        result?.targetedDevices
          ? `Push notification sent to ${result.targetedDevices} registered device${result.targetedDevices === 1 ? "" : "s"}.`
          : "No registered push-enabled devices were available to receive this broadcast."
      );
      return true;
    } catch (error) {
      await handleRequestError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSendLeadersDigPreset() {
    const memberIds = (alliance?.players || []).map((member) => member.id).filter(Boolean);
    if (!memberIds.length) {
      Alert.alert("No members found", "No alliance members are available to receive this preset notification.");
      return false;
    }
    return new Promise((resolve) => {
      Alert.alert(
        "Send preset to all members",
        "Send \"dig\" to all members who have not opted out?",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Send",
            onPress: async () => {
              try {
                setLoading(true);
                setErrorMessage("");
                const result = await sendAllianceBroadcastPushRequest(session.backendUrl, session.token, {
                  message: "dig",
                  preset: "dig",
                  audience: "selected",
                  memberIds
                });
                await refresh();
                Alert.alert(
                  "Broadcast sent",
                  result?.targetedDevices
                    ? `Push notification sent to ${result.targetedDevices} registered device${result.targetedDevices === 1 ? "" : "s"}.`
                    : "No registered push-enabled member devices were available to receive this broadcast."
                );
                resolve(true);
              } catch (error) {
                await handleRequestError(error);
                resolve(false);
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    });
  }

  function toggleLeaderBroadcastSelectedMemberId(memberId) {
    setLeaderBroadcastSelectedMemberIds((current) => current.includes(memberId)
      ? current.filter((entry) => entry !== memberId)
      : [...current, memberId]);
  }

  async function handleDeleteReminder(reminder) {
    try {
      setLoading(true);
      setErrorMessage("");
      await cancelReminderNotification(reminder?.notificationId);
      await deleteReminderRequest(session.backendUrl, session.token, reminder.id);
      await refresh();
      return true;
    } catch (error) {
      await handleRequestError(error);
      return false;
    } finally {
      setLoading(false);
    }
  }

  function validateCalendarForm() {
    const calendarT = getCalendarTranslator(language);
    if (!isValidDateKey(newCalendarDate)) {
      return calendarT("dateRequiredError");
    }
    if (!isValidDateKey(newCalendarEndDate)) {
      return calendarT("endDateRequiredError");
    }
    if (newCalendarRepeat !== "none" && newCalendarRepeatEndDate && !isValidDateKey(newCalendarRepeatEndDate)) {
      return calendarT("repeatEndDateError");
    }
    if (newCalendarRepeat !== "none" && newCalendarRepeatEndDate && newCalendarRepeatEndDate < newCalendarDate) {
      return calendarT("repeatEndDateError");
    }
    if (!newCalendarAllDay) {
      if (!parseTimeValue(newCalendarStartTime || "")) {
        return calendarT("startTimeRequiredError");
      }
      if (!parseTimeValue(newCalendarEndTime || "")) {
        return calendarT("endTimeRequiredError");
      }
      const timePreview = buildCalendarTimedPreview(newCalendarDate, newCalendarStartTime || "", newCalendarEndDate, newCalendarEndTime || "", newCalendarTimeInputMode, normalizeCalendarTimeZone(newCalendarEventTimeZone));
      if (!timePreview) {
        return calendarT("endTimeInvalidError");
      }
      if (timePreview.endAt && new Date(timePreview.endAt).getTime() <= new Date(timePreview.startsAt).getTime()) {
        return calendarT("endTimeInvalidError");
      }
    } else if (newCalendarEndDate < newCalendarDate) {
      return calendarT("endTimeInvalidError");
    }
    return "";
  }

  const handleSubmitCalendarEntry = () => run(async () => {
    const validationError = validateCalendarForm();
    if (validationError) {
      setCalendarFormError(validationError);
      return;
    }
    const entryType = newCalendarEntryType;
    const linkedType = entryType === "linked_desert_storm" ? "desertStorm" : entryType === "linked_zombie_siege" ? "zombieSiege" : newCalendarLinkedType;
    const resolvedLinkedEventId = resolveCalendarLinkedEventId(entryType, newCalendarLinkedEventId, desertStormEvents, zombieSiegeEvents, activeDesertStormEvent, selectedZombieSiegeEvent);
    const localTimeZone = normalizeCalendarTimeZone(newCalendarEventTimeZone);
    const timePreview = newCalendarAllDay ? null : buildCalendarTimedPreview(newCalendarDate, newCalendarStartTime || "00:00", newCalendarEndDate, newCalendarEndTime, newCalendarTimeInputMode, localTimeZone);
    const startIso = newCalendarAllDay ? newCalendarDate : (timePreview?.startsAt || toUtcIsoFromTimeZone(newCalendarDate, newCalendarStartTime || "00:00", getServerTimeZone()));
    const endIso = newCalendarAllDay ? newCalendarEndDate : (timePreview?.endAt || null);
    const payload = {
      title: newCalendarTitle,
      description: newCalendarDescription,
      startsAt: startIso,
      endAt: endIso,
      entryType,
      linkedType,
      linkedEventId: resolvedLinkedEventId,
      allDay: newCalendarAllDay,
      eventTimeZone: newCalendarAllDay ? localTimeZone : getServerTimeZone(),
      startDate: newCalendarDate,
      endDate: newCalendarEndDate,
      startTime: newCalendarAllDay ? "" : (timePreview?.serverStartTime || newCalendarStartTime),
      endTime: newCalendarAllDay ? "" : (timePreview?.serverEndTime || newCalendarEndTime),
      serverStartDate: newCalendarAllDay ? "" : (timePreview?.serverStartDate || newCalendarDate),
      serverEndDate: newCalendarAllDay ? "" : (timePreview?.serverEndDate || newCalendarEndDate),
      serverStartTime: newCalendarAllDay ? "" : (timePreview?.serverStartTime || newCalendarStartTime),
      serverEndTime: newCalendarAllDay ? "" : (timePreview?.serverEndTime || newCalendarEndTime),
      timeInputMode: newCalendarAllDay ? "server" : newCalendarTimeInputMode,
      recurrence: {
        repeat: newCalendarRepeat,
        weekdays: newCalendarRepeat === "custom_weekdays" ? newCalendarRepeatWeekdays : [],
        endDate: newCalendarRepeatEndDate
      },
      leaderNotes: newCalendarLeaderNotes,
      leaderOnly: newCalendarLeaderOnly
    };
    if (editingCalendarEntryId) {
      await updateCalendarEntryRequest(session.backendUrl, session.token, editingCalendarEntryId, payload);
    } else {
      await createCalendarEntryRequest(session.backendUrl, session.token, payload);
    }
    resetCalendarForm();
    await refresh();
  });

  async function handlePullToRefresh() {
    if (!session.token || !alliance) return;
    try {
      setRefreshing(true);
      setErrorMessage("");
      await refresh();
    } catch (error) {
      await handleRequestError(error);
    } finally {
      setRefreshing(false);
    }
  }

  const handleCreateDesertStormEvent = () => run(async () => {
    const created = await createDesertStormEventRequest(session.backendUrl, session.token, { title: newDesertStormEventTitle });
    setAlliance((current) => current ? {
      ...current,
      desertStormEvents: [created, ...(current.desertStormEvents || []).filter((event) => event.id !== created.id)]
    } : current);
    setSelectedDesertStormEventId(created.id);
    setNewDesertStormEventTitle("");
    setDesertStormSection("vote");
    await refresh();
  });

  const handleDesertStormVote = (eventId, optionId) => run(async () => {
    await submitDesertStormVoteRequest(session.backendUrl, session.token, eventId, optionId);
    await refresh();
  });

  const handleDesertStormVoteState = (eventId, nextState) => run(async () => {
    if (nextState === "open") {
      await openDesertStormVoteRequest(session.backendUrl, session.token, eventId);
    } else if (nextState === "closed") {
      await closeDesertStormVoteRequest(session.backendUrl, session.token, eventId);
    } else {
      await reopenDesertStormVoteRequest(session.backendUrl, session.token, eventId);
    }
    await refresh();
  });

  const handleDesertStormPublish = (eventId) => run(async () => {
    await publishDesertStormEventRequest(session.backendUrl, session.token, eventId);
    await refresh();
  });

  const handleDesertStormEdit = (eventId) => run(async () => {
    await beginDesertStormEditingRequest(session.backendUrl, session.token, eventId);
    await refresh();
  });

  const handleDesertStormEnd = (eventId, result) => run(async () => {
    await endDesertStormEventRequest(session.backendUrl, session.token, eventId, result);
    await refresh();
  });

  const handleDesertStormArchive = (eventId) => run(async () => {
    await archiveDesertStormEventRequest(session.backendUrl, session.token, eventId);
    setSelectedDesertStormEventId("");
    setDesertStormSection("vote");
    setDesertStormMoveSource(null);
    await refresh();
  });

  const handleDesertStormDelete = (eventId) => run(async () => {
    await deleteDesertStormEventRequest(session.backendUrl, session.token, eventId);
    if (selectedDesertStormEventId === eventId) {
      setSelectedDesertStormEventId("");
      setDesertStormSection("vote");
      setDesertStormMoveSource(null);
    }
    await refresh();
  });

  const handleDesertStormMove = (target) => run(async () => {
    if (!selectedDesertStormEvent || !desertStormMoveSource) return;
    await moveDesertStormEventPlayerRequest(session.backendUrl, session.token, selectedDesertStormEvent.id, {
      sourceTaskForceKey: desertStormMoveSource.taskForceKey,
      sourceSquadId: desertStormMoveSource.squadId,
      sourceSlotId: desertStormMoveSource.slotId,
      taskForceKey: target.taskForceKey,
      squadId: target.squadId,
      slotId: target.slotId
    });
    setDesertStormMoveSource(null);
    await refresh();
  });

  if (!sessionReady) return <SafeAreaView style={styles.safeArea}><ExpoStatusBar style="light" /><StatusBar barStyle="light-content" /><View style={styles.loadingScreen}><ActivityIndicator color={DESIGN_TOKENS.colors.green} size="large" /><Text style={styles.hint}>{t("restoringSession")}</Text></View></SafeAreaView>;

  if (!session.token) return <AuthScreen {...{ authMode, setAuthMode, authUsername, setAuthUsername, authPassword, setAuthPassword, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onSignIn={() => run(async () => { const url = normalizeBaseUrl(backendUrlInput); const result = await signIn(url, { username: authUsername, password: authPassword }); setSetupMode("join"); await persistSession({ backendUrl: url, token: result.token }); await refresh(result.token, url); })} onCreate={() => run(async () => { const url = normalizeBaseUrl(backendUrlInput); const result = await createAccount(url, { username: authUsername, password: authPassword }); setSetupMode("join"); await persistSession({ backendUrl: url, token: result.token }); setAccount(result.account); setAlliance(null); setCurrentUser(null); })} />;

  if (session.token && !alliance) return <AllianceSetupScreen {...{ account, setupMode, setSetupMode, allianceCodeInput, setAllianceCodeInput, allianceNameInput, setAllianceNameInput, alliancePreview, joinRequest, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onPreview={() => run(async () => setAlliancePreview(await getAlliancePreview(normalizeBaseUrl(session.backendUrl || backendUrlInput), allianceCodeInput)))} onJoin={() => run(async () => {
    const activeBackendUrl = session.backendUrl || normalizeBaseUrl(backendUrlInput);
    const targetAllianceCode = alliancePreview?.code || allianceCodeInput;
    const result = await joinAlliance(activeBackendUrl, session.token, targetAllianceCode);
    setAccount(result.account);
    setJoinRequest(result.joinRequest);
    setAlliance(null);
    setCurrentUser(null);
    setAlliancePreview(result.alliance ? { id: result.alliance.id, name: result.alliance.name, code: result.alliance.code, players: result.alliance.players } : alliancePreview);
    setSetupMode("join");
    Alert.alert("Join request sent", "Your request was sent to the alliance leaders for approval.");
    await refresh(session.token, activeBackendUrl).catch(() => {});
  })} onCreateAlliance={() => run(async () => { const result = await createAlliance(session.backendUrl, session.token, { name: allianceNameInput, code: allianceCodeInput }); setAccount(result.account); setAlliance(result.alliance); setCurrentUser(result.player); setJoinRequest(null); setNewAllianceCode(result.alliance.code); })} onRefreshStatus={() => run(async () => { await refresh(); })} onSignOut={signOut} />;

  return (
    <ScreenContainer>
        <View style={styles.screen}>
          <View style={styles.screenContent}>
            {backNavigation.visible
              ? <AppBackHeader title={backNavigation.title} onBack={backNavigation.onBack} backLabel={t("common.back")} />
              : <SectionHeader eyebrow={t("allianceCommand")} title={alliance?.name} detail={t("signedInAs", { name: account?.displayName, rank: currentUser?.rank })} />}
            {leader && joinRequests.length ? <AppCard variant="warning" onPress={() => openMoreDestination("settings")}><Text style={styles.alertBannerTitle}>{joinRequests.length === 1 ? t("onePlayerWaiting") : t("playersWaiting", { count: joinRequests.length })}</Text><Text style={styles.alertBannerText}>{t("tapReviewRequests")}</Text></AppCard> : null}
            {activeTab === "home" && desertStormVoteNeedsResponse ? <AppCard variant="info" onPress={() => openDesertStormVoteArea()}><View style={styles.bannerHeader}><Text style={styles.voteBannerTitle}>Desert Storm vote is live - tap to respond</Text><StatusBadge label="Response Needed" tone="warning" /></View><Text style={styles.voteBannerText}>Open the Desert Storm event to submit your vote.</Text></AppCard> : null}
            {loading ? <ActivityIndicator color={DESIGN_TOKENS.colors.green} /> : null}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={DESIGN_TOKENS.colors.green} colors={[DESIGN_TOKENS.colors.green]} />}>
            {activeTab === "home" ? <HomeScreen styles={styles} currentUser={currentUser} account={account} alliance={alliance} desertStormAssignment={desertStormAssignment} desertStormViewState={desertStormViewState} todayCalendarEntries={todayCalendarEntries} currentZombieSiegeEvent={selectedZombieSiegeEvent} currentZombieSiegeAssignment={currentZombieSiegeAssignment} onChangeField={saveMyInfo} onOpenDesertStormVote={activeDesertStormEvent ? () => openDesertStormVoteArea() : null} onOpenCalendar={() => handleTabPress("calendar")} onOpenReminders={() => handleTabPress("reminders")} onOpenZombieSiege={() => openEventsDestination("zombieSiege")} onOpenFeedback={() => openMoreDestination("feedback")} onOpenSettings={() => openMoreDestination("settings")} showPushNotificationControls={Platform.OS !== "android"} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
              const enabled = await syncPushNotifications({ requestPermission: true });
              if (!enabled) {
                Alert.alert("Enable notifications", "Push notifications were not enabled. You can try again later on this screen.");
              }
            })} onDismissPushNotificationsPrompt={() => run(async () => {
              await dismissPushNotificationsPrompt();
            })} t={t} /> : null}
            {activeTab === "calendar" ? <CalendarScreen styles={styles} entries={calendarEntries} desertStormEvents={desertStormEvents} zombieSiegeEvents={zombieSiegeEvents} currentUserIsLeader={leader} calendarView={calendarView} editingCalendarEntryId={editingCalendarEntryId} language={language} newCalendarTimeInputMode={newCalendarTimeInputMode} calendarTimePickerTarget={calendarTimePickerTarget} calendarDatePickerTarget={calendarDatePickerTarget} calendarFormError={calendarFormError} onChangeCalendarView={setCalendarView} newCalendarTitle={newCalendarTitle} newCalendarDescription={newCalendarDescription} newCalendarDate={newCalendarDate} newCalendarEndDate={newCalendarEndDate} newCalendarStartTime={newCalendarStartTime} newCalendarEndTime={newCalendarEndTime} newCalendarAllDay={newCalendarAllDay} newCalendarEntryType={newCalendarEntryType} newCalendarRepeat={newCalendarRepeat} newCalendarRepeatEndDate={newCalendarRepeatEndDate} newCalendarRepeatWeekdays={newCalendarRepeatWeekdays} newCalendarLinkedType={newCalendarLinkedType} newCalendarLinkedEventId={newCalendarLinkedEventId} newCalendarEventTimeZone={newCalendarEventTimeZone} newCalendarLeaderNotes={newCalendarLeaderNotes} newCalendarLeaderOnly={newCalendarLeaderOnly} onChangeNewCalendarTitle={setNewCalendarTitle} onChangeNewCalendarDescription={setNewCalendarDescription} onChangeNewCalendarDate={setNewCalendarDate} onChangeNewCalendarEndDate={setNewCalendarEndDate} onChangeNewCalendarStartTime={setNewCalendarStartTime} onChangeNewCalendarEndTime={setNewCalendarEndTime} onChangeNewCalendarTimeInputMode={setNewCalendarTimeInputMode} onChangeCalendarTimePickerTarget={setCalendarTimePickerTarget} onChangeCalendarDatePickerTarget={setCalendarDatePickerTarget} onChangeNewCalendarEventTimeZone={setNewCalendarEventTimeZone} onToggleNewCalendarAllDay={() => setNewCalendarAllDay((value) => !value)} onChangeNewCalendarEntryType={(value) => {
              setNewCalendarEntryType(value);
              if (value === "linked_desert_storm") {
                const seed = buildDesertStormCalendarLinkSeed(activeDesertStormEvent || getLinkableCalendarEvents(desertStormEvents)[0]);
                setNewCalendarLinkedType(seed.linkedType);
                setNewCalendarLinkedEventId(seed.linkedEventId);
              } else if (value === "linked_zombie_siege") {
                const seed = buildZombieSiegeCalendarLinkSeed(selectedZombieSiegeEvent || getLinkableCalendarEvents(zombieSiegeEvents)[0]);
                setNewCalendarLinkedType(seed.linkedType);
                setNewCalendarLinkedEventId(seed.linkedEventId);
              } else {
                setNewCalendarLinkedType("");
                setNewCalendarLinkedEventId("");
              }
            }} onChangeNewCalendarRepeat={setNewCalendarRepeat} onChangeNewCalendarRepeatEndDate={setNewCalendarRepeatEndDate} onToggleNewCalendarRepeatWeekday={(code) => setNewCalendarRepeatWeekdays((current) => toggleWeekdaySelection(current, code))} onChangeNewCalendarLinkedEventId={setNewCalendarLinkedEventId} onChangeNewCalendarLeaderNotes={setNewCalendarLeaderNotes} onToggleLeaderOnly={() => setNewCalendarLeaderOnly((value) => !value)} onCreateEntry={handleSubmitCalendarEntry} onCancelEdit={resetCalendarForm} onEditEntry={beginCalendarEntryEdit} onDeleteEntry={(entryId) => run(async () => { if (editingCalendarEntryId === entryId) { resetCalendarForm(); } await deleteCalendarEntryRequest(session.backendUrl, session.token, entryId); await refresh(); })} onOpenLinkedEntry={openLinkedCalendarEntry} helpers={{ startOfLocalDay, formatLocalDateKey, addLocalDays, parseLocalDateKey, isSameLocalDay, expandCalendarEntries, getCalendarTranslator, getLinkableCalendarEvents, buildCalendarTimedPreview, normalizeCalendarTimeZone, getServerTimeLabel, CALENDAR_WEEKDAY_OPTIONS, CALENDAR_TIME_INPUT_MODES, formatCalendarDateButtonLabel, getCalendarWeekdayLabel, normalizeCalendarRecurrence }} CalendarTimePickerModal={CalendarTimePickerModal} CalendarDatePickerModal={CalendarDatePickerModal} t={t} /> : null}
            {activeTab === "events" ? <EventsHubScreen styles={styles} selection={eventsSelection} onSelectDesertStorm={() => setEventsSelection("desertStorm")} onSelectZombieSiege={() => setEventsSelection("zombieSiege")} onBack={() => setEventsSelection("")} desertStormTitle={activeDesertStormEvent?.title || ""} zombieSiegeTitle={selectedZombieSiegeEvent?.title || zombieSiegeEvents[0]?.title || ""} t={t}>
              {eventsSelection === "desertStorm" ? <DesertStormScreen styles={styles} section={desertStormSection} onChangeSection={setDesertStormSection} currentUser={currentUser} currentUserIsLeader={leader} players={players} events={desertStormEvents} archivedEvents={archivedDesertStormEvents} selectedEvent={selectedDesertStormEvent} selectedEventId={selectedDesertStormEventId} onSelectEvent={setSelectedDesertStormEventId} taskForce={selectedTaskForce} draftTaskForces={desertStormLeaderTaskForces} visibleTaskForces={desertStormVisibleTaskForces} moveSource={desertStormMoveSource} onSelectMoveSource={setDesertStormMoveSource} onMovePlayer={handleDesertStormMove} onPickPlayer={(context) => {
                if (!leader || !selectedDesertStormEvent || selectedDesertStormEvent.status === "completed" || selectedDesertStormEvent.status === "archived") return;
                setPlayerModal({ ...context, eventId: selectedDesertStormEvent.id });
                setPlayerPickerFilter(context.memberType === "Sub" ? "subs" : "players");
                setSearchText("");
              }} onCreateEvent={handleCreateDesertStormEvent} newEventTitle={newDesertStormEventTitle} onChangeNewEventTitle={setNewDesertStormEventTitle} canCreateEvent={!activeDesertStormEvent} onSubmitVote={handleDesertStormVote} onOpenVote={(eventId) => handleDesertStormVoteState(eventId, "open")} onCloseVote={(eventId) => handleDesertStormVoteState(eventId, "closed")} onReopenVote={(eventId) => handleDesertStormVoteState(eventId, "reopen")} onPublishTeams={handleDesertStormPublish} onEditTeams={handleDesertStormEdit} onEndEvent={handleDesertStormEnd} onArchiveEvent={handleDesertStormArchive} onDeleteEvent={handleDesertStormDelete} helpers={{ getDesertStormStatusLabel, getDesertStormVoteOptionLabel }} /> : null}
              {eventsSelection === "zombieSiege" ? <ZombieSiegeScreen styles={styles} events={zombieSiegeEvents} selectedEvent={selectedZombieSiegeEvent} selectedEventId={selectedZombieSiegeEventId} onSelectEvent={setSelectedZombieSiegeEventId} currentUser={currentUser} currentUserIsLeader={leader} newTitle={newZombieSiegeTitle} newStartAt={newZombieSiegeStartAt} newEndAt={newZombieSiegeEndAt} newVoteClosesAt={newZombieSiegeVoteClosesAt} newThreshold={newZombieSiegeThreshold} onChangeNewTitle={setNewZombieSiegeTitle} onChangeNewStartAt={setNewZombieSiegeStartAt} onChangeNewEndAt={setNewZombieSiegeEndAt} onChangeNewVoteClosesAt={setNewZombieSiegeVoteClosesAt} onChangeNewThreshold={setNewZombieSiegeThreshold} onCreateEvent={() => run(async () => { const created = await createZombieSiegeEventRequest(session.backendUrl, session.token, { title: newZombieSiegeTitle, startAt: toIsoDateTime(newZombieSiegeStartAt), endAt: toIsoDateTime(newZombieSiegeEndAt), voteClosesAt: "", wave20Threshold: Number.parseFloat(newZombieSiegeThreshold) || 0 }); setSelectedZombieSiegeEventId(created.id); setNewZombieSiegeTitle(""); setNewZombieSiegeStartAt(formatLocalDateTimeInput(new Date())); setNewZombieSiegeEndAt(formatLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000))); setNewZombieSiegeVoteClosesAt(formatLocalDateTimeInput(new Date())); setNewZombieSiegeThreshold(""); await refresh(); })} onSubmitAvailability={(eventId, status) => run(async () => { await submitZombieSiegeAvailabilityRequest(session.backendUrl, session.token, eventId, status); await refresh(); })} onRunPlan={(eventId) => run(async () => { await runZombieSiegePlanRequest(session.backendUrl, session.token, eventId); await refresh(); })} onPublishPlan={(eventId) => run(async () => { await publishZombieSiegePlanRequest(session.backendUrl, session.token, eventId); await refresh(); })} onDiscardDraft={(eventId) => run(async () => { await discardZombieSiegeDraftRequest(session.backendUrl, session.token, eventId); await refresh(); })} onSaveWaveOneReview={(eventId, reviews) => run(async () => { await updateZombieSiegeWaveOneReviewRequest(session.backendUrl, session.token, eventId, reviews); await refresh(); })} onEndEvent={(eventId) => run(async () => { await endZombieSiegeEventRequest(session.backendUrl, session.token, eventId); await refresh(); })} /> : null}
            </EventsHubScreen> : null}
            {activeTab === "reminders" ? <RemindersScreen styles={styles} reminders={reminders} language={language} onCreateReminder={handleCreateReminder} onCancelReminder={handleCancelReminder} onDeleteReminder={handleDeleteReminder} helpers={{ formatReminderDuration, formatReminderCountdown }} ReminderDurationPickerModal={ReminderDurationPickerModal} CalendarDatePickerModal={CalendarDatePickerModal} CalendarTimePickerModal={CalendarTimePickerModal} t={t} /> : null}
            {activeTab === "more" ? <MoreScreen styles={styles} selection={moreSelection} currentUserIsLeader={leader} joinRequests={joinRequests} t={t} onSelectLeaderControls={() => setMoreSelection("leaderControls")} onSelectMembers={() => setMoreSelection("members")} onSelectSettings={() => setMoreSelection("settings")} onSelectFeedback={() => setMoreSelection("feedback")} onBack={() => setMoreSelection("")}>
              {moreSelection === "leaderControls" && leader ? <LeaderControlsScreen styles={styles} alliance={alliance} history={leaderBroadcastHistory} reachability={leaderBroadcastReachability} audience={leaderBroadcastAudience} onChangeAudience={(value) => {
                setLeaderBroadcastAudience(value);
                if (value === "all") {
                  setLeaderBroadcastMemberSearchText("");
                }
              }} selectedMemberIds={leaderBroadcastSelectedMemberIds} onToggleSelectedMemberId={toggleLeaderBroadcastSelectedMemberId} memberSearchText={leaderBroadcastMemberSearchText} onChangeMemberSearchText={setLeaderBroadcastMemberSearchText} pushMessage={leaderBroadcastMessage} onChangePushMessage={setLeaderBroadcastMessage} onSendBroadcastPush={handleSendAllianceBroadcastPush} onSendLeadersDigPreset={handleSendLeadersDigPreset} sending={loading} currentUserHasPushToken={Boolean(currentUser?.hasExpoPushToken)} t={t} /> : null}
              {moreSelection === "members" && leader ? <MembersScreen styles={styles} players={filteredMembers} memberSearchText={memberSearchText} memberSortMode={memberSortMode} memberRankFilter={memberRankFilter} onChangeMemberSearchText={setMemberSearchText} onChangeMemberSortMode={setMemberSortMode} onChangeMemberRankFilter={setMemberRankFilter} currentUser={currentUser} currentUserIsLeader={leader} onChangeField={saveMember} onRemovePlayer={(playerId) => run(async () => { await removeMember(session.backendUrl, session.token, playerId); await refresh(); })} RankSelector={RankSelector} rankOptions={RANK_OPTIONS} t={t} /> : null}
              {moreSelection === "settings" ? <SettingsScreen styles={styles} alliance={alliance} account={account} currentUser={currentUser} currentUserIsLeader={leader} joinRequests={joinRequests} newMemberName={newMemberName} newMemberRank={newMemberRank} newMemberPower={newMemberPower} newAllianceCode={newAllianceCode} onChangeNewMemberName={setNewMemberName} onChangeNewMemberRank={setNewMemberRank} onChangeNewMemberPower={setNewMemberPower} onChangeNewAllianceCode={setNewAllianceCode} onAddMember={() => run(async () => { await addMember(session.backendUrl, session.token, { name: newMemberName, rank: newMemberRank, overallPower: Number.parseFloat(newMemberPower) || 0 }); setNewMemberName(""); setNewMemberRank("R1"); setNewMemberPower(""); await refresh(); })} onApproveJoinRequest={(requestId) => run(async () => { await approveJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onRejectJoinRequest={(requestId) => run(async () => { await rejectJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onLeaveAlliance={() => run(async () => { const departingPlayerId = currentUser?.id; const result = await leaveAlliance(session.backendUrl, session.token); if (departingPlayerId) { await clearCalendarNotificationsForMember(departingPlayerId).catch(() => {}); } setAccount(result.account); setAlliance(null); setCurrentUser(null); setJoinRequest(null); setJoinRequests([]); setSetupMode("join"); setAlliancePreview(null); setNewAllianceCode(""); setActiveTab("home"); setMoreSelection(""); })} onRotateAllianceCode={() => run(async () => { await updateAllianceCode(session.backendUrl, session.token, newAllianceCode); await refresh(); })} onSignOut={signOut} t={t} language={language} onChangeLanguage={changeLanguage} showPushNotificationControls={Platform.OS !== "android"} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onSetDigNotificationsEnabled={handleSetDigNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
                const enabled = await syncPushNotifications({ requestPermission: true });
                if (!enabled) {
                  Alert.alert(t("settings.notifications.enablePush.alertTitle"), t("settings.notifications.enablePush.alertDescription"));
                }
              })} LanguageSelector={LanguageSelector} RankSelector={RankSelector} hasTranslationKey={(key) => Object.prototype.hasOwnProperty.call(TRANSLATIONS[language] || {}, key)} /> : null}
              {moreSelection === "feedback" ? <FeedbackScreen styles={styles} feedbackEntries={feedbackEntries} newFeedbackText={newFeedbackText} onChangeNewFeedbackText={setNewFeedbackText} onSubmitFeedback={() => run(async () => { await addFeedbackRequest(session.backendUrl, session.token, newFeedbackText); setNewFeedbackText(""); await refresh(); })} onSubmitFeedbackComment={(feedbackEntryId, message, reset) => run(async () => { await addFeedbackCommentRequest(session.backendUrl, session.token, feedbackEntryId, message); if (typeof reset === "function") reset(); await refresh(); })} appVersion={APP_VERSION} appBuild={APP_BUILD} t={t} /> : null}
            </MoreScreen> : null}
            </ScrollView>
          </View>
          <View style={styles.bottomTabBar}>
            {tabs.map((tab) => <Pressable key={tab} style={[styles.bottomTabButton, activeTab === tab && styles.bottomTabButtonActive]} onPress={() => handleTabPress(tab)}>
              <View style={[styles.bottomTabIndicator, activeTab === tab && styles.bottomTabIndicatorActive]} />
              <Ionicons name={getTabIconName(tab, activeTab === tab)} size={20} color={activeTab === tab ? DESIGN_TOKENS.colors.green : DESIGN_TOKENS.colors.textMuted} />
              <Text style={[styles.bottomTabLabel, activeTab === tab && styles.bottomTabLabelActive]}>{tabLabel(tab, leader, joinRequests, t)}</Text>
            </Pressable>)}
          </View>
        </View>
      <BottomSheetModal visible={Boolean(playerModal)} onClose={() => setPlayerModal(null)}>
        <KeyboardAvoidingView style={[styles.modalKeyboardShell, styles.playerPickerSheet]} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
          <SectionHeader eyebrow="Assignment" title={t("choosePlayer")} detail="Choose from voted members or the full alliance without leaving the Desert Storm workflow." />
          {playerModal ? <View style={styles.rankFilterRow}>
            {[
              { id: "players", label: "Players" },
              { id: "subs", label: "Subs" },
              { id: "all", label: "All" },
              { id: "assigned", label: "Assigned" },
              { id: "unassigned", label: "Unassigned" },
              { id: "issues", label: "Issues" }
            ].map((filter) => <Pressable key={filter.id} style={[styles.rankFilterButton, playerPickerFilter === filter.id && styles.rankFilterButtonActive]} onPress={() => setPlayerPickerFilter(filter.id)}><Text style={[styles.rankFilterButtonText, playerPickerFilter === filter.id && styles.rankFilterButtonTextActive]}>{filter.label}</Text></Pressable>)}
          </View> : null}
          {playerModal ? <View style={styles.row}>
            <Pressable style={[styles.secondaryButton, styles.half, playerPickerFilter === "players" && styles.modeButtonActive]} onPress={() => setPlayerPickerFilter("players")}><Text style={[styles.secondaryButtonText, playerPickerFilter === "players" && styles.modeButtonTextActive]}>{defaultPlayerPickerFilter === "players" ? "From Players" : "Choose From Players"}</Text></Pressable>
            <Pressable style={[styles.secondaryButton, styles.half, playerPickerFilter === "subs" && styles.modeButtonActive]} onPress={() => setPlayerPickerFilter("subs")}><Text style={[styles.secondaryButtonText, playerPickerFilter === "subs" && styles.modeButtonTextActive]}>{defaultPlayerPickerFilter === "subs" ? "From Subs" : "Choose From Subs"}</Text></Pressable>
          </View> : null}
          {playerModal ? <Text style={styles.hint}>{playerPickerFilter === "players" ? `Showing members who voted "Play" for ${selectedDesertStormEvent?.title || "this event"}.` : playerPickerFilter === "subs" ? `Showing members who voted "Sub" for ${selectedDesertStormEvent?.title || "this event"}.` : playerPickerFilter === "all" ? t("showingAllAlliance") : playerPickerFilter === "assigned" ? "Showing members already assigned somewhere in the current draft." : playerPickerFilter === "unassigned" ? "Showing members not yet assigned in the current draft." : "Showing members with draft or vote issues to review."}</Text> : null}
          <TextInput value={searchText} onChangeText={setSearchText} style={[styles.input, styles.playerPickerSearch]} placeholder={t("searchNameOrRank")} />
          <ScrollView style={[styles.modalListScroll, styles.playerPickerList]} contentContainerStyle={styles.modalListContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
            <Pressable style={styles.pick} onPress={() => run(async () => {
              await updateDesertStormEventSlotRequest(session.backendUrl, session.token, playerModal.eventId, { taskForceKey: playerModal.taskForceKey, squadId: playerModal.squadId, slotId: playerModal.slotId, playerName: "" });
              setPlayerModal(null);
              await refresh();
            })}><Text style={styles.pickText}>{t("clearSelection")}</Text></Pressable>
            {playerPickerRows.map((player) => <Pressable key={player.id} style={styles.playerPickerRow} onPress={() => run(async () => {
              await updateDesertStormEventSlotRequest(session.backendUrl, session.token, playerModal.eventId, { taskForceKey: playerModal.taskForceKey, squadId: playerModal.squadId, slotId: playerModal.slotId, playerName: player.name });
              setPlayerModal(null);
              await refresh();
            })}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.listRowContent}>
                  <Text style={styles.cardTitle}>{player.name}</Text>
                  <Text style={styles.hint}>{player.rank} • {player.overallPower.toFixed(2)}M</Text>
                </View>
                <StatusBadge label={player.statusLabel} tone={player.statusTone} />
              </View>
              <View style={styles.row}>
                <StatusBadge label={player.voteLabel} tone={player.voteLabel === "Player" ? "success" : player.voteLabel === "Sub" ? "warning" : "neutral"} />
              </View>
              {player.issueBadges.length ? <View style={styles.rankFilterRow}>
                {player.issueBadges.map((badge) => <StatusBadge key={`${player.id}-${badge.label}`} label={badge.label} tone={badge.tone} />)}
              </View> : null}
            </Pressable>)}
            {!playerPickerRows.length ? <Text style={styles.hint}>{playerPickerFilter === "players" || playerPickerFilter === "subs" ? t("noMembersMatchVoteFilter") : t("noPlayersMatchSearch")}</Text> : null}
          </ScrollView>
          <SecondaryButton label="Close" onPress={() => setPlayerModal(null)} />
        </KeyboardAvoidingView>
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.bg },
  keyboardShell: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: DESIGN_TOKENS.spacing.sm, padding: DESIGN_TOKENS.spacing.xl },
  screen: { flex: 1, paddingHorizontal: DESIGN_TOKENS.spacing.md, paddingTop: DESIGN_TOKENS.spacing.md, paddingBottom: DESIGN_TOKENS.spacing.sm, gap: DESIGN_TOKENS.spacing.sm, backgroundColor: DESIGN_TOKENS.colors.bg },
  screenContent: { flex: 1, gap: DESIGN_TOKENS.spacing.sm },
  title: { fontSize: DESIGN_TOKENS.type.title, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  hint: { fontSize: 14, color: DESIGN_TOKENS.colors.textMuted },
  line: { color: DESIGN_TOKENS.colors.textSoft, fontSize: DESIGN_TOKENS.type.body },
  error: { color: DESIGN_TOKENS.colors.red, fontWeight: "700" },
  appBackHeader: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: DESIGN_TOKENS.spacing.sm },
  appBackButton: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2, paddingRight: DESIGN_TOKENS.spacing.sm },
  appBackButtonText: { color: DESIGN_TOKENS.colors.text, fontSize: 16, fontWeight: "700" },
  appBackHeaderTitle: { flex: 1, textAlign: "center", color: DESIGN_TOKENS.colors.text, fontSize: DESIGN_TOKENS.type.cardTitle, fontWeight: "800" },
  appBackHeaderSpacer: { minWidth: 60 },
  sectionHeader: { gap: 4, paddingBottom: 4 },
  sectionEyebrow: { fontSize: DESIGN_TOKENS.type.meta, color: DESIGN_TOKENS.colors.textMuted, textTransform: "uppercase", letterSpacing: 1.4, fontWeight: "700" },
  sectionHeaderTitle: { fontSize: DESIGN_TOKENS.type.title, color: DESIGN_TOKENS.colors.text, fontWeight: "800" },
  sectionHeaderDetail: { fontSize: 14, color: DESIGN_TOKENS.colors.textMuted },
  bannerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: DESIGN_TOKENS.spacing.sm },
  alertBanner: { backgroundColor: DESIGN_TOKENS.colors.yellowSoft, borderRadius: DESIGN_TOKENS.radius.md, padding: 14, borderWidth: 1, borderColor: "#6d5b25", gap: 4 },
  alertBannerTitle: { fontSize: 16, fontWeight: "700", color: DESIGN_TOKENS.colors.yellow },
  alertBannerText: { fontSize: 14, color: "#d8c185" },
  voteBanner: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderRadius: DESIGN_TOKENS.radius.md, padding: 14, borderWidth: 1, borderColor: "#355f82", gap: 4 },
  voteBannerTitle: { fontSize: 16, fontWeight: "700", color: DESIGN_TOKENS.colors.text },
  voteBannerText: { fontSize: 14, color: "#99bfdd" },
  card: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: DESIGN_TOKENS.radius.lg, padding: DESIGN_TOKENS.spacing.md, gap: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  cardActive: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: DESIGN_TOKENS.spacing.md, gap: 10, borderWidth: 1, borderColor: "#21543c" },
  cardWarning: { backgroundColor: DESIGN_TOKENS.colors.yellowSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: DESIGN_TOKENS.spacing.md, gap: 10, borderWidth: 1, borderColor: "#6d5b25" },
  cardInfo: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: DESIGN_TOKENS.spacing.md, gap: 10, borderWidth: 1, borderColor: "#355f82" },
  cardDanger: { backgroundColor: DESIGN_TOKENS.colors.redSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: DESIGN_TOKENS.spacing.md, gap: 10, borderWidth: 1, borderColor: "#7a3742" },
  cardPurple: { backgroundColor: DESIGN_TOKENS.colors.purpleSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: DESIGN_TOKENS.spacing.md, gap: 10, borderWidth: 1, borderColor: "#56417f" },
  cardTitle: { fontSize: DESIGN_TOKENS.type.cardTitle, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  input: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.sm, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, paddingHorizontal: 12, paddingVertical: 10, color: DESIGN_TOKENS.colors.text },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  buttonBase: { borderRadius: DESIGN_TOKENS.radius.sm, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", minHeight: 46, borderWidth: 1 },
  primaryButton: { backgroundColor: DESIGN_TOKENS.colors.green, borderColor: DESIGN_TOKENS.colors.green },
  primaryButtonBlue: { backgroundColor: DESIGN_TOKENS.colors.blue, borderColor: DESIGN_TOKENS.colors.blue },
  primaryButtonPurple: { backgroundColor: DESIGN_TOKENS.colors.purple, borderColor: DESIGN_TOKENS.colors.purple },
  primaryButtonRed: { backgroundColor: DESIGN_TOKENS.colors.red, borderColor: DESIGN_TOKENS.colors.red },
  button: { backgroundColor: DESIGN_TOKENS.colors.green, borderRadius: DESIGN_TOKENS.radius.sm, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: DESIGN_TOKENS.colors.green },
  disabledButton: { opacity: 0.55 },
  buttonText: { color: "#081016", fontWeight: "800" },
  secondaryButton: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.sm, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  secondaryButtonText: { color: DESIGN_TOKENS.colors.textSoft, fontWeight: "700" },
  modeButtonActive: { backgroundColor: DESIGN_TOKENS.colors.green, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.green },
  modeButtonTextActive: { color: "#081016" },
  dangerButton: { backgroundColor: DESIGN_TOKENS.colors.redSoft, borderRadius: DESIGN_TOKENS.radius.sm, paddingVertical: 10, alignItems: "center", borderWidth: 1, borderColor: "#7a3742" },
  dangerButtonText: { color: "#ffdede", fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  languageButton: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  languageButtonActive: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderColor: DESIGN_TOKENS.colors.blue },
  languageButtonText: { color: DESIGN_TOKENS.colors.textSoft, fontWeight: "700" },
  languageButtonTextActive: { color: DESIGN_TOKENS.colors.text },
  rankSelectorWrap: { gap: 6 },
  rankSelectorButton: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.sm, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rankDropdown: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: DESIGN_TOKENS.radius.sm, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, overflow: "hidden" },
  rankOption: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: DESIGN_TOKENS.colors.border },
  rankOptionActive: { backgroundColor: DESIGN_TOKENS.colors.greenSoft },
  rankOptionText: { color: DESIGN_TOKENS.colors.text, fontWeight: "600" },
  rankOptionTextActive: { color: DESIGN_TOKENS.colors.green },
  half: { flex: 1 },
  third: { flex: 1 },
  flexOne: { flex: 1 },
  tabs: { flexGrow: 0, minHeight: 52 },
  tab: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: DESIGN_TOKENS.radius.pill, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  tabActive: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderColor: DESIGN_TOKENS.colors.blue },
  tabText: { color: DESIGN_TOKENS.colors.textMuted, fontWeight: "700", fontSize: 14, lineHeight: 18, includeFontPadding: false, textAlignVertical: "center" },
  tabTextActive: { color: DESIGN_TOKENS.colors.text },
  bottomTabBar: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", gap: 8, backgroundColor: DESIGN_TOKENS.colors.bgElevated, borderRadius: DESIGN_TOKENS.radius.xl, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, paddingHorizontal: 8, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 10 : 8, shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 16, shadowOffset: { width: 0, height: -4 }, elevation: 10 },
  bottomTabButton: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6, minHeight: 58, borderRadius: DESIGN_TOKENS.radius.lg, paddingHorizontal: 4, paddingVertical: 8, backgroundColor: "transparent" },
  bottomTabButtonActive: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt },
  bottomTabIndicator: { width: 24, height: 3, borderRadius: DESIGN_TOKENS.radius.pill, backgroundColor: "transparent" },
  bottomTabIndicatorActive: { backgroundColor: DESIGN_TOKENS.colors.green },
  bottomTabLabel: { color: DESIGN_TOKENS.colors.textMuted, fontWeight: "700", fontSize: 11, textAlign: "center" },
  bottomTabLabelActive: { color: DESIGN_TOKENS.colors.text },
  content: { flexGrow: 1, gap: 12, paddingBottom: 24 },
  section: { gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  disabled: { opacity: 0.55 },
  pick: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.sm, padding: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  pickText: { color: DESIGN_TOKENS.colors.text, fontWeight: "600" },
  dashboardShell: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: DESIGN_TOKENS.radius.xl, padding: 18, gap: 14, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  metricGrid: { flexDirection: "row", gap: 10 },
  dashboardMetricA: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: 14, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  dashboardMetricB: { flex: 1, backgroundColor: "#2b2416", borderRadius: DESIGN_TOKENS.radius.lg, padding: 14, borderWidth: 1, borderColor: "#6d5b25" },
  metricLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 8 },
  metricPanelValue: { fontSize: 24, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  dashboardCompare: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: 16, gap: 6, borderWidth: 1, borderColor: "#21543c" },
  dashboardCompareValue: { fontSize: 28, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  profileCard: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: DESIGN_TOKENS.radius.xl, padding: 18, gap: 16, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  homeHeroCard: { padding: 18, gap: 12 },
  homeHeroContent: { flex: 1, gap: 4 },
  homeHeroBadgeColumn: { alignItems: "flex-end", gap: 8 },
  homeHeroMeta: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: "700" },
  profileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  profileEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: DESIGN_TOKENS.colors.textMuted, marginBottom: 6 },
  profileRank: { fontSize: 15, color: DESIGN_TOKENS.colors.textMuted, marginTop: 4 },
  rankBadge: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderRadius: DESIGN_TOKENS.radius.pill, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.blue },
  rankBadgeText: { color: DESIGN_TOKENS.colors.text, fontWeight: "700" },
  metricPanel: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.lg, padding: 14, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  statusCard: { borderRadius: 18, padding: 16, gap: 6, borderWidth: 1 },
  statusCardActive: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, borderColor: "#21543c" },
  statusCardInactive: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderColor: DESIGN_TOKENS.colors.border },
  statusEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: DESIGN_TOKENS.colors.textMuted },
  statusTitle: { fontSize: 22, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  statusLine: { fontSize: 15, color: DESIGN_TOKENS.colors.textSoft },
  cardHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  statusBadge: { alignSelf: "flex-start", borderRadius: DESIGN_TOKENS.radius.pill, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 },
  statusBadgeNeutral: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderColor: DESIGN_TOKENS.colors.borderStrong },
  statusBadgeSuccess: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, borderColor: "#21543c" },
  statusBadgeWarning: { backgroundColor: DESIGN_TOKENS.colors.yellowSoft, borderColor: "#6d5b25" },
  statusBadgeInfo: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderColor: "#355f82" },
  statusBadgeDanger: { backgroundColor: DESIGN_TOKENS.colors.redSoft, borderColor: "#7a3742" },
  statusBadgePurple: { backgroundColor: DESIGN_TOKENS.colors.purpleSoft, borderColor: "#56417f" },
  statusBadgeTextNeutral: { color: DESIGN_TOKENS.colors.textSoft },
  statusBadgeTextSuccess: { color: DESIGN_TOKENS.colors.green },
  statusBadgeTextWarning: { color: DESIGN_TOKENS.colors.yellow },
  statusBadgeTextInfo: { color: DESIGN_TOKENS.colors.blue },
  statusBadgeTextDanger: { color: DESIGN_TOKENS.colors.red },
  statusBadgeTextPurple: { color: DESIGN_TOKENS.colors.purple },
  todayItem: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, gap: 4 },
  todayItemTitle: { fontSize: 16, fontWeight: "700", color: DESIGN_TOKENS.colors.text },
  listRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.border },
  listRowContent: { flex: 1, gap: 4 },
  listRowTitle: { color: DESIGN_TOKENS.colors.text, fontSize: 15, fontWeight: "700" },
  listRowDetail: { color: DESIGN_TOKENS.colors.textMuted, fontSize: 13 },
  listRowRight: { alignItems: "flex-end", justifyContent: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: DESIGN_TOKENS.colors.overlay },
  modalBackdropDismissArea: { flex: 1 },
  modalSafeArea: { width: "100%" },
  modalSheetShell: { width: "100%", paddingHorizontal: 8, paddingBottom: Platform.OS === "ios" ? 8 : 0 },
  modalHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: DESIGN_TOKENS.colors.borderStrong, marginBottom: 10 },
  modalCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, gap: 14, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: -8 }, elevation: 20, maxHeight: "88%" },
  modalKeyboardShell: { gap: 12, maxHeight: "100%" },
  modalListScroll: { maxHeight: 320 },
  modalListContent: { gap: 10, paddingBottom: 6 },
  playerPickerSheet: { minHeight: 620 },
  playerPickerList: { maxHeight: 540, flexGrow: 1 },
  playerPickerSearch: { minHeight: 48 },
  playerPickerRow: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: DESIGN_TOKENS.radius.md, padding: 14, gap: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  quickActionGrid: { gap: 10 },
  quickActionCard: { gap: 6 },
  quickActionTitle: { color: DESIGN_TOKENS.colors.text, fontSize: 18, fontWeight: "800" },
  quickActionDetail: { color: DESIGN_TOKENS.colors.textSoft, fontSize: 14, lineHeight: 19 },
  desertStormTaskForceCard: { gap: 6 },
  desertStormSlotCard: { padding: 8, gap: 4 },
  desertStormSlotCardAssigned: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, borderColor: DESIGN_TOKENS.colors.green, borderWidth: 1 },
  desertStormSlotCardVoteChanged: { backgroundColor: DESIGN_TOKENS.colors.redSoft, borderColor: DESIGN_TOKENS.colors.red, borderWidth: 1 },
  desertStormSlotName: { fontSize: 15, fontWeight: "700", color: DESIGN_TOKENS.colors.text },
  desertStormLeaderControls: { gap: 10 },
  voteStatusRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  voteStatusTitle: { flex: 1, flexShrink: 1, paddingRight: 8 },
  votePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden", fontSize: 12, fontWeight: "700", flexShrink: 0, alignSelf: "flex-start" },
  votePillDone: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, color: DESIGN_TOKENS.colors.green },
  votePillPending: { backgroundColor: DESIGN_TOKENS.colors.yellowSoft, color: DESIGN_TOKENS.colors.yellow },
  squadCard: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, gap: 8 },
  squadLabel: { fontSize: 13, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, textTransform: "uppercase", letterSpacing: 0.7 },
  voteCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  feedbackHeroCard: { gap: 12 },
  feedbackComposerCard: { gap: 12 },
  feedbackHistoryCard: { gap: 12 },
  feedbackEntryList: { gap: 10 },
  feedbackEntryCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  settingsHeroCard: { gap: 12 },
  settingsSectionCard: { gap: 12 },
  settingsNestedCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  settingsDangerCard: { gap: 12 },
  settingsStack: { gap: 10 },
  feedbackCommentList: { gap: 8, marginTop: 4 },
  feedbackCommentCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, gap: 4 },
  feedbackCommentComposer: { gap: 8, marginTop: 4 },
  feedbackCommentInput: { minHeight: 72 },
  voteOptionWrap: { gap: 4 },
  voteOption: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  voteOptionSelected: { borderColor: DESIGN_TOKENS.colors.green, backgroundColor: DESIGN_TOKENS.colors.greenSoft },
  voteOptionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  voteCount: { fontSize: 14, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted },
  voteResponseList: { fontSize: 13, color: DESIGN_TOKENS.colors.textSoft, lineHeight: 18 },
  inlineSummary: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: DESIGN_TOKENS.colors.border },
  membersHeroCard: { gap: 12 },
  membersFilterCard: { gap: 12 },
  membersRosterList: { gap: 4 },
  memberCard: { gap: 0, padding: 0 },
  memberCardSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 8 },
  memberSummaryText: { flex: 1, gap: 1 },
  memberSummaryRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberExpandIcon: { fontSize: 18, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, width: 18, textAlign: "center" },
  memberCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  memberCardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  memberCardActionsRow: { flexDirection: "row", gap: 10 },
  memberHeaderText: { flex: 1, gap: 4 },
  memberName: { fontSize: 20, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  memberNameCompact: { fontSize: 18, fontWeight: "700", color: DESIGN_TOKENS.colors.text },
  memberSubline: { fontSize: 14, color: DESIGN_TOKENS.colors.textSoft },
  memberRankChip: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.blue },
  memberRankChipText: { color: DESIGN_TOKENS.colors.text, fontWeight: "700" },
  memberStatGrid: { flexDirection: "row", gap: 10 },
  memberStatCard: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, gap: 6 },
  memberStatLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: DESIGN_TOKENS.colors.textMuted },
  memberStatValue: { fontSize: 18, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  memberSection: { gap: 10, padding: 10, borderTopWidth: 1, borderTopColor: DESIGN_TOKENS.colors.border },
  memberSectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: DESIGN_TOKENS.colors.textMuted },
  rankFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rankFilterButton: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  rankFilterButtonActive: { backgroundColor: DESIGN_TOKENS.colors.green, borderColor: DESIGN_TOKENS.colors.green },
  rankFilterButtonText: { color: DESIGN_TOKENS.colors.textSoft, fontWeight: "700" },
  rankFilterButtonTextActive: { color: "#081016", fontWeight: "800" },
  remindersHeroCard: { gap: 12 },
  reminderComposerCard: { gap: 12 },
  reminderSectionCard: { gap: 12 },
  remindersList: { gap: 10 },
  reminderCard: { gap: 10 },
  reminderMeta: { color: DESIGN_TOKENS.colors.textSoft, fontSize: 14, fontWeight: "700" },
  reminderPreviewCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderColor: DESIGN_TOKENS.colors.borderStrong, padding: 12, gap: 8 },
  reminderCountdown: { color: DESIGN_TOKENS.colors.yellow, fontWeight: "800", fontSize: 15 },
  calendarModeRow: { flexDirection: "row", gap: 10 },
  calendarMonthShell: { gap: 12 },
  calendarMonthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarMonthArrow: { width: 40, height: 40, borderRadius: 999, backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  calendarMonthArrowText: { fontSize: 24, fontWeight: "700", color: DESIGN_TOKENS.colors.textSoft, marginTop: -2 },
  calendarMonthTitle: { fontSize: 18, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  calendarWeekdayRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  calendarWeekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, textTransform: "uppercase" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  calendarStripShell: { padding: 12 },
  calendarStrip: { flexDirection: "row", gap: 8 },
  calendarDayCell: { width: "13.3%", minHeight: 88, backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 16, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border, paddingHorizontal: 6, paddingVertical: 8, alignItems: "center", justifyContent: "space-between" },
  calendarDayCellCompact: { flex: 1, width: undefined, minHeight: 82 },
  calendarDayCellMuted: { opacity: 0.45 },
  calendarDayCellToday: { borderColor: DESIGN_TOKENS.colors.green, borderWidth: 2 },
  calendarDayCellSelected: { backgroundColor: DESIGN_TOKENS.colors.blueSoft, borderColor: DESIGN_TOKENS.colors.blue },
  calendarDayWeekLabel: { fontSize: 11, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, textTransform: "uppercase" },
  calendarDayWeekLabelCompact: { fontSize: 12 },
  calendarDayNumber: { fontSize: 26, fontWeight: "800", color: DESIGN_TOKENS.colors.text },
  calendarDayNumberCompact: { fontSize: 24 },
  calendarDayTextMuted: { color: "#66727f" },
  calendarDayTextSelected: { color: DESIGN_TOKENS.colors.text },
  calendarEventBadge: { minWidth: 24, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: DESIGN_TOKENS.colors.greenSoft, alignItems: "center", justifyContent: "center" },
  calendarEventBadgeSelected: { backgroundColor: DESIGN_TOKENS.colors.text },
  calendarEventBadgeText: { fontSize: 12, fontWeight: "700", color: DESIGN_TOKENS.colors.green },
  calendarEventBadgeTextSelected: { color: DESIGN_TOKENS.colors.blue },
  calendarEventSpacer: { height: 24 },
  calendarAgendaShell: { gap: 12 },
  calendarDetailCard: { gap: 12 },
  calendarDetailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  calendarAgendaList: { gap: 10 },
  calendarEntryCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceAlt, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.border },
  calendarEntryMeta: { color: DESIGN_TOKENS.colors.textSoft, fontSize: 14, fontWeight: "700" },
  calendarTimeStack: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 14, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, paddingHorizontal: 12 },
  calendarLeaderNotesCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderColor: DESIGN_TOKENS.colors.borderStrong, padding: 12 },
  calendarEmptyCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderColor: DESIGN_TOKENS.colors.borderStrong, padding: 14 },
  calendarComposerCard: { gap: 12 },
  calendarTimingCard: { gap: 12 },
  calendarPreviewCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 14, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong, padding: 12, gap: 8 },
  calendarTimeButton: { justifyContent: "center" },
  calendarWheelColumn: { flex: 1, height: 220, position: "relative" },
  calendarWheelContent: { paddingVertical: 90 },
  calendarWheelItem: { height: 40, justifyContent: "center", alignItems: "center" },
  calendarWheelText: { fontSize: 22, color: DESIGN_TOKENS.colors.textMuted, fontWeight: "600" },
  calendarWheelTextActive: { color: DESIGN_TOKENS.colors.text, fontWeight: "700" },
  calendarWheelHighlight: { position: "absolute", left: 0, right: 0, top: 90, height: 40, borderRadius: 12, backgroundColor: "rgba(79,195,138,0.08)", borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  calendarWheelHeader: { flexDirection: "row", justifyContent: "space-around", gap: 12 },
  calendarWheelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  calendarWheelDivider: { fontSize: 28, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, paddingHorizontal: 4 },
  zombieHeroCard: { gap: 12 },
  zombieSectionCard: { gap: 12 },
  zombieEventList: { gap: 10 },
  zombieEventCard: { gap: 8 },
  zombieActionRow: { flexDirection: "row", gap: 10 },
  zombieAssignmentCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong },
  zombieSelectedCard: { backgroundColor: DESIGN_TOKENS.colors.greenSoft, borderColor: DESIGN_TOKENS.colors.green },
  zombiePlanCard: { backgroundColor: DESIGN_TOKENS.colors.surfaceSoft, borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.borderStrong }
});
