import React from "react";
import { Text, TextInput, View } from "react-native";
import { AppCard, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function LeaderControlsScreen({
  styles,
  alliance,
  pushMessage,
  onChangePushMessage,
  onSendBroadcastPush,
  sending,
  currentUserHasPushToken
}) {
  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow="Leader Controls" title="Alliance Broadcasts" detail="Use leader-only tools to communicate quickly across the alliance without changing existing event workflows." styles={styles} />
      <View style={styles.row}>
        <StatusBadge label="Leader Only" tone="warning" styles={styles} />
        <StatusBadge label={currentUserHasPushToken ? "Push Ready" : "Push Limited"} tone={currentUserHasPushToken ? "success" : "info"} styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="Push Notification" title="Send to all members" detail="Members on devices with registered push notifications will receive this broadcast." styles={styles} />
      <TextInput value={pushMessage} onChangeText={onChangePushMessage} style={[styles.input, styles.textArea]} placeholder="Enter the note you want to send to the alliance." multiline />
      <Text style={styles.hint}>This sends a direct alliance-wide alert using the current Expo push-token setup. Devices without registered push tokens will not receive it.</Text>
      <PrimaryButton label={sending ? "Sending..." : "Send Push Notification"} onPress={onSendBroadcastPush} disabled={sending} tone="blue" styles={styles} />
    </AppCard>
  </View>;
}
