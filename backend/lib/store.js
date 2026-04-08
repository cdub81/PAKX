const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const seed = require("../data/seed");

class UserError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserError";
  }
}

const HASH_SALT_BYTES = 16;
const HASH_KEY_BYTES = 64;
const HASHED_PASSWORD_REGEX = /^[a-f0-9]{32}:[a-f0-9]{128}$/;

function hashPassword(password) {
  const salt = crypto.randomBytes(HASH_SALT_BYTES).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, HASH_KEY_BYTES).toString("hex");
  return `${salt}:${hash}`;
}

function isHashedPassword(stored) {
  return HASHED_PASSWORD_REGEX.test(String(stored || ""));
}

function verifyPassword(input, stored) {
  if (!isHashedPassword(stored)) {
    return stored === input;
  }
  const [salt, hash] = stored.split(":");
  const inputHash = crypto.scryptSync(String(input), salt, HASH_KEY_BYTES).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(hash, "hex"));
}
const { getDesertStormCycleForDate, getServerShiftedDateParts, hasTimestampPassed } = require("./desertStorm");
const { buildAvailabilityMap, runZombieSiegePlanner } = require("./zombieSiege");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function normalizeSquadPowers(value) {
  return {
    squad1: Number(value?.squad1) || 0,
    squad2: Number(value?.squad2) || 0,
    squad3: Number(value?.squad3) || 0,
    squad4: Number(value?.squad4) || 0
  };
}

function mergeSquadPowers(current, updates) {
  const next = normalizeSquadPowers(current);
  for (const key of ["squad1", "squad2", "squad3", "squad4"]) {
    if (updates && Object.prototype.hasOwnProperty.call(updates, key)) {
      next[key] = Number(updates[key]) || 0;
    }
  }
  return next;
}

function totalSquadPower(squadPowers) {
  return squadPowers.squad1 + squadPowers.squad2 + squadPowers.squad3 + squadPowers.squad4;
}

function isLeaderRank(rank) {
  return rank === "R5" || rank === "R4";
}

function isExpoPushToken(value) {
  return /^(Expo(?:nent)?PushToken)\[.+\]$/.test(String(value || "").trim());
}

function normalizeExpoPushTokens(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map((entry) => String(entry || "").trim()).filter((entry) => isExpoPushToken(entry)))];
}

function queueExpoPushMessages(messages) {
  const payload = Array.isArray(messages) ? messages.filter((message) => isExpoPushToken(message?.to)) : [];
  if (!payload.length || typeof fetch !== "function") {
    console.log("[push-send] skipping Expo send", {
      attemptedMessages: Array.isArray(messages) ? messages.length : 0,
      validMessages: payload.length
    });
    return;
  }
  console.log("[push-send] sending Expo push batch", { attemptedMessages: payload.length });
  fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(async (response) => {
      const body = await response.json().catch(() => null);
      const tickets = Array.isArray(body?.data) ? body.data : [];
      const succeeded = tickets.filter((ticket) => ticket?.status === "ok").length;
      const failed = tickets.filter((ticket) => ticket?.status === "error").length;
      console.log("[push-send] Expo push batch finished", {
        attemptedMessages: payload.length,
        succeeded,
        failed
      });
      if (!response.ok) {
        console.error("[push-send] Expo push request failed", body || { status: response.status });
      }
    })
    .catch((error) => {
      console.error("[push-send] Failed to send Expo push notifications:", error);
    });
}

function normalizeDesertStormStats(value) {
  return {
    playedCount: Number(value?.playedCount) || 0,
    missedCount: Number(value?.missedCount) || 0
  };
}

function normalizeDesertStormVoteNotificationsEnabled(value) {
  return value !== false;
}

function normalizeDigNotificationsEnabled(value) {
  return value !== false;
}

function normalizePushPermissionStatus(value) {
  return ["granted", "denied", "undetermined", "error", "unknown"].includes(value) ? value : "unknown";
}

function normalizePushTokenFetchStatus(value) {
  return ["success", "missing", "skipped", "error", "not_attempted"].includes(value) ? value : "not_attempted";
}

function normalizePushDatabaseSyncStatus(value) {
  return ["updated", "unchanged", "missing_permission", "token_missing", "failed", "skipped"].includes(value) ? value : "skipped";
}

function normalizePushDebug(value) {
  return {
    permissionStatus: normalizePushPermissionStatus(value?.permissionStatus),
    tokenFetchStatus: normalizePushTokenFetchStatus(value?.tokenFetchStatus),
    databaseSyncStatus: normalizePushDatabaseSyncStatus(value?.databaseSyncStatus),
    lastSyncedAt: String(value?.lastSyncedAt || "").trim(),
    lastError: String(value?.lastError || "").trim()
  };
}

function normalizeDesertStormLayout(value) {
  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title || "").trim() || "Desert Storm Layout",
    lockedInAt: value.lockedInAt || new Date().toISOString(),
    lockedByPlayerId: value.lockedByPlayerId || "",
    lockedByName: value.lockedByName || "",
    result: value.result || "pending",
    notes: String(value.notes || ""),
    taskForces: clone(value.taskForces || {})
  };
}

function cloneSeedTaskForces() {
  return {
    taskForceA: clone(seed.alliances[0].taskForces.taskForceA),
    taskForceB: clone(seed.alliances[0].taskForces.taskForceB)
  };
}

function clearTaskForceAssignments(taskForces) {
  Object.values(taskForces || {}).forEach((taskForce) => {
    (taskForce.squads || []).forEach((squad) => {
      (squad.slots || []).forEach((slot) => {
        slot.playerName = "";
      });
    });
  });
  return taskForces;
}

function createEmptyTaskForces() {
  return clearTaskForceAssignments(cloneSeedTaskForces());
}

function normalizeDesertStormEventVote(value) {
  const normalizeVoteOptionId = (optionId) => {
    if (optionId === "cant_play") {
      return "no";
    }
    return optionId === "play" || optionId === "sub" || optionId === "no" ? optionId : "";
  };
  return {
    status: value?.status || "closed",
    openedAt: value?.openedAt || null,
    closedAt: value?.closedAt || null,
    options: Array.isArray(value?.options) && value.options.length
      ? value.options.map((option) => ({
          id: normalizeVoteOptionId(option.id || crypto.randomUUID()) || crypto.randomUUID(),
          label: String(option.label || "").trim()
        })).filter((option) => option.label)
      : [
          { id: "play", label: "Play" },
          { id: "sub", label: "Sub" },
          { id: "no", label: "Not Playing" }
        ],
    responses: Array.isArray(value?.responses)
      ? value.responses.map((response) => ({
          playerId: response.playerId || "",
          playerName: response.playerName || "",
          optionId: normalizeVoteOptionId(response.optionId || ""),
          createdAt: response.createdAt || new Date().toISOString()
        }))
      : []
  };
}

function normalizeDesertStormEventResult(value, taskForceLabel) {
  return {
    outcome: value?.outcome || "pending",
    notes: String(value?.notes || ""),
    label: taskForceLabel
  };
}

function normalizeDesertStormEvent(value) {
  const legacyStatus = String(value?.status || "").trim();
  const normalizedStatus = legacyStatus === "published"
    ? "published"
    : legacyStatus === "completed" || legacyStatus === "archived"
      ? "completed"
      : "open";
  const draftTaskForces = clone(value?.draftTaskForces || createEmptyTaskForces());
  const publishedTaskForces = value?.publishedTaskForces ? clone(value.publishedTaskForces) : null;
  const cycle = getDesertStormCycleForDate(value?.createdAt || new Date());
  return {
    id: value?.id || crypto.randomUUID(),
    title: String(value?.title || "").trim() || "Desert Storm Event",
    weekKey: String(value?.weekKey || "").trim() || cycle.weekKey,
    status: normalizedStatus,
    createdAt: value?.createdAt || new Date().toISOString(),
    createdByPlayerId: value?.createdByPlayerId || "",
    createdByName: value?.createdByName || "",
    votingOpenAt: value?.votingOpenAt || value?.vote?.openedAt || cycle.votingOpenAt,
    votingCloseAt: value?.votingCloseAt || value?.vote?.closedAt || cycle.votingCloseAt,
    matchStartsAt: value?.matchStartsAt || cycle.matchStartsAt,
    hasUnpublishedChanges: value?.hasUnpublishedChanges === undefined ? normalizedStatus !== "published" : Boolean(value?.hasUnpublishedChanges),
    voteChangedDraftedMemberIds: Array.isArray(value?.voteChangedDraftedMemberIds)
      ? [...new Set(value.voteChangedDraftedMemberIds.map((entry) => String(entry || "").trim()).filter(Boolean))]
      : [],
    calendarEventId: value?.calendarEventId || "",
    vote: normalizeDesertStormEventVote(value?.vote),
    draftTaskForces,
    publishedTaskForces,
    publishedAt: value?.publishedAt || null,
    archivedAt: value?.archivedAt || null,
    closedAt: value?.closedAt || value?.endedAt || value?.archivedAt || null,
    endedAt: value?.endedAt || value?.closedAt || value?.archivedAt || null,
    updatedAt: value?.updatedAt || value?.publishedAt || value?.createdAt || new Date().toISOString(),
    version: Number(value?.version) || 1,
    result: {
      taskForceA: normalizeDesertStormEventResult(value?.result?.taskForceA, "Task Force A"),
      taskForceB: normalizeDesertStormEventResult(value?.result?.taskForceB, "Task Force B")
    }
  };
}

function normalizeFeedbackEntry(value) {
  return {
    id: value.id || crypto.randomUUID(),
    message: String(value.message || "").trim(),
    createdAt: value.createdAt || new Date().toISOString(),
    createdByPlayerId: value.createdByPlayerId || "",
    createdByName: value.createdByName || "",
    comments: Array.isArray(value.comments) ? value.comments.map(normalizeFeedbackComment) : []
  };
}

function normalizeFeedbackComment(value) {
  return {
    id: value.id || crypto.randomUUID(),
    message: String(value.message || "").trim(),
    createdAt: value.createdAt || new Date().toISOString(),
    createdByPlayerId: value.createdByPlayerId || "",
    createdByName: value.createdByName || ""
  };
}

function normalizePushBroadcastLog(value) {
  return {
    id: value?.id || crypto.randomUUID(),
    createdAt: value?.createdAt || new Date().toISOString(),
    senderPlayerId: String(value?.senderPlayerId || "").trim(),
    senderName: String(value?.senderName || "").trim(),
    message: String(value?.message || "").trim(),
    preset: String(value?.preset || "").trim(),
    audience: value?.audience === "selected" ? "selected" : "all",
    memberIds: Array.isArray(value?.memberIds)
      ? [...new Set(value.memberIds.map((entry) => String(entry || "").trim()).filter(Boolean))]
      : [],
    targetedDevices: Math.max(0, Number(value?.targetedDevices) || 0)
  };
}

function normalizeDocumentKind(value) {
  return value === "photo" ? "photo" : "document";
}

function normalizeAllianceDocument(value) {
  return {
    id: value?.id || crypto.randomUUID(),
    title: String(value?.title || "").trim() || "Document",
    description: String(value?.description || "").trim(),
    url: String(value?.url || "").trim(),
    kind: normalizeDocumentKind(value?.kind),
    createdAt: value?.createdAt || new Date().toISOString(),
    createdByPlayerId: String(value?.createdByPlayerId || "").trim(),
    createdByName: String(value?.createdByName || "").trim()
  };
}

function normalizeCalendarRecurrence(value) {
  const recurrence = value && typeof value === "object" ? value : {};
  const repeat = ["none", "daily", "every_other_day", "weekly", "custom_weekdays"].includes(recurrence.repeat) ? recurrence.repeat : "none";
  const weekdays = Array.isArray(recurrence.weekdays)
    ? [...new Set(recurrence.weekdays.map((entry) => String(entry || "").toLowerCase()).filter((entry) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].includes(entry)))]
    : [];
  const endDate = recurrence.endDate ? String(recurrence.endDate).slice(0, 10) : "";
  return {
    repeat,
    weekdays,
    endDate
  };
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

function normalizeReminderStatus(value) {
  return ["active", "completed", "cancelled"].includes(value) ? value : "active";
}

function normalizeReminderMode(value) {
  return ["elapsed", "localTime", "serverTime"].includes(value) ? value : "elapsed";
}

function normalizeReminder(value) {
  return {
    id: value?.id || crypto.randomUUID(),
    memberId: String(value?.memberId || "").trim(),
    title: String(value?.title || "").trim() || "Reminder",
    notes: String(value?.notes || "").trim(),
    mode: normalizeReminderMode(value?.mode),
    durationDays: Math.max(0, Number(value?.durationDays) || 0),
    durationHours: Math.max(0, Number(value?.durationHours) || 0),
    durationMinutes: Math.max(0, Number(value?.durationMinutes) || 0),
    durationSeconds: Math.max(0, Number(value?.durationSeconds) || 0),
    scheduledForUtc: String(value?.scheduledForUtc || ""),
    originalLocalDateTime: String(value?.originalLocalDateTime || ""),
    originalServerDateTime: String(value?.originalServerDateTime || ""),
    status: normalizeReminderStatus(value?.status),
    notificationId: String(value?.notificationId || "").trim(),
    createdAt: value?.createdAt || new Date().toISOString(),
    updatedAt: value?.updatedAt || value?.createdAt || new Date().toISOString()
  };
}

