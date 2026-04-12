const http = require("node:http");
const { URL } = require("node:url");
const { createStore, mergeAllianceStates, splitStateByAlliance, UserError } = require("./lib/store");
const supabaseState = require("./lib/supabaseState");

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const OPENAI_API_KEY = String(process.env.OPENAI_API_KEY || "").trim();
const OPENAI_TRANSLATION_MODEL = String(process.env.OPENAI_TRANSLATION_MODEL || "gpt-4.1-mini").trim();
const OPENAI_BASE_URL = String(process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const CALENDAR_TRANSLATABLE_LANGUAGES = ["en", "ko", "es", "pt"];
let store = null;

async function initializeStore() {
  if (store) {
    return store;
  }

  let initialState = null;
  if (supabaseState.isConfigured()) {
    const rows = await supabaseState.loadAllStates();
    const legacyRow = rows.find((r) => r.id === "primary");
    const allianceRows = rows.filter((r) => r.id !== "primary");

    if (allianceRows.length > 0) {
      // Normal multi-alliance load
      initialState = mergeAllianceStates(allianceRows);
      console.log(`[store] Loaded ${allianceRows.length} alliance row(s) from Supabase.`);
    } else if (legacyRow && legacyRow.state) {
      // One-time migration: old single-blob format → per-alliance rows
      console.log("[store] Migrating legacy single-blob state to per-alliance rows...");
      initialState = legacyRow.state;
      const splits = splitStateByAlliance(initialState);
      await Promise.all(splits.map(({ allianceId, state: allianceState }) =>
        supabaseState.persistAllianceState(allianceId, allianceState)
      ));
      console.log(`[store] Migration complete — wrote ${splits.length} alliance row(s).`);
    }
  }

  store = createStore({
    initialState,
    onPersist: supabaseState.isConfigured()
      ? (allianceId, allianceState) => supabaseState.persistAllianceState(allianceId, allianceState)
      : null
  });

  if (supabaseState.isConfigured() && !initialState) {
    store.reset();
  }

  return store;
}

function isLeader(rank) {
  return rank === "R5" || rank === "R4";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { error: message });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });
    request.on("error", reject);
  });
}

function getToken(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

function getContext(request) {
  const token = getToken(request);
  return token ? store.getSessionContext(token) : null;
}

function requireAuth(request, response) {
  const context = getContext(request);
  if (!context) {
    sendError(response, 401, "Authentication required.");
    return null;
  }
  return context;
}

function requireAllianceMember(request, response) {
  const context = requireAuth(request, response);
  if (!context) {
    return null;
  }
  if (!context.alliance || !context.player) {
    sendError(response, 403, "Account is not linked to an alliance.");
    return null;
  }
  return context;
}

function requireLeader(request, response) {
  const context = requireAllianceMember(request, response);
  if (!context) {
    return null;
  }
  if (!isLeader(context.player.rank)) {
    sendError(response, 403, "Leader permissions required.");
    return null;
  }
  return context;
}

function isCalendarTranslationEnabled() {
  return Boolean(OPENAI_API_KEY && typeof fetch === "function");
}

function normalizeCalendarLanguage(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return CALENDAR_TRANSLATABLE_LANGUAGES.includes(normalized) ? normalized : "en";
}

function getCalendarTranslationTargets(entry, sourceLanguage) {
  const normalizedSourceLanguage = normalizeCalendarLanguage(sourceLanguage || entry?.sourceLanguage);
  const existingTranslations = entry?.translations && typeof entry.translations === "object" ? entry.translations : {};
  return CALENDAR_TRANSLATABLE_LANGUAGES.filter((language) => {
    if (language === normalizedSourceLanguage) {
      return false;
    }
    const translatedEntry = existingTranslations[language];
    return !String(translatedEntry?.title || "").trim() || !String(translatedEntry?.description || "").trim();
  });
}

async function translateCalendarText({ title, description, sourceLanguage, targetLanguage }) {
  const sourceText = String(title || "").trim();
  const sourceDescription = String(description || "").trim();
  const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_TRANSLATION_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You translate game calendar entries. Return valid JSON with exactly two string fields: title and description. Preserve proper nouns like PAKX, Desert Storm, Zombie Siege, MG, Task Force A. Keep formatting simple and do not add commentary."
        },
        {
          role: "user",
          content: `Translate the following calendar entry from ${sourceLanguage} to ${targetLanguage}.\n\nTitle:\n${sourceText}\n\nDescription:\n${sourceDescription}`
        }
      ]
    })
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error?.message || `Translation request failed with status ${response.status}.`);
  }
  const content = body?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Translation provider returned no content.");
  }
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Translation provider returned invalid JSON.");
  }
  return {
    title: String(parsed?.title || "").trim(),
    description: String(parsed?.description || "").trim()
  };
}

