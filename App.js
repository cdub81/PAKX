import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { AppCard as SharedAppCard, BottomSheetModal as SharedBottomSheetModal, ListRow as SharedListRow, PrimaryButton as SharedPrimaryButton, ScreenContainer as SharedScreenContainer, SectionHeader as SharedSectionHeader, SecondaryButton as SharedSecondaryButton, StatusBadge as SharedStatusBadge } from "./src/components/ui/primitives";
import { CalendarDatePickerModal as SharedCalendarDatePickerModal, CalendarTimePickerModal as SharedCalendarTimePickerModal, ReminderDurationPickerModal as SharedReminderDurationPickerModal } from "./src/components/Pickers";
import { LanguageSelector as SharedLanguageSelector, RankSelector as SharedRankSelector } from "./src/components/Selectors";
import { FeedbackScreen } from "./src/screens/FeedbackScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { DesertStormScreen } from "./src/screens/DesertStormScreen";
import { EventsHubScreen } from "./src/screens/EventsHubScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { LeaderControlsScreen } from "./src/screens/LeaderControlsScreen";
import { MembersScreen } from "./src/screens/MembersScreen";
import { MoreScreen } from "./src/screens/MoreScreen";
import { RemindersScreen } from "./src/screens/RemindersScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ZombieSiegeScreen } from "./src/screens/ZombieSiegeScreen";
import { DESIGN_TOKENS } from "./src/theme/designSystem";
import { addFeedback as addFeedbackRequest, addFeedbackComment as addFeedbackCommentRequest, addMember, approveJoinRequest, archiveDesertStormEvent as archiveDesertStormEventRequest, beginDesertStormEditing as beginDesertStormEditingRequest, closeDesertStormVote as closeDesertStormVoteRequest, createAccount, createAlliance, createCalendarEntry as createCalendarEntryRequest, createDesertStormEvent as createDesertStormEventRequest, createReminder as createReminderRequest, createZombieSiegeEvent as createZombieSiegeEventRequest, deleteCalendarEntry as deleteCalendarEntryRequest, deleteReminder as deleteReminderRequest, discardZombieSiegeDraft as discardZombieSiegeDraftRequest, endDesertStormEvent as endDesertStormEventRequest, endZombieSiegeEvent as endZombieSiegeEventRequest, getAlliancePreview, getJoinRequests, getMe, getReminders as getRemindersRequest, joinAlliance, leaveAlliance, moveDesertStormEventPlayer as moveDesertStormEventPlayerRequest, normalizeBaseUrl, openDesertStormVote as openDesertStormVoteRequest, publishDesertStormEvent as publishDesertStormEventRequest, publishZombieSiegePlan as publishZombieSiegePlanRequest, registerExpoPushToken as registerExpoPushTokenRequest, rejectJoinRequest, removeMember, reopenDesertStormVote as reopenDesertStormVoteRequest, runZombieSiegePlan as runZombieSiegePlanRequest, sendAllianceBroadcastPush as sendAllianceBroadcastPushRequest, signIn, submitDesertStormVote as submitDesertStormVoteRequest, submitZombieSiegeAvailability as submitZombieSiegeAvailabilityRequest, updateAllianceCode, updateCalendarEntry as updateCalendarEntryRequest, updateDesertStormEventSlot as updateDesertStormEventSlotRequest, updateMember, updateReminder as updateReminderRequest, updateZombieSiegeWaveOneReview as updateZombieSiegeWaveOneReviewRequest } from "./src/lib/api";
import { buildDashboard, buildTaskForceView, createPlayerOptions } from "./src/lib/roster";
import { buildReminderSchedule, formatReminderDateKey, formatReminderDateTimeDisplay, getReminderDeviceTimeZone, getReminderServerTimeLabel, getReminderServerTimeZone, isValidReminderDateKey, parseReminderTimeValue } from "./src/lib/reminders";
import { CALENDAR_SERVER_TIME_LABEL, CALENDAR_TIME_INPUT_MODES, CALENDAR_WEEKDAY_OPTIONS, CALENDAR_WHEEL_ITEM_HEIGHT, addLocalDays, buildCalendarTimedPreview, buildDesertStormCalendarLinkSeed, buildZombieSiegeCalendarLinkSeed, expandCalendarEntries, formatCalendarDateButtonLabel, formatLocalDateKey, formatLocalDateTimeInput, getDeviceTimeZone, getLinkableCalendarEvents, getServerTimeLabel, getTimeValueMinutes, isSameLocalDay, normalizeCalendarRecurrence, normalizeCalendarTimeZone, parseLocalDateKey, parseTimeValue, resolveCalendarLinkedEventId, startOfLocalDay, toIsoDateTime, toUtcIsoFromTimeZone } from "./src/lib/calendarHelpers";
import { buildCalendarNotificationCandidates, CALENDAR_NOTIFICATION_CHANNEL_ID, getCalendarNotificationStorageKey } from "./src/lib/calendarNotifications";
import { findCurrentDesertStormEvent, getAssignedPlayerNames, getDesertStormStatusLabel, getDesertStormVoteOptionLabel } from "./src/lib/desertStormHelpers";
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
const CALENDAR_TRANSLATIONS = {
  en: { title: "Alliance Calendar", hint: "Tap a day to see what is scheduled and what needs attention.", today: "Today", week: "Week", month: "Month", selectedDay: "Selected Day", noEventsScheduled: "No events scheduled", oneEventScheduled: "1 event scheduled", manyEventsScheduled: "{count} events scheduled", allDay: "All day", leaderOnly: "Leader Only", edit: "Edit", delete: "Delete", anchoredTo: "Anchored to {value}", linkedDesertStorm: "Linked to Desert Storm", linkedZombieSiege: "Linked to Zombie Siege", addedBy: "Added by {name}", nothingToday: "Nothing is scheduled for today.", tapAnotherDay: "Tap another day to review what is planned.", editEntry: "Edit Calendar Entry", addEntry: "Add Calendar Entry", manualEvent: "Manual Event", reminder: "Reminder", linkDesertStorm: "Link Desert Storm", linkZombieSiege: "Link Zombie Siege", eventTitle: "Event title", startDate: "Start Date", endDate: "End Date", chooseDate: "Choose Date", allDayEntry: "All-day entry", timeSpecificEntry: "Time-specific entry", startTime: "Start Time", endTime: "End Time", eventTimezone: "Event timezone (IANA, ex. America/Chicago)", chooseLinkedEvent: "Choose the linked event", repeat: "Repeat", noRepeat: "No Repeat", daily: "Daily", everyOtherDay: "Every Other Day", weekly: "Weekly", customWeekdays: "Custom Weekdays", repeatEndDate: "Repeat End Date", setRepeatEndDate: "Set Repeat End Date", clearRepeatEndDate: "Clear End Date", reminderPlaceholder: "What should members remember to do?", manualPlaceholder: "What should members know or do?", leaderNotes: "Leader-only notes", timezoneHint: "Timed entries are anchored to {value} and shown in each member's local time.", visibleToEveryone: "Visible To Everyone", leaderOnlyEntry: "Leader Only Entry", saveChanges: "Save Changes", addToCalendar: "Add To Calendar", cancelEditing: "Cancel Editing", repeatsDaily: "Repeats daily", repeatsEveryOtherDay: "Repeats every other day", repeatsWeekly: "Repeats weekly", repeatsWeekdays: "Repeats {value}", inputMode: "Enter Time As", inputModeHint: "Choose whether you are entering the time in server time or your own local time.", serverInputMode: "Server Time (UTC-2)", localInputMode: "My Local Time", timePreview: "Before You Save", previewEnteredAs: "Entered as {value}", serverTime: "Server Time", localTime: "My Local Time", memberLocalTime: "Your Local Time", recurringServerAnchor: "Recurring timed entries will follow Server Time (UTC-2).", pickStartTime: "Select Start Time", pickEndTime: "Select End Time", pickDate: "Select Date", chooseMonth: "Month", chooseDay: "Day", chooseYear: "Year", chooseHour: "Hour", chooseMinute: "Minute", done: "Done", dateRequiredError: "Choose a start date before saving.", endDateRequiredError: "Choose an end date before saving.", repeatEndDateError: "Choose a valid repeat end date or clear it.", startTimeRequiredError: "Choose a start time before saving.", endTimeRequiredError: "Choose an end time before saving.", endTimeInvalidError: "End time must be after start time" },
  ko: { title: "ì¼ë¼ì´ì¸ì¤ ìºë¦°ë", hint: "ë ì§ë¥¼ ëë¬ ì¼ì ê³¼ í´ì¼ í  ì¼ì íì¸íì¸ì.", today: "ì¤ë", week: "ì£¼ê°", month: "ìê°", selectedDay: "ì íí ë ì§", noEventsScheduled: "ìì ë ì¼ì ì´ ììµëë¤", oneEventScheduled: "ì¼ì  1ê°", manyEventsScheduled: "ì¼ì  {count}ê°", allDay: "íë£¨ ì¢ì¼", leaderOnly: "ë¦¬ë ì ì©", edit: "ìì ", delete: "ì­ì ", anchoredTo: "{value} ê¸°ì¤", linkedDesertStorm: "ë°ì í¸ ì¤í°ê³¼ ì°ê²°ë¨", linkedZombieSiege: "ì¢ë¹ ìì¦ì ì°ê²°ë¨", addedBy: "{name} ëì´ ì¶ê°", nothingToday: "ì¤ë ìì ë ì¼ì ì´ ììµëë¤.", tapAnotherDay: "ë¤ë¥¸ ë ì§ë¥¼ ëë¬ ê³íì íì¸íì¸ì.", editEntry: "ìºë¦°ë í­ëª© ìì ", addEntry: "ìºë¦°ë í­ëª© ì¶ê°", manualEvent: "ìë ì¼ì ", reminder: "ë¦¬ë§ì¸ë", linkDesertStorm: "ë°ì í¸ ì¤í° ì°ê²°", linkZombieSiege: "ì¢ë¹ ìì¦ ì°ê²°", eventTitle: "ì´ë²¤í¸ ì ëª©", allDayEntry: "íë£¨ ì¢ì¼ ì¼ì ", timeSpecificEntry: "ìê° ì§ì  ì¼ì ", startTime: "ìì HH:MM", endTime: "ì¢ë£ HH:MM", eventTimezone: "ì´ë²¤í¸ ìê°ë (IANA, ì: America/Chicago)", chooseLinkedEvent: "ì°ê²°í  ì´ë²¤í¸ ì í", repeat: "ë°ë³µ", noRepeat: "ë°ë³µ ìì", daily: "ë§¤ì¼", everyOtherDay: "ê²©ì¼", weekly: "ë§¤ì£¼", customWeekdays: "ìì¼ ì§ì ", repeatEndDate: "ë°ë³µ ì¢ë£ì¼ (ì í YYYY-MM-DD)", reminderPlaceholder: "ë©¤ë²ë¤ì´ ë¬´ìì ê¸°ìµí´ì¼ íëì?", manualPlaceholder: "ë©¤ë²ë¤ìê² ë¬´ìì ìë ¤ì¼ íëì?", leaderNotes: "ë¦¬ë ì ì© ë©ëª¨", timezoneHint: "ìê° ì§ì  ì¼ì ì {value} ê¸°ì¤ì´ë©°, ê° ë©¤ë²ì íì§ ìê°ì¼ë¡ íìë©ëë¤.", visibleToEveryone: "ì ì²´ ê³µê°", leaderOnlyEntry: "ë¦¬ë ì ì© ì¼ì ", saveChanges: "ë³ê²½ ì ì¥", addToCalendar: "ìºë¦°ëì ì¶ê°", cancelEditing: "ìì  ì·¨ì", repeatsDaily: "ë§¤ì¼ ë°ë³µ", repeatsEveryOtherDay: "ê²©ì¼ ë°ë³µ", repeatsWeekly: "ë§¤ì£¼ ë°ë³µ", repeatsWeekdays: "{value} ë°ë³µ" },
  es: { title: "Calendario de la alianza", hint: "Toca un dÃ­a para ver lo programado y lo que requiere atenciÃ³n.", today: "Hoy", week: "Semana", month: "Mes", selectedDay: "DÃ­a seleccionado", noEventsScheduled: "No hay eventos programados", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Todo el dÃ­a", leaderOnly: "Solo lÃ­deres", edit: "Editar", delete: "Eliminar", anchoredTo: "Anclado a {value}", linkedDesertStorm: "Vinculado a Desert Storm", linkedZombieSiege: "Vinculado a Zombie Siege", addedBy: "Agregado por {name}", nothingToday: "No hay nada programado para hoy.", tapAnotherDay: "Toca otro dÃ­a para revisar lo planeado.", editEntry: "Editar entrada del calendario", addEntry: "Agregar entrada al calendario", manualEvent: "Evento manual", reminder: "Recordatorio", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "TÃ­tulo del evento", allDayEntry: "Evento de todo el dÃ­a", timeSpecificEntry: "Evento con hora", startTime: "Inicio HH:MM", endTime: "Fin HH:MM", eventTimezone: "Zona horaria del evento (IANA, ej. America/Chicago)", chooseLinkedEvent: "Elige el evento vinculado", repeat: "Repetir", noRepeat: "No repetir", daily: "Diario", everyOtherDay: "Cada dos dÃ­as", weekly: "Semanal", customWeekdays: "DÃ­as personalizados", repeatEndDate: "Fecha de fin de repeticiÃ³n (opcional YYYY-MM-DD)", reminderPlaceholder: "Â¿QuÃ© deben recordar hacer los miembros?", manualPlaceholder: "Â¿QuÃ© deben saber o hacer los miembros?", leaderNotes: "Notas solo para lÃ­deres", timezoneHint: "Las entradas con hora se anclan a {value} y se muestran en la hora local de cada miembro.", visibleToEveryone: "Visible para todos", leaderOnlyEntry: "Entrada solo para lÃ­deres", saveChanges: "Guardar cambios", addToCalendar: "Agregar al calendario", cancelEditing: "Cancelar ediciÃ³n", repeatsDaily: "Se repite a diario", repeatsEveryOtherDay: "Se repite cada dos dÃ­as", repeatsWeekly: "Se repite semanalmente", repeatsWeekdays: "Se repite {value}" },
  pt: { title: "CalendÃ¡rio da alianÃ§a", hint: "Toque em um dia para ver o que estÃ¡ programado e o que precisa de atenÃ§Ã£o.", today: "Hoje", week: "Semana", month: "MÃªs", selectedDay: "Dia selecionado", noEventsScheduled: "Nenhum evento programado", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Dia inteiro", leaderOnly: "Somente lÃ­deres", edit: "Editar", delete: "Excluir", anchoredTo: "Ancorado em {value}", linkedDesertStorm: "Vinculado ao Desert Storm", linkedZombieSiege: "Vinculado ao Zombie Siege", addedBy: "Adicionado por {name}", nothingToday: "Nada estÃ¡ programado para hoje.", tapAnotherDay: "Toque em outro dia para revisar o planejamento.", editEntry: "Editar entrada do calendÃ¡rio", addEntry: "Adicionar entrada ao calendÃ¡rio", manualEvent: "Evento manual", reminder: "Lembrete", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "TÃ­tulo do evento", allDayEntry: "Evento de dia inteiro", timeSpecificEntry: "Evento com horÃ¡rio", startTime: "InÃ­cio HH:MM", endTime: "Fim HH:MM", eventTimezone: "Fuso do evento (IANA, ex. America/Chicago)", chooseLinkedEvent: "Escolha o evento vinculado", repeat: "Repetir", noRepeat: "NÃ£o repetir", daily: "Diariamente", everyOtherDay: "Dia sim, dia nÃ£o", weekly: "Semanal", customWeekdays: "Dias personalizados", repeatEndDate: "Data final da repetiÃ§Ã£o (opcional YYYY-MM-DD)", reminderPlaceholder: "O que os membros precisam lembrar de fazer?", manualPlaceholder: "O que os membros precisam saber ou fazer?", leaderNotes: "Notas apenas para lÃ­deres", timezoneHint: "Entradas com horÃ¡rio sÃ£o ancoradas em {value} e mostradas no horÃ¡rio local de cada membro.", visibleToEveryone: "VisÃ­vel para todos", leaderOnlyEntry: "Entrada sÃ³ para lÃ­deres", saveChanges: "Salvar alteraÃ§Ãµes", addToCalendar: "Adicionar ao calendÃ¡rio", cancelEditing: "Cancelar ediÃ§Ã£o", repeatsDaily: "Repete diariamente", repeatsEveryOtherDay: "Repete em dias alternados", repeatsWeekly: "Repete semanalmente", repeatsWeekdays: "Repete {value}" }
};
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "???" },
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
const TRANSLATIONS = {
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
    tabMyInfo: "My Info",
    tabMembers: "Members",
    tabReminders: "Reminders",
    tabAlliance: "Settings",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "DS History",
    tabFeedback: "Feedback",
    tabDashboard: "Dashboard",
    feedbackTitle: "App Feedback",
    feedbackHint: "Share comments, bugs, and recommended updates with the alliance.",
    feedbackExample: "Example:\nI think the Desert Storm history tab should show power totals too.",
    submitFeedback: "Submit Feedback",
    allianceFeedback: "Alliance Feedback",
    noFeedback: "No feedback has been submitted yet.",
    feedbackFrom: "From {name} â¢ {date}",
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
    resultLoss: "Loss"
  },
  ko: {
    appTitle: "PAKX ì¼ë¼ì´ì¸ì¤ ì±",
    authSignIn: "ë¡ê·¸ì¸",
    authCreateAccount: "ê³ì  ë§ë¤ê¸°",
    username: "ì¬ì©ì ì´ë¦",
    password: "ë¹ë°ë²í¸",
    welcome: "{name}ë, íìí©ëë¤",
    notInAlliance: "ì´ ê³ì ì ìì§ ì¼ë¼ì´ì¸ì¤ì ì°ê²°ëì´ ìì§ ììµëë¤.",
    joinAlliance: "ì¼ë¼ì´ì¸ì¤ ê°ì",
    createAlliance: "ì¼ë¼ì´ì¸ì¤ ìì±",
    allianceName: "ì¼ë¼ì´ì¸ì¤ ì´ë¦",
    allianceCode: "ì¼ë¼ì´ì¸ì¤ ì½ë",
    previewAlliance: "ì¼ë¼ì´ì¸ì¤ ë¯¸ë¦¬ë³´ê¸°",
    foundAlliance: "ì°¾ì: {name}",
    signOut: "ë¡ê·¸ìì",
    joinRequestPending: "ê°ì ìì²­ ëê¸° ì¤",
    pendingApproval: "R4 ëë R5ì ì¹ì¸ì ê¸°ë¤ë¦¬ê³  ììµëë¤.",
    refreshStatus: "ìí ìë¡ê³ ì¹¨",
    language: "ì¸ì´",
    signedInAs: "{name} ({rank})ë¡ ë¡ê·¸ì¸ë¨",
    playersWaiting: "{count}ëªì íë ì´ì´ê° ì¹ì¸ ëê¸° ì¤ìëë¤",
    onePlayerWaiting: "1ëªì íë ì´ì´ê° ì¹ì¸ ëê¸° ì¤ìëë¤",
    tapReviewRequests: "ì¼ë¼ì´ì¸ì¤ í­ìì ê°ì ìì²­ì íì¸íì¸ì.",
    restoringSession: "ì¸ìì ë³µìíë ì¤...",
    sessionExpired: "ì¸ìì´ ë§ë£ëììµëë¤. ë¤ì ë¡ê·¸ì¸í´ ì£¼ì¸ì.",
    choosePlayer: "íë ì´ì´ ì í",
    votedMembers: "í¬íí ë©¤ë²",
    entireAlliance: "ì ì²´ ì¼ë¼ì´ì¸ì¤",
    showingAllAlliance: "ì´ ì¬ë¡¯ì ëí´ ì¼ë¼ì´ì¸ì¤ ì ì²´ ë©¤ë²ë¥¼ íìí©ëë¤.",
    searchNameOrRank: "ì´ë¦ ëë ë±ê¸ ê²ì",
    clearSelection: "ì í í´ì ",
    noPlayersMatchSearch: "ê²ìê³¼ ì¼ì¹íë íë ì´ì´ê° ììµëë¤.",
    noMembersMatchVoteFilter: "ëì í¸ ì¤í° í¬í ì¡°ê±´ì ë§ë ë©¤ë²ê° ììµëë¤.",
    tabMyInfo: "ë´ ì ë³´",
    tabMembers: "ë©¤ë²",
    tabAlliance: "ì¤ì ",
    tabTaskForceA: "íì¤í¬í¬ì¤ A",
    tabTaskForceB: "íì¤í¬í¬ì¤ B",
    tabDSHistory: "DS ê¸°ë¡",
    tabFeedback: "í¼ëë°±",
    tabDashboard: "ëìë³´ë",
    feedbackTitle: "ì± í¼ëë°±",
    feedbackHint: "ì±ì ëí ìê²¬, ë²ê·¸, ìë°ì´í¸ ì ìì ë¨ê²¨ì£¼ì¸ì.",
    feedbackExample: "ìì:\nëì í¸ ì¤í° ê¸°ë¡ í­ì ì í¬ë ¥ í©ê³ë íìëë©´ ì¢ê² ìµëë¤.",
    submitFeedback: "í¼ëë°± ë³´ë´ê¸°",
    allianceFeedback: "ì¼ë¼ì´ì¸ì¤ í¼ëë°±",
    noFeedback: "ìì§ ë±ë¡ë í¼ëë°±ì´ ììµëë¤.",
    feedbackFrom: "{name} â¢ {date}",
    allianceTitle: "ì¼ë¼ì´ì¸ì¤",
    accountLabel: "ê³ì : {value}",
    allianceLabel: "ì¼ë¼ì´ì¸ì¤: {value}",
    codeLabel: "ì½ë: {value}",
    signedInAsPlayer: "ë¡ê·¸ì¸ íë ì´ì´: {value}",
    pendingJoinRequests: "ëê¸° ì¤ì¸ ê°ì ìì²­",
    noPendingRequests: "ëê¸° ì¤ì¸ ê°ì ìì²­ì´ ììµëë¤.",
    requestedWithCode: "ìì²­ ì½ë: {code}",
    approve: "ì¹ì¸",
    reject: "ê±°ì ",
    rotateCode: "ì½ë ë³ê²½",
    updateCode: "ì½ë ìë°ì´í¸",
    addMember: "ë©¤ë² ì¶ê°",
    name: "ì´ë¦",
    rank: "ë±ê¸",
    power: "ì í¬ë ¥",
    memberOptions: "ë©¤ë² ìµì",
    leaveAnyTime: "ì¸ì ë ì§ ì¼ë¼ì´ì¸ì¤ë¥¼ ë ë  ì ììµëë¤.",
    leaveAlliance: "ì¼ë¼ì´ì¸ì¤ íí´",
    leaveAllianceTitle: "ì¼ë¼ì´ì¸ì¤ íí´",
    leaveAllianceConfirm: "ì ë§ ì´ ì¼ë¼ì´ì¸ì¤ë¥¼ ë ëìê² ìµëê¹?",
    cancel: "ì·¨ì",
    leave: "íí´",
    signedInPlayer: "ë¡ê·¸ì¸í íë ì´ì´",
    totalBasePower: "ì´ ê¸°ë³¸ ì í¬ë ¥",
    totalSquadPower: "ì´ ë¶ë ì í¬ë ¥",
    desertStormTitle: "ëì í¸ ì¤í°",
    selectedForDesertStorm: "ëì í¸ ì¤í°ì ì íë¨",
    notCurrentlyAssigned: "íì¬ ë°°ì ëì§ ìì",
    taskForceLabel: "íì¤í¬í¬ì¤: {value}",
    squadLabel: "ë¶ë: {value}",
    slotLabel: "ì¬ë¡¯: {value}",
    notListedInTaskForces: "íì¬ Task Force A ëë Task Force Bì ë°°ì ëì´ ìì§ ììµëë¤.",
    desertStormRecord: "ëì í¸ ì¤í° ê¸°ë¡",
    lockInsPlayed: "ëì í¸ ì¤í° {count}í íë ì´",
    noLockedHistoryYet: "ìì§ ì ê¸´ ëì í¸ ì¤í° ê¸°ë¡ì´ ììµëë¤",
    appearancesWillShow: "ë¦¬ëê° ëì í¸ ì¤í° ë°°ì¹ë¥¼ ì ê·¸ë©´ ì¬ê¸°ì ì°¸ì¬ ê¸°ë¡ì´ íìë©ëë¤.",
    basePowerSection: "ê¸°ë³¸ ì í¬ë ¥",
    squadPowerBreakdown: "ë¶ë ì í¬ë ¥ ì¸ë¶",
    squadNumber: "{number} ë¶ë",
    resultPending: "ëê¸° ì¤",
    resultWin: "ì¹ë¦¬",
    resultLoss: "í¨ë°°"
  },
  es: {
    appTitle: "App de Alianza PAKX",
    authSignIn: "Iniciar sesiÃ³n",
    authCreateAccount: "Crear cuenta",
    username: "Usuario",
    password: "ContraseÃ±a",
    welcome: "Bienvenido, {name}",
    notInAlliance: "Esta cuenta todavÃ­a no estÃ¡ asociada a una alianza.",
    joinAlliance: "Unirse a alianza",
    createAlliance: "Crear alianza",
    allianceName: "Nombre de la alianza",
    allianceCode: "CÃ³digo de alianza",
    previewAlliance: "Ver alianza",
    foundAlliance: "Encontrada: {name}",
    signOut: "Cerrar sesiÃ³n",
    joinRequestPending: "Solicitud de ingreso pendiente",
    pendingApproval: "Tu solicitud estÃ¡ esperando la aprobaciÃ³n de un R4 o R5.",
    refreshStatus: "Actualizar estado",
    language: "Idioma",
    signedInAs: "SesiÃ³n iniciada como {name} ({rank})",
    playersWaiting: "{count} jugadores esperan aprobaciÃ³n",
    onePlayerWaiting: "1 jugador espera aprobaciÃ³n",
    tapReviewRequests: "Toca para revisar solicitudes en la pestaÃ±a Alianza.",
    restoringSession: "Restaurando tu sesiÃ³n...",
    sessionExpired: "Tu sesiÃ³n expirÃ³. Vuelve a iniciar sesiÃ³n.",
    choosePlayer: "Elegir jugador",
    votedMembers: "Miembros que votaron",
    entireAlliance: "Toda la alianza",
    showingAllAlliance: "Mostrando todos los miembros de la alianza para este puesto.",
    searchNameOrRank: "Buscar por nombre o rango",
    clearSelection: "Quitar selecciÃ³n",
    noPlayersMatchSearch: "No hay jugadores que coincidan con la bÃºsqueda.",
    noMembersMatchVoteFilter: "No hay miembros que coincidan con ese filtro de voto de Desert Storm.",
    tabMyInfo: "Mi informaciÃ³n",
    tabMembers: "Miembros",
    tabAlliance: "Configuracion",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "Historial DS",
    tabFeedback: "Comentarios",
    tabDashboard: "Panel",
    feedbackTitle: "Comentarios de la app",
    feedbackHint: "Comparte comentarios, errores y mejoras recomendadas con la alianza.",
    feedbackExample: "Ejemplo:\nCreo que el historial de Desert Storm deberÃ­a mostrar tambiÃ©n el poder total.",
    submitFeedback: "Enviar comentario",
    allianceFeedback: "Comentarios de la alianza",
    noFeedback: "TodavÃ­a no hay comentarios.",
    feedbackFrom: "De {name} â¢ {date}",
    allianceTitle: "Alianza",
    accountLabel: "Cuenta: {value}",
    allianceLabel: "Alianza: {value}",
    codeLabel: "CÃ³digo: {value}",
    signedInAsPlayer: "SesiÃ³n iniciada como: {value}",
    pendingJoinRequests: "Solicitudes pendientes",
    noPendingRequests: "No hay solicitudes pendientes.",
    requestedWithCode: "SolicitÃ³ con el cÃ³digo {code}",
    approve: "Aprobar",
    reject: "Rechazar",
    rotateCode: "Cambiar cÃ³digo",
    updateCode: "Actualizar cÃ³digo",
    addMember: "Agregar miembro",
    name: "Nombre",
    rank: "Rango",
    power: "Poder",
    memberOptions: "Opciones de miembro",
    leaveAnyTime: "Puedes salir de esta alianza en cualquier momento.",
    leaveAlliance: "Salir de la alianza",
    leaveAllianceTitle: "Salir de la alianza",
    leaveAllianceConfirm: "Â¿Seguro que quieres salir de esta alianza?",
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
    noLockedHistoryYet: "TodavÃ­a no hay historial bloqueado de Desert Storm",
    appearancesWillShow: "Cuando los lÃ­deres bloqueen una alineaciÃ³n de Desert Storm, tus apariciones se mostrarÃ¡n aquÃ­.",
    basePowerSection: "Poder Base",
    squadPowerBreakdown: "Desglose de poder por escuadra",
    squadNumber: "Escuadra {number}",
    resultPending: "Pendiente",
    resultWin: "Victoria",
    resultLoss: "Derrota"
  },
  pt: {
    appTitle: "App da AlianÃ§a PAKX",
    authSignIn: "Entrar",
    authCreateAccount: "Criar conta",
    username: "UsuÃ¡rio",
    password: "Senha",
    welcome: "Bem-vindo, {name}",
    notInAlliance: "Esta conta ainda nÃ£o estÃ¡ associada a uma alianÃ§a.",
    joinAlliance: "Entrar na alianÃ§a",
    createAlliance: "Criar alianÃ§a",
    allianceName: "Nome da alianÃ§a",
    allianceCode: "CÃ³digo da alianÃ§a",
    previewAlliance: "Ver alianÃ§a",
    foundAlliance: "Encontrada: {name}",
    signOut: "Sair",
    joinRequestPending: "Pedido de entrada pendente",
    pendingApproval: "Seu pedido estÃ¡ aguardando aprovaÃ§Ã£o de um R4 ou R5.",
    refreshStatus: "Atualizar status",
    language: "Idioma",
    signedInAs: "Conectado como {name} ({rank})",
    playersWaiting: "{count} jogadores aguardando aprovaÃ§Ã£o",
    onePlayerWaiting: "1 jogador aguardando aprovaÃ§Ã£o",
    tapReviewRequests: "Toque para revisar pedidos na aba AlianÃ§a.",
    restoringSession: "Restaurando sua sessÃ£o...",
    sessionExpired: "Sua sessÃ£o expirou. Entre novamente.",
    choosePlayer: "Escolher jogador",
    votedMembers: "Membros que votaram",
    entireAlliance: "AlianÃ§a inteira",
    showingAllAlliance: "Mostrando todos os membros da alianÃ§a para esta vaga.",
    searchNameOrRank: "Buscar por nome ou patente",
    clearSelection: "Limpar seleÃ§Ã£o",
    noPlayersMatchSearch: "Nenhum jogador corresponde Ã  busca.",
    noMembersMatchVoteFilter: "Nenhum membro corresponde a esse filtro de voto do Desert Storm.",
    tabMyInfo: "Minhas informaÃ§Ãµes",
    tabMembers: "Membros",
    tabAlliance: "Configuracoes",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "HistÃ³rico DS",
    tabFeedback: "Feedback",
    tabDashboard: "Painel",
    feedbackTitle: "Feedback do app",
    feedbackHint: "Compartilhe comentÃ¡rios, bugs e melhorias sugeridas com a alianÃ§a.",
    feedbackExample: "Exemplo:\nAcho que o histÃ³rico do Desert Storm deveria mostrar tambÃ©m o poder total.",
    submitFeedback: "Enviar feedback",
    allianceFeedback: "Feedback da alianÃ§a",
    noFeedback: "Nenhum feedback foi enviado ainda.",
    feedbackFrom: "De {name} â¢ {date}",
    allianceTitle: "AlianÃ§a",
    accountLabel: "Conta: {value}",
    allianceLabel: "AlianÃ§a: {value}",
    codeLabel: "CÃ³digo: {value}",
    signedInAsPlayer: "Conectado como: {value}",
    pendingJoinRequests: "Pedidos pendentes",
    noPendingRequests: "NÃ£o hÃ¡ pedidos pendentes.",
    requestedWithCode: "Solicitado com o cÃ³digo {code}",
    approve: "Aprovar",
    reject: "Rejeitar",
    rotateCode: "Alterar cÃ³digo",
    updateCode: "Atualizar cÃ³digo",
    addMember: "Adicionar membro",
    name: "Nome",
    rank: "Patente",
    power: "Poder",
    memberOptions: "OpÃ§Ãµes do membro",
    leaveAnyTime: "VocÃª pode sair desta alianÃ§a a qualquer momento.",
    leaveAlliance: "Sair da alianÃ§a",
    leaveAllianceTitle: "Sair da alianÃ§a",
    leaveAllianceConfirm: "Tem certeza de que deseja sair desta alianÃ§a?",
    cancel: "Cancelar",
    leave: "Sair",
    signedInPlayer: "Jogador conectado",
    totalBasePower: "Poder Base Total",
    totalSquadPower: "Poder Total de EsquadrÃ£o",
    desertStormTitle: "Desert Storm",
    selectedForDesertStorm: "Selecionado para Desert Storm",
    notCurrentlyAssigned: "NÃ£o atribuÃ­do no momento",
    taskForceLabel: "Task Force: {value}",
    squadLabel: "EsquadrÃ£o: {value}",
    slotLabel: "PosiÃ§Ã£o: {value}",
    notListedInTaskForces: "VocÃª nÃ£o estÃ¡ listado atualmente na Task Force A ou Task Force B.",
    desertStormRecord: "HistÃ³rico do Desert Storm",
    lockInsPlayed: "{count} Desert Storm jogados",
    noLockedHistoryYet: "Ainda nÃ£o hÃ¡ histÃ³rico travado de Desert Storm",
    appearancesWillShow: "Quando os lÃ­deres travarem uma formaÃ§Ã£o do Desert Storm, suas participaÃ§Ãµes aparecerÃ£o aqui.",
    basePowerSection: "Poder Base",
    squadPowerBreakdown: "Detalhamento do poder dos esquadrÃµes",
    squadNumber: "EsquadrÃ£o {number}",
    resultPending: "Pendente",
    resultWin: "VitÃ³ria",
    resultLoss: "Derrota"
  }
};