function normalizeReminders(value, memberId = "") {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeReminder({ ...entry, memberId: entry?.memberId || memberId }))
    .sort((a, b) => String(a.scheduledForUtc || "").localeCompare(String(b.scheduledForUtc || "")));
}

function normalizeCalendarEntry(value) {
  const entryType = ["manual", "reminder", "linked_desert_storm", "linked_zombie_siege"].includes(value.entryType) ? value.entryType : "manual";
  const allDay = value.allDay !== false;
  const startDate = String(value.startDate || (typeof value.startsAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.startsAt) ? value.startsAt : value.startsAt ? String(value.startsAt).slice(0, 10) : "")).slice(0, 10);
  const endDate = String(value.endDate || (typeof value.endAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.endAt) ? value.endAt : value.endAt ? String(value.endAt).slice(0, 10) : startDate)).slice(0, 10);
  const startTime = allDay ? "" : String(value.startTime || "").slice(0, 5);
  const endTime = allDay ? "" : String(value.endTime || "").slice(0, 5);
  const serverStartDate = allDay ? "" : String(value.serverStartDate || startDate).slice(0, 10);
  const serverEndDate = allDay ? "" : String(value.serverEndDate || endDate || serverStartDate).slice(0, 10);
  const serverStartTime = allDay ? "" : String(value.serverStartTime || startTime).slice(0, 5);
  const serverEndTime = allDay ? "" : String(value.serverEndTime || endTime).slice(0, 5);
  const recurrence = normalizeCalendarRecurrence(value.recurrence);
  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title || "").trim(),
    description: String(value.description || "").trim(),
    startsAt: value.startsAt || new Date().toISOString(),
    endAt: value.endAt || null,
    entryType,
    linkedType: value.linkedType === "zombieSiege" ? "zombieSiege" : value.linkedType === "desertStorm" ? "desertStorm" : "",
    linkedEventId: String(value.linkedEventId || "").trim(),
    allDay,
    eventTimeZone: normalizeCalendarTimeZone(value.eventTimeZone),
    startDate,
    endDate,
    startTime,
    endTime,
    serverStartDate,
    serverEndDate,
    serverStartTime,
    serverEndTime,
    timeInputMode: value.timeInputMode === "local" ? "local" : "server",
    recurrence,
    createdAt: value.createdAt || new Date().toISOString(),
    createdByPlayerId: value.createdByPlayerId || "",
    createdByName: value.createdByName || "",
    leaderNotes: String(value.leaderNotes || "").trim(),
    leaderOnly: Boolean(value.leaderOnly)
  };
}

function normalizeZombieSiegePlan(value) {
  if (!value || typeof value !== "object") {
    return null;
  }
  return clone(value);
}

function normalizeZombieSiegeResponse(value) {
  return {
    playerId: value.playerId || "",
    playerName: value.playerName || "",
    status: value.status || "no_response",
    updatedAt: value.updatedAt || new Date().toISOString()
  };
}

function normalizeZombieSiegeWaveReview(value) {
  return {
    playerId: value.playerId || "",
    playerName: value.playerName || "",
    wallStatus: value.wallStatus || "unknown",
    updatedAt: value.updatedAt || new Date().toISOString()
  };
}

function normalizeZombieSiegeEvent(value) {
  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title || "").trim() || "Zombie Siege Event",
    startAt: String(value.startAt || ""),
    endAt: String(value.endAt || ""),
    voteClosesAt: String(value.voteClosesAt || value.startAt || ""),
    wave20Threshold: Number(value.wave20Threshold) || 0,
    status: value.status || "voting",
    createdAt: value.createdAt || new Date().toISOString(),
    createdByPlayerId: value.createdByPlayerId || "",
    createdByName: value.createdByName || "",
    availabilityResponses: Array.isArray(value.availabilityResponses) ? value.availabilityResponses.map(normalizeZombieSiegeResponse) : [],
    waveOneReview: Array.isArray(value.waveOneReview) ? value.waveOneReview.map(normalizeZombieSiegeWaveReview) : [],
    draftPlan: normalizeZombieSiegePlan(value.draftPlan),
    publishedPlan: normalizeZombieSiegePlan(value.publishedPlan),
    draftPlanUpdatedAt: value.draftPlanUpdatedAt || null,
    publishedAt: value.publishedAt || null,
    version: Number(value.version) || 1
  };
}

function getLayoutAssignedPlayerNames(layout) {
  const names = new Set();
  Object.values(layout?.taskForces || {}).forEach((taskForce) => {
    (taskForce.squads || []).forEach((squad) => {
      (squad.slots || []).forEach((slot) => {
        if (slot.playerName) {
          names.add(slot.playerName);
        }
      });
    });
  });
  return names;
}

function buildDesertStormAppearances(player, layouts) {
  return (layouts || [])
    .filter((layout) => getLayoutAssignedPlayerNames(layout).has(player.name))
    .map((layout) => ({
      id: layout.id,
      title: layout.title,
      lockedInAt: layout.lockedInAt,
      result: layout.result
    }))
    .sort((a, b) => String(b.lockedInAt).localeCompare(String(a.lockedInAt)));
}

function buildDesertStormEventAppearances(player, events) {
  return (events || [])
    .filter((event) => event.status === "archived")
    .flatMap((event) => {
      const publishedTaskForces = event.publishedTaskForces || {};
      for (const taskForce of Object.values(publishedTaskForces)) {
        for (const squad of taskForce.squads || []) {
          for (const slot of squad.slots || []) {
            if (slot.playerName !== player.name) continue;
            return [{
              id: `${event.id}-${taskForce.key}`,
              title: event.title,
              lockedInAt: event.archivedAt || event.endedAt || event.publishedAt || event.createdAt,
              result: event.result?.[taskForce.key]?.outcome || "pending"
            }];
          }
        }
      }
      return [];
    })
    .sort((a, b) => String(b.lockedInAt).localeCompare(String(a.lockedInAt)));
}

function recalculateDesertStormStats(alliance) {
  const totalLockedLayouts = Array.isArray(alliance.desertStormLayouts) ? alliance.desertStormLayouts.length : 0;
  const totalArchivedEvents = Array.isArray(alliance.desertStormEvents) ? alliance.desertStormEvents.filter((event) => event.status === "archived").length : 0;
  alliance.players.forEach((player) => {
    const legacyAppearances = buildDesertStormAppearances(player, alliance.desertStormLayouts);
    const eventAppearances = buildDesertStormEventAppearances(player, alliance.desertStormEvents);
    const appearances = [...eventAppearances, ...legacyAppearances].sort((a, b) => String(b.lockedInAt).localeCompare(String(a.lockedInAt)));
    player.desertStormStats = {
      playedCount: appearances.length,
      missedCount: Math.max(0, totalLockedLayouts + totalArchivedEvents - appearances.length)
    };
  });
}

function createPlayer(name, rank, overallPower) {
  return {
    id: crypto.randomUUID(),
    name,
    rank,
    overallPower,
    heroPower: 0,
    squadPowers: normalizeSquadPowers(),
    desertStormStats: normalizeDesertStormStats(),
    desertStormVoteNotificationsEnabled: true,
    digNotificationsEnabled: true,
    expoPushTokens: [],
    pushDebug: normalizePushDebug(),
    reminders: []
  };
}

function normalizeVote(vote) {
  return {
    id: vote.id || crypto.randomUUID(),
    title: String(vote.title || "").trim(),
    options: Array.isArray(vote.options)
      ? vote.options
          .map((option) => ({
            id: option.id || crypto.randomUUID(),
            label: String(option.label || "").trim()
          }))
          .filter((option) => option.label)
      : [],
    createdByPlayerId: vote.createdByPlayerId || "",
    createdByName: vote.createdByName || "",
    createdAt: vote.createdAt || new Date().toISOString(),
    status: vote.status || "open",
    closedAt: vote.closedAt || null,
    archivedAt: vote.archivedAt || null,
    tallyAppliedAt: vote.tallyAppliedAt || null,
    responses: Array.isArray(vote.responses)
      ? vote.responses.map((response) => ({
          playerId: response.playerId,
          optionId: response.optionId,
          createdAt: response.createdAt || new Date().toISOString()
        }))
      : []
  };
}

function createAccount({ username, password, displayName }) {
  const normalizedUsername = username.trim();
  return {
    id: crypto.randomUUID(),
    username: normalizedUsername,
    password: hashPassword(password),
    displayName: (displayName && displayName.trim()) || normalizedUsername,
    allianceId: null,
    playerId: null
  };
}

function normalizeAlliance(alliance) {
  return {
    id: alliance.id || `alliance-${slugify(alliance.name)}`,
    name: alliance.name,
    code: String(alliance.code).toUpperCase(),
    players: alliance.players.map((player) => ({
      id: player.id || crypto.randomUUID(),
      name: player.name,
      rank: player.rank,
      overallPower: Number(player.overallPower) || 0,
      heroPower: Number(player.heroPower) || 0,
      squadPowers: normalizeSquadPowers(player.squadPowers),
      desertStormStats: normalizeDesertStormStats(player.desertStormStats),
      desertStormVoteNotificationsEnabled: normalizeDesertStormVoteNotificationsEnabled(player.desertStormVoteNotificationsEnabled),
      digNotificationsEnabled: normalizeDigNotificationsEnabled(player.digNotificationsEnabled),
      expoPushTokens: normalizeExpoPushTokens(player.expoPushTokens),
      pushDebug: normalizePushDebug(player.pushDebug),
      reminders: normalizeReminders(player.reminders, player.id || "")
    })),
    taskForces: alliance.taskForces,
    desertStormSetupLocked: Boolean(alliance.desertStormSetupLocked),
    votes: Array.isArray(alliance.votes) ? alliance.votes.map(normalizeVote) : [],
    desertStormLayouts: Array.isArray(alliance.desertStormLayouts) ? alliance.desertStormLayouts.map(normalizeDesertStormLayout) : [],
    desertStormEvents: Array.isArray(alliance.desertStormEvents) ? alliance.desertStormEvents.map(normalizeDesertStormEvent) : [],
    feedbackEntries: Array.isArray(alliance.feedbackEntries) ? alliance.feedbackEntries.map(normalizeFeedbackEntry) : [],
    documents: Array.isArray(alliance.documents) ? alliance.documents.map(normalizeAllianceDocument).filter((entry) => entry.url) : [],
    calendarEntries: Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries.map(normalizeCalendarEntry) : [],
    zombieSiegeEvents: Array.isArray(alliance.zombieSiegeEvents) ? alliance.zombieSiegeEvents.map(normalizeZombieSiegeEvent) : [],
    pushBroadcastLogs: Array.isArray(alliance.pushBroadcastLogs) ? alliance.pushBroadcastLogs.map(normalizePushBroadcastLog) : []
  };
}

function createInitialStore() {
  const alliances = seed.alliances.map(normalizeAlliance);
  const pakxAlliance = alliances[0];
  const cdubPlayer = pakxAlliance?.players.find((player) => player.name === "Cdub81");

  return {
    alliances,
    accounts: cdubPlayer
      ? [
          {
            id: crypto.randomUUID(),
            username: "Cdub81",
            password: hashPassword("password"),
            displayName: "Cdub81",
            allianceId: pakxAlliance.id,
            playerId: cdubPlayer.id
          }
        ]
      : [],
    sessions: [],
    joinRequests: []
  };
}

function loadStore() {
  ensureDir();
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialStore();
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }

  const loaded = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  return normalizeState(loaded);
}

function normalizeState(loaded) {
  return {
    alliances: (loaded.alliances || []).map(normalizeAlliance),
    accounts: loaded.accounts || [],
    sessions: loaded.sessions || [],
    joinRequests: loaded.joinRequests || [],
    passwordResetRequests: loaded.passwordResetRequests || []
  };
}

function splitStateByAlliance(state) {
  return (state.alliances || []).map((alliance) => {
    const allianceAccounts = (state.accounts || []).filter((a) => a.allianceId === alliance.id);
    const allianceAccountIds = new Set(allianceAccounts.map((a) => a.id));
    const allianceJoinRequests = (state.joinRequests || []).filter((jr) => jr.allianceId === alliance.id);
    const pendingAccountIds = new Set(allianceJoinRequests.map((jr) => jr.accountId));
    const pendingAccounts = (state.accounts || []).filter((a) => pendingAccountIds.has(a.id) && !allianceAccountIds.has(a.id));
    const allRelatedAccountIds = new Set([...allianceAccountIds, ...pendingAccounts.map((a) => a.id)]);
    const allianceSessions = (state.sessions || []).filter((s) => allRelatedAccountIds.has(s.accountId));
    const alliancePasswordResetRequests = (state.passwordResetRequests || []).filter((r) => r.allianceId === alliance.id);
    return {
      allianceId: alliance.id,
      state: {
        alliance,
        accounts: [...allianceAccounts, ...pendingAccounts],
        sessions: allianceSessions,
        joinRequests: allianceJoinRequests,
        passwordResetRequests: alliancePasswordResetRequests
      }
    };
  });
}