async function translateCalendarEntryInBackground(allianceId, entry, sourceLanguage) {
  if (!isCalendarTranslationEnabled()) {
    return;
  }
  const normalizedSourceLanguage = normalizeCalendarLanguage(sourceLanguage || entry?.sourceLanguage);
  const currentVersion = String(entry?.updatedAt || entry?.createdAt || "").trim();
  const targets = getCalendarTranslationTargets(entry, normalizedSourceLanguage);
  if (!targets.length) {
    store.updateCalendarEntryTranslations(allianceId, entry.id, {
      expectedVersion: currentVersion,
      translationStatus: "ready",
      translationUpdatedAt: new Date().toISOString(),
      translationError: "",
      translations: entry.translations || {}
    });
    return;
  }

  console.log("[calendar-translate] starting background translation", {
    entryId: entry.id,
    sourceLanguage: normalizedSourceLanguage,
    targetLanguages: targets
  });

  try {
    const translatedPairs = await Promise.all(targets.map(async (language) => {
      const translated = await translateCalendarText({
        title: entry.title,
        description: entry.description,
        sourceLanguage: normalizedSourceLanguage,
        targetLanguage: language
      });
      return [language, {
        title: translated.title,
        description: translated.description,
        translatedAt: new Date().toISOString()
      }];
    }));

    store.updateCalendarEntryTranslations(allianceId, entry.id, {
      expectedVersion: currentVersion,
      translations: Object.fromEntries(translatedPairs),
      translationStatus: "ready",
      translationUpdatedAt: new Date().toISOString(),
      translationError: ""
    });
    console.log("[calendar-translate] translation finished", { entryId: entry.id, translatedLanguages: targets });
  } catch (error) {
    console.error("[calendar-translate] translation failed", { entryId: entry.id, error: error?.message || String(error) });
    store.updateCalendarEntryTranslations(allianceId, entry.id, {
      expectedVersion: currentVersion,
      translationStatus: "failed",
      translationUpdatedAt: new Date().toISOString(),
      translationError: error?.message || "Translation failed."
    });
  }
}

async function backfillCalendarTranslations(allianceId, entries = []) {
  if (!isCalendarTranslationEnabled()) {
    throw new UserError("Calendar translation provider is not configured.");
  }
  const candidateEntries = Array.isArray(entries)
    ? entries.filter((entry) => String(entry?.title || "").trim() || String(entry?.description || "").trim())
    : [];
  let translatedCount = 0;
  let skippedCount = 0;

  for (const entry of candidateEntries) {
    const targets = getCalendarTranslationTargets(entry, entry?.sourceLanguage);
    if (!targets.length) {
      skippedCount += 1;
      continue;
    }
    await translateCalendarEntryInBackground(allianceId, entry, entry?.sourceLanguage);
    translatedCount += 1;
  }

  console.log("[calendar-translate] backfill complete", {
    allianceId,
    totalEntries: candidateEntries.length,
    translatedCount,
    skippedCount
  });

  return {
    totalEntries: candidateEntries.length,
    translatedCount,
    skippedCount
  };
}

