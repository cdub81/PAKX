import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { AppCard, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function MembersScreen({
  players,
  memberSearchText,
  memberSortMode,
  memberRankFilter,
  onChangeMemberSearchText,
  onChangeMemberSortMode,
  onChangeMemberRankFilter,
  currentUserIsLeader,
  onChangeField,
  onRemovePlayer,
  RankSelector,
  rankOptions,
  styles
}) {
  const [expandedMemberId, setExpandedMemberId] = useState("");
  const [editingMemberIds, setEditingMemberIds] = useState({});
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([playerId]) => (players || []).some((player) => player.id === playerId))));
    if (expandedMemberId && !(players || []).some((player) => player.id === expandedMemberId)) {
      setExpandedMemberId("");
    }
  }, [expandedMemberId, players]);

  useEffect(() => {
    setEditingMemberIds((current) => Object.fromEntries(Object.entries(current).filter(([playerId]) => (players || []).some((player) => player.id === playerId))));
  }, [players]);

  const rosterSummary = useMemo(() => {
    const rankCounts = (players || []).reduce((accumulator, player) => {
      accumulator[player.rank] = (accumulator[player.rank] || 0) + 1;
      return accumulator;
    }, {});
    const totalPower = (players || []).reduce((sum, player) => sum + (Number(player.overallPower) || 0), 0);
    const totalHeroPower = (players || []).reduce((sum, player) => sum + (Number(player.heroPower) || 0), 0);
    return {
      totalMembers: (players || []).length,
      totalPower,
      totalHeroPower,
      rankCounts
    };
  }, [players]);

  function updateDraft(playerId, field, value) {
    setDrafts((current) => ({ ...current, [playerId]: { ...(current[playerId] || {}), [field]: value } }));
  }

  function toggleExpanded(playerId) {
    setExpandedMemberId((current) => current === playerId ? "" : playerId);
  }

  function toggleEditing(playerId, enabled) {
    setEditingMemberIds((current) => ({ ...current, [playerId]: enabled }));
    if (enabled) {
      const player = (players || []).find((entry) => entry.id === playerId);
      if (player) {
        setDrafts((current) => ({
          ...current,
          [playerId]: {
            name: player.name || "",
            rank: player.rank || "R1",
            overallPower: String(player.overallPower ?? ""),
            heroPower: String(player.heroPower ?? ""),
            squad1: String(player.squadPowers?.squad1 ?? ""),
            squad2: String(player.squadPowers?.squad2 ?? ""),
            squad3: String(player.squadPowers?.squad3 ?? ""),
            squad4: String(player.squadPowers?.squad4 ?? "")
          }
        }));
      }
    }
  }

  function handleSave(player) {
    const draft = drafts[player.id] || {};
    if (draft.name !== player.name) onChangeField(player.id, "name", draft.name);
    if (draft.rank !== player.rank) onChangeField(player.id, "rank", draft.rank);
    if (String(draft.overallPower) !== String(player.overallPower)) onChangeField(player.id, "overallPower", draft.overallPower);
    if (String(draft.heroPower) !== String(player.heroPower ?? 0)) onChangeField(player.id, "heroPower", draft.heroPower);
    const currentSquads = player.squadPowers || {};
    const nextSquads = { squad1: draft.squad1, squad2: draft.squad2, squad3: draft.squad3, squad4: draft.squad4 };
    if (["squad1", "squad2", "squad3", "squad4"].some((key) => String(nextSquads[key]) !== String(currentSquads[key] ?? 0))) {
      onChangeField(player.id, "squadPowers", nextSquads);
    }
    toggleEditing(player.id, false);
  }

  function handleRemove(player) {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${player.name} from the alliance?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => onRemovePlayer(player.id) }
      ]
    );
  }

  return <View style={styles.section}>
    <AppCard style={styles.membersHeroCard} styles={styles}>
      <SectionHeader eyebrow="Members" title="Operational roster" detail="Search, filter, and manage alliance members without changing roster logic." styles={styles} />
      <View style={styles.memberStatGrid}>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Visible</Text>
          <Text style={styles.memberStatValue}>{rosterSummary.totalMembers}</Text>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Total Power</Text>
          <Text style={styles.memberStatValue}>{rosterSummary.totalPower.toFixed(2)}M</Text>
        </View>
        <View style={styles.memberStatCard}>
          <Text style={styles.memberStatLabel}>Hero Power</Text>
          <Text style={styles.memberStatValue}>{rosterSummary.totalHeroPower.toFixed(2)}M</Text>
        </View>
      </View>
      <View style={styles.rankFilterRow}>
        <StatusBadge label={`R5 ${rosterSummary.rankCounts.R5 || 0}`} tone="info" styles={styles} />
        <StatusBadge label={`R4 ${rosterSummary.rankCounts.R4 || 0}`} tone="success" styles={styles} />
        <StatusBadge label={`R3 ${rosterSummary.rankCounts.R3 || 0}`} tone="neutral" styles={styles} />
        <StatusBadge label={`R2 ${rosterSummary.rankCounts.R2 || 0}`} tone="neutral" styles={styles} />
        <StatusBadge label={`R1 ${rosterSummary.rankCounts.R1 || 0}`} tone="neutral" styles={styles} />
      </View>
    </AppCard>

    <AppCard style={styles.membersFilterCard} styles={styles}>
      <SectionHeader eyebrow="Filters" title="Roster controls" detail="Keep the list tight and focused while preserving the existing search and sort rules." styles={styles} />
      <TextInput value={memberSearchText} onChangeText={onChangeMemberSearchText} style={styles.input} placeholder="Search name or rank" />
      <View style={styles.rankFilterRow}>
        <Pressable style={[styles.rankFilterButton, memberSortMode === "rankDesc" && styles.rankFilterButtonActive]} onPress={() => onChangeMemberSortMode("rankDesc")}><Text style={[styles.rankFilterButtonText, memberSortMode === "rankDesc" && styles.rankFilterButtonTextActive]}>Rank</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, memberSortMode === "name" && styles.rankFilterButtonActive]} onPress={() => onChangeMemberSortMode("name")}><Text style={[styles.rankFilterButtonText, memberSortMode === "name" && styles.rankFilterButtonTextActive]}>Name</Text></Pressable>
      </View>
      <View style={styles.rankFilterRow}>
        {["all", ...rankOptions].map((rank) => <Pressable key={rank} style={[styles.rankFilterButton, memberRankFilter === rank && styles.rankFilterButtonActive]} onPress={() => onChangeMemberRankFilter(rank)}><Text style={[styles.rankFilterButtonText, memberRankFilter === rank && styles.rankFilterButtonTextActive]}>{rank === "all" ? "All Ranks" : rank}</Text></Pressable>)}
      </View>
    </AppCard>

    <View style={styles.membersRosterList}>
      {(players || []).length ? players.map((player) => {
        const isExpanded = expandedMemberId === player.id;
        const isEditing = editingMemberIds[player.id];
        const draft = drafts[player.id] || {};
        const desertStormStats = player.desertStormStats || { playedCount: 0, missedCount: 0 };
        return <AppCard key={player.id} style={styles.memberCard} variant={player.rank === "R5" ? "info" : player.rank === "R4" ? "active" : "default"} styles={styles}>
          <Pressable onPress={() => toggleExpanded(player.id)} style={styles.memberCardSummary}>
            <View style={styles.memberSummaryText}>
              <Text style={styles.memberName}>{player.name}</Text>
              <Text style={styles.memberSubline}>{player.rank} • Total {Number(player.overallPower || 0).toFixed(2)}M • Hero {Number(player.heroPower || 0).toFixed(2)}M</Text>
            </View>
            <View style={styles.memberSummaryRight}>
              <StatusBadge label={`${desertStormStats.playedCount || 0} DS`} tone="warning" styles={styles} />
              <Text style={styles.memberExpandIcon}>{isExpanded ? "-" : "+"}</Text>
            </View>
          </Pressable>

          {isExpanded ? <View style={styles.memberSection}>
            {!isEditing ? <>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Total Power</Text><Text style={styles.memberStatValue}>{Number(player.overallPower || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Hero Power</Text><Text style={styles.memberStatValue}>{Number(player.heroPower || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad Total</Text><Text style={styles.memberStatValue}>{Number(player.totalSquadPower || 0).toFixed(2)}M</Text></View>
              </View>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 1</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad1 || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 2</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad2 || 0).toFixed(2)}M</Text></View>
              </View>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 3</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad3 || 0).toFixed(2)}M</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Squad 4</Text><Text style={styles.memberStatValue}>{Number(player.squadPowers?.squad4 || 0).toFixed(2)}M</Text></View>
              </View>
              <View style={styles.memberStatGrid}>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Desert Storm Played</Text><Text style={styles.memberStatValue}>{desertStormStats.playedCount || 0}</Text></View>
                <View style={styles.memberStatCard}><Text style={styles.memberStatLabel}>Desert Storm Missed</Text><Text style={styles.memberStatValue}>{desertStormStats.missedCount || 0}</Text></View>
              </View>
              {currentUserIsLeader ? <View style={styles.memberCardActionsRow}>
                <SecondaryButton label="Edit Member" onPress={() => toggleEditing(player.id, true)} style={styles.half} styles={styles} />
                <Pressable style={[styles.dangerButton, styles.half]} onPress={() => handleRemove(player)}><Text style={styles.dangerButtonText}>Remove</Text></Pressable>
              </View> : null}
            </> : <View style={styles.memberSection}>
              <TextInput value={draft.name} onChangeText={(value) => updateDraft(player.id, "name", value)} style={styles.input} placeholder="Member name" />
              <RankSelector value={draft.rank || player.rank} onChange={(value) => updateDraft(player.id, "rank", value)} />
              <View style={styles.row}>
                <TextInput value={draft.overallPower} onChangeText={(value) => updateDraft(player.id, "overallPower", value)} style={[styles.input, styles.half]} placeholder="Total Power" keyboardType="decimal-pad" />
                <TextInput value={draft.heroPower} onChangeText={(value) => updateDraft(player.id, "heroPower", value)} style={[styles.input, styles.half]} placeholder="Hero Power" keyboardType="decimal-pad" />
              </View>
              <View style={styles.row}>
                <TextInput value={draft.squad1} onChangeText={(value) => updateDraft(player.id, "squad1", value)} style={[styles.input, styles.half]} placeholder="Squad 1" keyboardType="decimal-pad" />
                <TextInput value={draft.squad2} onChangeText={(value) => updateDraft(player.id, "squad2", value)} style={[styles.input, styles.half]} placeholder="Squad 2" keyboardType="decimal-pad" />
              </View>
              <View style={styles.row}>
                <TextInput value={draft.squad3} onChangeText={(value) => updateDraft(player.id, "squad3", value)} style={[styles.input, styles.half]} placeholder="Squad 3" keyboardType="decimal-pad" />
                <TextInput value={draft.squad4} onChangeText={(value) => updateDraft(player.id, "squad4", value)} style={[styles.input, styles.half]} placeholder="Squad 4" keyboardType="decimal-pad" />
              </View>
              <View style={styles.memberCardActionsRow}>
                <PrimaryButton label="Save Changes" onPress={() => handleSave(player)} style={styles.half} styles={styles} />
                <SecondaryButton label="Cancel" onPress={() => toggleEditing(player.id, false)} style={styles.half} styles={styles} />
              </View>
            </View>}
          </View> : null}
        </AppCard>;
      }) : <AppCard styles={styles}><Text style={styles.statusTitle}>No members found</Text><Text style={styles.hint}>Try another search or rank filter.</Text></AppCard>}
    </View>
  </View>;
}
