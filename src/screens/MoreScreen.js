import React from "react";
import { View } from "react-native";
import { AppCard, ListRow, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function MoreScreen({
  styles,
  selection,
  currentUserIsLeader,
  joinRequests,
  t,
  onSelectLeaderControls,
  onSelectMembers,
  onSelectSettings,
  onSelectFeedback,
  onBack,
  children
}) {
  if (selection) {
    return <View style={styles.section}>
      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow={t("more.selected.eyebrow")} title={selection === "leaderControls" ? t("more.leaderControls.title") : selection === "members" ? t("more.members.title") : selection === "settings" ? t("settings.title") : t("more.feedback.title")} detail={t("more.selected.description")} styles={styles} />
      </AppCard>
      {children}
    </View>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow={t("more.root.eyebrow")} title={t("more.root.title")} detail={t("more.root.description")} styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} onPress={onSelectSettings} styles={styles}>
      <ListRow title={t("settings.title")} detail={t("more.settings.description")} right={<StatusBadge label={t("more.badgeOpen")} tone="info" styles={styles} />} styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} onPress={onSelectFeedback} styles={styles}>
      <ListRow title={t("more.feedback.title")} detail={t("more.feedback.description")} right={<StatusBadge label={t("more.badgeOpen")} tone="info" styles={styles} />} styles={styles} />
    </AppCard>

    {currentUserIsLeader ? <AppCard style={styles.settingsSectionCard} onPress={onSelectLeaderControls} styles={styles}>
      <ListRow title={t("more.leaderControls.title")} detail={t("more.leaderControls.description")} right={<StatusBadge label={t("more.badgeLeader")} tone="warning" styles={styles} />} styles={styles} />
    </AppCard> : null}

    {currentUserIsLeader ? <AppCard style={styles.settingsSectionCard} onPress={onSelectMembers} styles={styles}>
      <ListRow title={t("more.members.title")} detail={joinRequests?.length ? t("more.members.requestsWaiting", { count: joinRequests.length }) : t("more.members.description")} right={<StatusBadge label={joinRequests?.length ? t("more.badgeAction") : t("more.badgeOpen")} tone={joinRequests?.length ? "warning" : "info"} styles={styles} />} styles={styles} />
    </AppCard> : null}
  </View>;
}