function getTranslator(language) {
  const locale = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (key, values = {}) => {
    const template = locale[key] || TRANSLATIONS.en[key] || key;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "");
  };
}

function getCalendarTranslator(language) {
  const locale = CALENDAR_TRANSLATIONS[language] || CALENDAR_TRANSLATIONS.en;
  return (key, values = {}) => {
    const template = locale[key] || CALENDAR_TRANSLATIONS.en[key] || key;
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
  if (tab === "home") return "Home";
  if (tab === "calendar") return "Calendar";
  if (tab === "events") return "Events";
  if (tab === "reminders") return t("tabReminders");
  if (tab === "more") return `More${leader && joinRequests.length ? ` (${joinRequests.length})` : ""}`;
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
          <Pressable style={[styles.secondaryButton, styles.half, setupMode === "join" && styles.modeButtonActive]} onPress={() => setSetupMode("join")}><Text style={[styles.secondaryButtonText, setupMode === "join" && styles.modeButtonTextActive]}>Join</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, setupMode === "create" && styles.modeButtonActive]} onPress={() => setSetupMode("create")}><Text style={[styles.secondaryButtonText, setupMode === "create" && styles.modeButtonTextActive]}>Create</Text></Pressable>
        </View>
        {setupMode === "join" ? <>
          <TextInput value={allianceCodeInput} onChangeText={setAllianceCodeInput} style={styles.input} placeholder="Alliance code" autoCapitalize="characters" />
          <View style={styles.row}>
            <PrimaryButton label="Preview Alliance" onPress={onPreview} style={styles.half} disabled={loading} />
            <SecondaryButton label="Refresh Status" onPress={onRefreshStatus} style={styles.half} disabled={loading} />
          </View>
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
  const [playerPickerMode, setPlayerPickerMode] = useState("voted");
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
  const options = useMemo(() => createPlayerOptions(players), [players]);
  const activeDesertStormEvent = useMemo(() => findCurrentDesertStormEvent(desertStormEvents), [desertStormEvents]);
  const archivedDesertStormEvents = useMemo(() => desertStormEvents.filter((event) => event.status === "archived"), [desertStormEvents]);
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
  const filteredOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const unassignedOptions = options.filter((player) => !assignedPlayerNames.has(player.name));
    const roleFiltered = !playerModal || playerPickerMode === "all" ? unassignedOptions : unassignedOptions.filter((player) => {
      const response = selectedDesertStormEvent?.vote?.responses?.find((entry) => entry.playerId === player.id);
      if (!response) return false;
      if (playerModal.memberType === "Sub") return response.optionId === "sub";
      return response.optionId === "play";
    });
    return !q ? roleFiltered : roleFiltered.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q));
  }, [options, searchText, playerModal, playerPickerMode, selectedDesertStormEvent, assignedPlayerNames]);
  const filteredMembers = useMemo(() => { const q = memberSearchText.trim().toLowerCase(); const rankWeight = { R5: 5, R4: 4, R3: 3, R2: 2, R1: 1 }; const rankFilteredPlayers = memberRankFilter === "all" ? players : players.filter((p) => p.rank === memberRankFilter); const matchingPlayers = !q ? rankFilteredPlayers : rankFilteredPlayers.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q)); return [...matchingPlayers].sort((a, b) => memberSortMode === "name" ? a.name.localeCompare(b.name) : (rankWeight[b.rank] || 0) - (rankWeight[a.rank] || 0) || a.name.localeCompare(b.name)); }, [players, memberSearchText, memberSortMode, memberRankFilter]);
  const activeDesertStormVote = activeDesertStormEvent?.vote?.status === "open" ? activeDesertStormEvent.vote : null;
  const desertStormVoteNeedsResponse = Boolean(activeDesertStormVote && !activeDesertStormVote.didVote);
  const desertStormVoteSubmitted = Boolean(activeDesertStormVote && activeDesertStormVote.didVote);
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
    setAlliancePreview(me.alliance ? { id: me.alliance.id, name: me.alliance.name, code: me.alliance.code, players: me.alliance.players } : null);
    setNewAllianceCode(me.alliance?.code || "");
    if (me.alliance && me.player && isLeader(me.player.rank)) {
      const jr = await getJoinRequests(backendUrl, token);
      setJoinRequests(jr.joinRequests || []);
    } else {
      setJoinRequests([]);
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
    if (!session.token || !session.backendUrl || !alliance) return undefined;
    const intervalId = setInterval(() => {
      refresh().catch((error) => {
        handleRequestError(error).catch(() => {});
      });
    }, 30000);
    return () => clearInterval(intervalId);
  }, [session.token, session.backendUrl, alliance, activeTab]);

  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data?.type === "desertStormVote") {
        openDesertStormVoteArea(String(data.eventId || ""));
      } else if (data?.type === "calendarEvent") {
        handleTabPress("calendar");
      } else if (data?.type === "reminder") {
        handleTabPress("reminders");
      }
    }).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data?.type === "desertStormVote") {
        openDesertStormVoteArea(String(data.eventId || ""));
      } else if (data?.type === "calendarEvent") {
        handleTabPress("calendar");
      } else if (data?.type === "reminder") {
        handleTabPress("reminders");
      }
    });
    return () => subscription.remove();
  }, []);

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

  const handleSetDesertStormVoteNotificationsEnabled = (enabled) => run(async () => {
    if (enabled) {
      setPushPromptDismissed(false);
      await AsyncStorage.removeItem(PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY);
    }
    await updateMember(session.backendUrl, session.token, currentUser.id, { desertStormVoteNotificationsEnabled: Boolean(enabled) });
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
    try {
      setLoading(true);
      setErrorMessage("");
      const result = await sendAllianceBroadcastPushRequest(session.backendUrl, session.token, message);
      setLeaderBroadcastMessage("");
      Alert.alert("Broadcast sent", result?.targetedDevices ? `Push notification sent to ${result.targetedDevices} registered device${result.targetedDevices === 1 ? "" : "s"}.` : "No registered push-enabled devices were available to receive this broadcast.");
      return true;
    } catch (error) {
      await handleRequestError(error);
      return false;
    } finally {
      setLoading(false);
    }
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

  if (session.token && !alliance) return <AllianceSetupScreen {...{ account, setupMode, setSetupMode, allianceCodeInput, setAllianceCodeInput, allianceNameInput, setAllianceNameInput, alliancePreview, joinRequest, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onPreview={() => run(async () => setAlliancePreview(await getAlliancePreview(normalizeBaseUrl(backendUrlInput), allianceCodeInput)))} onJoin={() => run(async () => { const result = await joinAlliance(session.backendUrl, session.token, allianceCodeInput); setAccount(result.account); setJoinRequest(result.joinRequest); setAlliance(null); setCurrentUser(null); setAlliancePreview(result.alliance); setSetupMode("join"); })} onCreateAlliance={() => run(async () => { const result = await createAlliance(session.backendUrl, session.token, { name: allianceNameInput, code: allianceCodeInput }); setAccount(result.account); setAlliance(result.alliance); setCurrentUser(result.player); setJoinRequest(null); setNewAllianceCode(result.alliance.code); })} onRefreshStatus={() => run(async () => { await refresh(); })} onSignOut={signOut} />;

  return (
    <ScreenContainer>
        <View style={styles.screen}>
          <View style={styles.screenContent}>
            <SectionHeader eyebrow="Alliance Command" title={alliance?.name} detail={t("signedInAs", { name: account?.displayName, rank: currentUser?.rank })} />
            {leader && joinRequests.length ? <AppCard variant="warning" onPress={() => openMoreDestination("settings")}><Text style={styles.alertBannerTitle}>{joinRequests.length === 1 ? t("onePlayerWaiting") : t("playersWaiting", { count: joinRequests.length })}</Text><Text style={styles.alertBannerText}>{t("tapReviewRequests")}</Text></AppCard> : null}
            {activeTab === "home" && desertStormVoteNeedsResponse ? <AppCard variant="info" onPress={() => openDesertStormVoteArea()}><View style={styles.bannerHeader}><Text style={styles.voteBannerTitle}>Desert Storm vote is live - tap to respond</Text><StatusBadge label="Response Needed" tone="warning" /></View><Text style={styles.voteBannerText}>Open the Desert Storm event to submit your vote.</Text></AppCard> : null}
            {loading ? <ActivityIndicator color={DESIGN_TOKENS.colors.green} /> : null}
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={DESIGN_TOKENS.colors.green} colors={[DESIGN_TOKENS.colors.green]} />}>
            {activeTab === "home" ? <HomeScreen styles={styles} currentUser={currentUser} account={account} alliance={alliance} desertStormAssignment={desertStormAssignment} desertStormVoteStatus={activeDesertStormVote ? (desertStormVoteNeedsResponse ? "needed" : desertStormVoteSubmitted ? "submitted" : "") : ""} todayCalendarEntries={todayCalendarEntries} currentZombieSiegeEvent={selectedZombieSiegeEvent} currentZombieSiegeAssignment={currentZombieSiegeAssignment} onChangeField={saveMyInfo} onOpenDesertStormVote={activeDesertStormVote ? () => openDesertStormVoteArea() : null} onOpenCalendar={() => handleTabPress("calendar")} onOpenReminders={() => handleTabPress("reminders")} onOpenZombieSiege={() => openEventsDestination("zombieSiege")} onOpenFeedback={() => openMoreDestination("feedback")} onOpenSettings={() => openMoreDestination("settings")} showPushNotificationControls={Platform.OS !== "android"} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
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
            }} onChangeNewCalendarRepeat={setNewCalendarRepeat} onChangeNewCalendarRepeatEndDate={setNewCalendarRepeatEndDate} onToggleNewCalendarRepeatWeekday={(code) => setNewCalendarRepeatWeekdays((current) => toggleWeekdaySelection(current, code))} onChangeNewCalendarLinkedEventId={setNewCalendarLinkedEventId} onChangeNewCalendarLeaderNotes={setNewCalendarLeaderNotes} onToggleLeaderOnly={() => setNewCalendarLeaderOnly((value) => !value)} onCreateEntry={handleSubmitCalendarEntry} onCancelEdit={resetCalendarForm} onEditEntry={beginCalendarEntryEdit} onDeleteEntry={(entryId) => run(async () => { if (editingCalendarEntryId === entryId) { resetCalendarForm(); } await deleteCalendarEntryRequest(session.backendUrl, session.token, entryId); await refresh(); })} onOpenLinkedEntry={openLinkedCalendarEntry} helpers={{ startOfLocalDay, formatLocalDateKey, addLocalDays, parseLocalDateKey, isSameLocalDay, expandCalendarEntries, getCalendarTranslator, getLinkableCalendarEvents, buildCalendarTimedPreview, normalizeCalendarTimeZone, getServerTimeLabel, CALENDAR_WEEKDAY_OPTIONS, CALENDAR_TIME_INPUT_MODES, formatCalendarDateButtonLabel, getCalendarWeekdayLabel, normalizeCalendarRecurrence }} CalendarTimePickerModal={CalendarTimePickerModal} CalendarDatePickerModal={CalendarDatePickerModal} /> : null}
            {activeTab === "events" ? <EventsHubScreen styles={styles} selection={eventsSelection} onSelectDesertStorm={() => setEventsSelection("desertStorm")} onSelectZombieSiege={() => setEventsSelection("zombieSiege")} onBack={() => setEventsSelection("")} desertStormTitle={activeDesertStormEvent?.title || ""} zombieSiegeTitle={selectedZombieSiegeEvent?.title || zombieSiegeEvents[0]?.title || ""}>
              {eventsSelection === "desertStorm" ? <DesertStormScreen styles={styles} section={desertStormSection} onChangeSection={setDesertStormSection} currentUser={currentUser} currentUserIsLeader={leader} events={desertStormEvents} archivedEvents={archivedDesertStormEvents} selectedEvent={selectedDesertStormEvent} selectedEventId={selectedDesertStormEventId} onSelectEvent={setSelectedDesertStormEventId} taskForce={selectedTaskForce} draftTaskForces={desertStormLeaderTaskForces} visibleTaskForces={desertStormVisibleTaskForces} moveSource={desertStormMoveSource} onSelectMoveSource={setDesertStormMoveSource} onMovePlayer={handleDesertStormMove} onPickPlayer={(context) => {
                if (!leader || !selectedDesertStormEvent || selectedDesertStormEvent.status === "completed" || selectedDesertStormEvent.status === "archived") return;
                setPlayerModal({ ...context, eventId: selectedDesertStormEvent.id });
                setPlayerPickerMode("voted");
                setSearchText("");
              }} onCreateEvent={handleCreateDesertStormEvent} newEventTitle={newDesertStormEventTitle} onChangeNewEventTitle={setNewDesertStormEventTitle} canCreateEvent={!desertStormEvents.length} onSubmitVote={handleDesertStormVote} onOpenVote={(eventId) => handleDesertStormVoteState(eventId, "open")} onCloseVote={(eventId) => handleDesertStormVoteState(eventId, "closed")} onReopenVote={(eventId) => handleDesertStormVoteState(eventId, "reopen")} onPublishTeams={handleDesertStormPublish} onEditTeams={handleDesertStormEdit} onEndEvent={handleDesertStormEnd} onArchiveEvent={handleDesertStormArchive} helpers={{ getDesertStormStatusLabel, getDesertStormVoteOptionLabel }} /> : null}
              {eventsSelection === "zombieSiege" ? <ZombieSiegeScreen styles={styles} events={zombieSiegeEvents} selectedEvent={selectedZombieSiegeEvent} selectedEventId={selectedZombieSiegeEventId} onSelectEvent={setSelectedZombieSiegeEventId} currentUser={currentUser} currentUserIsLeader={leader} newTitle={newZombieSiegeTitle} newStartAt={newZombieSiegeStartAt} newEndAt={newZombieSiegeEndAt} newVoteClosesAt={newZombieSiegeVoteClosesAt} newThreshold={newZombieSiegeThreshold} onChangeNewTitle={setNewZombieSiegeTitle} onChangeNewStartAt={setNewZombieSiegeStartAt} onChangeNewEndAt={setNewZombieSiegeEndAt} onChangeNewVoteClosesAt={setNewZombieSiegeVoteClosesAt} onChangeNewThreshold={setNewZombieSiegeThreshold} onCreateEvent={() => run(async () => { const created = await createZombieSiegeEventRequest(session.backendUrl, session.token, { title: newZombieSiegeTitle, startAt: toIsoDateTime(newZombieSiegeStartAt), endAt: toIsoDateTime(newZombieSiegeEndAt), voteClosesAt: "", wave20Threshold: Number.parseFloat(newZombieSiegeThreshold) || 0 }); setSelectedZombieSiegeEventId(created.id); setNewZombieSiegeTitle(""); setNewZombieSiegeStartAt(formatLocalDateTimeInput(new Date())); setNewZombieSiegeEndAt(formatLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000))); setNewZombieSiegeVoteClosesAt(formatLocalDateTimeInput(new Date())); setNewZombieSiegeThreshold(""); await refresh(); })} onSubmitAvailability={(eventId, status) => run(async () => { await submitZombieSiegeAvailabilityRequest(session.backendUrl, session.token, eventId, status); await refresh(); })} onRunPlan={(eventId) => run(async () => { await runZombieSiegePlanRequest(session.backendUrl, session.token, eventId); await refresh(); })} onPublishPlan={(eventId) => run(async () => { await publishZombieSiegePlanRequest(session.backendUrl, session.token, eventId); await refresh(); })} onDiscardDraft={(eventId) => run(async () => { await discardZombieSiegeDraftRequest(session.backendUrl, session.token, eventId); await refresh(); })} onSaveWaveOneReview={(eventId, reviews) => run(async () => { await updateZombieSiegeWaveOneReviewRequest(session.backendUrl, session.token, eventId, reviews); await refresh(); })} onEndEvent={(eventId) => run(async () => { await endZombieSiegeEventRequest(session.backendUrl, session.token, eventId); await refresh(); })} /> : null}
            </EventsHubScreen> : null}
            {activeTab === "reminders" ? <RemindersScreen styles={styles} reminders={reminders} language={language} onCreateReminder={handleCreateReminder} onCancelReminder={handleCancelReminder} onDeleteReminder={handleDeleteReminder} helpers={{ formatReminderDuration, formatReminderCountdown }} ReminderDurationPickerModal={ReminderDurationPickerModal} CalendarDatePickerModal={CalendarDatePickerModal} CalendarTimePickerModal={CalendarTimePickerModal} /> : null}
            {activeTab === "more" ? <MoreScreen styles={styles} selection={moreSelection} currentUserIsLeader={leader} joinRequests={joinRequests} onSelectLeaderControls={() => setMoreSelection("leaderControls")} onSelectMembers={() => setMoreSelection("members")} onSelectSettings={() => setMoreSelection("settings")} onSelectFeedback={() => setMoreSelection("feedback")} onBack={() => setMoreSelection("")}>
              {moreSelection === "leaderControls" && leader ? <LeaderControlsScreen styles={styles} alliance={alliance} pushMessage={leaderBroadcastMessage} onChangePushMessage={setLeaderBroadcastMessage} onSendBroadcastPush={handleSendAllianceBroadcastPush} sending={loading} currentUserHasPushToken={Boolean(currentUser?.hasExpoPushToken)} /> : null}
              {moreSelection === "members" && leader ? <MembersScreen styles={styles} players={filteredMembers} memberSearchText={memberSearchText} memberSortMode={memberSortMode} memberRankFilter={memberRankFilter} onChangeMemberSearchText={setMemberSearchText} onChangeMemberSortMode={setMemberSortMode} onChangeMemberRankFilter={setMemberRankFilter} currentUser={currentUser} currentUserIsLeader={leader} onChangeField={saveMember} onRemovePlayer={(playerId) => run(async () => { await removeMember(session.backendUrl, session.token, playerId); await refresh(); })} RankSelector={RankSelector} rankOptions={RANK_OPTIONS} /> : null}
              {moreSelection === "settings" ? <SettingsScreen styles={styles} alliance={alliance} account={account} currentUser={currentUser} currentUserIsLeader={leader} joinRequests={joinRequests} newMemberName={newMemberName} newMemberRank={newMemberRank} newMemberPower={newMemberPower} newAllianceCode={newAllianceCode} onChangeNewMemberName={setNewMemberName} onChangeNewMemberRank={setNewMemberRank} onChangeNewMemberPower={setNewMemberPower} onChangeNewAllianceCode={setNewAllianceCode} onAddMember={() => run(async () => { await addMember(session.backendUrl, session.token, { name: newMemberName, rank: newMemberRank, overallPower: Number.parseFloat(newMemberPower) || 0 }); setNewMemberName(""); setNewMemberRank("R1"); setNewMemberPower(""); await refresh(); })} onApproveJoinRequest={(requestId) => run(async () => { await approveJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onRejectJoinRequest={(requestId) => run(async () => { await rejectJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onLeaveAlliance={() => run(async () => { const departingPlayerId = currentUser?.id; const result = await leaveAlliance(session.backendUrl, session.token); if (departingPlayerId) { await clearCalendarNotificationsForMember(departingPlayerId).catch(() => {}); } setAccount(result.account); setAlliance(null); setCurrentUser(null); setJoinRequest(null); setJoinRequests([]); setSetupMode("join"); setAlliancePreview(null); setNewAllianceCode(""); setActiveTab("home"); setMoreSelection(""); })} onRotateAllianceCode={() => run(async () => { await updateAllianceCode(session.backendUrl, session.token, newAllianceCode); await refresh(); })} onSignOut={signOut} t={t} language={language} onChangeLanguage={changeLanguage} showPushNotificationControls={Platform.OS !== "android"} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
                const enabled = await syncPushNotifications({ requestPermission: true });
                if (!enabled) {
                  Alert.alert("Enable notifications", "Push notifications were not enabled. You can try again later on this screen.");
                }
              })} LanguageSelector={LanguageSelector} RankSelector={RankSelector} powerInputHint={POWER_INPUT_HINT} /> : null}
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
        <KeyboardAvoidingView style={styles.modalKeyboardShell} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
          <SectionHeader eyebrow="Assignment" title={t("choosePlayer")} detail="Choose from voted members or the full alliance without leaving the Desert Storm workflow." />
          {playerModal ? <View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, playerPickerMode === "voted" && styles.modeButtonActive]} onPress={() => setPlayerPickerMode("voted")}><Text style={[styles.secondaryButtonText, playerPickerMode === "voted" && styles.modeButtonTextActive]}>{t("votedMembers")}</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, playerPickerMode === "all" && styles.modeButtonActive]} onPress={() => setPlayerPickerMode("all")}><Text style={[styles.secondaryButtonText, playerPickerMode === "all" && styles.modeButtonTextActive]}>{t("entireAlliance")}</Text></Pressable></View> : null}
          {playerModal && selectedDesertStormEvent?.vote && playerPickerMode === "voted" ? <Text style={styles.hint}>{playerModal.memberType === "Sub" ? `Showing members who voted "Sub" for ${selectedDesertStormEvent.title}.` : `Showing members who voted "Play" for ${selectedDesertStormEvent.title}.`}</Text> : null}
          {playerModal && playerPickerMode === "all" ? <Text style={styles.hint}>{t("showingAllAlliance")}</Text> : null}
          <TextInput value={searchText} onChangeText={setSearchText} style={styles.input} placeholder={t("searchNameOrRank")} />
          <ScrollView style={styles.modalListScroll} contentContainerStyle={styles.modalListContent} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
            <Pressable style={styles.pick} onPress={() => run(async () => {
              await updateDesertStormEventSlotRequest(session.backendUrl, session.token, playerModal.eventId, { taskForceKey: playerModal.taskForceKey, squadId: playerModal.squadId, slotId: playerModal.slotId, playerName: "" });
              setPlayerModal(null);
              await refresh();
            })}><Text style={styles.pickText}>{t("clearSelection")}</Text></Pressable>
            {filteredOptions.map((player) => <Pressable key={player.id} style={styles.pick} onPress={() => run(async () => {
              await updateDesertStormEventSlotRequest(session.backendUrl, session.token, playerModal.eventId, { taskForceKey: playerModal.taskForceKey, squadId: playerModal.squadId, slotId: playerModal.slotId, playerName: player.name });
              setPlayerModal(null);
              await refresh();
            })}><Text style={styles.pickText}>{player.name} - {player.rank} - {player.overallPower.toFixed(2)}M</Text></Pressable>)}
            {!filteredOptions.length ? <Text style={styles.hint}>{playerPickerMode === "voted" && selectedDesertStormEvent?.vote ? t("noMembersMatchVoteFilter") : t("noPlayersMatchSearch")}</Text> : null}
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
  quickActionGrid: { gap: 10 },
  quickActionCard: { gap: 6 },
  quickActionTitle: { color: DESIGN_TOKENS.colors.text, fontSize: 18, fontWeight: "800" },
  quickActionDetail: { color: DESIGN_TOKENS.colors.textSoft, fontSize: 14, lineHeight: 19 },
  desertStormTaskForceCard: { gap: 12 },
  desertStormSlotCard: { gap: 10 },
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
  membersRosterList: { gap: 10 },
  memberCard: { gap: 12 },
  memberCardSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  memberSummaryText: { flex: 1, gap: 4 },
  memberSummaryRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberExpandIcon: { fontSize: 24, fontWeight: "700", color: DESIGN_TOKENS.colors.textMuted, width: 22, textAlign: "center" },
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
  memberSection: { gap: 10 },
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






























