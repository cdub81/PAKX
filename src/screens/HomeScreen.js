import React from "react";
import { Text, TextInput, View } from "react-native";
import { AppCard, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function HomeScreen({
  currentUser,
  account,
  alliance,
  desertStormAssignment,
  desertStormVoteStatus,
  todayCalendarEntries,
  currentZombieSiegeEvent,
  onChangeField,
  onOpenDesertStormVote,
  onOpenZombieSiege,
  showPushNotificationControls,
  showPushNotificationsPrompt,
  notificationSetupInFlight,
  onSetDesertStormVoteNotificationsEnabled,
  onEnablePushNotifications,
  onDismissPushNotificationsPrompt,
  styles,
  t
}) {
  const squadPowers = currentUser?.squadPowers || {};
  const totalSquadPower = Number(currentUser?.totalSquadPower || 0);
  const desertStormTone = desertStormVoteStatus === "needed" ? "warning" : desertStormVoteStatus === "submitted" ? "success" : desertStormAssignment ? "info" : "neutral";
  const desertStormLabel = desertStormVoteStatus === "needed" ? "Response needed" : desertStormVoteStatus === "submitted" ? "Vote submitted" : desertStormAssignment ? "Assigned" : "Idle";

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <View style={styles.profileHeader}>
        <View style={styles.homeHeroContent}>
          <Text style={styles.profileEyebrow}>Home</Text>
          <Text style={styles.title}>{currentUser?.name || account?.displayName || "Member"}</Text>
          <Text style={styles.profileRank}>{alliance?.name} • {currentUser?.rank || "R1"}</Text>
        </View>
        <View style={styles.homeHeroBadgeColumn}>
          <StatusBadge label={currentUser?.rank || "R1"} tone="info" styles={styles} />
          <Text style={styles.homeHeroMeta}>Signed in</Text>
        </View>
      </View>
    </AppCard>

    <AppCard variant={desertStormTone === "warning" ? "warning" : desertStormTone === "success" ? "active" : "info"} onPress={onOpenDesertStormVote || onOpenZombieSiege} styles={styles}>
      <SectionHeader eyebrow="Active Operations" title="Desert Storm" detail={desertStormAssignment ? `Assigned to ${desertStormAssignment.taskForceLabel || desertStormAssignment.taskForceKey || "task force"}` : "No current assignment published."} styles={styles} />
      <StatusBadge label={desertStormLabel} tone={desertStormTone} styles={styles} />
    </AppCard>

    <AppCard styles={styles}>
      <SectionHeader eyebrow="Recent Activity" title="Today" detail="Today’s agenda and current operation context." styles={styles} />
      {todayCalendarEntries?.length ? todayCalendarEntries.slice(0, 4).map((entry) => <View key={entry.occurrenceId || entry.id} style={styles.todayItem}><Text style={styles.todayItemTitle}>{entry.title}</Text><Text style={styles.hint}>{entry.allDay ? "All day" : entry.localDisplayTime || entry.displayTime || "Scheduled"}</Text></View>) : <Text style={styles.hint}>Nothing is scheduled for today.</Text>}
      {currentZombieSiegeEvent ? <Text style={styles.line}>Zombie Siege: {currentZombieSiegeEvent.title}</Text> : null}
    </AppCard>

    <AppCard styles={styles}>
      <SectionHeader eyebrow="Power" title="Personal power" detail="Update your own power values without changing calculation behavior." styles={styles} />
      <View style={styles.memberStatGrid}>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Power</Text><Text style={styles.memberStatValue}>{Number(currentUser?.overallPower || 0).toFixed(2)}M</Text></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Hero Power</Text><Text style={styles.memberStatValue}>{Number(currentUser?.heroPower || 0).toFixed(2)}M</Text></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad Total</Text><Text style={styles.memberStatValue}>{totalSquadPower.toFixed(2)}M</Text></View>
      </View>
      <View style={styles.row}><TextInput value={String(currentUser?.overallPower ?? "")} onChangeText={(value) => onChangeField("overallPower", value)} style={[styles.input, styles.half]} placeholder="Total Power" keyboardType="decimal-pad" /><TextInput value={String(currentUser?.heroPower ?? "")} onChangeText={(value) => onChangeField("heroPower", value)} style={[styles.input, styles.half]} placeholder="Hero Power" keyboardType="decimal-pad" /></View>
      <View style={styles.row}><TextInput value={String(squadPowers.squad1 ?? "")} onChangeText={(value) => onChangeField("squadPowers", { ...squadPowers, squad1: value })} style={[styles.input, styles.half]} placeholder="Squad 1" keyboardType="decimal-pad" /><TextInput value={String(squadPowers.squad2 ?? "")} onChangeText={(value) => onChangeField("squadPowers", { ...squadPowers, squad2: value })} style={[styles.input, styles.half]} placeholder="Squad 2" keyboardType="decimal-pad" /></View>
      <View style={styles.row}><TextInput value={String(squadPowers.squad3 ?? "")} onChangeText={(value) => onChangeField("squadPowers", { ...squadPowers, squad3: value })} style={[styles.input, styles.half]} placeholder="Squad 3" keyboardType="decimal-pad" /><TextInput value={String(squadPowers.squad4 ?? "")} onChangeText={(value) => onChangeField("squadPowers", { ...squadPowers, squad4: value })} style={[styles.input, styles.half]} placeholder="Squad 4" keyboardType="decimal-pad" /></View>
    </AppCard>

    {showPushNotificationControls ? <AppCard styles={styles}>
      <SectionHeader eyebrow="Notifications" title="Desert Storm vote alerts" detail="Control whether vote-open alerts are enabled for your account." styles={styles} />
      <View style={styles.row}>
        <PrimaryButton label="Enable Alerts" onPress={() => onSetDesertStormVoteNotificationsEnabled(true)} style={styles.half} styles={styles} />
        <SecondaryButton label="Disable Alerts" onPress={() => onSetDesertStormVoteNotificationsEnabled(false)} style={styles.half} styles={styles} />
      </View>
      {showPushNotificationsPrompt ? <AppCard style={styles.settingsNestedCard} styles={styles}><Text style={styles.cardTitle}>Enable push notifications</Text><Text style={styles.hint}>Allow device notifications so Desert Storm vote alerts can reach this device.</Text><View style={styles.row}><PrimaryButton label={notificationSetupInFlight ? "Enabling..." : "Enable Notifications"} onPress={onEnablePushNotifications} style={styles.half} disabled={notificationSetupInFlight} tone="blue" styles={styles} /><SecondaryButton label="Later" onPress={onDismissPushNotificationsPrompt} style={styles.half} styles={styles} /></View></AppCard> : null}
    </AppCard> : null}
  </View>;
}
