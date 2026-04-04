import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppCard, PrimaryButton, SecondaryButton, SectionHeader, StatusBadge } from "../components/ui/primitives";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

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
      <SectionHeader eyebrow={t("feedback.section")} title={t("feedbackTitle")} detail={t("feedbackHint")} styles={styles} />
      <StatusBadge label={feedbackEntries.length ? t("feedback.entriesCount", { count: feedbackEntries.length }) : t("feedback.noEntriesBadge")} tone={feedbackEntries.length ? "info" : "neutral"} styles={styles} />
    </AppCard>

    <AppCard style={styles.feedbackComposerCard} styles={styles}>
      <SectionHeader eyebrow={t("feedback.submitSection")} title={t("feedback.shareTitle")} detail={t("feedback.shareDetail")} styles={styles} />
      <View style={styles.memberStatCard}>
        <Text style={styles.memberStatLabel}>{t("feedback.currentBuild")}</Text>
        <Text style={styles.memberStatValue}>{buildLabel}</Text>
      </View>
      <TextInput value={newFeedbackText} onChangeText={onChangeNewFeedbackText} style={[styles.input, styles.textArea]} placeholder={t("feedbackExample")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} multiline />
      <PrimaryButton label={t("submitFeedback")} onPress={onSubmitFeedback} styles={styles} />
    </AppCard>

    <AppCard style={styles.feedbackHistoryCard} styles={styles}>
      <SectionHeader eyebrow={t("feedback.recentSection")} title={t("allianceFeedback")} detail={t("feedback.historyDetail")} styles={styles} />
      {feedbackEntries.length ? <View style={styles.feedbackEntryList}>
        {feedbackEntries.map((entry) => {
          const commentDraft = commentDrafts[entry.id] || "";
          const authorName = entry.createdByName || t("common.member");

          return <AppCard key={entry.id} style={styles.feedbackEntryCard} styles={styles}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.listRowContent}>
                <Text style={styles.cardTitle}>{authorName}</Text>
                <Text style={styles.hint}>{String(entry.createdAt).slice(0, 10)}</Text>
              </View>
              <StatusBadge label={t("feedback.commentCount", { count: (entry.comments || []).length })} tone={(entry.comments || []).length ? "info" : "neutral"} styles={styles} />
            </View>
            <Text style={styles.line}>{entry.message}</Text>
            <Text style={styles.hint}>{t("feedbackFrom", { name: authorName, date: String(entry.createdAt).slice(0, 10) })}</Text>
            <View style={styles.feedbackCommentList}>
              {(entry.comments || []).length ? entry.comments.map((comment) => <View key={comment.id} style={styles.feedbackCommentCard}>
                <Text style={styles.line}>{comment.message}</Text>
                <Text style={styles.hint}>{t("feedbackFrom", { name: comment.createdByName || t("common.member"), date: String(comment.createdAt).slice(0, 10) })}</Text>
              </View>) : <Text style={styles.hint}>{t("feedback.noCommentsYet")}</Text>}
            </View>
            <View style={styles.feedbackCommentComposer}>
              <TextInput value={commentDraft} onChangeText={(value) => updateCommentDraft(entry.id, value)} style={[styles.input, styles.feedbackCommentInput]} placeholder={t("feedback.addComment")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} multiline />
              <SecondaryButton label={t("feedback.commentButton")} onPress={() => onSubmitFeedbackComment(entry.id, commentDraft, () => updateCommentDraft(entry.id, ""))} styles={styles} />
            </View>
          </AppCard>;
        })}
      </View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{t("feedback.noFeedbackTitle")}</Text><Text style={styles.hint}>{t("noFeedback")}</Text></AppCard>}
    </AppCard>
  </View>;
}
