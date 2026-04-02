export function getAssignedPlayerNames(taskForces, currentSelection) {
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

export function getDesertStormViewState({ activeEvent, hasVoted, isPublished }) {
  if (!activeEvent) {
    return "no_active_event";
  }
  if (isPublished) {
    return "teams_published";
  }
  if (hasVoted) {
    return "vote_open_voted_waiting";
  }
  return "vote_open_not_voted";
}

export function findCurrentDesertStormEvent(events) {
  return (events || [])
    .filter((event) => event.status !== "completed" && !event.archivedAt)
    .sort((a, b) => String(b.matchStartsAt || b.createdAt || "").localeCompare(String(a.matchStartsAt || a.createdAt || "")))[0] || null;
}

export function getDesertStormHistoryEvents(events) {
  return (events || [])
    .filter((event) => event.status === "completed" || event.archivedAt)
    .sort((a, b) => String(b.closedAt || b.archivedAt || b.createdAt || "").localeCompare(String(a.closedAt || a.archivedAt || a.createdAt || "")));
}

export function getDesertStormVoteOptionLabel(optionId) {
  if (optionId === "play") return "Play";
  if (optionId === "sub") return "Sub";
  if (optionId === "no" || optionId === "cant_play") return "Not Playing";
  return optionId;
}

export function getDesertStormStatusLabel(status) {
  if (status === "open") return "Open";
  if (status === "published") return "Published";
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return status;
}
