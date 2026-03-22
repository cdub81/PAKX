function roundToHundredths(value) {
  return Math.round(value * 100) / 100;
}

export function createPlayerOptions(players) {
  const byName = Object.fromEntries(
    players.map((player) => [player.name, { ...player, overallPower: Number(player.overallPower) || 0 }])
  );

  return Object.values(byName).sort((left, right) => left.name.localeCompare(right.name));
}

function createPlayerMap(players) {
  return Object.fromEntries(players.map((player) => [player.name, player]));
}

function computeDuplicates(taskForces) {
  const counts = {};

  Object.values(taskForces).forEach((taskForce) => {
    taskForce.squads.forEach((squad) => {
      squad.slots.forEach((slot) => {
        if (!slot.playerName) {
          return;
        }

        counts[slot.playerName] = (counts[slot.playerName] || 0) + 1;
      });
    });
  });

  return Object.keys(counts).filter((name) => counts[name] > 1).sort();
}

export function buildTaskForceView(taskForce, label, players, duplicatePlayers) {
  const playerMap = createPlayerMap(players);
  const duplicateSet = new Set(duplicatePlayers);
  const squads = taskForce.squads.map((squad) => {
    const slots = squad.slots.map((slot) => {
      const player = playerMap[slot.playerName];
      const overallPower = player ? player.overallPower : 0;

      return {
        ...slot,
        overallPower,
        isDuplicate: slot.playerName ? duplicateSet.has(slot.playerName) : false
      };
    });

    const totalPower = roundToHundredths(slots.reduce((sum, slot) => sum + slot.overallPower, 0));

    return {
      ...squad,
      slots,
      totalPower
    };
  });

  return {
    ...taskForce,
    key: taskForce.key,
    label,
    squads,
    totalPower: roundToHundredths(squads.reduce((sum, squad) => sum + squad.totalPower, 0))
  };
}

export function buildDashboard(taskForces, players) {
  const duplicatePlayers = computeDuplicates(taskForces);
  const taskForceA = buildTaskForceView(taskForces.taskForceA, "Task Force A", players, duplicatePlayers);
  const taskForceB = buildTaskForceView(taskForces.taskForceB, "Task Force B", players, duplicatePlayers);

  return {
    taskForceA,
    taskForceB,
    duplicatePlayers,
    hasDuplicates: duplicatePlayers.length > 0,
    differenceVsA: roundToHundredths(taskForceB.totalPower - taskForceA.totalPower)
  };
}

export function updateAssignment(taskForces, { taskForceKey, squadId, slotId, playerName }) {
  return {
    ...taskForces,
    [taskForceKey]: {
      ...taskForces[taskForceKey],
      squads: taskForces[taskForceKey].squads.map((squad) => {
        if (squad.id !== squadId) {
          return squad;
        }

        return {
          ...squad,
          slots: squad.slots.map((slot) => {
            if (slot.id !== slotId) {
              return slot;
            }

            return {
              ...slot,
              playerName
            };
          })
        };
      })
    }
  };
}

export function removePlayer(taskForces, playerName) {
  const nextTaskForces = {};

  Object.entries(taskForces).forEach(([key, taskForce]) => {
    nextTaskForces[key] = {
      ...taskForce,
      squads: taskForce.squads.map((squad) => ({
        ...squad,
        slots: squad.slots.map((slot) =>
          slot.playerName === playerName
            ? {
                ...slot,
                playerName: ""
              }
            : slot
        )
      }))
    };
  });

  return nextTaskForces;
}
