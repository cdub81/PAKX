import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AppCard, BottomSheetModal, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";
import { clampHqLevel } from "../lib/calculators/hqRequirements";
import { clampReductionPercent, formatCompactAmount, getBuildingOptions, getBuildingResourcesPlan, getBuildingTargetLevels, normalizeBuildingSelection } from "../lib/calculators/buildingResources";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";
const WHEEL_ITEM_HEIGHT = 40;

function ValueWheel({ value, values, onChange, styles, renderLabel }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const optionIndex = Math.max(0, values.findIndex((entry) => entry.value === value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: optionIndex * WHEEL_ITEM_HEIGHT, animated: false });
    });
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
      onScrollEndDrag={(event) => commitScrollValue(event.nativeEvent.contentOffset.y)}
    >
      {values.map((option) => <Pressable key={`${option.value}`} style={styles.calendarWheelItem} onPress={() => onChange(option.value)}>
        <Text style={[styles.calendarWheelText, option.value === value && styles.calendarWheelTextActive]}>
          {renderLabel ? renderLabel(option) : option.label}
        </Text>
      </Pressable>)}
    </ScrollView>
    <View pointerEvents="none" style={styles.calendarWheelHighlight} />
  </View>;
}

function ResourceTotalCard({ label, value, tone, styles }) {
  return <AppCard variant={tone} style={styles.half} styles={styles}>
    <Text style={styles.statusEyebrow}>{label}</Text>
    <Text style={styles.statusTitle}>{value}</Text>
  </AppCard>;
}

function buildHqOptions(minLevel = 1, maxLevel = 35) {
  const options = [];
  for (let level = minLevel; level <= maxLevel; level += 1) {
    options.push({ value: level, label: `HQ ${level}` });
  }
  return options;
}

