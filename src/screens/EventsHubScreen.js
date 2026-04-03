import React from "react";
import { View } from "react-native";
import { AppCard, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function EventsHubScreen({
  styles,
  selection,
  onSelectDesertStorm,
  onSelectZombieSiege,
  onBack,
  desertStormTitle,
  zombieSiegeTitle,
  children,
  t
}) {
  if (selection) {
    return <View style={styles.section}>
      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow={t("events.selected.eyebrow")} title={selection === "desertStorm" ? t("events.desertStorm.title") : t("events.zombieSiege.title")} detail={t("events.selected.description")} styles={styles} />
      </AppCard>
      {children}
    </View>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow={t("events.root.eyebrow")} title={t("events.root.title")} detail={t("events.root.description")} styles={styles} />
    </AppCard>

    <AppCard variant="info" style={styles.settingsSectionCard} onPress={onSelectDesertStorm} styles={styles}>
      <SectionHeader eyebrow={t("events.cardEyebrow")} title={t("events.desertStorm.title")} detail={desertStormTitle || t("events.desertStorm.description")} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={t("events.operational")} tone="warning" styles={styles} />
        <PrimaryButton label={t("events.desertStorm.open")} onPress={onSelectDesertStorm} style={styles.half} styles={styles} />
      </View>
    </AppCard>

    <AppCard variant="purple" style={styles.settingsSectionCard} onPress={onSelectZombieSiege} styles={styles}>
      <SectionHeader eyebrow={t("events.cardEyebrow")} title={t("events.zombieSiege.title")} detail={zombieSiegeTitle || t("events.zombieSiege.description")} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={t("events.operational")} tone="purple" styles={styles} />
        <PrimaryButton label={t("events.zombieSiege.open")} onPress={onSelectZombieSiege} tone="purple" style={styles.half} styles={styles} />
      </View>
    </AppCard>
  </View>;
}