async function handleRequest(request, response) {
  if (!store) {
    sendError(response, 503, "Backend store is still starting.");
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(response, 200, { ok: true });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host}`);
  const { pathname } = url;

  try {
    if (request.method === "GET" && pathname === "/health") {
      sendJson(response, 200, { ok: true, service: "lwadmin-backend" });
      return;
    }

    if (request.method === "POST" && pathname === "/api/accounts") {
      const body = await readJson(request);
      const result = store.createAccountAndSession(body);
      sendJson(response, 201, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/sign-in") {
      const body = await readJson(request);
      const result = store.signInAccount(body);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/change-password") {
      const context = requireAuth(request, response);
      if (!context) return;
      const body = await readJson(request);
      const result = store.changeOwnPassword(context.account.id, body.currentPassword, body.newPassword);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/change-username") {
      const context = requireAuth(request, response);
      if (!context) return;
      const body = await readJson(request);
      const result = store.changeOwnUsername(context.account.id, body.newUsername);
      sendJson(response, 200, result);
      return;
    }

    const resetPasswordMatch = pathname.match(/^\/api\/members\/([^/]+)\/reset-password$/);
    if (resetPasswordMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) return;
      const result = store.resetMemberPassword(context.alliance.id, resetPasswordMatch[1], context.player);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/auth/forgot-password") {
      const body = await readJson(request);
      const result = store.createPasswordResetRequest(body.username);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/api/password-reset-requests") {
      const context = requireLeader(request, response);
      if (!context) return;
      const requests = store.listPasswordResetRequestsForAlliance(context.alliance.id);
      sendJson(response, 200, { requests });
      return;
    }

    const dismissResetMatch = pathname.match(/^\/api\/password-reset-requests\/([^/]+)\/dismiss$/);
    if (dismissResetMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) return;
      const result = store.dismissPasswordResetRequest(context.alliance.id, dismissResetMatch[1]);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "GET" && pathname === "/api/public-alliance") {
      const code = url.searchParams.get("code");
      if (!code) {
        sendError(response, 400, "code is required.");
        return;
      }
      sendJson(response, 200, store.getAlliancePreviewByCode(code));
      return;
    }

    if (request.method === "GET" && pathname === "/api/me") {
      const context = requireAuth(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, {
        account: store.publicAccount(context.account),
        alliance: store.publicAlliance(context.alliance, context.player?.id || ""),
        player: context.player ? store.publicPlayer(context.player, context.alliance?.desertStormLayouts || []) : null,
        joinRequest: context.joinRequest ? store.publicJoinRequest(context.joinRequest) : null
      });
      return;
    }

    if (request.method === "POST" && pathname === "/api/me/expo-push-token") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 200, {
        player: store.registerExpoPushToken(context.alliance.id, context.player, body)
      });
      return;
    }

    if (request.method === "POST" && pathname === "/api/leader-controls/broadcast-push") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.message) {
        sendError(response, 400, "message is required.");
        return;
      }
      sendJson(response, 200, store.sendAllianceBroadcastPush(context.alliance.id, context.player, {
        message: body.message,
        audience: body.audience,
        memberIds: body.memberIds,
        preset: body.preset
      }));
      return;
    }

    if (request.method === "GET" && pathname === "/api/leader-controls/push-history") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, {
        history: store.listAlliancePushBroadcastLogs(context.alliance.id)
      });
      return;
    }

    if (request.method === "GET" && pathname === "/api/leader-controls/push-reachability") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.getAlliancePushReachability(context.alliance.id));
      return;
    }

    if (request.method === "POST" && pathname === "/api/alliance/documents") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 201, {
        document: store.addAllianceDocument(context.alliance.id, context.player, body)
      });
      return;
    }

    if (request.method === "DELETE" && pathname.startsWith("/api/alliance/documents/")) {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const documentId = decodeURIComponent(pathname.slice("/api/alliance/documents/".length));
      sendJson(response, 200, store.deleteAllianceDocument(context.alliance.id, documentId));
      return;
    }

    if (request.method === "POST" && pathname === "/api/account/join-request") {
      const context = requireAuth(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.allianceCode) {
        sendError(response, 400, "allianceCode is required.");
        return;
      }
      const result = store.requestJoinAllianceForAccount(context.account.id, body.allianceCode);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/account/create-alliance") {
      const context = requireAuth(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.name || !body.code) {
        sendError(response, 400, "name and code are required.");
        return;
      }
      const result = store.createAllianceForAccount(context.account.id, body);
      sendJson(response, 201, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/account/leave-alliance") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.leaveAllianceForAccount(context.account.id));
      return;
    }

    if (request.method === "GET" && pathname === "/api/alliance") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.publicAlliance(context.alliance));
      return;
    }

    if (request.method === "PATCH" && pathname === "/api/alliance/code") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.code) {
        sendError(response, 400, "code is required.");
        return;
      }
      sendJson(response, 200, store.updateAllianceCode(context.alliance.id, body.code));
      return;
    }

    if (request.method === "GET" && pathname === "/api/members") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { members: store.publicAlliance(context.alliance).players });
      return;
    }

    if (request.method === "GET" && pathname === "/api/votes") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { votes: store.listVotesForAlliance(context.alliance.id, context.player.id) });
      return;
    }

    if (request.method === "GET" && pathname === "/api/zombie-siege/events") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { events: store.listZombieSiegeEventsForAlliance(context.alliance.id, context.player.id) });
      return;
    }

    if (request.method === "GET" && pathname === "/api/desert-storm/events") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { events: store.listDesertStormEventsForAlliance(context.alliance.id, context.player.id) });
      return;
    }

    if (request.method === "GET" && pathname === "/api/join-requests") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { joinRequests: store.listJoinRequestsForAlliance(context.alliance.id) });
      return;
    }

    if (request.method === "POST" && pathname === "/api/members") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.name) {
        sendError(response, 400, "name is required.");
        return;
      }
      sendJson(response, 201, store.addMember(context.alliance.id, {
        name: body.name,
        rank: body.rank || "R1",
        overallPower: body.overallPower || 0,
        heroPower: body.heroPower || 0
      }));
      return;
    }

    if (request.method === "GET" && pathname === "/api/reminders") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { reminders: store.listRemindersForMember(context.alliance.id, context.player.id) });
      return;
    }

    if (request.method === "POST" && pathname === "/api/reminders") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 201, store.createReminder(context.alliance.id, context.player.id, body));
      return;
    }

    if (request.method === "GET" && pathname === "/api/task-forces") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, context.alliance.taskForces);
      return;
    }

    if (request.method === "POST" && pathname === "/api/feedback") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.message) {
        sendError(response, 400, "message is required.");
        return;
      }
      sendJson(response, 201, store.addFeedbackEntry(context.alliance.id, context.player, body.message));
      return;
    }

    if (request.method === "POST" && /^\/api\/feedback\/[^/]+\/comments$/.test(pathname)) {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const feedbackEntryId = decodeURIComponent(pathname.split("/")[3] || "");
      const body = await readJson(request);
      if (!body.message) {
        sendError(response, 400, "message is required.");
        return;
      }
      sendJson(response, 201, store.addFeedbackComment(context.alliance.id, feedbackEntryId, context.player, body.message));
      return;
    }

    if (request.method === "POST" && pathname === "/api/calendar") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      const translationEnabled = isCalendarTranslationEnabled();
      const payload = {
        ...body,
        sourceLanguage: normalizeCalendarLanguage(body.sourceLanguage),
        translations: {},
        translationStatus: translationEnabled ? "pending" : "disabled",
        translationUpdatedAt: "",
        translationError: ""
      };
      const createdEntry = store.createCalendarEntry(context.alliance.id, context.player, payload);
      sendJson(response, 201, createdEntry);
      if (translationEnabled) {
        void translateCalendarEntryInBackground(context.alliance.id, createdEntry, payload.sourceLanguage);
      }
      return;
    }

    if (request.method === "POST" && pathname === "/api/calendar/backfill-translations") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const result = await backfillCalendarTranslations(context.alliance.id, context.alliance.calendarEntries || []);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && pathname === "/api/zombie-siege/events") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 201, store.createZombieSiegeEvent(context.alliance.id, context.player, body));
      return;
    }

    if (request.method === "POST" && pathname === "/api/desert-storm/events") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 201, store.createDesertStormEvent(context.alliance.id, context.player, body));
      return;
    }

    if (request.method === "POST" && pathname === "/api/votes") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.title || !Array.isArray(body.options)) {
        sendError(response, 400, "title and options are required.");
        return;
      }
      sendJson(response, 201, store.createVote(context.alliance.id, context.player, body));
      return;
    }

    if (request.method === "PATCH" && pathname === "/api/task-forces/slot") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.taskForceKey || !body.squadId || !body.slotId) {
        sendError(response, 400, "taskForceKey, squadId, and slotId are required.");
        return;
      }
      sendJson(response, 200, store.updateTaskForceSlot(context.alliance.id, body.taskForceKey, body.squadId, body.slotId, body.playerName || ""));
      return;
    }

    if (request.method === "POST" && pathname === "/api/task-forces/reset") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, { taskForces: store.resetTaskForcesForNewTeams(context.alliance.id) });
      return;
    }

    if (request.method === "POST" && pathname === "/api/desert-storm/lock-in") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 201, store.lockInDesertStormLayout(context.alliance.id, context.player, body));
      return;
    }

    const memberMatch = pathname.match(/^\/api\/members\/([^/]+)$/);
    if (memberMatch && request.method === "PATCH") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const memberId = memberMatch[1];
      const body = await readJson(request);
      const selfEdit = context.player.id === memberId;
      const leader = isLeader(context.player.rank);
      if (!leader && !selfEdit) {
        sendError(response, 403, "Members can only update themselves.");
        return;
      }
      const updates = {};
      if (leader) {
        if (body.name !== undefined) {
          updates.name = body.name;
        }
        if (body.rank !== undefined) {
          updates.rank = body.rank;
        }
      }
      if (body.overallPower !== undefined) {
        updates.overallPower = body.overallPower;
      }
      if (body.heroPower !== undefined) {
        updates.heroPower = body.heroPower;
      }
      if (body.squadPowers !== undefined) {
        updates.squadPowers = body.squadPowers;
      }
      if (body.desertStormVoteNotificationsEnabled !== undefined) {
        updates.desertStormVoteNotificationsEnabled = body.desertStormVoteNotificationsEnabled;
      }
      if (body.digNotificationsEnabled !== undefined) {
        updates.digNotificationsEnabled = body.digNotificationsEnabled;
      }
      if (body.calendarNotificationsEnabled !== undefined) {
        updates.calendarNotificationsEnabled = body.calendarNotificationsEnabled;
      }
      if (body.hqLevel !== undefined) {
        updates.hqLevel = body.hqLevel;
      }
      sendJson(response, 200, store.updateMember(context.alliance.id, memberId, updates));
      return;
    }

    if (memberMatch && request.method === "DELETE") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const memberId = memberMatch[1];
      if (context.player.id === memberId) {
        sendError(response, 400, "Leaders cannot delete themselves.");
        return;
      }
      sendJson(response, 200, store.removeMember(context.alliance.id, memberId));
      return;
    }

    const joinRequestMatch = pathname.match(/^\/api\/join-requests\/([^/]+)\/(approve|reject)$/);
    if (joinRequestMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const requestId = joinRequestMatch[1];
      const action = joinRequestMatch[2];
      if (action === "approve") {
        sendJson(response, 200, store.approveJoinRequest(context.alliance.id, requestId));
        return;
      }
      sendJson(response, 200, store.rejectJoinRequest(context.alliance.id, requestId));
      return;
    }

    const voteMatch = pathname.match(/^\/api\/votes\/([^/]+)\/respond$/);
    if (voteMatch && request.method === "POST") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.optionId) {
        sendError(response, 400, "optionId is required.");
        return;
      }
      sendJson(response, 200, store.submitVote(context.alliance.id, voteMatch[1], context.player.id, body.optionId));
      return;
    }

    const voteManageMatch = pathname.match(/^\/api\/votes\/([^/]+)\/(close|archive|reopen|delete)$/);
    if (voteManageMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      if (voteManageMatch[2] === "close") {
        sendJson(response, 200, store.closeVote(context.alliance.id, voteManageMatch[1]));
        return;
      }
      if (voteManageMatch[2] === "delete") {
        sendJson(response, 200, store.deleteVote(context.alliance.id, voteManageMatch[1]));
        return;
      }
      if (voteManageMatch[2] === "reopen") {
        sendJson(response, 200, store.reopenVote(context.alliance.id, voteManageMatch[1]));
        return;
      }
      sendJson(response, 200, store.archiveVote(context.alliance.id, voteManageMatch[1]));
      return;
    }

    const zombieAvailabilityMatch = pathname.match(/^\/api\/zombie-siege\/events\/([^/]+)\/availability$/);
    if (zombieAvailabilityMatch && request.method === "POST") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.status) {
        sendError(response, 400, "status is required.");
        return;
      }
      sendJson(response, 200, store.submitZombieSiegeAvailability(context.alliance.id, zombieAvailabilityMatch[1], context.player, body.status));
      return;
    }

    const desertStormVoteRespondMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/vote\/respond$/);
    if (desertStormVoteRespondMatch && request.method === "POST") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.optionId) {
        sendError(response, 400, "optionId is required.");
        return;
      }
      sendJson(response, 200, store.submitDesertStormVote(context.alliance.id, desertStormVoteRespondMatch[1], context.player, body.optionId, body.preferredSquad));
      return;
    }

    const desertStormVoteStateMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/vote\/(open|close|reopen)$/);
    if (desertStormVoteStateMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const nextVoteStatus = desertStormVoteStateMatch[2] === "open" || desertStormVoteStateMatch[2] === "reopen" ? "open" : "closed";
      sendJson(response, 200, store.setDesertStormVoteState(context.alliance.id, desertStormVoteStateMatch[1], context.player, nextVoteStatus));
      return;
    }

    const desertStormSlotMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/slot$/);
    if (desertStormSlotMatch && request.method === "PATCH") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.taskForceKey || !body.squadId || !body.slotId) {
        sendError(response, 400, "taskForceKey, squadId, and slotId are required.");
        return;
      }
      sendJson(response, 200, store.updateDesertStormEventSlot(context.alliance.id, desertStormSlotMatch[1], context.player, body));
      return;
    }

    const desertStormMoveMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/move$/);
    if (desertStormMoveMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 200, store.moveDesertStormEventPlayer(context.alliance.id, desertStormMoveMatch[1], context.player, body));
      return;
    }

    const desertStormAutoGenerateMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/auto-generate$/);
    if (desertStormAutoGenerateMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.autoGenerateDesertStormDraft(context.alliance.id, desertStormAutoGenerateMatch[1], context.player));
      return;
    }

    const desertStormPublishMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/publish$/);
    if (desertStormPublishMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.publishDesertStormEvent(context.alliance.id, desertStormPublishMatch[1], context.player));
      return;
    }

    const desertStormEditMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/edit$/);
    if (desertStormEditMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.beginDesertStormEditing(context.alliance.id, desertStormEditMatch[1], context.player));
      return;
    }

    const desertStormEndMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/end$/);
    if (desertStormEndMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 200, store.saveDesertStormEventResults(context.alliance.id, desertStormEndMatch[1], context.player, body));
      return;
    }

    const desertStormArchiveMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)\/archive$/);
    if (desertStormArchiveMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.archiveDesertStormEvent(context.alliance.id, desertStormArchiveMatch[1], context.player));
      return;
    }

    const desertStormDeleteMatch = pathname.match(/^\/api\/desert-storm\/events\/([^/]+)$/);
    if (desertStormDeleteMatch && request.method === "DELETE") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.hardDeleteDesertStormEvent(context.alliance.id, desertStormDeleteMatch[1], context.player));
      return;
    }

    const zombieRunPlanMatch = pathname.match(/^\/api\/zombie-siege\/events\/([^/]+)\/run-plan$/);
    if (zombieRunPlanMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.runZombieSiegePlan(context.alliance.id, zombieRunPlanMatch[1], context.player));
      return;
    }

    const zombiePublishMatch = pathname.match(/^\/api\/zombie-siege\/events\/([^/]+)\/publish-plan$/);
    if (zombiePublishMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.publishZombieSiegePlan(context.alliance.id, zombiePublishMatch[1], context.player));
      return;
    }

    const zombieDiscardMatch = pathname.match(/^\/api\/zombie-siege\/events\/([^/]+)\/discard-draft$/);
    if (zombieDiscardMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.discardZombieSiegeDraft(context.alliance.id, zombieDiscardMatch[1], context.player));
      return;
    }

    const zombieEndMatch = pathname.match(/^\/api\/zombie-siege\/events\/([^/]+)\/end$/);
    if (zombieEndMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.endZombieSiegeEvent(context.alliance.id, zombieEndMatch[1], context.player));
      return;
    }

    const zombieWaveOneMatch = pathname.match(/^\/api\/zombie-siege\/events\/([^/]+)\/wave-one-review$/);
    if (zombieWaveOneMatch && request.method === "POST") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 200, store.updateZombieSiegeWaveOneReview(context.alliance.id, zombieWaveOneMatch[1], context.player, body.reviews));
      return;
    }

    const desertStormLayoutMatch = pathname.match(/^\/api\/desert-storm-layouts\/([^/]+)\/result$/);
    if (desertStormLayoutMatch && request.method === "PATCH") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      if (!body.result) {
        sendError(response, 400, "result is required.");
        return;
      }
      sendJson(response, 200, store.updateDesertStormLayoutResult(context.alliance.id, desertStormLayoutMatch[1], body.result, body.notes));
      return;
    }

    const calendarEntryMatch = pathname.match(/^\/api\/calendar\/([^/]+)$/);
    if (calendarEntryMatch && request.method === "PATCH") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      const translationEnabled = isCalendarTranslationEnabled();
      const payload = {
        ...body,
        sourceLanguage: normalizeCalendarLanguage(body.sourceLanguage),
        translations: {},
        translationStatus: translationEnabled ? "pending" : "disabled",
        translationUpdatedAt: "",
        translationError: ""
      };
      const updatedEntry = store.updateCalendarEntry(context.alliance.id, calendarEntryMatch[1], context.player, payload);
      sendJson(response, 200, updatedEntry);
      if (translationEnabled) {
        void translateCalendarEntryInBackground(context.alliance.id, updatedEntry, payload.sourceLanguage);
      }
      return;
    }
    if (calendarEntryMatch && request.method === "DELETE") {
      const context = requireLeader(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.deleteCalendarEntry(context.alliance.id, calendarEntryMatch[1]));
      return;
    }

    const reminderMatch = pathname.match(/^\/api\/reminders\/([^/]+)$/);
    if (reminderMatch && request.method === "PATCH") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      const body = await readJson(request);
      sendJson(response, 200, store.updateReminder(context.alliance.id, context.player.id, reminderMatch[1], body));
      return;
    }
    if (reminderMatch && request.method === "DELETE") {
      const context = requireAllianceMember(request, response);
      if (!context) {
        return;
      }
      sendJson(response, 200, store.deleteReminder(context.alliance.id, context.player.id, reminderMatch[1]));
      return;
    }

    if (request.method === "POST" && pathname === "/api/dev/reset") {
      const result = store.reset();
      sendJson(response, 200, { ok: true, alliances: result.alliances.length, accounts: result.accounts.length });
      return;
    }

    sendError(response, 404, "Route not found.");
  } catch (error) {
    if (error instanceof UserError) {
      sendError(response, 400, error.message);
    } else {
      console.error("[server] Unhandled error:", error);
      sendError(response, 500, "An unexpected error occurred.");
    }
  }
}

function createServer() {
  return http.createServer(handleRequest);
}

if (require.main === module) {
  initializeStore()
    .then(() => {
      createServer().listen(PORT, HOST, () => {
        console.log(`LWAdmin backend listening on http://${HOST}:${PORT}`);
        if (supabaseState.isConfigured()) {
          console.log("Supabase persistence enabled.");
        }
      });
    })
    .catch((error) => {
      console.error("Failed to initialize backend store:", error);
      process.exit(1);
    });
}

module.exports = {
  createServer,
  initializeStore,
  isLeader
};
