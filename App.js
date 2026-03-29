import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { AppCard as SharedAppCard, BottomSheetModal as SharedBottomSheetModal, ListRow as SharedListRow, PrimaryButton as SharedPrimaryButton, ScreenContainer as SharedScreenContainer, SectionHeader as SharedSectionHeader, SecondaryButton as SharedSecondaryButton, StatusBadge as SharedStatusBadge } from "./src/components/ui/primitives";
import { CalendarDatePickerModal as SharedCalendarDatePickerModal, CalendarTimePickerModal as SharedCalendarTimePickerModal, ReminderDurationPickerModal as SharedReminderDurationPickerModal } from "./src/components/Pickers";
import { LanguageSelector as SharedLanguageSelector, RankSelector as SharedRankSelector } from "./src/components/Selectors";
import { FeedbackScreen } from "./src/screens/FeedbackScreen";
import { CalendarScreen } from "./src/screens/CalendarScreen";
import { DesertStormScreen } from "./src/screens/DesertStormScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { MembersScreen } from "./src/screens/MembersScreen";
import { RemindersScreen } from "./src/screens/RemindersScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { ZombieSiegeScreen } from "./src/screens/ZombieSiegeScreen";
import { DESIGN_TOKENS } from "./src/theme/designSystem";
import { addFeedback as addFeedbackRequest, addFeedbackComment as addFeedbackCommentRequest, addMember, approveJoinRequest, archiveDesertStormEvent as archiveDesertStormEventRequest, beginDesertStormEditing as beginDesertStormEditingRequest, closeDesertStormVote as closeDesertStormVoteRequest, createAccount, createAlliance, createCalendarEntry as createCalendarEntryRequest, createDesertStormEvent as createDesertStormEventRequest, createReminder as createReminderRequest, createZombieSiegeEvent as createZombieSiegeEventRequest, deleteCalendarEntry as deleteCalendarEntryRequest, deleteReminder as deleteReminderRequest, discardZombieSiegeDraft as discardZombieSiegeDraftRequest, endDesertStormEvent as endDesertStormEventRequest, endZombieSiegeEvent as endZombieSiegeEventRequest, getAlliancePreview, getJoinRequests, getMe, getReminders as getRemindersRequest, joinAlliance, leaveAlliance, moveDesertStormEventPlayer as moveDesertStormEventPlayerRequest, normalizeBaseUrl, openDesertStormVote as openDesertStormVoteRequest, publishDesertStormEvent as publishDesertStormEventRequest, publishZombieSiegePlan as publishZombieSiegePlanRequest, registerExpoPushToken as registerExpoPushTokenRequest, rejectJoinRequest, removeMember, reopenDesertStormVote as reopenDesertStormVoteRequest, runZombieSiegePlan as runZombieSiegePlanRequest, signIn, submitDesertStormVote as submitDesertStormVoteRequest, submitZombieSiegeAvailability as submitZombieSiegeAvailabilityRequest, updateAllianceCode, updateCalendarEntry as updateCalendarEntryRequest, updateDesertStormEventSlot as updateDesertStormEventSlotRequest, updateMember, updateReminder as updateReminderRequest, updateZombieSiegeWaveOneReview as updateZombieSiegeWaveOneReviewRequest } from "./src/lib/api";
import { buildDashboard, buildTaskForceView, createPlayerOptions } from "./src/lib/roster";
import { buildReminderSchedule, formatReminderDateKey, formatReminderDateTimeDisplay, getReminderDeviceTimeZone, getReminderServerTimeLabel, getReminderServerTimeZone, isValidReminderDateKey, parseReminderTimeValue } from "./src/lib/reminders";
import { CALENDAR_SERVER_TIME_LABEL, CALENDAR_TIME_INPUT_MODES, CALENDAR_WEEKDAY_OPTIONS, CALENDAR_WHEEL_ITEM_HEIGHT, addLocalDays, buildCalendarTimedPreview, buildDesertStormCalendarLinkSeed, buildZombieSiegeCalendarLinkSeed, expandCalendarEntries, findCurrentDesertStormEvent, formatCalendarDateButtonLabel, formatLocalDateKey, formatLocalDateTimeInput, getAssignedPlayerNames, getDeviceTimeZone, getLinkableCalendarEvents, getServerTimeLabel, getTimeValueMinutes, isSameLocalDay, normalizeCalendarRecurrence, normalizeCalendarTimeZone, parseLocalDateKey, parseTimeValue, resolveCalendarLinkedEventId, startOfLocalDay, toIsoDateTime, toUtcIsoFromTimeZone } from "./src/lib/calendarHelpers";
import { getDesertStormStatusLabel, getDesertStormVoteOptionLabel } from "./src/lib/desertStormHelpers";
import { formatReminderCountdown, formatReminderDuration } from "./src/lib/uiFormatters";

