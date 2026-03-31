import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

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
  currentUser,
  currentUserIsLeader,
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
  const taskForceSections = [
    { id: "vote", label: "Vote" },
    { id: "taskForceA", label: "Task Force A" },
    { id: "taskForceB", label: "Task Force B" },
    { id: "history", label: "History" }
  ];
  const canVote = selectedEvent?.vote?.status === "open" && selectedEvent?.status !== "completed";
  const selectedOptionId = selectedEvent?.vote?.selectedOptionId || "";

  function renderTaskForceBoard(board) {
    if (!board?.squads?.length) {
      return <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No squads yet</Text><Text style={styles.hint}>This task force will populate once leaders build the weekly draft.</Text></AppCard>;
    }
    return <View style={styles.zombieEventList}>{board.squads.map((squad) => <AppCard key={squad.id} style={styles.desertStormTaskForceCard} styles={styles}><View style={styles.cardHeaderRow}><Text style={styles.cardTitle}>{squad.label}</Text><StatusBadge label={`${Number(squad.totalPower || 0).toFixed(2)}M`} tone="info" styles={styles} /></View><View style={styles.zombieEventList}>{squad.slots.map((slot) => {
      const isMoveSource = moveSource && moveSource.taskForceKey === board.key && moveSource.squadId === squad.id && moveSource.slotId === slot.id;
      return <AppCard key={slot.id} style={[styles.desertStormSlotCard, isMoveSource && styles.cardInfo]} styles={styles}>
        <Text style={styles.memberStatLabel}>{slot.label}</Text>
        <Text style={styles.desertStormSlotName}>{slot.playerName || "Open Slot"}</Text>
        <Text style={styles.hint}>{slot.playerName ? `${Number(slot.overallPower || 0).toFixed(2)}M` : "Unassigned"}</Text>
        {currentUserIsLeader && selectedEvent?.status !== "completed" ? <View style={styles.row}>
          <SecondaryButton label={slot.playerName ? (isMoveSource ? "Selected" : "Move") : "Assign"} onPress={() => slot.playerName ? onSelectMoveSource(isMoveSource ? null : { taskForceKey: board.key, squadId: squad.id, slotId: slot.id }) : onPickPlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id, memberType: slot.memberType || "" })} style={styles.half} styles={styles} />
          {moveSource && !isMoveSource ? <PrimaryButton label="Place Here" onPress={() => onMovePlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id })} style={styles.half} styles={styles} /> : slot.playerName ? <PrimaryButton label="Change" onPress={() => onPickPlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id, memberType: slot.memberType || "" })} style={styles.half} tone="blue" styles={styles} /> : <View style={styles.half} />}
        </View> : null}
      </AppCard>;
    })}</View></AppCard>)}</View>;
  }

  function confirmDelete(eventId) {
    Alert.alert(
      "Delete Desert Storm event?",
      "This permanently deletes the event, votes, draft assignments, published roster, results, and linked calendar entry.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => onDeleteEvent(eventId) }
      ]
    );
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow="Desert Storm" title="Weekly operations" detail="The weekly event opens automatically on Saturday, stays open for voting through Wednesday, and locks in published teams for Friday night." styles={styles} />
      <StatusBadge label={selectedEvent ? getDesertStormStatusLabel(selectedEvent.status) : "No Current Event"} tone={selectedEvent?.vote?.status === "open" ? "warning" : selectedEvent?.status === "published" ? "success" : "neutral"} styles={styles} />
    </AppCard>

    {canVote ? <AppCard variant="warning" styles={styles}>
      <SectionHeader eyebrow="Vote Open" title="Your availability this week" detail="Respond now — voting closes Wednesday at midnight server time." styles={styles} />
      <View style={styles.zombieEventList}>{(selectedEvent.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.voteOption, selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => onSubmitVote(selectedEvent.id, option.id)}><View style={styles.voteOptionHeader}><Text style={styles.cardTitle}>{option.label || getDesertStormVoteOptionLabel(option.id)}</Text><Text style={styles.voteCount}>{option.votes || 0}</Text></View><Text style={styles.hint}>{selectedOptionId === option.id ? "Your current choice" : "Tap to vote"}</Text></Pressable>)}</View>
    </AppCard> : null}

    <AppCard styles={styles}>
      <SectionHeader eyebrow="Current Week" title="Desert Storm cycle" detail="One weekly event is created automatically. Leaders can still force-open the current week if the sync has not run yet." styles={styles} />
      {activeEvents.length ? <View style={styles.zombieEventList}>{activeEvents.map((event) => <Pressable key={event.id} style={[styles.voteCard, selectedEventId === event.id && styles.cardInfo]} onPress={() => onSelectEvent(event.id)}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.hint}>Week of {event.weekKey}</Text></View><StatusBadge label={getDesertStormStatusLabel(event.status)} tone={event.vote?.status === "open" ? "warning" : event.status === "published" ? "success" : "info"} styles={styles} /></View><Text style={styles.hint}>Vote closes {formatEventDateTime(event.votingCloseAt)}</Text><Text style={styles.hint}>Match starts {formatEventDateTime(event.matchStartsAt)}</Text></Pressable>)}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No weekly event yet</Text><Text style={styles.hint}>Open the current week to start voting and create the Friday match on the calendar.</Text></AppCard>}
      {currentUserIsLeader && canCreateEvent ? <><TextInput value={newEventTitle} onChangeText={onChangeNewEventTitle} style={styles.input} placeholder="Optional weekly event title" /><PrimaryButton label="Open Current Week" onPress={onCreateEvent} styles={styles} /></> : null}
    </AppCard>

    {selectedEvent ? <>
      <AppCard variant={selectedEvent.vote?.status === "open" ? "warning" : currentUser?.id && selectedEvent.myAssignment ? "active" : "default"} styles={styles}>
        <SectionHeader eyebrow="Event Summary" title={selectedEvent.title} detail={selectedEvent.myAssignment ? `Published to ${selectedEvent.myAssignment.taskForceLabel || selectedEvent.myAssignment.taskForceKey || "task force"}` : "Members only see the most recent published roster."} styles={styles} />
        <ListRow title="Voting" detail={selectedEvent.vote?.status === "open" ? "Open until Wednesday cutoff" : "Closed"} right={<StatusBadge label={selectedEvent.vote?.didVote ? "Vote Submitted" : selectedEvent.vote?.status === "open" ? "Response Needed" : "Read Only"} tone={selectedEvent.vote?.didVote ? "success" : selectedEvent.vote?.status === "open" ? "warning" : "neutral"} styles={styles} />} styles={styles} />
        <ListRow title="Friday Match" detail={formatEventDateTime(selectedEvent.matchStartsAt)} right={<StatusBadge label="Server Time" tone="info" styles={styles} />} styles={styles} />
        {currentUserIsLeader ? <ListRow title="Draft State" detail={selectedEvent.hasUnpublishedChanges ? "Unpublished changes are waiting for the next publish." : "Draft matches the current published roster."} right={<StatusBadge label={selectedEvent.hasUnpublishedChanges ? "Draft Changed" : "Synced"} tone={selectedEvent.hasUnpublishedChanges ? "warning" : "success"} styles={styles} />} styles={styles} /> : null}
        {currentUserIsLeader && selectedEvent.publishedAt ? <Text style={styles.hint}>Last published {formatEventDateTime(selectedEvent.publishedAt)}</Text> : null}
      </AppCard>

      <AppCard styles={styles}>
        <View style={styles.calendarModeRow}>{taskForceSections.map((item) => <Pressable key={item.id} style={[styles.secondaryButton, styles.third, section === item.id && styles.modeButtonActive]} onPress={() => onChangeSection(item.id)}><Text style={[styles.secondaryButtonText, section === item.id && styles.modeButtonTextActive]}>{item.label}</Text></Pressable>)}</View>
      </AppCard>

      {section === "vote" ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Vote" title="Weekly availability" detail="Members can vote Play, Substitute, or Not Playing while the weekly vote is open." styles={styles} />
        <View style={styles.zombieEventList}>{(selectedEvent.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.voteOption, selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => canVote ? onSubmitVote(selectedEvent.id, option.id) : null}><View style={styles.voteOptionHeader}><Text style={styles.cardTitle}>{option.label || getDesertStormVoteOptionLabel(option.id)}</Text><Text style={styles.voteCount}>{option.votes || 0}</Text></View><Text style={styles.hint}>{currentUserIsLeader ? ((selectedEvent.vote?.responses || []).filter((entry) => entry.optionId === option.id).map((entry) => entry.playerName).join(", ") || "No responses yet") : (selectedOptionId === option.id ? "Your current choice" : canVote ? "Tap to vote" : "Voting closed")}</Text></Pressable>)}</View>
        {currentUserIsLeader ? <AppCard style={styles.settingsNestedCard} styles={styles}>
          <SectionHeader eyebrow="Leader View" title="Member-by-member status" detail="Draft assignments can happen while voting is still open. Use this list to spot unanswered members and substitutes quickly." styles={styles} />
          <View style={styles.settingsStack}>
            {(buildMemberStatusList(selectedEvent, players) || []).map((entry) => <ListRow key={entry.id} title={entry.name} detail={entry.detail} right={<StatusBadge label={entry.badge} tone={entry.tone} styles={styles} />} styles={styles} />)}
          </View>
        </AppCard> : null}
        {currentUserIsLeader ? <View style={styles.row}>
          <PrimaryButton label="Open Vote" onPress={() => onOpenVote(selectedEvent.id)} style={styles.third} tone="blue" styles={styles} />
          <SecondaryButton label="Close Vote" onPress={() => onCloseVote(selectedEvent.id)} style={styles.third} styles={styles} />
          <SecondaryButton label="Reopen" onPress={() => onReopenVote(selectedEvent.id)} style={styles.third} styles={styles} />
        </View> : null}
      </AppCard> : null}

      {(section === "taskForceA" || section === "taskForceB") ? <AppCard styles={styles}>
        <SectionHeader eyebrow={currentUserIsLeader ? "Leader Draft" : "Published Roster"} title={taskForce?.label || "Task Force"} detail={currentUserIsLeader ? "Leaders edit the draft here even while voting is still open. Members only ever see the latest published version." : "This is the latest published assignment. In-progress draft edits stay hidden until leaders publish again."} styles={styles} />
        {currentUserIsLeader ? <View style={styles.row}><StatusBadge label={selectedEvent.vote?.status === "open" ? "Voting Open" : "Voting Closed"} tone={selectedEvent.vote?.status === "open" ? "warning" : "neutral"} styles={styles} />{selectedEvent.hasUnpublishedChanges ? <StatusBadge label="Unpublished Changes" tone="warning" styles={styles} /> : <StatusBadge label="Draft Synced" tone="success" styles={styles} />}</View> : null}
        {renderTaskForceBoard(taskForce)}
        {currentUserIsLeader ? <View style={styles.row}><PrimaryButton label={selectedEvent.publishedAt ? "Re-publish Assignments" : "Publish Assignments"} onPress={() => onPublishTeams(selectedEvent.id)} style={styles.half} styles={styles} /><SecondaryButton label="Re-open Draft" onPress={() => onEditTeams(selectedEvent.id)} style={styles.half} styles={styles} /></View> : null}
      </AppCard> : null}

      {section === "history" ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Closeout" title="Results and archived weeks" detail="Record Task Force outcomes after Friday, close the week, and permanently delete completed history when needed." styles={styles} />
        {currentUserIsLeader && selectedEvent.status !== "completed" ? <AppCard style={styles.settingsNestedCard} styles={styles}>
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
        {historyItems.length ? <View style={styles.zombieEventList}>{historyItems.map((event) => <AppCard key={event.id} style={styles.voteCard} styles={styles}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.hint}>Closed {String(event.closedAt || event.archivedAt || "").slice(0, 10)}</Text></View><StatusBadge label={getDesertStormStatusLabel(event.status)} tone="neutral" styles={styles} /></View><Text style={styles.hint}>Task Force A: {event.result?.taskForceA?.outcome || "pending"} | Task Force B: {event.result?.taskForceB?.outcome || "pending"}</Text>{currentUserIsLeader ? <View style={styles.row}><SecondaryButton label="Archive Stamp" onPress={() => onArchiveEvent(event.id)} style={styles.half} styles={styles} /><Pressable style={[styles.dangerButton, styles.half]} onPress={() => confirmDelete(event.id)}><Text style={styles.dangerButtonText}>Delete Permanently</Text></Pressable></View> : null}</AppCard>)}</View> : <Text style={styles.hint}>No completed Desert Storm events yet.</Text>}
      </AppCard> : null}
    </> : null}
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
        detail: `${player.rank} • no response yet`,
        badge: "No Response",
        tone: "neutral"
      };
    }
    const optionId = response.optionId || "";
    const optionLabel = response.optionLabel || (optionId === "play" ? "Play" : optionId === "sub" ? "Substitute" : "Not Playing");
    return {
      id: player.id,
      name: player.name,
      detail: `${player.rank} • ${optionLabel}`,
      badge: optionLabel,
      tone: optionId === "play" ? "success" : optionId === "sub" ? "warning" : "neutral"
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
