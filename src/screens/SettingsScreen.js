import React from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function SettingsScreen({
  alliance,
  account,
  currentUser,
  currentUserIsLeader,
  joinRequests,
  newMemberName,
  newMemberRank,
  newMemberPower,
  newAllianceCode,
  onChangeNewMemberName,
  onChangeNewMemberRank,
  onChangeNewMemberPower,
  onChangeNewAllianceCode,
  onAddMember,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onLeaveAlliance,
  onRotateAllianceCode,
  onSignOut,
  t,
  language,
  onChangeLanguage,
  showPushNotificationControls,
  showPushNotificationsPrompt,
  notificationSetupInFlight,
  onSetDesertStormVoteNotificationsEnabled,
  onEnablePushNotifications,
  LanguageSelector,
  RankSelector,
  powerInputHint,
  styles
}) {
  const notificationsEnabled = currentUser?.desertStormVoteNotificationsEnabled !== false;

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow="Settings" title={t("allianceTitle")} detail="Manage account context, app preferences, alerts, and alliance controls from grouped sections." styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={currentUserIsLeader ? "Leader Access" : "Member Access"} tone={currentUserIsLeader ? "info" : "neutral"} styles={styles} />
        <StatusBadge label={joinRequests?.length ? `${joinRequests.length} Pending` : "Stable"} tone={joinRequests?.length ? "warning" : "success"} styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="Account" title="Signed-in context" detail="Current account, alliance, and player identity are grouped here for quick reference." styles={styles} />
      <ListRow title={t("accountLabel", { value: account?.username })} styles={styles} />
      <ListRow title={t("allianceLabel", { value: alliance?.name })} styles={styles} />
      <ListRow title={t("codeLabel", { value: alliance?.code })} styles={styles} />
      <ListRow title={t("signedInAsPlayer", { value: currentUser?.name })} styles={styles} />
    </AppCard>

    {showPushNotificationControls ? <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="Notifications" title="Desert Storm alerts" detail="Manage vote-open alert preferences without changing reminder or event logic." styles={styles} />
      <Pressable onPress={() => onSetDesertStormVoteNotificationsEnabled(!notificationsEnabled)}>
        <ListRow title="Desert Storm vote alerts" detail={notificationsEnabled ? "Enabled for your account." : "Disabled for your account."} right={<StatusBadge label={notificationsEnabled ? "Enabled" : "Disabled"} tone={notificationsEnabled ? "success" : "neutral"} styles={styles} />} styles={styles} />
      </Pressable>
      {showPushNotificationsPrompt ? <AppCard style={styles.settingsNestedCard} styles={styles}>
        <Text style={styles.cardTitle}>Enable push notifications</Text>
        <Text style={styles.hint}>Turn on device notifications to receive Desert Storm vote alerts on this device.</Text>
        <PrimaryButton label={notificationSetupInFlight ? "Enabling..." : "Enable Notifications"} onPress={onEnablePushNotifications} disabled={notificationSetupInFlight} tone="blue" styles={styles} />
      </AppCard> : null}
    </AppCard> : null}

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="Preferences" title="Language" detail="Update app-level preferences without changing alliance data." styles={styles} />
      <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={t} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="App Controls" title="Session and device actions" detail="Keep account-level controls separated from alliance management actions." styles={styles} />
      <SecondaryButton label={t("signOut")} onPress={onSignOut} styles={styles} />
    </AppCard>

    {currentUserIsLeader ? <>
      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow="Requests" title={t("pendingJoinRequests")} detail="Approve or reject new join requests without leaving the settings workflow." styles={styles} />
        {joinRequests?.length ? <View style={styles.settingsStack}>
          {joinRequests.map((req) => <AppCard key={req.id} style={styles.settingsNestedCard} styles={styles}>
            <Text style={styles.cardTitle}>{req.displayName}</Text>
            <Text style={styles.hint}>{t("requestedWithCode", { code: req.allianceCode })}</Text>
            <View style={styles.row}>
              <PrimaryButton label={t("approve")} onPress={() => onApproveJoinRequest(req.id)} style={styles.half} styles={styles} />
              <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onRejectJoinRequest(req.id)}><Text style={styles.dangerButtonText}>{t("reject")}</Text></Pressable>
            </View>
          </AppCard>)}
        </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{t("noPendingRequests")}</Text><Text style={styles.hint}>New join requests will appear here when they are ready for review.</Text></AppCard>}
      </AppCard>

      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow="Alliance" title={t("rotateCode")} detail="Rotate or update the alliance code with a single clear action." styles={styles} />
        <TextInput value={newAllianceCode} onChangeText={onChangeNewAllianceCode} style={styles.input} />
        <PrimaryButton label={t("updateCode")} onPress={onRotateAllianceCode} styles={styles} />
      </AppCard>

      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow="Roster" title={t("addMember")} detail="Leaders can add members directly from settings without changing roster behavior." styles={styles} />
        <TextInput value={newMemberName} onChangeText={onChangeNewMemberName} style={styles.input} placeholder={t("name")} />
        <Text style={styles.hint}>{powerInputHint}</Text>
        <View style={styles.row}>
          <RankSelector value={newMemberRank} onChange={onChangeNewMemberRank} style={styles.half} />
          <TextInput value={newMemberPower} onChangeText={onChangeNewMemberPower} style={[styles.input, styles.half]} placeholder={t("power")} keyboardType="decimal-pad" />
        </View>
        <PrimaryButton label={t("addMember")} onPress={onAddMember} styles={styles} />
      </AppCard>
    </> : <AppCard variant="danger" style={styles.settingsDangerCard} styles={styles}>
      <SectionHeader eyebrow="Danger Zone" title={t("memberOptions")} detail="Important account and alliance actions are isolated here so they stay clear but restrained." styles={styles} />
      <Text style={styles.hint}>{t("leaveAnyTime")}</Text>
      <Pressable style={styles.dangerButton} onPress={() => Alert.alert(t("leaveAllianceTitle"), t("leaveAllianceConfirm"), [{ text: t("cancel"), style: "cancel" }, { text: t("leave"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{t("leaveAlliance")}</Text></Pressable>
    </AppCard>}
  </View>;
}
