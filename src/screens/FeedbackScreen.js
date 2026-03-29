import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppCard, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

export function FeedbackScreen({
  appBuild,
  appVersion,
  feedbackEntries,
  newFeedbackText,
  onChangeNewFeedbackText,
  onSubmitFeedback,
  onSubmitFeedbackComment,
  styles,
  t
}) {
  const buildLabel = appBuild ? `v${appVersion} (${appBuild})` : `v${appVersion}`;
  const [commentDrafts, setCommentDrafts] = useState({});

  useEffect(() => {
    setCommentDrafts((current) => Object.fromEntries(Object.entries(current).filter(([entryId]) => feedbackEntries.some((entry) => entry.id === entryId))));
  }, [feedbackEntries]);

  function updateCommentDraft(entryId, value) {
    setCommentDrafts((current) => ({ ...current, [entryId]: value }));
  }

  return <View style={styles.section}>
    <AppCard style={styles.feedbackHeroCard} styles={styles}>
      <SectionHeader eyebrow="Feedback" title={t("feedbackTitle")} detail={t("feedbackHint")} styles={styles} />
      <StatusBadge label={feedbackEntries.length ? `${feedbackEntries.length} entries` : "No entries"} tone={feedbackEntries.length ? "info" : "neutral"} styles={styles} />
    </AppCard>

    <AppCard style={styles.feedbackComposerCard} styles={styles}>
      <SectionHeader eyebrow="Submit" title="Share feedback" detail="Send clear notes to the alliance team without changing the existing submission flow." styles={styles} />
      <View style={styles.memberStatCard}>
        <Text style={styles.memberStatLabel}>Current Build</Text>
        <Text style={styles.memberStatValue}>{buildLabel}</Text>
      </View>
      <TextInput value={newFeedbackText} onChangeText={onChangeNewFeedbackText} style={[styles.input, styles.textArea]} placeholder={t("feedbackExample")} multiline />
      <PrimaryButton label={t("submitFeedback")} onPress={onSubmitFeedback} styles={styles} />
    </AppCard>

    <AppCard style={styles.feedbackHistoryCard} styles={styles}>
      <SectionHeader eyebrow="Recent" title={t("allianceFeedback")} detail="Recent feedback and follow-up comments stay readable in a single history stream." styles={styles} />
      {feedbackEntries.length ? <View style={styles.feedbackEntryList}>
        {feedbackEntries.map((entry) => {
          const commentDraft = commentDrafts[entry.id] || "";
          return <AppCard key={entry.id} style={styles.feedbackEntryCard} styles={styles}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.listRowContent}>
                <Text style={styles.cardTitle}>{entry.createdByName || "Member"}</Text>
                <Text style={styles.hint}>{String(entry.createdAt).slice(0, 10)}</Text>
              </View>
              <StatusBadge label={`${(entry.comments || []).length} comments`} tone={(entry.comments || []).length ? "info" : "neutral"} styles={styles} />
            </View>
            <Text style={styles.line}>{entry.message}</Text>
            <Text style={styles.hint}>{t("feedbackFrom", { name: entry.createdByName || "Member", date: String(entry.createdAt).slice(0, 10) })}</Text>
            <View style={styles.feedbackCommentList}>
              {(entry.comments || []).length ? entry.comments.map((comment) => <View key={comment.id} style={styles.feedbackCommentCard}>
                <Text style={styles.line}>{comment.message}</Text>
                <Text style={styles.hint}>{comment.createdByName || "Member"} • {String(comment.createdAt).slice(0, 10)}</Text>
              </View>) : <Text style={styles.hint}>No comments yet.</Text>}
            </View>
            <View style={styles.feedbackCommentComposer}>
              <TextInput value={commentDraft} onChangeText={(value) => updateCommentDraft(entry.id, value)} style={[styles.input, styles.feedbackCommentInput]} placeholder="Add a comment" multiline />
              <SecondaryButton label="Comment" onPress={() => onSubmitFeedbackComment(entry.id, commentDraft, () => updateCommentDraft(entry.id, ""))} styles={styles} />
            </View>
          </AppCard>;
        })}
      </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No feedback yet</Text><Text style={styles.hint}>{t("noFeedback")}</Text></AppCard>}
    </AppCard>
  </View>;
}
