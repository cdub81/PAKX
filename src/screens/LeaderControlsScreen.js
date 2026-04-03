import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function LeaderControlsScreen({
  styles,
  alliance,
  history,
  reachability,
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
  sending,
  currentUserHasPushToken,
  t
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const filteredMembers = useMemo(() => {
    const query = String(memberSearchText || "").trim().toLowerCase();
    const members = Array.isArray(alliance?.players) ? alliance.players : [];
    return [...members]
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")))
      .filter((member) => !query || String(member?.name || "").toLowerCase().includes(query) || String(member?.rank || "").toLowerCase().includes(query));
  }, [alliance?.players, memberSearchText]);

  const selectedCount = Array.isArray(selectedMemberIds) ? selectedMemberIds.length : 0;
  const pushHistory = Array.isArray(history) ? history : [];
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
      <SectionHeader eyebrow={t("leaderControls.reachability.eyebrow")} title={t("leaderControls.reachability.title")} detail={t("leaderControls.reachability.description")} styles={styles} />
      <View style={styles.row}>
        <StatusBadge label={t("leaderControls.reachability.reachableMembers", { count: Number(reachability?.reachableMembers || 0) })} tone="success" styles={styles} />
        <StatusBadge label={t("leaderControls.reachability.reachableDevices", { count: Number(reachability?.reachableDeviceCount || 0) })} tone="info" styles={styles} />
      </View>
      <View style={styles.row}>
        <StatusBadge label={t("leaderControls.reachability.noToken", { count: unreachableWithoutToken.length })} tone={unreachableWithoutToken.length ? "warning" : "neutral"} styles={styles} />
        <StatusBadge label={t("leaderControls.reachability.optedOut", { count: unreachableOptedOut.length })} tone={unreachableOptedOut.length ? "warning" : "neutral"} styles={styles} />
      </View>
      {hasReachabilityIssues ? <View style={styles.settingsStack}>
        {unreachableWithoutToken.length ? <AppCard style={styles.settingsNestedCard} styles={styles}>
          <Text style={styles.cardTitle}>{t("leaderControls.reachability.noTokenTitle")}</Text>
          <View style={styles.settingsStack}>
            {unreachableWithoutToken.map((member) => <ListRow key={`no-token-${member.id}`} title={member.name} detail={`${member.rank} - ${t("leaderControls.reachability.noTokenReason")}`} styles={styles} />)}
          </View>
        </AppCard> : null}
        {unreachableOptedOut.length ? <AppCard style={styles.settingsNestedCard} styles={styles}>
          <Text style={styles.cardTitle}>{t("leaderControls.reachability.optedOutTitle")}</Text>
          <View style={styles.settingsStack}>
            {unreachableOptedOut.map((member) => <ListRow key={`opted-out-${member.id}`} title={member.name} detail={`${member.rank} - ${t("leaderControls.reachability.optedOutReason")}`} styles={styles} />)}
          </View>
        </AppCard> : null}
      </View> : <Text style={styles.hint}>{t("leaderControls.reachability.noIssues")}</Text>}
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("leaderControls.broadcast.eyebrow")} title={audience === "selected" ? t("leaderControls.broadcast.titleSelected") : t("leaderControls.broadcast.titleAll")} detail={t("leaderControls.broadcast.description")} styles={styles} />
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
        <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder={t("leaderControls.broadcast.searchPlaceholder")} />
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
      <TextInput value={pushMessage} onChangeText={onChangePushMessage} style={[styles.input, styles.textArea]} placeholder={t("leaderControls.broadcast.messagePlaceholder")} multiline />
      <Text style={styles.hint}>{audience === "selected" ? t("leaderControls.broadcast.selectedHint") : t("leaderControls.broadcast.allHint")}</Text>
      <PrimaryButton label={sending ? t("leaderControls.common.sending") : t("leaderControls.broadcast.sendButton")} onPress={onSendBroadcastPush} disabled={sending} tone="blue" styles={styles} />
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
