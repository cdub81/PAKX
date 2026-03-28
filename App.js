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
const CALENDAR_MODAL_BACKDROP_STYLE = { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(20, 26, 20, 0.38)" };
const CALENDAR_MODAL_SHEET_SHELL_STYLE = { width: "100%" };
const CALENDAR_MODAL_CARD_STYLE = { backgroundColor: "#fbf7ee", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 24, gap: 14, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#e2d8c5" };
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

if (Platform.OS !== "android") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false
    })
  });
}
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
        if (Platform.OS === "android") {
          if (alive) {
            setNotificationPermissionStatus("disabled");
          }
        } else {
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
    if (Platform.OS === "android") {
      return undefined;
    }
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
      lightColor: "#1f5c4d"
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

  if (!sessionReady) return <SafeAreaView style={styles.safeArea}><ExpoStatusBar style="dark" /><StatusBar barStyle="dark-content" /><View style={styles.loadingScreen}><ActivityIndicator color="#1f5c4d" size="large" /><Text style={styles.hint}>{t("restoringSession")}</Text></View></SafeAreaView>;

  if (!session.token) return <AuthScreen {...{ authMode, setAuthMode, authUsername, setAuthUsername, authPassword, setAuthPassword, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onSignIn={() => run(async () => { const url = normalizeBaseUrl(backendUrlInput); const result = await signIn(url, { username: authUsername, password: authPassword }); setSetupMode("join"); await persistSession({ backendUrl: url, token: result.token }); await refresh(result.token, url); })} onCreate={() => run(async () => { const url = normalizeBaseUrl(backendUrlInput); const result = await createAccount(url, { username: authUsername, password: authPassword }); setSetupMode("join"); await persistSession({ backendUrl: url, token: result.token }); setAccount(result.account); setAlliance(null); setCurrentUser(null); })} />;

  if (session.token && !alliance) return <AllianceSetupScreen {...{ account, setupMode, setSetupMode, allianceCodeInput, setAllianceCodeInput, allianceNameInput, setAllianceNameInput, alliancePreview, joinRequest, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onPreview={() => run(async () => setAlliancePreview(await getAlliancePreview(normalizeBaseUrl(backendUrlInput), allianceCodeInput)))} onJoin={() => run(async () => { const result = await joinAlliance(session.backendUrl, session.token, allianceCodeInput); setAccount(result.account); setJoinRequest(result.joinRequest); setAlliance(null); setCurrentUser(null); setAlliancePreview(result.alliance); setSetupMode("join"); })} onCreateAlliance={() => run(async () => { const result = await createAlliance(session.backendUrl, session.token, { name: allianceNameInput, code: allianceCodeInput }); setAccount(result.account); setAlliance(result.alliance); setCurrentUser(result.player); setJoinRequest(null); setNewAllianceCode(result.alliance.code); })} onRefreshStatus={() => run(async () => { await refresh(); })} onSignOut={signOut} />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ExpoStatusBar style="dark" />
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.keyboardShell} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
        <View style={styles.screen}>
          <Text style={styles.title}>{alliance?.name}</Text>
          <Text style={styles.hint}>{t("signedInAs", { name: account?.displayName, rank: currentUser?.rank })}</Text>
          {leader && joinRequests.length ? <Pressable style={styles.alertBanner} onPress={() => setActiveTab("alliance")}><Text style={styles.alertBannerTitle}>{joinRequests.length === 1 ? t("onePlayerWaiting") : t("playersWaiting", { count: joinRequests.length })}</Text><Text style={styles.alertBannerText}>{t("tapReviewRequests")}</Text></Pressable> : null}
          {activeTab === "myInfo" && desertStormVoteNeedsResponse ? <Pressable style={styles.voteBanner} onPress={() => openDesertStormVoteArea()}><Text style={styles.voteBannerTitle}>Desert Storm vote is live - tap to respond</Text><Text style={styles.voteBannerText}>Open the Desert Storm tab to submit your vote.</Text></Pressable> : null}
          {loading ? <ActivityIndicator color="#1f5c4d" /> : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {tabs.map((tab) => <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tabLabel(tab, leader, joinRequests, t)}</Text></Pressable>)}
          </ScrollView>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor="#1f5c4d" colors={["#1f5c4d"]} />}>
            {activeTab === "myInfo" ? <MyInfoViewV2 currentUser={currentUser} desertStormAssignment={desertStormAssignment} desertStormVoteStatus={activeDesertStormVote ? (desertStormVoteNeedsResponse ? "needed" : desertStormVoteSubmitted ? "submitted" : "") : ""} todayCalendarEntries={todayCalendarEntries} currentZombieSiegeEvent={selectedZombieSiegeEvent} currentZombieSiegeAssignment={currentZombieSiegeAssignment} onChangeField={saveMyInfo} onOpenDesertStormVote={activeDesertStormVote ? () => openDesertStormVoteArea() : null} showPushNotificationsPrompt={shouldShowPushNotificationsPrompt} notificationSetupInFlight={notificationSetupInFlight} onSetDesertStormVoteNotificationsEnabled={handleSetDesertStormVoteNotificationsEnabled} onEnablePushNotifications={() => run(async () => {
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
            {activeTab === "alliance" ? <AllianceView alliance={alliance} account={account} currentUser={currentUser} currentUserIsLeader={leader} joinRequests={joinRequests} newMemberName={newMemberName} newMemberRank={newMemberRank} newMemberPower={newMemberPower} newAllianceCode={newAllianceCode} onChangeNewMemberName={setNewMemberName} onChangeNewMemberRank={setNewMemberRank} onChangeNewMemberPower={setNewMemberPower} onChangeNewAllianceCode={setNewAllianceCode} onAddMember={() => run(async () => { await addMember(session.backendUrl, session.token, { name: newMemberName, rank: newMemberRank, overallPower: Number.parseFloat(newMemberPower) || 0 }); setNewMemberName(""); setNewMemberRank("R1"); setNewMemberPower(""); await refresh(); })} onApproveJoinRequest={(requestId) => run(async () => { await approveJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onRejectJoinRequest={(requestId) => run(async () => { await rejectJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onLeaveAlliance={() => run(async () => { const result = await leaveAlliance(session.backendUrl, session.token); setAccount(result.account); setAlliance(null); setCurrentUser(null); setJoinRequest(null); setJoinRequests([]); setSetupMode("join"); setAlliancePreview(null); setNewAllianceCode(""); setActiveTab("myInfo"); })} onRotateAllianceCode={() => run(async () => { await updateAllianceCode(session.backendUrl, session.token, newAllianceCode); await refresh(); })} onSignOut={signOut} t={t} language={language} onChangeLanguage={changeLanguage} /> : null}
            {activeTab === "feedback" ? <FeedbackView feedbackEntries={feedbackEntries} newFeedbackText={newFeedbackText} onChangeNewFeedbackText={setNewFeedbackText} onSubmitFeedback={() => run(async () => { await addFeedbackRequest(session.backendUrl, session.token, newFeedbackText); setNewFeedbackText(""); await refresh(); })} onSubmitFeedbackComment={(feedbackEntryId, message, reset) => run(async () => { await addFeedbackCommentRequest(session.backendUrl, session.token, feedbackEntryId, message); if (typeof reset === "function") reset(); await refresh(); })} t={t} /> : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={Boolean(playerModal)} animationType="slide" onRequestClose={() => setPlayerModal(null)}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView style={styles.keyboardShell} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
            <View style={styles.screen}>
              <Text style={styles.title}>{t("choosePlayer")}</Text>
              {playerModal ? <View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, playerPickerMode === "voted" && styles.modeButtonActive]} onPress={() => setPlayerPickerMode("voted")}><Text style={[styles.secondaryButtonText, playerPickerMode === "voted" && styles.modeButtonTextActive]}>{t("votedMembers")}</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, playerPickerMode === "all" && styles.modeButtonActive]} onPress={() => setPlayerPickerMode("all")}><Text style={[styles.secondaryButtonText, playerPickerMode === "all" && styles.modeButtonTextActive]}>{t("entireAlliance")}</Text></Pressable></View> : null}
              {playerModal && selectedDesertStormEvent?.vote && playerPickerMode === "voted" ? <Text style={styles.hint}>{playerModal.memberType === "Sub" ? `Showing members who voted "Sub" for ${selectedDesertStormEvent.title}.` : `Showing members who voted "Play" for ${selectedDesertStormEvent.title}.`}</Text> : null}
              {playerModal && playerPickerMode === "all" ? <Text style={styles.hint}>{t("showingAllAlliance")}</Text> : null}
              <TextInput value={searchText} onChangeText={setSearchText} style={styles.input} placeholder={t("searchNameOrRank")} />
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
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
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function LanguageSelector({ language, onChangeLanguage, t }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{t("language")}</Text><View style={styles.languageRow}>{SUPPORTED_LANGUAGES.map((entry) => <Pressable key={entry.code} style={[styles.languageButton, language === entry.code && styles.languageButtonActive]} onPress={() => onChangeLanguage(entry.code)}><Text style={[styles.languageButtonText, language === entry.code && styles.languageButtonTextActive]}>{entry.label}</Text></Pressable>)}</View></View>;
}

function AuthScreen(props) {
  const { authMode, setAuthMode, authUsername, setAuthUsername, authPassword, setAuthPassword, loading, errorMessage, onSignIn, onCreate, language, onChangeLanguage, t } = props;
  return <SafeAreaView style={styles.safeArea}><ExpoStatusBar style="dark" /><StatusBar barStyle="dark-content" /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.title}>{t("appTitle")}</Text><LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} /><View style={styles.row}><Pressable style={[styles.button, styles.half]} onPress={() => setAuthMode("signIn")}><Text style={styles.buttonText}>{t("authSignIn")}</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half]} onPress={() => setAuthMode("create")}><Text style={styles.secondaryButtonText}>{t("authCreateAccount")}</Text></Pressable></View>{authMode ? <View style={styles.card}><Text style={styles.cardTitle}>{authMode === "signIn" ? t("authSignIn") : t("authCreateAccount")}</Text><TextInput value={authUsername} onChangeText={setAuthUsername} style={styles.input} placeholder={t("username")} autoCapitalize="none" /><TextInput value={authPassword} onChangeText={setAuthPassword} style={styles.input} placeholder={t("password")} secureTextEntry /><Pressable style={styles.button} onPress={authMode === "signIn" ? onSignIn : onCreate}><Text style={styles.buttonText}>{authMode === "signIn" ? t("authSignIn") : t("authCreateAccount")}</Text></Pressable></View> : null}{loading ? <ActivityIndicator color="#1f5c4d" /> : null}{errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}</ScrollView></SafeAreaView>;
}

function AllianceSetupScreen(props) {
  const { account, setupMode, setSetupMode, allianceCodeInput, setAllianceCodeInput, allianceNameInput, setAllianceNameInput, alliancePreview, joinRequest, loading, errorMessage, onPreview, onJoin, onCreateAlliance, onRefreshStatus, onSignOut, language, onChangeLanguage, t } = props;
  const mode = setupMode === "create" ? "create" : "join";
  return <SafeAreaView style={styles.safeArea}><ExpoStatusBar style="dark" /><StatusBar barStyle="dark-content" /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.title}>{t("welcome", { name: account?.displayName })}</Text><LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} />{joinRequest ? <View style={styles.card}><Text style={styles.cardTitle}>{t("joinRequestPending")}</Text><Text style={styles.line}>{t("codeLabel", { value: joinRequest.allianceCode })}</Text><Text style={styles.line}>{t("pendingApproval")}</Text><Pressable style={styles.button} onPress={onRefreshStatus}><Text style={styles.buttonText}>{t("refreshStatus")}</Text></Pressable></View> : <><Text style={styles.hint}>{t("notInAlliance")}</Text><View style={styles.row}><Pressable style={[styles.button, styles.half]} onPress={() => setSetupMode("join")}><Text style={styles.buttonText}>{t("joinAlliance")}</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half]} onPress={() => setSetupMode("create")}><Text style={styles.secondaryButtonText}>{t("createAlliance")}</Text></Pressable></View><View style={styles.card}><Text style={styles.cardTitle}>{mode === "create" ? t("createAlliance") : t("joinAlliance")}</Text>{mode === "create" ? <TextInput value={allianceNameInput} onChangeText={setAllianceNameInput} style={styles.input} placeholder={t("allianceName")} /> : null}<TextInput value={allianceCodeInput} onChangeText={setAllianceCodeInput} style={styles.input} placeholder={t("allianceCode")} autoCapitalize="characters" />{mode === "join" ? <><Pressable style={styles.secondaryButton} onPress={onPreview}><Text style={styles.secondaryButtonText}>{t("previewAlliance")}</Text></Pressable>{alliancePreview ? <Text style={styles.line}>{t("foundAlliance", { name: alliancePreview.name })}</Text> : null}<Pressable style={styles.button} onPress={onJoin}><Text style={styles.buttonText}>{t("joinAlliance")}</Text></Pressable></> : <Pressable style={styles.button} onPress={onCreateAlliance}><Text style={styles.buttonText}>{t("createAlliance")}</Text></Pressable>}</View></>}{<Pressable style={styles.secondaryButton} onPress={onSignOut}><Text style={styles.secondaryButtonText}>{t("signOut")}</Text></Pressable>}{loading ? <ActivityIndicator color="#1f5c4d" /> : null}{errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}</ScrollView></SafeAreaView>;
}

function Dashboard({ dashboard }) { return <View style={styles.dashboardShell}><Text style={styles.cardTitle}>Leader Dashboard</Text><View style={styles.metricGrid}><View style={styles.dashboardMetricA}><Text style={styles.metricLabel}>Task Force A</Text><Text style={styles.metricPanelValue}>{dashboard.taskForceA.totalPower.toFixed(2)}M</Text></View><View style={styles.dashboardMetricB}><Text style={styles.metricLabel}>Task Force B</Text><Text style={styles.metricPanelValue}>{dashboard.taskForceB.totalPower.toFixed(2)}M</Text></View></View><View style={styles.dashboardCompare}><Text style={styles.metricLabel}>Difference vs Task Force A</Text><Text style={styles.dashboardCompareValue}>{dashboard.differenceVsA.toFixed(2)}M</Text></View></View>; }
function RankSelector({ value, onChange, disabled = false, style }) {
  const [open, setOpen] = useState(false);
  const selected = RANK_OPTIONS.includes(value) ? value : "R1";

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return <View style={[styles.rankSelectorWrap, style]}>
    <Pressable style={[styles.rankSelectorButton, disabled && styles.disabled]} onPress={() => !disabled && setOpen((current) => !current)}>
      <Text style={styles.pickText}>{selected}</Text>
      <Text style={styles.hint}>{open ? "Hide" : "Choose"}</Text>
    </Pressable>
    {open ? <View style={styles.rankDropdown}>
      {RANK_OPTIONS.map((rank) => <Pressable key={rank} style={[styles.rankOption, rank === selected && styles.rankOptionActive]} onPress={() => {
        onChange(rank);
        setOpen(false);
      }}>
        <Text style={[styles.rankOptionText, rank === selected && styles.rankOptionTextActive]}>{rank}</Text>
      </Pressable>)}
    </View> : null}
  </View>;
}
function MyInfoView({ currentUser, desertStormAssignment, desertStormVoteStatus, todayCalendarEntries, currentZombieSiegeEvent, currentZombieSiegeAssignment, onChangeField, onOpenDesertStormVote, showPushNotificationsPrompt, notificationSetupInFlight, onSetDesertStormVoteNotificationsEnabled, onEnablePushNotifications, onDismissPushNotificationsPrompt, t }) {
  const s = currentUser?.squadPowers || { squad1: 0, squad2: 0, squad3: 0, squad4: 0 };
  const appearances = currentUser?.desertStormAppearances || [];
  const activeZombieSiegeEvent = currentZombieSiegeEvent?.status === "archived" ? null : currentZombieSiegeEvent;
  const activeZombieSiegeAssignment = activeZombieSiegeEvent ? currentZombieSiegeAssignment : null;
  const desertStormNotificationsEnabled = currentUser?.desertStormVoteNotificationsEnabled !== false;
  const [draftOverallPower, setDraftOverallPower] = useState(String(currentUser?.overallPower ?? 0));
  const [draftHeroPower, setDraftHeroPower] = useState(String(currentUser?.heroPower ?? 0));
  const [draftSquadPowers, setDraftSquadPowers] = useState({ squad1: String(s.squad1), squad2: String(s.squad2), squad3: String(s.squad3), squad4: String(s.squad4) });
  const resultLabels = { pending: t("resultPending"), win: t("resultWin"), loss: t("resultLoss"), won: t("resultWin"), lost: t("resultLoss") };

  useEffect(() => {
    setDraftOverallPower(String(currentUser?.overallPower ?? 0));
  }, [currentUser?.overallPower]);

  useEffect(() => {
    setDraftHeroPower(String(currentUser?.heroPower ?? 0));
  }, [currentUser?.heroPower]);

  useEffect(() => {
    setDraftSquadPowers({ squad1: String(s.squad1), squad2: String(s.squad2), squad3: String(s.squad3), squad4: String(s.squad4) });
  }, [s.squad1, s.squad2, s.squad3, s.squad4]);

  return <View style={styles.profileCard}><View style={styles.profileHeader}><View><Text style={styles.profileEyebrow}>{t("signedInPlayer")}</Text><Text style={styles.cardTitle}>{currentUser?.name}</Text><Text style={styles.profileRank}>{t("rank")} {currentUser?.rank}</Text></View><View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{currentUser?.rank}</Text></View></View><View style={styles.metricGrid}><View style={styles.metricPanel}><Text style={styles.metricLabel}>{t("totalBasePower")}</Text><Text style={styles.metricPanelValue}>{Number(currentUser?.overallPower || 0).toFixed(2)}M</Text></View><View style={styles.metricPanel}><Text style={styles.metricLabel}>{t("totalSquadPower")}</Text><Text style={styles.metricPanelValue}>{Number(currentUser?.totalSquadPower || 0).toFixed(2)}M</Text></View></View><View style={styles.statusCard}><Text style={styles.statusEyebrow}>Push Notifications</Text><Text style={styles.statusTitle}>Desert Storm vote alerts</Text><Text style={styles.statusLine}>{!desertStormNotificationsEnabled ? "Disabled. You will not get Desert Storm vote-open push notifications." : currentUser?.hasExpoPushToken ? "Enabled on this device." : "Enabled. Finish notification setup on this device to receive alerts."}</Text><View style={styles.row}><Pressable style={[styles.button, styles.half, desertStormNotificationsEnabled && styles.disabledButton]} disabled={desertStormNotificationsEnabled} onPress={() => onSetDesertStormVoteNotificationsEnabled(true)}><Text style={styles.buttonText}>Enable</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, !desertStormNotificationsEnabled && styles.disabled]} disabled={!desertStormNotificationsEnabled} onPress={() => onSetDesertStormVoteNotificationsEnabled(false)}><Text style={styles.secondaryButtonText}>Disable</Text></Pressable></View></View>{showPushNotificationsPrompt ? <View style={styles.statusCard}><Text style={styles.statusEyebrow}>Push Notifications</Text><Text style={styles.statusTitle}>Enable Desert Storm alerts</Text><Text style={styles.statusLine}>Turn on push notifications to get a heads-up when the Desert Storm vote goes live.</Text><View style={styles.row}><Pressable style={[styles.button, styles.half, notificationSetupInFlight && styles.disabledButton]} disabled={notificationSetupInFlight} onPress={onEnablePushNotifications}><Text style={styles.buttonText}>{notificationSetupInFlight ? "Enabling..." : "Enable"}</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half]} onPress={onDismissPushNotificationsPrompt}><Text style={styles.secondaryButtonText}>Later</Text></Pressable></View></View> : null}<Pressable disabled={!onOpenDesertStormVote} onPress={() => onOpenDesertStormVote && onOpenDesertStormVote()} style={[styles.statusCard, desertStormVoteStatus === "needed" ? styles.statusCardInactive : desertStormAssignment ? styles.statusCardActive : styles.statusCardInactive]}><Text style={styles.statusEyebrow}>{t("desertStormTitle")}</Text><Text style={styles.statusTitle}>{desertStormAssignment ? t("selectedForDesertStorm") : t("notCurrentlyAssigned")}</Text>{desertStormVoteStatus === "needed" ? <Text style={styles.statusLine}>Response needed</Text> : null}{desertStormVoteStatus === "submitted" ? <Text style={styles.statusLine}>Vote submitted</Text> : null}{desertStormAssignment ? <><Text style={styles.statusLine}>{t("taskForceLabel", { value: desertStormAssignment.taskForceLabel })}</Text><Text style={styles.statusLine}>{t("squadLabel", { value: desertStormAssignment.squadLabel })}</Text><Text style={styles.statusLine}>{t("slotLabel", { value: desertStormAssignment.slotLabel })}</Text></> : <Text style={styles.statusLine}>{t("notListedInTaskForces")}</Text>}{onOpenDesertStormVote ? <Text style={styles.selectedPlayerHint}>Tap to open the Desert Storm vote</Text> : null}</Pressable><View style={styles.statusCard}><Text style={styles.statusEyebrow}>Key Things Today</Text><Text style={styles.statusTitle}>{todayCalendarEntries?.length ? `${todayCalendarEntries.length} item${todayCalendarEntries.length === 1 ? "" : "s"} on today's schedule` : "Nothing scheduled for today"}</Text>{todayCalendarEntries?.length ? todayCalendarEntries.map((entry) => <View key={entry.id} style={styles.todayItem}><Text style={styles.todayItemTitle}>{entry.title}</Text>{entry.description ? <Text style={styles.statusLine}>{entry.description}</Text> : null}</View>) : <Text style={styles.statusLine}>Any calendar events scheduled for today will show up here.</Text>}</View><View style={[styles.statusCard, activeZombieSiegeAssignment ? styles.statusCardActive : styles.statusCardInactive]}><Text style={styles.statusEyebrow}>Zombie Siege</Text><Text style={styles.statusTitle}>{activeZombieSiegeAssignment ? activeZombieSiegeEvent?.title || "Current Published Plan" : activeZombieSiegeEvent ? "No published assignment yet" : "No active Zombie Siege event"}</Text>{activeZombieSiegeEvent ? <><Text style={styles.statusLine}>{String(activeZombieSiegeEvent.startAt || "").slice(0, 16)} to {String(activeZombieSiegeEvent.endAt || "").slice(0, 16)}</Text><Text style={styles.statusLine}>Availability: {activeZombieSiegeEvent.myAvailabilityStatus || "no_response"}</Text>{activeZombieSiegeAssignment?.instructions?.length ? activeZombieSiegeAssignment.instructions.map((instruction, index) => <Text key={`${activeZombieSiegeAssignment.playerId}-${index}`} style={styles.statusLine}>• {instruction}</Text>) : <Text style={styles.statusLine}>Leaders have not published a Zombie Siege plan for you yet.</Text>}</> : <Text style={styles.statusLine}>When leaders create an event, your instructions will show here.</Text>}</View><View style={styles.statusCard}><Text style={styles.statusEyebrow}>{t("desertStormRecord")}</Text><Text style={styles.statusTitle}>{appearances.length ? t("lockInsPlayed", { count: appearances.length }) : t("noLockedHistoryYet")}</Text>{appearances.length ? appearances.map((appearance) => <Text key={appearance.id} style={styles.statusLine}>{appearance.lockedInAt.slice(0, 10)} - {appearance.title} - {resultLabels[appearance.result] || appearance.result}</Text>) : <Text style={styles.statusLine}>{t("appearancesWillShow")}</Text>}</View><View style={styles.section}><Text style={styles.sectionTitle}>{t("basePowerSection")}</Text><Text style={styles.hint}>{POWER_INPUT_HINT}</Text><TextInput value={draftOverallPower} onChangeText={setDraftOverallPower} onEndEditing={() => onChangeField("overallPower", draftOverallPower)} onBlur={() => onChangeField("overallPower", draftOverallPower)} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.section}><Text style={styles.sectionTitle}>{t("squadPowerBreakdown")}</Text><Text style={styles.hint}>{POWER_INPUT_HINT}</Text><View style={styles.row}><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 1 })}</Text><TextInput value={draftSquadPowers.squad1} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad1: v }))} onEndEditing={() => onChangeField("squad1", draftSquadPowers.squad1)} onBlur={() => onChangeField("squad1", draftSquadPowers.squad1)} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 2 })}</Text><TextInput value={draftSquadPowers.squad2} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad2: v }))} onEndEditing={() => onChangeField("squad2", draftSquadPowers.squad2)} onBlur={() => onChangeField("squad2", draftSquadPowers.squad2)} style={styles.input} keyboardType="decimal-pad" /></View></View><View style={styles.row}><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 3 })}</Text><TextInput value={draftSquadPowers.squad3} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad3: v }))} onEndEditing={() => onChangeField("squad3", draftSquadPowers.squad3)} onBlur={() => onChangeField("squad3", draftSquadPowers.squad3)} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 4 })}</Text><TextInput value={draftSquadPowers.squad4} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad4: v }))} onEndEditing={() => onChangeField("squad4", draftSquadPowers.squad4)} onBlur={() => onChangeField("squad4", draftSquadPowers.squad4)} style={styles.input} keyboardType="decimal-pad" /></View></View></View></View>;
}
function MyInfoViewV2({ currentUser, desertStormAssignment, desertStormVoteStatus, todayCalendarEntries, currentZombieSiegeEvent, currentZombieSiegeAssignment, onChangeField, onOpenDesertStormVote, showPushNotificationsPrompt, notificationSetupInFlight, onSetDesertStormVoteNotificationsEnabled, onEnablePushNotifications, onDismissPushNotificationsPrompt, t }) {
  const squadPowers = currentUser?.squadPowers || { squad1: 0, squad2: 0, squad3: 0, squad4: 0 };
  const appearances = currentUser?.desertStormAppearances || [];
  const activeZombieSiegeEvent = currentZombieSiegeEvent?.status === "archived" ? null : currentZombieSiegeEvent;
  const activeZombieSiegeAssignment = activeZombieSiegeEvent ? currentZombieSiegeAssignment : null;
  const desertStormNotificationsEnabled = currentUser?.desertStormVoteNotificationsEnabled !== false;
  const [draftOverallPower, setDraftOverallPower] = useState(String(currentUser?.overallPower ?? 0));
  const [draftHeroPower, setDraftHeroPower] = useState(String(currentUser?.heroPower ?? 0));
  const [draftSquadPowers, setDraftSquadPowers] = useState({
    squad1: String(squadPowers.squad1),
    squad2: String(squadPowers.squad2),
    squad3: String(squadPowers.squad3),
    squad4: String(squadPowers.squad4)
  });
  const resultLabels = { pending: t("resultPending"), win: t("resultWin"), loss: t("resultLoss"), won: t("resultWin"), lost: t("resultLoss") };

  useEffect(() => {
    setDraftOverallPower(String(currentUser?.overallPower ?? 0));
  }, [currentUser?.overallPower]);

  useEffect(() => {
    setDraftHeroPower(String(currentUser?.heroPower ?? 0));
  }, [currentUser?.heroPower]);

  useEffect(() => {
    setDraftSquadPowers({
      squad1: String(squadPowers.squad1),
      squad2: String(squadPowers.squad2),
      squad3: String(squadPowers.squad3),
      squad4: String(squadPowers.squad4)
    });
  }, [squadPowers.squad1, squadPowers.squad2, squadPowers.squad3, squadPowers.squad4]);

  return <View style={styles.profileCard}>
    <View style={styles.profileHeader}>
      <View>
        <Text style={styles.profileEyebrow}>{t("signedInPlayer")}</Text>
        <Text style={styles.cardTitle}>{currentUser?.name}</Text>
        <Text style={styles.profileRank}>{t("rank")} {currentUser?.rank}</Text>
      </View>
      <View style={styles.rankBadge}>
        <Text style={styles.rankBadgeText}>{currentUser?.rank}</Text>
      </View>
    </View>
    <View style={styles.metricGrid}>
      <View style={styles.metricPanel}>
        <Text style={styles.metricLabel}>{t("totalBasePower")}</Text>
        <Text style={styles.metricPanelValue}>{Number(currentUser?.overallPower || 0).toFixed(2)}M</Text>
      </View>
      <View style={styles.metricPanel}>
        <Text style={styles.metricLabel}>{t("heroPower")}</Text>
        <Text style={styles.metricPanelValue}>{Number(currentUser?.heroPower || 0).toFixed(2)}M</Text>
      </View>
    </View>
    <View style={styles.metricGrid}>
      <View style={styles.metricPanel}>
        <Text style={styles.metricLabel}>{t("totalSquadPower")}</Text>
        <Text style={styles.metricPanelValue}>{Number(currentUser?.totalSquadPower || 0).toFixed(2)}M</Text>
      </View>
    </View>
    <View style={styles.statusCard}>
      <Text style={styles.statusEyebrow}>Push Notifications</Text>
      <Text style={styles.statusTitle}>Desert Storm vote alerts</Text>
      <Text style={styles.statusLine}>{!desertStormNotificationsEnabled ? "Disabled. You will not get Desert Storm vote-open push notifications." : currentUser?.hasExpoPushToken ? "Enabled on this device." : "Enabled. Finish notification setup on this device to receive alerts."}</Text>
      <View style={styles.row}>
        <Pressable style={[styles.button, styles.half, desertStormNotificationsEnabled && styles.disabledButton]} disabled={desertStormNotificationsEnabled} onPress={() => onSetDesertStormVoteNotificationsEnabled(true)}>
          <Text style={styles.buttonText}>Enable</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, styles.half, !desertStormNotificationsEnabled && styles.disabled]} disabled={!desertStormNotificationsEnabled} onPress={() => onSetDesertStormVoteNotificationsEnabled(false)}>
          <Text style={styles.secondaryButtonText}>Disable</Text>
        </Pressable>
      </View>
    </View>
    {showPushNotificationsPrompt ? <View style={styles.statusCard}>
      <Text style={styles.statusEyebrow}>Push Notifications</Text>
      <Text style={styles.statusTitle}>Enable Desert Storm alerts</Text>
      <Text style={styles.statusLine}>Turn on push notifications to get a heads-up when the Desert Storm vote goes live.</Text>
      <View style={styles.row}>
        <Pressable style={[styles.button, styles.half, notificationSetupInFlight && styles.disabledButton]} disabled={notificationSetupInFlight} onPress={onEnablePushNotifications}>
          <Text style={styles.buttonText}>{notificationSetupInFlight ? "Enabling..." : "Enable"}</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, styles.half]} onPress={onDismissPushNotificationsPrompt}>
          <Text style={styles.secondaryButtonText}>Later</Text>
        </Pressable>
      </View>
    </View> : null}
    <Pressable disabled={!onOpenDesertStormVote} onPress={() => onOpenDesertStormVote && onOpenDesertStormVote()} style={[styles.statusCard, desertStormVoteStatus === "needed" ? styles.statusCardInactive : desertStormAssignment ? styles.statusCardActive : styles.statusCardInactive]}>
      <Text style={styles.statusEyebrow}>{t("desertStormTitle")}</Text>
      <Text style={styles.statusTitle}>{desertStormAssignment ? t("selectedForDesertStorm") : t("notCurrentlyAssigned")}</Text>
      {desertStormVoteStatus === "needed" ? <Text style={styles.statusLine}>Response needed</Text> : null}
      {desertStormVoteStatus === "submitted" ? <Text style={styles.statusLine}>Vote submitted</Text> : null}
      {desertStormAssignment ? <>
        <Text style={styles.statusLine}>{t("taskForceLabel", { value: desertStormAssignment.taskForceLabel })}</Text>
        <Text style={styles.statusLine}>{t("squadLabel", { value: desertStormAssignment.squadLabel })}</Text>
        <Text style={styles.statusLine}>{t("slotLabel", { value: desertStormAssignment.slotLabel })}</Text>
      </> : <Text style={styles.statusLine}>{t("notListedInTaskForces")}</Text>}
      {onOpenDesertStormVote ? <Text style={styles.selectedPlayerHint}>Tap to open the Desert Storm vote</Text> : null}
    </Pressable>
    <View style={styles.statusCard}>
      <Text style={styles.statusEyebrow}>Key Things Today</Text>
      <Text style={styles.statusTitle}>{todayCalendarEntries?.length ? `${todayCalendarEntries.length} item${todayCalendarEntries.length === 1 ? "" : "s"} on today's schedule` : "Nothing scheduled for today"}</Text>
      {todayCalendarEntries?.length ? todayCalendarEntries.map((entry) => <View key={entry.id} style={styles.todayItem}>
        <Text style={styles.todayItemTitle}>{entry.title}</Text>
        {entry.description ? <Text style={styles.statusLine}>{entry.description}</Text> : null}
      </View>) : <Text style={styles.statusLine}>Any calendar events scheduled for today will show up here.</Text>}
    </View>
    <View style={[styles.statusCard, activeZombieSiegeAssignment ? styles.statusCardActive : styles.statusCardInactive]}>
      <Text style={styles.statusEyebrow}>Zombie Siege</Text>
      <Text style={styles.statusTitle}>{activeZombieSiegeAssignment ? activeZombieSiegeEvent?.title || "Current Published Plan" : activeZombieSiegeEvent ? "No published assignment yet" : "No active Zombie Siege event"}</Text>
      {activeZombieSiegeEvent ? <>
        <Text style={styles.statusLine}>{String(activeZombieSiegeEvent.startAt || "").slice(0, 16)} to {String(activeZombieSiegeEvent.endAt || "").slice(0, 16)}</Text>
        <Text style={styles.statusLine}>Availability: {activeZombieSiegeEvent.myAvailabilityStatus || "no_response"}</Text>
        {activeZombieSiegeAssignment?.instructions?.length ? activeZombieSiegeAssignment.instructions.map((instruction, index) => <Text key={`${activeZombieSiegeAssignment.playerId}-${index}`} style={styles.statusLine}>• {instruction}</Text>) : <Text style={styles.statusLine}>Leaders have not published a Zombie Siege plan for you yet.</Text>}
      </> : <Text style={styles.statusLine}>When leaders create an event, your instructions will show here.</Text>}
    </View>
    <View style={styles.statusCard}>
      <Text style={styles.statusEyebrow}>{t("desertStormRecord")}</Text>
      <Text style={styles.statusTitle}>{appearances.length ? t("lockInsPlayed", { count: appearances.length }) : t("noLockedHistoryYet")}</Text>
      {appearances.length ? appearances.map((appearance) => <Text key={appearance.id} style={styles.statusLine}>{appearance.lockedInAt.slice(0, 10)} - {appearance.title} - {resultLabels[appearance.result] || appearance.result}</Text>) : <Text style={styles.statusLine}>{t("appearancesWillShow")}</Text>}
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("basePowerSection")}</Text>
      <Text style={styles.hint}>{POWER_INPUT_HINT}</Text>
      <TextInput value={draftOverallPower} onChangeText={setDraftOverallPower} onEndEditing={() => onChangeField("overallPower", draftOverallPower)} onBlur={() => onChangeField("overallPower", draftOverallPower)} style={styles.input} keyboardType="decimal-pad" />
      <Text style={styles.sectionTitle}>{t("heroPower")}</Text>
      <TextInput value={draftHeroPower} onChangeText={setDraftHeroPower} onEndEditing={() => onChangeField("heroPower", draftHeroPower)} onBlur={() => onChangeField("heroPower", draftHeroPower)} style={styles.input} keyboardType="decimal-pad" />
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("squadPowerBreakdown")}</Text>
      <Text style={styles.hint}>{POWER_INPUT_HINT}</Text>
      <View style={styles.row}>
        <View style={styles.squadCard}>
          <Text style={styles.squadLabel}>{t("squadNumber", { number: 1 })}</Text>
          <TextInput value={draftSquadPowers.squad1} onChangeText={(value) => setDraftSquadPowers((current) => ({ ...current, squad1: value }))} onEndEditing={() => onChangeField("squad1", draftSquadPowers.squad1)} onBlur={() => onChangeField("squad1", draftSquadPowers.squad1)} style={styles.input} keyboardType="decimal-pad" />
        </View>
        <View style={styles.squadCard}>
          <Text style={styles.squadLabel}>{t("squadNumber", { number: 2 })}</Text>
          <TextInput value={draftSquadPowers.squad2} onChangeText={(value) => setDraftSquadPowers((current) => ({ ...current, squad2: value }))} onEndEditing={() => onChangeField("squad2", draftSquadPowers.squad2)} onBlur={() => onChangeField("squad2", draftSquadPowers.squad2)} style={styles.input} keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.squadCard}>
          <Text style={styles.squadLabel}>{t("squadNumber", { number: 3 })}</Text>
          <TextInput value={draftSquadPowers.squad3} onChangeText={(value) => setDraftSquadPowers((current) => ({ ...current, squad3: value }))} onEndEditing={() => onChangeField("squad3", draftSquadPowers.squad3)} onBlur={() => onChangeField("squad3", draftSquadPowers.squad3)} style={styles.input} keyboardType="decimal-pad" />
        </View>
        <View style={styles.squadCard}>
          <Text style={styles.squadLabel}>{t("squadNumber", { number: 4 })}</Text>
          <TextInput value={draftSquadPowers.squad4} onChangeText={(value) => setDraftSquadPowers((current) => ({ ...current, squad4: value }))} onEndEditing={() => onChangeField("squad4", draftSquadPowers.squad4)} onBlur={() => onChangeField("squad4", draftSquadPowers.squad4)} style={styles.input} keyboardType="decimal-pad" />
        </View>
      </View>
    </View>
  </View>;
}
function TaskForceView({ taskForce, currentUser, currentUserIsLeader, canEdit = false, moveSource, onSelectMoveSource, onMovePlayer, onPickPlayer }) {
  return <View style={styles.card}>
    <Text style={styles.cardTitle}>{taskForce.label} - {taskForce.totalPower.toFixed(2)}M</Text>
    {taskForce.squads.map((squad) => <View key={squad.id} style={styles.section}>
      <Text style={styles.sectionTitle}>{squad.label} - {squad.totalPower.toFixed(2)}M</Text>
      {squad.slots.map((slot) => {
        const isSelectedPlayer = currentUser?.name && slot.playerName === currentUser.name;
        const isMoveSource = Boolean(moveSource && moveSource.taskForceKey === taskForce.key && moveSource.squadId === squad.id && moveSource.slotId === slot.id);
        const slotContext = { taskForceKey: taskForce.key, taskForceLabel: taskForce.label, squadId: squad.id, squadLabel: squad.label, slotId: slot.id, slotLabel: slot.label, memberType: slot.memberType };
        return <View key={slot.id} style={styles.section}>
          <Pressable style={[styles.pick, slot.isDuplicate && styles.dangerBox, isSelectedPlayer && styles.selectedPlayerBox, isMoveSource && styles.modeButtonActive]} disabled={!currentUserIsLeader || !canEdit} onPress={() => {
            if (!currentUserIsLeader || !canEdit) return;
            if (moveSource && !isMoveSource && moveSource.playerName) {
              onMovePlayer(slotContext);
              return;
            }
            onPickPlayer(slotContext);
          }}>
            <Text style={[styles.pickText, isSelectedPlayer && styles.selectedPlayerText, isMoveSource && styles.modeButtonTextActive]}>{slot.label}: {slot.playerName || "Open"} ({slot.overallPower.toFixed(2)}M)</Text>
            {isSelectedPlayer ? <Text style={styles.selectedPlayerHint}>Selected for Desert Storm</Text> : null}
            {isMoveSource ? <Text style={[styles.selectedPlayerHint, styles.modeButtonTextActive]}>Move target: tap another slot to swap</Text> : null}
          </Pressable>
          {currentUserIsLeader && canEdit && slot.playerName ? <View style={styles.row}>
            <Pressable style={[styles.secondaryButton, styles.half, isMoveSource && styles.modeButtonActive]} onPress={() => onSelectMoveSource(isMoveSource ? null : { ...slotContext, playerName: slot.playerName })}>
              <Text style={[styles.secondaryButtonText, isMoveSource && styles.modeButtonTextActive]}>{isMoveSource ? "Cancel Move" : "Move Player"}</Text>
            </Pressable>
            <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onPickPlayer(slotContext)}>
              <Text style={styles.secondaryButtonText}>{slot.playerName ? "Change Player" : "Assign Player"}</Text>
            </Pressable>
          </View> : null}
        </View>;
      })}
    </View>)}
  </View>;
}

