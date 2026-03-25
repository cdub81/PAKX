import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import Constants from "expo-constants";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { addFeedback as addFeedbackRequest, addMember, approveJoinRequest, archiveVote as archiveVoteRequest, closeVote as closeVoteRequest, createAccount, createAlliance, createCalendarEntry as createCalendarEntryRequest, createVote as createVoteRequest, deleteCalendarEntry as deleteCalendarEntryRequest, deleteVote as deleteVoteRequest, getAlliancePreview, getJoinRequests, getMe, joinAlliance, leaveAlliance, lockInDesertStormLayout as lockInDesertStormLayoutRequest, normalizeBaseUrl, rejectJoinRequest, removeMember, reopenVote as reopenVoteRequest, resetTaskForces as resetTaskForcesRequest, signIn, submitVote as submitVoteRequest, updateAllianceCode, updateDesertStormLayoutResult as updateDesertStormLayoutResultRequest, updateMember, updateTaskForceSlot } from "./src/lib/api";
import { buildDashboard, buildTaskForceView, createPlayerOptions } from "./src/lib/roster";

const DEFAULT_BACKEND_URL = "https://pakx-production.up.railway.app";
const SESSION_STORAGE_KEY = "lwadmin-session";
const LANGUAGE_STORAGE_KEY = "lwadmin-language";
const ALL_TABS = ["myInfo", "desertStorm", "players", "voting", "calendar", "alliance", "feedback"];
const emptyTaskForces = () => ({ taskForceA: { key: "taskForceA", label: "Task Force A", squads: [] }, taskForceB: { key: "taskForceB", label: "Task Force B", squads: [] } });
const isLeader = (rank) => rank === "R5" || rank === "R4";
const DESERT_STORM_VOTE_TITLE = "Desert Storm Vote";
const DESERT_STORM_PLAY_LABEL = "I want to play";
const DESERT_STORM_SUB_LABEL = "I want to be a sub";
const DESERT_STORM_CANT_PLAY_LABEL = "i cant play";
const APP_VERSION = Constants.expoConfig?.version || "0.1.0";
const APP_BUILD = Constants.nativeBuildVersion || (Platform.OS === "ios" ? String(Constants.expoConfig?.ios?.buildNumber || "") : String(Constants.expoConfig?.android?.versionCode || ""));
const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" }
];
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
    votesNeedResponse: "{count} alliance votes need your response",
    oneVoteNeedsResponse: "1 alliance vote needs your response",
    tapOpenVoting: "Tap to open the Voting tab.",
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
    tabAlliance: "Settings",
    tabTaskForceA: "Task Force A",
    tabTaskForceB: "Task Force B",
    tabDSHistory: "DS History",
    tabFeedback: "Feedback",
    tabVoting: "Voting",
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
    allianceVotingTitle: "Alliance Voting",
    votesCompleted: "{count} of {total} votes completed",
    noActiveVotes: "No active votes right now",
    whenLeadersCreateVote: "When leaders create a vote, it will show up here.",
    votedStatus: "Voted",
    didNotVoteStatus: "Did Not Vote",
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
    votesNeedResponse: "{count}개의 투표에 응답이 필요합니다",
    oneVoteNeedsResponse: "1개의 투표에 응답이 필요합니다",
    tapOpenVoting: "투표 탭을 열려면 누르세요.",
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
    tabVoting: "투표",
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
    allianceVotingTitle: "얼라이언스 투표",
    votesCompleted: "{total}개 중 {count}개 투표 완료",
    noActiveVotes: "현재 진행 중인 투표가 없습니다",
    whenLeadersCreateVote: "리더가 투표를 만들면 여기에 표시됩니다.",
    votedStatus: "투표함",
    didNotVoteStatus: "미투표",
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
    votesNeedResponse: "{count} votos de alianza requieren respuesta",
    oneVoteNeedsResponse: "1 voto de alianza requiere respuesta",
    tapOpenVoting: "Toca para abrir la pestaña Votación.",
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
    tabVoting: "Votación",
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
    allianceVotingTitle: "Votación de la alianza",
    votesCompleted: "{count} de {total} votos completados",
    noActiveVotes: "No hay votos activos ahora mismo",
    whenLeadersCreateVote: "Cuando los líderes creen un voto, aparecerá aquí.",
    votedStatus: "Votó",
    didNotVoteStatus: "No votó",
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
    votesNeedResponse: "{count} votações da aliança aguardam resposta",
    oneVoteNeedsResponse: "1 votação da aliança aguarda resposta",
    tapOpenVoting: "Toque para abrir a aba Votação.",
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
    tabVoting: "Votação",
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
    allianceVotingTitle: "Votação da aliança",
    votesCompleted: "{count} de {total} votações concluídas",
    noActiveVotes: "Não há votações ativas agora",
    whenLeadersCreateVote: "Quando os líderes criarem uma votação, ela aparecerá aqui.",
    votedStatus: "Votou",
    didNotVoteStatus: "Não votou",
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

function parseVoteOptions(value) {
  return String(value || "").split(/\r?\n|,/).map((entry) => entry.trim()).filter(Boolean);
}

function getTranslator(language) {
  const locale = TRANSLATIONS[language] || TRANSLATIONS.en;
  return (key, values = {}) => {
    const template = locale[key] || TRANSLATIONS.en[key] || key;
    return String(template).replace(/\{(\w+)\}/g, (_, token) => values[token] ?? "");
  };
}

function tabLabel(tab, leader, joinRequests, unvotedCount, t) {
  if (tab === "myInfo") return t("tabMyInfo");
  if (tab === "players") return t("tabMembers");
  if (tab === "alliance") return `${t("tabAlliance")}${leader && joinRequests.length ? ` (${joinRequests.length})` : ""}`;
  if (tab === "desertStorm") return "Desert Storm";
  if (tab === "calendar") return "Calendar";
  if (tab === "feedback") return t("tabFeedback");
  if (tab === "voting") return `${t("tabVoting")}${unvotedCount ? ` (${unvotedCount})` : ""}`;
  return t("tabDashboard");
}

