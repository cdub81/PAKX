import React, { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { addFeedback as addFeedbackRequest, addFeedbackComment as addFeedbackCommentRequest, addMember, approveJoinRequest, archiveDesertStormEvent as archiveDesertStormEventRequest, beginDesertStormEditing as beginDesertStormEditingRequest, closeDesertStormVote as closeDesertStormVoteRequest, createAccount, createAlliance, createCalendarEntry as createCalendarEntryRequest, createDesertStormEvent as createDesertStormEventRequest, createReminder as createReminderRequest, createZombieSiegeEvent as createZombieSiegeEventRequest, deleteCalendarEntry as deleteCalendarEntryRequest, deleteReminder as deleteReminderRequest, discardZombieSiegeDraft as discardZombieSiegeDraftRequest, endDesertStormEvent as endDesertStormEventRequest, endZombieSiegeEvent as endZombieSiegeEventRequest, getAlliancePreview, getJoinRequests, getMe, getReminders as getRemindersRequest, joinAlliance, leaveAlliance, moveDesertStormEventPlayer as moveDesertStormEventPlayerRequest, normalizeBaseUrl, openDesertStormVote as openDesertStormVoteRequest, publishDesertStormEvent as publishDesertStormEventRequest, publishZombieSiegePlan as publishZombieSiegePlanRequest, registerExpoPushToken as registerExpoPushTokenRequest, rejectJoinRequest, removeMember, reopenDesertStormVote as reopenDesertStormVoteRequest, runZombieSiegePlan as runZombieSiegePlanRequest, signIn, submitDesertStormVote as submitDesertStormVoteRequest, submitZombieSiegeAvailability as submitZombieSiegeAvailabilityRequest, updateAllianceCode, updateCalendarEntry as updateCalendarEntryRequest, updateDesertStormEventSlot as updateDesertStormEventSlotRequest, updateMember, updateReminder as updateReminderRequest, updateZombieSiegeWaveOneReview as updateZombieSiegeWaveOneReviewRequest } from "./src/lib/api";
import { buildDashboard, buildTaskForceView, createPlayerOptions } from "./src/lib/roster";
import { buildReminderSchedule, formatReminderDateKey, formatReminderDateTimeDisplay, getReminderDeviceTimeZone, getReminderServerTimeLabel, getReminderServerTimeZone, parseReminderTimeValue } from "./src/lib/reminders";

const DEFAULT_BACKEND_URL = "https://pakx-production.up.railway.app";
const SESSION_STORAGE_KEY = "lwadmin-session";
const LANGUAGE_STORAGE_KEY = "lwadmin-language";
const PUSH_NOTIFICATIONS_PROMPT_DISMISSED_KEY = "lwadmin-push-notifications-prompt-dismissed";
const CALENDAR_SERVER_TIME_ZONE = "Etc/GMT+2";
const CALENDAR_SERVER_TIME_LABEL = "UTC-2";
const ALL_TABS = ["myInfo", "desertStorm", "players", "calendar", "reminders", "zombieSiege", "alliance", "feedback"];
const emptyTaskForces = () => ({ taskForceA: { key: "taskForceA", label: "Task Force A", squads: [] }, taskForceB: { key: "taskForceB", label: "Task Force B", squads: [] } });
const isLeader = (rank) => rank === "R5" || rank === "R4";
const APP_VERSION = Application.nativeApplicationVersion || Constants.expoConfig?.version || "0.1.0";
const APP_BUILD = Application.nativeBuildVersion || Constants.nativeBuildVersion || (Platform.OS === "ios" ? String(Constants.expoConfig?.ios?.buildNumber || "") : String(Constants.expoConfig?.android?.versionCode || ""));
const RANK_OPTIONS = ["R5", "R4", "R3", "R2", "R1"];
const POWER_INPUT_HINT = "Please enter power value in millions. Ex. 12,700,000 = 12.7";
const REMINDER_NOTIFICATION_CHANNEL_ID = "reminders";
const CALENDAR_TIME_INPUT_MODES = [
  { id: "server", label: `Server Time (${CALENDAR_SERVER_TIME_LABEL})` },
  { id: "local", label: "My Local Time" }
];
const CALENDAR_WHEEL_ITEM_HEIGHT = 40;
const DESIGN_TOKENS = {
  colors: {
    bg: "#0b1116",
    bgElevated: "#111a22",
    surface: "#141f29",
    surfaceAlt: "#1a2631",
    surfaceSoft: "#1f2d39",
    border: "#273847",
    borderStrong: "#355064",
    text: "#eef5f7",
    textMuted: "#95a8b5",
    textSoft: "#b8c7d0",
    green: "#4fc38a",
    greenSoft: "#153426",
    yellow: "#e3bf57",
    yellowSoft: "#3a3116",
    blue: "#56a4e8",
    blueSoft: "#162d42",
    red: "#e36d6d",
    redSoft: "#3e1f24",
    purple: "#a783f2",
    purpleSoft: "#2d2147",
    overlay: "rgba(4, 10, 15, 0.76)"
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999
  },
  type: {
    title: 30,
    cardTitle: 22,
    sectionTitle: 16,
    body: 15,
    meta: 12
  }
};
const CALENDAR_TRANSLATIONS = {
  en: { title: "Alliance Calendar", hint: "Tap a day to see what is scheduled and what needs attention.", today: "Today", week: "Week", month: "Month", selectedDay: "Selected Day", noEventsScheduled: "No events scheduled", oneEventScheduled: "1 event scheduled", manyEventsScheduled: "{count} events scheduled", allDay: "All day", leaderOnly: "Leader Only", edit: "Edit", delete: "Delete", anchoredTo: "Anchored to {value}", linkedDesertStorm: "Linked to Desert Storm", linkedZombieSiege: "Linked to Zombie Siege", addedBy: "Added by {name}", nothingToday: "Nothing is scheduled for today.", tapAnotherDay: "Tap another day to review what is planned.", editEntry: "Edit Calendar Entry", addEntry: "Add Calendar Entry", manualEvent: "Manual Event", reminder: "Reminder", linkDesertStorm: "Link Desert Storm", linkZombieSiege: "Link Zombie Siege", eventTitle: "Event title", startDate: "Start Date", endDate: "End Date", chooseDate: "Choose Date", allDayEntry: "All-day entry", timeSpecificEntry: "Time-specific entry", startTime: "Start Time", endTime: "End Time", eventTimezone: "Event timezone (IANA, ex. America/Chicago)", chooseLinkedEvent: "Choose the linked event", repeat: "Repeat", noRepeat: "No Repeat", daily: "Daily", everyOtherDay: "Every Other Day", weekly: "Weekly", customWeekdays: "Custom Weekdays", repeatEndDate: "Repeat End Date", setRepeatEndDate: "Set Repeat End Date", clearRepeatEndDate: "Clear End Date", reminderPlaceholder: "What should members remember to do?", manualPlaceholder: "What should members know or do?", leaderNotes: "Leader-only notes", timezoneHint: "Timed entries are anchored to {value} and shown in each member's local time.", visibleToEveryone: "Visible To Everyone", leaderOnlyEntry: "Leader Only Entry", saveChanges: "Save Changes", addToCalendar: "Add To Calendar", cancelEditing: "Cancel Editing", repeatsDaily: "Repeats daily", repeatsEveryOtherDay: "Repeats every other day", repeatsWeekly: "Repeats weekly", repeatsWeekdays: "Repeats {value}", inputMode: "Enter Time As", inputModeHint: "Choose whether you are entering the time in server time or your own local time.", serverInputMode: "Server Time (UTC-2)", localInputMode: "My Local Time", timePreview: "Before You Save", previewEnteredAs: "Entered as {value}", serverTime: "Server Time", localTime: "My Local Time", memberLocalTime: "Your Local Time", recurringServerAnchor: "Recurring timed entries will follow Server Time (UTC-2).", pickStartTime: "Select Start Time", pickEndTime: "Select End Time", pickDate: "Select Date", chooseMonth: "Month", chooseDay: "Day", chooseYear: "Year", chooseHour: "Hour", chooseMinute: "Minute", done: "Done", dateRequiredError: "Choose a start date before saving.", endDateRequiredError: "Choose an end date before saving.", repeatEndDateError: "Choose a valid repeat end date or clear it.", startTimeRequiredError: "Choose a start time before saving.", endTimeRequiredError: "Choose an end time before saving.", endTimeInvalidError: "End time must be after start time" },
  ko: { title: "얼라이언스 캘린더", hint: "날짜를 눌러 일정과 해야 할 일을 확인하세요.", today: "오늘", week: "주간", month: "월간", selectedDay: "선택한 날짜", noEventsScheduled: "예정된 일정이 없습니다", oneEventScheduled: "일정 1개", manyEventsScheduled: "일정 {count}개", allDay: "하루 종일", leaderOnly: "리더 전용", edit: "수정", delete: "삭제", anchoredTo: "{value} 기준", linkedDesertStorm: "데저트 스톰과 연결됨", linkedZombieSiege: "좀비 시즈와 연결됨", addedBy: "{name} 님이 추가", nothingToday: "오늘 예정된 일정이 없습니다.", tapAnotherDay: "다른 날짜를 눌러 계획을 확인하세요.", editEntry: "캘린더 항목 수정", addEntry: "캘린더 항목 추가", manualEvent: "수동 일정", reminder: "리마인더", linkDesertStorm: "데저트 스톰 연결", linkZombieSiege: "좀비 시즈 연결", eventTitle: "이벤트 제목", allDayEntry: "하루 종일 일정", timeSpecificEntry: "시간 지정 일정", startTime: "시작 HH:MM", endTime: "종료 HH:MM", eventTimezone: "이벤트 시간대 (IANA, 예: America/Chicago)", chooseLinkedEvent: "연결할 이벤트 선택", repeat: "반복", noRepeat: "반복 없음", daily: "매일", everyOtherDay: "격일", weekly: "매주", customWeekdays: "요일 지정", repeatEndDate: "반복 종료일 (선택 YYYY-MM-DD)", reminderPlaceholder: "멤버들이 무엇을 기억해야 하나요?", manualPlaceholder: "멤버들에게 무엇을 알려야 하나요?", leaderNotes: "리더 전용 메모", timezoneHint: "시간 지정 일정은 {value} 기준이며, 각 멤버의 현지 시간으로 표시됩니다.", visibleToEveryone: "전체 공개", leaderOnlyEntry: "리더 전용 일정", saveChanges: "변경 저장", addToCalendar: "캘린더에 추가", cancelEditing: "수정 취소", repeatsDaily: "매일 반복", repeatsEveryOtherDay: "격일 반복", repeatsWeekly: "매주 반복", repeatsWeekdays: "{value} 반복" },
  es: { title: "Calendario de la alianza", hint: "Toca un día para ver lo programado y lo que requiere atención.", today: "Hoy", week: "Semana", month: "Mes", selectedDay: "Día seleccionado", noEventsScheduled: "No hay eventos programados", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Todo el día", leaderOnly: "Solo líderes", edit: "Editar", delete: "Eliminar", anchoredTo: "Anclado a {value}", linkedDesertStorm: "Vinculado a Desert Storm", linkedZombieSiege: "Vinculado a Zombie Siege", addedBy: "Agregado por {name}", nothingToday: "No hay nada programado para hoy.", tapAnotherDay: "Toca otro día para revisar lo planeado.", editEntry: "Editar entrada del calendario", addEntry: "Agregar entrada al calendario", manualEvent: "Evento manual", reminder: "Recordatorio", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "Título del evento", allDayEntry: "Evento de todo el día", timeSpecificEntry: "Evento con hora", startTime: "Inicio HH:MM", endTime: "Fin HH:MM", eventTimezone: "Zona horaria del evento (IANA, ej. America/Chicago)", chooseLinkedEvent: "Elige el evento vinculado", repeat: "Repetir", noRepeat: "No repetir", daily: "Diario", everyOtherDay: "Cada dos días", weekly: "Semanal", customWeekdays: "Días personalizados", repeatEndDate: "Fecha de fin de repetición (opcional YYYY-MM-DD)", reminderPlaceholder: "¿Qué deben recordar hacer los miembros?", manualPlaceholder: "¿Qué deben saber o hacer los miembros?", leaderNotes: "Notas solo para líderes", timezoneHint: "Las entradas con hora se anclan a {value} y se muestran en la hora local de cada miembro.", visibleToEveryone: "Visible para todos", leaderOnlyEntry: "Entrada solo para líderes", saveChanges: "Guardar cambios", addToCalendar: "Agregar al calendario", cancelEditing: "Cancelar edición", repeatsDaily: "Se repite a diario", repeatsEveryOtherDay: "Se repite cada dos días", repeatsWeekly: "Se repite semanalmente", repeatsWeekdays: "Se repite {value}" },
  pt: { title: "Calendário da aliança", hint: "Toque em um dia para ver o que está programado e o que precisa de atenção.", today: "Hoje", week: "Semana", month: "Mês", selectedDay: "Dia selecionado", noEventsScheduled: "Nenhum evento programado", oneEventScheduled: "1 evento programado", manyEventsScheduled: "{count} eventos programados", allDay: "Dia inteiro", leaderOnly: "Somente líderes", edit: "Editar", delete: "Excluir", anchoredTo: "Ancorado em {value}", linkedDesertStorm: "Vinculado ao Desert Storm", linkedZombieSiege: "Vinculado ao Zombie Siege", addedBy: "Adicionado por {name}", nothingToday: "Nada está programado para hoje.", tapAnotherDay: "Toque em outro dia para revisar o planejamento.", editEntry: "Editar entrada do calendário", addEntry: "Adicionar entrada ao calendário", manualEvent: "Evento manual", reminder: "Lembrete", linkDesertStorm: "Vincular Desert Storm", linkZombieSiege: "Vincular Zombie Siege", eventTitle: "Título do evento", allDayEntry: "Evento de dia inteiro", timeSpecificEntry: "Evento com horário", startTime: "Início HH:MM", endTime: "Fim HH:MM", eventTimezone: "Fuso do evento (IANA, ex. America/Chicago)", chooseLinkedEvent: "Escolha o evento vinculado", repeat: "Repetir", noRepeat: "Não repetir", daily: "Diariamente", everyOtherDay: "Dia sim, dia não", weekly: "Semanal", customWeekdays: "Dias personalizados", repeatEndDate: "Data final da repetição (opcional YYYY-MM-DD)", reminderPlaceholder: "O que os membros precisam lembrar de fazer?", manualPlaceholder: "O que os membros precisam saber ou fazer?", leaderNotes: "Notas apenas para líderes", timezoneHint: "Entradas com horário são ancoradas em {value} e mostradas no horário local de cada membro.", visibleToEveryone: "Visível para todos", leaderOnlyEntry: "Entrada só para líderes", saveChanges: "Salvar alterações", addToCalendar: "Adicionar ao calendário", cancelEditing: "Cancelar edição", repeatsDaily: "Repete diariamente", repeatsEveryOtherDay: "Repete em dias alternados", repeatsWeekly: "Repete semanalmente", repeatsWeekdays: "Repete {value}" }
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

function findAssignment(taskForces, playerName) {
  for (const tf of Object.values(taskForces || {})) for (const squad of tf.squads || []) for (const slot of squad.slots || []) if (slot.playerName === playerName) return { taskForceLabel: tf.label, squadLabel: squad.label, slotLabel: slot.label };
  return null;
}

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

function ScreenContainer({ children }) {
  return <SafeAreaView style={styles.safeArea}>
    <ExpoStatusBar style="light" />
    <StatusBar barStyle="light-content" />
    <KeyboardAvoidingView style={styles.keyboardShell} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
      {children}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function SectionHeader({ eyebrow, title, detail }) {
  return <View style={styles.sectionHeader}>
    {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.sectionHeaderTitle}>{title}</Text>
    {detail ? <Text style={styles.sectionHeaderDetail}>{detail}</Text> : null}
  </View>;
}

function AppCard({ children, variant = "default", style, onPress, disabled = false }) {
  const variantStyle = variant === "active"
    ? styles.cardActive
    : variant === "info"
      ? styles.cardInfo
      : variant === "warning"
        ? styles.cardWarning
        : variant === "danger"
          ? styles.cardDanger
          : variant === "purple"
            ? styles.cardPurple
            : styles.card;
  if (onPress) {
    return <Pressable disabled={disabled} onPress={onPress} style={[variantStyle, disabled && styles.disabled, style]}>{children}</Pressable>;
  }
  return <View style={[variantStyle, style]}>{children}</View>;
}

function StatusBadge({ label, tone = "neutral", style }) {
  const toneStyle = tone === "success"
    ? styles.statusBadgeSuccess
    : tone === "warning"
      ? styles.statusBadgeWarning
      : tone === "info"
        ? styles.statusBadgeInfo
        : tone === "danger"
          ? styles.statusBadgeDanger
          : tone === "purple"
            ? styles.statusBadgePurple
            : styles.statusBadgeNeutral;
  const textStyle = tone === "success"
    ? styles.statusBadgeTextSuccess
    : tone === "warning"
      ? styles.statusBadgeTextWarning
      : tone === "info"
        ? styles.statusBadgeTextInfo
        : tone === "danger"
          ? styles.statusBadgeTextDanger
          : tone === "purple"
            ? styles.statusBadgeTextPurple
            : styles.statusBadgeTextNeutral;
  return <View style={[styles.statusBadge, toneStyle, style]}>
    <Text style={[styles.statusBadgeText, textStyle]}>{label}</Text>
  </View>;
}

function PrimaryButton({ label, onPress, disabled = false, style, tone = "green" }) {
  const toneStyle = tone === "blue" ? styles.primaryButtonBlue : tone === "purple" ? styles.primaryButtonPurple : tone === "red" ? styles.primaryButtonRed : styles.primaryButton;
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.buttonBase, toneStyle, disabled && styles.disabledButton, style]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

function SecondaryButton({ label, onPress, disabled = false, style }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.buttonBase, styles.secondaryButton, disabled && styles.disabledButton, style]}>
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </Pressable>;
}

function ListRow({ title, detail, right, style }) {
  return <View style={[styles.listRow, style]}>
    <View style={styles.listRowContent}>
      <Text style={styles.listRowTitle}>{title}</Text>
      {detail ? <Text style={styles.listRowDetail}>{detail}</Text> : null}
    </View>
    {right ? <View style={styles.listRowRight}>{right}</View> : null}
  </View>;
}

function BottomSheetModal({ visible, onClose, children }) {
  if (!visible) {
    return null;
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.modalBackdrop}>
      <Pressable style={styles.modalBackdropDismissArea} onPress={onClose} />
      <SafeAreaView style={styles.modalSafeArea} pointerEvents="box-none">
        <View style={styles.modalSheetShell}>
          <View style={styles.modalHandle} />
          <View style={styles.modalCard}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

function getAssignedPlayerNames(taskForces, currentSelection) {
  const names = new Set();
  for (const taskForce of Object.values(taskForces || {})) {
    for (const squad of taskForce.squads || []) {
      for (const slot of squad.slots || []) {
        if (!slot.playerName) continue;
        if (currentSelection && taskForce.key === currentSelection.taskForceKey && squad.id === currentSelection.squadId && slot.id === currentSelection.slotId) continue;
        names.add(slot.playerName);
      }
    }
  }
  return names;
}

function findCurrentDesertStormEvent(events) {
  return (events || []).find((event) => event.status !== "archived") || null;
}

function getDesertStormVoteOptionLabel(optionId) {
  if (optionId === "play") return "Play";
  if (optionId === "sub") return "Sub";
  if (optionId === "cant_play") return "Can't Play";
  return optionId;
}

function getDesertStormStatusLabel(status) {
  if (status === "draft") return "Draft";
  if (status === "voting_open") return "Voting Open";
  if (status === "voting_closed") return "Voting Closed";
  if (status === "published") return "Published";
  if (status === "editing") return "Editing";
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return status;
}

function startOfLocalDay(value = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseLocalDateKey(value);
  }
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatLocalDateKey(value = new Date()) {
  const date = startOfLocalDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDateKey(value) {
  const [year, month, day] = String(value || "").split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) {
    return startOfLocalDay();
  }
  return new Date(year, month - 1, day);
}

function formatLocalDateTimeInput(value = new Date()) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value || "") : date.toISOString();
}

const CALENDAR_WEEKDAY_OPTIONS = [
  { code: "sun", label: "Sun", index: 0 },
  { code: "mon", label: "Mon", index: 1 },
  { code: "tue", label: "Tue", index: 2 },
  { code: "wed", label: "Wed", index: 3 },
  { code: "thu", label: "Thu", index: 4 },
  { code: "fri", label: "Fri", index: 5 },
  { code: "sat", label: "Sat", index: 6 }
];

const CALENDAR_TIME_ZONE_SUGGESTIONS = [
  "UTC",
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Asia/Seoul"
];
const MAX_CALENDAR_EXPANSION_DAYS = 120;

function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function normalizeCalendarTimeZone(value) {
  const timeZone = String(value || "").trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

function formatTwoDigits(value) {
  return String(Number.parseInt(String(value || "0"), 10) || 0).padStart(2, "0");
}

function formatTimeValueFromParts(hours, minutes) {
  return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}`;
}

function formatDateKeyFromParts(parts) {
  return `${String(parts.year).padStart(4, "0")}-${formatTwoDigits(parts.month)}-${formatTwoDigits(parts.day)}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
    return false;
  }
  const [year, month, day] = String(value).split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day || month < 1 || month > 12) {
    return false;
  }
  return day >= 1 && day <= getDaysInMonth(year, month);
}

