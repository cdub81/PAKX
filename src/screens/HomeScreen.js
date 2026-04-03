import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppCard, SectionHeader, StatusBadge } from "../components/ui/primitives";

const HOME_INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const HOME_INPUT_SELECTION_COLOR = "#66d08a";

function formatPowerDraftValue(value) {
  const numericValue = Number(value);
  if (!value || Number.isNaN(numericValue) || numericValue <= 0) {
    return "";
  }
  return String(value);
}

export function HomeScreen({
  currentUser,
  account,
  alliance,
  desertStormAssignment,
  desertStormViewState,
  todayCalendarEntries,
  currentZombieSiegeEvent,
  onChangeField,
  onOpenDesertStormVote,
  onOpenZombieSiege,
  styles,
  t
}) {
  const [powerDraft, setPowerDraft] = useState({
    overallPower: "",
    heroPower: "",
    squad1: "",
    squad2: "",
    squad3: "",
    squad4: ""
  });
  const squadPowers = currentUser?.squadPowers || {};
  const totalSquadPower = Number(currentUser?.totalSquadPower || 0);
  const desertStormTone = desertStormViewState === "vote_open_not_voted"
    ? "warning"
    : desertStormViewState === "vote_open_voted_waiting"
      ? "success"
      : desertStormViewState === "teams_published"
        ? "info"
        : "neutral";
  const desertStormLabel = desertStormViewState === "vote_open_not_voted"
    ? t("home.desertStorm.responseNeeded")
    : desertStormViewState === "vote_open_voted_waiting"
      ? t("home.desertStorm.voteSubmitted")
      : desertStormViewState === "teams_published"
        ? t("home.desertStorm.teamsPublished")
        : t("home.desertStorm.idle");
  const desertStormDetail = desertStormViewState === "teams_published" && desertStormAssignment
    ? t("home.desertStorm.assignedTo", { value: desertStormAssignment.taskForceLabel || desertStormAssignment.taskForceKey || t("home.desertStorm.taskForceFallback") })
    : desertStormViewState === "teams_published"
      ? t("home.desertStorm.teamsPublishedDetail")
      : desertStormViewState === "vote_open_voted_waiting"
        ? t("home.desertStorm.voteWaitingDetail")
        : desertStormViewState === "vote_open_not_voted"
          ? t("home.desertStorm.voteOpenDetail")
          : t("home.desertStorm.noAssignmentPublished");

  useEffect(() => {
    setPowerDraft({
      overallPower: formatPowerDraftValue(currentUser?.overallPower),
      heroPower: formatPowerDraftValue(currentUser?.heroPower),
      squad1: formatPowerDraftValue(squadPowers.squad1),
      squad2: formatPowerDraftValue(squadPowers.squad2),
      squad3: formatPowerDraftValue(squadPowers.squad3),
      squad4: formatPowerDraftValue(squadPowers.squad4)
    });
  }, [currentUser?.overallPower, currentUser?.heroPower, squadPowers.squad1, squadPowers.squad2, squadPowers.squad3, squadPowers.squad4]);

  function updateDraft(field, value) {
    setPowerDraft((current) => ({ ...current, [field]: value }));
  }

  function commitField(field) {
    if (field === "overallPower" || field === "heroPower") {
      onChangeField(field, powerDraft[field]);
      return;
    }
    onChangeField("squadPowers", {
      squad1: powerDraft.squad1,
      squad2: powerDraft.squad2,
      squad3: powerDraft.squad3,
      squad4: powerDraft.squad4
    });
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <View style={styles.profileHeader}>
        <View style={styles.homeHeroContent}>
          <Text style={styles.profileEyebrow}>{t("home.title")}</Text>
          <Text style={styles.title}>{currentUser?.name || account?.displayName || t("home.memberFallback")}</Text>
          <Text style={styles.profileRank}>{alliance?.name} - {currentUser?.rank || "R1"}</Text>
        </View>
        <View style={styles.homeHeroBadgeColumn}>
          <StatusBadge label={currentUser?.rank || "R1"} tone="info" styles={styles} />
          <Text style={styles.homeHeroMeta}>{t("home.signedIn")}</Text>
        </View>
      </View>
    </AppCard>

    <AppCard variant={desertStormTone === "warning" ? "warning" : desertStormTone === "success" ? "active" : "info"} onPress={onOpenDesertStormVote || onOpenZombieSiege} styles={styles}>
      <SectionHeader eyebrow={t("home.activeOperations")} title={t("desertStormTitle")} detail={desertStormDetail} styles={styles} />
      <StatusBadge label={desertStormLabel} tone={desertStormTone} styles={styles} />
    </AppCard>

    <AppCard styles={styles}>
      <SectionHeader eyebrow={t("home.recentActivity")} title={t("home.today")} detail={t("home.todayDetail")} styles={styles} />
      {todayCalendarEntries?.length
        ? todayCalendarEntries.slice(0, 4).map((entry) => <View key={entry.occurrenceId || entry.id} style={styles.todayItem}><Text style={styles.todayItemTitle}>{entry.title}</Text><Text style={styles.hint}>{entry.allDay ? t("home.allDay") : entry.localDisplayTime || entry.displayTime || t("home.scheduled")}</Text></View>)
        : <Text style={styles.hint}>{t("home.nothingToday")}</Text>}
      {currentZombieSiegeEvent ? <Text style={styles.line}>{t("home.zombieSiegeCurrent", { title: currentZombieSiegeEvent.title })}</Text> : null}
    </AppCard>

    <AppCard styles={styles}>
      <SectionHeader eyebrow={t("home.powerEyebrow")} title={t("home.personalPower")} detail={t("home.personalPowerDetail")} styles={styles} />
      <View style={styles.memberStatGrid}>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("home.totalPower")}</Text><Text style={styles.memberStatValue}>{Number(currentUser?.overallPower || 0).toFixed(2)}M</Text></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("home.heroPower")}</Text><Text style={styles.memberStatValue}>{Number(currentUser?.heroPower || 0).toFixed(2)}M</Text></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("home.squadTotal")}</Text><Text style={styles.memberStatValue}>{totalSquadPower.toFixed(2)}M</Text></View>
      </View>
      <View style={styles.row}><TextInput value={powerDraft.overallPower} onChangeText={(value) => updateDraft("overallPower", value)} onBlur={() => commitField("overallPower")} style={[styles.input, styles.half]} placeholder={t("home.totalPower")} placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /><TextInput value={powerDraft.heroPower} onChangeText={(value) => updateDraft("heroPower", value)} onBlur={() => commitField("heroPower")} style={[styles.input, styles.half]} placeholder={t("home.heroPower")} placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
      <View style={styles.row}><TextInput value={powerDraft.squad1} onChangeText={(value) => updateDraft("squad1", value)} onBlur={() => commitField("squad1")} style={[styles.input, styles.half]} placeholder={t("home.squadPlaceholder", { number: 1 })} placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /><TextInput value={powerDraft.squad2} onChangeText={(value) => updateDraft("squad2", value)} onBlur={() => commitField("squad2")} style={[styles.input, styles.half]} placeholder={t("home.squadPlaceholder", { number: 2 })} placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
      <View style={styles.row}><TextInput value={powerDraft.squad3} onChangeText={(value) => updateDraft("squad3", value)} onBlur={() => commitField("squad3")} style={[styles.input, styles.half]} placeholder={t("home.squadPlaceholder", { number: 3 })} placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /><TextInput value={powerDraft.squad4} onChangeText={(value) => updateDraft("squad4", value)} onBlur={() => commitField("squad4")} style={[styles.input, styles.half]} placeholder={t("home.squadPlaceholder", { number: 4 })} placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
    </AppCard>
  </View>;
}