function mergeAllianceStates(rows) {
  const alliances = [];
  const accounts = [];
  const sessions = [];
  const joinRequests = [];
  const passwordResetRequests = [];
  const seenAccountIds = new Set();
  const seenSessionTokens = new Set();
  const seenJoinRequestIds = new Set();
  const seenPasswordResetIds = new Set();
  for (const { state } of rows) {
    if (state.alliance) alliances.push(state.alliance);
    for (const account of (state.accounts || [])) {
      if (!seenAccountIds.has(account.id)) {
        accounts.push(account);
        seenAccountIds.add(account.id);
      }
    }
    for (const session of (state.sessions || [])) {
      if (!seenSessionTokens.has(session.token)) {
        sessions.push(session);
        seenSessionTokens.add(session.token);
      }
    }
    for (const jr of (state.joinRequests || [])) {
      if (!seenJoinRequestIds.has(jr.id)) {
        joinRequests.push(jr);
        seenJoinRequestIds.add(jr.id);
      }
    }
    for (const pr of (state.passwordResetRequests || [])) {
      if (!seenPasswordResetIds.has(pr.id)) {
        passwordResetRequests.push(pr);
        seenPasswordResetIds.add(pr.id);
      }
    }
  }
  return normalizeState({ alliances, accounts, sessions, joinRequests, passwordResetRequests });
}

function saveStore(store) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function createStore(config = {}) {
  let state = normalizeState(config.initialState || loadStore());
  let persistQueue = Promise.resolve();

  function commit() {
    saveStore(state);
    if (typeof config.onPersist === "function") {
      const splits = splitStateByAlliance(clone(state));
      persistQueue = persistQueue
        .then(() => Promise.all(splits.map(({ allianceId, state: allianceState }) => config.onPersist(allianceId, allianceState))))
        .catch((error) => {
          console.error("Failed to persist remote state:", error);
        });
    }
  }

  function publicPlayer(player, layouts = [], desertStormEvents = []) {
    const squadPowers = normalizeSquadPowers(player.squadPowers);
    const legacyAppearances = buildDesertStormAppearances(player, layouts);
    const eventAppearances = buildDesertStormEventAppearances(player, desertStormEvents);
    return {
      id: player.id,
      name: player.name,
      rank: player.rank,
      overallPower: player.overallPower,
      heroPower: Number(player.heroPower) || 0,
      squadPowers,
      totalSquadPower: totalSquadPower(squadPowers),
      desertStormStats: normalizeDesertStormStats(player.desertStormStats),
      desertStormVoteNotificationsEnabled: normalizeDesertStormVoteNotificationsEnabled(player.desertStormVoteNotificationsEnabled),
      digNotificationsEnabled: normalizeDigNotificationsEnabled(player.digNotificationsEnabled),
      hasExpoPushToken: normalizeExpoPushTokens(player.expoPushTokens).length > 0,
      pushDebug: normalizePushDebug(player.pushDebug),
      desertStormAppearances: [...eventAppearances, ...legacyAppearances].sort((a, b) => String(b.lockedInAt).localeCompare(String(a.lockedInAt)))
    };
  }

  function publicCalendarEntry(entry, viewerIsLeader = false) {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      startsAt: entry.startsAt,
      endAt: entry.endAt,
      entryType: entry.entryType || "manual",
      linkedType: entry.linkedType || "",
      linkedEventId: entry.linkedEventId || "",
      allDay: entry.allDay !== false,
      eventTimeZone: entry.eventTimeZone || "UTC",
      startDate: entry.startDate || "",
      endDate: entry.endDate || entry.startDate || "",
      startTime: entry.startTime || "",
      endTime: entry.endTime || "",
      serverStartDate: entry.serverStartDate || "",
      serverEndDate: entry.serverEndDate || "",
      serverStartTime: entry.serverStartTime || "",
      serverEndTime: entry.serverEndTime || "",
      timeInputMode: entry.timeInputMode === "local" ? "local" : "server",
      recurrence: normalizeCalendarRecurrence(entry.recurrence),
      createdAt: entry.createdAt,
      createdByPlayerId: entry.createdByPlayerId,
      createdByName: entry.createdByName,
      leaderOnly: Boolean(entry.leaderOnly),
      leaderNotes: viewerIsLeader ? String(entry.leaderNotes || "") : ""
    };
  }

  function buildZombieSiegeInstruction(assignment) {
    if (!assignment) {
      return [];
    }
    const instructions = [];
    assignment.keepHomeSquads.forEach((squad) => {
      instructions.push(`Keep ${squad.squadKey.replace("squad", "Squad ")} at home`);
    });
    assignment.outgoingGarrisons.forEach((squad) => {
      instructions.push(`Send ${squad.squadKey.replace("squad", "Squad ")} to ${squad.targetPlayerName}`);
    });
    if (!instructions.length) {
      instructions.push("No assignment yet");
    }
    return instructions;
  }

  function publicZombieSiegeEvent(event, alliance, viewerPlayerId = "", viewerIsLeader = false) {
    const assignment = event.publishedPlan?.assignments?.find((entry) => entry.playerId === viewerPlayerId) || null;
    const response = (event.availabilityResponses || []).find((entry) => entry.playerId === viewerPlayerId) || null;
    const now = new Date();
    const availability = buildAvailabilityMap(event, alliance.players, now).find((entry) => entry.playerId === viewerPlayerId) || null;
    const base = {
      id: event.id,
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      voteClosesAt: event.voteClosesAt,
      wave20Threshold: event.wave20Threshold,
      status: event.status,
      createdAt: event.createdAt,
      createdByPlayerId: event.createdByPlayerId,
      createdByName: event.createdByName,
      version: event.version,
      myAvailabilityStatus: availability?.availabilityStatus || response?.status || "no_response",
      myWallStatus: availability?.wallStatus || "unknown",
      myAssignment: assignment ? {
        ...assignment,
        instructions: buildZombieSiegeInstruction(assignment)
      } : null,
      publishedPlanSummary: event.publishedPlan ? {
        projectedSurvivors: event.publishedPlan.projectedSurvivors,
        projectedOnlineSurvivors: event.publishedPlan.projectedOnlineSurvivors,
        projectedOfflineSurvivors: event.publishedPlan.projectedOfflineSurvivors,
        summary: event.publishedPlan.summary || {}
      } : null
    };

    if (!viewerIsLeader) {
      return base;
    }

    return {
      ...base,
      availabilityResponses: clone(event.availabilityResponses || []),
      waveOneReview: clone(event.waveOneReview || []),
      draftPlan: event.draftPlan ? clone(event.draftPlan) : null,
      publishedPlan: event.publishedPlan ? clone(event.publishedPlan) : null
    };
  }

  function publicAlliance(alliance, viewerPlayerId = "") {
    if (!alliance) {
      return null;
    }
    ensureWeeklyDesertStormEvent(alliance);

    const viewer = alliance.players.find((player) => player.id === viewerPlayerId);
    const viewerIsLeader = Boolean(viewer && (viewer.rank === "R4" || viewer.rank === "R5"));
    return {
      id: alliance.id,
      name: alliance.name,
      code: alliance.code,
      players: alliance.players.map((player) => publicPlayer(player, alliance.desertStormLayouts, alliance.desertStormEvents)),
      taskForces: alliance.taskForces,
      desertStormSetupLocked: Boolean(alliance.desertStormSetupLocked),
      votes: alliance.votes.map((vote) => publicVote(vote, alliance.players, viewerPlayerId)),
      desertStormLayouts: (alliance.desertStormLayouts || []).map((layout) => ({
        id: layout.id,
        title: layout.title,
        lockedInAt: layout.lockedInAt,
        lockedByPlayerId: layout.lockedByPlayerId,
        lockedByName: layout.lockedByName,
        result: layout.result,
        notes: layout.notes,
        taskForces: clone(layout.taskForces)
      })),
      feedbackEntries: (alliance.feedbackEntries || []).map((entry) => ({
        id: entry.id,
        message: entry.message,
        createdAt: entry.createdAt,
        createdByPlayerId: entry.createdByPlayerId,
        createdByName: entry.createdByName,
        comments: (entry.comments || []).map((comment) => ({
          id: comment.id,
          message: comment.message,
          createdAt: comment.createdAt,
          createdByPlayerId: comment.createdByPlayerId,
          createdByName: comment.createdByName
        }))
      })),
      documents: (alliance.documents || []).map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.description,
        url: entry.url,
        kind: normalizeDocumentKind(entry.kind),
        createdAt: entry.createdAt,
        createdByPlayerId: entry.createdByPlayerId,
        createdByName: entry.createdByName
      })),
      calendarEntries: (alliance.calendarEntries || [])
        .filter((entry) => viewerIsLeader || !entry.leaderOnly)
        .map((entry) => publicCalendarEntry(entry, viewerIsLeader)),
      desertStormEvents: (alliance.desertStormEvents || [])
        .map((event) => publicDesertStormEvent(event, alliance, viewerPlayerId, viewerIsLeader))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
      zombieSiegeEvents: (alliance.zombieSiegeEvents || [])
        .map((event) => publicZombieSiegeEvent(event, alliance, viewerPlayerId, viewerIsLeader))
    };
  }

  function publicAccount(account) {
    return {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      allianceId: account.allianceId,
      playerId: account.playerId
    };
  }

  function publicReminder(reminder) {
    return {
      id: reminder.id,
      memberId: reminder.memberId,
      title: reminder.title,
      notes: reminder.notes,
      mode: reminder.mode,
      durationDays: reminder.durationDays || 0,
      durationHours: reminder.durationHours || 0,
      durationMinutes: reminder.durationMinutes || 0,
      durationSeconds: reminder.durationSeconds || 0,
      scheduledForUtc: reminder.scheduledForUtc,
      originalLocalDateTime: reminder.originalLocalDateTime || "",
      originalServerDateTime: reminder.originalServerDateTime || "",
      status: normalizeReminderStatus(reminder.status),
      notificationId: reminder.notificationId || "",
      createdAt: reminder.createdAt,
      updatedAt: reminder.updatedAt
    };
  }

  function getMemberReminders(member) {
    member.reminders = normalizeReminders(member.reminders, member.id);
    const now = Date.now();
    let changed = false;
    member.reminders.forEach((reminder) => {
      if (reminder.status === "active" && reminder.scheduledForUtc) {
        const fireAt = new Date(reminder.scheduledForUtc).getTime();
        if (!Number.isNaN(fireAt) && fireAt <= now) {
          reminder.status = "completed";
          reminder.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
    });
    if (changed) {
      commit();
    }
    return member.reminders;
  }

  function listRemindersForMember(allianceId, memberId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new UserError("Member not found.");
    }
    return getMemberReminders(member).map(publicReminder);
  }

  function publicJoinRequest(joinRequest) {
    return {
      id: joinRequest.id,
      accountId: joinRequest.accountId,
      allianceId: joinRequest.allianceId,
      allianceCode: joinRequest.allianceCode,
      displayName: joinRequest.displayName,
      status: joinRequest.status,
      createdAt: joinRequest.createdAt
    };
  }

  function publicVote(vote, players, viewerPlayerId = "") {
    const playerMap = Object.fromEntries(players.map((player) => [player.id, player]));
    const optionSummaries = vote.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: vote.responses.filter((response) => response.optionId === option.id).length
    }));
    const response = vote.responses.find((entry) => entry.playerId === viewerPlayerId) || null;
    const responses = vote.responses.map((entry) => {
      const option = vote.options.find((voteOption) => voteOption.id === entry.optionId);
      return {
        playerId: entry.playerId,
        playerName: playerMap[entry.playerId]?.name || "",
        optionId: entry.optionId,
        optionLabel: option?.label || "",
        createdAt: entry.createdAt
      };
    });
    return {
      id: vote.id,
      title: vote.title,
      options: optionSummaries,
      responses,
      createdByPlayerId: vote.createdByPlayerId,
      createdByName: vote.createdByName,
      createdAt: vote.createdAt,
      status: vote.status,
      closedAt: vote.closedAt,
      archivedAt: vote.archivedAt,
      totalVotes: vote.responses.length,
      eligibleVoters: players.length,
      didVote: Boolean(response),
      selectedOptionId: response?.optionId || null,
      votedAt: response?.createdAt || null
    };
  }

  function publicDesertStormVote(vote, players, viewerPlayerId = "", viewerIsLeader = false) {
    const playerMap = Object.fromEntries(players.map((player) => [player.id, player]));
    const response = (vote.responses || []).find((entry) => entry.playerId === viewerPlayerId) || null;
    const base = {
      status: vote.status,
      openedAt: vote.openedAt,
      closedAt: vote.closedAt,
      options: (vote.options || []).map((option) => ({
        id: option.id,
        label: option.label,
        votes: (vote.responses || []).filter((responseEntry) => responseEntry.optionId === option.id).length
      })),
      totalVotes: (vote.responses || []).length,
      eligibleVoters: players.length,
      didVote: Boolean(response),
      selectedOptionId: response?.optionId || null,
      votedAt: response?.createdAt || null
    };
    if (!viewerIsLeader) {
      return base;
    }
    return {
      ...base,
      responses: (vote.responses || []).map((entry) => ({
        playerId: entry.playerId,
        playerName: entry.playerName || playerMap[entry.playerId]?.name || "",
        optionId: entry.optionId,
        optionLabel: (vote.options || []).find((option) => option.id === entry.optionId)?.label || "",
        createdAt: entry.createdAt
      }))
    };
  }