function formatCalendarDateButtonLabel(dateKey, language) {
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

function getServerTimeZone() {
  return CALENDAR_SERVER_TIME_ZONE;
}

function getServerTimeLabel() {
  return CALENDAR_SERVER_TIME_LABEL;
}

function convertUtcIsoToTimeZoneDateAndTime(isoValue, timeZone) {
  const parts = getTimeZoneDateParts(isoValue, timeZone);
  return {
    dateKey: formatDateKeyFromParts(parts),
    timeValue: formatTimeValueFromParts(parts.hour, parts.minute)
  };
}

function buildCalendarTimedPreview(startDateKey, startTime, endDateKey, endTime, inputMode, localTimeZone) {
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

function getLinkableCalendarEvents(events) {
  return (events || []).filter((event) => event.status !== "archived");
}

function buildDesertStormCalendarLinkSeed(event) {
  return {
    entryType: "linked_desert_storm",
    linkedType: "desertStorm",
    linkedEventId: event?.id || ""
  };
}

function buildZombieSiegeCalendarLinkSeed(event) {
  return {
    entryType: "linked_zombie_siege",
    linkedType: "zombieSiege",
    linkedEventId: event?.id || ""
  };
}

function resolveCalendarLinkedEventId(entryType, selectedLinkedEventId, desertStormEvents, zombieSiegeEvents, activeDesertStormEvent, selectedZombieSiegeEvent) {
  if (entryType === "linked_desert_storm") {
    return selectedLinkedEventId || activeDesertStormEvent?.id || getLinkableCalendarEvents(desertStormEvents)[0]?.id || "";
  }
  if (entryType === "linked_zombie_siege") {
    return selectedLinkedEventId || selectedZombieSiegeEvent?.id || getLinkableCalendarEvents(zombieSiegeEvents)[0]?.id || "";
  }
  return "";
}

function addLocalDays(value, amount) {
  const date = startOfLocalDay(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function parseTimeValue(value) {
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

function getTimeValueMinutes(value) {
  const parsed = parseTimeValue(value);
  if (!parsed) {
    return null;
  }
  return parsed.hours * 60 + parsed.minutes;
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

function toUtcIsoFromTimeZone(dateKey, timeValue, timeZone, dayOffset = 0) {
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

function formatCalendarTimeLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function toggleWeekdaySelection(currentWeekdays, code) {
  const values = Array.isArray(currentWeekdays) ? currentWeekdays : [];
  return values.includes(code) ? values.filter((entry) => entry !== code) : [...values, code];
}

function normalizeCalendarRecurrence(entry) {
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

function clampCalendarWindowEndDateKey(startDateKey, endDateKey) {
  const startDate = parseLocalDateKey(startDateKey);
  const endDate = parseLocalDateKey(endDateKey);
  const maxEndDateKey = formatLocalDateKey(addLocalDays(startDate, MAX_CALENDAR_EXPANSION_DAYS));
  return formatLocalDateKey(endDate) > maxEndDateKey ? maxEndDateKey : formatLocalDateKey(endDate);
}

function buildCalendarOccurrence(entry, occurrenceDateKey) {
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

function expandCalendarEntries(entries, startDateKey, endDateKey) {
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
  const [activeTab, setActiveTab] = useState("myInfo");
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
  const tabs = leader ? ALL_TABS : ALL_TABS.filter((tab) => tab !== "players");
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
    setActiveTab("myInfo");
    setNewAllianceCode("");
    if (nextMessage) {
      setErrorMessage(nextMessage);
    }
  }

  function openDesertStormVoteArea(eventId = "") {
    setActiveTab("desertStorm");
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
      setActiveTab("desertStorm");
      setDesertStormSection("vote");
      if (entry.linkedEventId) {
        setSelectedDesertStormEventId(entry.linkedEventId);
      }
      return;
    }
    if (entry.linkedType === "zombieSiege") {
      setActiveTab("zombieSiege");
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
    if (!session.token || !session.backendUrl || !alliance || activeTab === "players") return undefined;
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
      } else if (data?.type === "reminder") {
        setActiveTab("reminders");
      }
    }).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      if (data?.type === "desertStormVote") {
        openDesertStormVoteArea(String(data.eventId || ""));
      } else if (data?.type === "reminder") {
        setActiveTab("reminders");
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
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
            channelId: REMINDER_NOTIFICATION_CHANNEL_ID
          }
        : fireDate
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
          <SectionHeader eyebrow="Alliance Command" title={alliance?.name} detail={t("signedInAs", { name: account?.displayName, rank: currentUser?.rank })} />
          {leader && joinRequests.length ? <AppCard variant="warning" onPress={() => setActiveTab("alliance")}><Text style={styles.alertBannerTitle}>{joinRequests.length === 1 ? t("onePlayerWaiting") : t("playersWaiting", { count: joinRequests.length })}</Text><Text style={styles.alertBannerText}>{t("tapReviewRequests")}</Text></AppCard> : null}
          {activeTab === "myInfo" && desertStormVoteNeedsResponse ? <AppCard variant="info" onPress={() => openDesertStormVoteArea()}><View style={styles.bannerHeader}><Text style={styles.voteBannerTitle}>Desert Storm vote is live - tap to respond</Text><StatusBadge label="Response Needed" tone="warning" /></View><Text style={styles.voteBannerText}>Open the Desert Storm tab to submit your vote.</Text></AppCard> : null}
          {loading ? <ActivityIndicator color={DESIGN_TOKENS.colors.green} /> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {tabs.map((tab) => <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tabLabel(tab, leader, joinRequests, t)}</Text></Pressable>)}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={DESIGN_TOKENS.colors.green} colors={[DESIGN_TOKENS.colors.green]} />}>
            {activeTab === "myInfo" ? <MyInfoViewV2 currentUser={currentUser} account={account} alliance={alliance} desertStormAssignment={desertStormAssignment} desertStormVoteStatus={activeDesertStormVote ? (desertStormVoteNeedsResponse ? "needed" : desertStormVoteSubmitted ? "submitted" : "") : ""} todayCalendarEntries={todayCalendarEntries} currentZombieSiegeEvent={selectedZombieSiegeEvent} currentZombieSiegeAssignment={currentZombieSiegeAssignment} onChangeField={saveMyInfo} onOpenDesertStormVote={activeDesertStormVote ? () => openDesertStormVoteArea() : null} onOpenCalendar={() => setActiveTab("calendar")} onOpenReminders={() => setActiveTab("reminders")} onOpenZombieSiege={() => setActiveTab("zombieSiege")} onOpenFeedback={() => setActiveTab("feedback")} onOpenSettings={() => setActiveTab("alliance")} showPushNotificationControls={Platform.OS !== "android"} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
              const enabled = await syncPushNotifications({ requestPermission: true });
              if (!enabled) {
                Alert.alert("Enable notifications", "Push notifications were not enabled. You can try again later on this screen.");
              }
            })} onDismissPushNotificationsPrompt={() => run(async () => {
              await dismissPushNotificationsPrompt();
            })} t={t} /> : null}
            {activeTab === "desertStorm" ? <DesertStormView section={desertStormSection} onChangeSection={setDesertStormSection} currentUser={currentUser} currentUserIsLeader={leader} events={desertStormEvents} archivedEvents={archivedDesertStormEvents} selectedEvent={selectedDesertStormEvent} selectedEventId={selectedDesertStormEventId} onSelectEvent={setSelectedDesertStormEventId} taskForce={selectedTaskForce} draftTaskForces={desertStormLeaderTaskForces} visibleTaskForces={desertStormVisibleTaskForces} moveSource={desertStormMoveSource} onSelectMoveSource={setDesertStormMoveSource} onMovePlayer={handleDesertStormMove} onPickPlayer={(context) => {
              if (!leader || !selectedDesertStormEvent || selectedDesertStormEvent.status === "completed" || selectedDesertStormEvent.status === "archived") return;
              setPlayerModal({ ...context, eventId: selectedDesertStormEvent.id });
              setPlayerPickerMode("voted");
              setSearchText("");
            }} onCreateEvent={handleCreateDesertStormEvent} newEventTitle={newDesertStormEventTitle} onChangeNewEventTitle={setNewDesertStormEventTitle} onSubmitVote={handleDesertStormVote} onOpenVote={(eventId) => handleDesertStormVoteState(eventId, "open")} onCloseVote={(eventId) => handleDesertStormVoteState(eventId, "closed")} onReopenVote={(eventId) => handleDesertStormVoteState(eventId, "reopen")} onPublishTeams={handleDesertStormPublish} onEditTeams={handleDesertStormEdit} onEndEvent={handleDesertStormEnd} onArchiveEvent={handleDesertStormArchive} /> : null}
            {activeTab === "players" && leader ? <MembersViewV2 players={filteredMembers} memberSearchText={memberSearchText} memberSortMode={memberSortMode} memberRankFilter={memberRankFilter} onChangeMemberSearchText={setMemberSearchText} onChangeMemberSortMode={setMemberSortMode} onChangeMemberRankFilter={setMemberRankFilter} currentUser={currentUser} currentUserIsLeader={leader} onChangeField={saveMember} onRemovePlayer={(playerId) => run(async () => { await removeMember(session.backendUrl, session.token, playerId); await refresh(); })} /> : null}
            {activeTab === "calendar" ? <EnhancedCalendarView entries={calendarEntries} desertStormEvents={desertStormEvents} zombieSiegeEvents={zombieSiegeEvents} currentUserIsLeader={leader} calendarView={calendarView} editingCalendarEntryId={editingCalendarEntryId} language={language} newCalendarTimeInputMode={newCalendarTimeInputMode} calendarTimePickerTarget={calendarTimePickerTarget} calendarDatePickerTarget={calendarDatePickerTarget} calendarFormError={calendarFormError} onChangeCalendarView={setCalendarView} newCalendarTitle={newCalendarTitle} newCalendarDescription={newCalendarDescription} newCalendarDate={newCalendarDate} newCalendarEndDate={newCalendarEndDate} newCalendarStartTime={newCalendarStartTime} newCalendarEndTime={newCalendarEndTime} newCalendarAllDay={newCalendarAllDay} newCalendarEntryType={newCalendarEntryType} newCalendarRepeat={newCalendarRepeat} newCalendarRepeatEndDate={newCalendarRepeatEndDate} newCalendarRepeatWeekdays={newCalendarRepeatWeekdays} newCalendarLinkedType={newCalendarLinkedType} newCalendarLinkedEventId={newCalendarLinkedEventId} newCalendarEventTimeZone={newCalendarEventTimeZone} newCalendarLeaderNotes={newCalendarLeaderNotes} newCalendarLeaderOnly={newCalendarLeaderOnly} onChangeNewCalendarTitle={setNewCalendarTitle} onChangeNewCalendarDescription={setNewCalendarDescription} onChangeNewCalendarDate={setNewCalendarDate} onChangeNewCalendarEndDate={setNewCalendarEndDate} onChangeNewCalendarStartTime={setNewCalendarStartTime} onChangeNewCalendarEndTime={setNewCalendarEndTime} onChangeNewCalendarTimeInputMode={setNewCalendarTimeInputMode} onChangeCalendarTimePickerTarget={setCalendarTimePickerTarget} onChangeCalendarDatePickerTarget={setCalendarDatePickerTarget} onChangeNewCalendarEventTimeZone={setNewCalendarEventTimeZone} onToggleNewCalendarAllDay={() => setNewCalendarAllDay((value) => !value)} onChangeNewCalendarEntryType={(value) => {
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
            }} onChangeNewCalendarRepeat={setNewCalendarRepeat} onChangeNewCalendarRepeatEndDate={setNewCalendarRepeatEndDate} onToggleNewCalendarRepeatWeekday={(code) => setNewCalendarRepeatWeekdays((current) => toggleWeekdaySelection(current, code))} onChangeNewCalendarLinkedEventId={setNewCalendarLinkedEventId} onChangeNewCalendarLeaderNotes={setNewCalendarLeaderNotes} onToggleLeaderOnly={() => setNewCalendarLeaderOnly((value) => !value)} onCreateEntry={handleSubmitCalendarEntry} onCancelEdit={resetCalendarForm} onEditEntry={beginCalendarEntryEdit} onDeleteEntry={(entryId) => run(async () => { if (editingCalendarEntryId === entryId) { resetCalendarForm(); } await deleteCalendarEntryRequest(session.backendUrl, session.token, entryId); await refresh(); })} onOpenLinkedEntry={openLinkedCalendarEntry} /> : null}
            {activeTab === "reminders" ? <RemindersView reminders={reminders} language={language} onCreateReminder={handleCreateReminder} onCancelReminder={handleCancelReminder} onDeleteReminder={handleDeleteReminder} /> : null}
            {activeTab === "zombieSiege" ? <ZombieSiegeView events={zombieSiegeEvents} selectedEvent={selectedZombieSiegeEvent} selectedEventId={selectedZombieSiegeEventId} onSelectEvent={setSelectedZombieSiegeEventId} currentUser={currentUser} currentUserIsLeader={leader} newTitle={newZombieSiegeTitle} newStartAt={newZombieSiegeStartAt} newEndAt={newZombieSiegeEndAt} newVoteClosesAt={newZombieSiegeVoteClosesAt} newThreshold={newZombieSiegeThreshold} onChangeNewTitle={setNewZombieSiegeTitle} onChangeNewStartAt={setNewZombieSiegeStartAt} onChangeNewEndAt={setNewZombieSiegeEndAt} onChangeNewVoteClosesAt={setNewZombieSiegeVoteClosesAt} onChangeNewThreshold={setNewZombieSiegeThreshold} onCreateEvent={() => run(async () => { const created = await createZombieSiegeEventRequest(session.backendUrl, session.token, { title: newZombieSiegeTitle, startAt: toIsoDateTime(newZombieSiegeStartAt), endAt: toIsoDateTime(newZombieSiegeEndAt), voteClosesAt: "", wave20Threshold: Number.parseFloat(newZombieSiegeThreshold) || 0 }); setSelectedZombieSiegeEventId(created.id); setNewZombieSiegeTitle(""); setNewZombieSiegeStartAt(formatLocalDateTimeInput(new Date())); setNewZombieSiegeEndAt(formatLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000))); setNewZombieSiegeVoteClosesAt(formatLocalDateTimeInput(new Date())); setNewZombieSiegeThreshold(""); await refresh(); })} onSubmitAvailability={(eventId, status) => run(async () => { await submitZombieSiegeAvailabilityRequest(session.backendUrl, session.token, eventId, status); await refresh(); })} onRunPlan={(eventId) => run(async () => { await runZombieSiegePlanRequest(session.backendUrl, session.token, eventId); await refresh(); })} onPublishPlan={(eventId) => run(async () => { await publishZombieSiegePlanRequest(session.backendUrl, session.token, eventId); await refresh(); })} onDiscardDraft={(eventId) => run(async () => { await discardZombieSiegeDraftRequest(session.backendUrl, session.token, eventId); await refresh(); })} onSaveWaveOneReview={(eventId, reviews) => run(async () => { await updateZombieSiegeWaveOneReviewRequest(session.backendUrl, session.token, eventId, reviews); await refresh(); })} onEndEvent={(eventId) => run(async () => { await endZombieSiegeEventRequest(session.backendUrl, session.token, eventId); await refresh(); })} /> : null}
            {activeTab === "alliance" ? <AllianceView alliance={alliance} account={account} currentUser={currentUser} currentUserIsLeader={leader} joinRequests={joinRequests} newMemberName={newMemberName} newMemberRank={newMemberRank} newMemberPower={newMemberPower} newAllianceCode={newAllianceCode} onChangeNewMemberName={setNewMemberName} onChangeNewMemberRank={setNewMemberRank} onChangeNewMemberPower={setNewMemberPower} onChangeNewAllianceCode={setNewAllianceCode} onAddMember={() => run(async () => { await addMember(session.backendUrl, session.token, { name: newMemberName, rank: newMemberRank, overallPower: Number.parseFloat(newMemberPower) || 0 }); setNewMemberName(""); setNewMemberRank("R1"); setNewMemberPower(""); await refresh(); })} onApproveJoinRequest={(requestId) => run(async () => { await approveJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onRejectJoinRequest={(requestId) => run(async () => { await rejectJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onLeaveAlliance={() => run(async () => { const result = await leaveAlliance(session.backendUrl, session.token); setAccount(result.account); setAlliance(null); setCurrentUser(null); setJoinRequest(null); setJoinRequests([]); setSetupMode("join"); setAlliancePreview(null); setNewAllianceCode(""); setActiveTab("myInfo"); })} onRotateAllianceCode={() => run(async () => { await updateAllianceCode(session.backendUrl, session.token, newAllianceCode); await refresh(); })} onSignOut={signOut} t={t} language={language} onChangeLanguage={changeLanguage} showPushNotificationControls={Platform.OS !== "android"} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
              const enabled = await enablePushNotifications();
              if (!enabled) {
                Alert.alert("Enable notifications", "Push notifications were not enabled. You can try again later on this screen.");
              }
            })} /> : null}
            {activeTab === "feedback" ? <FeedbackView feedbackEntries={feedbackEntries} newFeedbackText={newFeedbackText} onChangeNewFeedbackText={setNewFeedbackText} onSubmitFeedback={() => run(async () => { await addFeedbackRequest(session.backendUrl, session.token, newFeedbackText); setNewFeedbackText(""); await refresh(); })} onSubmitFeedbackComment={(feedbackEntryId, message, reset) => run(async () => { await addFeedbackCommentRequest(session.backendUrl, session.token, feedbackEntryId, message); if (typeof reset === "function") reset(); await refresh(); })} t={t} /> : null}
          </ScrollView>
        </View>`r`n      <BottomSheetModal visible={Boolean(playerModal)} onClose={() => setPlayerModal(null)}>
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

function LanguageSelector({ language, onChangeLanguage, t }) {
  return <View style={styles.section}>
    <Text style={styles.sectionTitle}>{t("language")}</Text>
    <View style={styles.languageRow}>
      {LANGUAGE_OPTIONS.map((option) => <Pressable key={option.code} style={[styles.languageButton, language === option.code && styles.languageButtonActive]} onPress={() => onChangeLanguage(option.code)}>
        <Text style={[styles.languageButtonText, language === option.code && styles.languageButtonTextActive]}>{option.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

function RankSelector({ value, onChange, style }) {
  return <View style={[styles.rankSelectorWrap, style]}>
    <View style={styles.rankDropdown}>
      {RANK_OPTIONS.map((rank, index) => <Pressable key={rank} style={[styles.rankOption, index === 0 && { borderTopWidth: 0 }, value === rank && styles.rankOptionActive]} onPress={() => onChange(rank)}>
        <Text style={[styles.rankOptionText, value === rank && styles.rankOptionTextActive]}>{rank}</Text>
      </Pressable>)}
    </View>
  </View>;
}

function MembersViewV2({ players, memberSearchText, memberSortMode, memberRankFilter, onChangeMemberSearchText, onChangeMemberSortMode, onChangeMemberRankFilter, currentUser, currentUserIsLeader, onChangeField, onRemovePlayer }) {
  const [drafts, setDrafts] = useState({});
  const [expandedMemberId, setExpandedMemberId] = useState("");
  const [editingMemberIds, setEditingMemberIds] = useState({});

  useEffect(() => {
    setDrafts(Object.fromEntries((players || []).map((player) => [player.id, {
      name: player.name,
      rank: player.rank,
      overallPower: String(player.overallPower ?? 0),
      heroPower: String(player.heroPower ?? 0),
      squad1: String(player.squadPowers?.squad1 ?? 0),
      squad2: String(player.squadPowers?.squad2 ?? 0),
      squad3: String(player.squadPowers?.squad3 ?? 0),
      squad4: String(player.squadPowers?.squad4 ?? 0)
    }])));
  }, [players]);

  useEffect(() => {
    if (expandedMemberId && !(players || []).some((player) => player.id === expandedMemberId)) {
      setExpandedMemberId("");
    }
  }, [expandedMemberId, players]);

  useEffect(() => {
    setEditingMemberIds((current) => Object.fromEntries(Object.entries(current).filter(([playerId]) => (players || []).some((player) => player.id === playerId))));
  }, [players]);

  const rosterSummary = useMemo(() => {
    const rankCounts = (players || []).reduce((accumulator, player) => {
      accumulator[player.rank] = (accumulator[player.rank] || 0) + 1;
      return accumulator;
    }, {});
    const totalPower = (players || []).reduce((sum, player) => sum + (Number(player.overallPower) || 0), 0);
    const totalHeroPower = (players || []).reduce((sum, player) => sum + (Number(player.heroPower) || 0), 0);
    return {
      totalMembers: (players || []).length,
      totalPower,
      totalHeroPower,
      rankCounts
    };
  }, [players]);

  function updateDraft(playerId, field, value) {
    setDrafts((current) => ({ ...current, [playerId]: { ...(current[playerId] || {}), [field]: value } }));
  }

  function toggleExpanded(playerId) {
    setExpandedMemberId((current) => current === playerId ? "" : playerId);
  }

  function toggleEditing(playerId, enabled) {
    setEditingMemberIds((current) => ({ ...current, [playerId]: enabled }));
  }

  function handleSave(player) {
    const draft = drafts[player.id] || {};
    if (draft.name !== player.name) onChangeField(player.id, "name", draft.name);
    if (draft.rank !== player.rank) onChangeField(player.id, "rank", draft.rank);
    if (String(draft.overallPower) !== String(player.overallPower)) onChangeField(player.id, "overallPower", draft.overallPower);
    if (String(draft.heroPower) !== String(player.heroPower ?? 0)) onChangeField(player.id, "heroPower", draft.heroPower);
    const currentSquads = player.squadPowers || {};
    const nextSquads = { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 };
    if (["squad1", "squad2", "squad3", "squad4"].some((key) => String(nextSquads[key]) !== String(currentSquads[key] ?? 0))) {
      onChangeField(player.id, "squadPowers", nextSquads);
    }
    toggleEditing(player.id, false);
  }

  function handleRemove(player) {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${player.name} from the alliance?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onRemovePlayer(player.id) }
      ]
    );
  }

  return <View style={styles.section}>
    <AppCard style={styles.membersHeroCard}>
      <SectionHeader eyebrow="Members" title="Operational roster" detail="Search, filter, and manage alliance members without changing roster logic." />
      <View style={styles.memberStatGrid}>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Visible</Text>
          <Text style={styles.memberStatValue}>{rosterSummary.totalMembers}</Text>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Total Power</Text>
          <Text style={styles.memberStatValue}>{rosterSummary.totalPower.toFixed(2)}M</Text>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Hero Power</Text>
          <Text style={styles.memberStatValue}>{rosterSummary.totalHeroPower.toFixed(2)}M</Text>
        </View>
      </View>
      <View style={styles.rankFilterRow}>
        <StatusBadge label={`R5 ${rosterSummary.rankCounts.R5 || 0}`} tone="info" />
        <StatusBadge label={`R4 ${rosterSummary.rankCounts.R4 || 0}`} tone="success" />
        <StatusBadge label={`R3 ${rosterSummary.rankCounts.R3 || 0}`} tone="neutral" />
        <StatusBadge label={`R2 ${rosterSummary.rankCounts.R2 || 0}`} tone="neutral" />
        <StatusBadge label={`R1 ${rosterSummary.rankCounts.R1 || 0}`} tone="neutral" />
      </View>
    </AppCard>

    <AppCard style={styles.membersFilterCard}>
      <SectionHeader eyebrow="Filters" title="Roster controls" detail="Keep the list tight and focused while preserving the existing search and sort rules." />
      <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder="Search name or rank" />
      <View style={styles.rankFilterRow}>
        <Pressable style={[styles.rankFilterButton, memberSortMode === "rankDesc" && styles.rankFilterButtonActive]} onPress={() => onChangeMemberSortMode("rankDesc")}><Text style={[styles.rankFilterButtonText, memberSortMode === "rankDesc" && styles.rankFilterButtonTextActive]}>Rank</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, memberSortMode === "name" && styles.rankFilterButtonActive]} onPress={() => onChangeMemberSortMode("name")}><Text style={[styles.rankFilterButtonText, memberSortMode === "name" && styles.rankFilterButtonTextActive]}>Name</Text></Pressable>
      </View>
      <View style={styles.rankFilterRow}>
        {["all", ...RANK_OPTIONS].map((rank) => <Pressable key={rank} style={[styles.rankFilterButton, memberRankFilter === rank && styles.rankFilterButtonActive]} onPress={() => onChangeMemberRankFilter(rank)}><Text style={[styles.rankFilterButtonText, memberRankFilter === rank && styles.rankFilterButtonTextActive]}>{rank === "all" ? "All Ranks" : rank}</Text></Pressable>)}
      </View>
    </AppCard>

    <View style={styles.membersRosterList}>
      {(players || []).length ? players.map((player) => {
        const isExpanded = expandedMemberId === player.id;
        const isEditing = editingMemberIds[player.id];
        const draft = drafts[player.id] || {};
        const desertStormStats = player.desertStormStats || { playedCount: 0, missedCount: 0 };
        return <AppCard key={player.id} style={styles.memberCard} variant={player.rank === "R5" ? "info" : player.rank === "R4" ? "active" : "default"}>
          <Pressable onPress={() => toggleExpanded(player.id)} style={styles.memberCardSummary}>
            <View style={styles.memberSummaryText}>
              <Text style={styles.memberName}>{player.name}</Text>
              <Text style={styles.memberSubline}>{player.rank} � Total {Number(player.overallPower || 0).toFixed(2)}M � Hero {Number(player.heroPower || 0).toFixed(2)}M</Text>
            </View>
            <View style={styles.memberSummaryRight}>
              <StatusBadge label={`${desertStormStats.playedCount || 0} DS`} tone="warning" />
              <Text style={styles.memberExpandIcon}>{isExpanded ? "-" : "+"}</Text>
            </View>
          </Pressable>

          {isExpanded ? <View style={styles.memberSection}>
            {!isEditing ? <>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Power</Text><Text style={styles.memberStatValue}>{Number(player.overallPower || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Hero Power</Text><Text style={styles.memberStatValue}>{Number(player.heroPower || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad Total</Text><Text style={styles.memberStatValue}>{Number(player.totalSquadPower || 0).toFixed(2)}M</Text></View>
              </View>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 1</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad1 || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 2</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad2 || 0).toFixed(2)}M</Text></View>
              </View>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 3</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad3 || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 4</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad4 || 0).toFixed(2)}M</Text></View>
              </View>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Desert Storm Played</Text><Text style={styles.memberStatValue}>{desertStormStats.playedCount || 0}</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Desert Storm Missed</Text><Text style={styles.memberStatValue}>{desertStormStats.missedCount || 0}</Text></View>
              </View>
              {currentUserIsLeader ? <View style={styles.memberCardActionsRow}>
                <SecondaryButton label="Edit Member" onPress={() => toggleEditing(player.id, true)} style={styles.half} />
                <Pressable style={[styles.dangerButton, styles.half]} onPress={() => handleRemove(player)}><Text style={styles.dangerButtonText}>Remove</Text></Pressable>
              </View> : null}
            </> : <View style={styles.memberSection}>
              <TextInput value={draft.name} onChangeText={(value) => updateDraft(player.id, "name", value)} style={styles.input} placeholder="Member name" />
              <RankSelector value={draft.rank || player.rank} onChange={(value) => updateDraft(player.id, "rank", value)} />
              <View style={styles.row}>
                <TextInput value={draft.overallPower} onChangeText={(value) => updateDraft(player.id, "overallPower", value)} style={[styles.input, styles.half]} placeholder="Total Power" keyboardType="decimal-pad" />
                <TextInput value={draft.heroPower} onChangeText={(value) => updateDraft(player.id, "heroPower", value)} style={[styles.input, styles.half]} placeholder="Hero Power" keyboardType="decimal-pad" />
              </View>
              <View style={styles.row}>
                <TextInput value={draft.squad1} onChangeText={(value) => updateDraft(player.id, "squad1", value)} style={[styles.input, styles.half]} placeholder="Squad 1" keyboardType="decimal-pad" />
                <TextInput value={draft.squad2} onChangeText={(value) => updateDraft(player.id, "squad2", value)} style={[styles.input, styles.half]} placeholder="Squad 2" keyboardType="decimal-pad" />
              </View>
              <View style={styles.row}>
                <TextInput value={draft.squad3} onChangeText={(value) => updateDraft(player.id, "squad3", value)} style={[styles.input, styles.half]} placeholder="Squad 3" keyboardType="decimal-pad" />
                <TextInput value={draft.squad4} onChangeText={(value) => updateDraft(player.id, "squad4", value)} style={[styles.input, styles.half]} placeholder="Squad 4" keyboardType="decimal-pad" />
              </View>
              <View style={styles.memberCardActionsRow}>
                <PrimaryButton label="Save Changes" onPress={() => handleSave(player)} style={styles.half} />
                <SecondaryButton label="Cancel" onPress={() => toggleEditing(player.id, false)} style={styles.half} />
              </View>
            </View>}
          </View> : null}
        </AppCard>;
      }) : <AppCard><Text style={styles.statusTitle}>No members found</Text><Text style={styles.hint}>Try another search or rank filter.</Text></AppCard>}
    </View>
  </View>;
}
function buildWheelValues(start, end, formatter = (value) => String(value)) {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push({ value, label: formatter(value) });
  }
  return values;
}

function formatTwoDigit(value) {
  return String(value).padStart(2, "0");
}

function formatReminderDuration(secondsTotal) {
  const totalSeconds = Math.max(0, Number(secondsTotal) || 0);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${formatTwoDigit(hours)}:${formatTwoDigit(minutes)}:${formatTwoDigit(seconds)}`;
}

function formatReminderCountdown(msRemaining) {
  if (msRemaining <= 0) {
    return "Due now";
  }
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${formatTwoDigit(seconds)}s`;
}

function CalendarTimeWheelColumn({ value, values, onChange }) {
  const scrollRef = useRef(null);
  const itemHeight = CALENDAR_WHEEL_ITEM_HEIGHT;
  useEffect(() => {
    const index = Math.max(0, values.findIndex((entry) => entry.value === value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
    });
  }, [itemHeight, value, values]);
  return <View style={styles.calendarWheelColumn}>
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={itemHeight}
      decelerationRate="fast"
      contentContainerStyle={styles.calendarWheelContent}
      onMomentumScrollEnd={(event) => {
        const index = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / itemHeight)));
        const nextValue = values[index]?.value;
        if (nextValue !== undefined && nextValue !== value) {
          onChange(nextValue);
        }
      }}
    >
      {values.map((entry) => <Pressable key={`${entry.value}`} style={styles.calendarWheelItem} onPress={() => onChange(entry.value)}>
        <Text style={[styles.calendarWheelText, entry.value === value && styles.calendarWheelTextActive]}>{entry.label}</Text>
      </Pressable>)}
    </ScrollView>
    <View pointerEvents="none" style={styles.calendarWheelHighlight} />
  </View>;
}

