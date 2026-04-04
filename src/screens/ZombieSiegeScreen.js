import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

export function ZombieSiegeScreen({
  events,
  selectedEvent,
  selectedEventId,
  onSelectEvent,
  currentUserIsLeader,
  newTitle,
  newStartAt,
  newEndAt,
  newThreshold,
  onChangeNewTitle,
  onChangeNewStartAt,
  onChangeNewEndAt,
  onChangeNewThreshold,
  onCreateEvent,
  onSubmitAvailability,
  onRunPlan,
  onPublishPlan,
  onDiscardDraft,
  onSaveWaveOneReview,
  onEndEvent,
  styles
}) {
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [folder, setFolder] = useState("active");
  const activeEvents = useMemo(() => (events || []).filter((event) => event.status !== "archived"), [events]);
  const archivedEvents = useMemo(() => (events || []).filter((event) => event.status === "archived"), [events]);
  const visibleEvents = folder === "archived" ? archivedEvents : activeEvents;
  const availabilityCounts = useMemo(() => (selectedEvent?.availabilityResponses || []).reduce((accumulator, response) => {
    accumulator[response.status] = (accumulator[response.status] || 0) + 1;
    return accumulator;
  }, { online: 0, offline: 0, no_response: 0 }), [selectedEvent]);
  const noResponsePlayers = useMemo(() => (selectedEvent?.availabilityResponses || []).filter((response) => response.status === "no_response"), [selectedEvent]);
  const currentReviewRows = useMemo(() => noResponsePlayers.map((response) => {
    const existing = (selectedEvent?.waveOneReview || []).find((review) => review.playerId === response.playerId);
    return {
      playerId: response.playerId,
      playerName: response.playerName,
      wallStatus: reviewDrafts[response.playerId] || existing?.wallStatus || "unknown"
    };
  }), [noResponsePlayers, reviewDrafts, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) {
      setReviewDrafts({});
      return;
    }
    const nextDrafts = {};
    for (const review of selectedEvent.waveOneReview || []) nextDrafts[review.playerId] = review.wallStatus;
    setReviewDrafts(nextDrafts);
  }, [selectedEvent]);

  function getEventTone(status) {
    if (status === "archived") return "neutral";
    if (status === "published") return "success";
    if (status === "draft") return "warning";
    return "purple";
  }

  function getAvailabilityTone(status) {
    if (status === "online") return "success";
    if (status === "offline") return "danger";
    return "warning";
  }

  function getAvailabilityLabel(status) {
    if (status === "online") return "Online";
    if (status === "offline") return "Offline";
    return "No Response";
  }

  return <View style={styles.section}>
    <AppCard variant="purple" style={styles.zombieHeroCard} styles={styles}>
      <SectionHeader eyebrow="Zombie Siege" title="Operational event board" detail="Track active events, member availability, draft plans, and post-wave review in one tactical surface." styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={`${activeEvents.length} Active`} tone={activeEvents.length ? "purple" : "neutral"} styles={styles} />
        <StatusBadge label={folder === "archived" ? "Archive View" : "Live View"} tone={folder === "archived" ? "neutral" : "info"} styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.zombieSectionCard} styles={styles}>
      <SectionHeader eyebrow="Folders" title="Event folders" detail="Switch between active and archived events without changing event behavior." styles={styles} />
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, folder === "active" && styles.modeButtonActive]} onPress={() => setFolder("active")}><Text style={[styles.secondaryButtonText, folder === "active" && styles.modeButtonTextActive]}>Active Events</Text></Pressable>
        <Pressable style={[styles.secondaryButton, styles.half, folder === "archived" && styles.modeButtonActive]} onPress={() => setFolder("archived")}><Text style={[styles.secondaryButtonText, folder === "archived" && styles.modeButtonTextActive]}>Archived Events</Text></Pressable>
      </View>
    </AppCard>

    <AppCard style={styles.zombieSectionCard} styles={styles}>
      <SectionHeader eyebrow="Events" title={folder === "archived" ? "Archived Zombie Siege Events" : "Active Zombie Siege Events"} detail="Select an event to review status, availability, and plan details." styles={styles} />
      {visibleEvents.length ? <View style={styles.zombieEventList}>
        {visibleEvents.map((event) => <Pressable key={event.id} style={[styles.voteCard, styles.zombieEventCard, selectedEventId === event.id && styles.zombieSelectedCard]} onPress={() => onSelectEvent(event.id)}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.listRowContent}>
              <Text style={styles.cardTitle}>{event.title}</Text>
              <Text style={styles.hint}>{String(event.startAt).slice(0, 16)} to {String(event.endAt).slice(0, 16)}</Text>
            </View>
            <StatusBadge label={String(event.status || "draft").replace(/_/g, " ")} tone={getEventTone(event.status)} styles={styles} />
          </View>
          <Text style={styles.line}>Wave 20 Threshold: {Number(event.wave20Threshold || 0).toFixed(2)}M</Text>
          {event.publishedPlanSummary ? <Text style={styles.line}>Published survivors: {event.publishedPlanSummary.projectedSurvivors}</Text> : null}
        </Pressable>)}
      </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{folder === "archived" ? "No archived events" : "No active events"}</Text><Text style={styles.hint}>{folder === "archived" ? "Archived Zombie Siege events will appear here after leaders end them." : "Create or publish an event to start the operational flow."}</Text></AppCard>}
    </AppCard>

    {currentUserIsLeader && folder === "active" ? <AppCard style={styles.zombieSectionCard} styles={styles}>
      <SectionHeader eyebrow="Create" title="Create Zombie Siege Event" detail="Leaders can create a new event without changing the existing scheduling workflow." styles={styles} />
      <TextInput value={newTitle} onChangeText={onChangeNewTitle} style={styles.input} placeholder="Event title" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} />
      <Text style={styles.hint}>Event start: when Zombie Siege begins for your alliance.</Text>
      <TextInput value={newStartAt} onChangeText={onChangeNewStartAt} style={styles.input} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} />
      <Text style={styles.hint}>Event end: when the event window is over.</Text>
      <TextInput value={newEndAt} onChangeText={onChangeNewEndAt} style={styles.input} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} />
      <Text style={styles.hint}>Wave 20 threshold: total defending squad power needed for a base to pass wave 20.</Text>
      <TextInput value={newThreshold} onChangeText={onChangeNewThreshold} style={styles.input} placeholder="Wave 20 threshold" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} keyboardType="decimal-pad" />
      <PrimaryButton label="Create Event" onPress={onCreateEvent} tone="purple" styles={styles} />
    </AppCard> : null}

    {selectedEvent ? <>
      <AppCard style={styles.zombieSectionCard} styles={styles}>
        <SectionHeader eyebrow="Selected Event" title={selectedEvent.title} detail="Review the live event window, your response state, and the current planning status." styles={styles} />
        <View style={styles.memberStatGrid}>
          <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Status</Text><Text style={styles.memberStatValue}>{String(selectedEvent.status || "draft").replace(/_/g, " ")}</Text></View>
          <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Threshold</Text><Text style={styles.memberStatValue}>{Number(selectedEvent.wave20Threshold || 0).toFixed(2)}M</Text></View>
          <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Your Status</Text><Text style={styles.memberStatValue}>{getAvailabilityLabel(selectedEvent.myAvailabilityStatus || "no_response")}</Text></View>
        </View>
        <ListRow title="Event Window" detail={`${String(selectedEvent.startAt).slice(0, 16)} to ${String(selectedEvent.endAt).slice(0, 16)}`} styles={styles} />
        <ListRow title="Availability" detail={`Your current response: ${getAvailabilityLabel(selectedEvent.myAvailabilityStatus || "no_response")}`} right={<StatusBadge label={getAvailabilityLabel(selectedEvent.myAvailabilityStatus || "no_response")} tone={getAvailabilityTone(selectedEvent.myAvailabilityStatus || "no_response")} styles={styles} />} styles={styles} />
        {selectedEvent.status !== "archived" ? <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half, selectedEvent.myAvailabilityStatus === "online" && styles.modeButtonActive]} onPress={() => onSubmitAvailability(selectedEvent.id, "online")}><Text style={[styles.secondaryButtonText, selectedEvent.myAvailabilityStatus === "online" && styles.modeButtonTextActive]}>I Will Be Online</Text></Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, selectedEvent.myAvailabilityStatus === "offline" && styles.modeButtonActive]} onPress={() => onSubmitAvailability(selectedEvent.id, "offline")}><Text style={[styles.secondaryButtonText, selectedEvent.myAvailabilityStatus === "offline" && styles.modeButtonTextActive]}>I Will Be Offline</Text></Pressable>
        </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>Archived Event</Text><Text style={styles.hint}>This event has ended and moved into the archive.</Text></AppCard>}
      </AppCard>

      {selectedEvent.myAssignment ? <AppCard style={styles.zombieAssignmentCard} styles={styles}>
        <SectionHeader eyebrow="Your Assignment" title="Published assignment" detail="Your current instructions stay visible here when the published plan includes you." styles={styles} />
        {selectedEvent.myAssignment.instructions?.map((instruction, index) => <Text key={`${selectedEvent.myAssignment.playerId}-${index}`} style={styles.line}>- {instruction}</Text>)}
      </AppCard> : null}

      {currentUserIsLeader ? <>
        <AppCard style={styles.zombieSectionCard} styles={styles}>
          <SectionHeader eyebrow="Leader Controls" title="Availability summary" detail="Leaders can review attendance, run the planner, and manage draft or published plans here." styles={styles} />
          <View style={styles.memberStatGrid}>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Online</Text><Text style={styles.memberStatValue}>{availabilityCounts.online || 0}</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Offline</Text><Text style={styles.memberStatValue}>{availabilityCounts.offline || 0}</Text></View>
            <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>No Response</Text><Text style={styles.memberStatValue}>{availabilityCounts.no_response || 0}</Text></View>
          </View>
          {selectedEvent.status !== "archived" ? <View style={styles.zombieActionRow}>
            <PrimaryButton label="Run Planner" onPress={() => onRunPlan(selectedEvent.id)} style={styles.half} tone="purple" styles={styles} />
            {selectedEvent.draftPlan ? <SecondaryButton label="Publish To Members" onPress={() => onPublishPlan(selectedEvent.id)} style={styles.half} styles={styles} /> : <SecondaryButton label="Clear Draft" onPress={() => onDiscardDraft(selectedEvent.id)} style={styles.half} styles={styles} />}
          </View> : null}
        </AppCard>

        {selectedEvent.draftPlan ? <AppCard style={styles.zombiePlanCard} styles={styles}>
          <SectionHeader eyebrow="Draft Review" title="Planner output" detail="Review the draft before publishing it to members." styles={styles} />
          <ListRow title="Projected survivors" detail={String(selectedEvent.draftPlan.projectedSurvivors)} styles={styles} />
          <ListRow title="Online survivors" detail={String(selectedEvent.draftPlan.projectedOnlineSurvivors)} styles={styles} />
          <ListRow title="Offline survivors" detail={String(selectedEvent.draftPlan.projectedOfflineSurvivors)} styles={styles} />
          <ListRow title="Assignment changes" detail={String(selectedEvent.draftPlan.summary?.changedAssignments || 0)} styles={styles} />
          <View style={styles.zombieActionRow}>
            <SecondaryButton label="Publish Draft" onPress={() => onPublishPlan(selectedEvent.id)} style={styles.half} styles={styles} />
            <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onDiscardDraft(selectedEvent.id)}><Text style={styles.dangerButtonText}>Discard Draft</Text></Pressable>
          </View>
        </AppCard> : null}

        {currentReviewRows.length > 0 && selectedEvent.status !== "archived" ? <AppCard style={styles.zombiePlanCard} styles={styles}>
          <SectionHeader eyebrow="Post-Wave-1" title="No-response review" detail="Review no-response players and record whether they had troops on their wall after wave 1." styles={styles} />
          <View style={styles.zombieEventList}>
            {currentReviewRows.map((row) => <AppCard key={row.playerId} style={styles.voteCard} styles={styles}>
              <Text style={styles.cardTitle}>{row.playerName}</Text>
              <View style={styles.row}>
                <Pressable style={[styles.secondaryButton, styles.half, row.wallStatus === "had_wall" && styles.modeButtonActive]} onPress={() => setReviewDrafts((current) => ({ ...current, [row.playerId]: "had_wall" }))}><Text style={[styles.secondaryButtonText, row.wallStatus === "had_wall" && styles.modeButtonTextActive]}>Had Troops On Wall</Text></Pressable>
                <Pressable style={[styles.secondaryButton, styles.half, row.wallStatus === "no_wall" && styles.modeButtonActive]} onPress={() => setReviewDrafts((current) => ({ ...current, [row.playerId]: "no_wall" }))}><Text style={[styles.secondaryButtonText, row.wallStatus === "no_wall" && styles.modeButtonTextActive]}>No Troops On Wall</Text></Pressable>
              </View>
            </AppCard>)}
          </View>
          <PrimaryButton label="Save Wave 1 Review" onPress={() => onSaveWaveOneReview(selectedEvent.id, currentReviewRows)} tone="purple" styles={styles} />
        </AppCard> : null}

        {selectedEvent.publishedPlan ? <AppCard style={styles.zombiePlanCard} styles={styles}>
          <SectionHeader eyebrow="Published Plan" title="Member-facing summary" detail="Published outputs stay visible here for leader review after release." styles={styles} />
          <ListRow title="Projected survivors" detail={String(selectedEvent.publishedPlan.projectedSurvivors)} styles={styles} />
          <ListRow title="Protected players" detail={String(selectedEvent.publishedPlan.summary?.protectedCount || 0)} styles={styles} />
          <ListRow title="Sacrificed donors" detail={String(selectedEvent.publishedPlan.summary?.sacrificedCount || 0)} styles={styles} />
        </AppCard> : null}

        {selectedEvent.status !== "archived" ? <AppCard variant="danger" style={styles.settingsDangerCard} styles={styles}>
          <SectionHeader eyebrow="Danger Zone" title="Event controls" detail="Ending the event is visually distinct, but the underlying event workflow is unchanged." styles={styles} />
          <Pressable style={styles.dangerButton} onPress={() => onEndEvent(selectedEvent.id)}><Text style={styles.dangerButtonText}>Event Has Ended</Text></Pressable>
        </AppCard> : null}
      </> : null}
    </> : null}
  </View>;
}