function findAssignmentInTaskForces(taskForces, playerName) {
    for (const taskForce of Object.values(taskForces || {})) {
      for (const squad of taskForce.squads || []) {
        for (const slot of squad.slots || []) {
          if (slot.playerName === playerName) {
            return {
              taskForceKey: taskForce.key,
              taskForceLabel: taskForce.label,
              squadId: squad.id,
              squadLabel: squad.label,
              slotId: slot.id,
              slotLabel: slot.label
            };
          }
        }
      }
    }
  return null;
}

function getDraftedPlayerIdsForEvent(alliance, event) {
  const draftedPlayerNames = new Set();
  Object.values(event?.draftTaskForces || {}).forEach((taskForce) => {
    (taskForce.squads || []).forEach((squad) => {
      (squad.slots || []).forEach((slot) => {
        if (slot.playerName) {
          draftedPlayerNames.add(slot.playerName);
        }
      });
    });
  });
  return alliance.players
    .filter((player) => draftedPlayerNames.has(player.name))
    .map((player) => player.id);
}

  function publicDesertStormEvent(event, alliance, viewerPlayerId = "", viewerIsLeader = false) {
    const publishedAssignment = event.publishedTaskForces ? findAssignmentInTaskForces(event.publishedTaskForces, alliance.players.find((player) => player.id === viewerPlayerId)?.name) : null;
    const voteOpen = event.status !== "completed" && !hasTimestampPassed(event.votingCloseAt);
    const base = {
      id: event.id,
      weekKey: event.weekKey,
      title: event.title,
      status: event.status,
      createdAt: event.createdAt,
      createdByPlayerId: event.createdByPlayerId,
      createdByName: event.createdByName,
      votingOpenAt: event.votingOpenAt,
      votingCloseAt: event.votingCloseAt,
      matchStartsAt: event.matchStartsAt,
      hasUnpublishedChanges: Boolean(event.hasUnpublishedChanges),
      calendarEventId: event.calendarEventId || "",
      publishedAt: event.publishedAt,
      closedAt: event.closedAt,
      updatedAt: event.updatedAt,
      endedAt: event.endedAt,
      archivedAt: event.archivedAt,
      version: event.version,
      vote: {
        ...publicDesertStormVote(event.vote, alliance.players, viewerPlayerId, viewerIsLeader),
        status: voteOpen ? "open" : "closed"
      },
      result: clone(event.result),
      myAssignment: publishedAssignment
    };

    if (!viewerIsLeader) {
      return {
        ...base,
        publishedTaskForces: event.publishedTaskForces ? clone(event.publishedTaskForces) : null
      };
    }

    return {
      ...base,
      voteChangedDraftedMemberIds: [...event.voteChangedDraftedMemberIds],
      draftTaskForces: clone(event.draftTaskForces),
      publishedTaskForces: event.publishedTaskForces ? clone(event.publishedTaskForces) : null
    };
  }

  function createDesertStormCalendarEntry(event, player) {
    const matchDate = new Date(event.matchStartsAt);
    const matchEnd = new Date(matchDate.getTime() + 60 * 60 * 1000);
    const matchServerParts = getServerShiftedDateParts(matchDate);
    const endServerParts = getServerShiftedDateParts(matchEnd);
    const matchDateKey = `${String(matchServerParts.year).padStart(4, "0")}-${String(matchServerParts.month).padStart(2, "0")}-${String(matchServerParts.day).padStart(2, "0")}`;
    const endDateKey = `${String(endServerParts.year).padStart(4, "0")}-${String(endServerParts.month).padStart(2, "0")}-${String(endServerParts.day).padStart(2, "0")}`;
    return normalizeCalendarEntry({
      title: `${event.title} Match`,
      description: "Weekly Desert Storm match",
      startsAt: event.matchStartsAt,
      endAt: matchEnd.toISOString(),
      entryType: "linked_desert_storm",
      linkedType: "desertStorm",
      linkedEventId: event.id,
      allDay: false,
      eventTimeZone: "Etc/GMT+2",
      startDate: matchDateKey,
      endDate: endDateKey,
      startTime: "23:00",
      endTime: "00:00",
      serverStartDate: matchDateKey,
      serverEndDate: endDateKey,
      serverStartTime: "23:00",
      serverEndTime: "00:00",
      timeInputMode: "server",
      recurrence: { repeat: "none", weekdays: [], endDate: "" },
      createdByPlayerId: player?.id || "",
      createdByName: player?.name || "System",
      leaderNotes: "",
      leaderOnly: false
    });
  }

  function buildDesertStormAssignmentsPublishedMessages(alliance, event, isRepublish = false) {
    const uniqueTokens = new Set();
    const messages = [];
    alliance.players.forEach((member) => {
      normalizeExpoPushTokens(member.expoPushTokens).forEach((expoPushToken) => {
        if (uniqueTokens.has(expoPushToken)) {
          return;
        }
        uniqueTokens.add(expoPushToken);
        messages.push({
          to: expoPushToken,
          sound: "default",
          title: "Desert Storm",
          body: "Desert Storm teams have been published",
          data: {
            type: "desertStormAssignmentsPublished",
            eventId: event.id,
            target: "taskForce",
            isRepublish
          }
        });
      });
    });
    return messages;
  }

  function syncDesertStormEventLifecycle(alliance, event) {
    let changed = false;
    const voteShouldBeOpen = event.status !== "completed" && !hasTimestampPassed(event.votingCloseAt);
    if (event.vote.status !== (voteShouldBeOpen ? "open" : "closed")) {
      event.vote.status = voteShouldBeOpen ? "open" : "closed";
      if (voteShouldBeOpen && !event.vote.openedAt) {
        event.vote.openedAt = event.votingOpenAt;
      }
      if (!voteShouldBeOpen && !event.vote.closedAt) {
        event.vote.closedAt = event.votingCloseAt;
      }
      changed = true;
    }
    if (event.status !== "completed" && !event.calendarEventId) {
      alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries : [];
      const existingEntry = alliance.calendarEntries.find((entry) => entry.linkedType === "desertStorm" && entry.linkedEventId === event.id);
      if (existingEntry) {
        event.calendarEventId = existingEntry.id;
      } else {
        const calendarEntry = createDesertStormCalendarEntry(event);
        alliance.calendarEntries.unshift(calendarEntry);
        event.calendarEventId = calendarEntry.id;
      }
      changed = true;
    }
    return changed;
  }

  function ensureWeeklyDesertStormEvent(alliance) {
    alliance.desertStormEvents = Array.isArray(alliance.desertStormEvents) ? alliance.desertStormEvents.map(normalizeDesertStormEvent) : [];
    alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries.map(normalizeCalendarEntry) : [];
    const cycle = getDesertStormCycleForDate(new Date());
    let changed = false;
    alliance.desertStormEvents.forEach((event) => {
      if (syncDesertStormEventLifecycle(alliance, event)) {
        changed = true;
      }
    });
    if (!alliance.desertStormEvents.some((event) => event.weekKey === cycle.weekKey)) {
      const creator = alliance.players.find((player) => isLeaderRank(player.rank)) || alliance.players[0] || null;
      const event = normalizeDesertStormEvent({
        weekKey: cycle.weekKey,
        title: `Desert Storm ${cycle.matchDateKey}`,
        status: "open",
        createdAt: cycle.votingOpenAt,
        updatedAt: cycle.votingOpenAt,
        createdByPlayerId: creator?.id || "",
        createdByName: creator?.name || "System",
        votingOpenAt: cycle.votingOpenAt,
        votingCloseAt: cycle.votingCloseAt,
        matchStartsAt: cycle.matchStartsAt,
        hasUnpublishedChanges: false,
        vote: {
          status: "open",
          openedAt: cycle.votingOpenAt,
          closedAt: null,
          options: [
            { id: "play", label: "Play" },
            { id: "sub", label: "Substitute" },
            { id: "no", label: "Not Playing" }
          ],
          responses: []
        },
        draftTaskForces: createEmptyTaskForces(),
        publishedTaskForces: null
      });
      const calendarEntry = createDesertStormCalendarEntry(event, creator);
      alliance.calendarEntries.unshift(calendarEntry);
      event.calendarEventId = calendarEntry.id;
      alliance.desertStormEvents.unshift(event);
      queueExpoPushMessages(buildDesertStormVoteOpenMessages(alliance, event));
      changed = true;
    }
    if (changed) {
      commit();
    }
  }

  function findAllianceByCode(code) {
    return state.alliances.find((alliance) => alliance.code === String(code).trim().toUpperCase());
  }

  function findAllianceById(id) {
    return state.alliances.find((alliance) => alliance.id === id);
  }

  function listZombieSiegeEventsForAlliance(allianceId, viewerPlayerId = "") {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const viewer = alliance.players.find((player) => player.id === viewerPlayerId);
    const viewerIsLeader = Boolean(viewer && (viewer.rank === "R4" || viewer.rank === "R5"));
    return (alliance.zombieSiegeEvents || [])
      .map((event) => publicZombieSiegeEvent(event, alliance, viewerPlayerId, viewerIsLeader))
      .sort((a, b) => String(b.startAt || b.createdAt).localeCompare(String(a.startAt || a.createdAt)));
  }

  function findZombieSiegeEvent(alliance, eventId) {
    return (alliance.zombieSiegeEvents || []).find((event) => event.id === eventId);
  }

  function listDesertStormEventsForAlliance(allianceId, viewerPlayerId = "") {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    ensureWeeklyDesertStormEvent(alliance);
    const viewer = alliance.players.find((player) => player.id === viewerPlayerId);
    const viewerIsLeader = Boolean(viewer && isLeaderRank(viewer.rank));
    return (alliance.desertStormEvents || [])
      .map((event) => publicDesertStormEvent(event, alliance, viewerPlayerId, viewerIsLeader))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function findDesertStormEvent(alliance, eventId) {
    return (alliance.desertStormEvents || []).find((event) => event.id === eventId);
  }

  function buildDesertStormVoteOpenMessages(alliance, event, triggeringPlayerId = "") {
    const responsePlayerIds = new Set((event.vote.responses || []).map((entry) => entry.playerId));
    const uniqueTokens = new Set();
    const messages = [];
    alliance.players.forEach((member) => {
      if (triggeringPlayerId && member.id === triggeringPlayerId) {
        return;
      }
      if (!normalizeDesertStormVoteNotificationsEnabled(member.desertStormVoteNotificationsEnabled)) {
        return;
      }
      if (responsePlayerIds.has(member.id)) {
        return;
      }
      normalizeExpoPushTokens(member.expoPushTokens).forEach((expoPushToken) => {
        if (uniqueTokens.has(expoPushToken)) {
          return;
        }
        uniqueTokens.add(expoPushToken);
        messages.push({
          to: expoPushToken,
          sound: "default",
          title: "Desert Storm",
          body: "Desert Storm vote is live — tap to respond",
          data: {
            type: "desertStormVote",
            eventId: event.id
          }
        });
      });
    });
    return messages;
  }

  function buildAllianceBroadcastMessages(alliance, message, triggeringPlayerId = "", allowedMemberIds = null, options = {}) {
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) {
      return {
        messages: [],
        stats: {
          evaluatedMembers: 0,
          tokensFound: 0,
          tokensMissing: 0,
          skippedOptedOut: 0,
          dedupedTokens: 0
        }
      };
    }
    const allowedIds = allowedMemberIds ? new Set(allowedMemberIds) : null;
    const respectDigOptOut = options?.preset === "dig";
    const uniqueTokens = new Set();
    const messages = [];
    const stats = {
      evaluatedMembers: 0,
      tokensFound: 0,
      tokensMissing: 0,
      skippedOptedOut: 0,
      dedupedTokens: 0
    };
    alliance.players.forEach((member) => {
      if (allowedIds && !allowedIds.has(member.id)) {
        return;
      }
      stats.evaluatedMembers += 1;
      if (respectDigOptOut && !normalizeDigNotificationsEnabled(member.digNotificationsEnabled)) {
        stats.skippedOptedOut += 1;
        return;
      }
      const memberTokens = normalizeExpoPushTokens(member.expoPushTokens);
      if (!memberTokens.length) {
        stats.tokensMissing += 1;
      }
      memberTokens.forEach((expoPushToken) => {
        if (uniqueTokens.has(expoPushToken)) {
          stats.dedupedTokens += 1;
          return;
        }
        uniqueTokens.add(expoPushToken);
        stats.tokensFound += 1;
        messages.push({
          to: expoPushToken,
          sound: "default",
          title: `${alliance.name} Broadcast`,
          body: normalizedMessage,
          data: {
            type: "allianceBroadcast",
            playerId: triggeringPlayerId || ""
          }
        });
      });
    });
    console.log("[push-send] built alliance broadcast recipients", {
      audience: allowedIds ? "selected" : "all",
      preset: options?.preset || "",
      ...stats,
      sendsAttempted: messages.length
    });
    return { messages, stats };
  }

  function isPlayerAssignedToDesertStorm(alliance, playerName) {
    return Object.values(alliance.taskForces || {}).some((taskForce) =>
      (taskForce.squads || []).some((squad) =>
        (squad.slots || []).some((slot) => slot.playerName === playerName)
      )
    );
  }

  function findAccountByUsername(username) {
    return state.accounts.find(
      (account) => account.username.trim().toLowerCase() === String(username).trim().toLowerCase()
    );
  }

  function findSession(token) {
    return state.sessions.find((session) => session.token === token);
  }

  function findPendingJoinRequestForAccount(accountId) {
    return state.joinRequests.find((entry) => entry.accountId === accountId && entry.status === "pending");
  }

  function createSession(accountId) {
    const session = {
      token: crypto.randomBytes(24).toString("hex"),
      accountId,
      createdAt: new Date().toISOString()
    };
    state.sessions.push(session);
    return session;
  }

  const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  function getSessionContext(token) {
    const session = findSession(token);
    if (!session) {
      return null;
    }

    if (session.createdAt && Date.now() - new Date(session.createdAt).getTime() > TOKEN_MAX_AGE_MS) {
      return null;
    }

    const account = state.accounts.find((entry) => entry.id === session.accountId);
    if (!account) {
      return null;
    }

    const alliance = account.allianceId ? findAllianceById(account.allianceId) : null;
    const player = alliance && account.playerId ? alliance.players.find((entry) => entry.id === account.playerId) : null;

    return {
      session,
      account,
      alliance,
      player,
      joinRequest: findPendingJoinRequestForAccount(account.id)
    };
  }

  function createAccountAndSession(payload) {
    if (!payload.username || !payload.password) {
      throw new UserError("username and password are required.");
    }
    if (findAccountByUsername(payload.username)) {
      throw new UserError("Username already exists.");
    }

    const account = createAccount(payload);
    state.accounts.push(account);
    const session = createSession(account.id);
    commit();

    return {
      token: session.token,
      account: publicAccount(account),
      alliance: null,
      player: null
    };
  }

  function signInAccount({ username, password }) {
    const account = findAccountByUsername(username);
    if (!account || !verifyPassword(password, account.password)) {
      throw new UserError("Invalid username or password.");
    }
    if (!isHashedPassword(account.password)) {
      account.password = hashPassword(password);
    }

    const session = createSession(account.id);
    commit();

    const alliance = account.allianceId ? findAllianceById(account.allianceId) : null;
    const player = alliance && account.playerId ? alliance.players.find((entry) => entry.id === account.playerId) : null;

    return {
      token: session.token,
      account: publicAccount(account),
      alliance: publicAlliance(alliance),
      player: player ? publicPlayer(player) : null
    };
  }

  function resetMemberPassword(allianceId, targetPlayerId, requestingPlayer) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const targetPlayer = alliance.players.find((p) => p.id === targetPlayerId);
    if (!targetPlayer) {
      throw new UserError("Member not found.");
    }
    const targetAccount = state.accounts.find((a) => a.allianceId === allianceId && a.playerId === targetPlayerId);
    if (!targetAccount) {
      throw new UserError("No account found for this member.");
    }
    const tempPassword = crypto.randomBytes(6).toString("hex");
    targetAccount.password = hashPassword(tempPassword);
    // Auto-dismiss any pending password reset request for this player
    (state.passwordResetRequests || []).forEach((r) => {
      if (r.allianceId === allianceId && r.playerId === targetPlayerId && r.status === "pending") {
        r.status = "resolved";
      }
    });
    commit();
    return { tempPassword, playerName: targetPlayer.name };
  }

  function changeOwnPassword(accountId, currentPassword, newPassword) {
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new UserError("Account not found.");
    }
    if (!verifyPassword(currentPassword, account.password)) {
      throw new UserError("Current password is incorrect.");
    }
    const trimmed = String(newPassword || "").trim();
    if (trimmed.length < 6) {
      throw new UserError("New password must be at least 6 characters.");
    }
    account.password = hashPassword(trimmed);
    commit();
    return { ok: true };
  }

  function changeOwnUsername(accountId, newUsername) {
    const account = state.accounts.find((a) => a.id === accountId);
    if (!account) {
      throw new UserError("Account not found.");
    }
    const trimmed = String(newUsername || "").trim();
    if (!trimmed) {
      throw new UserError("Username cannot be empty.");
    }
    if (trimmed.length < 3) {
      throw new UserError("Username must be at least 3 characters.");
    }
    if (trimmed.length > 30) {
      throw new UserError("Username must be 30 characters or fewer.");
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      throw new UserError("Username can only contain letters, numbers, underscores, hyphens, and periods.");
    }
    const taken = state.accounts.find((a) => a.id !== accountId && String(a.username || "").toLowerCase() === trimmed.toLowerCase());
    if (taken) {
      throw new UserError("That username is already taken.");
    }
    account.username = trimmed;
    account.displayName = trimmed;
    commit();
    return { ok: true, username: trimmed };
  }

  function createPasswordResetRequest(username) {
    const account = state.accounts.find((a) => String(a.username || "").toLowerCase() === String(username || "").trim().toLowerCase());
    if (!account) {
      // Return success even when not found to avoid username enumeration
      return { ok: true };
    }
    if (!account.allianceId) {
      // User not in an alliance — nothing to do
      return { ok: true };
    }
    const alliance = findAllianceById(account.allianceId);
    if (!alliance) {
      return { ok: true };
    }
    // Try to find player by stored playerId, then fall back to searching by displayName/username
    let player = account.playerId ? alliance.players.find((p) => p.id === account.playerId) : null;
    if (!player) {
      player = alliance.players.find((p) => String(p.name || "").toLowerCase() === String(account.displayName || account.username || "").toLowerCase());
    }
    const playerName = player ? player.name : (account.displayName || account.username);
    // Dedup: remove any existing pending request for this account
    state.passwordResetRequests = (state.passwordResetRequests || []).filter((r) => !(r.accountId === account.id && r.status === "pending"));
    const request = {
      id: crypto.randomUUID(),
      accountId: account.id,
      playerId: player ? player.id : (account.playerId || null),
      allianceId: account.allianceId,
      playerName,
      username: account.username,
      requestedAt: new Date().toISOString(),
      status: "pending"
    };
    state.passwordResetRequests.push(request);
    commit();
    return { ok: true };
  }

  function listPasswordResetRequestsForAlliance(allianceId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    return (state.passwordResetRequests || []).filter((r) => r.allianceId === allianceId && r.status === "pending");
  }

  function dismissPasswordResetRequest(allianceId, requestId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const request = (state.passwordResetRequests || []).find((r) => r.id === requestId && r.allianceId === allianceId);
    if (!request) {
      throw new UserError("Request not found.");
    }
    request.status = "dismissed";
    commit();
    return { ok: true };
  }

  function getAlliancePreviewByCode(code) {
    const alliance = findAllianceByCode(code);
    if (!alliance) {
      throw new UserError("Alliance code not found.");
    }
    return {
      id: alliance.id,
      name: alliance.name,
      code: alliance.code,
      players: alliance.players.map((player) => publicPlayer(player, alliance.desertStormLayouts, alliance.desertStormEvents))
    };
  }

  function listVotesForAlliance(allianceId, viewerPlayerId = "") {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    return alliance.votes.map((vote) => publicVote(vote, alliance.players, viewerPlayerId));
  }

  function requestJoinAllianceForAccount(accountId, allianceCode) {
    const account = state.accounts.find((entry) => entry.id === accountId);
    if (!account) {
      throw new UserError("Account not found.");
    }
    if (account.allianceId) {
      throw new UserError("Account is already linked to an alliance.");
    }
    if (findPendingJoinRequestForAccount(account.id)) {
      throw new UserError("This account already has a pending join request.");
    }

    const alliance = findAllianceByCode(allianceCode);
    if (!alliance) {
      throw new UserError("Alliance code not found.");
    }
    const joinRequest = {
      id: crypto.randomUUID(),
      accountId: account.id,
      allianceId: alliance.id,
      allianceCode: alliance.code,
      displayName: account.displayName,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    state.joinRequests.push(joinRequest);
    commit();

    return {
      account: publicAccount(account),
      alliance: publicAlliance(alliance),
      joinRequest: publicJoinRequest(joinRequest)
    };
  }

  function listJoinRequestsForAlliance(allianceId) {
    return state.joinRequests
      .filter((entry) => entry.allianceId === allianceId && entry.status === "pending")
      .map(publicJoinRequest);
  }

  function approveJoinRequest(allianceId, requestId) {
    const joinRequest = state.joinRequests.find((entry) => entry.id === requestId && entry.allianceId === allianceId);
    if (!joinRequest || joinRequest.status !== "pending") {
      throw new UserError("Join request not found.");
    }
    const account = state.accounts.find((entry) => entry.id === joinRequest.accountId);
    const alliance = findAllianceById(allianceId);
    if (!account || !alliance) {
      throw new UserError("Join request is invalid.");
    }
    if (account.allianceId) {
      throw new UserError("Account is already linked to an alliance.");
    }

    let player = alliance.players.find((entry) => entry.name.trim().toLowerCase() === account.displayName.trim().toLowerCase());
    if (!player) {
      player = createPlayer(account.displayName, "R1", 0);
      alliance.players.push(player);
    }

    account.allianceId = alliance.id;
    account.playerId = player.id;
    joinRequest.status = "approved";
    commit();

    return {
      joinRequest: publicJoinRequest(joinRequest),
      account: publicAccount(account),
      alliance: publicAlliance(alliance),
      player: publicPlayer(player)
    };
  }

  function rejectJoinRequest(allianceId, requestId) {
    const joinRequest = state.joinRequests.find((entry) => entry.id === requestId && entry.allianceId === allianceId);
    if (!joinRequest || joinRequest.status !== "pending") {
      throw new UserError("Join request not found.");
    }
    joinRequest.status = "rejected";
    commit();
    return publicJoinRequest(joinRequest);
  }

  function leaveAllianceForAccount(accountId) {
    const account = state.accounts.find((entry) => entry.id === accountId);
    if (!account) {
      throw new UserError("Account not found.");
    }
    if (!account.allianceId || !account.playerId) {
      throw new UserError("Account is not linked to an alliance.");
    }

    const alliance = findAllianceById(account.allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }

    const player = alliance.players.find((entry) => entry.id === account.playerId);
    if (!player) {
      throw new UserError("Player not found.");
    }

    if (player.rank === "R5" || player.rank === "R4") {
      throw new UserError("Leaders cannot leave the alliance from this action.");
    }

    alliance.players = alliance.players.filter((entry) => entry.id !== player.id);
    Object.values(alliance.taskForces).forEach((taskForce) => {
      (taskForce.squads || []).forEach((squad) => {
        (squad.slots || []).forEach((slot) => {
          if (slot.playerName === player.name) {
            slot.playerName = "";
          }
        });
      });
    });
    alliance.votes.forEach((vote) => {
      vote.responses = vote.responses.filter((response) => response.playerId !== player.id);
    });
    (alliance.desertStormEvents || []).forEach((event) => {
      event.vote.responses = (event.vote.responses || []).filter((response) => response.playerId !== player.id);
      clearPlayerFromTaskForces(event.draftTaskForces, player.name);
      if (event.publishedTaskForces) {
        clearPlayerFromTaskForces(event.publishedTaskForces, player.name);
      }
    });

    account.allianceId = null;
    account.playerId = null;
    commit();

    return {
      account: publicAccount(account),
      player: publicPlayer(player)
    };
  }

  function createAllianceForAccount(accountId, { name, code }) {
    const account = state.accounts.find((entry) => entry.id === accountId);
    if (!account) {
      throw new UserError("Account not found.");
    }
    if (account.allianceId) {
      throw new UserError("Account is already linked to an alliance.");
    }
    if (findAllianceByCode(code)) {
      throw new UserError("Alliance code already exists.");
    }

    const leader = createPlayer(account.displayName, "R5", 0);
    const alliance = {
      id: `alliance-${crypto.randomUUID()}`,
      name: name.trim(),
      code: String(code).trim().toUpperCase(),
      players: [leader],
      taskForces: createEmptyTaskForces(),
      votes: [],
      desertStormEvents: []
    };

    state.alliances.push(alliance);
    account.allianceId = alliance.id;
    account.playerId = leader.id;
    commit();

    return {
      account: publicAccount(account),
      alliance: publicAlliance(alliance),
      player: publicPlayer(leader)
    };
  }

  function updateAllianceCode(allianceId, code) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const normalized = String(code).trim().toUpperCase();
    const conflict = state.alliances.find((entry) => entry.id !== allianceId && entry.code === normalized);
    if (conflict) {
      throw new UserError("Alliance code already exists.");
    }
    alliance.code = normalized;
    commit();
    return publicAlliance(alliance);
  }

  function addMember(allianceId, { name, rank, overallPower, heroPower }) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = createPlayer(name, rank, overallPower);
    member.heroPower = Number(heroPower) || 0;
    alliance.players.push(member);
    commit();
    return publicPlayer(member);
  }

  function updateMember(allianceId, memberId, updates) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new UserError("Member not found.");
    }

    if (typeof updates.name === "string" && updates.name.trim()) {
      member.name = updates.name.trim();
    }
    if (typeof updates.rank === "string" && updates.rank.trim()) {
      member.rank = updates.rank.trim().toUpperCase();
    }
    if (updates.overallPower !== undefined) {
      member.overallPower = Number(updates.overallPower) || 0;
    }
    if (updates.heroPower !== undefined) {
      member.heroPower = Number(updates.heroPower) || 0;
    }
    if (updates.squadPowers !== undefined) {
      member.squadPowers = mergeSquadPowers(member.squadPowers, updates.squadPowers);
    }
    if (updates.desertStormVoteNotificationsEnabled !== undefined) {
      member.desertStormVoteNotificationsEnabled = normalizeDesertStormVoteNotificationsEnabled(updates.desertStormVoteNotificationsEnabled);
    }
    if (updates.digNotificationsEnabled !== undefined) {
      member.digNotificationsEnabled = normalizeDigNotificationsEnabled(updates.digNotificationsEnabled);
    }

    const linkedAccount = state.accounts.find((account) => account.playerId === member.id);
    if (linkedAccount && typeof updates.name === "string" && updates.name.trim()) {
      linkedAccount.displayName = member.name;
    }

    commit();
    return publicPlayer(member);
  }

  function createReminder(allianceId, memberId, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new UserError("Member not found.");
    }
    const reminder = normalizeReminder({
      ...payload,
      memberId,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!reminder.scheduledForUtc || Number.isNaN(new Date(reminder.scheduledForUtc).getTime())) {
      throw new UserError("scheduledForUtc is required.");
    }
    if (new Date(reminder.scheduledForUtc).getTime() <= Date.now()) {
      throw new UserError("scheduledForUtc must be in the future.");
    }
    member.reminders = normalizeReminders([...(member.reminders || []), reminder], member.id);
    commit();
    return publicReminder(reminder);
  }

  function updateReminder(allianceId, memberId, reminderId, updates = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new UserError("Member not found.");
    }
    member.reminders = normalizeReminders(member.reminders, member.id);
    const reminder = (member.reminders || []).find((entry) => entry.id === reminderId);
    if (!reminder) {
      throw new UserError("Reminder not found.");
    }
    if (updates.title !== undefined) {
      reminder.title = String(updates.title || "").trim() || reminder.title;
    }
    if (updates.notes !== undefined) {
      reminder.notes = String(updates.notes || "").trim();
    }
    if (updates.notificationId !== undefined) {
      reminder.notificationId = String(updates.notificationId || "").trim();
    }
    if (updates.status !== undefined) {
      reminder.status = normalizeReminderStatus(updates.status);
    }
    if (updates.scheduledForUtc !== undefined) {
      const scheduledForUtc = String(updates.scheduledForUtc || "");
      if (!scheduledForUtc || Number.isNaN(new Date(scheduledForUtc).getTime())) {
        throw new UserError("scheduledForUtc must be a valid ISO timestamp.");
      }
      if (new Date(scheduledForUtc).getTime() <= Date.now()) {
        throw new UserError("scheduledForUtc must be in the future.");
      }
      reminder.scheduledForUtc = scheduledForUtc;
    }
    reminder.updatedAt = new Date().toISOString();
    commit();
    return publicReminder(reminder);
  }

  function deleteReminder(allianceId, memberId, reminderId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new UserError("Member not found.");
    }
    member.reminders = normalizeReminders(member.reminders, member.id);
    const index = (member.reminders || []).findIndex((entry) => entry.id === reminderId);
    if (index === -1) {
      throw new UserError("Reminder not found.");
    }
    const [deleted] = member.reminders.splice(index, 1);
    commit();
    return publicReminder(deleted);
  }

  function removeMember(allianceId, memberId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new UserError("Member not found.");
    }

    alliance.players = alliance.players.filter((player) => player.id !== memberId);
    Object.values(alliance.taskForces).forEach((taskForce) => {
      (taskForce.squads || []).forEach((squad) => {
        (squad.slots || []).forEach((slot) => {
          if (slot.playerName === member.name) {
            slot.playerName = "";
          }
        });
      });
    });
    alliance.votes.forEach((vote) => {
      vote.responses = vote.responses.filter((response) => response.playerId !== memberId);
    });
    (alliance.desertStormEvents || []).forEach((event) => {
      event.vote.responses = (event.vote.responses || []).filter((response) => response.playerId !== memberId);
      clearPlayerFromTaskForces(event.draftTaskForces, member.name);
      if (event.publishedTaskForces) {
        clearPlayerFromTaskForces(event.publishedTaskForces, member.name);
      }
    });

    state.accounts.forEach((account) => {
      if (account.playerId === memberId) {
        account.playerId = null;
        account.allianceId = null;
      }
    });

    recalculateDesertStormStats(alliance);
    commit();
    return publicPlayer(member);
  }

  function updateTaskForceSlot(allianceId, taskForceKey, squadId, slotId, playerName) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    if (alliance.desertStormSetupLocked) {
      throw new UserError("Create new teams before editing the Desert Storm setup again.");
    }
    const taskForce = alliance.taskForces[taskForceKey];
    if (!taskForce) {
      throw new UserError("Task force not found.");
    }
    const squad = taskForce.squads.find((entry) => entry.id === squadId);
    if (!squad) {
      throw new UserError("Squad not found.");
    }
    const slot = squad.slots.find((entry) => entry.id === slotId);
    if (!slot) {
      throw new UserError("Slot not found.");
    }
    slot.playerName = playerName || "";
    commit();
    return clone(taskForce);
  }

  function resetTaskForcesForNewTeams(allianceId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    Object.values(alliance.taskForces || {}).forEach((taskForce) => {
      (taskForce.squads || []).forEach((squad) => {
        (squad.slots || []).forEach((slot) => {
          slot.playerName = "";
        });
      });
    });
    alliance.desertStormSetupLocked = false;
    commit();
    return clone(alliance.taskForces);
  }

  function addFeedbackEntry(allianceId, player, message) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) {
      throw new UserError("message is required.");
    }
    alliance.feedbackEntries = Array.isArray(alliance.feedbackEntries) ? alliance.feedbackEntries : [];
    const entry = normalizeFeedbackEntry({
      message: normalizedMessage,
      createdByPlayerId: player.id,
      createdByName: player.name
    });
    alliance.feedbackEntries.unshift(entry);
    commit();
    return clone(entry);
  }

  function addAllianceDocument(allianceId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const title = String(payload?.title || "").trim();
    const url = String(payload?.url || "").trim();
    const description = String(payload?.description || "").trim();
    const kind = normalizeDocumentKind(payload?.kind);
    if (!title) {
      throw new UserError("Document title is required.");
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      throw new UserError("Document URL must start with http:// or https://.");
    }
    alliance.documents = Array.isArray(alliance.documents) ? alliance.documents : [];
    const entry = normalizeAllianceDocument({
      title,
      description,
      url,
      kind,
      createdByPlayerId: player.id,
      createdByName: player.name
    });
    alliance.documents.unshift(entry);
    commit();
    return clone(entry);
  }

  function deleteAllianceDocument(allianceId, documentId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    alliance.documents = Array.isArray(alliance.documents) ? alliance.documents : [];
    const index = alliance.documents.findIndex((entry) => entry.id === documentId);
    if (index === -1) {
      throw new UserError("Document not found.");
    }
    const [deletedEntry] = alliance.documents.splice(index, 1);
    commit();
    return { ok: true, deletedDocumentId: deletedEntry.id };
  }

  function addFeedbackComment(allianceId, feedbackEntryId, player, message) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) {
      throw new UserError("message is required.");
    }
    alliance.feedbackEntries = Array.isArray(alliance.feedbackEntries) ? alliance.feedbackEntries : [];
    const entry = alliance.feedbackEntries.find((candidate) => candidate.id === feedbackEntryId);
    if (!entry) {
      throw new UserError("Feedback entry not found.");
    }
    entry.comments = Array.isArray(entry.comments) ? entry.comments : [];
    const comment = normalizeFeedbackComment({
      message: normalizedMessage,
      createdByPlayerId: player.id,
      createdByName: player.name
    });
    entry.comments.push(comment);
    commit();
    return clone(comment);
  }

  function createCalendarEntry(allianceId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const title = String(payload?.title || "").trim();
    const startsAt = String(payload?.startsAt || "").trim();
    const startDate = String(payload?.startDate || "").trim();
    const allDay = payload?.allDay !== false;
    const entryType = String(payload?.entryType || "manual").trim();
    const recurrence = normalizeCalendarRecurrence(payload?.recurrence);
    if (!title) {
      throw new UserError("title is required.");
    }
    if (!startsAt && !startDate) {
      throw new UserError("startsAt or startDate is required.");
    }
    alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries : [];
    const entry = normalizeCalendarEntry({
      title,
      description: payload.description || "",
      startsAt: startsAt || startDate,
      endAt: payload.endAt || null,
      entryType,
      linkedType: payload.linkedType || "",
      linkedEventId: payload.linkedEventId || "",
      allDay,
      eventTimeZone: normalizeCalendarTimeZone(payload.eventTimeZone),
      startDate: payload.startDate || "",
      endDate: payload.endDate || payload.startDate || "",
      startTime: payload.startTime || "",
      endTime: payload.endTime || "",
      serverStartDate: payload.serverStartDate || payload.startDate || "",
      serverEndDate: payload.serverEndDate || payload.endDate || payload.startDate || "",
      serverStartTime: payload.serverStartTime || payload.startTime || "",
      serverEndTime: payload.serverEndTime || payload.endTime || "",
      timeInputMode: payload.timeInputMode === "local" ? "local" : "server",
      recurrence,
      createdByPlayerId: player.id,
      createdByName: player.name,
      leaderNotes: payload.leaderNotes || "",
      leaderOnly: payload.leaderOnly
    });
    alliance.calendarEntries.unshift(entry);
    commit();
    return clone(entry);
  }

  function updateCalendarEntry(allianceId, entryId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries : [];
    const index = alliance.calendarEntries.findIndex((entry) => entry.id === entryId);
    if (index === -1) {
      throw new UserError("Calendar entry not found.");
    }
    const currentEntry = alliance.calendarEntries[index];
    const title = String(payload?.title || "").trim();
    const startsAt = String(payload?.startsAt || "").trim();
    const startDate = String(payload?.startDate || "").trim();
    const allDay = payload?.allDay !== false;
    const entryType = String(payload?.entryType || currentEntry.entryType || "manual").trim();
    const recurrence = normalizeCalendarRecurrence(payload?.recurrence);
    if (!title) {
      throw new UserError("title is required.");
    }
    if (!startsAt && !startDate) {
      throw new UserError("startsAt or startDate is required.");
    }
    const updatedEntry = normalizeCalendarEntry({
      ...currentEntry,
      title,
      description: payload.description || "",
      startsAt: startsAt || startDate,
      endAt: payload.endAt || null,
      entryType,
      linkedType: payload.linkedType || "",
      linkedEventId: payload.linkedEventId || "",
      allDay,
      eventTimeZone: normalizeCalendarTimeZone(payload.eventTimeZone || currentEntry.eventTimeZone || "UTC"),
      startDate: payload.startDate || "",
      endDate: payload.endDate || payload.startDate || currentEntry.endDate || currentEntry.startDate || "",
      startTime: payload.startTime || "",
      endTime: payload.endTime || "",
      serverStartDate: payload.serverStartDate || payload.startDate || currentEntry.serverStartDate || currentEntry.startDate || "",
      serverEndDate: payload.serverEndDate || payload.endDate || currentEntry.serverEndDate || currentEntry.endDate || currentEntry.serverStartDate || currentEntry.startDate || "",
      serverStartTime: payload.serverStartTime || payload.startTime || currentEntry.serverStartTime || currentEntry.startTime || "",
      serverEndTime: payload.serverEndTime || payload.endTime || currentEntry.serverEndTime || currentEntry.endTime || "",
      timeInputMode: payload.timeInputMode === "local" ? "local" : (currentEntry.timeInputMode === "local" ? "local" : "server"),
      recurrence,
      leaderNotes: payload.leaderNotes || "",
      leaderOnly: payload.leaderOnly,
      updatedAt: new Date().toISOString(),
      updatedByPlayerId: player.id,
      updatedByName: player.name
    });
    alliance.calendarEntries[index] = updatedEntry;
    commit();
    return clone(updatedEntry);
  }

  function deleteCalendarEntry(allianceId, entryId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const index = (alliance.calendarEntries || []).findIndex((entry) => entry.id === entryId);
    if (index === -1) {
      throw new UserError("Calendar entry not found.");
    }
    const [deletedEntry] = alliance.calendarEntries.splice(index, 1);
    commit();
    return { ok: true, deletedEntryId: deletedEntry.id };
  }

  function createZombieSiegeEvent(allianceId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const title = String(payload?.title || "").trim();
    const startAt = String(payload?.startAt || "").trim();
    const endAt = String(payload?.endAt || "").trim();
    const wave20Threshold = Number(payload?.wave20Threshold);
    if (!title || !startAt || !endAt || !Number.isFinite(wave20Threshold)) {
      throw new UserError("title, startAt, endAt, and wave20Threshold are required.");
    }
    alliance.zombieSiegeEvents = Array.isArray(alliance.zombieSiegeEvents) ? alliance.zombieSiegeEvents : [];
    const event = normalizeZombieSiegeEvent({
      title,
      startAt,
      endAt,
      voteClosesAt: "",
      wave20Threshold,
      status: "voting",
      createdByPlayerId: player.id,
      createdByName: player.name
    });
    alliance.zombieSiegeEvents.unshift(event);
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, true);
  }

  function submitZombieSiegeAvailability(allianceId, eventId, player, status) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const event = findZombieSiegeEvent(alliance, eventId);
    if (!event) {
      throw new UserError("Zombie Siege event not found.");
    }
    if (!["online", "offline"].includes(status)) {
      throw new UserError("status must be online or offline.");
    }
    if (event.status === "archived") {
      throw new UserError("This event has ended.");
    }
    const existing = (event.availabilityResponses || []).find((entry) => entry.playerId === player.id);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date().toISOString();
      existing.playerName = player.name;
    } else {
      event.availabilityResponses.push(normalizeZombieSiegeResponse({
        playerId: player.id,
        playerName: player.name,
        status
      }));
    }
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, isLeaderRank(player.rank));
  }

  function runZombieSiegePlan(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const event = findZombieSiegeEvent(alliance, eventId);
    if (!event) {
      throw new UserError("Zombie Siege event not found.");
    }
    const plan = runZombieSiegePlanner({
      players: alliance.players.map((entry) => publicPlayer(entry, alliance.desertStormLayouts, alliance.desertStormEvents)),
      event,
      previousPublishedPlan: event.publishedPlan
    });
    event.draftPlan = plan;
    event.draftPlanUpdatedAt = new Date().toISOString();
    if (event.status === "voting") {
      event.status = "planned";
    }
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, true);
  }

  function publishZombieSiegePlan(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const event = findZombieSiegeEvent(alliance, eventId);
    if (!event) {
      throw new UserError("Zombie Siege event not found.");
    }
    if (!event.draftPlan) {
      throw new UserError("No draft plan is available to publish.");
    }
    event.publishedPlan = clone(event.draftPlan);
    event.publishedAt = new Date().toISOString();
    event.version = Number(event.version || 1) + 1;
    event.status = "active";
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, true);
  }

  function discardZombieSiegeDraft(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const event = findZombieSiegeEvent(alliance, eventId);
    if (!event) {
      throw new UserError("Zombie Siege event not found.");
    }
    event.draftPlan = null;
    event.draftPlanUpdatedAt = null;
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, true);
  }

  function endZombieSiegeEvent(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const event = findZombieSiegeEvent(alliance, eventId);
    if (!event) {
      throw new UserError("Zombie Siege event not found.");
    }
    event.status = "archived";
    event.endedAt = new Date().toISOString();
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, true);
  }

  function updateZombieSiegeWaveOneReview(allianceId, eventId, player, reviews) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const event = findZombieSiegeEvent(alliance, eventId);
    if (!event) {
      throw new UserError("Zombie Siege event not found.");
    }
    if (!Array.isArray(reviews)) {
      throw new UserError("reviews must be an array.");
    }
    const allowed = new Set(["unknown", "had_wall", "no_wall"]);
    event.waveOneReview = reviews
      .map((review) => ({
        playerId: String(review.playerId || ""),
        playerName: String(review.playerName || alliance.players.find((entry) => entry.id === review.playerId)?.name || ""),
        wallStatus: String(review.wallStatus || "unknown")
      }))
      .filter((review) => review.playerId && allowed.has(review.wallStatus))
      .map((review) => normalizeZombieSiegeWaveReview(review));
    commit();
    return publicZombieSiegeEvent(event, alliance, player.id, true);
  }

  function createDesertStormEvent(allianceId, player, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    ensureWeeklyDesertStormEvent(alliance);
    const cycle = getDesertStormCycleForDate(new Date());
    const existing = (alliance.desertStormEvents || []).find((entry) => entry.weekKey === cycle.weekKey);
    if (existing) {
      return publicDesertStormEvent(existing, alliance, player.id, true);
    }
    const title = String(payload.title || "").trim() || `Desert Storm ${cycle.matchDateKey}`;
    const event = normalizeDesertStormEvent({
      weekKey: cycle.weekKey,
      title,
      status: "open",
      createdAt: cycle.votingOpenAt,
      updatedAt: cycle.votingOpenAt,
      createdByPlayerId: player.id,
      createdByName: player.name,
      votingOpenAt: cycle.votingOpenAt,
      votingCloseAt: cycle.votingCloseAt,
      matchStartsAt: cycle.matchStartsAt,
      hasUnpublishedChanges: false,
      vote: {
        status: "open",
        openedAt: cycle.votingOpenAt,
        closedAt: null,
        options: [
          { id: "play", label: "Play" },
          { id: "sub", label: "Substitute" },
          { id: "no", label: "Not Playing" }
        ],
        responses: []
      },
      draftTaskForces: createEmptyTaskForces(),
      publishedTaskForces: null
    });
    const calendarEntry = createDesertStormCalendarEntry(event, player);
    alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries : [];
    alliance.calendarEntries.unshift(calendarEntry);
    event.calendarEventId = calendarEntry.id;
    alliance.desertStormEvents.unshift(event);
    queueExpoPushMessages(buildDesertStormVoteOpenMessages(alliance, event, player.id));
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function registerExpoPushToken(allianceId, player, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const member = alliance.players.find((entry) => entry.id === player.id);
    if (!member) {
      throw new UserError("Player not found.");
    }
    const now = new Date().toISOString();
    const normalizedPayload = typeof payload === "object" && payload !== null
      ? payload
      : { expoPushToken: payload };
    const permissionStatus = normalizePushPermissionStatus(normalizedPayload.permissionStatus);
    let tokenFetchStatus = normalizePushTokenFetchStatus(normalizedPayload.tokenFetchStatus);
    let databaseSyncStatus = "skipped";
    let lastError = String(normalizedPayload.lastError || "").trim();
    const normalizedToken = String(normalizedPayload.expoPushToken || "").trim();
    const existingTokens = normalizeExpoPushTokens(member.expoPushTokens);

    console.log("[push-sync] syncing member push token", {
      playerId: member.id,
      permissionStatus,
      tokenFetchStatus,
      hasToken: Boolean(normalizedToken)
    });

    if (permissionStatus !== "granted") {
      tokenFetchStatus = tokenFetchStatus === "error" ? "error" : "skipped";
      databaseSyncStatus = permissionStatus === "error" ? "failed" : "missing_permission";
    } else if (normalizedToken) {
      if (!isExpoPushToken(normalizedToken)) {
        member.pushDebug = normalizePushDebug({
          permissionStatus,
          tokenFetchStatus: "error",
          databaseSyncStatus: "failed",
          lastSyncedAt: now,
          lastError: "A valid Expo push token is required."
        });
        commit();
        throw new UserError("A valid Expo push token is required.");
      }
      tokenFetchStatus = "success";
      member.expoPushTokens = normalizeExpoPushTokens([...(member.expoPushTokens || []), normalizedToken]);
      databaseSyncStatus = existingTokens.includes(normalizedToken) ? "unchanged" : "updated";
      lastError = "";
    } else {
      tokenFetchStatus = tokenFetchStatus === "error" ? "error" : "missing";
      databaseSyncStatus = tokenFetchStatus === "error" ? "failed" : "token_missing";
    }

    member.pushDebug = normalizePushDebug({
      permissionStatus,
      tokenFetchStatus,
      databaseSyncStatus,
      lastSyncedAt: now,
      lastError
    });
    commit();
    console.log("[push-sync] member push sync result", {
      playerId: member.id,
      permissionStatus: member.pushDebug.permissionStatus,
      tokenFetchStatus: member.pushDebug.tokenFetchStatus,
      databaseSyncStatus: member.pushDebug.databaseSyncStatus,
      tokenCount: normalizeExpoPushTokens(member.expoPushTokens).length
    });
    return publicPlayer(member, alliance.desertStormLayouts, alliance.desertStormEvents);
  }

  function sendAllianceBroadcastPush(allianceId, player, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const normalizedMessage = String(payload?.message || "").trim();
    if (!normalizedMessage) {
      throw new UserError("message is required.");
    }
    const audience = payload?.audience === "selected" ? "selected" : "all";
    const preset = payload?.preset === "dig" ? "dig" : "";
    const normalizedMemberIds = Array.isArray(payload?.memberIds)
      ? [...new Set(payload.memberIds.map((value) => String(value || "").trim()).filter(Boolean))]
      : [];
    if (audience === "selected" && !normalizedMemberIds.length) {
      throw new UserError("Select at least one member.");
    }
    const validMemberIds = normalizedMemberIds.filter((memberId) => alliance.players.some((member) => member.id === memberId));
    if (audience === "selected" && !validMemberIds.length) {
      throw new UserError("Selected members were not found in the alliance.");
    }
    const { messages, stats } = buildAllianceBroadcastMessages(
      alliance,
      normalizedMessage,
      player?.id || "",
      audience === "selected" ? validMemberIds : null,
      { preset }
    );
    if (messages.length) {
      queueExpoPushMessages(messages);
    }
    console.log("[push-send] alliance broadcast send summary", {
      preset,
      audience,
      evaluatedMembers: stats.evaluatedMembers,
      tokensFound: stats.tokensFound,
      tokensMissing: stats.tokensMissing,
      skippedOptedOut: stats.skippedOptedOut,
      sendsAttempted: messages.length
    });
    alliance.pushBroadcastLogs = Array.isArray(alliance.pushBroadcastLogs) ? alliance.pushBroadcastLogs : [];
    alliance.pushBroadcastLogs.unshift(normalizePushBroadcastLog({
      senderPlayerId: player?.id || "",
      senderName: player?.name || "",
      message: normalizedMessage,
      preset,
      audience,
      memberIds: audience === "selected" ? validMemberIds : [],
      targetedDevices: messages.length
    }));
    alliance.pushBroadcastLogs = alliance.pushBroadcastLogs.slice(0, 100);
    commit();
    return {
      ok: true,
      targetedDevices: messages.length,
      message: normalizedMessage,
      audience,
      preset,
      memberIds: audience === "selected" ? validMemberIds : []
    };
  }

  function listAlliancePushBroadcastLogs(allianceId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    return (alliance.pushBroadcastLogs || [])
      .map((entry) => normalizePushBroadcastLog(entry))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function getAlliancePushReachability(allianceId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const players = Array.isArray(alliance.players) ? alliance.players : [];
    const members = [];
    let reachableDeviceCount = 0;

    players.forEach((member) => {
      const tokenCount = normalizeExpoPushTokens(member.expoPushTokens).length;
      const digEnabled = normalizeDigNotificationsEnabled(member.digNotificationsEnabled);
      const pushDebug = normalizePushDebug(member.pushDebug);
      let status = "no_push_token_saved";
      let reason = "No push token saved yet";

      if (!digEnabled) {
        status = "opted_out";
        reason = "Dig notifications turned off";
      } else if (tokenCount > 0) {
        status = "push_ready";
        reason = "Push ready";
      } else if (pushDebug.databaseSyncStatus === "failed" || pushDebug.tokenFetchStatus === "error") {
        status = "token_sync_failed";
        reason = pushDebug.lastError || "Token sync failed";
      } else if (pushDebug.permissionStatus === "denied" || pushDebug.permissionStatus === "undetermined") {
        status = "permission_not_granted";
        reason = "Permission not granted";
      } else if (pushDebug.permissionStatus === "granted" && pushDebug.tokenFetchStatus === "missing") {
        status = "token_missing_on_device";
        reason = "Token missing on device";
      } else if (pushDebug.permissionStatus === "granted" && pushDebug.tokenFetchStatus === "success" && !tokenCount) {
        status = "token_missing_in_database";
        reason = "Token missing in database";
      }

      const entry = {
        id: member.id,
        name: member.name,
        rank: member.rank,
        tokenCount,
        status,
        reason,
        lastSyncedAt: pushDebug.lastSyncedAt || "",
        lastError: pushDebug.lastError || ""
      };
      members.push(entry);
      if (status === "push_ready") {
        reachableDeviceCount += tokenCount;
      }
    });

    return {
      totalMembers: players.length,
      reachableMembers: members.filter((entry) => entry.status === "push_ready").length,
      reachableDeviceCount,
      withoutPushToken: members.filter((entry) => entry.status !== "push_ready" && entry.status !== "opted_out"),
      optedOut: members.filter((entry) => entry.status === "opted_out"),
      members: members.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
    };
  }

  function setDesertStormVoteState(allianceId, eventId, player, status) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status === "completed") {
      throw new UserError("This Desert Storm event can no longer be updated.");
    }
    const now = new Date().toISOString();
    if (hasTimestampPassed(event.votingCloseAt) && status === "open") {
      throw new UserError("Desert Storm voting is closed for this week.");
    }
    const wasOpen = event.vote.status === "open";
    if (status === "open") {
      event.vote.status = "open";
      event.vote.openedAt = event.vote.openedAt || now;
      event.vote.closedAt = null;
    } else {
      event.vote.status = "closed";
      event.vote.closedAt = now;
    }
    event.updatedAt = now;
    commit();
    if (status === "open" && !wasOpen) {
      queueExpoPushMessages(buildDesertStormVoteOpenMessages(alliance, event, player.id));
    }
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function submitDesertStormVote(allianceId, eventId, player, optionId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status === "completed" || event.vote.status !== "open" || hasTimestampPassed(event.votingCloseAt)) {
      throw new UserError("Desert Storm voting is closed.");
    }
    const option = (event.vote.options || []).find((entry) => entry.id === optionId);
    if (!option) {
      throw new UserError("Vote option not found.");
    }
    const existing = (event.vote.responses || []).find((entry) => entry.playerId === player.id);
    const previousOptionId = existing?.optionId || "";
    if (existing) {
      existing.optionId = optionId;
      existing.createdAt = new Date().toISOString();
      existing.playerName = player.name;
    } else {
      event.vote.responses.push({
        playerId: player.id,
        playerName: player.name,
        optionId,
        createdAt: new Date().toISOString()
      });
    }
    if (previousOptionId && previousOptionId !== optionId) {
      const draftedPlayerIds = new Set(getDraftedPlayerIdsForEvent(alliance, event));
      if (draftedPlayerIds.has(player.id)) {
        event.voteChangedDraftedMemberIds = [...new Set([...(event.voteChangedDraftedMemberIds || []), player.id])];
      }
    }
    event.updatedAt = new Date().toISOString();
    commit();
    return publicDesertStormEvent(event, alliance, player.id, isLeaderRank(player.rank));
  }

  function getTaskForceSlot(taskForces, taskForceKey, squadId, slotId) {
    const taskForce = taskForces?.[taskForceKey];
    if (!taskForce) throw new UserError("Task force not found.");
    const squad = (taskForce.squads || []).find((entry) => entry.id === squadId);
    if (!squad) throw new UserError("Squad not found.");
    const slot = (squad.slots || []).find((entry) => entry.id === slotId);
    if (!slot) throw new UserError("Slot not found.");
    return { taskForce, squad, slot };
  }

  function clearPlayerFromTaskForces(taskForces, playerName, ignore = null) {
    Object.values(taskForces || {}).forEach((taskForce) => {
      (taskForce.squads || []).forEach((squad) => {
        (squad.slots || []).forEach((slot) => {
          if (slot.playerName !== playerName) return;
          if (ignore && ignore.taskForceKey === taskForce.key && ignore.squadId === squad.id && ignore.slotId === slot.id) return;
          slot.playerName = "";
        });
      });
    });
  }

  function updateDesertStormEventSlot(allianceId, eventId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status === "completed") {
      throw new UserError("This Desert Storm event can no longer be edited.");
    }
    const target = getTaskForceSlot(event.draftTaskForces, payload.taskForceKey, payload.squadId, payload.slotId);
    const normalizedPlayerName = String(payload.playerName || "");
    if (normalizedPlayerName) {
      clearPlayerFromTaskForces(event.draftTaskForces, normalizedPlayerName, {
        taskForceKey: payload.taskForceKey,
        squadId: payload.squadId,
        slotId: payload.slotId
      });
    }
    target.slot.playerName = normalizedPlayerName;
    event.hasUnpublishedChanges = true;
    event.voteChangedDraftedMemberIds = [];
    event.updatedAt = new Date().toISOString();
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function moveDesertStormEventPlayer(allianceId, eventId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status === "completed") {
      throw new UserError("This Desert Storm event can no longer be edited.");
    }
    if (payload.sourceTaskForceKey === payload.taskForceKey && payload.sourceSquadId === payload.squadId && payload.sourceSlotId === payload.slotId) {
      throw new UserError("Source and target slot must be different.");
    }
    const source = getTaskForceSlot(event.draftTaskForces, payload.sourceTaskForceKey, payload.sourceSquadId, payload.sourceSlotId);
    const target = getTaskForceSlot(event.draftTaskForces, payload.taskForceKey, payload.squadId, payload.slotId);
    const sourcePlayerName = source.slot.playerName || "";
    const targetPlayerName = target.slot.playerName || "";
    if (!sourcePlayerName) {
      throw new UserError("Source slot is empty.");
    }
    source.slot.playerName = targetPlayerName;
    target.slot.playerName = sourcePlayerName;
    event.hasUnpublishedChanges = true;
    event.voteChangedDraftedMemberIds = [];
    event.updatedAt = new Date().toISOString();
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function publishDesertStormEvent(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status === "completed") {
      throw new UserError("Completed Desert Storm events cannot be published again.");
    }
    const isRepublish = Boolean(event.publishedTaskForces);
    event.publishedTaskForces = clone(event.draftTaskForces);
    event.publishedAt = new Date().toISOString();
    event.version = Number(event.version || 1) + 1;
    event.status = "published";
    event.hasUnpublishedChanges = false;
    event.voteChangedDraftedMemberIds = [];
    event.updatedAt = event.publishedAt;
    queueExpoPushMessages(buildDesertStormAssignmentsPublishedMessages(alliance, event, isRepublish));
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function beginDesertStormEditing(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status === "completed") {
      throw new UserError("Completed Desert Storm events cannot be edited.");
    }
    if (!event.publishedTaskForces) {
      throw new UserError("Publish teams before editing them.");
    }
    if (!event.hasUnpublishedChanges) {
      event.draftTaskForces = clone(event.publishedTaskForces);
    }
    event.updatedAt = new Date().toISOString();
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function saveDesertStormEventResults(allianceId, eventId, player, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    const normalizeOutcome = (value) => value === "win" || value === "loss" ? value : "pending";
    event.result.taskForceA.outcome = normalizeOutcome(payload?.taskForceA?.outcome);
    event.result.taskForceA.notes = String(payload?.taskForceA?.notes || "");
    event.result.taskForceB.outcome = normalizeOutcome(payload?.taskForceB?.outcome);
    event.result.taskForceB.notes = String(payload?.taskForceB?.notes || "");
    event.closedAt = new Date().toISOString();
    event.endedAt = event.closedAt;
    event.status = "completed";
    event.hasUnpublishedChanges = false;
    event.updatedAt = event.closedAt;
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function archiveDesertStormEvent(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    const event = findDesertStormEvent(alliance, eventId);
    if (!event) throw new UserError("Desert Storm event not found.");
    if (event.status !== "completed") {
      throw new UserError("Only completed Desert Storm events can be archived.");
    }
    event.archivedAt = new Date().toISOString();
    event.updatedAt = event.archivedAt;
    recalculateDesertStormStats(alliance);
    commit();
    return publicDesertStormEvent(event, alliance, player.id, true);
  }

  function hardDeleteDesertStormEvent(allianceId, eventId, player) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) throw new UserError("Alliance not found.");
    alliance.desertStormEvents = Array.isArray(alliance.desertStormEvents) ? alliance.desertStormEvents : [];
    const index = alliance.desertStormEvents.findIndex((entry) => entry.id === eventId);
    if (index === -1) throw new UserError("Desert Storm event not found.");
    const event = alliance.desertStormEvents[index];
    if (event.status !== "completed") {
      throw new UserError("Only completed Desert Storm events can be permanently deleted.");
    }
    alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries : [];
    alliance.calendarEntries = alliance.calendarEntries.filter((entry) => entry.id !== event.calendarEventId && entry.linkedEventId !== event.id);
    alliance.desertStormEvents.splice(index, 1);
    recalculateDesertStormStats(alliance);
    commit();
    return {
      ok: true,
      deletedEventId: event.id
    };
  }

  function lockInDesertStormLayout(allianceId, player, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const now = new Date().toISOString();
    const dateLabel = now.slice(0, 10);
    const layout = normalizeDesertStormLayout({
      title: payload.title || `Desert Storm ${dateLabel}`,
      lockedInAt: now,
      lockedByPlayerId: player.id,
      lockedByName: player.name,
      result: payload.result || "pending",
      notes: payload.notes || "",
      taskForces: alliance.taskForces
    });
    alliance.desertStormLayouts = Array.isArray(alliance.desertStormLayouts) ? alliance.desertStormLayouts : [];
    alliance.desertStormLayouts.unshift(layout);
    alliance.desertStormSetupLocked = true;
    recalculateDesertStormStats(alliance);
    commit();
    return clone(layout);
  }

  function updateDesertStormLayoutResult(allianceId, layoutId, result, notes = undefined) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const layout = (alliance.desertStormLayouts || []).find((entry) => entry.id === layoutId);
    if (!layout) {
      throw new UserError("Desert Storm layout not found.");
    }
    if (!["pending", "win", "loss"].includes(result)) {
      throw new UserError("result must be pending, win, or loss.");
    }
    layout.result = result;
    if (notes !== undefined) {
      layout.notes = String(notes || "");
    }
    commit();
    return clone(layout);
  }

  function createVote(allianceId, player, { title, options }) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const normalizedTitle = String(title || "").trim();
    const normalizedOptions = Array.isArray(options)
      ? options.map((option) => String(option || "").trim()).filter(Boolean)
      : [];
    if (!normalizedTitle) {
      throw new UserError("title is required.");
    }
    if (normalizedOptions.length < 2) {
      throw new UserError("At least two vote options are required.");
    }

    const vote = normalizeVote({
      title: normalizedTitle,
      options: normalizedOptions.map((label) => ({ label })),
      createdByPlayerId: player.id,
      createdByName: player.name,
      status: "open",
      responses: []
    });
    alliance.votes.unshift(vote);
    commit();
    return publicVote(vote, alliance.players, player.id);
  }

  function submitVote(allianceId, voteId, playerId, optionId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const player = alliance.players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new UserError("Player not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new UserError("Vote not found.");
    }
    if (vote.status !== "open") {
      throw new UserError("Vote is closed.");
    }
    const option = vote.options.find((entry) => entry.id === optionId);
    if (!option) {
      throw new UserError("Vote option not found.");
    }

    const existing = vote.responses.find((entry) => entry.playerId === playerId);
    if (existing) {
      existing.optionId = optionId;
      existing.createdAt = new Date().toISOString();
    } else {
      vote.responses.push({
        playerId,
        optionId,
        createdAt: new Date().toISOString()
      });
    }

    commit();
    return publicVote(vote, alliance.players, playerId);
  }

  function closeVote(allianceId, voteId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new UserError("Vote not found.");
    }
    if (vote.status === "archived") {
      throw new UserError("Archived votes cannot be closed.");
    }
    if (vote.status !== "closed") {
      vote.status = "closed";
      vote.closedAt = new Date().toISOString();
    }
    commit();
    return publicVote(vote, alliance.players);
  }

  function archiveVote(allianceId, voteId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new UserError("Vote not found.");
    }
    vote.status = "archived";
    vote.archivedAt = new Date().toISOString();
    commit();
    return publicVote(vote, alliance.players);
  }

  function reopenVote(allianceId, voteId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new UserError("Vote not found.");
    }
    if (vote.status !== "closed") {
      throw new UserError("Only closed votes can be reopened.");
    }
    vote.status = "open";
    vote.closedAt = null;
    commit();
    return publicVote(vote, alliance.players);
  }

  function deleteVote(allianceId, voteId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new UserError("Alliance not found.");
    }
    const voteIndex = alliance.votes.findIndex((entry) => entry.id === voteId);
    if (voteIndex === -1) {
      throw new UserError("Vote not found.");
    }
    const [deletedVote] = alliance.votes.splice(voteIndex, 1);
    commit();
    return { ok: true, deletedVoteId: deletedVote.id };
  }

  function reset() {
    state = createInitialStore();
    commit();
    return clone(state);
  }

  return {
    publicPlayer,
    publicAlliance,
    publicAccount,
    publicJoinRequest,
    getSessionContext,
    createAccountAndSession,
    signInAccount,
    resetMemberPassword,
    changeOwnPassword,
    changeOwnUsername,
    createPasswordResetRequest,
    listPasswordResetRequestsForAlliance,
    dismissPasswordResetRequest,
    getAlliancePreviewByCode,
    listVotesForAlliance,
    requestJoinAllianceForAccount,
    createAllianceForAccount,
    listJoinRequestsForAlliance,
    approveJoinRequest,
    rejectJoinRequest,
    leaveAllianceForAccount,
    updateAllianceCode,
    addMember,
    updateMember,
    removeMember,
    listRemindersForMember,
    createReminder,
    updateReminder,
    deleteReminder,
    updateTaskForceSlot,
    resetTaskForcesForNewTeams,
    listDesertStormEventsForAlliance,
    createDesertStormEvent,
    registerExpoPushToken,
    sendAllianceBroadcastPush,
    getAlliancePushReachability,
    listAlliancePushBroadcastLogs,
    submitDesertStormVote,
    setDesertStormVoteState,
    updateDesertStormEventSlot,
    moveDesertStormEventPlayer,
    publishDesertStormEvent,
    beginDesertStormEditing,
    saveDesertStormEventResults,
    archiveDesertStormEvent,
    hardDeleteDesertStormEvent,
      addFeedbackEntry,
      addFeedbackComment,
      addAllianceDocument,
      deleteAllianceDocument,
      createCalendarEntry,
      updateCalendarEntry,
      deleteCalendarEntry,
      listZombieSiegeEventsForAlliance,
    createZombieSiegeEvent,
    submitZombieSiegeAvailability,
    runZombieSiegePlan,
    publishZombieSiegePlan,
    discardZombieSiegeDraft,
    updateZombieSiegeWaveOneReview,
    endZombieSiegeEvent,
    lockInDesertStormLayout,
    updateDesertStormLayoutResult,
    createVote,
    submitVote,
    closeVote,
    archiveVote,
    reopenVote,
    deleteVote,
    reset
  };
}

module.exports = {
  createStore,
  mergeAllianceStates,
  splitStateByAlliance,
  UserError
};
