import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

export function DesertStormScreen({
  section,
  onChangeSection,
  currentUser,
  currentUserIsLeader,
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
  onSubmitVote,
  onOpenVote,
  onCloseVote,
  onReopenVote,
  onPublishTeams,
  onEditTeams,
  onEndEvent,
  onArchiveEvent,
  styles,
  helpers
}) {
  const { getDesertStormStatusLabel, getDesertStormVoteOptionLabel } = helpers;
  const eventOptions = events || [];
  const taskForceSections = [
    { id: "vote", label: "Vote" },
    { id: "taskForceA", label: "Task Force A" },
    { id: "taskForceB", label: "Task Force B" },
    { id: "history", label: "History" }
  ];

  function renderTaskForceBoard(board) {
    if (!board?.squads?.length) {
      return <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No squads yet</Text><Text style={styles.hint}>This task force will populate once leaders build the layout.</Text></AppCard>;
    }
    return <View style={styles.zombieEventList}>{board.squads.map((squad) => <AppCard key={squad.id} style={styles.desertStormTaskForceCard} styles={styles}><View style={styles.cardHeaderRow}><Text style={styles.cardTitle}>{squad.label}</Text><StatusBadge label={`${Number(squad.totalPower || 0).toFixed(2)}M`} tone="info" styles={styles} /></View><View style={styles.zombieEventList}>{squad.slots.map((slot) => {
      const isMoveSource = moveSource && moveSource.taskForceKey === board.key && moveSource.squadId === squad.id && moveSource.slotId === slot.id;
      return <AppCard key={slot.id} style={[styles.desertStormSlotCard, isMoveSource && styles.cardInfo]} styles={styles}>
        <Text style={styles.memberStatLabel}>{slot.label}</Text>
        <Text style={styles.cardTitle}>{slot.playerName || "Open Slot"}</Text>
        <Text style={styles.hint}>{slot.playerName ? `${Number(slot.overallPower || 0).toFixed(2)}M` : "Tap assign to choose a member."}</Text>
        {currentUserIsLeader ? <View style={styles.row}>
          <SecondaryButton label={slot.playerName ? (isMoveSource ? "Selected" : "Move") : "Assign"} onPress={() => slot.playerName ? onSelectMoveSource(isMoveSource ? null : { taskForceKey: board.key, squadId: squad.id, slotId: slot.id }) : onPickPlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id, memberType: slot.memberType || "" })} style={styles.half} styles={styles} />
          {moveSource && !isMoveSource ? <PrimaryButton label="Place Here" onPress={() => onMovePlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id })} style={styles.half} styles={styles} /> : slot.playerName ? <PrimaryButton label="Change" onPress={() => onPickPlayer({ taskForceKey: board.key, squadId: squad.id, slotId: slot.id, memberType: slot.memberType || "" })} style={styles.half} tone="blue" styles={styles} /> : <View style={styles.half} />}
        </View> : null}
      </AppCard>;
    })}</View></AppCard>)}</View>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow="Desert Storm" title="Event control" detail="Review the current event, voting state, and task force layout from a single control surface." styles={styles} />
      <StatusBadge label={selectedEvent ? getDesertStormStatusLabel(selectedEvent.status) : "No Active Event"} tone={selectedEvent?.vote?.status === "open" ? "warning" : selectedEvent?.status === "published" ? "success" : "info"} styles={styles} />
    </AppCard>

    <AppCard styles={styles}>
      <SectionHeader eyebrow="Events" title="Active events" detail="Select a live event or create a new one without changing the event workflow." styles={styles} />
      {eventOptions.length ? <View style={styles.zombieEventList}>{eventOptions.map((event) => <Pressable key={event.id} style={[styles.voteCard, selectedEventId === event.id && styles.cardInfo]} onPress={() => onSelectEvent(event.id)}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.hint}>Created {String(event.createdAt || "").slice(0, 10)}</Text></View><StatusBadge label={getDesertStormStatusLabel(event.status)} tone={event.vote?.status === "open" ? "warning" : event.status === "published" ? "success" : "info"} styles={styles} /></View></Pressable>)}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No active Desert Storm event</Text><Text style={styles.hint}>Create one to open voting and organize task forces.</Text></AppCard>}
      {currentUserIsLeader ? <><TextInput value={newEventTitle} onChangeText={onChangeNewEventTitle} style={styles.input} placeholder="Event title" /><PrimaryButton label="Create Event" onPress={onCreateEvent} styles={styles} /></> : null}
    </AppCard>

    {selectedEvent ? <>
      <AppCard variant={selectedEvent.vote?.status === "open" ? "warning" : currentUser?.id && selectedEvent.myAssignment ? "active" : "default"} styles={styles}>
        <SectionHeader eyebrow="Your Status" title={selectedEvent.title} detail={selectedEvent.myAssignment ? `Assigned to ${selectedEvent.myAssignment.taskForceLabel || selectedEvent.myAssignment.taskForceKey || "task force"}` : "No published assignment yet."} styles={styles} />
        <ListRow title="Vote" detail={selectedEvent.vote?.status === "open" ? "Vote is live" : selectedEvent.vote?.status === "closed" ? "Vote is closed" : "Vote not open"} right={<StatusBadge label={selectedEvent.vote?.didVote ? "Submitted" : selectedEvent.vote?.status === "open" ? "Response Needed" : "Idle"} tone={selectedEvent.vote?.didVote ? "success" : selectedEvent.vote?.status === "open" ? "warning" : "neutral"} styles={styles} />} styles={styles} />
      </AppCard>

      <AppCard styles={styles}>
        <View style={styles.calendarModeRow}>{taskForceSections.map((item) => <Pressable key={item.id} style={[styles.secondaryButton, styles.third, section === item.id && styles.modeButtonActive]} onPress={() => onChangeSection(item.id)}><Text style={[styles.secondaryButtonText, section === item.id && styles.modeButtonTextActive]}>{item.label}</Text></Pressable>)}</View>
      </AppCard>

      {section === "vote" ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Vote" title="Availability voting" detail="Members can respond, and leaders can open, close, or reopen the vote." styles={styles} />
        <View style={styles.zombieEventList}>{(selectedEvent.vote?.options || []).map((option) => <Pressable key={option.id} style={[styles.voteOption, selectedEvent.vote?.selectedOptionId === option.id && styles.voteOptionSelected]} onPress={() => onSubmitVote(selectedEvent.id, option.id)}><View style={styles.voteOptionHeader}><Text style={styles.cardTitle}>{option.label || getDesertStormVoteOptionLabel(option.id)}</Text><Text style={styles.voteCount}>{option.count || 0}</Text></View><Text style={styles.hint}>{(option.responses || []).join(", ") || "No responses yet"}</Text></Pressable>)}</View>
        {currentUserIsLeader ? <View style={styles.row}><PrimaryButton label="Open Vote" onPress={() => onOpenVote(selectedEvent.id)} style={styles.third} tone="blue" styles={styles} /><SecondaryButton label="Close Vote" onPress={() => onCloseVote(selectedEvent.id)} style={styles.third} styles={styles} /><SecondaryButton label="Reopen" onPress={() => onReopenVote(selectedEvent.id)} style={styles.third} styles={styles} /></View> : null}
      </AppCard> : null}

      {(section === "taskForceA" || section === "taskForceB") ? <AppCard styles={styles}>
        <SectionHeader eyebrow="Task Force" title={taskForce?.label || "Task Force"} detail={selectedEvent.status === "published" ? "Members see published teams only. Leaders can edit through the same workflow." : "Draft and published visibility rules are unchanged."} styles={styles} />
        {renderTaskForceBoard(taskForce)}
        {currentUserIsLeader ? <View style={styles.row}><PrimaryButton label="Publish Teams" onPress={() => onPublishTeams(selectedEvent.id)} style={styles.half} styles={styles} /><SecondaryButton label="Edit Teams" onPress={() => onEditTeams(selectedEvent.id)} style={styles.half} styles={styles} /></View> : null}
      </AppCard> : null}

      {section === "history" ? <AppCard styles={styles}>
        <SectionHeader eyebrow="History" title="Archived events" detail="Review completed and archived Desert Storm events." styles={styles} />
        {archivedEvents?.length ? <View style={styles.zombieEventList}>{archivedEvents.map((event) => <AppCard key={event.id} style={styles.voteCard} styles={styles}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{event.title}</Text><Text style={styles.hint}>Archived {String(event.archivedAt || event.endedAt || "").slice(0, 10)}</Text></View><StatusBadge label={getDesertStormStatusLabel(event.status)} tone="neutral" styles={styles} /></View></AppCard>)}</View> : <Text style={styles.hint}>No archived Desert Storm events yet.</Text>}
        {currentUserIsLeader ? <View style={styles.row}><PrimaryButton label="Mark Win" onPress={() => onEndEvent(selectedEvent.id, "win")} style={styles.third} styles={styles} /><Pressable style={[styles.dangerButton, styles.third]} onPress={() => onEndEvent(selectedEvent.id, "loss")}><Text style={styles.dangerButtonText}>Mark Loss</Text></Pressable><SecondaryButton label="Archive" onPress={() => onArchiveEvent(selectedEvent.id)} style={styles.third} styles={styles} /></View> : null}
      </AppCard> : null}
    </> : null}
  </View>;
}