function CalendarTimeWheelColumn({ value, values, onChange }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const index = Math.max(0, values.indexOf(value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: index * CALENDAR_WHEEL_ITEM_HEIGHT, animated: false });
    });
  }, [value, values]);

  function handleMomentumEnd(event) {
    const offsetY = event?.nativeEvent?.contentOffset?.y || 0;
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / CALENDAR_WHEEL_ITEM_HEIGHT)));
    const nextValue = values[index];
    if (nextValue !== value) {
      onChange(nextValue);
    }
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: index * CALENDAR_WHEEL_ITEM_HEIGHT, animated: true });
    });
  }

  return <View style={styles.calendarWheelColumn}>
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={CALENDAR_WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={handleMomentumEnd}
      contentContainerStyle={styles.calendarWheelContent}
    >
      {values.map((entry) => <View key={entry} style={styles.calendarWheelItem}>
        <Text style={[styles.calendarWheelText, entry === value && styles.calendarWheelTextActive]}>{entry}</Text>
      </View>)}
    </ScrollView>
    <View pointerEvents="none" style={styles.calendarWheelHighlight} />
  </View>;
}

function CalendarTimePickerModal({ visible, title, value, minValue = "", onChange, onClose, language }) {
  const calendarT = getCalendarTranslator(language);
  const parsed = parseTimeValue(value || "00:00") || { hours: 0, minutes: 0 };
  const hourValue = formatTwoDigits(parsed.hours);
  const minuteValue = formatTwoDigits(parsed.minutes);
  const minParts = parseTimeValue(minValue || "");
  const minHour = minParts?.hours ?? 0;
  const minMinute = minParts?.minutes ?? 0;
  const hourOptions = useMemo(() => Array.from({ length: 24 - minHour }, (_, index) => formatTwoDigits(index + minHour)), [minHour]);
  const effectiveHourValue = hourOptions.includes(hourValue) ? hourValue : hourOptions[0] || "00";
  const minuteOptions = useMemo(() => {
    const currentHour = Number.parseInt(effectiveHourValue, 10);
    const startMinute = minParts && currentHour === minHour ? minMinute : 0;
    return Array.from({ length: 60 - startMinute }, (_, index) => formatTwoDigits(index + startMinute));
  }, [effectiveHourValue, minHour, minMinute, minParts]);
  const effectiveMinuteValue = minuteOptions.includes(minuteValue) ? minuteValue : minuteOptions[0] || "00";

  useEffect(() => {
    const nextValue = `${effectiveHourValue}:${effectiveMinuteValue}`;
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }, [effectiveHourValue, effectiveMinuteValue, onChange, value]);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={CALENDAR_MODAL_BACKDROP_STYLE}>
      <SafeAreaView style={CALENDAR_MODAL_SHEET_SHELL_STYLE}>
        <View style={CALENDAR_MODAL_CARD_STYLE}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.calendarWheelHeader}>
            <Text style={styles.hint}>{calendarT("chooseHour")}</Text>
            <Text style={styles.hint}>{calendarT("chooseMinute")}</Text>
          </View>
          <View style={styles.calendarWheelRow}>
            <CalendarTimeWheelColumn value={effectiveHourValue} values={hourOptions} onChange={(nextHour) => onChange(`${nextHour}:${effectiveMinuteValue}`)} />
            <Text style={styles.calendarWheelDivider}>:</Text>
            <CalendarTimeWheelColumn value={effectiveMinuteValue} values={minuteOptions} onChange={(nextMinute) => onChange(`${effectiveHourValue}:${nextMinute}`)} />
          </View>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{calendarT("done")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

function CalendarDatePickerModal({ visible, title, value, onChange, onClose, language }) {
  const calendarT = getCalendarTranslator(language);
  const fallbackDateKey = isValidDateKey(value) ? value : formatLocalDateKey(new Date());
  const [year, month, day] = fallbackDateKey.split("-").map((part) => Number.parseInt(part, 10));
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => formatTwoDigits(index + 1)), []);
  const yearOptions = useMemo(() => {
    const startYear = year - 4;
    return Array.from({ length: 10 }, (_, index) => String(startYear + index));
  }, [year]);
  const dayOptions = useMemo(() => Array.from({ length: getDaysInMonth(year, month) }, (_, index) => formatTwoDigits(index + 1)), [year, month]);
  const yearValue = String(year);
  const monthValue = formatTwoDigits(month);
  const dayValue = formatTwoDigits(Math.min(day, dayOptions.length));

  function updateDate(nextYear, nextMonth, nextDay) {
    const safeYear = Number.parseInt(nextYear, 10) || year;
    const safeMonth = Number.parseInt(nextMonth, 10) || month;
    const maxDay = getDaysInMonth(safeYear, safeMonth);
    const safeDay = Math.min(Number.parseInt(nextDay, 10) || 1, maxDay);
    onChange(formatDateKeyFromParts({ year: safeYear, month: safeMonth, day: safeDay }));
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={CALENDAR_MODAL_BACKDROP_STYLE}>
      <SafeAreaView style={CALENDAR_MODAL_SHEET_SHELL_STYLE}>
        <View style={CALENDAR_MODAL_CARD_STYLE}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.calendarWheelHeader}>
            <Text style={styles.hint}>{calendarT("chooseMonth")}</Text>
            <Text style={styles.hint}>{calendarT("chooseDay")}</Text>
            <Text style={styles.hint}>{calendarT("chooseYear")}</Text>
          </View>
          <View style={styles.calendarWheelRow}>
            <CalendarTimeWheelColumn value={monthValue} values={monthOptions} onChange={(nextMonth) => updateDate(yearValue, nextMonth, dayValue)} />
            <CalendarTimeWheelColumn value={dayValue} values={dayOptions} onChange={(nextDay) => updateDate(yearValue, monthValue, nextDay)} />
            <CalendarTimeWheelColumn value={yearValue} values={yearOptions} onChange={(nextYear) => updateDate(nextYear, monthValue, dayValue)} />
          </View>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{calendarT("done")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

function DesertStormView({ section, onChangeSection, currentUser, currentUserIsLeader, events, archivedEvents, selectedEvent, selectedEventId, onSelectEvent, taskForce, moveSource, onSelectMoveSource, onMovePlayer, onPickPlayer, onCreateEvent, newEventTitle, onChangeNewEventTitle, onSubmitVote, onOpenVote, onCloseVote, onReopenVote, onPublishTeams, onEditTeams, onEndEvent, onArchiveEvent }) {
  const [draftResults, setDraftResults] = useState({
    taskForceA: { outcome: "pending", notes: "" },
    taskForceB: { outcome: "pending", notes: "" }
  });
  const activeEvent = selectedEvent?.status !== "archived" ? selectedEvent : null;
  const canEditTeams = Boolean(currentUserIsLeader && activeEvent && activeEvent.status !== "completed" && activeEvent.status !== "archived");
  const canPublish = Boolean(currentUserIsLeader && activeEvent && (activeEvent.status === "draft" || activeEvent.status === "voting_open" || activeEvent.status === "voting_closed" || activeEvent.status === "editing"));
  const canEditPublished = Boolean(currentUserIsLeader && activeEvent?.publishedTaskForces && activeEvent.status === "published");
  const canEndEvent = Boolean(currentUserIsLeader && activeEvent?.publishedTaskForces && activeEvent.status !== "completed" && activeEvent.status !== "archived");
  const canArchive = Boolean(currentUserIsLeader && selectedEvent && selectedEvent.status === "completed");
  const eventHistory = archivedEvents || [];

  useEffect(() => {
    setDraftResults({
      taskForceA: {
        outcome: selectedEvent?.result?.taskForceA?.outcome || "pending",
        notes: selectedEvent?.result?.taskForceA?.notes || ""
      },
      taskForceB: {
        outcome: selectedEvent?.result?.taskForceB?.outcome || "pending",
        notes: selectedEvent?.result?.taskForceB?.notes || ""
      }
    });
  }, [selectedEvent?.id, selectedEvent?.result?.taskForceA?.outcome, selectedEvent?.result?.taskForceA?.notes, selectedEvent?.result?.taskForceB?.outcome, selectedEvent?.result?.taskForceB?.notes]);

  if (!activeEvent) {
    return <View style={styles.card}>
      <Text style={styles.cardTitle}>Desert Storm</Text>
      <Text style={styles.hint}>Create a Desert Storm event when you are ready to collect votes and build teams.</Text>
      {currentUserIsLeader ? <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create Desert Storm Event</Text>
        <TextInput value={newEventTitle} onChangeText={onChangeNewEventTitle} style={styles.input} placeholder="Desert Storm event title" />
        <Pressable style={styles.button} onPress={onCreateEvent}>
          <Text style={styles.buttonText}>Create Desert Storm Event</Text>
        </Pressable>
      </View> : <Text style={styles.hint}>Leaders create Desert Storm events here. Published teams will appear once an event is active.</Text>}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {eventHistory.length ? eventHistory.map((event) => <Pressable key={event.id} style={[styles.voteCard, selectedEventId === event.id && styles.zombieSelectedCard]} onPress={() => onSelectEvent(event.id)}>
          <Text style={styles.sectionTitle}>{event.title}</Text>
          <Text style={styles.hint}>{String(event.archivedAt || event.endedAt || event.publishedAt || event.createdAt).slice(0, 16)}</Text>
          <Text style={styles.line}>Task Force A: {getDesertStormStatusLabel(event.result?.taskForceA?.outcome || "pending")}</Text>
          <Text style={styles.line}>Task Force B: {getDesertStormStatusLabel(event.result?.taskForceB?.outcome || "pending")}</Text>
        </Pressable>) : <Text style={styles.hint}>No archived Desert Storm events yet.</Text>}
      </View>
      {selectedEvent?.status === "archived" ? <View style={styles.section}>
        <Text style={styles.sectionTitle}>{selectedEvent.title}</Text>
        <Text style={styles.hint}>Archived event details</Text>
        <View style={styles.statusCard}>
          <Text style={styles.statusEyebrow}>Archived Vote</Text>
          {(selectedEvent.vote?.options || []).map((option) => <Text key={option.id} style={styles.statusLine}>{option.label}: {option.votes}</Text>)}
          {currentUserIsLeader && selectedEvent.vote?.responses?.length ? <Text style={styles.statusLine}>{selectedEvent.vote.responses.map((response) => `${response.playerName} (${getDesertStormVoteOptionLabel(response.optionId)})`).join(", ")}</Text> : null}
        </View>
        {Object.values(selectedEvent.publishedTaskForces || {}).map((taskForce) => <View key={taskForce.key} style={styles.statusCard}>
          <Text style={styles.statusEyebrow}>{taskForce.label}</Text>
          {(taskForce.squads || []).map((squad) => <View key={squad.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{squad.label}</Text>
            {(squad.slots || []).map((slot) => <Text key={slot.id} style={styles.statusLine}>{slot.label}: {slot.playerName || "Open"}</Text>)}
          </View>)}
        </View>)}
        {["taskForceA", "taskForceB"].map((key) => <View key={key} style={styles.statusCard}>
          <Text style={styles.statusEyebrow}>{key === "taskForceA" ? "Task Force A" : "Task Force B"}</Text>
          <Text style={styles.statusTitle}>{selectedEvent.result?.[key]?.outcome === "won" ? "Won" : selectedEvent.result?.[key]?.outcome === "lost" ? "Lost" : "Pending"}</Text>
          {selectedEvent.result?.[key]?.notes ? <Text style={styles.statusLine}>{selectedEvent.result[key].notes}</Text> : <Text style={styles.statusLine}>No notes saved.</Text>}
        </View>)}
      </View> : null}
    </View>;
  }

  const voteResponses = activeEvent.vote?.responses || [];
  const voteCounts = Object.fromEntries((activeEvent.vote?.options || []).map((option) => [option.id, voteResponses.filter((response) => response.optionId === option.id)]));

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Desert Storm</Text>
    <Text style={styles.line}>{activeEvent.title}</Text>
    <Text style={styles.hint}>Status: {getDesertStormStatusLabel(activeEvent.status)}{activeEvent.publishedAt ? ` • Published v${activeEvent.version || 1}` : ""}</Text>
    <View style={styles.row}>
      <Pressable style={[styles.secondaryButton, styles.half, section === "vote" && styles.modeButtonActive]} onPress={() => onChangeSection("vote")}><Text style={[styles.secondaryButtonText, section === "vote" && styles.modeButtonTextActive]}>Vote</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, section === "taskForceA" && styles.modeButtonActive]} onPress={() => onChangeSection("taskForceA")}><Text style={[styles.secondaryButtonText, section === "taskForceA" && styles.modeButtonTextActive]}>Task Force A</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, section === "taskForceB" && styles.modeButtonActive]} onPress={() => onChangeSection("taskForceB")}><Text style={[styles.secondaryButtonText, section === "taskForceB" && styles.modeButtonTextActive]}>Task Force B</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, section === "history" && styles.modeButtonActive]} onPress={() => onChangeSection("history")}><Text style={[styles.secondaryButtonText, section === "history" && styles.modeButtonTextActive]}>History</Text></Pressable>
    </View>

    {section === "vote" ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>Desert Storm Vote</Text>
      <Text style={styles.hint}>Vote choices stay with this event. Leaders can build teams while voting is open or closed.</Text>
      <View style={styles.row}>
        {(activeEvent.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.secondaryButton, styles.half, activeEvent.vote?.selectedOptionId === option.id && styles.modeButtonActive]} onPress={() => onSubmitVote(activeEvent.id, option.id)}>
          <Text style={[styles.secondaryButtonText, activeEvent.vote?.selectedOptionId === option.id && styles.modeButtonTextActive]}>{option.label}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.line}>Vote status: {activeEvent.vote?.status === "open" ? "Open" : "Closed"}</Text>
      <Text style={styles.line}>{activeEvent.vote?.totalVotes || 0} / {activeEvent.vote?.eligibleVoters || 0} alliance members responded</Text>
      {(activeEvent.vote?.options || []).map((option) => <View key={option.id} style={styles.voteOption}>
        <View style={styles.voteOptionHeader}>
          <Text style={styles.pickText}>{option.label}</Text>
          <Text style={styles.voteCount}>{voteCounts[option.id]?.length || 0}</Text>
        </View>
        {currentUserIsLeader ? <Text style={styles.voteResponseList}>{(voteCounts[option.id] || []).length ? voteCounts[option.id].map((response) => response.playerName).join(", ") : "No responses yet."}</Text> : null}
      </View>)}
      {currentUserIsLeader ? <View style={styles.row}>
        {activeEvent.vote?.status === "open"
          ? <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onCloseVote(activeEvent.id)}><Text style={styles.secondaryButtonText}>Close Vote</Text></Pressable>
          : <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => (activeEvent.vote?.openedAt ? onReopenVote(activeEvent.id) : onOpenVote(activeEvent.id))}><Text style={styles.secondaryButtonText}>{activeEvent.vote?.openedAt ? "Reopen Vote" : "Open Vote"}</Text></Pressable>}
      </View> : null}
    </View> : null}

    {(section === "taskForceA" || section === "taskForceB") ? <>
      {!currentUserIsLeader && !activeEvent.publishedTaskForces ? <View style={styles.statusCard}>
        <Text style={styles.statusEyebrow}>Teams Hidden</Text>
        <Text style={styles.statusTitle}>Waiting for publish</Text>
        <Text style={styles.statusLine}>Leaders are still building draft teams. Published teams will appear here once they are ready.</Text>
      </View> : <TaskForceView taskForce={taskForce} currentUser={currentUser} currentUserIsLeader={currentUserIsLeader} canEdit={canEditTeams} moveSource={moveSource} onSelectMoveSource={onSelectMoveSource} onMovePlayer={onMovePlayer} onPickPlayer={onPickPlayer} />}
      {currentUserIsLeader ? <View style={styles.section}>
        {canPublish ? <Pressable style={styles.button} onPress={() => onPublishTeams(activeEvent.id)}><Text style={styles.buttonText}>{activeEvent.publishedTaskForces ? "Republish Teams" : "Publish Teams"}</Text></Pressable> : null}
        {canEditPublished ? <Pressable style={styles.secondaryButton} onPress={() => onEditTeams(activeEvent.id)}><Text style={styles.secondaryButtonText}>Edit Teams</Text></Pressable> : null}
        {activeEvent.publishedTaskForces ? <Text style={styles.hint}>Members only see the published version. Any new edits stay private until you publish again.</Text> : null}
      </View> : null}
    </> : null}

    {section === "history" ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>Event Wrap Up</Text>
      <Text style={styles.hint}>When the event is over, save each task force result and then archive the event.</Text>
      {["taskForceA", "taskForceB"].map((key) => <View key={key} style={styles.statusCard}>
        <Text style={styles.statusEyebrow}>{key === "taskForceA" ? "Task Force A" : "Task Force B"}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half, draftResults[key].outcome === "won" && styles.modeButtonActive]} onPress={() => setDraftResults((current) => ({ ...current, [key]: { ...current[key], outcome: "won" } }))}><Text style={[styles.secondaryButtonText, draftResults[key].outcome === "won" && styles.modeButtonTextActive]}>Won</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, draftResults[key].outcome === "lost" && styles.modeButtonActive]} onPress={() => setDraftResults((current) => ({ ...current, [key]: { ...current[key], outcome: "lost" } }))}><Text style={[styles.secondaryButtonText, draftResults[key].outcome === "lost" && styles.modeButtonTextActive]}>Lost</Text></Pressable>
        </View>
        <TextInput value={draftResults[key].notes} onChangeText={(value) => setDraftResults((current) => ({ ...current, [key]: { ...current[key], notes: value } }))} style={[styles.input, styles.textArea]} placeholder="Optional notes" multiline editable={currentUserIsLeader && selectedEvent.status !== "archived"} />
      </View>)}
      {canEndEvent ? <Pressable style={styles.button} onPress={() => onEndEvent(activeEvent.id, draftResults)}><Text style={styles.buttonText}>End Event</Text></Pressable> : null}
      {canArchive ? <Pressable style={styles.secondaryButton} onPress={() => onArchiveEvent(activeEvent.id)}><Text style={styles.secondaryButtonText}>Archive Event</Text></Pressable> : null}
      {selectedEvent.status === "archived" ? <Text style={styles.hint}>This event is archived. The Desert Storm home screen will stay focused on create-plus-history until a new event is created.</Text> : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Archived Events</Text>
        {eventHistory.length ? eventHistory.map((event) => <View key={event.id} style={styles.voteCard}>
          <Text style={styles.sectionTitle}>{event.title}</Text>
          <Text style={styles.hint}>{String(event.archivedAt || event.endedAt || event.createdAt).slice(0, 16)}</Text>
          <Text style={styles.line}>Task Force A: {event.result?.taskForceA?.outcome || "pending"}</Text>
          <Text style={styles.line}>Task Force B: {event.result?.taskForceB?.outcome || "pending"}</Text>
        </View>) : <Text style={styles.hint}>No archived Desert Storm events yet.</Text>}
      </View>
    </View> : null}
  </View>;
}
function MembersView({ players, memberSearchText, memberSortMode, memberRankFilter, onChangeMemberSearchText, onChangeMemberSortMode, onChangeMemberRankFilter, currentUser, currentUserIsLeader, onChangeField, onRemovePlayer }) {
  const [drafts, setDrafts] = useState({});
  const [expandedMemberId, setExpandedMemberId] = useState("");
  const [editingMemberIds, setEditingMemberIds] = useState({});

  useEffect(() => {
    setDrafts(Object.fromEntries(players.map((player) => [player.id, {
      name: player.name,
      rank: player.rank,
      overallPower: String(player.overallPower),
      squad1: String(player.squadPowers?.squad1 ?? 0),
      squad2: String(player.squadPowers?.squad2 ?? 0),
      squad3: String(player.squadPowers?.squad3 ?? 0),
      squad4: String(player.squadPowers?.squad4 ?? 0)
    }])));
  }, [players]);

  useEffect(() => {
    if (expandedMemberId && !players.some((player) => player.id === expandedMemberId)) {
      setExpandedMemberId("");
    }
  }, [expandedMemberId, players]);

  useEffect(() => {
    setEditingMemberIds((current) => Object.fromEntries(Object.entries(current).filter(([playerId]) => players.some((player) => player.id === playerId))));
  }, [players]);

  function handleRemoveMember(player) {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${player.name} from the alliance?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onRemovePlayer(player.id) }
      ]
    );
  }

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Members</Text>
    <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder="Search players by name or rank" />
    <View style={styles.row}>
      <Pressable style={[styles.secondaryButton, styles.half, memberSortMode === "rankDesc" && styles.modeButtonActive]} onPress={() => onChangeMemberSortMode("rankDesc")}><Text style={[styles.secondaryButtonText, memberSortMode === "rankDesc" && styles.modeButtonTextActive]}>Sort By Rank</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, memberSortMode === "name" && styles.modeButtonActive]} onPress={() => onChangeMemberSortMode("name")}><Text style={[styles.secondaryButtonText, memberSortMode === "name" && styles.modeButtonTextActive]}>Sort By Name</Text></Pressable>
    </View>
    <View style={styles.rankFilterRow}>
      <Pressable style={[styles.rankFilterButton, memberRankFilter === "all" && styles.rankFilterButtonActive]} onPress={() => onChangeMemberRankFilter("all")}><Text style={[styles.rankFilterButtonText, memberRankFilter === "all" && styles.rankFilterButtonTextActive]}>All</Text></Pressable>
      {["R5", "R4", "R3", "R2", "R1"].map((rank) => <Pressable key={rank} style={[styles.rankFilterButton, memberRankFilter === rank && styles.rankFilterButtonActive]} onPress={() => onChangeMemberRankFilter(rank)}><Text style={[styles.rankFilterButtonText, memberRankFilter === rank && styles.rankFilterButtonTextActive]}>{rank}</Text></Pressable>)}
    </View>
    {players.map((player) => {
      const isEditing = !!editingMemberIds[player.id];
      const canEdit = currentUserIsLeader && isEditing;
      const canEditRank = currentUserIsLeader && isEditing;
      const s = player.squadPowers || { squad1: 0, squad2: 0, squad3: 0, squad4: 0 };
      const ds = player.desertStormStats || { playedCount: 0, missedCount: 0 };
      const draft = drafts[player.id] || {
        name: player.name,
        rank: player.rank,
        overallPower: String(player.overallPower),
        squad1: String(s.squad1),
        squad2: String(s.squad2),
        squad3: String(s.squad3),
        squad4: String(s.squad4)
      };
      const expanded = expandedMemberId === player.id;

      return <View key={player.id} style={styles.memberCard}>
        <Pressable style={styles.memberCardSummary} onPress={() => setExpandedMemberId((current) => current === player.id ? "" : player.id)}>
          <View style={styles.memberSummaryText}>
            <Text style={styles.memberNameCompact}>{player.name}</Text>
            <Text style={styles.memberSubline}>{player.rank}</Text>
          </View>
          <View style={styles.memberSummaryRight}>
            <View style={styles.memberRankChip}><Text style={styles.memberRankChipText}>{player.rank}</Text></View>
            <Text style={styles.memberExpandIcon}>{expanded ? "−" : "+"}</Text>
          </View>
        </Pressable>
        {expanded ? <>
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Base Power</Text><Text style={styles.memberStatValue}>{Number(player.overallPower || 0).toFixed(2)}M</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Squad Power</Text><Text style={styles.memberStatValue}>{Number(player.totalSquadPower || 0).toFixed(2)}M</Text></View>
          </View>
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>DS Played</Text><Text style={styles.memberStatValue}>{ds.playedCount}</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>DS Missed</Text><Text style={styles.memberStatValue}>{ds.missedCount}</Text></View>
          </View>
          {currentUserIsLeader ? <View style={styles.row}>
            <Pressable style={[styles.secondaryButton, styles.half, isEditing && styles.modeButtonActive]} onPress={() => setEditingMemberIds((current) => ({ ...current, [player.id]: !current[player.id] }))}>
              <Text style={[styles.secondaryButtonText, isEditing && styles.modeButtonTextActive]}>{isEditing ? "Done Editing" : "Edit"}</Text>
            </Pressable>
            {currentUser?.id !== player.id ? <Pressable style={[styles.dangerButton, styles.half]} onPress={() => handleRemoveMember(player)}><Text style={styles.dangerButtonText}>Remove Member</Text></Pressable> : null}
          </View> : null}
          <View style={styles.section}>
            <Text style={styles.memberSectionLabel}>Player Info</Text>
            <TextInput value={draft.name} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, name: v } }))} onEndEditing={() => onChangeField(player.id, "name", draft.name)} onBlur={() => onChangeField(player.id, "name", draft.name)} editable={canEdit} style={[styles.input, !canEdit && styles.disabled]} />
          </View>
          <Text style={styles.hint}>{POWER_INPUT_HINT}</Text>
          <View style={styles.row}>
            <RankSelector value={draft.rank} onChange={(rank) => {
              setDrafts((current) => ({ ...current, [player.id]: { ...draft, rank } }));
              onChangeField(player.id, "rank", rank);
            }} disabled={!canEditRank} style={styles.half} />
            <TextInput value={draft.overallPower} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, overallPower: v } }))} onEndEditing={() => onChangeField(player.id, "overallPower", draft.overallPower)} onBlur={() => onChangeField(player.id, "overallPower", draft.overallPower)} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
          </View>
          <View style={styles.memberSection}>
            <Text style={styles.memberSectionLabel}>Squad Powers</Text>
            <View style={styles.row}>
              <TextInput value={draft.squad1} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad1: v } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
              <TextInput value={draft.squad2} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad2: v } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
            </View>
            <View style={styles.row}>
              <TextInput value={draft.squad3} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad3: v } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
              <TextInput value={draft.squad4} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad4: v } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
            </View>
          </View>
        </> : null}
      </View>;
    })}
    {!players.length ? <Text style={styles.hint}>No players match that search.</Text> : null}
  </View>;
}
function MembersViewV2({ players, memberSearchText, memberSortMode, memberRankFilter, onChangeMemberSearchText, onChangeMemberSortMode, onChangeMemberRankFilter, currentUser, currentUserIsLeader, onChangeField, onRemovePlayer }) {
  const [drafts, setDrafts] = useState({});
  const [expandedMemberId, setExpandedMemberId] = useState("");
  const [editingMemberIds, setEditingMemberIds] = useState({});

  useEffect(() => {
    setDrafts(Object.fromEntries(players.map((player) => [player.id, {
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
    if (expandedMemberId && !players.some((player) => player.id === expandedMemberId)) {
      setExpandedMemberId("");
    }
  }, [expandedMemberId, players]);

  useEffect(() => {
    setEditingMemberIds((current) => Object.fromEntries(Object.entries(current).filter(([playerId]) => players.some((player) => player.id === playerId))));
  }, [players]);

  function handleRemoveMember(player) {
    Alert.alert("Remove Member", `Are you sure you want to remove ${player.name} from the alliance?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onRemovePlayer(player.id) }
    ]);
  }

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Members</Text>
    <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder="Search players by name or rank" />
    <View style={styles.row}>
      <Pressable style={[styles.secondaryButton, styles.half, memberSortMode === "rankDesc" && styles.modeButtonActive]} onPress={() => onChangeMemberSortMode("rankDesc")}><Text style={[styles.secondaryButtonText, memberSortMode === "rankDesc" && styles.modeButtonTextActive]}>Sort By Rank</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, memberSortMode === "name" && styles.modeButtonActive]} onPress={() => onChangeMemberSortMode("name")}><Text style={[styles.secondaryButtonText, memberSortMode === "name" && styles.modeButtonTextActive]}>Sort By Name</Text></Pressable>
    </View>
    <View style={styles.rankFilterRow}>
      <Pressable style={[styles.rankFilterButton, memberRankFilter === "all" && styles.rankFilterButtonActive]} onPress={() => onChangeMemberRankFilter("all")}><Text style={[styles.rankFilterButtonText, memberRankFilter === "all" && styles.rankFilterButtonTextActive]}>All</Text></Pressable>
      {["R5", "R4", "R3", "R2", "R1"].map((rank) => <Pressable key={rank} style={[styles.rankFilterButton, memberRankFilter === rank && styles.rankFilterButtonActive]} onPress={() => onChangeMemberRankFilter(rank)}><Text style={[styles.rankFilterButtonText, memberRankFilter === rank && styles.rankFilterButtonTextActive]}>{rank}</Text></Pressable>)}
    </View>
    {players.map((player) => {
      const isEditing = Boolean(editingMemberIds[player.id]);
      const canEdit = currentUserIsLeader && isEditing;
      const squadPowers = player.squadPowers || { squad1: 0, squad2: 0, squad3: 0, squad4: 0 };
      const stats = player.desertStormStats || { playedCount: 0, missedCount: 0 };
      const draft = drafts[player.id] || {
        name: player.name,
        rank: player.rank,
        overallPower: String(player.overallPower ?? 0),
        heroPower: String(player.heroPower ?? 0),
        squad1: String(squadPowers.squad1),
        squad2: String(squadPowers.squad2),
        squad3: String(squadPowers.squad3),
        squad4: String(squadPowers.squad4)
      };
      const expanded = expandedMemberId === player.id;

      return <View key={player.id} style={styles.memberCard}>
        <Pressable style={styles.memberCardSummary} onPress={() => setExpandedMemberId((current) => current === player.id ? "" : player.id)}>
          <View style={styles.memberSummaryText}>
            <Text style={styles.memberNameCompact}>{player.name}</Text>
            <Text style={styles.memberSubline}>{player.rank}</Text>
          </View>
          <View style={styles.memberSummaryRight}>
            <View style={styles.memberRankChip}><Text style={styles.memberRankChipText}>{player.rank}</Text></View>
            <Text style={styles.memberExpandIcon}>{expanded ? "−" : "+"}</Text>
          </View>
        </Pressable>
        {expanded ? <>
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Base Power</Text><Text style={styles.memberStatValue}>{Number(player.overallPower || 0).toFixed(2)}M</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Hero Power</Text><Text style={styles.memberStatValue}>{Number(player.heroPower || 0).toFixed(2)}M</Text></View>
          </View>
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Squad Power</Text><Text style={styles.memberStatValue}>{Number(player.totalSquadPower || 0).toFixed(2)}M</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>DS Played</Text><Text style={styles.memberStatValue}>{stats.playedCount}</Text></View>
          </View>
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>DS Missed</Text><Text style={styles.memberStatValue}>{stats.missedCount}</Text></View>
          </View>
          {currentUserIsLeader ? <View style={styles.row}>
            <Pressable style={[styles.secondaryButton, styles.half, isEditing && styles.modeButtonActive]} onPress={() => setEditingMemberIds((current) => ({ ...current, [player.id]: !current[player.id] }))}>
              <Text style={[styles.secondaryButtonText, isEditing && styles.modeButtonTextActive]}>{isEditing ? "Done Editing" : "Edit"}</Text>
            </Pressable>
            {currentUser?.id !== player.id ? <Pressable style={[styles.dangerButton, styles.half]} onPress={() => handleRemoveMember(player)}><Text style={styles.dangerButtonText}>Remove Member</Text></Pressable> : null}
          </View> : null}
          <View style={styles.section}>
            <Text style={styles.memberSectionLabel}>Player Info</Text>
            <TextInput value={draft.name} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, name: value } }))} onEndEditing={() => onChangeField(player.id, "name", draft.name)} onBlur={() => onChangeField(player.id, "name", draft.name)} editable={canEdit} style={[styles.input, !canEdit && styles.disabled]} />
          </View>
          <Text style={styles.hint}>{POWER_INPUT_HINT}</Text>
          <View style={styles.row}>
            <RankSelector value={draft.rank} onChange={(rank) => {
              setDrafts((current) => ({ ...current, [player.id]: { ...draft, rank } }));
              onChangeField(player.id, "rank", rank);
            }} disabled={!canEdit} style={styles.half} />
            <TextInput value={draft.overallPower} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, overallPower: value } }))} onEndEditing={() => onChangeField(player.id, "overallPower", draft.overallPower)} onBlur={() => onChangeField(player.id, "overallPower", draft.overallPower)} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
          </View>
          <TextInput value={draft.heroPower} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, heroPower: value } }))} onEndEditing={() => onChangeField(player.id, "heroPower", draft.heroPower)} onBlur={() => onChangeField(player.id, "heroPower", draft.heroPower)} editable={canEdit} style={[styles.input, !canEdit && styles.disabled]} keyboardType="decimal-pad" placeholder="Hero Power" />
          <View style={styles.memberSection}>
            <Text style={styles.memberSectionLabel}>Squad Powers</Text>
            <View style={styles.row}>
              <TextInput value={draft.squad1} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad1: value } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
              <TextInput value={draft.squad2} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad2: value } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
            </View>
            <View style={styles.row}>
              <TextInput value={draft.squad3} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad3: value } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
              <TextInput value={draft.squad4} onChangeText={(value) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, squad4: value } }))} onEndEditing={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} onBlur={() => onChangeField(player.id, "squadPowers", { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 })} editable={canEdit} style={[styles.input, styles.half, !canEdit && styles.disabled]} keyboardType="decimal-pad" />
            </View>
          </View>
        </> : null}
      </View>;
    })}
    {!players.length ? <Text style={styles.hint}>No players match that search.</Text> : null}
  </View>;
}
function RemindersView({ reminders, language, onCreateReminder, onCancelReminder, onDeleteReminder }) {
  const localTimeZone = getReminderDeviceTimeZone();
  const serverTimeZone = getReminderServerTimeZone();
  const serverTimeLabel = getReminderServerTimeLabel();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("elapsed");
  const [durationDays, setDurationDays] = useState("0");
  const [durationHours, setDurationHours] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("0");
  const [dateKey, setDateKey] = useState(formatReminderDateKey(new Date()));
  const [timeValue, setTimeValue] = useState("09:00");
  const [datePickerTarget, setDatePickerTarget] = useState("");
  const [timePickerTarget, setTimePickerTarget] = useState("");
  const [error, setError] = useState("");
  const activeReminders = reminders.filter((entry) => entry.status === "active");
  const pastReminders = reminders.filter((entry) => entry.status !== "active");
  const preview = useMemo(() => {
    if ((mode === "localTime" || mode === "serverTime") && (!dateKey || !parseReminderTimeValue(timeValue))) {
      return null;
    }
    return buildReminderSchedule({
      mode,
      title,
      notes,
      durationDays,
      durationHours,
      durationMinutes,
      dateKey,
      timeValue,
      localTimeZone
    });
  }, [mode, title, notes, durationDays, durationHours, durationMinutes, dateKey, timeValue, localTimeZone]);

  function resetForm() {
    setTitle("");
    setNotes("");
    setMode("elapsed");
    setDurationDays("0");
    setDurationHours("1");
    setDurationMinutes("0");
    setDateKey(formatReminderDateKey(new Date()));
    setTimeValue("09:00");
    setDatePickerTarget("");
    setTimePickerTarget("");
    setError("");
  }

  async function handleCreate() {
    if (mode === "elapsed") {
      const totalMinutes = (Number.parseInt(durationDays, 10) || 0) * 24 * 60 + (Number.parseInt(durationHours, 10) || 0) * 60 + (Number.parseInt(durationMinutes, 10) || 0);
      if (totalMinutes <= 0) {
        setError("Choose a future duration.");
        return;
      }
    } else {
      if (!dateKey) {
        setError("Choose a date before saving.");
        return;
      }
      if (!parseReminderTimeValue(timeValue)) {
        setError("Choose a time before saving.");
        return;
      }
    }
    if (!preview?.scheduledForUtc || new Date(preview.scheduledForUtc).getTime() <= Date.now()) {
      setError("Reminder time must be in the future.");
      return;
    }
    setError("");
    const created = await onCreateReminder({
      title,
      notes,
      mode,
      durationDays,
      durationHours,
      durationMinutes,
      dateKey,
      timeValue
    });
    if (created) {
      resetForm();
    }
  }

  function renderReminderCard(reminder, showCancel) {
    return <View key={reminder.id} style={styles.statusCard}>
      <Text style={styles.statusEyebrow}>{reminder.mode === "elapsed" ? "After a duration" : reminder.mode === "serverTime" ? `Server Time (${serverTimeLabel})` : "My Local Time"}</Text>
      <Text style={styles.statusTitle}>{reminder.title}</Text>
      {reminder.notes ? <Text style={styles.statusLine}>{reminder.notes}</Text> : null}
      <Text style={styles.statusLine}>Status: {reminder.status}</Text>
      <Text style={styles.statusLine}>Local: {formatReminderDateTimeDisplay(reminder.scheduledForUtc, localTimeZone, language)}</Text>
      <Text style={styles.statusLine}>Server ({serverTimeLabel}): {formatReminderDateTimeDisplay(reminder.scheduledForUtc, serverTimeZone, language)}</Text>
      <View style={styles.row}>
        {showCancel ? <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onCancelReminder(reminder)}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable> : null}
        <Pressable style={[showCancel ? styles.dangerButton : styles.secondaryButton, styles.half]} onPress={() => onDeleteReminder(reminder)}>
          <Text style={showCancel ? styles.dangerButtonText : styles.secondaryButtonText}>Delete</Text>
        </Pressable>
      </View>
    </View>;
  }

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Reminders</Text>
    <Text style={styles.hint}>Each reminder is personal to your account and fires on this device.</Text>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>New Reminder</Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Reminder title" />
      <TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.textArea]} placeholder="Optional notes" multiline />
      <View style={styles.rankFilterRow}>
        <Pressable style={[styles.rankFilterButton, mode === "elapsed" && styles.rankFilterButtonActive]} onPress={() => setMode("elapsed")}><Text style={[styles.rankFilterButtonText, mode === "elapsed" && styles.rankFilterButtonTextActive]}>After a duration</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "localTime" && styles.rankFilterButtonActive]} onPress={() => setMode("localTime")}><Text style={[styles.rankFilterButtonText, mode === "localTime" && styles.rankFilterButtonTextActive]}>At local time</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "serverTime" && styles.rankFilterButtonActive]} onPress={() => setMode("serverTime")}><Text style={[styles.rankFilterButtonText, mode === "serverTime" && styles.rankFilterButtonTextActive]}>At server time</Text></Pressable>
      </View>
      {mode === "elapsed" ? <View style={styles.row}>
        <TextInput value={durationDays} onChangeText={setDurationDays} style={[styles.input, styles.third]} keyboardType="number-pad" placeholder="Days" />
        <TextInput value={durationHours} onChangeText={setDurationHours} style={[styles.input, styles.third]} keyboardType="number-pad" placeholder="Hours" />
        <TextInput value={durationMinutes} onChangeText={setDurationMinutes} style={[styles.input, styles.third]} keyboardType="number-pad" placeholder="Minutes" />
      </View> : <>
        <Text style={styles.hint}>{mode === "serverTime" ? `Server time is ${serverTimeLabel}.` : `Using your local time zone (${localTimeZone}).`}</Text>
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => setDatePickerTarget("reminderDate")}><Text style={styles.secondaryButtonText}>Date: {dateKey}</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => setTimePickerTarget("reminderTime")}><Text style={styles.secondaryButtonText}>Time: {timeValue}</Text></Pressable>
        </View>
      </>}
      {preview ? <View style={styles.statusCard}>
        <Text style={styles.statusEyebrow}>Preview</Text>
        <Text style={styles.statusLine}>Server ({serverTimeLabel}): {formatReminderDateTimeDisplay(preview.scheduledForUtc, serverTimeZone, language)}</Text>
        <Text style={styles.statusLine}>Local: {formatReminderDateTimeDisplay(preview.scheduledForUtc, localTimeZone, language)}</Text>
      </View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={handleCreate}><Text style={styles.buttonText}>Create Reminder</Text></Pressable>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Active Reminders</Text>
      {activeReminders.length ? activeReminders.map((reminder) => renderReminderCard(reminder, true)) : <Text style={styles.hint}>No active reminders yet.</Text>}
    </View>
    {pastReminders.length ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>Past Reminders</Text>
      {pastReminders.map((reminder) => renderReminderCard(reminder, false))}
    </View> : null}
    <CalendarDatePickerModal visible={datePickerTarget === "reminderDate"} title="Select Reminder Date" value={dateKey} onChange={setDateKey} onClose={() => setDatePickerTarget("")} language={language} />
    <CalendarTimePickerModal visible={timePickerTarget === "reminderTime"} title="Select Reminder Time" value={timeValue} onChange={setTimeValue} onClose={() => setTimePickerTarget("")} language={language} />
  </View>;
}
function DesertStormHistoryView({ layouts, currentUserIsLeader, onUpdateResult }) {
  const [selectedLayoutId, setSelectedLayoutId] = useState("");
  const selectedLayout = layouts.find((layout) => layout.id === selectedLayoutId) || null;

  useEffect(() => {
    if (selectedLayoutId && !selectedLayout) {
      setSelectedLayoutId("");
    }
  }, [selectedLayoutId, selectedLayout]);

  function handleResultPress(layout, nextResult) {
    if (layout.result === nextResult) return;
    if (layout.result !== "pending") {
      Alert.alert(
        "Change Desert Storm Result",
        `Are you sure you want to change this result from ${layout.result} to ${nextResult}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Change", style: "default", onPress: () => onUpdateResult(layout.id, nextResult) }
        ]
      );
      return;
    }
    onUpdateResult(layout.id, nextResult);
  }

  if (!layouts.length) {
    return <View style={styles.card}><Text style={styles.cardTitle}>Desert Storm History</Text><Text style={styles.hint}>Locked layouts preserve each week’s positions and result.</Text><Text style={styles.hint}>No Desert Storm layouts have been locked in yet.</Text></View>;
  }

  if (!selectedLayout) {
    return <View style={styles.card}><Text style={styles.cardTitle}>Desert Storm History</Text><Text style={styles.hint}>Tap a locked date to open that saved setup.</Text>{layouts.map((layout) => <Pressable key={layout.id} style={styles.voteCard} onPress={() => setSelectedLayoutId(layout.id)}><Text style={styles.sectionTitle}>{layout.lockedInAt.slice(0, 10)}</Text><Text style={styles.hint}>{layout.title}</Text><Text style={styles.hint}>Locked by {layout.lockedByName || "Leader"} • {layout.result}</Text></Pressable>)}</View>;
  }
  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Desert Storm History</Text>
    <Text style={styles.hint}>{selectedLayout.title}</Text>
    <Text style={styles.hint}>Locked on {selectedLayout.lockedInAt.slice(0, 10)} by {selectedLayout.lockedByName || "Leader"}</Text>
    <Text style={styles.line}>Result: {getDesertStormStatusLabel(selectedLayout.result || "pending")}</Text>
    {selectedLayout.notes ? <Text style={styles.line}>Notes: {selectedLayout.notes}</Text> : null}
    <Pressable style={styles.secondaryButton} onPress={() => setSelectedLayoutId("")}>
      <Text style={styles.secondaryButtonText}>Back to History</Text>
    </Pressable>
    {Object.values(selectedLayout.taskForces || {}).map((taskForce) => <View key={taskForce.key || taskForce.label} style={styles.section}>
      <Text style={styles.sectionTitle}>{taskForce.label || "Task Force"}</Text>
      {(taskForce.squads || []).map((squad) => <View key={squad.id || squad.label} style={styles.voteCard}>
        <Text style={styles.line}>{squad.label}</Text>
        {(squad.slots || []).map((slot) => <Text key={slot.id || slot.label} style={styles.hint}>{slot.label}: {slot.playerName || "Open"}</Text>)}
      </View>)}
    </View>)}
    {currentUserIsLeader ? <View style={styles.row}>
      <Pressable style={[styles.secondaryButton, styles.half, selectedLayout.result === "pending" && styles.modeButtonActive]} onPress={() => handleResultPress(selectedLayout, "pending")}><Text style={[styles.secondaryButtonText, selectedLayout.result === "pending" && styles.modeButtonTextActive]}>Pending</Text></Pressable>
      <Pressable style={[styles.button, styles.half]} onPress={() => handleResultPress(selectedLayout, "win")}><Text style={styles.buttonText}>Win</Text></Pressable>
      <Pressable style={[styles.dangerButton, styles.half]} onPress={() => handleResultPress(selectedLayout, "loss")}><Text style={styles.dangerButtonText}>Loss</Text></Pressable>
    </View> : null}
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

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>{calendarT("title")}</Text>
    <Text style={styles.hint}>{calendarT("hint")}</Text>
    <View style={styles.row}>
      <Pressable style={[styles.secondaryButton, styles.half, calendarView === "today" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("today")}><Text style={[styles.secondaryButtonText, calendarView === "today" && styles.modeButtonTextActive]}>{calendarT("today")}</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, calendarView === "week" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("week")}><Text style={[styles.secondaryButtonText, calendarView === "week" && styles.modeButtonTextActive]}>{calendarT("week")}</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, calendarView === "month" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("month")}><Text style={[styles.secondaryButtonText, calendarView === "month" && styles.modeButtonTextActive]}>{calendarT("month")}</Text></Pressable>
    </View>
    {calendarView === "month" ? <View style={styles.calendarMonthShell}>
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
    </View> : null}
    {calendarView === "week" ? <View style={styles.calendarStrip}>{weekDays.map((day) => renderDayButton(day, true))}</View> : null}
    {calendarView === "today" ? <View style={styles.calendarStrip}>{renderDayButton(today, true)}</View> : null}
    <View style={styles.calendarDetailCard}>
      <View style={styles.calendarDetailHeader}>
        <View style={styles.memberHeaderText}>
          <Text style={styles.sectionTitle}>{selectedDateLabel}</Text>
          <Text style={styles.hint}>{selectedEntries.length ? (selectedEntries.length === 1 ? calendarT("oneEventScheduled") : calendarT("manyEventsScheduled", { count: selectedEntries.length })) : calendarT("noEventsScheduled")}</Text>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>{calendarT("selectedDay")}</Text>
          <Text style={styles.memberStatValue}>{selectedDateShortLabel}</Text>
        </View>
      </View>
      {selectedEntries.length ? selectedEntries.map((entry) => <Pressable key={entry.occurrenceId || entry.id} style={styles.voteCard} disabled={!entry.linkedType} onPress={() => entry.linkedType && onOpenLinkedEntry(entry)}>
        <View style={styles.memberCardHeader}>
          <View style={styles.memberHeaderText}>
            <Text style={styles.sectionTitle}>{entry.title}</Text>
            <Text style={styles.hint}>{entry.allDay !== false ? calendarT("allDay") : entry.localDisplayTime || entry.displayTime}{entry.leaderOnly ? ` • ${calendarT("leaderOnly")}` : ""}</Text>
          </View>
          {currentUserIsLeader ? <View style={styles.memberCardActions}><Pressable style={styles.secondaryButton} onPress={() => onEditEntry(entry)}><Text style={styles.secondaryButtonText}>{calendarT("edit")}</Text></Pressable><Pressable style={styles.dangerButton} onPress={() => onDeleteEntry(entry.sourceEntryId || entry.id)}><Text style={styles.dangerButtonText}>{calendarT("delete")}</Text></Pressable></View> : null}
        </View>
        {entry.description ? <Text style={styles.line}>{entry.description}</Text> : null}
        {getRepeatLabel(entry) ? <Text style={styles.hint}>{getRepeatLabel(entry)}</Text> : null}
        {entry.allDay === false ? <Text style={styles.hint}>{calendarT("serverTime")}: {entry.serverDisplayDateTime || entry.serverDisplayTime}</Text> : null}
        {entry.allDay === false ? <Text style={styles.hint}>{calendarT("memberLocalTime")}: {entry.localDisplayDateTime || entry.localDisplayTime}</Text> : null}
        {entry.linkedType === "desertStorm" ? <Text style={styles.selectedPlayerHint}>{calendarT("linkedDesertStorm")}</Text> : null}
        {entry.linkedType === "zombieSiege" ? <Text style={styles.selectedPlayerHint}>{calendarT("linkedZombieSiege")}</Text> : null}
        {currentUserIsLeader && entry.leaderNotes ? <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{calendarT("leaderNotes")}</Text><Text style={styles.line}>{entry.leaderNotes}</Text></View> : null}
        <Text style={styles.hint}>{calendarT("addedBy", { name: entry.createdByName || "Leader" })}</Text>
      </Pressable>) : <Text style={styles.hint}>{calendarView === "today" ? calendarT("nothingToday") : calendarT("tapAnotherDay")}</Text>}
    </View>
    {currentUserIsLeader ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>{editingCalendarEntryId ? calendarT("editEntry") : calendarT("addEntry")}</Text>
      <View style={styles.rankFilterRow}>
        {[["manual", calendarT("manualEvent")], ["reminder", calendarT("reminder")], ["linked_desert_storm", calendarT("linkDesertStorm")], ["linked_zombie_siege", calendarT("linkZombieSiege")]].map(([value, label]) => <Pressable key={value} style={[styles.rankFilterButton, newCalendarEntryType === value && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarEntryType(value)}><Text style={[styles.rankFilterButtonText, newCalendarEntryType === value && styles.rankFilterButtonTextActive]}>{label}</Text></Pressable>)}
      </View>
      <TextInput value={newCalendarTitle} onChangeText={onChangeNewCalendarTitle} style={styles.input} placeholder={calendarT("eventTitle")} />
      <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("startDate")}><Text style={styles.line}>{calendarT("startDate")}: {formatCalendarDateButtonLabel(newCalendarDate, language) || calendarT("chooseDate")}</Text></Pressable>
      <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("endDate")}><Text style={styles.line}>{calendarT("endDate")}: {formatCalendarDateButtonLabel(newCalendarEndDate, language) || calendarT("chooseDate")}</Text></Pressable>
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, newCalendarAllDay && styles.modeButtonActive]} onPress={onToggleNewCalendarAllDay}><Text style={[styles.secondaryButtonText, newCalendarAllDay && styles.modeButtonTextActive]}>{newCalendarAllDay ? calendarT("allDayEntry") : calendarT("timeSpecificEntry")}</Text></Pressable>
      </View>
      {!newCalendarAllDay ? <View style={styles.section}>
        <Text style={styles.hint}>{calendarT("inputMode")}</Text>
        <Text style={styles.hint}>{calendarT("inputModeHint")}</Text>
        <View style={styles.rankFilterRow}>
          {CALENDAR_TIME_INPUT_MODES.map((mode) => <Pressable key={mode.id} style={[styles.rankFilterButton, newCalendarTimeInputMode === mode.id && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarTimeInputMode(mode.id)}><Text style={[styles.rankFilterButtonText, newCalendarTimeInputMode === mode.id && styles.rankFilterButtonTextActive]}>{mode.id === "server" ? calendarT("serverInputMode") : calendarT("localInputMode")}</Text></Pressable>)}
        </View>
        <View style={styles.row}>
          <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarTimePickerTarget("start")}><Text style={styles.line}>{calendarT("startTime")}: {newCalendarStartTime}</Text></Pressable>
          <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarTimePickerTarget("end")}><Text style={styles.line}>{calendarT("endTime")}: {newCalendarEndTime}</Text></Pressable>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>{calendarT("timePreview")}</Text>
          <Text style={styles.hint}>{calendarT("previewEnteredAs", { value: newCalendarTimeInputMode === "server" ? calendarT("serverInputMode") : calendarT("localInputMode") })}</Text>
          <Text style={styles.line}>{calendarT("serverTime")}: {timePreview?.serverDisplay || "--"}</Text>
          <Text style={styles.line}>{calendarT("localTime")}: {timePreview?.localDisplay || "--"} ({normalizeCalendarTimeZone(newCalendarEventTimeZone)})</Text>
          <Text style={styles.hint}>{calendarT("recurringServerAnchor")}</Text>
        </View>
      </View> : null}
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
        {newCalendarRepeatEndDate ? <Pressable style={styles.secondaryButton} onPress={() => onChangeNewCalendarRepeatEndDate("")}><Text style={styles.secondaryButtonText}>{calendarT("clearRepeatEndDate")}</Text></Pressable> : null}
      </View> : null}
      <TextInput value={newCalendarDescription} onChangeText={onChangeNewCalendarDescription} style={[styles.input, styles.textArea]} placeholder={newCalendarEntryType === "reminder" ? calendarT("reminderPlaceholder") : calendarT("manualPlaceholder")} multiline />
      <TextInput value={newCalendarLeaderNotes} onChangeText={onChangeNewCalendarLeaderNotes} style={[styles.input, styles.textArea]} placeholder={calendarT("leaderNotes")} multiline />
      {!newCalendarAllDay ? <Text style={styles.hint}>{calendarT("timezoneHint", { value: getServerTimeLabel() })}</Text> : null}
      {calendarFormError ? <Text style={styles.error}>{calendarFormError}</Text> : null}
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, newCalendarLeaderOnly && styles.modeButtonActive]} onPress={onToggleLeaderOnly}><Text style={[styles.secondaryButtonText, newCalendarLeaderOnly && styles.modeButtonTextActive]}>{newCalendarLeaderOnly ? calendarT("leaderOnlyEntry") : calendarT("visibleToEveryone")}</Text></Pressable>
        <Pressable style={[styles.button, styles.half]} onPress={onCreateEntry}><Text style={styles.buttonText}>{editingCalendarEntryId ? calendarT("saveChanges") : calendarT("addToCalendar")}</Text></Pressable>
      </View>
      {editingCalendarEntryId ? <Pressable style={styles.secondaryButton} onPress={onCancelEdit}><Text style={styles.secondaryButtonText}>{calendarT("cancelEditing")}</Text></Pressable> : null}
    </View> : null}
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

  return <View style={styles.card}><Text style={styles.cardTitle}>Zombie Siege</Text><Text style={styles.hint}>Voting stays open for the live event until a leader ends it. Finished events move into the archive folder.</Text><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, folder === "active" && styles.modeButtonActive]} onPress={() => setFolder("active")}><Text style={[styles.secondaryButtonText, folder === "active" && styles.modeButtonTextActive]}>Active Events</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, folder === "archived" && styles.modeButtonActive]} onPress={() => setFolder("archived")}><Text style={[styles.secondaryButtonText, folder === "archived" && styles.modeButtonTextActive]}>Archived Events</Text></Pressable></View>{visibleEvents.length ? <View style={styles.section}><Text style={styles.sectionTitle}>{folder === "archived" ? "Archived Zombie Siege Events" : "Active Zombie Siege Events"}</Text>{visibleEvents.map((event) => <Pressable key={event.id} style={[styles.voteCard, selectedEventId === event.id && styles.zombieSelectedCard]} onPress={() => onSelectEvent(event.id)}><Text style={styles.sectionTitle}>{event.title}</Text><Text style={styles.hint}>{String(event.startAt).slice(0, 16)} to {String(event.endAt).slice(0, 16)}</Text><Text style={styles.hint}>Status: {event.status} • Threshold: {Number(event.wave20Threshold || 0).toFixed(2)}M</Text>{event.publishedPlanSummary ? <Text style={styles.line}>Published survivors: {event.publishedPlanSummary.projectedSurvivors}</Text> : null}</Pressable>)}</View> : <Text style={styles.hint}>{folder === "archived" ? "No archived Zombie Siege events yet." : "No active Zombie Siege events yet."}</Text>}{currentUserIsLeader && folder === "active" ? <View style={styles.section}><Text style={styles.sectionTitle}>Create Zombie Siege Event</Text><TextInput value={newTitle} onChangeText={onChangeNewTitle} style={styles.input} placeholder="Event title" /><Text style={styles.hint}>Event start: when Zombie Siege begins for your alliance.</Text><TextInput value={newStartAt} onChangeText={onChangeNewStartAt} style={styles.input} placeholder="YYYY-MM-DDTHH:mm" /><Text style={styles.hint}>Event end: when the event window is over.</Text><TextInput value={newEndAt} onChangeText={onChangeNewEndAt} style={styles.input} placeholder="YYYY-MM-DDTHH:mm" /><Text style={styles.hint}>Wave 20 threshold: total defending squad power needed for a base to pass wave 20.</Text><TextInput value={newThreshold} onChangeText={onChangeNewThreshold} style={styles.input} placeholder="Wave 20 threshold" keyboardType="decimal-pad" /><Pressable style={styles.button} onPress={onCreateEvent}><Text style={styles.buttonText}>Create Event</Text></Pressable></View> : null}{selectedEvent ? <View style={styles.section}><Text style={styles.sectionTitle}>{selectedEvent.title}</Text><Text style={styles.line}>Event Window: {String(selectedEvent.startAt).slice(0, 16)} to {String(selectedEvent.endAt).slice(0, 16)}</Text><Text style={styles.line}>Wave 20 Threshold: {Number(selectedEvent.wave20Threshold || 0).toFixed(2)}M</Text><Text style={styles.line}>Your status: {selectedEvent.myAvailabilityStatus || "no_response"}</Text>{selectedEvent.status !== "archived" ? <View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, selectedEvent.myAvailabilityStatus === "online" && styles.modeButtonActive]} onPress={() => onSubmitAvailability(selectedEvent.id, "online")}><Text style={[styles.secondaryButtonText, selectedEvent.myAvailabilityStatus === "online" && styles.modeButtonTextActive]}>I Will Be Online</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, selectedEvent.myAvailabilityStatus === "offline" && styles.modeButtonActive]} onPress={() => onSubmitAvailability(selectedEvent.id, "offline")}><Text style={[styles.secondaryButtonText, selectedEvent.myAvailabilityStatus === "offline" && styles.modeButtonTextActive]}>I Will Be Offline</Text></Pressable></View> : <Text style={styles.hint}>This event has ended and is now archived.</Text>}{currentUserIsLeader ? <><View style={styles.memberStatGrid}><View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Online</Text><Text style={styles.memberStatValue}>{availabilityCounts.online || 0}</Text></View><View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Offline</Text><Text style={styles.memberStatValue}>{availabilityCounts.offline || 0}</Text></View><View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>No Response</Text><Text style={styles.memberStatValue}>{availabilityCounts.no_response || 0}</Text></View></View>{selectedEvent.status !== "archived" ? <View style={styles.row}><Pressable style={[styles.button, styles.half]} onPress={() => onRunPlan(selectedEvent.id)}><Text style={styles.buttonText}>Run Planner</Text></Pressable>{selectedEvent.draftPlan ? <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onPublishPlan(selectedEvent.id)}><Text style={styles.secondaryButtonText}>Publish To Members</Text></Pressable> : <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onDiscardDraft(selectedEvent.id)}><Text style={styles.secondaryButtonText}>Clear Draft</Text></Pressable>}</View> : null}{selectedEvent.draftPlan ? <View style={styles.zombiePlanCard}><Text style={styles.sectionTitle}>Draft Review</Text><Text style={styles.line}>Projected survivors: {selectedEvent.draftPlan.projectedSurvivors}</Text><Text style={styles.line}>Online survivors: {selectedEvent.draftPlan.projectedOnlineSurvivors}</Text><Text style={styles.line}>Offline survivors: {selectedEvent.draftPlan.projectedOfflineSurvivors}</Text><Text style={styles.line}>Assignment changes vs published plan: {selectedEvent.draftPlan.summary?.changedAssignments || 0}</Text><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onPublishPlan(selectedEvent.id)}><Text style={styles.secondaryButtonText}>Publish Draft</Text></Pressable><Pressable style={[styles.dangerButton, styles.half]} onPress={() => onDiscardDraft(selectedEvent.id)}><Text style={styles.dangerButtonText}>Discard Draft</Text></Pressable></View></View> : null}{currentReviewRows.length && selectedEvent.status !== "archived" ? <View style={styles.zombiePlanCard}><Text style={styles.sectionTitle}>Post-Wave-1 Review</Text><Text style={styles.hint}>Review no-response players and note whether they actually had troops on their wall after wave 1.</Text>{currentReviewRows.map((row) => <View key={row.playerId} style={styles.voteCard}><Text style={styles.sectionTitle}>{row.playerName}</Text><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, row.wallStatus === "had_wall" && styles.modeButtonActive]} onPress={() => setReviewDrafts((current) => ({ ...current, [row.playerId]: "had_wall" }))}><Text style={[styles.secondaryButtonText, row.wallStatus === "had_wall" && styles.modeButtonTextActive]}>Had Troops On Wall</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, row.wallStatus === "no_wall" && styles.modeButtonActive]} onPress={() => setReviewDrafts((current) => ({ ...current, [row.playerId]: "no_wall" }))}><Text style={[styles.secondaryButtonText, row.wallStatus === "no_wall" && styles.modeButtonTextActive]}>No Troops On Wall</Text></Pressable></View></View>)}<Pressable style={styles.button} onPress={() => onSaveWaveOneReview(selectedEvent.id, currentReviewRows)}><Text style={styles.buttonText}>Save Wave 1 Review</Text></Pressable></View> : null}{selectedEvent.publishedPlan ? <View style={styles.zombiePlanCard}><Text style={styles.sectionTitle}>Published Plan</Text><Text style={styles.line}>Projected survivors: {selectedEvent.publishedPlan.projectedSurvivors}</Text><Text style={styles.line}>Protected players: {selectedEvent.publishedPlan.summary?.protectedCount || 0}</Text><Text style={styles.line}>Sacrificed donors: {selectedEvent.publishedPlan.summary?.sacrificedCount || 0}</Text></View> : null}{selectedEvent.status !== "archived" ? <Pressable style={styles.dangerButton} onPress={() => onEndEvent(selectedEvent.id)}><Text style={styles.dangerButtonText}>Event Has Ended</Text></Pressable> : null}</> : null}{selectedEvent.myAssignment ? <View style={styles.zombiePlanCard}><Text style={styles.sectionTitle}>Your Assignment</Text>{selectedEvent.myAssignment.instructions?.map((instruction, index) => <Text key={`${selectedEvent.myAssignment.playerId}-${index}`} style={styles.line}>• {instruction}</Text>)}</View> : null}</View> : null}</View>;
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

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>{t("feedbackTitle")}</Text>
    <Text style={styles.hint}>{t("feedbackHint")}</Text>
    <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Current Build</Text><Text style={styles.memberStatValue}>{buildLabel}</Text></View>
    <View style={styles.section}>
      <TextInput value={newFeedbackText} onChangeText={onChangeNewFeedbackText} style={[styles.input, styles.textArea]} placeholder={t("feedbackExample")} multiline />
      <Pressable style={styles.button} onPress={onSubmitFeedback}><Text style={styles.buttonText}>{t("submitFeedback")}</Text></Pressable>
    </View>
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t("allianceFeedback")}</Text>
      {feedbackEntries.length ? feedbackEntries.map((entry) => {
        const commentDraft = commentDrafts[entry.id] || "";
        return <View key={entry.id} style={styles.voteCard}>
          <Text style={styles.line}>{entry.message}</Text>
          <Text style={styles.hint}>{t("feedbackFrom", { name: entry.createdByName || "Member", date: String(entry.createdAt).slice(0, 10) })}</Text>
          <View style={styles.feedbackCommentList}>
            {(entry.comments || []).length ? entry.comments.map((comment) => <View key={comment.id} style={styles.feedbackCommentCard}>
              <Text style={styles.line}>{comment.message}</Text>
              <Text style={styles.hint}>{comment.createdByName || "Member"} • {String(comment.createdAt).slice(0, 10)}</Text>
            </View>) : <Text style={styles.hint}>No comments yet.</Text>}
          </View>
          <View style={styles.feedbackCommentComposer}>
            <TextInput value={commentDraft} onChangeText={(value) => updateCommentDraft(entry.id, value)} style={[styles.input, styles.feedbackCommentInput]} placeholder="Add a comment" multiline />
            <Pressable style={styles.secondaryButton} onPress={() => onSubmitFeedbackComment(entry.id, commentDraft, () => updateCommentDraft(entry.id, ""))}><Text style={styles.secondaryButtonText}>Comment</Text></Pressable>
          </View>
        </View>;
      }) : <Text style={styles.hint}>{t("noFeedback")}</Text>}
    </View>
  </View>;
}
function AllianceView({ alliance, account, currentUser, currentUserIsLeader, joinRequests, newMemberName, newMemberRank, newMemberPower, newAllianceCode, onChangeNewMemberName, onChangeNewMemberRank, onChangeNewMemberPower, onChangeNewAllianceCode, onAddMember, onApproveJoinRequest, onRejectJoinRequest, onLeaveAlliance, onRotateAllianceCode, onSignOut, t, language, onChangeLanguage }) { return <View style={styles.card}><Text style={styles.cardTitle}>{t("allianceTitle")}</Text><LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} /><Text style={styles.line}>{t("accountLabel", { value: account?.username })}</Text><Text style={styles.line}>{t("allianceLabel", { value: alliance?.name })}</Text><Text style={styles.line}>{t("codeLabel", { value: alliance?.code })}</Text><Text style={styles.line}>{t("signedInAsPlayer", { value: currentUser?.name })}</Text><Pressable style={styles.secondaryButton} onPress={onSignOut}><Text style={styles.secondaryButtonText}>{t("signOut")}</Text></Pressable>{currentUserIsLeader ? <><View style={styles.section}><Text style={styles.sectionTitle}>{t("pendingJoinRequests")}</Text>{joinRequests?.length ? joinRequests.map((req) => <View key={req.id} style={styles.card}><Text style={styles.line}>{req.displayName}</Text><Text style={styles.hint}>{t("requestedWithCode", { code: req.allianceCode })}</Text><View style={styles.row}><Pressable style={[styles.button, styles.half]} onPress={() => onApproveJoinRequest(req.id)}><Text style={styles.buttonText}>{t("approve")}</Text></Pressable><Pressable style={[styles.dangerButton, styles.half]} onPress={() => onRejectJoinRequest(req.id)}><Text style={styles.dangerButtonText}>{t("reject")}</Text></Pressable></View></View>) : <Text style={styles.hint}>{t("noPendingRequests")}</Text>}</View><View style={styles.section}><Text style={styles.sectionTitle}>{t("rotateCode")}</Text><TextInput value={newAllianceCode} onChangeText={onChangeNewAllianceCode} style={styles.input} /><Pressable style={styles.button} onPress={onRotateAllianceCode}><Text style={styles.buttonText}>{t("updateCode")}</Text></Pressable></View><View style={styles.section}><Text style={styles.sectionTitle}>{t("addMember")}</Text><TextInput value={newMemberName} onChangeText={onChangeNewMemberName} style={styles.input} placeholder={t("name")} /><Text style={styles.hint}>{POWER_INPUT_HINT}</Text><View style={styles.row}><RankSelector value={newMemberRank} onChange={onChangeNewMemberRank} style={styles.half} /><TextInput value={newMemberPower} onChangeText={onChangeNewMemberPower} style={[styles.input, styles.half]} placeholder={t("power")} keyboardType="decimal-pad" /></View><Pressable style={styles.button} onPress={onAddMember}><Text style={styles.buttonText}>{t("addMember")}</Text></Pressable></View></> : <View style={styles.section}><Text style={styles.sectionTitle}>{t("memberOptions")}</Text><Text style={styles.hint}>{t("leaveAnyTime")}</Text><Pressable style={styles.dangerButton} onPress={() => Alert.alert(t("leaveAllianceTitle"), t("leaveAllianceConfirm"), [{ text: t("cancel"), style: "cancel" }, { text: t("leave"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{t("leaveAlliance")}</Text></Pressable></View>}</View>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f3efe3" },
  keyboardShell: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 },
  screen: { flex: 1, padding: 18, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#1f2a1f" },
  hint: { fontSize: 14, color: "#566156" },
  line: { color: "#435043", fontSize: 15 },
  error: { color: "#8b241f", fontWeight: "700" },
  alertBanner: { backgroundColor: "#f2dfc2", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#d9ba84", gap: 4 },
  alertBannerTitle: { fontSize: 16, fontWeight: "700", color: "#5d3f11" },
  alertBannerText: { fontSize: 14, color: "#72542b" },
  voteBanner: { backgroundColor: "#dde9f3", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#b6cade", gap: 4 },
  voteBannerTitle: { fontSize: 16, fontWeight: "700", color: "#244a68" },
  voteBannerText: { fontSize: 14, color: "#40627d" },
  card: { backgroundColor: "#fbf7ee", borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: "#e2d8c5" },
  cardTitle: { fontSize: 22, fontWeight: "700", color: "#1f2a1f" },
  input: { backgroundColor: "#f3eee1", borderRadius: 12, borderWidth: 1, borderColor: "#ddd0b9", paddingHorizontal: 12, paddingVertical: 10, color: "#243025" },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  button: { backgroundColor: "#1f5c4d", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  disabledButton: { opacity: 0.55 },
  buttonText: { color: "#f7f4ee", fontWeight: "700" },
  secondaryButton: { backgroundColor: "#efe5d2", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  secondaryButtonText: { color: "#544636", fontWeight: "700" },
  modeButtonActive: { backgroundColor: "#1f5c4d", borderWidth: 1, borderColor: "#1f5c4d" },
  modeButtonTextActive: { color: "#f7f4ee" },
  dangerButton: { backgroundColor: "#7f221d", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  dangerButtonText: { color: "#fff5f4", fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  languageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  languageButton: { backgroundColor: "#efe5d2", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#d8c6a6" },
  languageButtonActive: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" },
  languageButtonText: { color: "#544636", fontWeight: "700" },
  languageButtonTextActive: { color: "#f7f4ee" },
  rankSelectorWrap: { gap: 6 },
  rankSelectorButton: { backgroundColor: "#f3eee1", borderRadius: 12, borderWidth: 1, borderColor: "#ddd0b9", paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rankDropdown: { backgroundColor: "#fbf7ee", borderRadius: 12, borderWidth: 1, borderColor: "#ddd0b9", overflow: "hidden" },
  rankOption: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#eee3cf" },
  rankOptionActive: { backgroundColor: "#dff0e5" },
  rankOptionText: { color: "#243025", fontWeight: "600" },
  rankOptionTextActive: { color: "#17352b" },
  half: { flex: 1 },
  third: { flex: 1 },
  tabs: { flexGrow: 0, minHeight: 52 },
  tab: { backgroundColor: "#f5ead8", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: "#ccb99a", shadowColor: "#3d3124", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  tabActive: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" },
  tabText: { color: "#3f3429", fontWeight: "700", fontSize: 14, lineHeight: 18, includeFontPadding: false, textAlignVertical: "center" },
  tabTextActive: { color: "#f8f5ef" },
  content: { flexGrow: 1, gap: 12, paddingBottom: 96 },
  section: { gap: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#213126" },
  disabled: { opacity: 0.55 },
  pick: { backgroundColor: "#f3eee1", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd0b9" },
  pickText: { color: "#243025", fontWeight: "600" },
  selectedPlayerBox: { backgroundColor: "#dff0e5", borderColor: "#4f8a6e", borderWidth: 2 },
  selectedPlayerText: { color: "#17352b" },
  selectedPlayerHint: { color: "#2a6d52", fontSize: 12, fontWeight: "700", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.6 },
  dangerBox: { borderColor: "#be3e36", backgroundColor: "#f9e1de" },
  dashboardShell: { backgroundColor: "#fbf7ee", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "#e2d8c5" },
  metricGrid: { flexDirection: "row", gap: 10 },
  dashboardMetricA: { flex: 1, backgroundColor: "#dbe9e1", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#c7d9cf" },
  dashboardMetricB: { flex: 1, backgroundColor: "#efe4cf", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#deceb2" },
  metricLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#587262", marginBottom: 8 },
  metricPanelValue: { fontSize: 24, fontWeight: "700", color: "#17352b" },
  dashboardCompare: { backgroundColor: "#1f5c4d", borderRadius: 18, padding: 16, gap: 6 },
  dashboardCompareValue: { fontSize: 28, fontWeight: "700", color: "#f7f4ee" },
  profileCard: { backgroundColor: "#fbf7ee", borderRadius: 22, padding: 18, gap: 16, borderWidth: 1, borderColor: "#e2d8c5" },
  profileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  profileEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: "#7a6a55", marginBottom: 6 },
  profileRank: { fontSize: 15, color: "#5b665a", marginTop: 4 },
  rankBadge: { backgroundColor: "#1f5c4d", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  rankBadgeText: { color: "#f7f4ee", fontWeight: "700" },
  metricPanel: { flex: 1, backgroundColor: "#e8f1ea", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#cfe0d5" },
  statusCard: { borderRadius: 18, padding: 16, gap: 6, borderWidth: 1 },
  statusCardActive: { backgroundColor: "#dff0e5", borderColor: "#9cc8ad" },
  statusCardInactive: { backgroundColor: "#f2ecdf", borderColor: "#ddd0b9" },
  statusEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: "#5f6d60" },
  statusTitle: { fontSize: 22, fontWeight: "700", color: "#1b3327" },
  statusLine: { fontSize: 15, color: "#435043" },
  todayItem: { backgroundColor: "#fbf7ee", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e3d8c3", gap: 4 },
  todayItemTitle: { fontSize: 16, fontWeight: "700", color: "#1f2a1f" },
  voteStatusRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  voteStatusTitle: { flex: 1, flexShrink: 1, paddingRight: 8 },
  votePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden", fontSize: 12, fontWeight: "700", flexShrink: 0, alignSelf: "flex-start" },
  votePillDone: { backgroundColor: "#d8ecdf", color: "#24523e" },
  votePillPending: { backgroundColor: "#f0e3c8", color: "#6b4f20" },
  squadCard: { flex: 1, backgroundColor: "#f4efe4", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#e0d4be", gap: 8 },
  squadLabel: { fontSize: 13, fontWeight: "700", color: "#5b665a", textTransform: "uppercase", letterSpacing: 0.7 },
  voteCard: { backgroundColor: "#f5efe3", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: "#e0d4be" },
  feedbackCommentList: { gap: 8, marginTop: 4 },
  feedbackCommentCard: { backgroundColor: "#fbf7ee", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "#e2d8c5", gap: 4 },
  feedbackCommentComposer: { gap: 8, marginTop: 4 },
  feedbackCommentInput: { minHeight: 72 },
  voteOptionWrap: { gap: 4 },
  voteOption: { backgroundColor: "#fbf7ee", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd0b9" },
  voteOptionSelected: { borderColor: "#4f8a6e", backgroundColor: "#dff0e5" },
  voteOptionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  voteCount: { fontSize: 14, fontWeight: "700", color: "#5b665a" },
  voteResponseList: { fontSize: 13, color: "#5c6558", lineHeight: 18 },
  inlineSummary: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e2d8c5" },
  memberCard: { backgroundColor: "#f7f1e5", borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: "#dfd1b7" },
  memberCardSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  memberSummaryText: { flex: 1, gap: 2 },
  memberSummaryRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  memberExpandIcon: { fontSize: 24, fontWeight: "700", color: "#5d4b36", width: 22, textAlign: "center" },
  memberCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  memberCardActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  memberHeaderText: { flex: 1, gap: 4 },
  memberName: { fontSize: 20, fontWeight: "700", color: "#1f2a1f" },
  memberNameCompact: { fontSize: 18, fontWeight: "700", color: "#1f2a1f" },
  memberSubline: { fontSize: 14, color: "#6a725f" },
  memberRankChip: { backgroundColor: "#1f5c4d", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  memberRankChipText: { color: "#f7f4ee", fontWeight: "700" },
  memberStatGrid: { flexDirection: "row", gap: 10 },
  memberStatCard: { flex: 1, backgroundColor: "#fbf7ee", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e3d8c3", gap: 6 },
  memberStatLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#6a725f" },
  memberStatValue: { fontSize: 18, fontWeight: "700", color: "#1f2a1f" },
  memberSection: { gap: 8 },
  memberSectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#6a725f" },
  rankFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rankFilterButton: { backgroundColor: "#efe5d2", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#d8c6a6" },
  rankFilterButtonActive: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" },
  rankFilterButtonText: { color: "#544636", fontWeight: "700" },
  rankFilterButtonTextActive: { color: "#f7f4ee" },
  calendarMonthShell: { backgroundColor: "#f6f0e4", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "#e1d6c2", gap: 10 },
  calendarMonthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarMonthArrow: { width: 40, height: 40, borderRadius: 999, backgroundColor: "#efe5d2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d8c6a6" },
  calendarMonthArrowText: { fontSize: 24, fontWeight: "700", color: "#544636", marginTop: -2 },
  calendarMonthTitle: { fontSize: 18, fontWeight: "700", color: "#213126" },
  calendarWeekdayRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  calendarWeekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: "#7a6a55", textTransform: "uppercase" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  calendarStrip: { flexDirection: "row", gap: 8 },
  calendarDayCell: { width: "13.3%", minHeight: 88, backgroundColor: "#fbf7ee", borderRadius: 16, borderWidth: 1, borderColor: "#e2d8c5", paddingHorizontal: 6, paddingVertical: 8, alignItems: "center", justifyContent: "space-between" },
  calendarDayCellCompact: { flex: 1, width: undefined, minHeight: 82 },
  calendarDayCellMuted: { opacity: 0.5 },
  calendarDayCellToday: { borderColor: "#6ca88a", borderWidth: 2 },
  calendarDayCellSelected: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" },
  calendarDayWeekLabel: { fontSize: 11, fontWeight: "700", color: "#6a725f", textTransform: "uppercase" },
  calendarDayWeekLabelCompact: { fontSize: 12 },
  calendarDayNumber: { fontSize: 26, fontWeight: "700", color: "#213126" },
  calendarDayNumberCompact: { fontSize: 24 },
  calendarDayTextMuted: { color: "#9b9384" },
  calendarDayTextSelected: { color: "#f7f4ee" },
  calendarEventBadge: { minWidth: 24, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#e1efe6", alignItems: "center", justifyContent: "center" },
  calendarEventBadgeSelected: { backgroundColor: "#f7f4ee" },
  calendarEventBadgeText: { fontSize: 12, fontWeight: "700", color: "#21563f" },
  calendarEventBadgeTextSelected: { color: "#1f5c4d" },
  calendarEventSpacer: { height: 24 },
  calendarDetailCard: { backgroundColor: "#f3ede0", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#e1d6c2", gap: 10 },
  calendarDetailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  calendarTimeButton: { justifyContent: "center" },
  calendarWheelColumn: { flex: 1, height: 220, position: "relative" },
  calendarWheelContent: { paddingVertical: 90 },
  calendarWheelItem: { height: 40, justifyContent: "center", alignItems: "center" },
  calendarWheelText: { fontSize: 22, color: "#7a6a55", fontWeight: "600" },
  calendarWheelTextActive: { color: "#213126", fontWeight: "700" },
  calendarWheelHighlight: { position: "absolute", left: 0, right: 0, top: 90, height: 40, borderRadius: 12, backgroundColor: "rgba(31, 92, 77, 0.08)", borderWidth: 1, borderColor: "#c7d9cf" },
  calendarWheelHeader: { flexDirection: "row", justifyContent: "space-around", gap: 12 },
  calendarWheelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  calendarWheelDivider: { fontSize: 28, fontWeight: "700", color: "#5d4b36", paddingHorizontal: 4 },
  zombieSelectedCard: { backgroundColor: "#dff0e5", borderColor: "#4f8a6e" },
  zombiePlanCard: { backgroundColor: "#eef5ef", borderRadius: 16, padding: 14, gap: 8, borderWidth: 1, borderColor: "#cfe0d5" }
});


