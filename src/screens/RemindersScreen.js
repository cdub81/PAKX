import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { buildReminderSchedule, formatReminderDateKey, formatReminderDateTimeDisplay, getReminderDeviceTimeZone, getReminderServerTimeLabel, getReminderServerTimeZone, isValidReminderDateKey, parseReminderTimeValue } from "../lib/reminders";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

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
  CalendarTimePickerModal
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
  const inactiveReminders = useMemo(() => (reminders || []).filter((reminder) => reminder.status !== "active").sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt))), [reminders]);
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
    if (value === "serverTime") return `Server Time (${getReminderServerTimeLabel()})`;
    if (value === "localTime") return "Local Time";
    return "After Duration";
  }

  async function handleSubmit() {
    if (mode === "elapsed" && durationSeconds <= 0) {
      setFormError("Choose a duration greater than zero.");
      return;
    }
    if ((mode === "localTime" || mode === "serverTime") && !isValidReminderDateKey(dateKey)) {
      setFormError("Choose a valid reminder date.");
      return;
    }
    if ((mode === "localTime" || mode === "serverTime") && !parseReminderTimeValue(timeValue)) {
      setFormError("Choose a valid reminder time.");
      return;
    }
    if (!preview || new Date(preview.scheduledForUtc).getTime() <= Date.now()) {
      setFormError("Reminder time must be in the future.");
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
    const countdown = scheduledAt > now ? formatReminderCountdown(scheduledAt - now) : "Due now";
    return <AppCard key={reminder.id} style={styles.reminderCard} variant={inactive ? "default" : "info"} styles={styles}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.listRowContent}>
          <Text style={styles.cardTitle}>{reminder.title || "Reminder"}</Text>
          <Text style={styles.reminderMeta}>{getReminderModeLabel(reminder.mode)}</Text>
        </View>
        <StatusBadge label={reminder.status === "active" ? "Active" : reminder.status === "cancelled" ? "Cancelled" : "Completed"} tone={reminder.status === "active" ? "success" : reminder.status === "cancelled" ? "danger" : "neutral"} styles={styles} />
      </View>
      {reminder.notes ? <Text style={styles.line}>{reminder.notes}</Text> : null}
      <View style={styles.calendarTimeStack}>
        <ListRow title="Local Time" detail={formatReminderDateTimeDisplay(reminder.scheduledForUtc, localTimeZone, language)} styles={styles} />
        <ListRow title={`Server Time (${getReminderServerTimeLabel()})`} detail={formatReminderDateTimeDisplay(reminder.scheduledForUtc, getReminderServerTimeZone(), language)} styles={styles} />
        <ListRow title="Repeat" detail="One-time" styles={styles} />
      </View>
      {reminder.status === "active" ? <Text style={styles.reminderCountdown}>{countdown}</Text> : null}
      <View style={styles.memberCardActionsRow}>
        {reminder.status === "active" ? <SecondaryButton label="Cancel" onPress={() => onCancelReminder(reminder)} style={styles.half} styles={styles} /> : null}
        <Pressable style={[styles.dangerButton, reminder.status === "active" ? styles.half : { flex: 1 }]} onPress={() => onDeleteReminder(reminder)}><Text style={styles.dangerButtonText}>Delete</Text></Pressable>
      </View>
    </AppCard>;
  }

  return <View style={styles.section}>
    <AppCard style={styles.remindersHeroCard} styles={styles}>
      <SectionHeader eyebrow="Reminders" title="Operational reminders" detail="Track personal countdowns, local alarms, and server-time reminders in one place." styles={styles} />
      <StatusBadge label={`${activeReminders.length} active`} tone={activeReminders.length ? "warning" : "neutral"} styles={styles} />
    </AppCard>

    <AppCard style={styles.reminderComposerCard} styles={styles}>
      <SectionHeader eyebrow="Create" title="New reminder" detail="The reminder fires on this device using the existing local notification flow." styles={styles} />
      <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Reminder title" />
      <TextInput value={notes} onChangeText={setNotes} style={[styles.input, styles.textArea]} placeholder="Optional notes" multiline />
      <View style={styles.rankFilterRow}>
        <Pressable style={[styles.rankFilterButton, mode === "elapsed" && styles.rankFilterButtonActive]} onPress={() => setMode("elapsed")}><Text style={[styles.rankFilterButtonText, mode === "elapsed" && styles.rankFilterButtonTextActive]}>After Duration</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "localTime" && styles.rankFilterButtonActive]} onPress={() => setMode("localTime")}><Text style={[styles.rankFilterButtonText, mode === "localTime" && styles.rankFilterButtonTextActive]}>At Local Time</Text></Pressable>
        <Pressable style={[styles.rankFilterButton, mode === "serverTime" && styles.rankFilterButtonActive]} onPress={() => setMode("serverTime")}><Text style={[styles.rankFilterButtonText, mode === "serverTime" && styles.rankFilterButtonTextActive]}>At Server Time</Text></Pressable>
      </View>
      {mode === "elapsed" ? <>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setDurationPickerVisible(true)}><Text style={styles.line}>Duration: {formatReminderDuration(durationSeconds)}</Text></Pressable>
        <Text style={styles.hint}>The countdown starts when you tap Create Reminder.</Text>
      </> : null}
      {(mode === "localTime" || mode === "serverTime") ? <>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setDatePickerVisible(true)}><Text style={styles.line}>Date: {dateKey}</Text></Pressable>
        <Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => setTimePickerVisible(true)}><Text style={styles.line}>Time: {timeValue}</Text></Pressable>
        {mode === "serverTime" ? <Text style={styles.hint}>Server time is {getReminderServerTimeLabel()}.</Text> : null}
      </> : null}
      <AppCard variant="info" style={styles.reminderPreviewCard} styles={styles}>
        <Text style={styles.statusEyebrow}>Preview</Text>
        <ListRow title="Local Time" detail={preview ? formatReminderDateTimeDisplay(preview.scheduledForUtc, localTimeZone, language) : "--"} styles={styles} />
        <ListRow title={`Server Time (${getReminderServerTimeLabel()})`} detail={preview ? formatReminderDateTimeDisplay(preview.scheduledForUtc, getReminderServerTimeZone(), language) : "--"} styles={styles} />
      </AppCard>
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <PrimaryButton label="Create Reminder" onPress={handleSubmit} styles={styles} />
    </AppCard>

    <AppCard style={styles.reminderSectionCard} styles={styles}>
      <SectionHeader eyebrow="Active" title="Active reminders" detail="Upcoming reminders that still have scheduled local notifications." styles={styles} />
      {activeReminders.length ? <View style={styles.remindersList}>{activeReminders.map((reminder) => renderReminderCard(reminder, false))}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>No active reminders</Text><Text style={styles.hint}>Create a reminder to start tracking your next action window.</Text></AppCard>}
    </AppCard>

    <AppCard style={styles.reminderSectionCard} styles={styles}>
      <SectionHeader eyebrow="Inactive" title="Past and cancelled" detail="Completed or cancelled reminders stay here for quick review." styles={styles} />
      {inactiveReminders.length ? <View style={styles.remindersList}>{inactiveReminders.map((reminder) => renderReminderCard(reminder, true))}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>Nothing archived</Text><Text style={styles.hint}>Cancelled or completed reminders will show up here.</Text></AppCard>}
    </AppCard>

    <ReminderDurationPickerModal visible={durationPickerVisible} title="Select duration" valueSeconds={durationSeconds} onChange={setDurationSeconds} onClose={() => setDurationPickerVisible(false)} />
    <CalendarDatePickerModal visible={datePickerVisible} title="Select date" value={dateKey} onChange={setDateKey} onClose={() => setDatePickerVisible(false)} />
    <CalendarTimePickerModal visible={timePickerVisible} title="Select time" value={timeValue} onChange={setTimeValue} onClose={() => setTimePickerVisible(false)} />
  </View>;
}