function CalendarTimePickerModal({ visible, title, value, minValue = "", onChange, onClose, language }) {
  const parsedValue = parseReminderTimeValue(value || "00:00") || { hours: 0, minutes: 0 };
  const parsedMin = parseReminderTimeValue(minValue || "") || null;
  const [hourValue, setHourValue] = useState(parsedValue.hours);
  const [minuteValue, setMinuteValue] = useState(parsedValue.minutes);

  useEffect(() => {
    setHourValue(parsedValue.hours);
    setMinuteValue(parsedValue.minutes);
  }, [value]);

  useEffect(() => {
    if (!parsedMin) {
      return;
    }
    if (hourValue < parsedMin.hours) {
      setHourValue(parsedMin.hours);
      setMinuteValue(parsedMin.minutes);
      return;
    }
    if (hourValue === parsedMin.hours && minuteValue < parsedMin.minutes) {
      setMinuteValue(parsedMin.minutes);
    }
  }, [hourValue, minuteValue, parsedMin]);

  useEffect(() => {
    onChange(`${formatTwoDigit(hourValue)}:${formatTwoDigit(minuteValue)}`);
  }, [hourValue, minuteValue]);

  const hourOptions = buildWheelValues(parsedMin ? parsedMin.hours : 0, 23, formatTwoDigit);
  const minuteStart = parsedMin && hourValue === parsedMin.hours ? parsedMin.minutes : 0;
  const minuteOptions = buildWheelValues(minuteStart, 59, formatTwoDigit);

  if (!visible) {
    return null;
  }

  return <BottomSheetModal visible={visible} onClose={onClose}>
    <SectionHeader eyebrow="Picker" title={title} detail={language ? "" : ""} />
    <View style={styles.calendarWheelHeader}>
      <Text style={styles.hint}>Hour</Text>
      <Text style={styles.hint}>Minute</Text>
    </View>
    <View style={styles.calendarWheelRow}>
      <CalendarTimeWheelColumn value={hourValue} values={hourOptions} onChange={setHourValue} />
      <CalendarTimeWheelColumn value={minuteValue} values={minuteOptions} onChange={setMinuteValue} />
    </View>
    <PrimaryButton label="Done" onPress={onClose} />
  </BottomSheetModal>;
}

