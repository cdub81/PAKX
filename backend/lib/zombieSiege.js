function parseDateValue(value, fallback = null) {
  if (!value) {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeResponseStatus(value, voteClosed) {
  if (value === "online" || value === "offline") {
    return value;
  }
  return voteClosed ? "offline" : "no_response";
}

function buildAvailabilityMap(event, players, now = new Date()) {
  const voteClosed = event.status === "archived";
  const responseMap = new Map((event.availabilityResponses || []).map((entry) => [entry.playerId, entry]));
  const waveReviewMap = new Map((event.waveOneReview || []).map((entry) => [entry.playerId, entry]));
  return players.map((player) => {
    const response = responseMap.get(player.id);
    const wallReview = waveReviewMap.get(player.id);
    const availabilityStatus = normalizeResponseStatus(response?.status, voteClosed);
    const wallStatus = wallReview?.wallStatus || "unknown";
    const donorEligible = availabilityStatus === "online";
    const targetTier = availabilityStatus === "online"
      ? 3
      : wallStatus === "no_wall"
        ? 0
        : availabilityStatus === "offline"
          ? 1
          : 0;
    return {
      playerId: player.id,
      playerName: player.name,
      availabilityStatus,
      wallStatus,
      donorEligible,
      targetTier
    };
  });
}

function getPlayerSquads(player) {
  return [
    { squadKey: "squad1", power: Number(player?.squadPowers?.squad1) || 0 },
    { squadKey: "squad2", power: Number(player?.squadPowers?.squad2) || 0 },
    { squadKey: "squad3", power: Number(player?.squadPowers?.squad3) || 0 },
    { squadKey: "squad4", power: Number(player?.squadPowers?.squad4) || 0 }
  ].filter((squad) => squad.power > 0);
}

function countChangedAssignments(previousPlan, nextPlan) {
  const previousAssignments = new Map((previousPlan?.assignments || []).map((assignment) => [assignment.playerId, JSON.stringify(assignment)]));
  return (nextPlan?.assignments || []).filter((assignment) => previousAssignments.get(assignment.playerId) !== JSON.stringify(assignment)).length;
}

function runZombieSiegePlanner({ players, event, previousPublishedPlan = null }) {
  const threshold = Number(event.wave20Threshold) || 0;
  const availability = buildAvailabilityMap(event, players);
  const availabilityMap = new Map(availability.map((entry) => [entry.playerId, entry]));
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const states = players.map((player) => {
    const meta = availabilityMap.get(player.id);
    const squads = getPlayerSquads(player).map((squad) => ({ ...squad, location: "home", targetPlayerId: null }));
    const currentDefense = squads.reduce((sum, squad) => sum + squad.power, 0);
    return {
      playerId: player.id,
      playerName: player.name,
      availabilityStatus: meta.availabilityStatus,
      wallStatus: meta.wallStatus,
      donorEligible: meta.donorEligible,
      targetTier: meta.targetTier,
      squads,
      incoming: [],
      currentDefense
    };
  });
  const stateMap = new Map(states.map((state) => [state.playerId, state]));

  function survives(state) {
    return state.currentDefense >= threshold;
  }

  function overflowPenalty(defenseAfter) {
    return Math.max(0, defenseAfter - threshold) * 0.08;
  }

  function scoreTransfer(donor, squad, receiver) {
    if (receiver.playerId === donor.playerId) return -Infinity;
    if (receiver.incoming.length >= 5) return -Infinity;
    if (receiver.targetTier <= 0) return -Infinity;
    const donorBefore = donor.currentDefense;
    const donorAfter = donor.currentDefense - squad.power;
    const receiverBefore = receiver.currentDefense;
    const receiverAfter = receiver.currentDefense + squad.power;
    const donorSurvivesBefore = donorBefore >= threshold;
    const donorSurvivesAfter = donorAfter >= threshold;
    const receiverSurvivesBefore = receiverBefore >= threshold;
    const receiverSurvivesAfter = receiverAfter >= threshold;
    let score = 0;

    if (!receiverSurvivesBefore && receiverSurvivesAfter) {
      score += receiver.targetTier * 1000;
    } else if (!receiverSurvivesBefore) {
      const improvement = threshold > 0 ? Math.min(1, (receiverAfter - receiverBefore) / threshold) : 0;
      score += receiver.targetTier * 60 * improvement;
    } else {
      score += 8;
    }

    if (donorSurvivesBefore && !donorSurvivesAfter) {
      score -= donor.targetTier >= 3 ? 450 : 140;
    } else if (!donorSurvivesBefore) {
      score += 24;
    } else {
      score += 16;
    }

    if (receiver.targetTier === 1) {
      score -= 35;
    }

    score -= overflowPenalty(receiverAfter);
    score -= donorSurvivesAfter ? overflowPenalty(donorAfter) * 0.2 : 0;
    score -= squad.power * 0.04;

    return score;
  }

  while (true) {
    let best = null;
    for (const donor of states) {
      if (!donor.donorEligible) continue;
      for (const squad of donor.squads) {
        if (squad.location !== "home") continue;
        for (const receiver of states) {
          const score = scoreTransfer(donor, squad, receiver);
          if (!Number.isFinite(score) || score <= 0) continue;
          if (!best || score > best.score) {
            best = { donor, squad, receiver, score };
          }
        }
      }
    }

    if (!best) break;

    best.squad.location = "garrison";
    best.squad.targetPlayerId = best.receiver.playerId;
    best.donor.currentDefense -= best.squad.power;
    best.receiver.currentDefense += best.squad.power;
    best.receiver.incoming.push({
      fromPlayerId: best.donor.playerId,
      fromPlayerName: best.donor.playerName,
      squadKey: best.squad.squadKey,
      power: best.squad.power
    });
  }

  const assignments = states.map((state) => {
    const homeSquads = state.squads.filter((squad) => squad.location === "home");
    const outgoingGarrisons = state.squads
      .filter((squad) => squad.location === "garrison")
      .map((squad) => ({
        squadKey: squad.squadKey,
        power: squad.power,
        targetPlayerId: squad.targetPlayerId,
        targetPlayerName: stateMap.get(squad.targetPlayerId)?.playerName || ""
      }));
    const projectedDefense = Number(state.currentDefense.toFixed(2));
    const survivesEvent = projectedDefense >= threshold;
    let role = "low_priority";
    if (outgoingGarrisons.length && !survivesEvent) {
      role = "sacrificed";
    } else if (outgoingGarrisons.length) {
      role = "donor";
    } else if (survivesEvent) {
      role = "protected";
    }
    return {
      playerId: state.playerId,
      playerName: state.playerName,
      availabilityStatus: state.availabilityStatus,
      wallStatus: state.wallStatus,
      projectedDefense,
      survives: survivesEvent,
      role,
      keepHomeSquads: homeSquads.map((squad) => ({ squadKey: squad.squadKey, power: squad.power })),
      outgoingGarrisons,
      incomingGarrisons: state.incoming
    };
  }).sort((a, b) => Number(b.survives) - Number(a.survives) || a.playerName.localeCompare(b.playerName));

  const projectedSurvivors = assignments.filter((assignment) => assignment.survives).length;
  const projectedOnlineSurvivors = assignments.filter((assignment) => assignment.survives && assignment.availabilityStatus === "online").length;
  const projectedOfflineSurvivors = assignments.filter((assignment) => assignment.survives && assignment.availabilityStatus !== "online").length;

  return {
    threshold,
    projectedSurvivors,
    projectedOnlineSurvivors,
    projectedOfflineSurvivors,
    summary: {
      donorCount: assignments.filter((assignment) => assignment.outgoingGarrisons.length > 0).length,
      protectedCount: assignments.filter((assignment) => assignment.survives).length,
      sacrificedCount: assignments.filter((assignment) => assignment.role === "sacrificed").length,
      noResponseCount: assignments.filter((assignment) => assignment.availabilityStatus === "no_response").length,
      changedAssignments: countChangedAssignments(previousPublishedPlan, { assignments })
    },
    assignments
  };
}

module.exports = {
  buildAvailabilityMap,
  runZombieSiegePlanner
};
