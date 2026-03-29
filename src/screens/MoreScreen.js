import React from "react";
import { View } from "react-native";
import { AppCard, ListRow, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

export function MoreScreen({
  styles,
  selection,
  currentUserIsLeader,
  joinRequests,
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
        <SectionHeader eyebrow="More" title={selection === "leaderControls" ? "Leader Controls" : selection === "members" ? "Members" : selection === "settings" ? "Settings" : "Feedback"} detail="Use More for secondary destinations without adding extra top-level tabs." styles={styles} />
        <SecondaryButton label="Back to More" onPress={onBack} styles={styles} />
      </AppCard>
      {children}
    </View>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.homeHeroCard} styles={styles}>
      <SectionHeader eyebrow="More" title="More Tools" detail="Open secondary destinations from a clean vertical list." styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} onPress={onSelectSettings} styles={styles}>
      <ListRow title="Settings" detail="Account context, notifications, preferences, and alliance controls." right={<StatusBadge label="Open" tone="info" styles={styles} />} styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} onPress={onSelectFeedback} styles={styles}>
      <ListRow title="Feedback" detail="Submit app notes and review recent feedback history." right={<StatusBadge label="Open" tone="info" styles={styles} />} styles={styles} />
    </AppCard>

    {currentUserIsLeader ? <AppCard style={styles.settingsSectionCard} onPress={onSelectLeaderControls} styles={styles}>
      <ListRow title="Leader Controls" detail="Open leader-only tools, including alliance-wide broadcast controls." right={<StatusBadge label="Leader" tone="warning" styles={styles} />} styles={styles} />
    </AppCard> : null}

    {currentUserIsLeader ? <AppCard style={styles.settingsSectionCard} onPress={onSelectMembers} styles={styles}>
      <ListRow title="Members" detail={joinRequests?.length ? `${joinRequests.length} join request${joinRequests.length === 1 ? "" : "s"} waiting for leader review.` : "Review and edit the alliance roster."} right={<StatusBadge label={joinRequests?.length ? "Action" : "Open"} tone={joinRequests?.length ? "warning" : "info"} styles={styles} />} styles={styles} />
    </AppCard> : null}
  </View>;
}
