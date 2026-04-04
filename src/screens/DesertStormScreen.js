import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";
import { getDesertStormViewState } from "../lib/desertStormHelpers";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

function formatEventDateTime(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "Not scheduled";
  }
  return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function DesertStormScreen({
  section,
  onChangeSection,
  currentUserIsLeader,
  currentUser,
  players,
  events,
  archivedEvents,
  selectedEvent,
  selectedEventId,
  onSelectEvent,
  taskForce,
  moveSource,
  onSelectMoveSource,
  onMovePlayer,
  onPickPlayer,
  onCreateEvent,
  newEventTitle,
  onChangeNewEventTitle,
  canCreateEvent,
  onSubmitVote,
  onOpenVote,
  onCloseVote,
  onReopenVote,
  onPublishTeams,
  onEditTeams,
  onEndEvent,
  onArchiveEvent,
  onDeleteEvent,
  onDeleteArchivedEvent,
  styles,
  helpers
}) {
  const { getDesertStormStatusLabel, getDesertStormVoteOptionLabel } = helpers;
  const [resultDraft, setResultDraft] = useState({ taskForceA: "pending", taskForceB: "pending" });

  useEffect(() => {
    setResultDraft({
      taskForceA: selectedEvent?.result?.taskForceA?.outcome || "pending",
      taskForceB: selectedEvent?.result?.taskForceB?.outcome || "pending"
    });
  }, [selectedEvent?.id, selectedEvent?.result?.taskForceA?.outcome, selectedEvent?.result?.taskForceB?.outcome]);

  const activeEvents = useMemo(
    () => (events || []).filter((event) => event.status !== "completed" && !event.archivedAt),
    [events]
  );
  const historyItems = archivedEvents || [];
  const taskForceSections = currentUserIsLeader
    ? [
        { id: "vote", label: "Vote" },
        { id: "taskForceA", label: "Task Force A" },
        { id: "taskForceB", label: "Task Force B" },
        { id: "history", label: "History" }
      ]
    : [
        { id: "vote", label: "Vote" },
        { id: "taskForceA", label: "Task Force A" },
        { id: "taskForceB", label: "Task Force B" }
      ];
  const memberViewState = useMemo(() => getDesertStormViewState({
    activeEvent: selectedEvent,
    hasVoted: Boolean(selectedEvent?.vote?.didVote),
    isPublished: Boolean(selectedEvent?.publishedAt) || selectedEvent?.status === "published"
  }), [selectedEvent]);
  const selectedOptionId = selectedEvent?.vote?.selectedOptionId || "";
  const currentAssignment = selectedEvent?.myAssignment || null;
  const changedVoteMemberIds = selectedEvent?.voteChangedDraftedMemberIds || [];
  const changedVoteMemberNames = useMemo(() => new Set(
    (players || [])
      .filter((player) => changedVoteMemberIds.includes(player.id))
      .map((player) => player.name)
  ), [players, changedVoteMemberIds]);

  function renderTaskForceBoard(board) {
    if (!board?.squads?.length) {
      return <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No squads yet</Text><Text style={styles.hint}>This task force will populate once leaders build the weekly draft.</Text></AppCard>;
    }
    return <View style={styles.zombieEventList}>{board.squads.map((squad) => <AppCard key={squad.id} style={styles.desertStormTaskForceCard} styles={styles}><View style={styles.cardHeaderRow}><Text style={styles.cardTitle}>{squad.label}</Text><StatusBadge label={`${Number(squad.totalPower || 0).toFixed(2)}M`} tone="info" styles={styles} /></View><View style={styles.zombieEventList}>{squad.slots.map((slot) => {
      const isMoveSource = moveSource && moveSource.taskForceKey === board.key && moveSource.squadId === squad.id && moveSource.slotId === slot.id;
      const hasChangedVote = currentUserIsLeader && Boolean(slot.playerName) && changedVoteMemberNames.has(slot.playerName);
      const isCurrentUserAssignment = Boolean(slot.playerName) && (
        (currentAssignment && currentAssignment.taskForceKey === board.key && currentAssignment.squadId === squad.id && currentAssignment.slotId === slot.id)
        || (currentUser?.name && slot.playerName === currentUser.name)
      );
      return <AppCard key={slot.id} style={[styles.desertStormSlotCard, isMoveSource && styles.cardInfo, isCurrentUserAssignment && styles.desertStormSlotCardAssigned, hasChangedVote && styles.desertStormSlotCardVoteChanged]} styles={styles}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.memberStatLabel}>{slot.label}</Text>
          {hasChangedVote ? <StatusBadge label="Vote Changed" tone="danger" styles={styles} /> : isCurrentUserAssignment ? <StatusBadge label="Your Assignment" tone="success" styles={styles} /> : null}
        </View>
        <Text style={styles.desertStormSlotName}>{slot.playerName || "Open Slot"}</Text>
        <Text style={styles.hint}>{slot.playerName ? `${Number(slot.overallPower || 0).toFixed(2)}M` : "Unassigned"}</Text>
        {currentUserIsLeader && selectedEvent?.status !== "completed" ? <View style={styles.row}>
          <SecondaryButton label={slot.playerName ? (isMoveSource ? "Selected" : "Move") : "Assign"} onPress={() => slot.playerName ? onSelectMoveSource(isMoveSource ? null : { taskForceKey: board.key, squadId: squad.id, slotId: slot.id }) : onPickPlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id, memberType: slot.memberType || "" })} style={styles.half} styles={styles} />
          {moveSource && !isMoveSource ? <PrimaryButton label="Place Here" onPress={() => onMovePlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id })} style={styles.half} styles={styles} /> : slot.playerName ? <PrimaryButton label="Change" onPress={() => onPickPlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id, memberType: slot.memberType || "" })} style={styles.half} tone="blue" styles={styles} /> : <View style={styles.half} />}
        </View> : null}
      </AppCard>;
    })}</View></AppCard>)}</View>;
  }

  function confirmDeleteCurrent(eventId) {
    Alert.alert(
      "Delete Desert Storm event?",
      "This permanently deletes the event, votes, draft assignments, published roster, results, and linked calendar entry.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDeleteEvent(eventId) }
      ]
    );
  }

  function confirmDeleteArchived(eventId) {
    Alert.alert(
      "Delete archived event?",
      "This permanently deletes the archived Desert Storm event and its linked calendar data.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDeleteArchivedEvent ? onDeleteArchivedEvent(eventId) : onDeleteEvent(eventId) }
      ]
    );
  }

  function getTaskForceSectionForAssignment() {
    return selectedEvent?.myAssignment?.taskForceKey === "taskForceB" ? "taskForceB" : "taskForceA";
  }

  function renderMemberStateContent() {
    switch (memberViewState) {
      case "no_active_event":
        return <AppCard style={styles.calendarEmptyCard} styles={styles}>
          <Text style={styles.statusTitle}>No active Desert Storm event right now</Text>
        </AppCard>;
      case "vote_open_not_voted":
        return <AppCard variant="warning" styles={styles}>
          <SectionHeader eyebrow="Vote Open" title="Your availability this week" detail="Respond now. Voting stays open until Wednesday." styles={styles} />
          <View style={styles.zombieEventList}>{(selectedEvent?.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.voteOption, selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => onSubmitVote(selectedEvent.id, option.id)}><View style={styles.voteOptionHeader}><Text style={styles.cardTitle}>{option.label || getDesertStormVoteOptionLabel(option.id)}</Text></View><Text style={styles.hint}>{selectedOptionId === option.id ? "Your current choice" : "Tap to vote"}</Text></Pressable>)}</View>
        </AppCard>;
      case "vote_open_voted_waiting":
        return <AppCard variant="active" styles={styles}>
          <SectionHeader eyebrow="Vote Submitted" title="Waiting for leaders to publish teams" detail="Your vote is saved. Leaders can keep drafting while the vote remains open." styles={styles} />
          <ListRow title="Status" detail="Vote submitted" right={<StatusBadge label="Vote Submitted" tone="success" styles={styles} />} styles={styles} />
          <View style={styles.zombieEventList}>{(selectedEvent?.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.voteOption, selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => onSubmitVote(selectedEvent.id, option.id)}><View style={styles.voteOptionHeader}><Text style={styles.cardTitle}>{option.label || getDesertStormVoteOptionLabel(option.id)}</Text></View><Text style={styles.hint}>{selectedOptionId === option.id ? "Current vote" : "Tap to change vote"}</Text></Pressable>)}</View>
        </AppCard>;
      case "teams_published":
        return <AppCard variant="info" styles={styles}>
          <SectionHeader eyebrow="Teams Published" title="Your assignment" detail={selectedEvent?.myAssignment ? `Assigned to ${selectedEvent.myAssignment.taskForceLabel || selectedEvent.myAssignment.taskForceKey || "task force"}` : "Teams are published for this week."} styles={styles} />
          {selectedEvent?.myAssignment ? <ListRow title="Task Force" detail={selectedEvent.myAssignment.taskForceLabel || selectedEvent.myAssignment.taskForceKey || "Task Force"} right={<StatusBadge label="Published" tone="info" styles={styles} />} styles={styles} /> : <Text style={styles.hint}>You are not currently assigned to a published task force.</Text>}
          <PrimaryButton label="View Task Force" onPress={() => onChangeSection(getTaskForceSectionForAssignment())} styles={styles} />
        </AppCard>;
      default:
        return null;
    }
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow="Desert Storm" title="Weekly operations" detail="The weekly event opens automatically on Saturday, stays open for voting through Wednesday, and locks in published teams for Friday night." styles={styles} />
      <StatusBadge label={selectedEvent ? getDesertStormStatusLabel(selectedEvent.status) : "No Current Event"} tone={selectedEvent?.vote?.status === "open" ? "warning" : selectedEvent?.status === "published" ? "success" : "neutral"} styles={styles} />
    </AppCard>

    <AppCard styles={styles}>
      <SectionHeader eyebrow="Current Week" title="Desert Storm cycle" detail="One weekly event is created automatically. Leaders can still force-open the current week if the sync has not run yet." styles={styles} />
      {activeEvents.length ? <View style={styles.zombieEventList}>{activeEvents.map((event) => <Pressable key={event.id} style={[styles.voteCard, selectedEventId === event.id && styles.cardInfo]} onPress={() => onSelectEvent(event.id)}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.hint}>Week of {event.weekKey}</Text></View><StatusBadge label={getDesertStormStatusLabel(event.status)} tone={event.vote?.status === "open" ? "warning" : event.status === "published" ? "success" : "info"} styles={styles} /></View><Text style={styles.hint}>Vote closes {formatEventDateTime(event.votingCloseAt)}</Text><Text style={styles.hint}>Match starts {formatEventDateTime(event.matchStartsAt)}</Text></Pressable>)}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No weekly event yet</Text><Text style={styles.hint}>Open the current week to start voting and create the Friday match on the calendar.</Text></AppCard>}
      {currentUserIsLeader && canCreateEvent ? <><TextInput value={newEventTitle} onChangeText={onChangeNewEventTitle} style={styles.input} placeholder="Optional weekly event title" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} /><PrimaryButton label="Open Current Week" onPress={onCreateEvent} styles={styles} /></> : null}
    </AppCard>

    {!currentUserIsLeader ? renderMemberStateContent() : null}

    {selectedEvent && currentUserIsLeader ? <>
      <AppCard variant={selectedEvent.vote?.status === "open" ? "warning" : "default"} styles={styles}>
        <SectionHeader eyebrow="Event Summary" title={selectedEvent.title} detail={selectedEvent.myAssignment ? `Published to ${selectedEvent.myAssignment.taskForceLabel || selectedEvent.myAssignment.taskForceKey || "task force"}` : "Members only see the most recent published roster."} styles={styles} />
        <ListRow title="Voting" detail={selectedEvent.vote?.status === "open" ? "Open until Wednesday cutoff" : "Closed"} right={<StatusBadge label={selectedEvent.vote?.didVote ? "Vote Submitted" : selectedEvent.vote?.status === "open" ? "Response Needed" : "Read Only"} tone={selectedEvent.vote?.didVote ? "success" : selectedEvent.vote?.status === "open" ? "warning" : "neutral"} styles={styles} />} styles={styles} />
        <ListRow title="Friday Match" detail={formatEventDateTime(selectedEvent.matchStartsAt)} right={<StatusBadge label="Server Time" tone="info" styles={styles} />} styles={styles} />
        <ListRow title="Draft State" detail={selectedEvent.hasUnpublishedChanges ? "Unpublished changes are waiting for the next publish." : "Draft matches the current published roster."} right={<StatusBadge label={selectedEvent.hasUnpublishedChanges ? "Draft Changed" : "Synced"} tone={selectedEvent.hasUnpublishedChanges ? "warning" : "success"} styles={styles} />} styles={styles} />
        {selectedEvent.publishedAt ? <Text style={styles.hint}>Last published {formatEventDateTime(selectedEvent.publishedAt)}</Text> : null}
      </AppCard>

      <AppCard styles={styles}>
        <View style={styles.calendarModeRow}>{taskForceSections.map((item) => <Pressable key={item.id} style={[styles.secondaryButton, styles.third, section === item.id && styles.modeButtonActive]} onPress={() => onChangeSection(item.id)}><Text style={[styles.secondaryButtonText, section === item.id && styles.modeButtonTextActive]}>{item.label}</Text></Pressable>)}</View>
      </AppCard>

      {section === "vote" ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Vote" title="Weekly availability" detail="Members can vote Play, Substitute, or Not Playing while the weekly vote is open." styles={styles} />
        <View style={styles.zombieEventList}>{(selectedEvent.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.voteOption, selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => selectedEvent.vote?.status === "open" ? onSubmitVote(selectedEvent.id, option.id) : null}><View style={styles.voteOptionHeader}><Text style={styles.cardTitle}>{option.label || getDesertStormVoteOptionLabel(option.id)}</Text><Text style={styles.voteCount}>{option.votes || 0}</Text></View><Text style={styles.hint}>{((selectedEvent.vote?.responses || []).filter((entry) => entry.optionId === option.id).map((entry) => entry.playerName).join(", ")) || "No responses yet"}</Text></Pressable>)}</View>
        <AppCard style={styles.settingsNestedCard} styles={styles}>
          <SectionHeader eyebrow="Leader View" title="Member-by-member status" detail="Draft assignments can happen while voting is still open. Use this list to spot unanswered members and substitutes quickly." styles={styles} />
          <View style={styles.settingsStack}>
            {(buildMemberStatusList(selectedEvent, players) || []).map((entry) => <ListRow key={entry.id} title={entry.name} detail={entry.detail} right={<StatusBadge label={entry.badge} tone={entry.tone} styles={styles} />} styles={styles} />)}
          </View>
        </AppCard>
        <View style={styles.row}>
          <PrimaryButton label="Open Vote" onPress={() => onOpenVote(selectedEvent.id)} style={styles.third} tone="blue" styles={styles} />
          <SecondaryButton label="Close Vote" onPress={() => onCloseVote(selectedEvent.id)} style={styles.third} styles={styles} />
          <SecondaryButton label="Reopen" onPress={() => onReopenVote(selectedEvent.id)} style={styles.third} styles={styles} />
        </View>
      </AppCard> : null}

      {(section === "taskForceA" || section === "taskForceB") ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Leader Draft" title={taskForce?.label || "Task Force"} detail="Leaders edit the draft here even while voting is still open. Members only ever see the latest published version." styles={styles} />
        <View style={styles.row}><StatusBadge label={selectedEvent.vote?.status === "open" ? "Voting Open" : "Voting Closed"} tone={selectedEvent.vote?.status === "open" ? "warning" : "neutral"} styles={styles} />{selectedEvent.hasUnpublishedChanges ? <StatusBadge label="Unpublished Changes" tone="warning" styles={styles} /> : <StatusBadge label="Draft Synced" tone="success" styles={styles} />}</View>
        {changedVoteMemberIds.length ? <AppCard variant="danger" styles={styles}>
          <Text style={styles.cardTitle}>{changedVoteMemberIds.length} drafted member{changedVoteMemberIds.length === 1 ? "" : "s"} changed their vote</Text>
          <Text style={styles.hint}>Affected players are marked in red. This alert clears when you update the draft or re-publish.</Text>
        </AppCard> : null}
        {renderTaskForceBoard(taskForce)}
        <View style={styles.row}><PrimaryButton label={selectedEvent.publishedAt ? "Re-publish Assignments" : "Publish Assignments"} onPress={() => onPublishTeams(selectedEvent.id)} style={styles.half} styles={styles} /><SecondaryButton label="Re-open Draft" onPress={() => onEditTeams(selectedEvent.id)} style={styles.half} styles={styles} /></View>
      </AppCard> : null}

      {section === "history" ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Closeout" title="Results and archived weeks" detail="Record Task Force outcomes after Friday, close the week, and permanently delete completed history when needed." styles={styles} />
        {selectedEvent.status !== "completed" ? <AppCard style={styles.settingsNestedCard} styles={styles}>
          <View style={styles.cardHeaderRow}><Text style={styles.cardTitle}>Record results and close</Text><StatusBadge label={selectedEvent.status === "published" ? "Ready to Close" : "Open Week"} tone={selectedEvent.status === "published" ? "success" : "warning"} styles={styles} /></View>
          <View style={styles.row}>
            <SecondaryButton label={resultDraft.taskForceA === "win" ? "TF A: Win" : "TF A: Set Win"} onPress={() => setResultDraft((current) => ({ ...current, taskForceA: "win" }))} style={styles.half} styles={styles} />
            <SecondaryButton label={resultDraft.taskForceA === "loss" ? "TF A: Loss" : "TF A: Set Loss"} onPress={() => setResultDraft((current) => ({ ...current, taskForceA: "loss" }))} style={styles.half} styles={styles} />
          </View>
          <View style={styles.row}>
            <SecondaryButton label={resultDraft.taskForceB === "win" ? "TF B: Win" : "TF B: Set Win"} onPress={() => setResultDraft((current) => ({ ...current, taskForceB: "win" }))} style={styles.half} styles={styles} />
            <SecondaryButton label={resultDraft.taskForceB === "loss" ? "TF B: Loss" : "TF B: Set Loss"} onPress={() => setResultDraft((current) => ({ ...current, taskForceB: "loss" }))} style={styles.half} styles={styles} />
          </View>
          <PrimaryButton label="Close Weekly Event" onPress={() => onEndEvent(selectedEvent.id, { taskForceA: { outcome: resultDraft.taskForceA }, taskForceB: { outcome: resultDraft.taskForceB } })} disabled={resultDraft.taskForceA === "pending" || resultDraft.taskForceB === "pending"} styles={styles} />
        </AppCard> : null}
        {historyItems.length ? <View style={styles.zombieEventList}>{historyItems.map((event) => <AppCard key={event.id} style={styles.voteCard} styles={styles}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.hint}>Closed {String(event.closedAt || event.archivedAt || "").slice(0, 10)}</Text></View><StatusBadge label={getDesertStormStatusLabel(event.status)} tone="neutral" styles={styles} /></View><Text style={styles.hint}>Task Force A: {event.result?.taskForceA?.outcome || "pending"} | Task Force B: {event.result?.taskForceB?.outcome || "pending"}</Text><View style={styles.row}><SecondaryButton label="Archive Stamp" onPress={() => onArchiveEvent(event.id)} style={styles.half} styles={styles} /><Pressable style={[styles.dangerButton, styles.half]} onPress={() => confirmDeleteArchived(event.id)}><Text style={styles.dangerButtonText}>Delete Permanently</Text></Pressable></View></AppCard>)}</View> : <Text style={styles.hint}>No completed Desert Storm events yet.</Text>}
        {selectedEvent.status === "completed" ? <Pressable style={styles.dangerButton} onPress={() => confirmDeleteCurrent(selectedEvent.id)}><Text style={styles.dangerButtonText}>Delete This Completed Event</Text></Pressable> : null}
      </AppCard> : null}
    </> : null}

    {selectedEvent && !currentUserIsLeader && memberViewState === "teams_published" && (section === "taskForceA" || section === "taskForceB") ? <AppCard styles={styles}>
      <SectionHeader eyebrow="Published Roster" title={taskForce?.label || "Task Force"} detail="This is the latest published Desert Storm roster. Draft edits remain hidden until leaders publish again." styles={styles} />
      {renderTaskForceBoard(taskForce)}
    </AppCard> : null}
  </View>;
}

function buildMemberStatusList(selectedEvent, players) {
  const voteResponses = Array.isArray(selectedEvent?.vote?.responses) ? selectedEvent.vote.responses : [];
  const byPlayerId = new Map(voteResponses.map((entry) => [entry.playerId, entry]));
  return (players || []).map((player) => {
    const response = byPlayerId.get(player.id);
    if (!response) {
      return {
        id: player.id,
        name: player.name,
        detail: `${player.rank} - no response yet`,
        badge: "No Response",
        tone: "neutral"
      };
    }
    const optionId = response.optionId || "";
    const optionLabel = response.optionLabel || (optionId === "play" ? "Play" : optionId === "sub" ? "Substitute" : "Not Playing");
    return {
      id: player.id,
      name: player.name,
      detail: `${player.rank} - ${optionLabel}`,
      badge: optionLabel,
      tone: optionId === "play" ? "success" : optionId === "sub" ? "warning" : "neutral"
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
