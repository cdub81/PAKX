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

export function findCurrentDesertStormEvent(events) {
  return (events || []).find((event) => event.status !== "archived") || null;
}

export function getDesertStormVoteOptionLabel(optionId) {
  if (optionId === "play") return "Play";
  if (optionId === "sub") return "Sub";
  if (optionId === "cant_play") return "Can't Play";
  return optionId;
}

export function getDesertStormStatusLabel(status) {
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
