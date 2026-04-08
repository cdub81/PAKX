import React, { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

export function SettingsScreen({
  alliance,
  account,
  currentUser,
  currentUserIsLeader,
  onLeaveAlliance,
  onSignOut,
  onChangePassword,
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

  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.hero.eyebrow")} title={st("settings.title")} detail={st("settings.hero.description")} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={currentUserIsLeader ? st("settings.hero.statusLeader") : st("settings.hero.statusMember")} tone={currentUserIsLeader ? "info" : "neutral"} styles={styles} />
      </View>
    </AppCard>

    {/* Account Info */}
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setAccountOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.account.eyebrow")} title={st("settings.account.title")} detail={st("settings.account.description")} styles={styles} />
          </View>
          <StatusBadge label={accountOpen ? "Open" : "Collapsed"} tone={accountOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {accountOpen ? <>
        <ListRow title={st("settings.account.accountLabel", { value: account?.username })} styles={styles} />
        <ListRow title={st("settings.account.allianceLabel", { value: alliance?.name })} styles={styles} />
        <ListRow title={st("settings.account.codeLabel", { value: alliance?.code })} styles={styles} />
        <ListRow title={st("settings.account.playerLabel", { value: currentUser?.name })} styles={styles} />
      </> : null}
    </AppCard>

    {/* Notifications */}
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setNotificationsOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.notifications.eyebrow")} title={st("settings.notifications.title")} detail={st("settings.notifications.description")} styles={styles} />
          </View>
          <StatusBadge label={notificationsOpen ? "Open" : "Collapsed"} tone={notificationsOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {notificationsOpen ? <>
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
      </> : null}
    </AppCard>

    {/* Language */}
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setLanguageOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.preferences.eyebrow")} title={st("settings.language.title")} detail={st("settings.language.description")} styles={styles} />
          </View>
          <StatusBadge label={languageOpen ? "Open" : "Collapsed"} tone={languageOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {languageOpen ? <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={(key, values) => key === "language" ? st("settings.language.title", values) : t(key, values)} /> : null}
    </AppCard>

    {/* Change Password */}
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setChangePasswordOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow="Account" title="Change Password" detail="Tap to expand and update your password." styles={styles} />
          </View>
          <StatusBadge label={changePasswordOpen ? "Open" : "Collapsed"} tone={changePasswordOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {changePasswordOpen ? <>
        <TextInput value={currentPassword} onChangeText={setCurrentPassword} style={styles.input} placeholder="Current password" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} secureTextEntry autoCapitalize="none" />
        <TextInput value={newPassword} onChangeText={setNewPassword} style={styles.input} placeholder="New password (min 6 characters)" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} secureTextEntry autoCapitalize="none" />
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} placeholder="Confirm new password" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} secureTextEntry autoCapitalize="none" />
        {passwordMessage ? <Text style={newPassword && confirmPassword && newPassword === confirmPassword && currentPassword ? styles.hint : styles.error}>{passwordMessage}</Text> : null}
        <PrimaryButton label="Update Password" styles={styles} onPress={() => {
          setPasswordMessage("");
          if (!currentPassword) { setPasswordMessage("Enter your current password."); return; }
          if (newPassword.length < 6) { setPasswordMessage("New password must be at least 6 characters."); return; }
          if (newPassword !== confirmPassword) { setPasswordMessage("Passwords do not match."); return; }
          onChangePassword({ currentPassword, newPassword }, (err) => {
            if (err) { setPasswordMessage(err); } else {
              setPasswordMessage("Password updated successfully.");
              setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
              setChangePasswordOpen(false);
            }
          });
        }} />
      </> : null}
    </AppCard>

    {/* Sign Out */}
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setSessionOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.appControls.eyebrow")} title={st("settings.session.title")} detail={st("settings.session.description")} styles={styles} />
          </View>
          <StatusBadge label={sessionOpen ? "Open" : "Collapsed"} tone={sessionOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {sessionOpen ? <SecondaryButton label={st("settings.session.signOut")} onPress={onSignOut} styles={styles} /> : null}
    </AppCard>

    {!currentUserIsLeader ? <AppCard variant="danger" style={styles.settingsDangerCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.danger.eyebrow")} title={st("settings.danger.title")} detail={st("settings.danger.description")} styles={styles} />
      <Text style={styles.hint}>{st("settings.danger.leaveAnyTime")}</Text>
      <Pressable style={styles.dangerButton} onPress={() => Alert.alert(st("settings.danger.leaveTitle"), st("settings.danger.leaveConfirm"), [{ text: st("common.cancel"), style: "cancel" }, { text: st("settings.danger.leaveButton"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{st("settings.danger.leaveButton")}</Text></Pressable>
    </AppCard>}
  </View>;
}
