import React from "react";
import { Text, View } from "react-native";
import { AppCard, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function DocumentsScreen({
  styles,
  t
}) {
  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow={t("documents.hero.eyebrow")} title={t("documents.title")} detail={t("documents.hero.description")} styles={styles} />
      <StatusBadge label={t("documents.comingSoonBadge")} tone="warning" styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("documents.library.eyebrow")} title={t("documents.comingSoonTitle")} detail={t("documents.comingSoonDescription")} styles={styles} />
      <AppCard style={styles.calendarEmptyCard} styles={styles}>
        <Text style={styles.statusTitle}>{t("documents.comingSoonTitle")}</Text>
        <Text style={styles.hint}>{t("documents.comingSoonDetail")}</Text>
      </AppCard>
    </AppCard>
  </View>;
}
