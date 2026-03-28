const http = require("node:http");
const { URL } = require("node:url");
const { createStore } = require("./lib/store");
const supabaseState = require("./lib/supabaseState");

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || "0.0.0.0";
let store = null;

async function initializeStore() {
  if (store) {
    return store;
  }

  let initialState = null;
  if (supabaseState.isConfigured()) {
    initialState = await supabaseState.loadState();
  }

  store = createStore({
    initialState,
    onPersist: supabaseState.isConfigured() ? (state) => supabaseState.persistState(state) : null
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
      if (!body.expoPushToken) {
        sendError(response, 400, "expoPushToken is required.");
        return;
      }
      sendJson(response, 200, {
        player: store.registerExpoPushToken(context.alliance.id, context.player, body.expoPushToken)
      });
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
      sendJson(response, 201, store.createCalendarEntry(context.alliance.id, context.player, body));
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
      sendJson(response, 200, store.submitDesertStormVote(context.alliance.id, desertStormVoteRespondMatch[1], context.player, body.optionId));
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
      sendJson(response, 200, store.updateCalendarEntry(context.alliance.id, calendarEntryMatch[1], context.player, body));
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
    sendError(response, 400, error.message || "Request failed.");
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
