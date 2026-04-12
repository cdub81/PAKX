import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AppCard, BottomSheetModal, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";
import { clampHqLevel } from "../lib/calculators/hqRequirements";

const HOME_INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const HOME_INPUT_SELECTION_COLOR = "#66d08a";
const WHEEL_ITEM_HEIGHT = 40;

function formatPowerDraftValue(value) {
  const numericValue = Number(value);
  if (!value || Number.isNaN(numericValue) || numericValue <= 0) {
    return "";
  }
  return String(value);
}

function StatValue({ children, styles }) {
  return <Text style={styles.memberStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{children}</Text>;
}

function HqValueWheel({ value, values, onChange, styles }) {
  const scrollRef = useRef(null);
  const lastSyncedValueRef = useRef(null);

  useEffect(() => {
    if (lastSyncedValueRef.current === value) {
      return;
    }
    const optionIndex = Math.max(0, values.findIndex((entry) => entry.value === value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: optionIndex * WHEEL_ITEM_HEIGHT, animated: false });
    });
    lastSyncedValueRef.current = value;
  }, [value, values]);

  function commitScrollValue(offsetY) {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT)));
    onChange(values[index].value);
  }

  return <View style={styles.calendarWheelColumn}>
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={WHEEL_ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      contentContainerStyle={styles.calendarWheelContent}
      onMomentumScrollEnd={(event) => commitScrollValue(event.nativeEvent.contentOffset.y)}
    >
      {values.map((option) => <Pressable key={`${option.value}`} style={styles.calendarWheelItem} onPress={() => onChange(option.value)}>
        <Text style={[styles.calendarWheelText, option.value === value && styles.calendarWheelTextActive]}>{option.label}</Text>
      </Pressable>)}
    </ScrollView>
    <View pointerEvents="none" style={styles.calendarWheelHighlight} />
  </View>;
}

function buildHqOptions(minLevel = 1, maxLevel = 35) {
  const options = [];
  for (let level = minLevel; level <= maxLevel; level += 1) {
    options.push({ value: level, label: `HQ ${level}` });
  }
  return options;
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
    hqLevel: "",
    squad1: "",
    squad2: "",
    squad3: "",
    squad4: ""
  });
  const [hqPickerVisible, setHqPickerVisible] = useState(false);
  const [hqPickerValue, setHqPickerValue] = useState(1);
  const squadPowers = currentUser?.squadPowers || {};
  const totalSquadPower = Number(currentUser?.totalSquadPower || 0);
  const displayHqLevel = clampHqLevel(powerDraft.hqLevel || currentUser?.hqLevel || 1);
  const hqOptions = buildHqOptions(1, 35);
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
      hqLevel: String(currentUser?.hqLevel ?? 1),
      squad1: formatPowerDraftValue(squadPowers.squad1),
      squad2: formatPowerDraftValue(squadPowers.squad2),
      squad3: formatPowerDraftValue(squadPowers.squad3),
      squad4: formatPowerDraftValue(squadPowers.squad4)
    });
  }, [currentUser?.overallPower, currentUser?.heroPower, currentUser?.hqLevel, squadPowers.squad1, squadPowers.squad2, squadPowers.squad3, squadPowers.squad4]);

  useEffect(() => {
    if (!hqPickerVisible) {
      setHqPickerValue(clampHqLevel(powerDraft.hqLevel));
    }
  }, [hqPickerVisible, powerDraft.hqLevel]);

  function updateDraft(field, value) {
    setPowerDraft((current) => ({ ...current, [field]: value }));
  }

  function commitField(field) {
    if (field === "overallPower" || field === "heroPower" || field === "hqLevel") {
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

  function commitHqLevel() {
    const nextHqLevel = String(clampHqLevel(hqPickerValue));
    updateDraft("hqLevel", nextHqLevel);
    onChangeField("hqLevel", nextHqLevel);
    setHqPickerVisible(false);
  }

  function openHqPicker() {
    setHqPickerValue(clampHqLevel(powerDraft.hqLevel));
    setHqPickerVisible(true);
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
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("members.hqLevel")}</Text><StatValue styles={styles}>Lvl {displayHqLevel}</StatValue></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("home.totalPower")}</Text><StatValue styles={styles}>{Number(currentUser?.overallPower || 0).toFixed(2)}M</StatValue></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("home.heroPower")}</Text><StatValue styles={styles}>{Number(currentUser?.heroPower || 0).toFixed(2)}M</StatValue></View>
        <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>{t("home.squadTotal")}</Text><StatValue styles={styles}>{totalSquadPower.toFixed(2)}M</StatValue></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.inputLabel}>{t("members.hqLevel")}</Text>
          <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={openHqPicker}>
            <Text style={styles.line}>HQ {displayHqLevel}</Text>
          </Pressable>
        </View>
        <View style={styles.half}><Text style={styles.inputLabel}>{t("home.totalPower")}</Text><TextInput value={powerDraft.overallPower} onChangeText={(value) => updateDraft("overallPower", value)} onBlur={() => commitField("overallPower")} style={styles.input} placeholder="e.g. 56.79" placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.inputLabel}>{t("home.heroPower")}</Text><TextInput value={powerDraft.heroPower} onChangeText={(value) => updateDraft("heroPower", value)} onBlur={() => commitField("heroPower")} style={styles.input} placeholder="e.g. 67.00" placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Text style={styles.inputLabel}>{t("home.squadPlaceholder", { number: 1 })}</Text><TextInput value={powerDraft.squad1} onChangeText={(value) => updateDraft("squad1", value)} onBlur={() => commitField("squad1")} style={styles.input} placeholder="e.g. 14.00" placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.inputLabel}>{t("home.squadPlaceholder", { number: 2 })}</Text><TextInput value={powerDraft.squad2} onChangeText={(value) => updateDraft("squad2", value)} onBlur={() => commitField("squad2")} style={styles.input} placeholder="e.g. 7.76" placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
        <View style={styles.half}><Text style={styles.inputLabel}>{t("home.squadPlaceholder", { number: 3 })}</Text><TextInput value={powerDraft.squad3} onChangeText={(value) => updateDraft("squad3", value)} onBlur={() => commitField("squad3")} style={styles.input} placeholder="e.g. 8.92" placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}><Text style={styles.inputLabel}>{t("home.squadPlaceholder", { number: 4 })}</Text><TextInput value={powerDraft.squad4} onChangeText={(value) => updateDraft("squad4", value)} onBlur={() => commitField("squad4")} style={styles.input} placeholder="e.g. 10.77" placeholderTextColor={HOME_INPUT_PLACEHOLDER_COLOR} selectionColor={HOME_INPUT_SELECTION_COLOR} keyboardType="decimal-pad" /></View>
      </View>
    </AppCard>

    <BottomSheetModal visible={hqPickerVisible} onClose={() => setHqPickerVisible(false)} styles={styles}>
      <SectionHeader eyebrow={t("members.hqLevel")} title={t("members.hqLevel")} detail="Scroll to choose your HQ level." styles={styles} />
      <View style={styles.calendarWheelHeader}>
        <Text style={styles.hint}>{t("members.hqLevel")}</Text>
      </View>
      <View style={styles.calendarWheelRow}>
        <HqValueWheel
          value={hqPickerValue}
          values={hqOptions}
          onChange={setHqPickerValue}
          styles={styles}
        />
      </View>
      <PrimaryButton label={t("picker.done")} onPress={commitHqLevel} styles={styles} />
    </BottomSheetModal>
  </View>;
}