const DEFAULT_BACKEND_URL = "https://pakx-production.up.railway.app";
const SESSION_STORAGE_KEY = "lwadmin-session";
const LANGUAGE_STORAGE_KEY = "lwadmin-language";
const PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY = "lwadmin-push-notifications-prompt-dismissed";
const ALL_TABS = ["myInfo", "desertStorm", "players", "calendar", "reminders", "zombieSiege", "alliance", "feedback"];
const emptyTaskForces = () => ({ taskForceA: { key: "taskForceA", label: "Task Force A", squads: [] }, taskForceB: { key: "taskForceB", label: "Task Force B", squads: [] } });
const isLeader = (rank) => rank === "R5" || rank === "R4";
const APP_VERSION = Application.nativeApplicationVersion || Constants.expoConfig?.version || "0.1.0";
const APP_BUILD = Application.nativeBuildVersion || Constants.nativeBuildVersion || (Platform.OS === "ios" ? String(Constants.expoConfig?.ios?.buildNumber || "") : String(Constants.expoConfig?.android?.versionCode || ""));
const RANK_OPTIONS = ["R5", "R4", "R3", "R2", "R1"];
const POWER_INPUT_HINT = "Please enter power value in millions. Ex. 12,700,000 = 12.7";
const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const CALENDAR_TRANSLATIONS = {
  en: { title: "Alliance Calendar", hint: "Tap a day to see what is scheduled and what needs attention.", today: "Today", week: "Week", month: "Month", selectedDay: "Selected Day", noEventsScheduled: "No events scheduled", oneEventScheduled: "1 event scheduled", manyEventsScheduled: "{count} events scheduled", allDay: "All day", leaderOnly: "Leader Only", edit: "Edit", delete: "Delete", anchoredTo: "Anchored to {value}", linkedDesertStorm: "Linked to Desert Storm", linkedZombieSiege: "Linked to Zombie Siege", addedBy: "Added by {name}", nothingToday: "Nothing is scheduled for today.", tapAnotherDay: "Tap another day to review what is planned.", editEntry: "Edit Calendar Entry", addEntry: "Add Calendar Entry", manualEvent: "Manual Event", reminder: "Reminder", linkDesertStorm: "Link Desert Storm", linkZombieSiege: "Link Zombie Siege", eventTitle: "Event title", startDate: "Start Date", endDate: "End Date", chooseDate: "Choose Date", allDayEntry: "All-day entry", timeSpecificEntry: "Time-specific entry", startTime: "Start Time", endTime: "End Time", eventTimezone: "Event timezone (IANA, ex. America/Chicago)", chooseLinkedEvent: "Choose the linked event", repeat: "Repeat", noRepeat: "No Repeat", daily: "Daily", everyOtherDay: "Every Other Day", weekly: "Weekly", customWeekdays: "Custom Weekdays", repeatEndDate: "Repeat End Date", setRepeatEndDate: "Set Repeat End Date", clearRepeatEndDate: "Clear End Date", reminderPlaceholder: "What should members remember to do?", manualPlaceholder: "What should members know or do?", leaderNotes: "Leader-only notes", timezoneHint: "Timed entries are anchored to {value} and shown in each member's local time.", visibleToEveryone: "Visible To Everyone", leaderOnlyEntry: "Leader Only Entry", saveChanges: "Save Changes", addToCalendar: "Add To Calendar", cancelEditing: "Cancel Editing", repeatsDaily: "Repeats daily", repeatsEveryOtherDay: "Repeats every other day", repeatsWeekly: "Repeats weekly", repeatsWeekdays: "Repeats {value}", inputMode: "Enter Time As", inputModeHint: "Choose whether you are entering the time in server time or your own local time.", serverInputMode: "Server Time (UTC-2)", localInputMode: "My Local Time", timePreview: "Before You Save", previewEnteredAs: "Entered as {value}", serverTime: "Server Time", localTime: "My Local Time", memberLocalTime: "Your Local Time", recurringServerAnchor: "Recurring timed entries will follow Server Time (UTC-2).", pickStartTime: "Select Start Time", pickEndTime: "Select End Time", pickDate: "Select Date", chooseMonth: "Month", chooseDay: "Day", chooseYear: "Year", chooseHour: "Hour", chooseMinute: "Minute", done: "Done", dateRequiredError: "Choose a start date before saving.", endDateRequiredError: "Choose an end date before saving.", repeatEndDateError: "Choose a valid repeat end date or clear it.", startTimeRequiredError: "Choose a start time before saving.", endTimeRequiredError: "Choose an end time before saving.", endTimeInvalidError: "End time must be after start time" },
  ko: { title: "얼라이언스 캘린더", hint: "날짜를 눌러 일정과 해야 할 일을 확인하세요.", today: "오늘", week: "주간", month: "월간", selectedDay: "선택한 날짜", noEventsScheduled: "예정된 일정이 없습니다", oneEventScheduled: "일정 1개", manyEventsScheduled: "일정 {count}개", allDay: "하루 종일", leaderOnly: "리더 전용", edit: "수정", delete: "삭제", anchoredTo: "{value} 기준", linkedDesertStorm: "데저트 스톰과 연결됨", linkedZombieSiege: "좀비 시즈와 연결됨", addedBy: "{name} 님이 추가", nothingToday: "오늘 예정된 일정이 없습니다.", tapAnotherDay: "다른 날짜를 눌러 계획을 확인하세요.", editEntry: "캘린더 항목 수정", addEntry: "캘린더 항목 추가", manualEvent: "수동 일정", reminder: "리마인더", linkDesertStorm: "데저트 스톰 연결", linkZombieSiege: "좀비 시즈 연결", eventTitle: "이벤트 제목", allDayEntry: "하루 종일 일정", timeSpecificEntry: "시간 지정 일정", startTime: "시작 HH:MM", endTime: "종료 HH:MM", eventTimezone: "이벤트 시간대 (IANA, 예: America/Chicago)", chooseLinkedEvent: "연결할 이벤트 선택", repeat: "반복", noRepeat: "반복 없음", daily: "매일", everyOtherDay: "격일", weekly: "매주", customWeekdays: "요일 지정", repeatEndDate: "반복 종료일 (선택 YYYY-MM-DD)", reminderPlaceholder: "멤버들이 무엇을 기억해야 하나요?", manualPlaceholder: "멤버들에게 무엇을 알려야 하나요?", leaderNotes: "리더 전용 메모", timezoneHint: "시간 지정 일정은 {value} 기준이며, 각 멤버의 현지 시간으로 표시됩니다.", visibleToEveryone: "전체 공개", leaderOnlyEntry: "리더 전용 일정", saveChanges: "변경 저장", addToCalendar: "캘린더에 추가", cancelEditing: "수정 취소", repeatsDaily: "매일 반복", repeatsEveryOtherDay: "격일 반복", repeatsWeekly: "매주 반복", repeatsWeekdays: "{value} 반복" },
  es: { title: "Calendario de la alianza", hint: "Toca un día para ver lo programado y lo que requiere atención.", today: "Hoy", week: "Semana", month: "Mes", selectedDay: "Día seleccionado", noEventsScheduled: "No hay eventos programados", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Todo el día", leaderOnly: "Solo líderes", edit: "Editar", delete: "Eliminar", anchoredTo: "Anclado a {value}", linkedDesertStorm: "Vinculado a Desert Storm", linkedZombieSiege: "Vinculado a Zombie Siege", addedBy: "Agregado por {name}", nothingToday: "No hay nada programado para hoy.", tapAnotherDay: "Toca otro día para revisar lo planeado.", editEntry: "Editar entrada del calendario", addEntry: "Agregar entrada al calendario", manualEvent: "Evento manual", reminder: "Recordatorio", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "Título del evento", allDayEntry: "Evento de todo el día", timeSpecificEntry: "Evento con hora", startTime: "Inicio HH:MM", endTime: "Fin HH:MM", eventTimezone: "Zona horaria del evento (IANA, ej. America/Chicago)", chooseLinkedEvent: "Elige el evento vinculado", repeat: "Repetir", noRepeat: "No repetir", daily: "Diario", everyOtherDay: "Cada dos días", weekly: "Semanal", customWeekdays: "Días personalizados", repeatEndDate: "Fecha de fin de repetición (opcional YYYY-MM-DD)", reminderPlaceholder: "¿Qué deben recordar hacer los miembros?", manualPlaceholder: "¿Qué deben saber o hacer los miembros?", leaderNotes: "Notas solo para líderes", timezoneHint: "Las entradas con hora se anclan a {value} y se muestran en la hora local de cada miembro.", visibleToEveryone: "Visible para todos", leaderOnlyEntry: "Entrada solo para líderes", saveChanges: "Guardar cambios", addToCalendar: "Agregar al calendario", cancelEditing: "Cancelar edición", repeatsDaily: "Se repite a diario", repeatsEveryOtherDay: "Se repite cada dos días", repeatsWeekly: "Se repite semanalmente", repeatsWeekdays: "Se repite {value}" },
  pt: { title: "Calendário da aliança", hint: "Toque em um dia para ver o que está programado e o que precisa de atenção.", today: "Hoje", week: "Semana", month: "Mês", selectedDay: "Dia selecionado", noEventsScheduled: "Nenhum evento programado", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Dia inteiro", leaderOnly: "Somente líderes", edit: "Editar", delete: "Excluir", anchoredTo: "Ancorado em {value}", linkedDesertStorm: "Vinculado ao Desert Storm", linkedZombieSiege: "Vinculado ao Zombie Siege", addedBy: "Adicionado por {name}", nothingToday: "Nada está programado para hoje.", tapAnotherDay: "Toque em outro dia para revisar o planejamento.", editEntry: "Editar entrada do calendário", addEntry: "Adicionar entrada ao calendário", manualEvent: "Evento manual", reminder: "Lembrete", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "Título do evento", allDayEntry: "Evento de dia inteiro", timeSpecificEntry: "Evento com horário", startTime: "Início HH:MM", endTime: "Fim HH:MM", eventTimezone: "Fuso do evento (IANA, ex. America/Chicago)", chooseLinkedEvent: "Escolha o evento vinculado", repeat: "Repetir", noRepeat: "Não repetir", daily: "Diariamente", everyOtherDay: "Dia sim, dia não", weekly: "Semanal", customWeekdays: "Dias personalizados", repeatEndDate: "Data final da repetição (opcional YYYY-MM-DD)", reminderPlaceholder: "O que os membros precisam lembrar de fazer?", manualPlaceholder: "O que os membros precisam saber ou fazer?", leaderNotes: "Notas apenas para líderes", timezoneHint: "Entradas com horário são ancoradas em {value} e mostradas no horário local de cada membro.", visibleToEveryone: "Visível para todos", leaderOnlyEntry: "Entrada só para líderes", saveChanges: "Salvar alterações", addToCalendar: "Adicionar ao calendário", cancelEditing: "Cancelar edição", repeatsDaily: "Repete diariamente", repeatsEveryOtherDay: "Repete em dias alternados", repeatsWeekly: "Repete semanalmente", repeatsWeekdays: "Repete {value}" }
};
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "???" },
  { code: "es", label: "Espa�ol" },
  { code: "pt", label: "Portugu�s" }
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
    feedbackFrom: "From {name} • {date}",
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
    appTitle: "PAKX 얼라이언스 앱",
    authSignIn: "로그인",
    authCreateAccount: "계정 만들기",
    username: "사용자 이름",
    password: "비밀번호",
    welcome: "{name}님, 환영합니다",
    notInAlliance: "이 계정은 아직 얼라이언스에 연결되어 있지 않습니다.",
    joinAlliance: "얼라이언스 가입",
    createAlliance: "얼라이언스 생성",
    allianceName: "얼라이언스 이름",
    allianceCode: "얼라이언스 코드",
    previewAlliance: "얼라이언스 미리보기",
    foundAlliance: "찾음: {name}",
    signOut: "로그아웃",
    joinRequestPending: "가입 요청 대기 중",
    pendingApproval: "R4 또는 R5의 승인을 기다리고 있습니다.",
    refreshStatus: "상태 새로고침",
    language: "언어",
    signedInAs: "{name} ({rank})로 로그인됨",
    playersWaiting: "{count}명의 플레이어가 승인 대기 중입니다",
    onePlayerWaiting: "1명의 플레이어가 승인 대기 중입니다",
    tapReviewRequests: "얼라이언스 탭에서 가입 요청을 확인하세요.",
    restoringSession: "세션을 복원하는 중...",
    sessionExpired: "세션이 만료되었습니다. 다시 로그인해 주세요.",
    choosePlayer: "플레이어 선택",
    votedMembers: "투표한 멤버",
    entireAlliance: "전체 얼라이언스",
    showingAllAlliance: "이 슬롯에 대해 얼라이언스 전체 멤버를 표시합니다.",
    searchNameOrRank: "이름 또는 등급 검색",
    clearSelection: "선택 해제",
    noPlayersMatchSearch: "검색과 일치하는 플레이어가 없습니다.",
    noMembersMatchVoteFilter: "디저트 스톰 투표 조건에 맞는 멤버가 없습니다.",
    tabMyInfo: "내 정보",
    tabMembers: "멤버",
    tabAlliance: "설정",
    tabTaskForceA: "태스크포스 A",
    tabTaskForceB: "태스크포스 B",
    tabDSHistory: "DS 기록",
    tabFeedback: "피드백",
    tabDashboard: "대시보드",
    feedbackTitle: "앱 피드백",
    feedbackHint: "앱에 대한 의견, 버그, 업데이트 제안을 남겨주세요.",
    feedbackExample: "예시:\n디저트 스톰 기록 탭에 전투력 합계도 표시되면 좋겠습니다.",
    submitFeedback: "피드백 보내기",
    allianceFeedback: "얼라이언스 피드백",
    noFeedback: "아직 등록된 피드백이 없습니다.",
    feedbackFrom: "{name} • {date}",
    allianceTitle: "얼라이언스",
    accountLabel: "계정: {value}",
    allianceLabel: "얼라이언스: {value}",
    codeLabel: "코드: {value}",
    signedInAsPlayer: "로그인 플레이어: {value}",
    pendingJoinRequests: "대기 중인 가입 요청",
    noPendingRequests: "대기 중인 가입 요청이 없습니다.",
    requestedWithCode: "요청 코드: {code}",
    approve: "승인",
    reject: "거절",
    rotateCode: "코드 변경",
    updateCode: "코드 업데이트",
    addMember: "멤버 추가",
    name: "이름",
    rank: "등급",
    power: "전투력",
    memberOptions: "멤버 옵션",
    leaveAnyTime: "언제든지 얼라이언스를 떠날 수 있습니다.",
    leaveAlliance: "얼라이언스 탈퇴",
    leaveAllianceTitle: "얼라이언스 탈퇴",
    leaveAllianceConfirm: "정말 이 얼라이언스를 떠나시겠습니까?",
    cancel: "취소",
    leave: "탈퇴",
    signedInPlayer: "로그인한 플레이어",
    totalBasePower: "총 기본 전투력",
    totalSquadPower: "총 분대 전투력",
    desertStormTitle: "디저트 스톰",
    selectedForDesertStorm: "디저트 스톰에 선택됨",
    notCurrentlyAssigned: "현재 배정되지 않음",
    taskForceLabel: "태스크포스: {value}",
    squadLabel: "분대: {value}",
    slotLabel: "슬롯: {value}",
    notListedInTaskForces: "현재 Task Force A 또는 Task Force B에 배정되어 있지 않습니다.",
    desertStormRecord: "디저트 스톰 기록",
    lockInsPlayed: "디저트 스톰 {count}회 플레이",
    noLockedHistoryYet: "아직 잠긴 디저트 스톰 기록이 없습니다",
    appearancesWillShow: "리더가 디저트 스톰 배치를 잠그면 여기에 참여 기록이 표시됩니다.",
    basePowerSection: "기본 전투력",
    squadPowerBreakdown: "분대 전투력 세부",
    squadNumber: "{number} 분대",
    resultPending: "대기 중",
    resultWin: "승리",
    resultLoss: "패배"
  },
  es: {
    appTitle: "App de Alianza PAKX",
    authSignIn: "Iniciar sesión",
    authCreateAccount: "Crear cuenta",
    username: "Usuario",
    password: "Contraseña",
    welcome: "Bienvenido, {name}",
    notInAlliance: "Esta cuenta todavía no está asociada a una alianza.",
    joinAlliance: "Unirse a alianza",
    createAlliance: "Crear alianza",
    allianceName: "Nombre de la alianza",
    allianceCode: "Código de alianza",
    previewAlliance: "Ver alianza",
    foundAlliance: "Encontrada: {name}",
    signOut: "Cerrar sesión",
    joinRequestPending: "Solicitud de ingreso pendiente",
    pendingApproval: "Tu solicitud está esperando la aprobación de un R4 o R5.",
    refreshStatus: "Actualizar estado",
    language: "Idioma",
    signedInAs: "Sesión iniciada como {name} ({rank})",
    playersWaiting: "{count} jugadores esperan aprobación",
    onePlayerWaiting: "1 jugador espera aprobación",
    tapReviewRequests: "Toca para revisar solicitudes en la pestaña Alianza.",
    restoringSession: "Restaurando tu sesión...",
    sessionExpired: "Tu sesión expiró. Vuelve a iniciar sesión.",
    choosePlayer: "Elegir jugador",
    votedMembers: "Miembros que votaron",
    entireAlliance: "Toda la alianza",
    showingAllAlliance: "Mostrando todos los miembros de la alianza para este puesto.",
    searchNameOrRank: "Buscar por nombre o rango",
    clearSelection: "Quitar selección",
    noPlayersMatchSearch: "No hay jugadores que coincidan con la búsqueda.",
    noMembersMatchVoteFilter: "No hay miembros que coincidan con ese filtro de voto de Desert Storm.",
    tabMyInfo: "Mi información",
    tabMembers: "Miembros",
    tabAlliance: "Configuracion",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "Historial DS",
    tabFeedback: "Comentarios",
    tabDashboard: "Panel",
    feedbackTitle: "Comentarios de la app",
    feedbackHint: "Comparte comentarios, errores y mejoras recomendadas con la alianza.",
    feedbackExample: "Ejemplo:\nCreo que el historial de Desert Storm debería mostrar también el poder total.",
    submitFeedback: "Enviar comentario",
    allianceFeedback: "Comentarios de la alianza",
    noFeedback: "Todavía no hay comentarios.",
    feedbackFrom: "De {name} • {date}",
    allianceTitle: "Alianza",
    accountLabel: "Cuenta: {value}",
    allianceLabel: "Alianza: {value}",
    codeLabel: "Código: {value}",
    signedInAsPlayer: "Sesión iniciada como: {value}",
    pendingJoinRequests: "Solicitudes pendientes",
    noPendingRequests: "No hay solicitudes pendientes.",
    requestedWithCode: "Solicitó con el código {code}",
    approve: "Aprobar",
    reject: "Rechazar",
    rotateCode: "Cambiar código",
    updateCode: "Actualizar código",
    addMember: "Agregar miembro",
    name: "Nombre",
    rank: "Rango",
    power: "Poder",
    memberOptions: "Opciones de miembro",
    leaveAnyTime: "Puedes salir de esta alianza en cualquier momento.",
    leaveAlliance: "Salir de la alianza",
    leaveAllianceTitle: "Salir de la alianza",
    leaveAllianceConfirm: "¿Seguro que quieres salir de esta alianza?",
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
    noLockedHistoryYet: "Todavía no hay historial bloqueado de Desert Storm",
    appearancesWillShow: "Cuando los líderes bloqueen una alineación de Desert Storm, tus apariciones se mostrarán aquí.",
    basePowerSection: "Poder Base",
    squadPowerBreakdown: "Desglose de poder por escuadra",
    squadNumber: "Escuadra {number}",
    resultPending: "Pendiente",
    resultWin: "Victoria",
    resultLoss: "Derrota"
  },
  pt: {
    appTitle: "App da Aliança PAKX",
    authSignIn: "Entrar",
    authCreateAccount: "Criar conta",
    username: "Usuário",
    password: "Senha",
    welcome: "Bem-vindo, {name}",
    notInAlliance: "Esta conta ainda não está associada a uma aliança.",
    joinAlliance: "Entrar na aliança",
    createAlliance: "Criar aliança",
    allianceName: "Nome da aliança",
    allianceCode: "Código da aliança",
    previewAlliance: "Ver aliança",
    foundAlliance: "Encontrada: {name}",
    signOut: "Sair",
    joinRequestPending: "Pedido de entrada pendente",
    pendingApproval: "Seu pedido está aguardando aprovação de um R4 ou R5.",
    refreshStatus: "Atualizar status",
    language: "Idioma",
    signedInAs: "Conectado como {name} ({rank})",
    playersWaiting: "{count} jogadores aguardando aprovação",
    onePlayerWaiting: "1 jogador aguardando aprovação",
    tapReviewRequests: "Toque para revisar pedidos na aba Aliança.",
    restoringSession: "Restaurando sua sessão...",
    sessionExpired: "Sua sessão expirou. Entre novamente.",
    choosePlayer: "Escolher jogador",
    votedMembers: "Membros que votaram",
    entireAlliance: "Aliança inteira",
    showingAllAlliance: "Mostrando todos os membros da aliança para esta vaga.",
    searchNameOrRank: "Buscar por nome ou patente",
    clearSelection: "Limpar seleção",
    noPlayersMatchSearch: "Nenhum jogador corresponde à busca.",
    noMembersMatchVoteFilter: "Nenhum membro corresponde a esse filtro de voto do Desert Storm.",
    tabMyInfo: "Minhas informações",
    tabMembers: "Membros",
    tabAlliance: "Configuracoes",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "Histórico DS",
    tabFeedback: "Feedback",
    tabDashboard: "Painel",
    feedbackTitle: "Feedback do app",
    feedbackHint: "Compartilhe comentários, bugs e melhorias sugeridas com a aliança.",
    feedbackExample: "Exemplo:\nAcho que o histórico do Desert Storm deveria mostrar também o poder total.",
    submitFeedback: "Enviar feedback",
    allianceFeedback: "Feedback da aliança",
    noFeedback: "Nenhum feedback foi enviado ainda.",
    feedbackFrom: "De {name} • {date}",
    allianceTitle: "Aliança",
    accountLabel: "Conta: {value}",
    allianceLabel: "Aliança: {value}",
    codeLabel: "Código: {value}",
    signedInAsPlayer: "Conectado como: {value}",
    pendingJoinRequests: "Pedidos pendentes",
    noPendingRequests: "Não há pedidos pendentes.",
    requestedWithCode: "Solicitado com o código {code}",
    approve: "Aprovar",
    reject: "Rejeitar",
    rotateCode: "Alterar código",
    updateCode: "Atualizar código",
    addMember: "Adicionar membro",
    name: "Nome",
    rank: "Patente",
    power: "Poder",
    memberOptions: "Opções do membro",
    leaveAnyTime: "Você pode sair desta aliança a qualquer momento.",
    leaveAlliance: "Sair da aliança",
    leaveAllianceTitle: "Sair da aliança",
    leaveAllianceConfirm: "Tem certeza de que deseja sair desta aliança?",
    cancel: "Cancelar",
    leave: "Sair",
    signedInPlayer: "Jogador conectado",
    totalBasePower: "Poder Base Total",
    totalSquadPower: "Poder Total de Esquadrão",
    desertStormTitle: "Desert Storm",
    selectedForDesertStorm: "Selecionado para Desert Storm",
    notCurrentlyAssigned: "Não atribuído no momento",
    taskForceLabel: "Task Force: {value}",
    squadLabel: "Esquadrão: {value}",
    slotLabel: "Posição: {value}",
    notListedInTaskForces: "Você não está listado atualmente na Task Force A ou Task Force B.",
    desertStormRecord: "Histórico do Desert Storm",
    lockInsPlayed: "{count} Desert Storm jogados",
    noLockedHistoryYet: "Ainda não há histórico travado de Desert Storm",
    appearancesWillShow: "Quando os líderes travarem uma formação do Desert Storm, suas participações aparecerão aqui.",
    basePowerSection: "Poder Base",
    squadPowerBreakdown: "Detalhamento do poder dos esquadrões",
    squadNumber: "Esquadrão {number}",
    resultPending: "Pendente",
    resultWin: "Vitória",
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
  if (tab === "myInfo") return t("tabMyInfo");
  if (tab === "players") return t("tabMembers");
  if (tab === "alliance") return `${t("tabAlliance")}${leader && joinRequests.length ? ` (${joinRequests.length})` : ""}`;
  if (tab === "desertStorm") return "Desert Storm";
  if (tab === "calendar") return "Calendar";
  if (tab === "reminders") return t("tabReminders");
  if (tab === "zombieSiege") return "Zombie Siege";
  if (tab === "feedback") return t("tabFeedback");
  return t("tabDashboard");
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.bg },
  keyboardShell: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: DESIGN_TOKENS.spacing.sm, padding: DESIGN_TOKENS.spacing.xl },
  screen: { flex: 1, padding: DESIGN_TOKENS.spacing.md, gap: DESIGN_TOKENS.spacing.sm, backgroundColor: DESIGN_TOKENS.colors.bg },
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
  content: { flexGrow: 1, gap: 12, paddingBottom: 96 },
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






















