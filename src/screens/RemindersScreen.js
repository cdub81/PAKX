import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { buildReminderSchedule, formatReminderDateKey, formatReminderDateTimeDisplay, getReminderDeviceTimeZone, getReminderServerTimeLabel, getReminderServerTimeZone, isValidReminderDateKey, parseReminderTimeValue } from "../lib/reminders";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

export function RemindersScreen({
  reminders,
  language,
  onCreateReminder,
  onCancelReminder,
  onDeleteReminder,
  styles,
  helpers,
  ReminderDurationPickerModal,
  CalendarDatePickerModal,
  CalendarTimePickerModal,
  t
}) {
  const { formatReminderDuration, formatReminderCountdown } = helpers;
  const localTimeZone = getReminderDeviceTimeZone();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState("elapsed");
  const [dateKey, setDateKey] = useState(formatReminderDateKey(new Date()));
  const [timeValue, setTimeValue] = useState("12:00");
  const [durationSeconds, setDurationSeconds] = useState(3600);
  const [formError, setFormError] = useState("");
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeReminders = useMemo(() => (reminders || []).filter((reminder) => reminder.status === "active").sort((a, b) => String(a.scheduledForUtc).localeCompare(String(b.scheduledForUtc))), [reminders]);
  const preview = useMemo(() => {
    try {
      return buildReminderSchedule({
        mode,
        title,
        notes,
        durationDays: 0,
        durationHours: Math.floor(durationSeconds / 3600),
        durationMinutes: Math.floor((durationSeconds % 3600) / 60),
        durationSeconds: durationSeconds % 60,
        dateKey,
        timeValue,
        localTimeZone
      });
    } catch {
      return null;
    }
  }, [mode, title, notes, durationSeconds, dateKey, timeValue, localTimeZone, now]);

  function getReminderModeLabel(value) {
    if (value === "serverTime") return t("reminders.modeServerTime", { value: getReminderServerTimeLabel() });
    if (value === "localTime") return t("reminders.modeLocalTime");
    return t("reminders.modeElapsed");
  }

  async function handleSubmit() {
    if (mode === "elapsed" && durationSeconds <= 0) {
      setFormError(t("reminders.errorDuration"));
      return;
    }
    if ((mode === "localTime" || mode === "serverTime") && !isValidReminderDateKey(dateKey)) {
      setFormError(t("reminders.errorDate"));
      return;
    }
    if ((mode === "localTime" || mode === "serverTime") && !parseReminderTimeValue(timeValue)) {
      setFormError(t("reminders.errorTime"));
      return;
    }
    if (!preview || new Date(preview.scheduledForUtc).getTime() <= Date.now()) {
      setFormError(t("reminders.errorFuture"));
      return;
    }
    setFormError("");
    const success = await onCreateReminder({
      title,
      notes,
      mode,
      durationDays: 0,
      durationHours: Math.floor(durationSeconds / 3600),
      durationMinutes: Math.floor((durationSeconds % 3600) / 60),
      durationSeconds: durationSeconds % 60,
      dateKey,
      timeValue
    });
    if (success) {
      setTitle("");
      setNotes("");
      setMode("elapsed");
      setDurationSeconds(3600);
      setDateKey(formatReminderDateKey(new Date()));
      setTimeValue("12:00");
      setFormError("");
    }
  }

  function renderReminderCard(reminder, inactive = false) {
    const scheduledAt = new Date(reminder.scheduledForUtc).getTime();
    const countdown = scheduledAt > now ? formatReminderCountdown(scheduledAt - now) : t("reminders.dueNow");
    return <AppCard key={reminder.id} style={styles.reminderCard} variant={inactive ? "default" : "info"} styles={styles}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.listRowContent}>
          <Text style={styles.cardTitle}>{reminder.title || t("reminders.fallbackTitle")}</Text>
          <Text style={styles.reminderMeta}>{getReminderModeLabel(reminder.mode)}</Text>
        </View>
        <StatusBadge label={reminder.status === "active" ? t("reminders.statusActive") : reminder.status === "cancelled" ? t("reminders.statusCancelled") : t("reminders.statusCompleted")} tone={reminder.status === "active" ? "success" : reminder.status === "cancelled" ? "danger" : "neutral"} styles={styles} />
      </View>
      {reminder.notes ? <Text style={styles.line}>{reminder.notes}</Text> : null}
      <View style={styles.calendarTimeStack}>
        <ListRow title={t("reminders.localTime")} detail={formatReminderDateTimeDisplay(reminder.scheduledForUtc, localTimeZone, language)} styles={styles} />
        <ListRow title={t("reminders.serverTime", { value: getReminderServerTimeLabel() })} detail={formatReminderDateTimeDisplay(reminder.scheduledForUtc, getReminderServerTimeZone(), language)} styles={styles} />
        <ListRow title={t("reminders.repeat")} detail={t("reminders.oneTime")} styles={styles} />
      </View>
      {reminder.status === "active" ? <Text style={styles.reminderCountdown}>{countdown}</Text> : null}
      <View style={styles.memberCardActionsRow}>
        {reminder.status === "active" ? <SecondaryButton label={t("common.cancel")} onPress={() => onCancelReminder(reminder)} style={styles.half} styles={styles} /> : null}
        <Pressable style={[styles.dangerButton, reminder.status === "active" ? styles.half : { flex: 1 }]} onPress={() => onDeleteReminder(reminder)}><Text style={styles.dangerButtonText}>{t("common.delete")}</Text></Pressable>
      </View>
    </AppCard>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.reminderSectionCard} styles={styles}>
      <SectionHeader eyebrow={t("reminders.activeEyebrow")} title={t("reminders.activeTitle")} detail={t("reminders.activeDetail")} styles={styles} />
      {activeReminders.length ? <View style={styles.remindersList}>{activeReminders.map((reminder) => renderReminderCard(reminder, false))}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{t("reminders.noActiveTitle")}</Text><Text style={styles.hint}>{t("reminders.noActiveDetail")}</Text></AppCard>}
    </AppCard>

    <AppCard style={styles.reminderComposerCard} styles={styles}>
      <SectionHeader eyebrow={t("reminders.createEyebrow")} title={t("reminders.newReminder")} detail={t("reminders.newReminderDetail")} styles={styles} />
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder={t("reminders.titlePlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} />
      <TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.textArea]} placeholder={t("reminders.notesPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} multiline />
      <View style={styles.rankFilterRow}>
        <Pressable style={[styles.rankFilterButton, mode === "elapsed" && styles.rankFilterButtonActive]} onPress={() => setMode("elapsed")}><Text style={[styles.rankFilterButtonText, mode === "elapsed" && styles.rankFilterButtonTextActive]}>{t("reminders.modeElapsed")}</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "localTime" && styles.rankFilterButtonActive]} onPress={() => setMode("localTime")}><Text style={[styles.rankFilterButtonText, mode === "localTime" && styles.rankFilterButtonTextActive]}>{t("reminders.modeAtLocal")}</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "serverTime" && styles.rankFilterButtonActive]} onPress={() => setMode("serverTime")}><Text style={[styles.rankFilterButtonText, mode === "serverTime" && styles.rankFilterButtonTextActive]}>{t("reminders.modeAtServer")}</Text></Pressable>
      </View>
      {mode === "elapsed" ? <>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setDurationPickerVisible(true)}><Text style={styles.line}>{t("reminders.durationLabel", { value: formatReminderDuration(durationSeconds) })}</Text></Pressable>
        <Text style={styles.hint}>{t("reminders.elapsedHint")}</Text>
      </> : null}
      {(mode === "localTime" || mode === "serverTime") ? <>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setDatePickerVisible(true)}><Text style={styles.line}>{t("reminders.dateLabel", { value: dateKey })}</Text></Pressable>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setTimePickerVisible(true)}><Text style={styles.line}>{t("reminders.timeLabel", { value: timeValue })}</Text></Pressable>
        {mode === "serverTime" ? <Text style={styles.hint}>{t("reminders.serverTimeHint", { value: getReminderServerTimeLabel() })}</Text> : null}
      </> : null}
      <AppCard variant="info" style={styles.reminderPreviewCard} styles={styles}>
        <Text style={styles.statusEyebrow}>{t("reminders.preview")}</Text>
        <ListRow title={t("reminders.localTime")} detail={preview ? formatReminderDateTimeDisplay(preview.scheduledForUtc, localTimeZone, language) : "--"} styles={styles} />
        <ListRow title={t("reminders.serverTime", { value: getReminderServerTimeLabel() })} detail={preview ? formatReminderDateTimeDisplay(preview.scheduledForUtc, getReminderServerTimeZone(), language) : "--"} styles={styles} />
      </AppCard>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <PrimaryButton label={t("reminders.createButton")} onPress={handleSubmit} styles={styles} />
    </AppCard>

    <ReminderDurationPickerModal visible={durationPickerVisible} title={t("reminders.selectDuration")} valueSeconds={durationSeconds} onChange={setDurationSeconds} onClose={() => setDurationPickerVisible(false)} t={t} />
    <CalendarDatePickerModal visible={datePickerVisible} title={t("reminders.selectDate")} value={dateKey} onChange={setDateKey} onClose={() => setDatePickerVisible(false)} t={t} />
    <CalendarTimePickerModal visible={timePickerVisible} title={t("reminders.selectTime")} value={timeValue} onChange={setTimeValue} onClose={() => setTimePickerVisible(false)} t={t} />
  </View>;
}
