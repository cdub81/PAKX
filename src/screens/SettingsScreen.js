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
  onSetDigNotificationsEnabled,
  onEnablePushNotifications,
  LanguageSelector,
  RankSelector,
  hasTranslationKey,
  styles
}) {
  const st = (key, values = {}) => {
    if (__DEV__ && language !== "en" && typeof hasTranslationKey === "function" && !hasTranslationKey(key)) {
      console.warn(`[SettingsScreen] Missing translation for ${language}: ${key}`);
    }
    return t(key, values);
  };
  const notificationsEnabled = currentUser?.desertStormVoteNotificationsEnabled !== false;
  const digNotificationsEnabled = currentUser?.digNotificationsEnabled !== false;

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.hero.eyebrow")} title={st("settings.title")} detail={st("settings.hero.description")} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={currentUserIsLeader ? st("settings.hero.statusLeader") : st("settings.hero.statusMember")} tone={currentUserIsLeader ? "info" : "neutral"} styles={styles} />
        <StatusBadge label={joinRequests?.length ? st("settings.hero.statusPending", { count: joinRequests.length }) : st("settings.hero.statusStable")} tone={joinRequests?.length ? "warning" : "success"} styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.account.eyebrow")} title={st("settings.account.title")} detail={st("settings.account.description")} styles={styles} />
      <ListRow title={st("settings.account.accountLabel", { value: account?.username })} styles={styles} />
      <ListRow title={st("settings.account.allianceLabel", { value: alliance?.name })} styles={styles} />
      <ListRow title={st("settings.account.codeLabel", { value: alliance?.code })} styles={styles} />
      <ListRow title={st("settings.account.playerLabel", { value: currentUser?.name })} styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.notifications.eyebrow")} title={st("settings.notifications.title")} detail={st("settings.notifications.description")} styles={styles} />
      {showPushNotificationControls ? <Pressable onPress={() => onSetDesertStormVoteNotificationsEnabled(!notificationsEnabled)}>
        <ListRow title={st("settings.notifications.desertStormVoteAlerts.title")} detail={notificationsEnabled ? st("settings.notifications.desertStormVoteAlerts.enabled") : st("settings.notifications.desertStormVoteAlerts.disabled")} right={<StatusBadge label={notificationsEnabled ? st("settings.notifications.badgeEnabled") : st("settings.notifications.badgeDisabled")} tone={notificationsEnabled ? "success" : "neutral"} styles={styles} />} styles={styles} />
      </Pressable> : null}
      <Pressable onPress={() => onSetDigNotificationsEnabled(!digNotificationsEnabled)}>
        <ListRow title={st("settings.notifications.dig.title")} detail={digNotificationsEnabled ? st("settings.notifications.dig.enabled") : st("settings.notifications.dig.disabled")} right={<StatusBadge label={digNotificationsEnabled ? st("settings.notifications.badgeEnabled") : st("settings.notifications.badgeDisabled")} tone={digNotificationsEnabled ? "success" : "neutral"} styles={styles} />} styles={styles} />
      </Pressable>
      {showPushNotificationControls && showPushNotificationsPrompt ? <AppCard style={styles.settingsNestedCard} styles={styles}>
        <Text style={styles.cardTitle}>{st("settings.notifications.enablePush.title")}</Text>
        <Text style={styles.hint}>{st("settings.notifications.enablePush.description")}</Text>
        <PrimaryButton label={notificationSetupInFlight ? st("settings.notifications.enablePush.buttonLoading") : st("settings.notifications.enablePush.button")} onPress={onEnablePushNotifications} disabled={notificationSetupInFlight} tone="blue" styles={styles} />
      </AppCard> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.preferences.eyebrow")} title={st("settings.language.title")} detail={st("settings.language.description")} styles={styles} />
      <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={(key, values) => key === "language" ? st("settings.language.title", values) : t(key, values)} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.appControls.eyebrow")} title={st("settings.session.title")} detail={st("settings.session.description")} styles={styles} />
      <SecondaryButton label={st("settings.session.signOut")} onPress={onSignOut} styles={styles} />
    </AppCard>

    {currentUserIsLeader ? <>
      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow={st("settings.requests.eyebrow")} title={st("settings.requests.title")} detail={st("settings.requests.description")} styles={styles} />
        {joinRequests?.length ? <View style={styles.settingsStack}>
          {joinRequests.map((req) => <AppCard key={req.id} style={styles.settingsNestedCard} styles={styles}>
            <Text style={styles.cardTitle}>{req.displayName}</Text>
            <Text style={styles.hint}>{st("settings.requests.requestedWithCode", { code: req.allianceCode })}</Text>
            <View style={styles.row}>
              <PrimaryButton label={st("settings.requests.approve")} onPress={() => onApproveJoinRequest(req.id)} style={styles.half} styles={styles} />
              <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onRejectJoinRequest(req.id)}><Text style={styles.dangerButtonText}>{st("settings.requests.reject")}</Text></Pressable>
            </View>
          </AppCard>)}
        </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{st("settings.requests.emptyTitle")}</Text><Text style={styles.hint}>{st("settings.requests.emptyDescription")}</Text></AppCard>}
      </AppCard>

      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow={st("settings.alliance.eyebrow")} title={st("settings.alliance.rotateCode")} detail={st("settings.alliance.description")} styles={styles} />
        <TextInput value={newAllianceCode} onChangeText={onChangeNewAllianceCode} style={styles.input} />
        <PrimaryButton label={st("settings.alliance.updateCode")} onPress={onRotateAllianceCode} styles={styles} />
      </AppCard>

      <AppCard style={styles.settingsSectionCard} styles={styles}>
        <SectionHeader eyebrow={st("settings.roster.eyebrow")} title={st("settings.roster.title")} detail={st("settings.roster.description")} styles={styles} />
        <TextInput value={newMemberName} onChangeText={onChangeNewMemberName} style={styles.input} placeholder={st("settings.roster.namePlaceholder")} />
        <Text style={styles.hint}>{st("settings.roster.powerHint")}</Text>
        <View style={styles.row}>
          <RankSelector value={newMemberRank} onChange={onChangeNewMemberRank} style={styles.half} />
          <TextInput value={newMemberPower} onChangeText={onChangeNewMemberPower} style={[styles.input, styles.half]} placeholder={st("settings.roster.powerPlaceholder")} keyboardType="decimal-pad" />
        </View>
        <PrimaryButton label={st("settings.roster.addMember")} onPress={onAddMember} styles={styles} />
      </AppCard>
    </> : <AppCard variant="danger" style={styles.settingsDangerCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.danger.eyebrow")} title={st("settings.danger.title")} detail={st("settings.danger.description")} styles={styles} />
      <Text style={styles.hint}>{st("settings.danger.leaveAnyTime")}</Text>
      <Pressable style={styles.dangerButton} onPress={() => Alert.alert(st("settings.danger.leaveTitle"), st("settings.danger.leaveConfirm"), [{ text: st("common.cancel"), style: "cancel" }, { text: st("settings.danger.leaveButton"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{st("settings.danger.leaveButton")}</Text></Pressable>
    </AppCard>}
  </View>;
}
