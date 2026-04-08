import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AppCard, BottomSheetModal, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";
import { clampHqLevel, getHqRequirement } from "../lib/calculators/hqRequirements";

const WHEEL_ITEM_HEIGHT = 40;

function formatRequirementLine(t, requirement) {
  return t("calculators.hq.requirementLine", {
    building: requirement.building,
    level: requirement.requiredLevel
  });
}

function HqLevelWheel({ value, onChange, styles }) {
  const scrollRef = useRef(null);
  const options = useMemo(() => Array.from({ length: 35 }, (_, index) => index + 1), []);

  useEffect(() => {
    const optionIndex = Math.max(0, options.findIndex((entry) => entry === value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: optionIndex * WHEEL_ITEM_HEIGHT, animated: false });
    });
  }, [options, value]);

  function commitScrollValue(offsetY) {
    const index = Math.max(0, Math.min(options.length - 1, Math.round(offsetY / WHEEL_ITEM_HEIGHT)));
    const nextValue = options[index];
    if (nextValue !== value) {
      onChange(nextValue);
    }
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
      {options.map((option) => <Pressable key={option} style={styles.calendarWheelItem} onPress={() => onChange(option)}>
        <Text style={[styles.calendarWheelText, option === value && styles.calendarWheelTextActive]}>HQ {option}</Text>
      </Pressable>)}
    </ScrollView>
    <View pointerEvents="none" style={styles.calendarWheelHighlight} />
  </View>;
}

export function HqRequirementsCalculatorScreen({ styles, t }) {
  const [selectedLevel, setSelectedLevel] = useState(35);
  const [pickerVisible, setPickerVisible] = useState(false);
  const requirement = useMemo(() => getHqRequirement(selectedLevel), [selectedLevel]);

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.hq.hero.eyebrow")} title={t("calculators.hq.hero.title")} detail={t("calculators.hq.hero.description")} styles={styles} />
      <StatusBadge label={t("calculators.cards.hqRequirements.title")} tone="info" styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.hq.input.eyebrow")} title={t("calculators.hq.input.title")} detail={t("calculators.hq.input.description")} styles={styles} />
      <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setPickerVisible(true)}>
        <Text style={styles.line}>{t("calculators.hq.targetLevel", { level: selectedLevel })}</Text>
      </Pressable>
      <Text style={styles.hint}>{t("calculators.hq.rangeHint")}</Text>
    </AppCard>

    <AppCard variant={requirement.requirements.length ? "info" : "active"} style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.hq.summary.eyebrow")} title={t("calculators.hq.summary.title", { level: selectedLevel })} detail={t("calculators.hq.requirementCount", { count: requirement.requirements.length })} styles={styles} />
      {requirement.requirements.length
        ? requirement.requirements.map((item) => <AppCard key={`${requirement.level}-${item.building}`} style={styles.settingsNestedCard} styles={styles}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{item.building}</Text>
            <StatusBadge label={`L${item.requiredLevel}`} tone="warning" styles={styles} />
          </View>
          <Text style={styles.line}>{formatRequirementLine(t, item)}</Text>
        </AppCard>)
        : <Text style={styles.line}>{t("calculators.hq.noRequirements")}</Text>}
    </AppCard>

    <BottomSheetModal visible={pickerVisible} onClose={() => setPickerVisible(false)} styles={styles}>
      <SectionHeader eyebrow={t("calculators.hq.input.eyebrow")} title={t("calculators.hq.targetLevelPickerTitle")} detail={t("calculators.hq.targetLevelPickerDetail")} styles={styles} />
      <View style={styles.calendarWheelHeader}>
        <Text style={styles.hint}>{t("calculators.hq.wheelColumnLabel")}</Text>
      </View>
      <View style={styles.calendarWheelRow}>
        <HqLevelWheel value={clampHqLevel(selectedLevel)} onChange={setSelectedLevel} styles={styles} />
      </View>
      <PrimaryButton label={t("picker.done")} onPress={() => setPickerVisible(false)} styles={styles} />
    </BottomSheetModal>
  </View>;
}
