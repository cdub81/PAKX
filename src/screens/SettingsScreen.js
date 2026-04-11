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
  onChangeUsername,
  t,
  language,
  onChangeLanguage,
  showPushNotificationControls,
  showPushNotificationsPrompt,
  notificationSetupInFlight,
  onSetDesertStormVoteNotificationsEnabled,
  onSetDigNotificationsEnabled,
  onSetCalendarNotificationsEnabled,
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
  const calendarNotificationsEnabled = currentUser?.calendarNotificationsEnabled !== false;

  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [changeUsernameOpen, setChangeUsernameOpen] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [usernameMessage, setUsernameMessage] = useState("");
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  return <View style={styles.section}>
    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setAccountOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.account.eyebrow")} title={st("settings.account.title")} detail={st("settings.account.description")} styles={styles} />
          </View>
          <StatusBadge label={accountOpen ? st("common.open") : st("common.collapsed")} tone={accountOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {accountOpen ? <>
        <ListRow title={st("settings.account.accountLabel", { value: account?.username })} styles={styles} />
        <ListRow title={st("settings.account.allianceLabel", { value: alliance?.name })} styles={styles} />
        <ListRow title={st("settings.account.codeLabel", { value: alliance?.code })} styles={styles} />
        <ListRow title={st("settings.account.playerLabel", { value: currentUser?.name })} styles={styles} />
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setNotificationsOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.notifications.eyebrow")} title={st("settings.notifications.title")} detail={st("settings.notifications.description")} styles={styles} />
          </View>
          <StatusBadge label={notificationsOpen ? st("common.open") : st("common.collapsed")} tone={notificationsOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {notificationsOpen ? <>
        {showPushNotificationControls ? <Pressable onPress={() => onSetDesertStormVoteNotificationsEnabled(!notificationsEnabled)}>
          <ListRow title={st("settings.notifications.desertStormVoteAlerts.title")} detail={notificationsEnabled ? st("settings.notifications.desertStormVoteAlerts.enabled") : st("settings.notifications.desertStormVoteAlerts.disabled")} right={<StatusBadge label={notificationsEnabled ? st("settings.notifications.badgeEnabled") : st("settings.notifications.badgeDisabled")} tone={notificationsEnabled ? "success" : "neutral"} styles={styles} />} styles={styles} />
        </Pressable> : null}
        <Pressable onPress={() => onSetDigNotificationsEnabled(!digNotificationsEnabled)}>
          <ListRow title={st("settings.notifications.dig.title")} detail={digNotificationsEnabled ? st("settings.notifications.dig.enabled") : st("settings.notifications.dig.disabled")} right={<StatusBadge label={digNotificationsEnabled ? st("settings.notifications.badgeEnabled") : st("settings.notifications.badgeDisabled")} tone={digNotificationsEnabled ? "success" : "neutral"} styles={styles} />} styles={styles} />
        </Pressable>
        <Pressable onPress={() => onSetCalendarNotificationsEnabled(!calendarNotificationsEnabled)}>
          <ListRow title={st("settings.notifications.calendar.title")} detail={calendarNotificationsEnabled ? st("settings.notifications.calendar.enabled") : st("settings.notifications.calendar.disabled")} right={<StatusBadge label={calendarNotificationsEnabled ? st("settings.notifications.badgeEnabled") : st("settings.notifications.badgeDisabled")} tone={calendarNotificationsEnabled ? "success" : "neutral"} styles={styles} />} styles={styles} />
        </Pressable>
        {showPushNotificationControls && showPushNotificationsPrompt ? <AppCard style={styles.settingsNestedCard} styles={styles}>
          <Text style={styles.cardTitle}>{st("settings.notifications.enablePush.title")}</Text>
          <Text style={styles.hint}>{st("settings.notifications.enablePush.description")}</Text>
          <PrimaryButton label={notificationSetupInFlight ? st("settings.notifications.enablePush.buttonLoading") : st("settings.notifications.enablePush.button")} onPress={onEnablePushNotifications} disabled={notificationSetupInFlight} tone="blue" styles={styles} />
        </AppCard> : null}
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setLanguageOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.preferences.eyebrow")} title={st("settings.language.title")} detail={st("settings.language.description")} styles={styles} />
          </View>
          <StatusBadge label={languageOpen ? st("common.open") : st("common.collapsed")} tone={languageOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {languageOpen ? <LanguageSelector language={language} onChangeLanguage={onChangeLanguage} t={(key, values) => key === "language" ? st("settings.language.title", values) : t(key, values)} /> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => { setChangeUsernameOpen((v) => !v); setNewUsernameInput(account?.username || ""); setUsernameMessage(""); }}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.username.eyebrow")} title={st("settings.username.title")} detail={st("settings.username.description")} styles={styles} />
          </View>
          <StatusBadge label={changeUsernameOpen ? st("common.open") : st("common.collapsed")} tone={changeUsernameOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {changeUsernameOpen ? <>
        <TextInput value={newUsernameInput} onChangeText={setNewUsernameInput} style={styles.input} placeholder={st("settings.username.placeholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.hint}>{st("settings.username.hint")}</Text>
        {usernameMessage ? <Text style={styles.error}>{usernameMessage}</Text> : null}
        <PrimaryButton label={st("settings.username.button")} styles={styles} onPress={() => {
          setUsernameMessage("");
          const trimmed = newUsernameInput.trim();
          if (!trimmed) { setUsernameMessage(st("settings.username.errorEmpty")); return; }
          if (trimmed.length < 3) { setUsernameMessage(st("settings.username.errorMin")); return; }
          if (trimmed.length > 30) { setUsernameMessage(st("settings.username.errorMax")); return; }
          if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) { setUsernameMessage(st("settings.username.errorFormat")); return; }
          onChangeUsername(trimmed, (err, updatedUsername) => {
            if (err) {
              setUsernameMessage(err);
            } else {
              setNewUsernameInput("");
              setChangeUsernameOpen(false);
              Alert.alert(st("settings.username.successTitle"), st("settings.username.successMessage", { username: updatedUsername }));
            }
          });
        }} />
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setChangePasswordOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.password.eyebrow")} title={st("settings.password.title")} detail={st("settings.password.description")} styles={styles} />
          </View>
          <StatusBadge label={changePasswordOpen ? st("common.open") : st("common.collapsed")} tone={changePasswordOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {changePasswordOpen ? <>
        <TextInput value={currentPassword} onChangeText={setCurrentPassword} style={styles.input} placeholder={st("settings.password.currentPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} secureTextEntry autoCapitalize="none" />
        <TextInput value={newPassword} onChangeText={setNewPassword} style={styles.input} placeholder={st("settings.password.newPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} secureTextEntry autoCapitalize="none" />
        <TextInput value={confirmPassword} onChangeText={setConfirmPassword} style={styles.input} placeholder={st("settings.password.confirmPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} secureTextEntry autoCapitalize="none" />
        {passwordMessage ? <Text style={newPassword && confirmPassword && newPassword === confirmPassword && currentPassword ? styles.hint : styles.error}>{passwordMessage}</Text> : null}
        <PrimaryButton label={st("settings.password.button")} styles={styles} onPress={() => {
          setPasswordMessage("");
          if (!currentPassword) { setPasswordMessage(st("settings.password.errorCurrent")); return; }
          if (newPassword.length < 6) { setPasswordMessage(st("settings.password.errorMin")); return; }
          if (newPassword !== confirmPassword) { setPasswordMessage(st("settings.password.errorMismatch")); return; }
          onChangePassword({ currentPassword, newPassword }, (err) => {
            if (err) {
              setPasswordMessage(err);
            } else {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              setPasswordMessage("");
              setChangePasswordOpen(false);
              Alert.alert(st("settings.password.successTitle"), st("settings.password.successMessage"));
            }
          });
        }} />
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setSessionOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={st("settings.appControls.eyebrow")} title={st("settings.session.title")} detail={st("settings.session.description")} styles={styles} />
          </View>
          <StatusBadge label={sessionOpen ? st("common.open") : st("common.collapsed")} tone={sessionOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {sessionOpen ? <SecondaryButton label={st("settings.session.signOut")} onPress={onSignOut} styles={styles} /> : null}
    </AppCard>

    {!currentUserIsLeader ? <AppCard variant="danger" style={styles.settingsDangerCard} styles={styles}>
      <SectionHeader eyebrow={st("settings.danger.eyebrow")} title={st("settings.danger.title")} detail={st("settings.danger.description")} styles={styles} />
      <Text style={styles.hint}>{st("settings.danger.leaveAnyTime")}</Text>
      <Pressable style={styles.dangerButton} onPress={() => Alert.alert(st("settings.danger.leaveTitle"), st("settings.danger.leaveConfirm"), [{ text: st("common.cancel"), style: "cancel" }, { text: st("settings.danger.leaveButton"), style: "destructive", onPress: onLeaveAlliance }])}><Text style={styles.dangerButtonText}>{st("settings.danger.leaveButton")}</Text></Pressable>
    </AppCard> : null}
  </View>;
}
