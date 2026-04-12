import React from "react";
import { Text, View } from "react-native";
import { AppCard, SectionHeader, StatusBadge } from "../components/ui/primitives";
import { BuildingResourcesCalculatorScreen } from "./BuildingResourcesCalculatorScreen";
import { HqRequirementsCalculatorScreen } from "./HqRequirementsCalculatorScreen";

const CALCULATOR_CARDS = [
  { key: "hqRequirements", titleKey: "calculators.cards.hqRequirements.title", descriptionKey: "calculators.cards.hqRequirements.description" },
  { key: "buildingResources", titleKey: "calculators.cards.buildingResources.title", descriptionKey: "calculators.cards.buildingResources.description" },
  { key: "buildResearchTime", titleKey: "calculators.cards.buildResearchTime.title", descriptionKey: "calculators.cards.buildResearchTime.description" },
  { key: "research", titleKey: "calculators.cards.research.title", descriptionKey: "calculators.cards.research.description" },
  { key: "allianceHelpTime", titleKey: "calculators.cards.allianceHelpTime.title", descriptionKey: "calculators.cards.allianceHelpTime.description" },
  { key: "gear", titleKey: "calculators.cards.gear.title", descriptionKey: "calculators.cards.gear.description" },
  { key: "heroExp", titleKey: "calculators.cards.heroExp.title", descriptionKey: "calculators.cards.heroExp.description" },
  { key: "heroShards", titleKey: "calculators.cards.heroShards.title", descriptionKey: "calculators.cards.heroShards.description" },
  { key: "skillMedals", titleKey: "calculators.cards.skillMedals.title", descriptionKey: "calculators.cards.skillMedals.description" },
  { key: "weaponShards", titleKey: "calculators.cards.weaponShards.title", descriptionKey: "calculators.cards.weaponShards.description" }
];

export function CalculatorsScreen({ styles, t, selectedCalculator, onSelectCalculator, currentUser }) {
  if (selectedCalculator === "hqRequirements") {
    return <HqRequirementsCalculatorScreen styles={styles} t={t} currentUser={currentUser} />;
  }
  if (selectedCalculator === "buildingResources") {
    return <BuildingResourcesCalculatorScreen styles={styles} t={t} currentUser={currentUser} />;
  }

  return <View style={styles.section}>
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("calculators.library.eyebrow")} title={t("calculators.library.title")} detail={t("calculators.library.description")} styles={styles} />
      <View style={styles.settingsStack}>
        {CALCULATOR_CARDS.map((card) => <AppCard key={card.key} style={styles.settingsNestedCard} onPress={card.key === "hqRequirements" || card.key === "buildingResources" ? () => onSelectCalculator(card.key) : undefined} styles={styles}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.listRowContent}>
              <Text style={styles.cardTitle}>{t(card.titleKey)}</Text>
              <Text style={styles.hint}>{t(card.descriptionKey)}</Text>
            </View>
            <StatusBadge label={card.key === "hqRequirements" || card.key === "buildingResources" ? t("calculators.hq.readyBadge") : t("calculators.cardBadge")} tone={card.key === "hqRequirements" || card.key === "buildingResources" ? "success" : "info"} styles={styles} />
          </View>
        </AppCard>)}
      </View>
    </AppCard>
  </View>;
}
