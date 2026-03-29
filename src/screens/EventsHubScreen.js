import React from "react";
import { View } from "react-native";
import { AppCard, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

export function EventsHubScreen({
  styles,
  selection,
  onSelectDesertStorm,
  onSelectZombieSiege,
  onBack,
  desertStormTitle,
  zombieSiegeTitle,
  children
}) {
  if (selection) {
    return <View style={styles.section}>
      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow="Events" title={selection === "desertStorm" ? "Desert Storm" : "Zombie Siege"} detail="Use the event hub to move between alliance event workflows without changing the underlying logic." styles={styles} />
        <SecondaryButton label="Back to Events" onPress={onBack} styles={styles} />
      </AppCard>
      {children}
    </View>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow="Events" title="Alliance Events" detail="Select an event workflow to open the existing Desert Storm or Zombie Siege screens." styles={styles} />
    </AppCard>

    <AppCard variant="info" style={styles.settingsSectionCard} onPress={onSelectDesertStorm} styles={styles}>
      <SectionHeader eyebrow="Event" title="Desert Storm" detail={desertStormTitle || "Open the current Desert Storm vote, assignments, history, and leader controls."} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label="Operational" tone="warning" styles={styles} />
        <PrimaryButton label="Open Desert Storm" onPress={onSelectDesertStorm} style={styles.half} styles={styles} />
      </View>
    </AppCard>

    <AppCard variant="purple" style={styles.settingsSectionCard} onPress={onSelectZombieSiege} styles={styles}>
      <SectionHeader eyebrow="Event" title="Zombie Siege" detail={zombieSiegeTitle || "Open event availability, planning, assignments, and event review."} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label="Operational" tone="purple" styles={styles} />
        <PrimaryButton label="Open Zombie Siege" onPress={onSelectZombieSiege} tone="purple" style={styles.half} styles={styles} />
      </View>
    </AppCard>
  </View>;
}
