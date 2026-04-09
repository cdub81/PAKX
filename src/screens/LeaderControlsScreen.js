import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

export function LeaderControlsScreen({
  styles,
  alliance,
  history,
  reachability,
  currentUserPushDebug,
  pushRepairMessage,
  audience,
  onChangeAudience,
  selectedMemberIds,
  onToggleSelectedMemberId,
  memberSearchText,
  onChangeMemberSearchText,
  pushMessage,
  onChangePushMessage,
  onSendBroadcastPush,
  onSendLeadersDigPreset,
  onRepairMyNotifications,
  onRefreshPushDiagnostics,
  joinRequests,
  onApproveJoinRequest,
  onRejectJoinRequest,
  onResetMemberPassword,
  preSelectedPlayerId,
  onClearPreSelection,
  newMemberName,
  newMemberRank,
  newMemberPower,
  onChangeNewMemberName,
  onChangeNewMemberRank,
  onChangeNewMemberPower,
  onAddMember,
  newAllianceCode,
  onChangeNewAllianceCode,
  onRotateAllianceCode,
  RankSelector,
  sending,
  notificationSetupInFlight,
  currentUserHasPushToken,
  t
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [reachabilityOpen, setReachabilityOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);
  const [passwordResetSearch, setPasswordResetSearch] = useState("");
  const [joinRequestsOpen, setJoinRequestsOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [rotateCodeOpen, setRotateCodeOpen] = useState(false);
  const preSelectionHandled = useRef(null);

  useEffect(() => {
    if (!preSelectedPlayerId) return;
    if (preSelectionHandled.current === preSelectedPlayerId) return;
    preSelectionHandled.current = preSelectedPlayerId;
    const players = Array.isArray(alliance?.players) ? alliance.players : [];
    const member = players.find((p) => p.id === preSelectedPlayerId);
    if (!member) return;
    // Small delay to allow screen to render before showing alert
    const timer = setTimeout(() => {
      Alert.alert(
        `Reset password for ${member.name}?`,
        "They requested a new temporary password. This will generate one you can share with them.",
        [
          { text: "Cancel", style: "cancel", onPress: () => { if (typeof onClearPreSelection === "function") onClearPreSelection(); } },
          {
            text: "Reset Password",
            style: "destructive",
            onPress: () => {
              if (typeof onResetMemberPassword === "function") onResetMemberPassword(member.id, member.name);
              if (typeof onClearPreSelection === "function") onClearPreSelection();
            }
          }
        ]
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [preSelectedPlayerId, alliance?.players]);

  const filteredMembers = useMemo(() => {
    const query = String(memberSearchText || "").trim().toLowerCase();
    const members = Array.isArray(alliance?.players) ? alliance.players : [];
    return [...members]
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
      .filter((member) => !query || String(member?.name || "").toLowerCase().includes(query) || String(member?.rank || "").toLowerCase().includes(query));
  }, [alliance?.players, memberSearchText]);

  const selectedCount = Array.isArray(selectedMemberIds) ? selectedMemberIds.length : 0;
  const pushHistory = Array.isArray(history) ? history : [];
  const reachabilityMembers = Array.isArray(reachability?.members) ? reachability.members : [];
  const unreachableWithoutToken = Array.isArray(reachability?.withoutPushToken) ? reachability.withoutPushToken : [];
  const unreachableOptedOut = Array.isArray(reachability?.optedOut) ? reachability.optedOut : [];
  const hasReachabilityIssues = unreachableWithoutToken.length > 0 || unreachableOptedOut.length > 0;

  const formatHistoryTimestamp = (value) => {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return t("leaderControls.history.unknownTime");
    }
    return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };

  const getReachabilityStatusLabel = (status) => t(`leaderControls.reachability.status.${status || "no_push_token_saved"}`);

  const formatLastSynced = (value) => {
    if (!value) {
      return t("leaderControls.repair.none");
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return t("leaderControls.repair.none");
    }
    return t("leaderControls.reachability.lastSynced", {
      value: `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    });
  };

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow={t("leaderControls.hero.eyebrow")} title={t("leaderControls.hero.title")} detail={t("leaderControls.hero.description")} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={t("leaderControls.hero.badgeLeaderOnly")} tone="warning" styles={styles} />
        <StatusBadge label={currentUserHasPushToken ? t("leaderControls.hero.badgePushReady") : t("leaderControls.hero.badgePushLimited")} tone={currentUserHasPushToken ? "success" : "info"} styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("leaderControls.presets.eyebrow")} title={t("leaderControls.presets.title")} detail={t("leaderControls.presets.description")} styles={styles} />
      <View style={styles.cardHeaderRow}>
        <Text style={styles.hint}>{t("leaderControls.presets.digHint")}</Text>
        <StatusBadge label={t("leaderControls.presets.memberCount", { count: (alliance?.players || []).length })} tone="info" styles={styles} />
      </View>
      <PrimaryButton label={sending ? t("leaderControls.common.sending") : t("leaderControls.presets.digButton")} onPress={onSendLeadersDigPreset} disabled={sending || !(alliance?.players || []).length} tone="blue" styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setJoinRequestsOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={t("settings.requests.eyebrow")} title={t("settings.requests.title")} detail={t("settings.requests.description")} styles={styles} />
          </View>
          <View style={styles.row}>
            {joinRequests?.length ? <StatusBadge label={`${joinRequests.length} pending`} tone="warning" styles={styles} /> : null}
            <StatusBadge label={joinRequestsOpen ? "Open" : "Collapsed"} tone={joinRequestsOpen ? "success" : "neutral"} styles={styles} />
          </View>
        </View>
      </Pressable>
      {joinRequestsOpen ? <>
        {joinRequests?.length ? <View style={styles.settingsStack}>
          {joinRequests.map((req) => <AppCard key={req.id} style={styles.settingsNestedCard} styles={styles}>
            <Text style={styles.cardTitle}>{req.displayName}</Text>
            <Text style={styles.hint}>{t("settings.requests.requestedWithCode", { code: req.allianceCode })}</Text>
            <View style={styles.row}>
              <PrimaryButton label={t("settings.requests.approve")} onPress={() => onApproveJoinRequest(req.id)} style={styles.half} styles={styles} />
              <Pressable style={[styles.dangerButton, styles.half]} onPress={() => onRejectJoinRequest(req.id)}><Text style={styles.dangerButtonText}>{t("settings.requests.reject")}</Text></Pressable>
            </View>
          </AppCard>)}
        </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{t("settings.requests.emptyTitle")}</Text><Text style={styles.hint}>{t("settings.requests.emptyDescription")}</Text></AppCard>}
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setRepairOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={t("leaderControls.repair.eyebrow")} title={t("leaderControls.repair.title")} detail={t("leaderControls.repair.description")} styles={styles} />
          </View>
          <StatusBadge label={repairOpen ? "Open" : "Collapsed"} tone={repairOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {repairOpen ? <>
        <View style={styles.settingsStack}>
          <ListRow title={t("leaderControls.repair.permission")} detail={String(currentUserPushDebug?.permissionStatus || "unknown")} styles={styles} />
          <ListRow title={t("leaderControls.repair.token")} detail={String(currentUserPushDebug?.tokenFetchStatus || "not_attempted")} styles={styles} />
          <ListRow title={t("leaderControls.repair.database")} detail={String(currentUserPushDebug?.databaseSyncStatus || "skipped")} styles={styles} />
          <ListRow title={t("leaderControls.repair.lastSynced")} detail={formatLastSynced(currentUserPushDebug?.lastSyncedAt)} styles={styles} />
          <ListRow title={t("leaderControls.repair.lastError")} detail={currentUserPushDebug?.lastError || t("leaderControls.repair.none")} styles={styles} />
        </View>
        {pushRepairMessage ? <Text style={styles.hint}>{pushRepairMessage}</Text> : null}
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half]} onPress={onRefreshPushDiagnostics}>
            <Text style={styles.secondaryButtonText}>{t("leaderControls.repair.refresh")}</Text>
          </Pressable>
          <PrimaryButton label={notificationSetupInFlight ? t("leaderControls.common.sending") : t("leaderControls.repair.button")} onPress={onRepairMyNotifications} disabled={notificationSetupInFlight} tone="blue" styles={styles} style={styles.half} />
        </View>
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setReachabilityOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={t("leaderControls.reachability.eyebrow")} title={t("leaderControls.reachability.title")} detail={t("leaderControls.reachability.description")} styles={styles} />
          </View>
          <View style={styles.row}>
            {hasReachabilityIssues ? <StatusBadge label="Issues" tone="warning" styles={styles} /> : <StatusBadge label="All Good" tone="success" styles={styles} />}
            <StatusBadge label={reachabilityOpen ? "Open" : "Collapsed"} tone={reachabilityOpen ? "success" : "neutral"} styles={styles} />
          </View>
        </View>
      </Pressable>
      {reachabilityOpen ? <>
        <View style={styles.row}>
          <StatusBadge label={t("leaderControls.reachability.reachableMembers", { count: Number(reachability?.reachableMembers || 0) })} tone="success" styles={styles} />
          <StatusBadge label={t("leaderControls.reachability.reachableDevices", { count: Number(reachability?.reachableDeviceCount || 0) })} tone="info" styles={styles} />
        </View>
        <View style={styles.row}>
          <StatusBadge label={t("leaderControls.reachability.noToken", { count: unreachableWithoutToken.length })} tone={unreachableWithoutToken.length ? "warning" : "neutral"} styles={styles} />
          <StatusBadge label={t("leaderControls.reachability.optedOut", { count: unreachableOptedOut.length })} tone={unreachableOptedOut.length ? "warning" : "neutral"} styles={styles} />
        </View>
        {hasReachabilityIssues ? <View style={styles.settingsStack}>
          {reachabilityMembers.filter((member) => member.status !== "push_ready").map((member) => <AppCard key={`reachability-${member.id}`} style={styles.settingsNestedCard} styles={styles}>
            <ListRow
              title={member.name}
              detail={member.rank}
              right={<StatusBadge label={member.status === "opted_out" ? "Opted Out" : "No Token"} tone={member.status === "opted_out" ? "warning" : "danger"} styles={styles} />}
              styles={styles}
            />
            <Text style={styles.hint}>{getReachabilityStatusLabel(member.status)}</Text>
            {member.lastError ? <Text style={styles.hint}>{member.lastError}</Text> : null}
            <Text style={styles.hint}>{formatLastSynced(member.lastSyncedAt)}</Text>
          </AppCard>)}
        </View> : <Text style={styles.hint}>{t("leaderControls.reachability.noIssues")}</Text>}
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setPasswordResetOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow="Leader Controls" title="Member Password Reset" detail="Tap to expand and generate a temporary password for a locked-out member." styles={styles} />
          </View>
          <StatusBadge label={passwordResetOpen ? "Open" : "Collapsed"} tone={passwordResetOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {passwordResetOpen ? <>
        <TextInput
          value={passwordResetSearch}
          onChangeText={setPasswordResetSearch}
          style={styles.input}
          placeholder="Search members..."
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          selectionColor={INPUT_SELECTION_COLOR}
        />
        <View style={styles.settingsStack}>
          {(alliance?.players || [])
            .filter((m) => {
              const q = passwordResetSearch.trim().toLowerCase();
              return !q || m.name.toLowerCase().includes(q) || String(m.rank || "").toLowerCase().includes(q);
            })
            .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
            .map((member) => (
              <AppCard key={member.id} style={styles.settingsNestedCard} styles={styles}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.flexOne}>
                    <Text style={styles.cardTitle}>{member.name}</Text>
                    <Text style={styles.hint}>{member.rank}</Text>
                  </View>
                  <PrimaryButton label="Reset Password" tone="blue" styles={styles} onPress={() => onResetMemberPassword(member.id, member.name)} />
                </View>
              </AppCard>
            ))}
        </View>
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setAddMemberOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow="Roster Management" title="Add Member" detail="Tap to expand and add a new member to your alliance." styles={styles} />
          </View>
          <StatusBadge label={addMemberOpen ? "Open" : "Collapsed"} tone={addMemberOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {addMemberOpen ? <>
        <TextInput value={newMemberName} onChangeText={onChangeNewMemberName} style={styles.input} placeholder="Member name" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} />
        <Text style={styles.hint}>Enter power in millions (e.g. 12,700,000 = 12.7)</Text>
        <View style={styles.row}>
          <RankSelector value={newMemberRank} onChange={onChangeNewMemberRank} style={styles.half} />
          <TextInput value={newMemberPower} onChangeText={onChangeNewMemberPower} style={[styles.input, styles.half]} placeholder="Power (M)" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} keyboardType="decimal-pad" />
        </View>
        <PrimaryButton label="Add Member" onPress={onAddMember} tone="blue" styles={styles} />
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setRotateCodeOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow="Alliance Management" title="Alliance Code" detail="Tap to expand and update your alliance join code." styles={styles} />
          </View>
          <StatusBadge label={rotateCodeOpen ? "Open" : "Collapsed"} tone={rotateCodeOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {rotateCodeOpen ? <>
        <TextInput value={newAllianceCode} onChangeText={onChangeNewAllianceCode} style={styles.input} placeholder="New alliance code" placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} autoCapitalize="characters" />
        <PrimaryButton label="Update Code" onPress={onRotateAllianceCode} tone="blue" styles={styles} />
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setBroadcastOpen((v) => !v)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={t("leaderControls.broadcast.eyebrow")} title={audience === "selected" ? t("leaderControls.broadcast.titleSelected") : t("leaderControls.broadcast.titleAll")} detail={t("leaderControls.broadcast.description")} styles={styles} />
          </View>
          <StatusBadge label={broadcastOpen ? "Open" : "Collapsed"} tone={broadcastOpen ? "success" : "neutral"} styles={styles} />
        </View>
      </Pressable>
      {broadcastOpen ? <>
        <View style={styles.row}>
          <Pressable style={[styles.secondaryButton, styles.half, audience === "all" && styles.modeButtonActive]} onPress={() => onChangeAudience("all")}>
            <Text style={[styles.secondaryButtonText, audience === "all" && styles.modeButtonTextActive]}>{t("leaderControls.broadcast.audienceAll")}</Text>
          </Pressable>
          <Pressable style={[styles.secondaryButton, styles.half, audience === "selected" && styles.modeButtonActive]} onPress={() => onChangeAudience("selected")}>
            <Text style={[styles.secondaryButtonText, audience === "selected" && styles.modeButtonTextActive]}>{t("leaderControls.broadcast.audienceSelected")}</Text>
          </Pressable>
        </View>
        {audience === "selected" ? <AppCard style={styles.settingsNestedCard} styles={styles}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{t("leaderControls.broadcast.selectedTitle")}</Text>
            <StatusBadge label={t("leaderControls.broadcast.selectedCount", { count: selectedCount })} tone={selectedCount ? "success" : "neutral"} styles={styles} />
          </View>
          <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder={t("leaderControls.broadcast.searchPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} />
          <View style={styles.settingsStack}>
            {filteredMembers.length
              ? filteredMembers.map((member) => {
                const selected = selectedMemberIds.includes(member.id);
                return <Pressable key={member.id} onPress={() => onToggleSelectedMemberId(member.id)}>
                  <AppCard style={styles.settingsNestedCard} styles={styles}>
                    <ListRow title={member.name} detail={`${member.rank} • ${Number(member.overallPower || 0).toFixed(2)}M`} right={<StatusBadge label={selected ? t("leaderControls.broadcast.memberSelected") : t("leaderControls.broadcast.memberTapToAdd")} tone={selected ? "success" : "info"} styles={styles} />} styles={styles} />
                  </AppCard>
                </Pressable>;
              })
              : <AppCard style={styles.calendarEmptyCard} styles={styles}>
                <Text style={styles.statusTitle}>{t("leaderControls.broadcast.noMembersTitle")}</Text>
                <Text style={styles.hint}>{t("leaderControls.broadcast.noMembersDescription")}</Text>
              </AppCard>}
          </View>
        </AppCard> : null}
        <TextInput value={pushMessage} onChangeText={onChangePushMessage} style={[styles.input, styles.textArea]} placeholder={t("leaderControls.broadcast.messagePlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} multiline />
        <Text style={styles.hint}>{audience === "selected" ? t("leaderControls.broadcast.selectedHint") : t("leaderControls.broadcast.allHint")}</Text>
        <PrimaryButton label={sending ? t("leaderControls.common.sending") : t("leaderControls.broadcast.sendButton")} onPress={onSendBroadcastPush} disabled={sending} tone="blue" styles={styles} />
      </> : null}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setHistoryOpen((value) => !value)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow={t("leaderControls.history.eyebrow")} title={t("leaderControls.history.title")} detail={historyOpen ? t("leaderControls.history.openDetail") : t("leaderControls.history.closedDetail")} styles={styles} />
          </View>
          <View style={styles.row}>
            <StatusBadge label={pushHistory.length ? t("leaderControls.history.loggedCount", { count: pushHistory.length }) : t("leaderControls.history.emptyBadge")} tone={pushHistory.length ? "info" : "neutral"} styles={styles} />
            <StatusBadge label={historyOpen ? t("leaderControls.history.openBadge") : t("leaderControls.history.closedBadge")} tone={historyOpen ? "success" : "neutral"} styles={styles} />
          </View>
        </View>
      </Pressable>
      {historyOpen ? <View style={styles.settingsStack}>
        {pushHistory.length
          ? pushHistory.map((entry) => <AppCard key={entry.id || `${entry.createdAt}-${entry.senderPlayerId}`} style={styles.settingsNestedCard} styles={styles}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.flexOne}>
                <Text style={styles.cardTitle}>{entry.senderName || t("leaderControls.history.unknownSender")}</Text>
                <Text style={styles.hint}>{formatHistoryTimestamp(entry.createdAt)}</Text>
              </View>
              <View style={styles.row}>
                {entry.preset === "dig" ? <StatusBadge label="dig" tone="warning" styles={styles} /> : null}
                <StatusBadge label={entry.audience === "selected" ? t("leaderControls.history.audienceSelected") : t("leaderControls.history.audienceAll")} tone={entry.audience === "selected" ? "info" : "success"} styles={styles} />
              </View>
            </View>
            <Text style={styles.statusTitle}>{entry.message || t("leaderControls.history.noMessage")}</Text>
            <Text style={styles.hint}>
              {entry.targetedDevices === 1 ? t("leaderControls.history.oneDeviceTargeted") : t("leaderControls.history.devicesTargeted", { count: Number(entry.targetedDevices || 0) })}
              {entry.audience === "selected" && Array.isArray(entry.memberIds) && entry.memberIds.length ? ` • ${t("leaderControls.history.membersSelected", { count: entry.memberIds.length })}` : ""}
            </Text>
          </AppCard>)
          : <AppCard style={styles.calendarEmptyCard} styles={styles}>
            <Text style={styles.statusTitle}>{t("leaderControls.history.noHistoryTitle")}</Text>
            <Text style={styles.hint}>{t("leaderControls.history.noHistoryDescription")}</Text>
          </AppCard>}
      </View> : null}
    </AppCard>
  </View>;
}
