const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const seed = require("../data/seed");

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

function normalizeDesertStormStats(value) {
  return {
    playedCount: Number(value?.playedCount) || 0,
    missedCount: Number(value?.missedCount) || 0
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

function normalizeFeedbackEntry(value) {
  return {
    id: value.id || crypto.randomUUID(),
    message: String(value.message || "").trim(),
    createdAt: value.createdAt || new Date().toISOString(),
    createdByPlayerId: value.createdByPlayerId || "",
    createdByName: value.createdByName || ""
  };
}

function normalizeCalendarEntry(value) {
  return {
    id: value.id || crypto.randomUUID(),
    title: String(value.title || "").trim(),
    description: String(value.description || "").trim(),
    startsAt: value.startsAt || new Date().toISOString(),
    endAt: value.endAt || null,
    createdAt: value.createdAt || new Date().toISOString(),
    createdByPlayerId: value.createdByPlayerId || "",
    createdByName: value.createdByName || "",
    leaderNotes: String(value.leaderNotes || "").trim(),
    leaderOnly: Boolean(value.leaderOnly)
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

function recalculateDesertStormStats(alliance) {
  const totalLockedLayouts = Array.isArray(alliance.desertStormLayouts) ? alliance.desertStormLayouts.length : 0;
  alliance.players.forEach((player) => {
    const appearances = buildDesertStormAppearances(player, alliance.desertStormLayouts);
    player.desertStormStats = {
      playedCount: appearances.length,
      missedCount: Math.max(0, totalLockedLayouts - appearances.length)
    };
  });
}

function createPlayer(name, rank, overallPower) {
  return {
    id: crypto.randomUUID(),
    name,
    rank,
    overallPower,
    squadPowers: normalizeSquadPowers(),
    desertStormStats: normalizeDesertStormStats()
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
    password,
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
      squadPowers: normalizeSquadPowers(player.squadPowers),
      desertStormStats: normalizeDesertStormStats(player.desertStormStats)
    })),
    taskForces: alliance.taskForces,
    desertStormSetupLocked: Boolean(alliance.desertStormSetupLocked),
    votes: Array.isArray(alliance.votes) ? alliance.votes.map(normalizeVote) : [],
    desertStormLayouts: Array.isArray(alliance.desertStormLayouts) ? alliance.desertStormLayouts.map(normalizeDesertStormLayout) : [],
    feedbackEntries: Array.isArray(alliance.feedbackEntries) ? alliance.feedbackEntries.map(normalizeFeedbackEntry) : [],
    calendarEntries: Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries.map(normalizeCalendarEntry) : []
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
            password: "password",
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
    joinRequests: loaded.joinRequests || []
  };
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
      const snapshot = clone(state);
      persistQueue = persistQueue
        .then(() => config.onPersist(snapshot))
        .catch((error) => {
          console.error("Failed to persist remote state:", error);
        });
    }
  }

  function publicPlayer(player, layouts = []) {
    const squadPowers = normalizeSquadPowers(player.squadPowers);
    return {
      id: player.id,
      name: player.name,
      rank: player.rank,
      overallPower: player.overallPower,
      squadPowers,
      totalSquadPower: totalSquadPower(squadPowers),
      desertStormStats: normalizeDesertStormStats(player.desertStormStats),
      desertStormAppearances: buildDesertStormAppearances(player, layouts)
    };
  }

  function publicCalendarEntry(entry, viewerIsLeader = false) {
    return {
      id: entry.id,
      title: entry.title,
      description: entry.description,
      startsAt: entry.startsAt,
      endAt: entry.endAt,
      createdAt: entry.createdAt,
      createdByPlayerId: entry.createdByPlayerId,
      createdByName: entry.createdByName,
      leaderOnly: Boolean(entry.leaderOnly),
      leaderNotes: viewerIsLeader ? String(entry.leaderNotes || "") : ""
    };
  }

  function publicAlliance(alliance, viewerPlayerId = "") {
    if (!alliance) {
      return null;
    }

    const viewer = alliance.players.find((player) => player.id === viewerPlayerId);
    const viewerIsLeader = Boolean(viewer && (viewer.rank === "R4" || viewer.rank === "R5"));
    return {
      id: alliance.id,
      name: alliance.name,
      code: alliance.code,
      players: alliance.players.map((player) => publicPlayer(player, alliance.desertStormLayouts)),
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
        createdByName: entry.createdByName
      })),
      calendarEntries: (alliance.calendarEntries || [])
        .filter((entry) => viewerIsLeader || !entry.leaderOnly)
        .map((entry) => publicCalendarEntry(entry, viewerIsLeader))
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

  function findAllianceByCode(code) {
    return state.alliances.find((alliance) => alliance.code === String(code).trim().toUpperCase());
  }

  function findAllianceById(id) {
    return state.alliances.find((alliance) => alliance.id === id);
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

  function getSessionContext(token) {
    const session = findSession(token);
    if (!session) {
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
      throw new Error("username and password are required.");
    }
    if (findAccountByUsername(payload.username)) {
      throw new Error("Username already exists.");
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
    if (!account || account.password !== password) {
      throw new Error("Invalid username or password.");
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

  function getAlliancePreviewByCode(code) {
    const alliance = findAllianceByCode(code);
    if (!alliance) {
      throw new Error("Alliance code not found.");
    }
    return {
      id: alliance.id,
      name: alliance.name,
      code: alliance.code,
      players: alliance.players.map(publicPlayer)
    };
  }

  function listVotesForAlliance(allianceId, viewerPlayerId = "") {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    return alliance.votes.map((vote) => publicVote(vote, alliance.players, viewerPlayerId));
  }

  function requestJoinAllianceForAccount(accountId, allianceCode) {
    const account = state.accounts.find((entry) => entry.id === accountId);
    if (!account) {
      throw new Error("Account not found.");
    }
    if (account.allianceId) {
      throw new Error("Account is already linked to an alliance.");
    }
    if (findPendingJoinRequestForAccount(account.id)) {
      throw new Error("This account already has a pending join request.");
    }

    const alliance = findAllianceByCode(allianceCode);
    if (!alliance) {
      throw new Error("Alliance code not found.");
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
      throw new Error("Join request not found.");
    }
    const account = state.accounts.find((entry) => entry.id === joinRequest.accountId);
    const alliance = findAllianceById(allianceId);
    if (!account || !alliance) {
      throw new Error("Join request is invalid.");
    }
    if (account.allianceId) {
      throw new Error("Account is already linked to an alliance.");
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
      throw new Error("Join request not found.");
    }
    joinRequest.status = "rejected";
    commit();
    return publicJoinRequest(joinRequest);
  }

  function leaveAllianceForAccount(accountId) {
    const account = state.accounts.find((entry) => entry.id === accountId);
    if (!account) {
      throw new Error("Account not found.");
    }
    if (!account.allianceId || !account.playerId) {
      throw new Error("Account is not linked to an alliance.");
    }

    const alliance = findAllianceById(account.allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }

    const player = alliance.players.find((entry) => entry.id === account.playerId);
    if (!player) {
      throw new Error("Player not found.");
    }

    if (player.rank === "R5" || player.rank === "R4") {
      throw new Error("Leaders cannot leave the alliance from this action.");
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
      throw new Error("Account not found.");
    }
    if (account.allianceId) {
      throw new Error("Account is already linked to an alliance.");
    }
    if (findAllianceByCode(code)) {
      throw new Error("Alliance code already exists.");
    }

    const leader = createPlayer(account.displayName, "R5", 0);
    const alliance = {
      id: `alliance-${crypto.randomUUID()}`,
      name: name.trim(),
      code: String(code).trim().toUpperCase(),
      players: [leader],
      taskForces: {
        taskForceA: clone(seed.alliances[0].taskForces.taskForceA),
        taskForceB: clone(seed.alliances[0].taskForces.taskForceB)
      },
      votes: []
    };

    // clear seeded names in copied template
    Object.values(alliance.taskForces).forEach((taskForce) => {
      (taskForce.squads || []).forEach((squad) => {
        (squad.slots || []).forEach((slot) => {
          slot.playerName = "";
        });
      });
    });

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
      throw new Error("Alliance not found.");
    }
    const normalized = String(code).trim().toUpperCase();
    const conflict = state.alliances.find((entry) => entry.id !== allianceId && entry.code === normalized);
    if (conflict) {
      throw new Error("Alliance code already exists.");
    }
    alliance.code = normalized;
    commit();
    return publicAlliance(alliance);
  }

  function addMember(allianceId, { name, rank, overallPower }) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const member = createPlayer(name, rank, overallPower);
    alliance.players.push(member);
    commit();
    return publicPlayer(member);
  }

  function updateMember(allianceId, memberId, updates) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new Error("Member not found.");
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
    if (updates.squadPowers !== undefined) {
      member.squadPowers = mergeSquadPowers(member.squadPowers, updates.squadPowers);
    }

    const linkedAccount = state.accounts.find((account) => account.playerId === member.id);
    if (linkedAccount && typeof updates.name === "string" && updates.name.trim()) {
      linkedAccount.displayName = member.name;
    }

    commit();
    return publicPlayer(member);
  }

  function removeMember(allianceId, memberId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const member = alliance.players.find((player) => player.id === memberId);
    if (!member) {
      throw new Error("Member not found.");
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

    state.accounts.forEach((account) => {
      if (account.playerId === memberId) {
        account.playerId = null;
        account.allianceId = null;
      }
    });

    commit();
    return publicPlayer(member);
  }

  function updateTaskForceSlot(allianceId, taskForceKey, squadId, slotId, playerName) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    if (alliance.desertStormSetupLocked) {
      throw new Error("Create new teams before editing the Desert Storm setup again.");
    }
    const taskForce = alliance.taskForces[taskForceKey];
    if (!taskForce) {
      throw new Error("Task force not found.");
    }
    const squad = taskForce.squads.find((entry) => entry.id === squadId);
    if (!squad) {
      throw new Error("Squad not found.");
    }
    const slot = squad.slots.find((entry) => entry.id === slotId);
    if (!slot) {
      throw new Error("Slot not found.");
    }
    slot.playerName = playerName || "";
    commit();
    return clone(taskForce);
  }

  function resetTaskForcesForNewTeams(allianceId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
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
      throw new Error("Alliance not found.");
    }
    const normalizedMessage = String(message || "").trim();
    if (!normalizedMessage) {
      throw new Error("message is required.");
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

  function createCalendarEntry(allianceId, player, payload) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const title = String(payload?.title || "").trim();
    const startsAt = String(payload?.startsAt || "").trim();
    if (!title) {
      throw new Error("title is required.");
    }
    if (!startsAt) {
      throw new Error("startsAt is required.");
    }
    alliance.calendarEntries = Array.isArray(alliance.calendarEntries) ? alliance.calendarEntries : [];
    const entry = normalizeCalendarEntry({
      title,
      description: payload.description || "",
      startsAt,
      endAt: payload.endAt || null,
      createdByPlayerId: player.id,
      createdByName: player.name,
      leaderNotes: payload.leaderNotes || "",
      leaderOnly: payload.leaderOnly
    });
    alliance.calendarEntries.unshift(entry);
    commit();
    return clone(entry);
  }

  function deleteCalendarEntry(allianceId, entryId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const index = (alliance.calendarEntries || []).findIndex((entry) => entry.id === entryId);
    if (index === -1) {
      throw new Error("Calendar entry not found.");
    }
    const [deletedEntry] = alliance.calendarEntries.splice(index, 1);
    commit();
    return { ok: true, deletedEntryId: deletedEntry.id };
  }

  function lockInDesertStormLayout(allianceId, player, payload = {}) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
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
      throw new Error("Alliance not found.");
    }
    const layout = (alliance.desertStormLayouts || []).find((entry) => entry.id === layoutId);
    if (!layout) {
      throw new Error("Desert Storm layout not found.");
    }
    if (!["pending", "win", "loss"].includes(result)) {
      throw new Error("result must be pending, win, or loss.");
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
      throw new Error("Alliance not found.");
    }
    const normalizedTitle = String(title || "").trim();
    const normalizedOptions = Array.isArray(options)
      ? options.map((option) => String(option || "").trim()).filter(Boolean)
      : [];
    if (!normalizedTitle) {
      throw new Error("title is required.");
    }
    if (normalizedOptions.length < 2) {
      throw new Error("At least two vote options are required.");
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
      throw new Error("Alliance not found.");
    }
    const player = alliance.players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new Error("Player not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new Error("Vote not found.");
    }
    if (vote.status !== "open") {
      throw new Error("Vote is closed.");
    }
    const option = vote.options.find((entry) => entry.id === optionId);
    if (!option) {
      throw new Error("Vote option not found.");
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
      throw new Error("Alliance not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new Error("Vote not found.");
    }
    if (vote.status === "archived") {
      throw new Error("Archived votes cannot be closed.");
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
      throw new Error("Alliance not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new Error("Vote not found.");
    }
    vote.status = "archived";
    vote.archivedAt = new Date().toISOString();
    commit();
    return publicVote(vote, alliance.players);
  }

  function reopenVote(allianceId, voteId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const vote = alliance.votes.find((entry) => entry.id === voteId);
    if (!vote) {
      throw new Error("Vote not found.");
    }
    if (vote.status !== "closed") {
      throw new Error("Only closed votes can be reopened.");
    }
    vote.status = "open";
    vote.closedAt = null;
    commit();
    return publicVote(vote, alliance.players);
  }

  function deleteVote(allianceId, voteId) {
    const alliance = findAllianceById(allianceId);
    if (!alliance) {
      throw new Error("Alliance not found.");
    }
    const voteIndex = alliance.votes.findIndex((entry) => entry.id === voteId);
    if (voteIndex === -1) {
      throw new Error("Vote not found.");
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
    updateTaskForceSlot,
    resetTaskForcesForNewTeams,
    addFeedbackEntry,
    createCalendarEntry,
    deleteCalendarEntry,
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
  createStore
};