function CalendarDatePickerModal({ visible, title, value, onChange, onClose }) {
  const safeValue = isValidReminderDateKey(value) ? value : formatReminderDateKey(new Date());
  const [yearValue, setYearValue] = useState(Number.parseInt(safeValue.slice(0, 4), 10));
  const [monthValue, setMonthValue] = useState(Number.parseInt(safeValue.slice(5, 7), 10));
  const [dayValue, setDayValue] = useState(Number.parseInt(safeValue.slice(8, 10), 10));

  useEffect(() => {
    const normalized = isValidReminderDateKey(value) ? value : formatReminderDateKey(new Date());
    setYearValue(Number.parseInt(normalized.slice(0, 4), 10));
    setMonthValue(Number.parseInt(normalized.slice(5, 7), 10));
    setDayValue(Number.parseInt(normalized.slice(8, 10), 10));
  }, [value]);

  const maxDay = new Date(yearValue, monthValue, 0).getDate();
  useEffect(() => {
    if (dayValue > maxDay) {
      setDayValue(maxDay);
    }
  }, [dayValue, maxDay]);

  useEffect(() => {
    onChange(`${yearValue}-${formatTwoDigit(monthValue)}-${formatTwoDigit(Math.min(dayValue, maxDay))}`);
  }, [yearValue, monthValue, dayValue, maxDay]);

  const monthOptions = buildWheelValues(1, 12, formatTwoDigit);
  const dayOptions = buildWheelValues(1, maxDay, formatTwoDigit);
  const currentYear = new Date().getFullYear();
  const yearOptions = buildWheelValues(currentYear - 1, currentYear + 3, String);

  if (!visible) {
    return null;
  }

  return <BottomSheetModal visible={visible} onClose={onClose}>
    <SectionHeader eyebrow="Picker" title={title} />
    <View style={styles.calendarWheelHeader}>
      <Text style={styles.hint}>Month</Text>
      <Text style={styles.hint}>Day</Text>
      <Text style={styles.hint}>Year</Text>
    </View>
    <View style={styles.calendarWheelRow}>
      <CalendarTimeWheelColumn value={monthValue} values={monthOptions} onChange={setMonthValue} />
      <CalendarTimeWheelColumn value={Math.min(dayValue, maxDay)} values={dayOptions} onChange={setDayValue} />
      <CalendarTimeWheelColumn value={yearValue} values={yearOptions} onChange={setYearValue} />
    </View>
    <PrimaryButton label="Done" onPress={onClose} />
  </BottomSheetModal>;
}

