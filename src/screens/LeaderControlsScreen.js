import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AppCard, ListRow, PrimaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function LeaderControlsScreen({
  styles,
  alliance,
  history,
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
  currentUserHasPushToken
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

  const formatHistoryTimestamp = (value) => {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return "Unknown time";
    }
    return `${parsed.toLocaleDateString()} ${parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };

  return <View style={styles.section}>
    <AppCard style={styles.settingsHeroCard} styles={styles}>
      <SectionHeader eyebrow="Leader Controls" title="Alliance Broadcasts" detail="Use leader-only tools to communicate quickly across the alliance without changing existing event workflows." styles={styles} />
      <View style={styles.row}>
        <StatusBadge label="Leader Only" tone="warning" styles={styles} />
        <StatusBadge label={currentUserHasPushToken ? "Push Ready" : "Push Limited"} tone={currentUserHasPushToken ? "success" : "info"} styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="Quick Presets" title="All-member shortcuts" detail="Use a preset when you need to notify the full alliance without typing a custom message." styles={styles} />
      <View style={styles.cardHeaderRow}>
        <Text style={styles.hint}>This preset sends the exact message `dig` to all members who have not opted out.</Text>
        <StatusBadge label={`${(alliance?.players || []).length} Members`} tone="info" styles={styles} />
      </View>
      <PrimaryButton label={sending ? "Sending..." : "Send \"dig\" to All Members"} onPress={onSendLeadersDigPreset} disabled={sending || !(alliance?.players || []).length} tone="blue" styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <SectionHeader eyebrow="Push Notification" title={audience === "selected" ? "Send to specific members" : "Send to all members"} detail="Use the current alliance push flow, but choose whether this notification goes to everyone or only selected members." styles={styles} />
      <View style={styles.row}>
        <Pressable style={[styles.secondaryButton, styles.half, audience === "all" && styles.modeButtonActive]} onPress={() => onChangeAudience("all")}>
          <Text style={[styles.secondaryButtonText, audience === "all" && styles.modeButtonTextActive]}>All Members</Text>
        </Pressable>
        <Pressable style={[styles.secondaryButton, styles.half, audience === "selected" && styles.modeButtonActive]} onPress={() => onChangeAudience("selected")}>
          <Text style={[styles.secondaryButtonText, audience === "selected" && styles.modeButtonTextActive]}>Specific Members</Text>
        </Pressable>
      </View>
      {audience === "selected" ? <AppCard style={styles.settingsNestedCard} styles={styles}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Selected Members</Text>
          <StatusBadge label={`${selectedCount} Selected`} tone={selectedCount ? "success" : "neutral"} styles={styles} />
        </View>
        <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder="Search members by name or rank" />
        <View style={styles.settingsStack}>
          {filteredMembers.length
            ? filteredMembers.map((member) => {
              const selected = selectedMemberIds.includes(member.id);
              return <Pressable key={member.id} onPress={() => onToggleSelectedMemberId(member.id)}>
                <AppCard style={styles.settingsNestedCard} styles={styles}>
                  <ListRow title={member.name} detail={`${member.rank} • ${Number(member.overallPower || 0).toFixed(2)}M`} right={<StatusBadge label={selected ? "Selected" : "Tap to add"} tone={selected ? "success" : "info"} styles={styles} />} styles={styles} />
                </AppCard>
              </Pressable>;
            })
            : <AppCard style={styles.calendarEmptyCard} styles={styles}>
              <Text style={styles.statusTitle}>No members found</Text>
              <Text style={styles.hint}>Adjust the search to find alliance members to notify.</Text>
            </AppCard>}
        </View>
      </AppCard> : null}
      <TextInput value={pushMessage} onChangeText={onChangePushMessage} style={[styles.input, styles.textArea]} placeholder="Enter the note you want to send to the alliance." multiline />
      <Text style={styles.hint}>{audience === "selected" ? "Only the selected members with registered push-enabled devices will receive this alert." : "This sends a direct alliance-wide alert using the current Expo push-token setup. Devices without registered push tokens will not receive it."}</Text>
      <PrimaryButton label={sending ? "Sending..." : "Send Push Notification"} onPress={onSendBroadcastPush} disabled={sending} tone="blue" styles={styles} />
    </AppCard>

    <AppCard style={styles.settingsSectionCard} styles={styles}>
      <Pressable onPress={() => setHistoryOpen((value) => !value)}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.flexOne}>
            <SectionHeader eyebrow="History" title="Recent Pushes" detail={historyOpen ? "Tap to hide recent push history." : "Tap to open the recent push history folder."} styles={styles} />
          </View>
          <View style={styles.row}>
            <StatusBadge label={pushHistory.length ? `${pushHistory.length} Logged` : "Empty"} tone={pushHistory.length ? "info" : "neutral"} styles={styles} />
            <StatusBadge label={historyOpen ? "Open" : "Closed"} tone={historyOpen ? "success" : "neutral"} styles={styles} />
          </View>
        </View>
      </Pressable>
      {historyOpen ? <View style={styles.settingsStack}>
        {pushHistory.length
          ? pushHistory.map((entry) => <AppCard key={entry.id || `${entry.createdAt}-${entry.senderPlayerId}`} style={styles.settingsNestedCard} styles={styles}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.flexOne}>
                <Text style={styles.cardTitle}>{entry.senderName || "Unknown sender"}</Text>
                <Text style={styles.hint}>{formatHistoryTimestamp(entry.createdAt)}</Text>
              </View>
              <View style={styles.row}>
                {entry.preset === "dig" ? <StatusBadge label="dig" tone="warning" styles={styles} /> : null}
                <StatusBadge label={entry.audience === "selected" ? "Selected" : "All"} tone={entry.audience === "selected" ? "info" : "success"} styles={styles} />
              </View>
            </View>
            <Text style={styles.statusTitle}>{entry.message || "No message recorded"}</Text>
            <Text style={styles.hint}>
              {entry.targetedDevices === 1 ? "1 device targeted" : `${Number(entry.targetedDevices || 0)} devices targeted`}
              {entry.audience === "selected" && Array.isArray(entry.memberIds) && entry.memberIds.length ? ` • ${entry.memberIds.length} members selected` : ""}
            </Text>
          </AppCard>)
          : <AppCard style={styles.calendarEmptyCard} styles={styles}>
            <Text style={styles.statusTitle}>No push history yet</Text>
            <Text style={styles.hint}>New broadcasts and dig presets will appear here after they are sent.</Text>
          </AppCard>}
      </View> : null}
    </AppCard>
  </View>;
}