function getLatestDesertStormVote(votes) {
  return (votes || []).find((vote) => vote.title === DESERT_STORM_VOTE_TITLE) || null;
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
  const [errorMessage, setErrorMessage] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRank, setNewMemberRank] = useState("R1");
  const [newMemberPower, setNewMemberPower] = useState("");
  const [calendarView, setCalendarView] = useState("today");
  const [newCalendarTitle, setNewCalendarTitle] = useState("");
  const [newCalendarDescription, setNewCalendarDescription] = useState("");
  const [newCalendarDate, setNewCalendarDate] = useState(formatLocalDateKey(new Date()));
  const [newCalendarLeaderNotes, setNewCalendarLeaderNotes] = useState("");
  const [newCalendarLeaderOnly, setNewCalendarLeaderOnly] = useState(false);
  const [newAllianceCode, setNewAllianceCode] = useState("");
  const [newVoteTitle, setNewVoteTitle] = useState("");
  const [newVoteOptionsText, setNewVoteOptionsText] = useState("");
  const [newFeedbackText, setNewFeedbackText] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [desertStormSection, setDesertStormSection] = useState("taskForceA");
  const t = useMemo(() => getTranslator(language), [language]);

  const players = alliance?.players || [];
  const votes = alliance?.votes || [];
  const calendarEntries = alliance?.calendarEntries || [];
  const desertStormLayouts = alliance?.desertStormLayouts || [];
  const feedbackEntries = alliance?.feedbackEntries || [];
  const leader = currentUser ? isLeader(currentUser.rank) : false;
  const tabs = leader ? ALL_TABS : ALL_TABS.filter((tab) => tab !== "players");
  const options = useMemo(() => createPlayerOptions(players), [players]);
  const dashboard = useMemo(() => buildDashboard(alliance?.taskForces || emptyTaskForces(), options), [alliance, options]);
  const taskForceA = useMemo(() => buildTaskForceView(alliance?.taskForces?.taskForceA || emptyTaskForces().taskForceA, "Task Force A", options, dashboard.duplicatePlayers), [alliance, options, dashboard.duplicatePlayers]);
  const taskForceB = useMemo(() => buildTaskForceView(alliance?.taskForces?.taskForceB || emptyTaskForces().taskForceB, "Task Force B", options, dashboard.duplicatePlayers), [alliance, options, dashboard.duplicatePlayers]);
  const selectedTaskForce = desertStormSection === "taskForceB" ? taskForceB : taskForceA;
  const desertStormAssignment = useMemo(() => findAssignment(alliance?.taskForces || emptyTaskForces(), currentUser?.name), [alliance, currentUser]);
  const latestDesertStormVote = useMemo(() => getLatestDesertStormVote(votes), [votes]);
  const assignedPlayerNames = useMemo(() => getAssignedPlayerNames(alliance?.taskForces || emptyTaskForces(), playerModal), [alliance, playerModal]);
  const desertStormLocked = Boolean(alliance?.desertStormSetupLocked);
  const filteredOptions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const unassignedOptions = options.filter((player) => !assignedPlayerNames.has(player.name));
    const roleFiltered = !playerModal || playerPickerMode === "all" ? unassignedOptions : unassignedOptions.filter((player) => {
      if (!latestDesertStormVote) return true;
      const response = latestDesertStormVote.responses?.find((entry) => entry.playerId === player.id);
      if (!response) return false;
      if (playerModal.memberType === "Sub") return response.optionLabel === DESERT_STORM_SUB_LABEL;
      return response.optionLabel === DESERT_STORM_PLAY_LABEL;
    });
    return !q ? roleFiltered : roleFiltered.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q));
  }, [options, searchText, playerModal, playerPickerMode, latestDesertStormVote, assignedPlayerNames]);
  const filteredMembers = useMemo(() => { const q = memberSearchText.trim().toLowerCase(); const rankWeight = { R5: 5, R4: 4, R3: 3, R2: 2, R1: 1 }; const rankFilteredPlayers = memberRankFilter === "all" ? players : players.filter((p) => p.rank === memberRankFilter); const matchingPlayers = !q ? rankFilteredPlayers : rankFilteredPlayers.filter((p) => p.name.toLowerCase().includes(q) || p.rank.toLowerCase().includes(q)); return [...matchingPlayers].sort((a, b) => memberSortMode === "name" ? a.name.localeCompare(b.name) : (rankWeight[b.rank] || 0) - (rankWeight[a.rank] || 0) || a.name.localeCompare(b.name)); }, [players, memberSearchText, memberSortMode, memberRankFilter]);
  const unvotedCount = useMemo(() => votes.filter((vote) => vote.status === "open" && !vote.didVote).length, [votes]);
  const todayCalendarEntries = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date());
    return [...calendarEntries]
      .filter((entry) => formatLocalDateKey(entry.startsAt) === todayKey)
      .sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)));
  }, [calendarEntries]);

  function clearSessionState(message = "") {
    const nextMessage = typeof message === "string" ? message : "";
    setSession({ backendUrl: "", token: "" });
    setAccount(null);
    setAlliance(null);
    setCurrentUser(null);
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
    setAccount(me.account);
    setAlliance(me.alliance);
    setCurrentUser(me.player);
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
        if (storedLanguage && TRANSLATIONS[storedLanguage]) {
          setLanguage(storedLanguage);
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

  function saveMember(playerId, field, value) {
    if (!(currentUser && (leader || currentUser.id === playerId))) return;
    const payload = field === "overallPower" ? { overallPower: Number.parseFloat(value) || 0 } : field === "squadPowers" ? { squadPowers: { squad1: Number.parseFloat(value.squad1) || 0, squad2: Number.parseFloat(value.squad2) || 0, squad3: Number.parseFloat(value.squad3) || 0, squad4: Number.parseFloat(value.squad4) || 0 } } : leader ? { [field]: value } : null;
    if (!payload) return;
    run(async () => { await updateMember(session.backendUrl, session.token, playerId, payload); await refresh(); });
  }

  function saveMyInfo(field, value) {
    if (!currentUser) return;
    const payload = field === "overallPower" ? { overallPower: Number.parseFloat(value) || 0 } : { squadPowers: { [field]: Number.parseFloat(value) || 0 } };
    run(async () => { await updateMember(session.backendUrl, session.token, currentUser.id, payload); await refresh(); });
  }

  if (!sessionReady) return <SafeAreaView style={styles.safeArea}><ExpoStatusBar style="dark" /><StatusBar barStyle="dark-content" /><View style={styles.loadingScreen}><ActivityIndicator color="#1f5c4d" size="large" /><Text style={styles.hint}>{t("restoringSession")}</Text></View></SafeAreaView>;

  if (!session.token) return <AuthScreen {...{ authMode, setAuthMode, authUsername, setAuthUsername, authPassword, setAuthPassword, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onSignIn={() => run(async () => { const url = normalizeBaseUrl(backendUrlInput); const result = await signIn(url, { username: authUsername, password: authPassword }); setSetupMode("join"); await persistSession({ backendUrl: url, token: result.token }); await refresh(result.token, url); })} onCreate={() => run(async () => { const url = normalizeBaseUrl(backendUrlInput); const result = await createAccount(url, { username: authUsername, password: authPassword }); setSetupMode("join"); await persistSession({ backendUrl: url, token: result.token }); setAccount(result.account); setAlliance(null); setCurrentUser(null); })} />;

  if (session.token && !alliance) return <AllianceSetupScreen {...{ account, setupMode, setSetupMode, allianceCodeInput, setAllianceCodeInput, allianceNameInput, setAllianceNameInput, alliancePreview, joinRequest, loading, errorMessage, language, onChangeLanguage: changeLanguage, t }} onPreview={() => run(async () => setAlliancePreview(await getAlliancePreview(normalizeBaseUrl(backendUrlInput), allianceCodeInput)))} onJoin={() => run(async () => { const result = await joinAlliance(session.backendUrl, session.token, allianceCodeInput); setAccount(result.account); setJoinRequest(result.joinRequest); setAlliance(null); setCurrentUser(null); setAlliancePreview(result.alliance); setSetupMode("join"); })} onCreateAlliance={() => run(async () => { const result = await createAlliance(session.backendUrl, session.token, { name: allianceNameInput, code: allianceCodeInput }); setAccount(result.account); setAlliance(result.alliance); setCurrentUser(result.player); setJoinRequest(null); setNewAllianceCode(result.alliance.code); })} onRefreshStatus={() => run(async () => { await refresh(); })} onSignOut={signOut} />;

  return <SafeAreaView style={styles.safeArea}><ExpoStatusBar style="dark" /><StatusBar barStyle="dark-content" /><KeyboardAvoidingView style={styles.keyboardShell} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}><View style={styles.screen}><Text style={styles.title}>{alliance?.name}</Text><Text style={styles.hint}>{t("signedInAs", { name: account?.displayName, rank: currentUser?.rank })}</Text>{leader && joinRequests.length ? <Pressable style={styles.alertBanner} onPress={() => setActiveTab("alliance")}><Text style={styles.alertBannerTitle}>{joinRequests.length === 1 ? t("onePlayerWaiting") : t("playersWaiting", { count: joinRequests.length })}</Text><Text style={styles.alertBannerText}>{t("tapReviewRequests")}</Text></Pressable> : null}{unvotedCount ? <Pressable style={styles.voteBanner} onPress={() => setActiveTab("voting")}><Text style={styles.voteBannerTitle}>{unvotedCount === 1 ? t("oneVoteNeedsResponse") : t("votesNeedResponse", { count: unvotedCount })}</Text><Text style={styles.voteBannerText}>{t("tapOpenVoting")}</Text></Pressable> : null}{loading ? <ActivityIndicator color="#1f5c4d" /> : null}{errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>{tabs.map((tab) => <Pressable key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tabLabel(tab, leader, joinRequests, unvotedCount, t)}</Text></Pressable>)}</ScrollView><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>{activeTab === "myInfo" ? <MyInfoView currentUser={currentUser} desertStormAssignment={desertStormAssignment} votes={votes} todayCalendarEntries={todayCalendarEntries} onChangeField={saveMyInfo} t={t} /> : null}{activeTab === "desertStorm" ? <DesertStormView section={desertStormSection} onChangeSection={setDesertStormSection} taskForce={selectedTaskForce} layouts={desertStormLayouts} currentUser={currentUser} currentUserIsLeader={leader} isLocked={desertStormLocked} onPickPlayer={(context) => leader && !desertStormLocked && (setPlayerModal(context), setPlayerPickerMode("voted"), setSearchText(""))} onCreateNewTeams={() => run(async () => { await resetTaskForcesRequest(session.backendUrl, session.token); setDesertStormSection("taskForceA"); await refresh(); })} onLockIn={() => run(async () => { await lockInDesertStormLayoutRequest(session.backendUrl, session.token, {}); await refresh(); })} onUpdateResult={(layoutId, result) => run(async () => { await updateDesertStormLayoutResultRequest(session.backendUrl, session.token, layoutId, { result }); await refresh(); })} /> : null}{activeTab === "players" && leader ? <MembersView players={filteredMembers} memberSearchText={memberSearchText} memberSortMode={memberSortMode} memberRankFilter={memberRankFilter} onChangeMemberSearchText={setMemberSearchText} onChangeMemberSortMode={setMemberSortMode} onChangeMemberRankFilter={setMemberRankFilter} currentUser={currentUser} currentUserIsLeader={leader} onChangeField={saveMember} onRemovePlayer={(playerId) => run(async () => { await removeMember(session.backendUrl, session.token, playerId); await refresh(); })} /> : null}{activeTab === "voting" ? <VotingView votes={votes} currentUser={currentUser} currentUserIsLeader={leader} latestDesertStormVote={latestDesertStormVote} newVoteTitle={newVoteTitle} newVoteOptionsText={newVoteOptionsText} onChangeNewVoteTitle={setNewVoteTitle} onChangeNewVoteOptionsText={setNewVoteOptionsText} onCreateVote={() => run(async () => { await createVoteRequest(session.backendUrl, session.token, { title: newVoteTitle, options: parseVoteOptions(newVoteOptionsText) }); setNewVoteTitle(""); setNewVoteOptionsText(""); await refresh(); })} onCreateDesertStormVote={() => run(async () => { await createVoteRequest(session.backendUrl, session.token, { title: DESERT_STORM_VOTE_TITLE, options: [DESERT_STORM_PLAY_LABEL, DESERT_STORM_SUB_LABEL, DESERT_STORM_CANT_PLAY_LABEL] }); await refresh(); })} onSubmitVote={(voteId, optionId) => run(async () => { await submitVoteRequest(session.backendUrl, session.token, voteId, optionId); await refresh(); })} onCloseVote={(voteId) => run(async () => { await closeVoteRequest(session.backendUrl, session.token, voteId); await refresh(); })} onArchiveVote={(voteId) => run(async () => { await archiveVoteRequest(session.backendUrl, session.token, voteId); await refresh(); })} onReopenVote={(voteId) => run(async () => { await reopenVoteRequest(session.backendUrl, session.token, voteId); await refresh(); })} onDeleteVote={(voteId) => run(async () => { await deleteVoteRequest(session.backendUrl, session.token, voteId); await refresh(); })} /> : null}{activeTab === "calendar" ? <CalendarView entries={calendarEntries} currentUserIsLeader={leader} calendarView={calendarView} onChangeCalendarView={setCalendarView} newCalendarTitle={newCalendarTitle} newCalendarDescription={newCalendarDescription} newCalendarDate={newCalendarDate} newCalendarLeaderNotes={newCalendarLeaderNotes} newCalendarLeaderOnly={newCalendarLeaderOnly} onChangeNewCalendarTitle={setNewCalendarTitle} onChangeNewCalendarDescription={setNewCalendarDescription} onChangeNewCalendarDate={setNewCalendarDate} onChangeNewCalendarLeaderNotes={setNewCalendarLeaderNotes} onToggleLeaderOnly={() => setNewCalendarLeaderOnly((value) => !value)} onCreateEntry={() => run(async () => { await createCalendarEntryRequest(session.backendUrl, session.token, { title: newCalendarTitle, description: newCalendarDescription, startsAt: newCalendarDate, leaderNotes: newCalendarLeaderNotes, leaderOnly: newCalendarLeaderOnly }); setNewCalendarTitle(""); setNewCalendarDescription(""); setNewCalendarLeaderNotes(""); setNewCalendarLeaderOnly(false); setNewCalendarDate(formatLocalDateKey(new Date())); await refresh(); })} onDeleteEntry={(entryId) => run(async () => { await deleteCalendarEntryRequest(session.backendUrl, session.token, entryId); await refresh(); })} /> : null}{activeTab === "alliance" ? <AllianceView alliance={alliance} account={account} currentUser={currentUser} currentUserIsLeader={leader} joinRequests={joinRequests} newMemberName={newMemberName} newMemberRank={newMemberRank} newMemberPower={newMemberPower} newAllianceCode={newAllianceCode} onChangeNewMemberName={setNewMemberName} onChangeNewMemberRank={setNewMemberRank} onChangeNewMemberPower={setNewMemberPower} onChangeNewAllianceCode={setNewAllianceCode} onAddMember={() => run(async () => { await addMember(session.backendUrl, session.token, { name: newMemberName, rank: newMemberRank, overallPower: Number.parseFloat(newMemberPower) || 0 }); setNewMemberName(""); setNewMemberRank("R1"); setNewMemberPower(""); await refresh(); })} onApproveJoinRequest={(requestId) => run(async () => { await approveJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onRejectJoinRequest={(requestId) => run(async () => { await rejectJoinRequest(session.backendUrl, session.token, requestId); await refresh(); })} onLeaveAlliance={() => run(async () => { const result = await leaveAlliance(session.backendUrl, session.token); setAccount(result.account); setAlliance(null); setCurrentUser(null); setJoinRequest(null); setJoinRequests([]); setSetupMode("join"); setAlliancePreview(null); setNewAllianceCode(""); setActiveTab("myInfo"); })} onRotateAllianceCode={() => run(async () => { await updateAllianceCode(session.backendUrl, session.token, newAllianceCode); await refresh(); })} onSignOut={signOut} t={t} language={language} onChangeLanguage={changeLanguage} /> : null}{activeTab === "feedback" ? <FeedbackView feedbackEntries={feedbackEntries} newFeedbackText={newFeedbackText} onChangeNewFeedbackText={setNewFeedbackText} onSubmitFeedback={() => run(async () => { await addFeedbackRequest(session.backendUrl, session.token, newFeedbackText); setNewFeedbackText(""); await refresh(); })} t={t} /> : null}</ScrollView></View></KeyboardAvoidingView><Modal visible={Boolean(playerModal)} animationType="slide" onRequestClose={() => setPlayerModal(null)}><SafeAreaView style={styles.safeArea}><KeyboardAvoidingView style={styles.keyboardShell} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}><View style={styles.screen}><Text style={styles.title}>{t("choosePlayer")}</Text>{playerModal ? <View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, playerPickerMode === "voted" && styles.modeButtonActive]} onPress={() => setPlayerPickerMode("voted")}><Text style={[styles.secondaryButtonText, playerPickerMode === "voted" && styles.modeButtonTextActive]}>{t("votedMembers")}</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, playerPickerMode === "all" && styles.modeButtonActive]} onPress={() => setPlayerPickerMode("all")}><Text style={[styles.secondaryButtonText, playerPickerMode === "all" && styles.modeButtonTextActive]}>{t("entireAlliance")}</Text></Pressable></View> : null}{playerModal && latestDesertStormVote && playerPickerMode === "voted" ? <Text style={styles.hint}>{playerModal.memberType === "Sub" ? `Showing members who voted "${DESERT_STORM_SUB_LABEL}" in ${DESERT_STORM_VOTE_TITLE}.` : `Showing members who voted "${DESERT_STORM_PLAY_LABEL}" in ${DESERT_STORM_VOTE_TITLE}.`}</Text> : null}{playerModal && playerPickerMode === "all" ? <Text style={styles.hint}>{t("showingAllAlliance")}</Text> : null}<TextInput value={searchText} onChangeText={setSearchText} style={styles.input} placeholder={t("searchNameOrRank")} /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}><Pressable style={styles.pick} onPress={() => run(async () => { await updateTaskForceSlot(session.backendUrl, session.token, { taskForceKey: playerModal.taskForceKey, squadId: playerModal.squadId, slotId: playerModal.slotId, playerName: "" }); setPlayerModal(null); await refresh(); })}><Text style={styles.pickText}>{t("clearSelection")}</Text></Pressable>{filteredOptions.map((player) => <Pressable key={player.id} style={styles.pick} onPress={() => run(async () => { await updateTaskForceSlot(session.backendUrl, session.token, { taskForceKey: playerModal.taskForceKey, squadId: playerModal.squadId, slotId: playerModal.slotId, playerName: player.name }); setPlayerModal(null); await refresh(); })}><Text style={styles.pickText}>{player.name} - {player.rank} - {player.overallPower.toFixed(2)}M</Text></Pressable>)}{!filteredOptions.length ? <Text style={styles.hint}>{playerPickerMode === "voted" && latestDesertStormVote ? t("noMembersMatchVoteFilter") : t("noPlayersMatchSearch")}</Text> : null}</ScrollView></View></KeyboardAvoidingView></SafeAreaView></Modal></SafeAreaView>;
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
function MyInfoView({ currentUser, desertStormAssignment, votes, todayCalendarEntries, onChangeField, t }) { const s = currentUser?.squadPowers || { squad1: 0, squad2: 0, squad3: 0, squad4: 0 }; const votedCount = votes.filter((vote) => vote.didVote).length; const appearances = currentUser?.desertStormAppearances || []; const [draftOverallPower, setDraftOverallPower] = useState(String(currentUser?.overallPower ?? 0)); const [draftSquadPowers, setDraftSquadPowers] = useState({ squad1: String(s.squad1), squad2: String(s.squad2), squad3: String(s.squad3), squad4: String(s.squad4) }); const resultLabels = { pending: t("resultPending"), win: t("resultWin"), loss: t("resultLoss") }; useEffect(() => { setDraftOverallPower(String(currentUser?.overallPower ?? 0)); }, [currentUser?.overallPower]); useEffect(() => { setDraftSquadPowers({ squad1: String(s.squad1), squad2: String(s.squad2), squad3: String(s.squad3), squad4: String(s.squad4) }); }, [s.squad1, s.squad2, s.squad3, s.squad4]); return <View style={styles.profileCard}><View style={styles.profileHeader}><View><Text style={styles.profileEyebrow}>{t("signedInPlayer")}</Text><Text style={styles.cardTitle}>{currentUser?.name}</Text><Text style={styles.profileRank}>{t("rank")} {currentUser?.rank}</Text></View><View style={styles.rankBadge}><Text style={styles.rankBadgeText}>{currentUser?.rank}</Text></View></View><View style={styles.metricGrid}><View style={styles.metricPanel}><Text style={styles.metricLabel}>{t("totalBasePower")}</Text><Text style={styles.metricPanelValue}>{Number(currentUser?.overallPower || 0).toFixed(2)}M</Text></View><View style={styles.metricPanel}><Text style={styles.metricLabel}>{t("totalSquadPower")}</Text><Text style={styles.metricPanelValue}>{Number(currentUser?.totalSquadPower || 0).toFixed(2)}M</Text></View></View><View style={[styles.statusCard, desertStormAssignment ? styles.statusCardActive : styles.statusCardInactive]}><Text style={styles.statusEyebrow}>{t("desertStormTitle")}</Text><Text style={styles.statusTitle}>{desertStormAssignment ? t("selectedForDesertStorm") : t("notCurrentlyAssigned")}</Text>{desertStormAssignment ? <><Text style={styles.statusLine}>{t("taskForceLabel", { value: desertStormAssignment.taskForceLabel })}</Text><Text style={styles.statusLine}>{t("squadLabel", { value: desertStormAssignment.squadLabel })}</Text><Text style={styles.statusLine}>{t("slotLabel", { value: desertStormAssignment.slotLabel })}</Text></> : <Text style={styles.statusLine}>{t("notListedInTaskForces")}</Text>}</View><View style={styles.statusCard}><Text style={styles.statusEyebrow}>Key Things Today</Text><Text style={styles.statusTitle}>{todayCalendarEntries?.length ? `${todayCalendarEntries.length} item${todayCalendarEntries.length === 1 ? "" : "s"} on today’s schedule` : "Nothing scheduled for today"}</Text>{todayCalendarEntries?.length ? todayCalendarEntries.map((entry) => <View key={entry.id} style={styles.todayItem}><Text style={styles.todayItemTitle}>{entry.title}</Text>{entry.description ? <Text style={styles.statusLine}>{entry.description}</Text> : null}</View>) : <Text style={styles.statusLine}>Any calendar events scheduled for today will show up here.</Text>}</View><View style={styles.statusCard}><Text style={styles.statusEyebrow}>{t("desertStormRecord")}</Text><Text style={styles.statusTitle}>{appearances.length ? t("lockInsPlayed", { count: appearances.length }) : t("noLockedHistoryYet")}</Text>{appearances.length ? appearances.map((appearance) => <Text key={appearance.id} style={styles.statusLine}>{appearance.lockedInAt.slice(0, 10)} - {appearance.title} - {resultLabels[appearance.result] || appearance.result}</Text>) : <Text style={styles.statusLine}>{t("appearancesWillShow")}</Text>}</View><View style={[styles.statusCard, votes.length && votedCount === votes.length ? styles.statusCardActive : styles.statusCardInactive]}><Text style={styles.statusEyebrow}>{t("allianceVotingTitle")}</Text><Text style={styles.statusTitle}>{votes.length ? t("votesCompleted", { count: votedCount, total: votes.length }) : t("noActiveVotes")}</Text>{votes.length ? votes.map((vote) => <View key={vote.id} style={styles.voteStatusRow}><Text style={styles.statusLine}>{vote.title}</Text><Text style={[styles.votePill, vote.didVote ? styles.votePillDone : styles.votePillPending]}>{vote.didVote ? t("votedStatus") : t("didNotVoteStatus")}</Text></View>) : <Text style={styles.statusLine}>{t("whenLeadersCreateVote")}</Text>}</View><View style={styles.section}><Text style={styles.sectionTitle}>{t("basePowerSection")}</Text><TextInput value={draftOverallPower} onChangeText={setDraftOverallPower} onEndEditing={() => onChangeField("overallPower", draftOverallPower)} onBlur={() => onChangeField("overallPower", draftOverallPower)} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.section}><Text style={styles.sectionTitle}>{t("squadPowerBreakdown")}</Text><View style={styles.row}><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 1 })}</Text><TextInput value={draftSquadPowers.squad1} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad1: v }))} onEndEditing={() => onChangeField("squad1", draftSquadPowers.squad1)} onBlur={() => onChangeField("squad1", draftSquadPowers.squad1)} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 2 })}</Text><TextInput value={draftSquadPowers.squad2} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad2: v }))} onEndEditing={() => onChangeField("squad2", draftSquadPowers.squad2)} onBlur={() => onChangeField("squad2", draftSquadPowers.squad2)} style={styles.input} keyboardType="decimal-pad" /></View></View><View style={styles.row}><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 3 })}</Text><TextInput value={draftSquadPowers.squad3} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad3: v }))} onEndEditing={() => onChangeField("squad3", draftSquadPowers.squad3)} onBlur={() => onChangeField("squad3", draftSquadPowers.squad3)} style={styles.input} keyboardType="decimal-pad" /></View><View style={styles.squadCard}><Text style={styles.squadLabel}>{t("squadNumber", { number: 4 })}</Text><TextInput value={draftSquadPowers.squad4} onChangeText={(v) => setDraftSquadPowers((current) => ({ ...current, squad4: v }))} onEndEditing={() => onChangeField("squad4", draftSquadPowers.squad4)} onBlur={() => onChangeField("squad4", draftSquadPowers.squad4)} style={styles.input} keyboardType="decimal-pad" /></View></View></View></View>; }
function TaskForceView({ taskForce, currentUser, currentUserIsLeader, onPickPlayer, isLocked = false }) { return <View style={styles.card}><Text style={styles.cardTitle}>{taskForce.label} - {taskForce.totalPower.toFixed(2)}M</Text>{isLocked ? <Text style={styles.hint}>This Desert Storm setup is locked. Use Create New Teams to start a new setup.</Text> : null}{taskForce.squads.map((squad) => <View key={squad.id} style={styles.section}><Text style={styles.sectionTitle}>{squad.label} - {squad.totalPower.toFixed(2)}M</Text>{squad.slots.map((slot) => <Pressable key={slot.id} style={[styles.pick, slot.isDuplicate && styles.dangerBox, currentUser?.name && slot.playerName === currentUser.name && styles.selectedPlayerBox, isLocked && styles.disabled]} disabled={!currentUserIsLeader || isLocked} onPress={() => onPickPlayer({ taskForceKey: taskForce.key, taskForceLabel: taskForce.label, squadId: squad.id, squadLabel: squad.label, slotId: slot.id, slotLabel: slot.label, memberType: slot.memberType })}><Text style={[styles.pickText, currentUser?.name && slot.playerName === currentUser.name && styles.selectedPlayerText]}>{slot.label}: {slot.playerName || "Open"} ({slot.overallPower.toFixed(2)}M)</Text>{currentUser?.name && slot.playerName === currentUser.name ? <Text style={styles.selectedPlayerHint}>Selected for Desert Storm</Text> : null}</Pressable>)}</View>)}</View>; }
function DesertStormView({ section, onChangeSection, taskForce, layouts, currentUser, currentUserIsLeader, isLocked, onPickPlayer, onCreateNewTeams, onLockIn, onUpdateResult }) { return <View style={styles.card}><Text style={styles.cardTitle}>Desert Storm</Text><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, section === "taskForceA" && styles.modeButtonActive]} onPress={() => onChangeSection("taskForceA")}><Text style={[styles.secondaryButtonText, section === "taskForceA" && styles.modeButtonTextActive]}>Task Force A</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, section === "taskForceB" && styles.modeButtonActive]} onPress={() => onChangeSection("taskForceB")}><Text style={[styles.secondaryButtonText, section === "taskForceB" && styles.modeButtonTextActive]}>Task Force B</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, section === "history" && styles.modeButtonActive]} onPress={() => onChangeSection("history")}><Text style={[styles.secondaryButtonText, section === "history" && styles.modeButtonTextActive]}>History</Text></Pressable></View>{currentUserIsLeader && section !== "history" ? <Pressable style={[styles.secondaryButton, isLocked && styles.modeButtonActive]} onPress={onCreateNewTeams}><Text style={[styles.secondaryButtonText, isLocked && styles.modeButtonTextActive]}>Create New Teams</Text></Pressable> : null}{section === "history" ? <DesertStormHistoryView layouts={layouts} currentUserIsLeader={currentUserIsLeader} onLockIn={onLockIn} onUpdateResult={onUpdateResult} /> : <TaskForceView taskForce={taskForce} currentUser={currentUser} currentUserIsLeader={currentUserIsLeader} onPickPlayer={onPickPlayer} isLocked={isLocked} />}{currentUserIsLeader && section !== "history" ? <Pressable style={[styles.button, isLocked && styles.disabledButton]} disabled={isLocked} onPress={onLockIn}><Text style={styles.buttonText}>{isLocked ? "Teams Locked In" : "Lock In Current Teams"}</Text></Pressable> : null}</View>; }
function MembersView({ players, memberSearchText, memberSortMode, memberRankFilter, onChangeMemberSearchText, onChangeMemberSortMode, onChangeMemberRankFilter, currentUser, currentUserIsLeader, onChangeField, onRemovePlayer }) {
  const [drafts, setDrafts] = useState({});
  const [expandedMemberId, setExpandedMemberId] = useState("");

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
      const canEdit = currentUserIsLeader || currentUser?.id === player.id;
      const canEditRank = currentUserIsLeader;
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
          <View style={styles.section}>
            <Text style={styles.memberSectionLabel}>Player Info</Text>
            <TextInput value={draft.name} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, name: v } }))} onEndEditing={() => onChangeField(player.id, "name", draft.name)} onBlur={() => onChangeField(player.id, "name", draft.name)} editable={currentUserIsLeader} style={[styles.input, !currentUserIsLeader && styles.disabled]} />
          </View>
          <View style={styles.row}>
            <TextInput value={draft.rank} onChangeText={(v) => setDrafts((current) => ({ ...current, [player.id]: { ...draft, rank: v.toUpperCase() } }))} onEndEditing={() => onChangeField(player.id, "rank", draft.rank)} onBlur={() => onChangeField(player.id, "rank", draft.rank)} editable={canEditRank} style={[styles.input, styles.half, !canEditRank && styles.disabled]} />
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
          {currentUserIsLeader && currentUser?.id !== player.id ? <Pressable style={styles.dangerButton} onPress={() => onRemovePlayer(player.id)}><Text style={styles.dangerButtonText}>Remove Member</Text></Pressable> : null}
        </> : null}
      </View>;
    })}
    {!players.length ? <Text style={styles.hint}>No players match that search.</Text> : null}
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

  return <View style={styles.card}><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half]} onPress={() => setSelectedLayoutId("")}><Text style={styles.secondaryButtonText}>Back To History</Text></Pressable></View><Text style={styles.cardTitle}>{selectedLayout.lockedInAt.slice(0, 10)}</Text><Text style={styles.hint}>{selectedLayout.title}</Text><Text style={styles.hint}>Locked by {selectedLayout.lockedByName || "Leader"} • {selectedLayout.result}</Text>{currentUserIsLeader ? <View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, selectedLayout.result === "pending" && styles.modeButtonActive]} onPress={() => handleResultPress(selectedLayout, "pending")}><Text style={[styles.secondaryButtonText, selectedLayout.result === "pending" && styles.modeButtonTextActive]}>Pending</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, selectedLayout.result === "win" && styles.modeButtonActive]} onPress={() => handleResultPress(selectedLayout, "win")}><Text style={[styles.secondaryButtonText, selectedLayout.result === "win" && styles.modeButtonTextActive]}>Win</Text></Pressable><Pressable style={[styles.secondaryButton, styles.half, selectedLayout.result === "loss" && styles.modeButtonActive]} onPress={() => handleResultPress(selectedLayout, "loss")}><Text style={[styles.secondaryButtonText, selectedLayout.result === "loss" && styles.modeButtonTextActive]}>Loss</Text></Pressable></View> : null}{Object.values(selectedLayout.taskForces || {}).map((taskForce) => <View key={taskForce.key} style={styles.section}><Text style={styles.sectionTitle}>{taskForce.label}</Text>{(taskForce.squads || []).map((squad) => <View key={squad.id} style={styles.squadCard}><Text style={styles.squadLabel}>{squad.label}</Text>{(squad.slots || []).map((slot) => <Text key={slot.id} style={styles.line}>{slot.label}: {slot.playerName || "Open"}</Text>)}</View>)}</View>)}</View>;
}
function CalendarView({ entries, currentUserIsLeader, calendarView, onChangeCalendarView, newCalendarTitle, newCalendarDescription, newCalendarDate, newCalendarLeaderNotes, newCalendarLeaderOnly, onChangeNewCalendarTitle, onChangeNewCalendarDescription, onChangeNewCalendarDate, onChangeNewCalendarLeaderNotes, onToggleLeaderOnly, onCreateEntry, onDeleteEntry }) {
  const today = startOfLocalDay();
  const todayKey = formatLocalDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const entriesByDate = useMemo(() => entries.reduce((accumulator, entry) => {
    const key = formatLocalDateKey(entry.startsAt);
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(entry);
    return accumulator;
  }, {}), [entries]);
  const orderedEntriesByDate = useMemo(() => Object.fromEntries(Object.entries(entriesByDate).map(([key, value]) => [key, [...value].sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt)))])), [entriesByDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  }), [todayKey]);
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
  const fallbackSelectedDateKey = visibleDateKeys.includes(selectedDateKey) ? selectedDateKey : visibleDateKeys[0] || todayKey;
  const selectedDate = parseLocalDateKey(fallbackSelectedDateKey);
  const selectedEntries = orderedEntriesByDate[fallbackSelectedDateKey] || [];
  const monthLabel = monthCursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedDateLabel = selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const selectedDateShortLabel = selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const selectedDateCount = selectedEntries.length;

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
    return <Pressable key={key} style={[styles.calendarDayCell, compact && styles.calendarDayCellCompact, !inCurrentMonth && styles.calendarDayCellMuted, isToday && styles.calendarDayCellToday, isSelected && styles.calendarDayCellSelected]} onPress={() => setSelectedDateKey(key)}><Text style={[styles.calendarDayWeekLabel, compact && styles.calendarDayWeekLabelCompact, isSelected && styles.calendarDayTextSelected]}>{date.toLocaleDateString(undefined, { weekday: "short" })}</Text><Text style={[styles.calendarDayNumber, compact && styles.calendarDayNumberCompact, !inCurrentMonth && styles.calendarDayTextMuted, isSelected && styles.calendarDayTextSelected]}>{date.getDate()}</Text>{eventCount ? <View style={[styles.calendarEventBadge, isSelected && styles.calendarEventBadgeSelected]}><Text style={[styles.calendarEventBadgeText, isSelected && styles.calendarEventBadgeTextSelected]}>{eventCount}</Text></View> : <View style={styles.calendarEventSpacer} />}</Pressable>;
  }

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Alliance Calendar</Text>
    <Text style={styles.hint}>Tap a day to see what is scheduled and what needs attention.</Text>
    <View style={styles.row}>
      <Pressable style={[styles.secondaryButton, styles.half, calendarView === "today" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("today")}><Text style={[styles.secondaryButtonText, calendarView === "today" && styles.modeButtonTextActive]}>Today</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, calendarView === "week" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("week")}><Text style={[styles.secondaryButtonText, calendarView === "week" && styles.modeButtonTextActive]}>Week</Text></Pressable>
      <Pressable style={[styles.secondaryButton, styles.half, calendarView === "month" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("month")}><Text style={[styles.secondaryButtonText, calendarView === "month" && styles.modeButtonTextActive]}>Month</Text></Pressable>
    </View>
    {calendarView === "month" ? <View style={styles.calendarMonthShell}>
      <View style={styles.calendarMonthHeader}>
        <Pressable style={styles.calendarMonthArrow} onPress={() => shiftMonth(-1)}><Text style={styles.calendarMonthArrowText}>‹</Text></Pressable>
        <Text style={styles.calendarMonthTitle}>{monthLabel}</Text>
        <Pressable style={styles.calendarMonthArrow} onPress={() => shiftMonth(1)}><Text style={styles.calendarMonthArrowText}>›</Text></Pressable>
      </View>
      <View style={styles.calendarWeekdayRow}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => <Text key={label} style={styles.calendarWeekday}>{label}</Text>)}
      </View>
      <View style={styles.calendarGrid}>
        {monthDays.map((day) => renderDayButton(day))}
      </View>
    </View> : null}
    {calendarView === "week" ? <View style={styles.calendarStrip}>
      {weekDays.map((day) => renderDayButton(day, true))}
    </View> : null}
    {calendarView === "today" ? <View style={styles.calendarStrip}>
      {renderDayButton(today, true)}
    </View> : null}
    <View style={styles.calendarDetailCard}>
      <View style={styles.calendarDetailHeader}>
        <View style={styles.memberHeaderText}>
          <Text style={styles.sectionTitle}>{selectedDateLabel}</Text>
          <Text style={styles.hint}>{selectedDateCount ? `${selectedDateCount} event${selectedDateCount === 1 ? "" : "s"} scheduled` : "No events scheduled"}</Text>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Selected Day</Text>
          <Text style={styles.memberStatValue}>{selectedDateShortLabel}</Text>
        </View>
      </View>
      {selectedEntries.length ? selectedEntries.map((entry) => <View key={entry.id} style={styles.voteCard}>
        <View style={styles.memberCardHeader}>
          <View style={styles.memberHeaderText}>
            <Text style={styles.sectionTitle}>{entry.title}</Text>
            <Text style={styles.hint}>{formatLocalDateKey(entry.startsAt)}{entry.leaderOnly ? " • Leader Only" : ""}</Text>
          </View>
          {currentUserIsLeader ? <Pressable style={styles.dangerButton} onPress={() => onDeleteEntry(entry.id)}><Text style={styles.dangerButtonText}>Delete</Text></Pressable> : null}
        </View>
        {entry.description ? <Text style={styles.line}>{entry.description}</Text> : null}
        {currentUserIsLeader && entry.leaderNotes ? <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Leader Notes</Text><Text style={styles.line}>{entry.leaderNotes}</Text></View> : null}
        <Text style={styles.hint}>Added by {entry.createdByName || "Leader"}</Text>
      </View>) : <Text style={styles.hint}>{calendarView === "today" ? "Nothing is scheduled for today." : "Tap another day to review what is planned."}</Text>}
    </View>
    {currentUserIsLeader ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>Add Calendar Entry</Text>
      <TextInput value={newCalendarTitle} onChangeText={onChangeNewCalendarTitle} style={styles.input} placeholder="Event title" />
      <TextInput value={newCalendarDate} onChangeText={onChangeNewCalendarDate} style={styles.input} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <TextInput value={newCalendarDescription} onChangeText={onChangeNewCalendarDescription} style={[styles.input, styles.textArea]} placeholder="What should members know or do?" multiline />
      <TextInput value={newCalendarLeaderNotes} onChangeText={onChangeNewCalendarLeaderNotes} style={[styles.input, styles.textArea]} placeholder="Leader-only notes" multiline />
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, newCalendarLeaderOnly && styles.modeButtonActive]} onPress={onToggleLeaderOnly}><Text style={[styles.secondaryButtonText, newCalendarLeaderOnly && styles.modeButtonTextActive]}>{newCalendarLeaderOnly ? "Leader Only Entry" : "Visible To Everyone"}</Text></Pressable>
        <Pressable style={[styles.button, styles.half]} onPress={onCreateEntry}><Text style={styles.buttonText}>Add To Calendar</Text></Pressable>
      </View>
    </View> : null}
  </View>;
}
function FeedbackView({ feedbackEntries, newFeedbackText, onChangeNewFeedbackText, onSubmitFeedback, t }) { const buildLabel = APP_BUILD ? `v${APP_VERSION} (${APP_BUILD})` : `v${APP_VERSION}`; return <View style={styles.card}><Text style={styles.cardTitle}>{t("feedbackTitle")}</Text><Text style={styles.hint}>{t("feedbackHint")}</Text><View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Current Build</Text><Text style={styles.memberStatValue}>{buildLabel}</Text></View><View style={styles.section}><TextInput value={newFeedbackText} onChangeText={onChangeNewFeedbackText} style={[styles.input, styles.textArea]} placeholder={t("feedbackExample")} multiline /><Pressable style={styles.button} onPress={onSubmitFeedback}><Text style={styles.buttonText}>{t("submitFeedback")}</Text></Pressable></View><View style={styles.section}><Text style={styles.sectionTitle}>{t("allianceFeedback")}</Text>{feedbackEntries.length ? feedbackEntries.map((entry) => <View key={entry.id} style={styles.voteCard}><Text style={styles.line}>{entry.message}</Text><Text style={styles.hint}>{t("feedbackFrom", { name: entry.createdByName || "Member", date: String(entry.createdAt).slice(0, 10) })}</Text></View>) : <Text style={styles.hint}>{t("noFeedback")}</Text>}</View></View>; }
function VotingView({ votes, currentUser, currentUserIsLeader, latestDesertStormVote, newVoteTitle, newVoteOptionsText, onChangeNewVoteTitle, onChangeNewVoteOptionsText, onCreateVote, onCreateDesertStormVote, onSubmitVote, onCloseVote, onArchiveVote, onReopenVote, onDeleteVote }) {
  const [folder, setFolder] = useState("root");
  const [selectedVoteId, setSelectedVoteId] = useState("");
  const [expandedOptionId, setExpandedOptionId] = useState("");
  const openVotes = votes.filter((vote) => vote.status === "open");
  const closedVotes = votes.filter((vote) => vote.status === "closed");
  const archivedVotes = votes.filter((vote) => vote.status === "archived");
  const selectedVote = votes.find((vote) => vote.id === selectedVoteId) || null;
  const folderVotes = folder === "open" ? openVotes : folder === "closed" ? closedVotes : archivedVotes;
  const folderTitle = folder === "open" ? "Open Votes" : folder === "closed" ? "Closed Votes" : "Archived Votes";

  useEffect(() => {
    if (selectedVote && selectedVote.status !== folder && !(folder === "open" && selectedVote.status === "open")) {
      setSelectedVoteId("");
      setExpandedOptionId("");
    }
    if (selectedVoteId && !selectedVote) {
      setSelectedVoteId("");
      setExpandedOptionId("");
    }
  }, [selectedVote, selectedVoteId, folder]);

  function renderVoteSummary(vote) {
    return <Pressable key={vote.id} style={styles.voteCard} onPress={() => { setSelectedVoteId(vote.id); setExpandedOptionId(""); }}><Text style={styles.sectionTitle}>{vote.title}</Text><Text style={styles.hint}>{vote.status[0].toUpperCase() + vote.status.slice(1)} • {vote.totalVotes}/{vote.eligibleVoters} voted</Text><Text style={styles.line}>{vote.didVote ? "You voted in this vote." : "You have not voted in this vote."}</Text></Pressable>;
  }

  function renderOptionDetails(vote, option, isOpenVote) {
    const optionResponses = vote.responses?.filter((response) => response.optionId === option.id) || [];
    const expanded = expandedOptionId === option.id;
    return <View key={option.id} style={styles.voteOptionWrap}><Pressable style={[styles.voteOption, vote.selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => { if (isOpenVote) { onSubmitVote(vote.id, option.id); } else { setExpandedOptionId(expanded ? "" : option.id); } }}><View style={styles.voteOptionHeader}><Text style={[styles.pickText, vote.selectedOptionId === option.id && styles.selectedPlayerText]}>{option.label}</Text><Text style={styles.voteCount}>{option.votes}</Text></View>{vote.selectedOptionId === option.id ? <Text style={styles.selectedPlayerHint}>{isOpenVote ? "Your current vote" : "Your final vote"}</Text> : null}</Pressable>{expanded ? optionResponses.length ? <View style={styles.section}>{optionResponses.map((response) => <Text key={`${option.id}-${response.playerId}`} style={styles.line}>{response.playerName}</Text>)}</View> : <Text style={styles.hint}>No members selected this option.</Text> : null}</View>;
  }

  if (selectedVote) {
    const isOpenVote = selectedVote.status === "open";
    return <View style={styles.card}><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half]} onPress={() => { setSelectedVoteId(""); setExpandedOptionId(""); }}><Text style={styles.secondaryButtonText}>Back To {folderTitle}</Text></Pressable></View><Text style={styles.cardTitle}>{selectedVote.title}</Text><Text style={styles.hint}>Created by {selectedVote.createdByName} • {selectedVote.totalVotes}/{selectedVote.eligibleVoters} voted • {selectedVote.status[0].toUpperCase() + selectedVote.status.slice(1)}</Text>{selectedVote.options.map((option) => renderOptionDetails(selectedVote, option, isOpenVote))}{currentUserIsLeader ? <View style={styles.row}>{selectedVote.status === "open" ? <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onCloseVote(selectedVote.id)}><Text style={styles.secondaryButtonText}>Close</Text></Pressable> : null}{selectedVote.status === "closed" ? <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onReopenVote(selectedVote.id)}><Text style={styles.secondaryButtonText}>Reopen</Text></Pressable> : null}{selectedVote.status === "closed" ? <Pressable style={[styles.secondaryButton, styles.half]} onPress={() => onArchiveVote(selectedVote.id)}><Text style={styles.secondaryButtonText}>Archive</Text></Pressable> : null}{selectedVote.status !== "open" ? <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onDeleteVote(selectedVote.id)}><Text style={styles.dangerButtonText}>Delete</Text></Pressable> : <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onDeleteVote(selectedVote.id)}><Text style={styles.dangerButtonText}>Delete</Text></Pressable>}</View> : null}<Text style={styles.line}>{selectedVote.didVote ? "You voted in this vote." : "You have not voted in this vote."}</Text></View>;
  }

  if (folder !== "root") {
    return <View style={styles.card}><View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half]} onPress={() => setFolder("root")}><Text style={styles.secondaryButtonText}>Back To Voting</Text></Pressable></View><Text style={styles.cardTitle}>{folderTitle}</Text><Text style={styles.hint}>Tap a vote to open it.</Text>{folderVotes.length ? folderVotes.map(renderVoteSummary) : <Text style={styles.hint}>No votes in this folder yet.</Text>}</View>;
  }

  return <View style={styles.card}><Text style={styles.cardTitle}>Alliance Voting</Text><Text style={styles.hint}>Leaders can create votes. Every member can open the vote and respond.</Text>{currentUserIsLeader ? <><View style={styles.section}><Text style={styles.sectionTitle}>Desert Storm Vote</Text><Text style={styles.hint}>{latestDesertStormVote ? `Latest Desert Storm vote has ${latestDesertStormVote.totalVotes}/${latestDesertStormVote.eligibleVoters} responses.` : "Push the standard weekly Desert Storm vote to the alliance."}</Text><Pressable style={styles.button} onPress={onCreateDesertStormVote}><Text style={styles.buttonText}>Push Desert Storm Vote</Text></Pressable></View><View style={styles.section}><Text style={styles.sectionTitle}>Create Vote</Text><TextInput value={newVoteTitle} onChangeText={onChangeNewVoteTitle} style={styles.input} placeholder="Vote title" /><TextInput value={newVoteOptionsText} onChangeText={onChangeNewVoteOptionsText} style={[styles.input, styles.textArea]} placeholder={"One option per line\nAttack early\nAttack late"} multiline /><Pressable style={styles.button} onPress={onCreateVote}><Text style={styles.buttonText}>Push Vote To Alliance</Text></Pressable></View></> : null}<View style={styles.section}><Pressable style={styles.voteCard} onPress={() => setFolder("open")}><Text style={styles.sectionTitle}>Open Votes</Text><Text style={styles.hint}>{openVotes.length} vote{openVotes.length === 1 ? "" : "s"} waiting inside</Text></Pressable><Pressable style={styles.voteCard} onPress={() => setFolder("closed")}><Text style={styles.sectionTitle}>Closed Votes</Text><Text style={styles.hint}>{closedVotes.length} vote{closedVotes.length === 1 ? "" : "s"} inside</Text></Pressable><Pressable style={styles.voteCard} onPress={() => setFolder("archived")}><Text style={styles.sectionTitle}>Archived Votes</Text><Text style={styles.hint}>{archivedVotes.length} vote{archivedVotes.length === 1 ? "" : "s"} inside</Text></Pressable></View>{currentUser ? <View style={styles.inlineSummary}><Text style={styles.line}>{votes.filter((vote) => vote.didVote).length} of {votes.length} votes completed for {currentUser.name}</Text></View> : null}</View>;
}
function AllianceView({ alliance, account, currentUser, currentUserIsLeader, joinRequests, newMemberName, newMemberRank, newMemberPower, newAllianceCode, onChangeNewMemberName, onChangeNewMemberRank, onChangeNewMemberPower, onChangeNewAllianceCode, onAddMember, onApproveJoinRequest, onRejectJoinRequest, onLeaveAlliance, onRotateAllianceCode, onSignOut, t, language, onChangeLanguage }) { return <View style={styles.card}><Text style={styles.cardTitle}>{t("allianceTitle")}</Text><LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} /><Text style={styles.line}>{t("accountLabel", { value: account?.username })}</Text><Text style={styles.line}>{t("allianceLabel", { value: alliance?.name })}</Text><Text style={styles.line}>{t("codeLabel", { value: alliance?.code })}</Text><Text style={styles.line}>{t("signedInAsPlayer", { value: currentUser?.name })}</Text><Pressable style={styles.secondaryButton} onPress={onSignOut}><Text style={styles.secondaryButtonText}>{t("signOut")}</Text></Pressable>{currentUserIsLeader ? <><View style={styles.section}><Text style={styles.sectionTitle}>{t("pendingJoinRequests")}</Text>{joinRequests?.length ? joinRequests.map((req) => <View key={req.id} style={styles.card}><Text style={styles.line}>{req.displayName}</Text><Text style={styles.hint}>{t("requestedWithCode", { code: req.allianceCode })}</Text><View style={styles.row}><Pressable style={[styles.button, styles.half]} onPress={() => onApproveJoinRequest(req.id)}><Text style={styles.buttonText}>{t("approve")}</Text></Pressable><Pressable style={[styles.dangerButton, styles.half]} onPress={() => onRejectJoinRequest(req.id)}><Text style={styles.dangerButtonText}>{t("reject")}</Text></Pressable></View></View>) : <Text style={styles.hint}>{t("noPendingRequests")}</Text>}</View><View style={styles.section}><Text style={styles.sectionTitle}>{t("rotateCode")}</Text><TextInput value={newAllianceCode} onChangeText={onChangeNewAllianceCode} style={styles.input} /><Pressable style={styles.button} onPress={onRotateAllianceCode}><Text style={styles.buttonText}>{t("updateCode")}</Text></Pressable></View><View style={styles.section}><Text style={styles.sectionTitle}>{t("addMember")}</Text><TextInput value={newMemberName} onChangeText={onChangeNewMemberName} style={styles.input} placeholder={t("name")} /><View style={styles.row}><TextInput value={newMemberRank} onChangeText={onChangeNewMemberRank} style={[styles.input, styles.half]} placeholder={t("rank")} /><TextInput value={newMemberPower} onChangeText={onChangeNewMemberPower} style={[styles.input, styles.half]} placeholder={t("power")} keyboardType="decimal-pad" /></View><Pressable style={styles.button} onPress={onAddMember}><Text style={styles.buttonText}>{t("addMember")}</Text></Pressable></View></> : <View style={styles.section}><Text style={styles.sectionTitle}>{t("memberOptions")}</Text><Text style={styles.hint}>{t("leaveAnyTime")}</Text><Pressable style={styles.dangerButton} onPress={() => Alert.alert(t("leaveAllianceTitle"), t("leaveAllianceConfirm"), [{ text: t("cancel"), style: "cancel" }, { text: t("leave"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{t("leaveAlliance")}</Text></Pressable></View>}</View>; }

const styles = StyleSheet.create({ safeArea: { flex: 1, backgroundColor: "#f3efe3" }, keyboardShell: { flex: 1 }, loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, padding: 24 }, screen: { flex: 1, padding: 18, gap: 12 }, title: { fontSize: 28, fontWeight: "700", color: "#1f2a1f" }, hint: { fontSize: 14, color: "#566156" }, line: { color: "#435043", fontSize: 15 }, error: { color: "#8b241f", fontWeight: "700" }, alertBanner: { backgroundColor: "#f2dfc2", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#d9ba84", gap: 4 }, alertBannerTitle: { fontSize: 16, fontWeight: "700", color: "#5d3f11" }, alertBannerText: { fontSize: 14, color: "#72542b" }, voteBanner: { backgroundColor: "#dde9f3", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#b6cade", gap: 4 }, voteBannerTitle: { fontSize: 16, fontWeight: "700", color: "#244a68" }, voteBannerText: { fontSize: 14, color: "#40627d" }, card: { backgroundColor: "#fbf7ee", borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: "#e2d8c5" }, cardTitle: { fontSize: 22, fontWeight: "700", color: "#1f2a1f" }, input: { backgroundColor: "#f3eee1", borderRadius: 12, borderWidth: 1, borderColor: "#ddd0b9", paddingHorizontal: 12, paddingVertical: 10, color: "#243025" }, textArea: { minHeight: 96, textAlignVertical: "top" }, button: { backgroundColor: "#1f5c4d", borderRadius: 12, paddingVertical: 12, alignItems: "center" }, disabledButton: { opacity: 0.55 }, buttonText: { color: "#f7f4ee", fontWeight: "700" }, secondaryButton: { backgroundColor: "#efe5d2", borderRadius: 12, paddingVertical: 12, alignItems: "center" }, secondaryButtonText: { color: "#544636", fontWeight: "700" }, modeButtonActive: { backgroundColor: "#1f5c4d", borderWidth: 1, borderColor: "#1f5c4d" }, modeButtonTextActive: { color: "#f7f4ee" }, dangerButton: { backgroundColor: "#7f221d", borderRadius: 12, paddingVertical: 10, alignItems: "center" }, dangerButtonText: { color: "#fff5f4", fontWeight: "700" }, row: { flexDirection: "row", gap: 10 }, languageRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, languageButton: { backgroundColor: "#efe5d2", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#d8c6a6" }, languageButtonActive: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" }, languageButtonText: { color: "#544636", fontWeight: "700" }, languageButtonTextActive: { color: "#f7f4ee" }, half: { flex: 1 }, tabs: { flexGrow: 0, minHeight: 52 }, tab: { backgroundColor: "#f5ead8", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 12, minHeight: 44, justifyContent: "center", marginRight: 8, borderWidth: 1, borderColor: "#ccb99a", shadowColor: "#3d3124", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 }, tabActive: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" }, tabText: { color: "#3f3429", fontWeight: "700", fontSize: 14, lineHeight: 18, includeFontPadding: false, textAlignVertical: "center" }, tabTextActive: { color: "#f8f5ef" }, content: { flexGrow: 1, gap: 12, paddingBottom: 96 }, section: { gap: 8, marginTop: 8 }, sectionTitle: { fontSize: 16, fontWeight: "700", color: "#213126" }, disabled: { opacity: 0.55 }, pick: { backgroundColor: "#f3eee1", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd0b9" }, pickText: { color: "#243025", fontWeight: "600" }, selectedPlayerBox: { backgroundColor: "#dff0e5", borderColor: "#4f8a6e", borderWidth: 2 }, selectedPlayerText: { color: "#17352b" }, selectedPlayerHint: { color: "#2a6d52", fontSize: 12, fontWeight: "700", marginTop: 6, textTransform: "uppercase", letterSpacing: 0.6 }, dangerBox: { borderColor: "#be3e36", backgroundColor: "#f9e1de" }, dashboardShell: { backgroundColor: "#fbf7ee", borderRadius: 22, padding: 18, gap: 14, borderWidth: 1, borderColor: "#e2d8c5" }, metricGrid: { flexDirection: "row", gap: 10 }, dashboardMetricA: { flex: 1, backgroundColor: "#dbe9e1", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#c7d9cf" }, dashboardMetricB: { flex: 1, backgroundColor: "#efe4cf", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#deceb2" }, metricLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#587262", marginBottom: 8 }, metricPanelValue: { fontSize: 24, fontWeight: "700", color: "#17352b" }, dashboardCompare: { backgroundColor: "#1f5c4d", borderRadius: 18, padding: 16, gap: 6 }, dashboardCompareValue: { fontSize: 28, fontWeight: "700", color: "#f7f4ee" }, profileCard: { backgroundColor: "#fbf7ee", borderRadius: 22, padding: 18, gap: 16, borderWidth: 1, borderColor: "#e2d8c5" }, profileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, profileEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.2, color: "#7a6a55", marginBottom: 6 }, profileRank: { fontSize: 15, color: "#5b665a", marginTop: 4 }, rankBadge: { backgroundColor: "#1f5c4d", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 }, rankBadgeText: { color: "#f7f4ee", fontWeight: "700" }, metricPanel: { flex: 1, backgroundColor: "#e8f1ea", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#cfe0d5" }, statusCard: { borderRadius: 18, padding: 16, gap: 6, borderWidth: 1 }, statusCardActive: { backgroundColor: "#dff0e5", borderColor: "#9cc8ad" }, statusCardInactive: { backgroundColor: "#f2ecdf", borderColor: "#ddd0b9" }, statusEyebrow: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, color: "#5f6d60" }, statusTitle: { fontSize: 22, fontWeight: "700", color: "#1b3327" }, statusLine: { fontSize: 15, color: "#435043" }, todayItem: { backgroundColor: "#fbf7ee", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e3d8c3", gap: 4 }, todayItemTitle: { fontSize: 16, fontWeight: "700", color: "#1f2a1f" }, voteStatusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, votePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: "hidden", fontSize: 12, fontWeight: "700" }, votePillDone: { backgroundColor: "#d8ecdf", color: "#24523e" }, votePillPending: { backgroundColor: "#f0e3c8", color: "#6b4f20" }, squadCard: { flex: 1, backgroundColor: "#f4efe4", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#e0d4be", gap: 8 }, squadLabel: { fontSize: 13, fontWeight: "700", color: "#5b665a", textTransform: "uppercase", letterSpacing: 0.7 }, voteCard: { backgroundColor: "#f5efe3", borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: "#e0d4be" }, voteOptionWrap: { gap: 4 }, voteOption: { backgroundColor: "#fbf7ee", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#ddd0b9" }, voteOptionSelected: { borderColor: "#4f8a6e", backgroundColor: "#dff0e5" }, voteOptionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, voteCount: { fontSize: 14, fontWeight: "700", color: "#5b665a" }, voteResponseList: { fontSize: 13, color: "#5c6558", lineHeight: 18 }, inlineSummary: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#e2d8c5" }, memberCard: { backgroundColor: "#f7f1e5", borderRadius: 18, padding: 14, gap: 12, borderWidth: 1, borderColor: "#dfd1b7" }, memberCardSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, memberSummaryText: { flex: 1, gap: 2 }, memberSummaryRight: { flexDirection: "row", alignItems: "center", gap: 10 }, memberExpandIcon: { fontSize: 24, fontWeight: "700", color: "#5d4b36", width: 22, textAlign: "center" }, memberCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, memberHeaderText: { flex: 1, gap: 4 }, memberName: { fontSize: 20, fontWeight: "700", color: "#1f2a1f" }, memberNameCompact: { fontSize: 18, fontWeight: "700", color: "#1f2a1f" }, memberSubline: { fontSize: 14, color: "#6a725f" }, memberRankChip: { backgroundColor: "#1f5c4d", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }, memberRankChipText: { color: "#f7f4ee", fontWeight: "700" }, memberStatGrid: { flexDirection: "row", gap: 10 }, memberStatCard: { flex: 1, backgroundColor: "#fbf7ee", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#e3d8c3", gap: 6 }, memberStatLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#6a725f" }, memberStatValue: { fontSize: 18, fontWeight: "700", color: "#1f2a1f" }, memberSection: { gap: 8 }, memberSectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, color: "#6a725f" }, rankFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, rankFilterButton: { backgroundColor: "#efe5d2", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#d8c6a6" }, rankFilterButtonActive: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" }, rankFilterButtonText: { color: "#544636", fontWeight: "700" }, rankFilterButtonTextActive: { color: "#f7f4ee" }, calendarMonthShell: { backgroundColor: "#f6f0e4", borderRadius: 18, padding: 12, borderWidth: 1, borderColor: "#e1d6c2", gap: 10 }, calendarMonthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, calendarMonthArrow: { width: 40, height: 40, borderRadius: 999, backgroundColor: "#efe5d2", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#d8c6a6" }, calendarMonthArrowText: { fontSize: 24, fontWeight: "700", color: "#544636", marginTop: -2 }, calendarMonthTitle: { fontSize: 18, fontWeight: "700", color: "#213126" }, calendarWeekdayRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 }, calendarWeekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: "#7a6a55", textTransform: "uppercase" }, calendarGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 }, calendarStrip: { flexDirection: "row", gap: 8 }, calendarDayCell: { width: "13.3%", minHeight: 88, backgroundColor: "#fbf7ee", borderRadius: 16, borderWidth: 1, borderColor: "#e2d8c5", paddingHorizontal: 6, paddingVertical: 8, alignItems: "center", justifyContent: "space-between" }, calendarDayCellCompact: { flex: 1, width: undefined, minHeight: 82 }, calendarDayCellMuted: { opacity: 0.5 }, calendarDayCellToday: { borderColor: "#6ca88a", borderWidth: 2 }, calendarDayCellSelected: { backgroundColor: "#1f5c4d", borderColor: "#1f5c4d" }, calendarDayWeekLabel: { fontSize: 11, fontWeight: "700", color: "#6a725f", textTransform: "uppercase" }, calendarDayWeekLabelCompact: { fontSize: 12 }, calendarDayNumber: { fontSize: 26, fontWeight: "700", color: "#213126" }, calendarDayNumberCompact: { fontSize: 24 }, calendarDayTextMuted: { color: "#9b9384" }, calendarDayTextSelected: { color: "#f7f4ee" }, calendarEventBadge: { minWidth: 24, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#e1efe6", alignItems: "center", justifyContent: "center" }, calendarEventBadgeSelected: { backgroundColor: "#f7f4ee" }, calendarEventBadgeText: { fontSize: 12, fontWeight: "700", color: "#21563f" }, calendarEventBadgeTextSelected: { color: "#1f5c4d" }, calendarEventSpacer: { height: 24 }, calendarDetailCard: { backgroundColor: "#f3ede0", borderRadius: 18, padding: 14, borderWidth: 1, borderColor: "#e1d6c2", gap: 10 }, calendarDetailHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 } });