function ReminderDurationPickerModal({ visible, title, valueSeconds, onChange, onClose }) {
  const totalSeconds = Math.max(0, Number(valueSeconds) || 0);
  const [hours, setHours] = useState(Math.floor(totalSeconds / 3600));
  const [minutes, setMinutes] = useState(Math.floor((totalSeconds % 3600) / 60));
  const [seconds, setSeconds] = useState(totalSeconds % 60);

  useEffect(() => {
    const normalized = Math.max(0, Number(valueSeconds) || 0);
    setHours(Math.floor(normalized / 3600));
    setMinutes(Math.floor((normalized % 3600) / 60));
    setSeconds(normalized % 60);
  }, [valueSeconds]);

  useEffect(() => {
    onChange(hours * 3600 + minutes * 60 + seconds);
  }, [hours, minutes, seconds]);

  if (!visible) {
    return null;
  }

  return <BottomSheetModal visible={visible} onClose={onClose}>
    <SectionHeader eyebrow="Reminder" title={title} detail="Set hours, minutes, and seconds for the countdown." />
    <View style={styles.calendarWheelHeader}>
      <Text style={styles.hint}>Hours</Text>
      <Text style={styles.hint}>Minutes</Text>
      <Text style={styles.hint}>Seconds</Text>
    </View>
    <View style={styles.calendarWheelRow}>
      <CalendarTimeWheelColumn value={hours} values={buildWheelValues(0, 23, formatTwoDigit)} onChange={setHours} />
      <CalendarTimeWheelColumn value={minutes} values={buildWheelValues(0, 59, formatTwoDigit)} onChange={setMinutes} />
      <CalendarTimeWheelColumn value={seconds} values={buildWheelValues(0, 59, formatTwoDigit)} onChange={setSeconds} />
    </View>
    <PrimaryButton label="Done" onPress={onClose} />
  </BottomSheetModal>;
}

