function trimSlash(value) {
  return value.replace(/\/+$/, "");
}

export function normalizeBaseUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return trimSlash(raw);
  }

  return trimSlash(`http://${raw}`);
}

async function request(baseUrl, path, options = {}) {
  const url = `${normalizeBaseUrl(baseUrl)}${path}`;
  const response = await fetch(url, options);
  const body = await response.json();

  if (!response.ok) {
    const error = new Error(body.error || "Request failed.");
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export function getAlliancePreview(baseUrl, code) {
  return request(baseUrl, `/api/public-alliance?code=${encodeURIComponent(code)}`);
}

export function createAccount(baseUrl, payload) {
  return request(baseUrl, "/api/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export function signIn(baseUrl, payload) {
  return request(baseUrl, "/api/auth/sign-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export function joinAlliance(baseUrl, token, allianceCode) {
  return request(baseUrl, "/api/account/join-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ allianceCode })
  });
}

export function createAlliance(baseUrl, token, payload) {
  return request(baseUrl, "/api/account/create-alliance", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function getJoinRequests(baseUrl, token) {
  return request(baseUrl, "/api/join-requests", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function approveJoinRequest(baseUrl, token, requestId) {
  return request(baseUrl, `/api/join-requests/${encodeURIComponent(requestId)}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function rejectJoinRequest(baseUrl, token, requestId) {
  return request(baseUrl, `/api/join-requests/${encodeURIComponent(requestId)}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function leaveAlliance(baseUrl, token) {
  return request(baseUrl, "/api/account/leave-alliance", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getMe(baseUrl, token) {
  return request(baseUrl, "/api/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function updateAllianceCode(baseUrl, token, code) {
  return request(baseUrl, "/api/alliance/code", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ code })
  });
}

export function addMember(baseUrl, token, payload) {
  return request(baseUrl, "/api/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateMember(baseUrl, token, memberId, payload) {
  return request(baseUrl, `/api/members/${encodeURIComponent(memberId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function removeMember(baseUrl, token, memberId) {
  return request(baseUrl, `/api/members/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function updateTaskForceSlot(baseUrl, token, payload) {
  return request(baseUrl, "/api/task-forces/slot", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function resetTaskForces(baseUrl, token) {
  return request(baseUrl, "/api/task-forces/reset", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function lockInDesertStormLayout(baseUrl, token, payload = {}) {
  return request(baseUrl, "/api/desert-storm/lock-in", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateDesertStormLayoutResult(baseUrl, token, layoutId, payload) {
  return request(baseUrl, `/api/desert-storm-layouts/${encodeURIComponent(layoutId)}/result`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function getDesertStormEvents(baseUrl, token) {
  return request(baseUrl, "/api/desert-storm/events", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createDesertStormEvent(baseUrl, token, payload) {
  return request(baseUrl, "/api/desert-storm/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function submitDesertStormVote(baseUrl, token, eventId, optionId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/vote/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ optionId })
  });
}

export function openDesertStormVote(baseUrl, token, eventId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/vote/open`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function closeDesertStormVote(baseUrl, token, eventId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/vote/close`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function reopenDesertStormVote(baseUrl, token, eventId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/vote/reopen`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function updateDesertStormEventSlot(baseUrl, token, eventId, payload) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/slot`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function moveDesertStormEventPlayer(baseUrl, token, eventId, payload) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/move`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function publishDesertStormEvent(baseUrl, token, eventId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/publish`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function beginDesertStormEditing(baseUrl, token, eventId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/edit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function endDesertStormEvent(baseUrl, token, eventId, payload) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/end`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function archiveDesertStormEvent(baseUrl, token, eventId) {
  return request(baseUrl, `/api/desert-storm/events/${encodeURIComponent(eventId)}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function registerExpoPushToken(baseUrl, token, expoPushToken) {
  return request(baseUrl, "/api/me/expo-push-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ expoPushToken })
  });
}

export function addFeedback(baseUrl, token, message) {
  return request(baseUrl, "/api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
}

export function addFeedbackComment(baseUrl, token, feedbackEntryId, message) {
  return request(baseUrl, `/api/feedback/${encodeURIComponent(feedbackEntryId)}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ message })
  });
}

export function createCalendarEntry(baseUrl, token, payload) {
  return request(baseUrl, "/api/calendar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateCalendarEntry(baseUrl, token, entryId, payload) {
  return request(baseUrl, `/api/calendar/${encodeURIComponent(entryId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function deleteCalendarEntry(baseUrl, token, entryId) {
  return request(baseUrl, `/api/calendar/${encodeURIComponent(entryId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getReminders(baseUrl, token) {
  return request(baseUrl, "/api/reminders", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createReminder(baseUrl, token, payload) {
  return request(baseUrl, "/api/reminders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function updateReminder(baseUrl, token, reminderId, payload) {
  return request(baseUrl, `/api/reminders/${encodeURIComponent(reminderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function deleteReminder(baseUrl, token, reminderId) {
  return request(baseUrl, `/api/reminders/${encodeURIComponent(reminderId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function getZombieSiegeEvents(baseUrl, token) {
  return request(baseUrl, "/api/zombie-siege/events", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createZombieSiegeEvent(baseUrl, token, payload) {
  const normalizeDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  };
  return request(baseUrl, "/api/zombie-siege/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      ...payload,
      startAt: normalizeDateTime(payload?.startAt),
      endAt: normalizeDateTime(payload?.endAt),
      voteClosesAt: normalizeDateTime(payload?.voteClosesAt)
    })
  });
}

export function submitZombieSiegeAvailability(baseUrl, token, eventId, status) {
  return request(baseUrl, `/api/zombie-siege/events/${encodeURIComponent(eventId)}/availability`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
}

export function runZombieSiegePlan(baseUrl, token, eventId) {
  return request(baseUrl, `/api/zombie-siege/events/${encodeURIComponent(eventId)}/run-plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function publishZombieSiegePlan(baseUrl, token, eventId) {
  return request(baseUrl, `/api/zombie-siege/events/${encodeURIComponent(eventId)}/publish-plan`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function discardZombieSiegeDraft(baseUrl, token, eventId) {
  return request(baseUrl, `/api/zombie-siege/events/${encodeURIComponent(eventId)}/discard-draft`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function endZombieSiegeEvent(baseUrl, token, eventId) {
  return request(baseUrl, `/api/zombie-siege/events/${encodeURIComponent(eventId)}/end`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function updateZombieSiegeWaveOneReview(baseUrl, token, eventId, reviews) {
  return request(baseUrl, `/api/zombie-siege/events/${encodeURIComponent(eventId)}/wave-one-review`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ reviews })
  });
}

export function getVotes(baseUrl, token) {
  return request(baseUrl, "/api/votes", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createVote(baseUrl, token, payload) {
  return request(baseUrl, "/api/votes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
}

export function submitVote(baseUrl, token, voteId, optionId) {
  return request(baseUrl, `/api/votes/${encodeURIComponent(voteId)}/respond`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ optionId })
  });
}

export function closeVote(baseUrl, token, voteId) {
  return request(baseUrl, `/api/votes/${encodeURIComponent(voteId)}/close`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function archiveVote(baseUrl, token, voteId) {
  return request(baseUrl, `/api/votes/${encodeURIComponent(voteId)}/archive`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function reopenVote(baseUrl, token, voteId) {
  return request(baseUrl, `/api/votes/${encodeURIComponent(voteId)}/reopen`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function deleteVote(baseUrl, token, voteId) {
  return request(baseUrl, `/api/votes/${encodeURIComponent(voteId)}/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
