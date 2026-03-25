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

export function deleteVote(baseUrl, token, voteId) {
  return request(baseUrl, `/api/votes/${encodeURIComponent(voteId)}/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