function RemindersView({ reminders, language, onCreateReminder, onCancelReminder, onDeleteReminder }) {
  const localTimeZone = getReminderDeviceTimeZone();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("elapsed");
  const [dateKey, setDateKey] = useState(formatReminderDateKey(new Date()));
  const [timeValue, setTimeValue] = useState("12:00");
  const [durationSeconds, setDurationSeconds] = useState(3600);
  const [formError, setFormError] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeReminders = useMemo(() => (reminders || []).filter((reminder) => reminder.status === "active").sort((a, b) => String(a.scheduledForUtc).localeCompare(String(b.scheduledForUtc))), [reminders]);
  const inactiveReminders = useMemo(() => (reminders || []).filter((reminder) => reminder.status !== "active").sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))), [reminders]);
  const preview = useMemo(() => {
    try {
      return buildReminderSchedule({
        mode,
        title,
        notes,
        durationDays: 0,
        durationHours: Math.floor(durationSeconds / 3600),
        durationMinutes: Math.floor((durationSeconds % 3600) / 60),
        durationSeconds: durationSeconds % 60,
        dateKey,
        timeValue,
        localTimeZone
      });
    } catch {
      return null;
    }
  }, [mode, title, notes, durationSeconds, dateKey, timeValue, localTimeZone]);

  function getReminderModeLabel(value) {
    if (value === "serverTime") return `Server Time (${getReminderServerTimeLabel()})`;
    if (value === "localTime") return "Local Time";
    return "After Duration";
  }

  async function handleSubmit() {
    if (mode === "elapsed" && durationSeconds <= 0) {
      setFormError("Choose a duration greater than zero.");
      return;
    }
    if ((mode === "localTime" || mode === "serverTime") && !isValidReminderDateKey(dateKey)) {
      setFormError("Choose a valid reminder date.");
      return;
    }
    if ((mode === "localTime" || mode === "serverTime") && !parseReminderTimeValue(timeValue)) {
      setFormError("Choose a valid reminder time.");
      return;
    }
    if (!preview || new Date(preview.scheduledForUtc).getTime() <= Date.now()) {
      setFormError("Reminder time must be in the future.");
      return;
    }
    setFormError("");
    const success = await onCreateReminder({
      title,
      notes,
      mode,
      durationDays: 0,
      durationHours: Math.floor(durationSeconds / 3600),
      durationMinutes: Math.floor((durationSeconds % 3600) / 60),
      durationSeconds: durationSeconds % 60,
      dateKey,
      timeValue
    });
    if (success) {
      setTitle("");
      setNotes("");
      setMode("elapsed");
      setDurationSeconds(3600);
      setDateKey(formatReminderDateKey(new Date()));
      setTimeValue("12:00");
      setFormError("");
    }
  }

  function renderReminderCard(reminder, inactive = false) {
    const scheduledAt = new Date(reminder.scheduledForUtc).getTime();
    const countdown = scheduledAt > now ? formatReminderCountdown(scheduledAt - now) : "Due now";
    return <AppCard key={reminder.id} style={styles.reminderCard} variant={inactive ? "default" : "info"}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.listRowContent}>
          <Text style={styles.cardTitle}>{reminder.title || "Reminder"}</Text>
          <Text style={styles.reminderMeta}>{getReminderModeLabel(reminder.mode)}</Text>
        </View>
        <StatusBadge label={reminder.status === "active" ? "Active" : reminder.status === "cancelled" ? "Cancelled" : "Completed"} tone={reminder.status === "active" ? "success" : reminder.status === "cancelled" ? "danger" : "neutral"} />
      </View>
      {reminder.notes ? <Text style={styles.line}>{reminder.notes}</Text> : null}
      <View style={styles.calendarTimeStack}>
        <ListRow title="Local Time" detail={formatReminderDateTimeDisplay(reminder.scheduledForUtc, localTimeZone, language)} />
        <ListRow title={`Server Time (${getReminderServerTimeLabel()})`} detail={formatReminderDateTimeDisplay(reminder.scheduledForUtc, getReminderServerTimeZone(), language)} />
        <ListRow title="Repeat" detail="One-time" />
      </View>
      {reminder.status === "active" ? <Text style={styles.reminderCountdown}>{countdown}</Text> : null}
      <View style={styles.memberCardActionsRow}>
        {reminder.status === "active" ? <SecondaryButton label="Cancel" onPress={() => onCancelReminder(reminder)} style={styles.half} /> : null}
        <Pressable style={[styles.dangerButton, reminder.status === "active" ? styles.half : { flex: 1 }]} onPress={() => onDeleteReminder(reminder)}><Text style={styles.dangerButtonText}>Delete</Text></Pressable>
      </View>
    </AppCard>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.remindersHeroCard}>
      <SectionHeader eyebrow="Reminders" title="Operational reminders" detail="Track personal countdowns, local alarms, and server-time reminders in one place." />
      <StatusBadge label={`${activeReminders.length} active`} tone={activeReminders.length ? "warning" : "neutral"} />
    </AppCard>

    <AppCard style={styles.reminderComposerCard}>
      <SectionHeader eyebrow="Create" title="New reminder" detail="The reminder fires on this device using the existing local notification flow." />
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Reminder title" />
      <TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.textArea]} placeholder="Optional notes" multiline />
      <View style={styles.rankFilterRow}>
        <Pressable style={[styles.rankFilterButton, mode === "elapsed" && styles.rankFilterButtonActive]} onPress={() => setMode("elapsed")}><Text style={[styles.rankFilterButtonText, mode === "elapsed" && styles.rankFilterButtonTextActive]}>After Duration</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "localTime" && styles.rankFilterButtonActive]} onPress={() => setMode("localTime")}><Text style={[styles.rankFilterButtonText, mode === "localTime" && styles.rankFilterButtonTextActive]}>At Local Time</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "serverTime" && styles.rankFilterButtonActive]} onPress={() => setMode("serverTime")}><Text style={[styles.rankFilterButtonText, mode === "serverTime" && styles.rankFilterButtonTextActive]}>At Server Time</Text></Pressable>
      </View>
      {mode === "elapsed" ? <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setDurationPickerVisible(true)}><Text style={styles.line}>Duration: {formatReminderDuration(durationSeconds)}</Text></Pressable> : null}
      {(mode === "localTime" || mode === "serverTime") ? <>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setDatePickerVisible(true)}><Text style={styles.line}>Date: {dateKey}</Text></Pressable>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setTimePickerVisible(true)}><Text style={styles.line}>Time: {timeValue}</Text></Pressable>
        {mode === "serverTime" ? <Text style={styles.hint}>Server time is {getReminderServerTimeLabel()}.</Text> : null}
      </> : null}
      <AppCard variant="info" style={styles.reminderPreviewCard}>
        <Text style={styles.statusEyebrow}>Preview</Text>
        <ListRow title="Local Time" detail={preview ? formatReminderDateTimeDisplay(preview.scheduledForUtc, localTimeZone, language) : "--"} />
        <ListRow title={`Server Time (${getReminderServerTimeLabel()})`} detail={preview ? formatReminderDateTimeDisplay(preview.scheduledForUtc, getReminderServerTimeZone(), language) : "--"} />
      </AppCard>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <PrimaryButton label="Create Reminder" onPress={handleSubmit} />
    </AppCard>

    <AppCard style={styles.reminderSectionCard}>
      <SectionHeader eyebrow="Active" title="Active reminders" detail="Upcoming reminders that still have scheduled local notifications." />
      {activeReminders.length ? <View style={styles.remindersList}>{activeReminders.map((reminder) => renderReminderCard(reminder, false))}</View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>No active reminders</Text><Text style={styles.hint}>Create a reminder to start tracking your next action window.</Text></AppCard>}
    </AppCard>

    <AppCard style={styles.reminderSectionCard}>
      <SectionHeader eyebrow="Inactive" title="Past and cancelled" detail="Completed or cancelled reminders stay here for quick review." />
      {inactiveReminders.length ? <View style={styles.remindersList}>{inactiveReminders.map((reminder) => renderReminderCard(reminder, true))}</View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>Nothing archived</Text><Text style={styles.hint}>Cancelled or completed reminders will show up here.</Text></AppCard>}
    </AppCard>

    <ReminderDurationPickerModal visible={durationPickerVisible} title="Select duration" valueSeconds={durationSeconds} onChange={setDurationSeconds} onClose={() => setDurationPickerVisible(false)} />
    <CalendarDatePickerModal visible={datePickerVisible} title="Select date" value={dateKey} onChange={setDateKey} onClose={() => setDatePickerVisible(false)} />
    <CalendarTimePickerModal visible={timePickerVisible} title="Select time" value={timeValue} onChange={setTimeValue} onClose={() => setTimePickerVisible(false)} />
  </View>;
}
function EnhancedCalendarView({ entries, desertStormEvents, zombieSiegeEvents, currentUserIsLeader, calendarView, editingCalendarEntryId, language, newCalendarTimeInputMode, calendarTimePickerTarget, calendarDatePickerTarget, calendarFormError, onChangeCalendarView, newCalendarTitle, newCalendarDescription, newCalendarDate, newCalendarEndDate, newCalendarStartTime, newCalendarEndTime, newCalendarAllDay, newCalendarEntryType, newCalendarRepeat, newCalendarRepeatEndDate, newCalendarRepeatWeekdays, newCalendarLinkedType, newCalendarLinkedEventId, newCalendarEventTimeZone, newCalendarLeaderNotes, newCalendarLeaderOnly, onChangeNewCalendarTitle, onChangeNewCalendarDescription, onChangeNewCalendarDate, onChangeNewCalendarEndDate, onChangeNewCalendarStartTime, onChangeNewCalendarEndTime, onChangeNewCalendarTimeInputMode, onChangeCalendarTimePickerTarget, onChangeCalendarDatePickerTarget, onChangeNewCalendarEventTimeZone, onToggleNewCalendarAllDay, onChangeNewCalendarEntryType, onChangeNewCalendarRepeat, onChangeNewCalendarRepeatEndDate, onToggleNewCalendarRepeatWeekday, onChangeNewCalendarLinkedEventId, onChangeNewCalendarLeaderNotes, onToggleLeaderOnly, onCreateEntry, onCancelEdit, onEditEntry, onDeleteEntry, onOpenLinkedEntry }) {
  const today = startOfLocalDay();
  const todayKey = formatLocalDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addLocalDays(today, index)), [todayKey]);
  const monthDays = useMemo(() => {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
    const days = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [monthCursor]);
  const visibleDateKeys = useMemo(() => {
    if (calendarView === "today") return [todayKey];
    if (calendarView === "week") return weekDays.map((day) => formatLocalDateKey(day));
    return monthDays.map((day) => formatLocalDateKey(day));
  }, [calendarView, todayKey, weekDays, monthDays]);
  const windowStartDateKey = visibleDateKeys[0] || todayKey;
  const windowEndDateKey = visibleDateKeys[visibleDateKeys.length - 1] || todayKey;
  const expandedEntries = useMemo(() => expandCalendarEntries(entries, windowStartDateKey, windowEndDateKey), [entries, windowStartDateKey, windowEndDateKey]);
  const entriesByDate = useMemo(() => expandedEntries.reduce((accumulator, entry) => {
    const key = entry.localDateKey;
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(entry);
    return accumulator;
  }, {}), [expandedEntries]);
  const orderedEntriesByDate = useMemo(() => Object.fromEntries(Object.entries(entriesByDate).map(([key, value]) => [key, [...value].sort((a, b) => String(a.startsAt || a.occurrenceDateKey).localeCompare(String(b.startsAt || b.occurrenceDateKey)))])), [entriesByDate]);
  const fallbackSelectedDateKey = visibleDateKeys.includes(selectedDateKey) ? selectedDateKey : visibleDateKeys[0] || todayKey;
  const selectedDate = parseLocalDateKey(fallbackSelectedDateKey);
  const selectedEntries = orderedEntriesByDate[fallbackSelectedDateKey] || [];
  const calendarT = getCalendarTranslator(language);
  const monthLabel = monthCursor.toLocaleDateString(language || undefined, { month: "long", year: "numeric" });
  const selectedDateLabel = selectedDate.toLocaleDateString(language || undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const selectedDateShortLabel = selectedDate.toLocaleDateString(language || undefined, { month: "short", day: "numeric" });
  const availableDesertStormEvents = getLinkableCalendarEvents(desertStormEvents);
  const availableZombieSiegeEvents = getLinkableCalendarEvents(zombieSiegeEvents);
  const timePreview = useMemo(() => newCalendarAllDay ? null : buildCalendarTimedPreview(newCalendarDate, newCalendarStartTime || "00:00", newCalendarEndDate, newCalendarEndTime, newCalendarTimeInputMode, newCalendarEventTimeZone), [newCalendarAllDay, newCalendarDate, newCalendarEndDate, newCalendarStartTime, newCalendarEndTime, newCalendarTimeInputMode, newCalendarEventTimeZone]);

  useEffect(() => {
    if (calendarView === "month") {
      const activeDate = parseLocalDateKey(fallbackSelectedDateKey);
      setMonthCursor(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
      return;
    }
    setSelectedDateKey(todayKey);
  }, [calendarView, todayKey]);

  useEffect(() => {
    if (!visibleDateKeys.includes(selectedDateKey) && visibleDateKeys[0]) {
      setSelectedDateKey(visibleDateKeys[0]);
    }
  }, [selectedDateKey, visibleDateKeys]);

  function shiftMonth(offset) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function renderDayButton(date, compact = false) {
    const key = formatLocalDateKey(date);
    const inCurrentMonth = date.getMonth() === monthCursor.getMonth();
    const isSelected = fallbackSelectedDateKey === key;
    const isToday = isSameLocalDay(date, today);
    const eventCount = (orderedEntriesByDate[key] || []).length;
    return <Pressable key={key} style={[styles.calendarDayCell, compact && styles.calendarDayCellCompact, !inCurrentMonth && styles.calendarDayCellMuted, isToday && styles.calendarDayCellToday, isSelected && styles.calendarDayCellSelected]} onPress={() => setSelectedDateKey(key)}><Text style={[styles.calendarDayWeekLabel, compact && styles.calendarDayWeekLabelCompact, isSelected && styles.calendarDayTextSelected]}>{date.toLocaleDateString(language || undefined, { weekday: "short" })}</Text><Text style={[styles.calendarDayNumber, compact && styles.calendarDayNumberCompact, !inCurrentMonth && styles.calendarDayTextMuted, isSelected && styles.calendarDayTextSelected]}>{date.getDate()}</Text>{eventCount ? <View style={[styles.calendarEventBadge, isSelected && styles.calendarEventBadgeSelected]}><Text style={[styles.calendarEventBadgeText, isSelected && styles.calendarEventBadgeTextSelected]}>{eventCount}</Text></View> : <View style={styles.calendarEventSpacer} />}</Pressable>;
  }

  function getRepeatLabel(entry) {
    const recurrence = normalizeCalendarRecurrence(entry);
    if (recurrence.repeat === "none") return "";
    if (recurrence.repeat === "daily") return calendarT("repeatsDaily");
    if (recurrence.repeat === "every_other_day") return calendarT("repeatsEveryOtherDay");
    if (recurrence.repeat === "weekly") return calendarT("repeatsWeekly");
    if (recurrence.repeat === "custom_weekdays") return calendarT("repeatsWeekdays", { value: recurrence.weekdays.map((code) => getCalendarWeekdayLabel(code, language)).filter(Boolean).join(", ") });
    return "";
  }

  const linkEventOptions = newCalendarEntryType === "linked_desert_storm" ? availableDesertStormEvents : newCalendarEntryType === "linked_zombie_siege" ? availableZombieSiegeEvents : [];

  return <View style={styles.section}>
    <AppCard style={styles.calendarAgendaShell}>
      <SectionHeader eyebrow="Calendar" title={calendarT("title")} detail={calendarT("hint")} />
      <View style={styles.calendarModeRow}>
        <Pressable style={[styles.secondaryButton, styles.third, calendarView === "today" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("today")}><Text style={[styles.secondaryButtonText, calendarView === "today" && styles.modeButtonTextActive]}>{calendarT("today")}</Text></Pressable>
        <Pressable style={[styles.secondaryButton, styles.third, calendarView === "week" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("week")}><Text style={[styles.secondaryButtonText, calendarView === "week" && styles.modeButtonTextActive]}>{calendarT("week")}</Text></Pressable>
        <Pressable style={[styles.secondaryButton, styles.third, calendarView === "month" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("month")}><Text style={[styles.secondaryButtonText, calendarView === "month" && styles.modeButtonTextActive]}>{calendarT("month")}</Text></Pressable>
      </View>
    </AppCard>

    {calendarView === "month" ? <AppCard style={styles.calendarMonthShell}>
      <View style={styles.calendarMonthHeader}>
        <Pressable style={styles.calendarMonthArrow} onPress={() => shiftMonth(-1)}><Text style={styles.calendarMonthArrowText}>{"<"}</Text></Pressable>
        <Text style={styles.calendarMonthTitle}>{monthLabel}</Text>
        <Pressable style={styles.calendarMonthArrow} onPress={() => shiftMonth(1)}><Text style={styles.calendarMonthArrowText}>{">"}</Text></Pressable>
      </View>
      <View style={styles.calendarWeekdayRow}>
        {CALENDAR_WEEKDAY_OPTIONS.map((option) => <Text key={option.code} style={styles.calendarWeekday}>{getCalendarWeekdayLabel(option.code, language)}</Text>)}
      </View>
      <View style={styles.calendarGrid}>
        {monthDays.map((day) => renderDayButton(day))}
      </View>
    </AppCard> : null}

    {calendarView === "week" ? <AppCard style={styles.calendarStripShell}><View style={styles.calendarStrip}>{weekDays.map((day) => renderDayButton(day, true))}</View></AppCard> : null}
    {calendarView === "today" ? <AppCard style={styles.calendarStripShell}><View style={styles.calendarStrip}>{renderDayButton(today, true)}</View></AppCard> : null}

    <AppCard style={styles.calendarDetailCard}>
      <View style={styles.calendarDetailHeader}>
        <View style={styles.listRowContent}>
          <Text style={styles.statusEyebrow}>{calendarT("selectedDay")}</Text>
          <Text style={styles.cardTitle}>{selectedDateLabel}</Text>
          <Text style={styles.hint}>{selectedEntries.length ? (selectedEntries.length === 1 ? calendarT("oneEventScheduled") : calendarT("manyEventsScheduled", { count: selectedEntries.length })) : calendarT("noEventsScheduled")}</Text>
        </View>
        <StatusBadge label={selectedEntries.length ? `${selectedEntries.length}` : "0"} tone={selectedEntries.length ? "info" : "neutral"} />
      </View>

      {selectedEntries.length ? <View style={styles.calendarAgendaList}>
        {selectedEntries.map((entry) => {
          const badgeTone = entry.linkedType === "desertStorm" ? "warning" : entry.linkedType === "zombieSiege" ? "purple" : entry.leaderOnly ? "danger" : entry.allDay === false ? "info" : "neutral";
          const badgeLabel = entry.linkedType === "desertStorm"
            ? calendarT("linkedDesertStorm")
            : entry.linkedType === "zombieSiege"
              ? calendarT("linkedZombieSiege")
              : entry.leaderOnly
                ? calendarT("leaderOnly")
                : entry.allDay !== false
                  ? calendarT("allDay")
                  : calendarT("timeSpecificEntry");
          return <Pressable key={entry.occurrenceId || entry.id} style={styles.calendarEntryCard} disabled={!entry.linkedType} onPress={() => entry.linkedType && onOpenLinkedEntry(entry)}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.listRowContent}>
                <Text style={styles.cardTitle}>{entry.title}</Text>
                <Text style={styles.calendarEntryMeta}>{entry.allDay !== false ? calendarT("allDay") : entry.localDisplayDateTime || entry.localDisplayTime || entry.displayTime}</Text>
              </View>
              <StatusBadge label={badgeLabel} tone={badgeTone} />
            </View>
            {entry.description ? <Text style={styles.line}>{entry.description}</Text> : null}
            {getRepeatLabel(entry) ? <Text style={styles.hint}>{getRepeatLabel(entry)}</Text> : null}
            {entry.allDay === false ? <View style={styles.calendarTimeStack}>
              <ListRow title={calendarT("serverTime")} detail={entry.serverDisplayDateTime || entry.serverDisplayTime} />
              <ListRow title={calendarT("memberLocalTime")} detail={entry.localDisplayDateTime || entry.localDisplayTime} />
            </View> : null}
            {currentUserIsLeader && entry.leaderNotes ? <AppCard style={styles.calendarLeaderNotesCard}><Text style={styles.statusEyebrow}>{calendarT("leaderNotes")}</Text><Text style={styles.line}>{entry.leaderNotes}</Text></AppCard> : null}
            <View style={styles.cardHeaderRow}>
              <Text style={styles.hint}>{calendarT("addedBy", { name: entry.createdByName || "Leader" })}</Text>
              {currentUserIsLeader ? <View style={styles.memberCardActions}>
                <SecondaryButton label={calendarT("edit")} onPress={() => onEditEntry(entry)} />
                <Pressable style={styles.dangerButton} onPress={() => onDeleteEntry(entry.sourceEntryId || entry.id)}><Text style={styles.dangerButtonText}>{calendarT("delete")}</Text></Pressable>
              </View> : null}
            </View>
          </Pressable>;
        })}
      </View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>{calendarView === "today" ? calendarT("nothingToday") : calendarT("tapAnotherDay")}</Text><Text style={styles.hint}>{calendarT("noEventsScheduled")}</Text></AppCard>}
    </AppCard>

    {currentUserIsLeader ? <AppCard style={styles.calendarComposerCard}>
      <SectionHeader eyebrow="Leader Controls" title={editingCalendarEntryId ? calendarT("editEntry") : calendarT("addEntry")} detail="Create and update alliance calendar entries without changing the underlying event logic." />
      <View style={styles.rankFilterRow}>
        {[["manual", calendarT("manualEvent")], ["reminder", calendarT("reminder")], ["linked_desert_storm", calendarT("linkDesertStorm")], ["linked_zombie_siege", calendarT("linkZombieSiege")]].map(([value, label]) => <Pressable key={value} style={[styles.rankFilterButton, newCalendarEntryType === value && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarEntryType(value)}><Text style={[styles.rankFilterButtonText, newCalendarEntryType === value && styles.rankFilterButtonTextActive]}>{label}</Text></Pressable>)}
      </View>
      <TextInput value={newCalendarTitle} onChangeText={onChangeNewCalendarTitle} style={styles.input} placeholder={calendarT("eventTitle")} />
      <View style={styles.row}>
        <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("startDate")}><Text style={styles.line}>{calendarT("startDate")}: {formatCalendarDateButtonLabel(newCalendarDate, language) || calendarT("chooseDate")}</Text></Pressable>
        <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("endDate")}><Text style={styles.line}>{calendarT("endDate")}: {formatCalendarDateButtonLabel(newCalendarEndDate, language) || calendarT("chooseDate")}</Text></Pressable>
      </View>
      <SecondaryButton label={newCalendarAllDay ? calendarT("allDayEntry") : calendarT("timeSpecificEntry")} onPress={onToggleNewCalendarAllDay} />
      {!newCalendarAllDay ? <AppCard variant="info" style={styles.calendarTimingCard}>
        <SectionHeader eyebrow="Time Entry" title={calendarT("timePreview")} detail={calendarT("inputModeHint")} />
        <View style={styles.rankFilterRow}>
          {CALENDAR_TIME_INPUT_MODES.map((mode) => <Pressable key={mode.id} style={[styles.rankFilterButton, newCalendarTimeInputMode === mode.id && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarTimeInputMode(mode.id)}><Text style={[styles.rankFilterButtonText, newCalendarTimeInputMode === mode.id && styles.rankFilterButtonTextActive]}>{mode.id === "server" ? calendarT("serverInputMode") : calendarT("localInputMode")}</Text></Pressable>)}
        </View>
        <View style={styles.row}>
          <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarTimePickerTarget("start")}><Text style={styles.line}>{calendarT("startTime")}: {newCalendarStartTime}</Text></Pressable>
          <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarTimePickerTarget("end")}><Text style={styles.line}>{calendarT("endTime")}: {newCalendarEndTime}</Text></Pressable>
        </View>
        <View style={styles.calendarPreviewCard}>
          <Text style={styles.statusEyebrow}>{calendarT("timePreview")}</Text>
          <Text style={styles.hint}>{calendarT("previewEnteredAs", { value: newCalendarTimeInputMode === "server" ? calendarT("serverInputMode") : calendarT("localInputMode") })}</Text>
          <ListRow title={calendarT("serverTime")} detail={timePreview?.serverDisplay || "--"} />
          <ListRow title={calendarT("localTime")} detail={`${timePreview?.localDisplay || "--"} (${normalizeCalendarTimeZone(newCalendarEventTimeZone)})`} />
          <Text style={styles.hint}>{calendarT("recurringServerAnchor")}</Text>
        </View>
      </AppCard> : null}
      {linkEventOptions.length ? <View style={styles.section}>
        <Text style={styles.hint}>{calendarT("chooseLinkedEvent")}</Text>
        <View style={styles.rankFilterRow}>
          {linkEventOptions.map((event) => <Pressable key={event.id} style={[styles.rankFilterButton, newCalendarLinkedEventId === event.id && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarLinkedEventId(event.id)}><Text style={[styles.rankFilterButtonText, newCalendarLinkedEventId === event.id && styles.rankFilterButtonTextActive]}>{event.title}</Text></Pressable>)}
        </View>
      </View> : null}
      <View style={styles.section}>
        <Text style={styles.hint}>{calendarT("repeat")}</Text>
        <View style={styles.rankFilterRow}>
          {[["none", calendarT("noRepeat")], ["daily", calendarT("daily")], ["every_other_day", calendarT("everyOtherDay")], ["weekly", calendarT("weekly")], ["custom_weekdays", calendarT("customWeekdays")]].map(([value, label]) => <Pressable key={value} style={[styles.rankFilterButton, newCalendarRepeat === value && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarRepeat(value)}><Text style={[styles.rankFilterButtonText, newCalendarRepeat === value && styles.rankFilterButtonTextActive]}>{label}</Text></Pressable>)}
        </View>
      </View>
      {newCalendarRepeat === "custom_weekdays" ? <View style={styles.rankFilterRow}>{CALENDAR_WEEKDAY_OPTIONS.map((option) => <Pressable key={option.code} style={[styles.rankFilterButton, newCalendarRepeatWeekdays.includes(option.code) && styles.rankFilterButtonActive]} onPress={() => onToggleNewCalendarRepeatWeekday(option.code)}><Text style={[styles.rankFilterButtonText, newCalendarRepeatWeekdays.includes(option.code) && styles.rankFilterButtonTextActive]}>{getCalendarWeekdayLabel(option.code, language)}</Text></Pressable>)}</View> : null}
      {newCalendarRepeat !== "none" ? <View style={styles.section}>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("repeatEndDate")}><Text style={styles.line}>{calendarT("repeatEndDate")}: {newCalendarRepeatEndDate ? formatCalendarDateButtonLabel(newCalendarRepeatEndDate, language) : calendarT("setRepeatEndDate")}</Text></Pressable>
        {newCalendarRepeatEndDate ? <SecondaryButton label={calendarT("clearRepeatEndDate")} onPress={() => onChangeNewCalendarRepeatEndDate("")} /> : null}
      </View> : null}
      <TextInput value={newCalendarDescription} onChangeText={onChangeNewCalendarDescription} style={[styles.input, styles.textArea]} placeholder={newCalendarEntryType === "reminder" ? calendarT("reminderPlaceholder") : calendarT("manualPlaceholder")} multiline />
      <TextInput value={newCalendarLeaderNotes} onChangeText={onChangeNewCalendarLeaderNotes} style={[styles.input, styles.textArea]} placeholder={calendarT("leaderNotes")} multiline />
      {!newCalendarAllDay ? <Text style={styles.hint}>{calendarT("timezoneHint", { value: getServerTimeLabel() })}</Text> : null}
      {calendarFormError ? <Text style={styles.error}>{calendarFormError}</Text> : null}
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, newCalendarLeaderOnly && styles.modeButtonActive]} onPress={onToggleLeaderOnly}><Text style={[styles.secondaryButtonText, newCalendarLeaderOnly && styles.modeButtonTextActive]}>{newCalendarLeaderOnly ? calendarT("leaderOnlyEntry") : calendarT("visibleToEveryone")}</Text></Pressable>
        <View style={styles.half}><PrimaryButton label={editingCalendarEntryId ? calendarT("saveChanges") : calendarT("addToCalendar")} onPress={onCreateEntry} /></View>
      </View>
      {editingCalendarEntryId ? <SecondaryButton label={calendarT("cancelEditing")} onPress={onCancelEdit} /> : null}
    </AppCard> : null}
    <CalendarTimePickerModal
      visible={calendarTimePickerTarget === "start" || calendarTimePickerTarget === "end"}
      title={calendarTimePickerTarget === "end" ? calendarT("pickEndTime") : calendarT("pickStartTime")}
      value={calendarTimePickerTarget === "end" ? newCalendarEndTime : newCalendarStartTime}
      minValue={calendarTimePickerTarget === "end" && newCalendarEndDate === newCalendarDate ? newCalendarStartTime : ""}
      onChange={(nextValue) => {
        if (calendarTimePickerTarget === "end") {
          onChangeNewCalendarEndTime(nextValue);
        } else {
          onChangeNewCalendarStartTime(nextValue);
        }
      }}
      onClose={() => onChangeCalendarTimePickerTarget("")}
      language={language}
    />
    <CalendarDatePickerModal
      visible={calendarDatePickerTarget === "startDate" || calendarDatePickerTarget === "endDate" || calendarDatePickerTarget === "repeatEndDate"}
      title={calendarDatePickerTarget === "repeatEndDate" ? calendarT("repeatEndDate") : calendarDatePickerTarget === "endDate" ? calendarT("endDate") : calendarT("pickDate")}
      value={calendarDatePickerTarget === "repeatEndDate" ? (newCalendarRepeatEndDate || newCalendarDate) : calendarDatePickerTarget === "endDate" ? newCalendarEndDate : newCalendarDate}
      onChange={(nextValue) => {
        if (calendarDatePickerTarget === "repeatEndDate") {
          onChangeNewCalendarRepeatEndDate(nextValue);
        } else if (calendarDatePickerTarget === "endDate") {
          onChangeNewCalendarEndDate(nextValue);
        } else {
          onChangeNewCalendarDate(nextValue);
        }
      }}
      onClose={() => onChangeCalendarDatePickerTarget("")}
      language={language}
    />
  </View>;
}

function ZombieSiegeView({ events, selectedEvent, selectedEventId, onSelectEvent, currentUser, currentUserIsLeader, newTitle, newStartAt, newEndAt, newVoteClosesAt, newThreshold, onChangeNewTitle, onChangeNewStartAt, onChangeNewEndAt, onChangeNewVoteClosesAt, onChangeNewThreshold, onCreateEvent, onSubmitAvailability, onRunPlan, onPublishPlan, onDiscardDraft, onSaveWaveOneReview, onEndEvent }) {
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [folder, setFolder] = useState("active");
  const activeEvents = useMemo(() => (events || []).filter((event) => event.status !== "archived"), [events]);
  const archivedEvents = useMemo(() => (events || []).filter((event) => event.status === "archived"), [events]);
  const visibleEvents = folder === "archived" ? archivedEvents : activeEvents;
  const availabilityCounts = useMemo(() => (selectedEvent?.availabilityResponses || []).reduce((accumulator, response) => {
    accumulator[response.status] = (accumulator[response.status] || 0) + 1;
    return accumulator;
  }, { online: 0, offline: 0, no_response: 0 }), [selectedEvent]);
  const noResponsePlayers = useMemo(() => (selectedEvent?.availabilityResponses || []).filter((response) => response.status === "no_response"), [selectedEvent]);
  const currentReviewRows = useMemo(() => noResponsePlayers.map((response) => {
    const existing = (selectedEvent?.waveOneReview || []).find((review) => review.playerId === response.playerId);
    return {
      playerId: response.playerId,
      playerName: response.playerName,
      wallStatus: reviewDrafts[response.playerId] || existing?.wallStatus || "unknown"
    };
  }), [noResponsePlayers, reviewDrafts, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) {
      setReviewDrafts({});
      return;
    }
    const nextDrafts = {};
    for (const review of selectedEvent.waveOneReview || []) nextDrafts[review.playerId] = review.wallStatus;
    setReviewDrafts(nextDrafts);
  }, [selectedEvent]);

  function getEventTone(status) {
    if (status === "archived") return "neutral";
    if (status === "published") return "success";
    if (status === "draft") return "warning";
    return "purple";
  }

  function getAvailabilityTone(status) {
    if (status === "online") return "success";
    if (status === "offline") return "danger";
    return "warning";
  }

  function getAvailabilityLabel(status) {
    if (status === "online") return "Online";
    if (status === "offline") return "Offline";
    return "No Response";
  }

  return <View style={styles.section}>
    <AppCard variant="purple" style={styles.zombieHeroCard}>
      <SectionHeader eyebrow="Zombie Siege" title="Operational event board" detail="Track active events, member availability, draft plans, and post-wave review in one tactical surface." />
      <View style={styles.row}>
        <StatusBadge label={`${activeEvents.length} Active`} tone={activeEvents.length ? "purple" : "neutral"} />
        <StatusBadge label={folder === "archived" ? "Archive View" : "Live View"} tone={folder === "archived" ? "neutral" : "info"} />
      </View>
    </AppCard>

    <AppCard style={styles.zombieSectionCard}>
      <SectionHeader eyebrow="Folders" title="Event folders" detail="Switch between active and archived events without changing event behavior." />
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, folder === "active" && styles.modeButtonActive]} onPress={() => setFolder("active")}><Text style={[styles.secondaryButtonText, folder === "active" && styles.modeButtonTextActive]}>Active Events</Text></Pressable>
        <Pressable style={[styles.secondaryButton, styles.half, folder === "archived" && styles.modeButtonActive]} onPress={() => setFolder("archived")}><Text style={[styles.secondaryButtonText, folder === "archived" && styles.modeButtonTextActive]}>Archived Events</Text></Pressable>
      </View>
    </AppCard>

    <AppCard style={styles.zombieSectionCard}>
      <SectionHeader eyebrow="Events" title={folder === "archived" ? "Archived Zombie Siege Events" : "Active Zombie Siege Events"} detail="Select an event to review status, availability, and plan details." />
      {visibleEvents.length ? <View style={styles.zombieEventList}>
        {visibleEvents.map((event) => <Pressable key={event.id} style={[styles.voteCard, styles.zombieEventCard, selectedEventId === event.id && styles.zombieSelectedCard]} onPress={() => onSelectEvent(event.id)}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.listRowContent}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.hint}>{String(event.startAt).slice(0, 16)} to {String(event.endAt).slice(0, 16)}</Text>
            </View>
            <StatusBadge label={String(event.status || "draft").replace(/_/g, " ")} tone={getEventTone(event.status)} />
          </View>
          <Text style={styles.line}>Wave 20 Threshold: {Number(event.wave20Threshold || 0).toFixed(2)}M</Text>
          {event.publishedPlanSummary ? <Text style={styles.line}>Published survivors: {event.publishedPlanSummary.projectedSurvivors}</Text> : null}
        </Pressable>)}
      </View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>{folder === "archived" ? "No archived events" : "No active events"}</Text><Text style={styles.hint}>{folder === "archived" ? "Archived Zombie Siege events will appear here after leaders end them." : "Create or publish an event to start the operational flow."}</Text></AppCard>}
    </AppCard>

    {currentUserIsLeader && folder === "active" ? <AppCard style={styles.zombieSectionCard}>
      <SectionHeader eyebrow="Create" title="Create Zombie Siege Event" detail="Leaders can create a new event without changing the existing scheduling workflow." />
      <TextInput value={newTitle} onChangeText={onChangeNewTitle} style={styles.input} placeholder="Event title" />
      <Text style={styles.hint}>Event start: when Zombie Siege begins for your alliance.</Text>
      <TextInput value={newStartAt} onChangeText={onChangeNewStartAt} style={styles.input} placeholder="YYYY-MM-DDTHH:mm" />
      <Text style={styles.hint}>Event end: when the event window is over.</Text>
      <TextInput value={newEndAt} onChangeText={onChangeNewEndAt} style={styles.input} placeholder="YYYY-MM-DDTHH:mm" />
      <Text style={styles.hint}>Wave 20 threshold: total defending squad power needed for a base to pass wave 20.</Text>
      <TextInput value={newThreshold} onChangeText={onChangeNewThreshold} style={styles.input} placeholder="Wave 20 threshold" keyboardType="decimal-pad" />
      <PrimaryButton label="Create Event" onPress={onCreateEvent} tone="purple" />
    </AppCard> : null}

    {selectedEvent ? <>
      <AppCard style={styles.zombieSectionCard}>
        <SectionHeader eyebrow="Selected Event" title={selectedEvent.title} detail="Review the live event window, your response state, and the current planning status." />
        <View style={styles.memberStatGrid}>
          <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Status</Text><Text style={styles.memberStatValue}>{String(selectedEvent.status || "draft").replace(/_/g, " ")}</Text></View>
          <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Threshold</Text><Text style={styles.memberStatValue}>{Number(selectedEvent.wave20Threshold || 0).toFixed(2)}M</Text></View>
          <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Your Status</Text><Text style={styles.memberStatValue}>{getAvailabilityLabel(selectedEvent.myAvailabilityStatus || "no_response")}</Text></View>
        </View>
        <ListRow title="Event Window" detail={`${String(selectedEvent.startAt).slice(0, 16)} to ${String(selectedEvent.endAt).slice(0, 16)}`} />
        <ListRow title="Availability" detail={`Your current response: ${getAvailabilityLabel(selectedEvent.myAvailabilityStatus || "no_response")}`} right={<StatusBadge label={getAvailabilityLabel(selectedEvent.myAvailabilityStatus || "no_response")} tone={getAvailabilityTone(selectedEvent.myAvailabilityStatus || "no_response")} />} />
        {selectedEvent.status !== "archived" ? <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half, selectedEvent.myAvailabilityStatus === "online" && styles.modeButtonActive]} onPress={() => onSubmitAvailability(selectedEvent.id, "online")}><Text style={[styles.secondaryButtonText, selectedEvent.myAvailabilityStatus === "online" && styles.modeButtonTextActive]}>I Will Be Online</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, selectedEvent.myAvailabilityStatus === "offline" && styles.modeButtonActive]} onPress={() => onSubmitAvailability(selectedEvent.id, "offline")}><Text style={[styles.secondaryButtonText, selectedEvent.myAvailabilityStatus === "offline" && styles.modeButtonTextActive]}>I Will Be Offline</Text></Pressable>
        </View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>Archived Event</Text><Text style={styles.hint}>This event has ended and moved into the archive.</Text></AppCard>}
      </AppCard>

      {selectedEvent.myAssignment ? <AppCard style={styles.zombieAssignmentCard}>
        <SectionHeader eyebrow="Your Assignment" title="Published assignment" detail="Your current instructions stay visible here when the published plan includes you." />
        {selectedEvent.myAssignment.instructions?.map((instruction, index) => <Text key={`${selectedEvent.myAssignment.playerId}-${index}`} style={styles.line}>- {instruction}</Text>)}
      </AppCard> : null}

      {currentUserIsLeader ? <>
        <AppCard style={styles.zombieSectionCard}>
          <SectionHeader eyebrow="Leader Controls" title="Availability summary" detail="Leaders can review attendance, run the planner, and manage draft or published plans here." />
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Online</Text><Text style={styles.memberStatValue}>{availabilityCounts.online || 0}</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Offline</Text><Text style={styles.memberStatValue}>{availabilityCounts.offline || 0}</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>No Response</Text><Text style={styles.memberStatValue}>{availabilityCounts.no_response || 0}</Text></View>
          </View>
          {selectedEvent.status !== "archived" ? <View style={styles.zombieActionRow}>
            <PrimaryButton label="Run Planner" onPress={() => onRunPlan(selectedEvent.id)} style={styles.half} tone="purple" />
            {selectedEvent.draftPlan ? <SecondaryButton label="Publish To Members" onPress={() => onPublishPlan(selectedEvent.id)} style={styles.half} /> : <SecondaryButton label="Clear Draft" onPress={() => onDiscardDraft(selectedEvent.id)} style={styles.half} />}
          </View> : null}
        </AppCard>

        {selectedEvent.draftPlan ? <AppCard style={styles.zombiePlanCard}>
          <SectionHeader eyebrow="Draft Review" title="Planner output" detail="Review the draft before publishing it to members." />
          <ListRow title="Projected survivors" detail={String(selectedEvent.draftPlan.projectedSurvivors)} />
          <ListRow title="Online survivors" detail={String(selectedEvent.draftPlan.projectedOnlineSurvivors)} />
          <ListRow title="Offline survivors" detail={String(selectedEvent.draftPlan.projectedOfflineSurvivors)} />
          <ListRow title="Assignment changes" detail={String(selectedEvent.draftPlan.summary?.changedAssignments || 0)} />
          <View style={styles.zombieActionRow}>
            <SecondaryButton label="Publish Draft" onPress={() => onPublishPlan(selectedEvent.id)} style={styles.half} />
            <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onDiscardDraft(selectedEvent.id)}><Text style={styles.dangerButtonText}>Discard Draft</Text></Pressable>
          </View>
        </AppCard> : null}

        {currentReviewRows.length && selectedEvent.status !== "archived" ? <AppCard style={styles.zombiePlanCard}>
          <SectionHeader eyebrow="Post-Wave-1" title="No-response review" detail="Review no-response players and record whether they had troops on their wall after wave 1." />
          <View style={styles.zombieEventList}>
            {currentReviewRows.map((row) => <AppCard key={row.playerId} style={styles.voteCard}>
              <Text style={styles.cardTitle}>{row.playerName}</Text>
              <View style={styles.row}>
                <Pressable style={[styles.secondaryButton, styles.half, row.wallStatus === "had_wall" && styles.modeButtonActive]} onPress={() => setReviewDrafts((current) => ({ ...current, [row.playerId]: "had_wall" }))}><Text style={[styles.secondaryButtonText, row.wallStatus === "had_wall" && styles.modeButtonTextActive]}>Had Troops On Wall</Text></Pressable>
                <Pressable style={[styles.secondaryButton, styles.half, row.wallStatus === "no_wall" && styles.modeButtonActive]} onPress={() => setReviewDrafts((current) => ({ ...current, [row.playerId]: "no_wall" }))}><Text style={[styles.secondaryButtonText, row.wallStatus === "no_wall" && styles.modeButtonTextActive]}>No Troops On Wall</Text></Pressable>
              </View>
            </AppCard>)}
          </View>
          <PrimaryButton label="Save Wave 1 Review" onPress={() => onSaveWaveOneReview(selectedEvent.id, currentReviewRows)} tone="purple" />
        </AppCard> : null}

        {selectedEvent.publishedPlan ? <AppCard style={styles.zombiePlanCard}>
          <SectionHeader eyebrow="Published Plan" title="Member-facing summary" detail="Published outputs stay visible here for leader review after release." />
          <ListRow title="Projected survivors" detail={String(selectedEvent.publishedPlan.projectedSurvivors)} />
          <ListRow title="Protected players" detail={String(selectedEvent.publishedPlan.summary?.protectedCount || 0)} />
          <ListRow title="Sacrificed donors" detail={String(selectedEvent.publishedPlan.summary?.sacrificedCount || 0)} />
        </AppCard> : null}

        {selectedEvent.status !== "archived" ? <AppCard variant="danger" style={styles.settingsDangerCard}>
          <SectionHeader eyebrow="Danger Zone" title="Event controls" detail="Ending the event is visually distinct, but the underlying event workflow is unchanged." />
          <Pressable style={styles.dangerButton} onPress={() => onEndEvent(selectedEvent.id)}><Text style={styles.dangerButtonText}>Event Has Ended</Text></Pressable>
        </AppCard> : null}
      </> : null}
    </> : null}
  </View>;
}
function FeedbackView({ feedbackEntries, newFeedbackText, onChangeNewFeedbackText, onSubmitFeedback, onSubmitFeedbackComment, t }) {
  const buildLabel = APP_BUILD ? `v${APP_VERSION} (${APP_BUILD})` : `v${APP_VERSION}`;
  const [commentDrafts, setCommentDrafts] = useState({});

  useEffect(() => {
    setCommentDrafts((current) => Object.fromEntries(Object.entries(current).filter(([entryId]) => feedbackEntries.some((entry) => entry.id === entryId))));
  }, [feedbackEntries]);

  function updateCommentDraft(entryId, value) {
    setCommentDrafts((current) => ({ ...current, [entryId]: value }));
  }

  return <View style={styles.section}>
    <AppCard style={styles.feedbackHeroCard}>
      <SectionHeader eyebrow="Feedback" title={t("feedbackTitle")} detail={t("feedbackHint")} />
      <StatusBadge label={feedbackEntries.length ? `${feedbackEntries.length} entries` : "No entries"} tone={feedbackEntries.length ? "info" : "neutral"} />
    </AppCard>

    <AppCard style={styles.feedbackComposerCard}>
      <SectionHeader eyebrow="Submit" title="Share feedback" detail="Send clear notes to the alliance team without changing the existing submission flow." />
      <View style={styles.memberStatCard}>
        <Text style={styles.memberStatLabel}>Current Build</Text>
        <Text style={styles.memberStatValue}>{buildLabel}</Text>
      </View>
      <TextInput value={newFeedbackText} onChangeText={onChangeNewFeedbackText} style={[styles.input, styles.textArea]} placeholder={t("feedbackExample")} multiline />
      <PrimaryButton label={t("submitFeedback")} onPress={onSubmitFeedback} />
    </AppCard>

    <AppCard style={styles.feedbackHistoryCard}>
      <SectionHeader eyebrow="Recent" title={t("allianceFeedback")} detail="Recent feedback and follow-up comments stay readable in a single history stream." />
      {feedbackEntries.length ? <View style={styles.feedbackEntryList}>
        {feedbackEntries.map((entry) => {
          const commentDraft = commentDrafts[entry.id] || "";
          return <AppCard key={entry.id} style={styles.feedbackEntryCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.listRowContent}>
                <Text style={styles.cardTitle}>{entry.createdByName || "Member"}</Text>
                <Text style={styles.hint}>{String(entry.createdAt).slice(0, 10)}</Text>
              </View>
              <StatusBadge label={`${(entry.comments || []).length} comments`} tone={(entry.comments || []).length ? "info" : "neutral"} />
            </View>
            <Text style={styles.line}>{entry.message}</Text>
            <Text style={styles.hint}>{t("feedbackFrom", { name: entry.createdByName || "Member", date: String(entry.createdAt).slice(0, 10) })}</Text>
            <View style={styles.feedbackCommentList}>
              {(entry.comments || []).length ? entry.comments.map((comment) => <View key={comment.id} style={styles.feedbackCommentCard}>
                <Text style={styles.line}>{comment.message}</Text>
                <Text style={styles.hint}>{comment.createdByName || "Member"} � {String(comment.createdAt).slice(0, 10)}</Text>
              </View>) : <Text style={styles.hint}>No comments yet.</Text>}
            </View>
            <View style={styles.feedbackCommentComposer}>
              <TextInput value={commentDraft} onChangeText={(value) => updateCommentDraft(entry.id, value)} style={[styles.input, styles.feedbackCommentInput]} placeholder="Add a comment" multiline />
              <SecondaryButton label="Comment" onPress={() => onSubmitFeedbackComment(entry.id, commentDraft, () => updateCommentDraft(entry.id, ""))} />
            </View>
          </AppCard>;
        })}
      </View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>No feedback yet</Text><Text style={styles.hint}>{t("noFeedback")}</Text></AppCard>}
    </AppCard>
  </View>;
}
function AllianceView({ alliance, account, currentUser, currentUserIsLeader, joinRequests, newMemberName, newMemberRank, newMemberPower, newAllianceCode, onChangeNewMemberName, onChangeNewMemberRank, onChangeNewMemberPower, onChangeNewAllianceCode, onAddMember, onApproveJoinRequest, onRejectJoinRequest, onLeaveAlliance, onRotateAllianceCode, onSignOut, t, language, onChangeLanguage, showPushNotificationControls, showPushNotificationsPrompt, notificationSetupInFlight, onSetDesertStormVoteNotificationsEnabled, onEnablePushNotifications }) {
  const notificationsEnabled = currentUser?.desertStormVoteNotificationsEnabled !== false;

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard}>
      <SectionHeader eyebrow="Settings" title={t("allianceTitle")} detail="Manage account context, app preferences, alerts, and alliance controls from grouped sections." />
      <View style={styles.row}>
        <StatusBadge label={currentUserIsLeader ? "Leader Access" : "Member Access"} tone={currentUserIsLeader ? "info" : "neutral"} />
        <StatusBadge label={joinRequests?.length ? `${joinRequests.length} Pending` : "Stable"} tone={joinRequests?.length ? "warning" : "success"} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard}>
      <SectionHeader eyebrow="Account" title="Signed-in context" detail="Current account, alliance, and player identity are grouped here for quick reference." />
      <ListRow title={t("accountLabel", { value: account?.username })} />
      <ListRow title={t("allianceLabel", { value: alliance?.name })} />
      <ListRow title={t("codeLabel", { value: alliance?.code })} />
      <ListRow title={t("signedInAsPlayer", { value: currentUser?.name })} />
    </AppCard>

    {showPushNotificationControls ? <AppCard style={styles.settingsSectionCard}>
      <SectionHeader eyebrow="Notifications" title="Desert Storm alerts" detail="Manage vote-open alert preferences without changing reminder or event logic." />
      <ListRow title="Desert Storm vote alerts" detail={notificationsEnabled ? "Enabled for your account." : "Disabled for your account."} right={<StatusBadge label={notificationsEnabled ? "Enabled" : "Disabled"} tone={notificationsEnabled ? "success" : "neutral"} />} />
      <View style={styles.row}>
        <PrimaryButton label="Enable Alerts" onPress={() => onSetDesertStormVoteNotificationsEnabled(true)} style={styles.half} disabled={notificationsEnabled} />
        <SecondaryButton label="Disable Alerts" onPress={() => onSetDesertStormVoteNotificationsEnabled(false)} style={styles.half} disabled={!notificationsEnabled} />
      </View>
      {showPushNotificationsPrompt ? <AppCard style={styles.settingsNestedCard}>
        <Text style={styles.cardTitle}>Enable push notifications</Text>
        <Text style={styles.hint}>Turn on device notifications to receive Desert Storm vote alerts on this device.</Text>
        <PrimaryButton label={notificationSetupInFlight ? "Enabling..." : "Enable Notifications"} onPress={onEnablePushNotifications} disabled={notificationSetupInFlight} tone="blue" />
      </AppCard> : null}
    </AppCard> : null}

    <AppCard style={styles.settingsSectionCard}>
      <SectionHeader eyebrow="Preferences" title="Language" detail="Update app-level preferences without changing alliance data." />
      <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard}>
      <SectionHeader eyebrow="App Controls" title="Session and device actions" detail="Keep account-level controls separated from alliance management actions." />
      <SecondaryButton label={t("signOut")} onPress={onSignOut} />
    </AppCard>

    {currentUserIsLeader ? <>
      <AppCard style={styles.settingsSectionCard}>
        <SectionHeader eyebrow="Requests" title={t("pendingJoinRequests")} detail="Approve or reject new join requests without leaving the settings workflow." />
        {joinRequests?.length ? <View style={styles.settingsStack}>
          {joinRequests.map((req) => <AppCard key={req.id} style={styles.settingsNestedCard}>
            <Text style={styles.cardTitle}>{req.displayName}</Text>
            <Text style={styles.hint}>{t("requestedWithCode", { code: req.allianceCode })}</Text>
            <View style={styles.row}>
              <PrimaryButton label={t("approve")} onPress={() => onApproveJoinRequest(req.id)} style={styles.half} />
              <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onRejectJoinRequest(req.id)}><Text style={styles.dangerButtonText}>{t("reject")}</Text></Pressable>
            </View>
          </AppCard>)}
        </View> : <AppCard style={styles.calendarEmptyCard}><Text style={styles.statusTitle}>{t("noPendingRequests")}</Text><Text style={styles.hint}>New join requests will appear here when they are ready for review.</Text></AppCard>}
      </AppCard>

      <AppCard style={styles.settingsSectionCard}>
        <SectionHeader eyebrow="Alliance" title={t("rotateCode")} detail="Rotate or update the alliance code with a single clear action." />
        <TextInput value={newAllianceCode} onChangeText={onChangeNewAllianceCode} style={styles.input} />
        <PrimaryButton label={t("updateCode")} onPress={onRotateAllianceCode} />
      </AppCard>

      <AppCard style={styles.settingsSectionCard}>
        <SectionHeader eyebrow="Roster" title={t("addMember")} detail="Leaders can add members directly from settings without changing roster behavior." />
        <TextInput value={newMemberName} onChangeText={onChangeNewMemberName} style={styles.input} placeholder={t("name")} />
        <Text style={styles.hint}>{POWER_INPUT_HINT}</Text>
        <View style={styles.row}>
          <RankSelector value={newMemberRank} onChange={onChangeNewMemberRank} style={styles.half} />
          <TextInput value={newMemberPower} onChangeText={onChangeNewMemberPower} style={[styles.input, styles.half]} placeholder={t("power")} keyboardType="decimal-pad" />
        </View>
        <PrimaryButton label={t("addMember")} onPress={onAddMember} />
      </AppCard>
    </> : <AppCard variant="danger" style={styles.settingsDangerCard}>
      <SectionHeader eyebrow="Danger Zone" title={t("memberOptions")} detail="Important account and alliance actions are isolated here so they stay clear but restrained." />
      <Text style={styles.hint}>{t("leaveAnyTime")}</Text>
      <Pressable style={styles.dangerButton} onPress={() => Alert.alert(t("leaveAllianceTitle"), t("leaveAllianceConfirm"), [{ text: t("cancel"), style: "cancel" }, { text: t("leave"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{t("leaveAlliance")}</Text></Pressable>
    </AppCard>}
  </View>;
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