function createAdditionalBuildingDraft() {
  const initial = normalizeBuildingSelection({});
  return {
    id: `building-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    building: initial.building,
    targetLevel: initial.targetLevel
  };
}

export function BuildingResourcesCalculatorScreen({ styles, t }) {
  const [startLevel, setStartLevel] = useState(1);
  const [targetLevel, setTargetLevel] = useState(35);
  const [reductionPercentInput, setReductionPercentInput] = useState("0");
  const [startPickerVisible, setStartPickerVisible] = useState(false);
  const [targetPickerVisible, setTargetPickerVisible] = useState(false);
  const [additionalBuildings, setAdditionalBuildings] = useState([]);
  const [additionalBuilderVisible, setAdditionalBuilderVisible] = useState(false);
  const [additionalBuildingDraft, setAdditionalBuildingDraft] = useState(createAdditionalBuildingDraft);

  const reductionPercent = clampReductionPercent(reductionPercentInput);
  const buildingOptions = useMemo(() => getBuildingOptions(), []);
  const buildingLevelOptions = useMemo(
    () => getBuildingTargetLevels(additionalBuildingDraft.building).map((level) => ({ value: level, label: `L${Math.max(0, level - 1)} -> ${level}` })),
    [additionalBuildingDraft.building]
  );
  const resourcePlan = useMemo(() => getBuildingResourcesPlan({
    startLevel,
    targetLevel,
    reductionPercent,
    additionalBuildings
  }), [additionalBuildings, reductionPercent, startLevel, targetLevel]);

  useEffect(() => {
    if (targetLevel <= startLevel) {
      setTargetLevel(Math.min(35, startLevel + 1));
    }
  }, [startLevel, targetLevel]);

  useEffect(() => {
    const normalized = normalizeBuildingSelection(additionalBuildingDraft);
    if (normalized.targetLevel !== additionalBuildingDraft.targetLevel) {
      setAdditionalBuildingDraft((current) => ({
        ...current,
        targetLevel: normalized.targetLevel
      }));
    }
  }, [additionalBuildingDraft]);

  const normalizeReductionInput = () => {
    setReductionPercentInput(String(clampReductionPercent(reductionPercentInput)));
  };

  const addAdditionalBuilding = () => {
    const normalized = normalizeBuildingSelection(additionalBuildingDraft);
    setAdditionalBuildings((current) => [...current, { ...normalized, id: additionalBuildingDraft.id }]);
    setAdditionalBuilderVisible(false);
    setAdditionalBuildingDraft(createAdditionalBuildingDraft());
  };

  const removeAdditionalBuilding = (buildingId) => {
    setAdditionalBuildings((current) => current.filter((entry) => entry.id !== buildingId));
  };

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.hero.eyebrow")} title={t("calculators.building.hero.title")} detail={t("calculators.building.hero.description")} styles={styles} />
      <StatusBadge label={t("calculators.cards.buildingResources.title")} tone="info" styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.input.eyebrow")} title={t("calculators.building.input.title")} detail={t("calculators.building.input.description")} styles={styles} />
      <View style={styles.row}>
        <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => setStartPickerVisible(true)}>
          <Text style={styles.line}>{t("calculators.building.startLevel", { level: startLevel })}</Text>
        </Pressable>
        <Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => setTargetPickerVisible(true)}>
          <Text style={styles.line}>{t("calculators.building.targetLevel", { level: targetLevel })}</Text>
        </Pressable>
      </View>
      <TextInput value={reductionPercentInput} onChangeText={setReductionPercentInput} onBlur={normalizeReductionInput} style={styles.input} placeholder={t("calculators.building.reductionPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} keyboardType="decimal-pad" />
      <Text style={styles.hint}>{t("calculators.building.reductionHint", { value: reductionPercent })}</Text>
    </AppCard>

    <AppCard variant="info" style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.totals.eyebrow")} title={t("calculators.building.totals.title", { start: resourcePlan.startLevel, target: resourcePlan.targetLevel })} detail={t("calculators.building.totals.description")} styles={styles} />
      <View style={styles.row}>
        <ResourceTotalCard label={t("calculators.building.resources.gold")} value={formatCompactAmount(resourcePlan.totals.gold)} tone="warning" styles={styles} />
        <ResourceTotalCard label={t("calculators.building.resources.iron")} value={formatCompactAmount(resourcePlan.totals.iron)} tone="purple" styles={styles} />
      </View>
      <View style={styles.row}>
        <ResourceTotalCard label={t("calculators.building.resources.food")} value={formatCompactAmount(resourcePlan.totals.food)} tone="success" styles={styles} />
        <ResourceTotalCard label={t("calculators.building.resources.oil")} value={formatCompactAmount(resourcePlan.totals.oil)} tone="danger" styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.additional.eyebrow")} title={t("calculators.building.additional.title")} detail={t("calculators.building.additional.description")} styles={styles} />
      {additionalBuildings.length
        ? <View style={styles.settingsStack}>
          {additionalBuildings.map((entry) => <AppCard key={entry.id} style={styles.settingsNestedCard} styles={styles}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.listRowContent}>
                <Text style={styles.cardTitle}>{buildingOptions.find((option) => option.value === entry.building)?.label || entry.building}</Text>
                <Text style={styles.hint}>{t("calculators.building.levelShift", { from: Math.max(0, entry.targetLevel - 1), to: entry.targetLevel })}</Text>
              </View>
              <Pressable style={styles.dangerButton} onPress={() => removeAdditionalBuilding(entry.id)}>
                <Text style={styles.dangerButtonText}>{t("calculators.building.removeAdditional")}</Text>
              </Pressable>
            </View>
          </AppCard>)}
        </View>
        : <Text style={styles.hint}>{t("calculators.building.additional.empty")}</Text>}
      <SecondaryButton label={t("calculators.building.additional.addButton")} onPress={() => setAdditionalBuilderVisible(true)} styles={styles} />
      <Text style={styles.hint}>{t("calculators.building.additional.supportedLevelsHint")}</Text>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.requirements.eyebrow")} title={t("calculators.building.requirements.title")} detail={t("calculators.building.requirements.description")} styles={styles} />
      <View style={styles.settingsStack}>
        {resourcePlan.entries.map((entry) => <AppCard key={`${entry.source || "hq"}-${entry.key}-${entry.selectionId || entry.sourceLevel}`} style={styles.settingsNestedCard} styles={styles}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.listRowContent}>
              <Text style={styles.cardTitle}>{entry.label}</Text>
              <Text style={styles.hint}>{t("calculators.building.levelShift", { from: entry.fromLevel, to: entry.targetLevel })}</Text>
            </View>
            <StatusBadge label={entry.source === "additional" ? t("calculators.building.additionalBadge") : entry.optionalChoice ? t("calculators.building.oneOf") : t("calculators.building.required")} tone={entry.source === "additional" ? "purple" : entry.optionalChoice ? "warning" : "info"} styles={styles} />
          </View>
          {entry.missingCost
            ? <View style={styles.settingsStack}>
              <Text style={styles.error}>{t("calculators.building.costUnavailable")}</Text>
              {entry.missingReason ? <Text style={styles.hint}>{entry.missingReason}</Text> : null}
            </View>
            : <View style={styles.settingsStack}>
              <Text style={styles.line}>{t("calculators.building.resourceLine", {
                gold: formatCompactAmount(entry.reducedCosts.gold),
                iron: formatCompactAmount(entry.reducedCosts.iron),
                food: formatCompactAmount(entry.reducedCosts.food),
                oil: formatCompactAmount(entry.reducedCosts.oil)
              })}</Text>
              {reductionPercent > 0 ? <Text style={styles.hint}>{t("calculators.building.reductionApplied", { value: reductionPercent })}</Text> : null}
            </View>}
        </AppCard>)}
      </View>
      {resourcePlan.missingCosts.length ? <Text style={styles.hint}>{t("calculators.building.missingCostNote")}</Text> : null}
    </AppCard>

    <BottomSheetModal visible={startPickerVisible} onClose={() => setStartPickerVisible(false)} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.input.eyebrow")} title={t("calculators.building.startLevelPickerTitle")} detail={t("calculators.building.startLevelPickerDetail")} styles={styles} />
      <View style={styles.calendarWheelHeader}>
        <Text style={styles.hint}>{t("calculators.building.wheelColumnLabel")}</Text>
      </View>
      <View style={styles.calendarWheelRow}>
        <ValueWheel value={clampHqLevel(startLevel)} values={buildHqOptions(1, 34)} onChange={setStartLevel} styles={styles} />
      </View>
      <PrimaryButton label={t("picker.done")} onPress={() => setStartPickerVisible(false)} styles={styles} />
    </BottomSheetModal>

    <BottomSheetModal visible={targetPickerVisible} onClose={() => setTargetPickerVisible(false)} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.input.eyebrow")} title={t("calculators.building.targetLevelPickerTitle")} detail={t("calculators.building.targetLevelPickerDetail")} styles={styles} />
      <View style={styles.calendarWheelHeader}>
        <Text style={styles.hint}>{t("calculators.building.wheelColumnLabel")}</Text>
      </View>
      <View style={styles.calendarWheelRow}>
        <ValueWheel value={Math.max(startLevel + 1, targetLevel)} values={buildHqOptions(Math.min(35, startLevel + 1), 35)} onChange={setTargetLevel} styles={styles} />
      </View>
      <PrimaryButton label={t("picker.done")} onPress={() => setTargetPickerVisible(false)} styles={styles} />
    </BottomSheetModal>

    <BottomSheetModal visible={additionalBuilderVisible} onClose={() => setAdditionalBuilderVisible(false)} styles={styles}>
      <SectionHeader eyebrow={t("calculators.building.additional.eyebrow")} title={t("calculators.building.additional.builderTitle")} detail={t("calculators.building.additional.builderDetail")} styles={styles} />
      <Text style={styles.hint}>{t("calculators.building.additional.supportedLevelsHint")}</Text>
      <View style={styles.calendarWheelHeader}>
        <Text style={styles.hint}>{t("calculators.building.additional.buildingLabel")}</Text>
        <Text style={styles.hint}>{t("calculators.building.additional.levelLabel")}</Text>
      </View>
      <View style={styles.calendarWheelRow}>
        <ValueWheel
          value={additionalBuildingDraft.building}
          values={buildingOptions}
          onChange={(building) => setAdditionalBuildingDraft((current) => ({
            ...current,
            building,
            targetLevel: normalizeBuildingSelection({ building }).targetLevel
          }))}
          styles={styles}
          renderLabel={(option) => option.label}
        />
        <ValueWheel
          value={additionalBuildingDraft.targetLevel}
          values={buildingLevelOptions}
          onChange={(targetLevelValue) => setAdditionalBuildingDraft((current) => ({ ...current, targetLevel: targetLevelValue }))}
          styles={styles}
          renderLabel={(option) => option.label}
        />
      </View>
      <PrimaryButton label={t("calculators.building.additional.confirmAdd")} onPress={addAdditionalBuilding} styles={styles} />
    </BottomSheetModal>
  </View>;
}
