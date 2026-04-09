import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { CALENDAR_GRID_GAP } from "../styles/index";
import { AppCard, ListRow, PrimaryButton, SectionHeader, SecondaryButton, StatusBadge } from "../components/ui/primitives";

const INPUT_PLACEHOLDER_COLOR = "#8fa0b3";
const INPUT_SELECTION_COLOR = "#66d08a";

export function CalendarScreen(props) {
  const {
    entries,
    desertStormEvents,
    zombieSiegeEvents,
    currentUserIsLeader,
    calendarView,
    editingCalendarEntryId,
    language,
    newCalendarTimeInputMode,
    calendarTimePickerTarget,
    calendarDatePickerTarget,
    calendarFormError,
    onChangeCalendarView,
    newCalendarTitle,
    newCalendarDescription,
    newCalendarDate,
    newCalendarEndDate,
    newCalendarStartTime,
    newCalendarEndTime,
    newCalendarAllDay,
    newCalendarEntryType,
    newCalendarRepeat,
    newCalendarRepeatEndDate,
    newCalendarRepeatWeekdays,
    newCalendarLinkedType,
    newCalendarLinkedEventId,
    newCalendarEventTimeZone,
    newCalendarLeaderNotes,
    newCalendarLeaderOnly,
    onChangeNewCalendarTitle,
    onChangeNewCalendarDescription,
    onChangeNewCalendarDate,
    onChangeNewCalendarEndDate,
    onChangeNewCalendarStartTime,
    onChangeNewCalendarEndTime,
    onChangeNewCalendarTimeInputMode,
    onChangeCalendarTimePickerTarget,
    onChangeCalendarDatePickerTarget,
    onChangeNewCalendarEventTimeZone,
    onToggleNewCalendarAllDay,
    onChangeNewCalendarEntryType,
    onChangeNewCalendarRepeat,
    onChangeNewCalendarRepeatEndDate,
    onToggleNewCalendarRepeatWeekday,
    onChangeNewCalendarLinkedEventId,
    onChangeNewCalendarLeaderNotes,
    onToggleLeaderOnly,
    onCreateEntry,
    onCancelEdit,
    onEditEntry,
    onDeleteEntry,
    onOpenLinkedEntry,
    styles,
    helpers,
    t,
    CalendarTimePickerModal,
    CalendarDatePickerModal
  } = props;

  const [gridWidth, setGridWidth] = useState(0);
  const calendarCellWidth = gridWidth > 0 ? Math.floor((gridWidth - CALENDAR_GRID_GAP * 6) / 7) : 40;

  const {
    startOfLocalDay,
    formatLocalDateKey,
    addLocalDays,
    parseLocalDateKey,
    isSameLocalDay,
    expandCalendarEntries,
    getCalendarTranslator,
    getLinkableCalendarEvents,
    buildCalendarTimedPreview,
    normalizeCalendarTimeZone,
    getServerTimeLabel,
    CALENDAR_WEEKDAY_OPTIONS,
    CALENDAR_TIME_INPUT_MODES,
    formatCalendarDateButtonLabel,
    getCalendarWeekdayLabel,
    normalizeCalendarRecurrence
  } = helpers;

  const today = startOfLocalDay();
  const todayKey = formatLocalDateKey(today);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addLocalDays(today, index)), [todayKey]);
  const monthDays = useMemo(() => {
    const monthStart = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
    const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const gridEnd = new Date(monthEnd);
    gridEnd.setDate(monthEnd.getDate() + (6 - monthEnd.getDay()));
    const days = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }, [monthCursor]);
  const visibleDateKeys = useMemo(() => {
    if (calendarView === "today") return [todayKey];
    if (calendarView === "week") return weekDays.map((day) => formatLocalDateKey(day));
    return monthDays.map((day) => formatLocalDateKey(day));
  }, [calendarView, todayKey, weekDays, monthDays]);
  const windowStartDateKey = visibleDateKeys[0] || todayKey;
  const windowEndDateKey = visibleDateKeys[visibleDateKeys.length - 1] || todayKey;
  const expandedEntries = useMemo(() => expandCalendarEntries(entries, windowStartDateKey, windowEndDateKey), [entries, windowStartDateKey, windowEndDateKey]);
  const entriesByDate = useMemo(() => expandedEntries.reduce((accumulator, entry) => {
    const key = entry.localDateKey;
    if (!accumulator[key]) accumulator[key] = [];
    accumulator[key].push(entry);
    return accumulator;
  }, {}), [expandedEntries]);
  const orderedEntriesByDate = useMemo(() => Object.fromEntries(Object.entries(entriesByDate).map(([key, value]) => [key, [...value].sort((a, b) => String(a.startsAt || a.occurrenceDateKey).localeCompare(String(b.startsAt || b.occurrenceDateKey)))])), [entriesByDate]);
  const fallbackSelectedDateKey = visibleDateKeys.includes(selectedDateKey) ? selectedDateKey : visibleDateKeys[0] || todayKey;
  const selectedDate = parseLocalDateKey(fallbackSelectedDateKey);
  const selectedEntries = orderedEntriesByDate[fallbackSelectedDateKey] || [];
  const calendarT = getCalendarTranslator(language);
  const monthLabel = monthCursor.toLocaleDateString(language || undefined, { month: "long", year: "numeric" });
  const selectedDateLabel = selectedDate.toLocaleDateString(language || undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const availableDesertStormEvents = getLinkableCalendarEvents(desertStormEvents);
  const availableZombieSiegeEvents = getLinkableCalendarEvents(zombieSiegeEvents);
  const timePreview = useMemo(() => newCalendarAllDay ? null : buildCalendarTimedPreview(newCalendarDate, newCalendarStartTime || "00:00", newCalendarEndDate, newCalendarEndTime, newCalendarTimeInputMode, newCalendarEventTimeZone), [newCalendarAllDay, newCalendarDate, newCalendarEndDate, newCalendarStartTime, newCalendarEndTime, newCalendarTimeInputMode, newCalendarEventTimeZone]);

  useEffect(() => {
    if (calendarView === "month") {
      const activeDate = parseLocalDateKey(fallbackSelectedDateKey);
      setMonthCursor(new Date(activeDate.getFullYear(), activeDate.getMonth(), 1));
      return;
    }
    setSelectedDateKey(todayKey);
  }, [calendarView, todayKey]);

  useEffect(() => {
    if (!visibleDateKeys.includes(selectedDateKey) && visibleDateKeys[0]) {
      setSelectedDateKey(visibleDateKeys[0]);
    }
  }, [selectedDateKey, visibleDateKeys]);

  function shiftMonth(offset) {
    setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function renderDayButton(date, compact = false) {
    const key = formatLocalDateKey(date);
    const inCurrentMonth = date.getMonth() === monthCursor.getMonth();
    const isSelected = fallbackSelectedDateKey === key;
    const isToday = isSameLocalDay(date, today);
    const eventCount = (orderedEntriesByDate[key] || []).length;
    return <Pressable key={key} style={[styles.calendarDayCell, !compact && { width: calendarCellWidth }, compact && styles.calendarDayCellCompact, !inCurrentMonth && styles.calendarDayCellMuted, isToday && styles.calendarDayCellToday, isSelected && styles.calendarDayCellSelected]} onPress={() => setSelectedDateKey(key)}><Text style={[styles.calendarDayWeekLabel, compact && styles.calendarDayWeekLabelCompact, isSelected && styles.calendarDayTextSelected]}>{date.toLocaleDateString(language || undefined, { weekday: "short" })}</Text><Text style={[styles.calendarDayNumber, compact && styles.calendarDayNumberCompact, !inCurrentMonth && styles.calendarDayTextMuted, isSelected && styles.calendarDayTextSelected]}>{date.getDate()}</Text>{eventCount ? <View style={[styles.calendarEventBadge, isSelected && styles.calendarEventBadgeSelected]}><Text style={[styles.calendarEventBadgeText, isSelected && styles.calendarEventBadgeTextSelected]}>{eventCount}</Text></View> : <View style={styles.calendarEventSpacer} />}</Pressable>;
  }

  function getRepeatLabel(entry) {
    const recurrence = normalizeCalendarRecurrence(entry);
    if (recurrence.repeat === "none") return "";
    if (recurrence.repeat === "daily") return calendarT("repeatsDaily");
    if (recurrence.repeat === "every_other_day") return calendarT("repeatsEveryOtherDay");
    if (recurrence.repeat === "weekly") return calendarT("repeatsWeekly");
    if (recurrence.repeat === "custom_weekdays") return calendarT("repeatsWeekdays", { value: recurrence.weekdays.map((code) => getCalendarWeekdayLabel(code, language)).filter(Boolean).join(", ") });
    return "";
  }

  const linkEventOptions = newCalendarEntryType === "linked_desert_storm" ? availableDesertStormEvents : newCalendarEntryType === "linked_zombie_siege" ? availableZombieSiegeEvents : [];

  return <View style={styles.section}>
    <AppCard style={styles.calendarAgendaShell} styles={styles}>
      <SectionHeader eyebrow={t("calendar.screenEyebrow")} title={calendarT("title")} detail={calendarT("hint")} styles={styles} />
      <View style={styles.calendarModeRow}>
        <Pressable style={[styles.secondaryButton, styles.third, calendarView === "today" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("today")}><Text style={[styles.secondaryButtonText, calendarView === "today" && styles.modeButtonTextActive]}>{calendarT("today")}</Text></Pressable>
        <Pressable style={[styles.secondaryButton, styles.third, calendarView === "week" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("week")}><Text style={[styles.secondaryButtonText, calendarView === "week" && styles.modeButtonTextActive]}>{calendarT("week")}</Text></Pressable>
        <Pressable style={[styles.secondaryButton, styles.third, calendarView === "month" && styles.modeButtonActive]} onPress={() => onChangeCalendarView("month")}><Text style={[styles.secondaryButtonText, calendarView === "month" && styles.modeButtonTextActive]}>{calendarT("month")}</Text></Pressable>
      </View>
    </AppCard>

    {calendarView === "month" ? <AppCard style={styles.calendarMonthShell} styles={styles}><View style={styles.calendarMonthHeader}><Pressable style={styles.calendarMonthArrow} onPress={() => shiftMonth(-1)}><Text style={styles.calendarMonthArrowText}>{"<"}</Text></Pressable><Text style={styles.calendarMonthTitle}>{monthLabel}</Text><Pressable style={styles.calendarMonthArrow} onPress={() => shiftMonth(1)}><Text style={styles.calendarMonthArrowText}>{">"}</Text></Pressable></View><View style={styles.calendarWeekdayRow}>{CALENDAR_WEEKDAY_OPTIONS.map((option) => <Text key={option.code} style={styles.calendarWeekday}>{getCalendarWeekdayLabel(option.code, language)}</Text>)}</View><View style={styles.calendarGrid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>{monthDays.map((day) => renderDayButton(day))}</View></AppCard> : null}
    {calendarView === "week" ? <AppCard style={styles.calendarStripShell} styles={styles}><View style={styles.calendarStrip}>{weekDays.map((day) => renderDayButton(day, true))}</View></AppCard> : null}
    {calendarView === "today" ? <AppCard style={styles.calendarStripShell} styles={styles}><View style={styles.calendarStrip}>{renderDayButton(today, true)}</View></AppCard> : null}

    <AppCard style={styles.calendarDetailCard} styles={styles}>
      <View style={styles.calendarDetailHeader}><View style={styles.listRowContent}><Text style={styles.statusEyebrow}>{calendarT("selectedDay")}</Text><Text style={styles.cardTitle}>{selectedDateLabel}</Text><Text style={styles.hint}>{selectedEntries.length ? (selectedEntries.length === 1 ? calendarT("oneEventScheduled") : calendarT("manyEventsScheduled", { count: selectedEntries.length })) : calendarT("noEventsScheduled")}</Text></View><StatusBadge label={selectedEntries.length ? `${selectedEntries.length}` : "0"} tone={selectedEntries.length ? "info" : "neutral"} styles={styles} /></View>
      {selectedEntries.length ? <View style={styles.calendarAgendaList}>{selectedEntries.map((entry) => { const badgeTone = entry.linkedType === "desertStorm" ? "warning" : entry.linkedType === "zombieSiege" ? "purple" : entry.leaderOnly ? "danger" : entry.allDay === false ? "info" : "neutral"; const badgeLabel = entry.linkedType === "desertStorm" ? calendarT("linkedDesertStorm") : entry.linkedType === "zombieSiege" ? calendarT("linkedZombieSiege") : entry.leaderOnly ? calendarT("leaderOnly") : entry.allDay !== false ? calendarT("allDay") : calendarT("timeSpecificEntry"); return <Pressable key={entry.occurrenceId || entry.id} style={styles.calendarEntryCard} disabled={!entry.linkedType} onPress={() => entry.linkedType && onOpenLinkedEntry(entry)}><View style={styles.cardHeaderRow}><View style={styles.listRowContent}><Text style={styles.cardTitle}>{entry.title}</Text><Text style={styles.calendarEntryMeta}>{entry.allDay !== false ? calendarT("allDay") : entry.localDisplayDateTime || entry.localDisplayTime || entry.displayTime}</Text></View><StatusBadge label={badgeLabel} tone={badgeTone} styles={styles} /></View>{entry.description ? <Text style={styles.line}>{entry.description}</Text> : null}{getRepeatLabel(entry) ? <Text style={styles.hint}>{getRepeatLabel(entry)}</Text> : null}{entry.allDay === false ? <View style={styles.calendarTimeStack}><ListRow title={calendarT("serverTime")} detail={entry.serverDisplayDateTime || entry.serverDisplayTime} styles={styles} /><ListRow title={calendarT("memberLocalTime")} detail={entry.localDisplayDateTime || entry.localDisplayTime} styles={styles} /></View> : null}{currentUserIsLeader && entry.leaderNotes ? <AppCard style={styles.calendarLeaderNotesCard} styles={styles}><Text style={styles.statusEyebrow}>{calendarT("leaderNotes")}</Text><Text style={styles.line}>{entry.leaderNotes}</Text></AppCard> : null}<View style={styles.cardHeaderRow}><Text style={styles.hint}>{calendarT("addedBy", { name: entry.createdByName || t("calendar.leaderFallback") })}</Text>{currentUserIsLeader ? <View style={styles.memberCardActions}><SecondaryButton label={calendarT("edit")} onPress={() => onEditEntry(entry)} styles={styles} /><Pressable style={styles.dangerButton} onPress={() => onDeleteEntry(entry.sourceEntryId || entry.id)}><Text style={styles.dangerButtonText}>{calendarT("delete")}</Text></Pressable></View> : null}</View></Pressable>; })}</View> : <AppCard style={styles.calendarEmptyCard} styles={styles}><Text style={styles.statusTitle}>{calendarView === "today" ? calendarT("nothingToday") : calendarT("tapAnotherDay")}</Text><Text style={styles.hint}>{calendarT("noEventsScheduled")}</Text></AppCard>}
    </AppCard>

    {currentUserIsLeader ? <AppCard style={styles.calendarComposerCard} styles={styles}><SectionHeader eyebrow={t("calendar.leaderControlsEyebrow")} title={editingCalendarEntryId ? calendarT("editEntry") : calendarT("addEntry")} detail={t("calendar.leaderControlsDescription")} styles={styles} /><View style={styles.rankFilterRow}>{[["manual", calendarT("manualEvent")], ["reminder", calendarT("reminder")], ["linked_desert_storm", calendarT("linkDesertStorm")], ["linked_zombie_siege", calendarT("linkZombieSiege")]].map(([value, label]) => <Pressable key={value} style={[styles.rankFilterButton, newCalendarEntryType === value && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarEntryType(value)}><Text style={[styles.rankFilterButtonText, newCalendarEntryType === value && styles.rankFilterButtonTextActive]}>{label}</Text></Pressable>)}</View><TextInput value={newCalendarTitle} onChangeText={onChangeNewCalendarTitle} style={styles.input} placeholder={calendarT("eventTitle")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} /><View style={styles.row}><Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("startDate")}><Text style={styles.line}>{calendarT("startDate")}: {formatCalendarDateButtonLabel(newCalendarDate, language) || calendarT("chooseDate")}</Text></Pressable><Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("endDate")}><Text style={styles.line}>{calendarT("endDate")}: {formatCalendarDateButtonLabel(newCalendarEndDate, language) || calendarT("chooseDate")}</Text></Pressable></View><SecondaryButton label={newCalendarAllDay ? calendarT("allDayEntry") : calendarT("timeSpecificEntry")} onPress={onToggleNewCalendarAllDay} styles={styles} />{!newCalendarAllDay ? <AppCard variant="info" style={styles.calendarTimingCard} styles={styles}><SectionHeader eyebrow={t("calendar.timeEntryEyebrow")} title={calendarT("timePreview")} detail={calendarT("inputModeHint")} styles={styles} /><View style={styles.rankFilterRow}>{CALENDAR_TIME_INPUT_MODES.map((mode) => <Pressable key={mode.id} style={[styles.rankFilterButton, newCalendarTimeInputMode === mode.id && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarTimeInputMode(mode.id)}><Text style={[styles.rankFilterButtonText, newCalendarTimeInputMode === mode.id && styles.rankFilterButtonTextActive]}>{mode.id === "server" ? calendarT("serverInputMode") : calendarT("localInputMode")}</Text></Pressable>)}</View><View style={styles.row}><Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarTimePickerTarget("start")}><Text style={styles.line}>{calendarT("startTime")}: {newCalendarStartTime}</Text></Pressable><Pressable style={[styles.input, styles.half, styles.calendarTimeButton]} onPress={() => onChangeCalendarTimePickerTarget("end")}><Text style={styles.line}>{calendarT("endTime")}: {newCalendarEndTime}</Text></Pressable></View><View style={styles.calendarPreviewCard}><Text style={styles.statusEyebrow}>{calendarT("timePreview")}</Text><Text style={styles.hint}>{calendarT("previewEnteredAs", { value: newCalendarTimeInputMode === "server" ? calendarT("serverInputMode") : calendarT("localInputMode") })}</Text><ListRow title={calendarT("serverTime")} detail={timePreview?.serverDisplay || "--"} styles={styles} /><ListRow title={calendarT("localTime")} detail={`${timePreview?.localDisplay || "--"} (${normalizeCalendarTimeZone(newCalendarEventTimeZone)})`} styles={styles} /><Text style={styles.hint}>{calendarT("recurringServerAnchor")}</Text></View></AppCard> : null}{linkEventOptions.length ? <View style={styles.section}><Text style={styles.hint}>{calendarT("chooseLinkedEvent")}</Text><View style={styles.rankFilterRow}>{linkEventOptions.map((event) => <Pressable key={event.id} style={[styles.rankFilterButton, newCalendarLinkedEventId === event.id && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarLinkedEventId(event.id)}><Text style={[styles.rankFilterButtonText, newCalendarLinkedEventId === event.id && styles.rankFilterButtonTextActive]}>{event.title}</Text></Pressable>)}</View></View> : null}<View style={styles.section}><Text style={styles.hint}>{calendarT("repeat")}</Text><View style={styles.rankFilterRow}>{[["none", calendarT("noRepeat")], ["daily", calendarT("daily")], ["every_other_day", calendarT("everyOtherDay")], ["weekly", calendarT("weekly")], ["custom_weekdays", calendarT("customWeekdays")]].map(([value, label]) => <Pressable key={value} style={[styles.rankFilterButton, newCalendarRepeat === value && styles.rankFilterButtonActive]} onPress={() => onChangeNewCalendarRepeat(value)}><Text style={[styles.rankFilterButtonText, newCalendarRepeat === value && styles.rankFilterButtonTextActive]}>{label}</Text></Pressable>)}</View></View>{newCalendarRepeat === "custom_weekdays" ? <View style={styles.rankFilterRow}>{CALENDAR_WEEKDAY_OPTIONS.map((option) => <Pressable key={option.code} style={[styles.rankFilterButton, newCalendarRepeatWeekdays.includes(option.code) && styles.rankFilterButtonActive]} onPress={() => onToggleNewCalendarRepeatWeekday(option.code)}><Text style={[styles.rankFilterButtonText, newCalendarRepeatWeekdays.includes(option.code) && styles.rankFilterButtonTextActive]}>{getCalendarWeekdayLabel(option.code, language)}</Text></Pressable>)}</View> : null}{newCalendarRepeat !== "none" ? <View style={styles.section}><Pressable style={[styles.input, styles.calendarTimeButton]} onPress={() => onChangeCalendarDatePickerTarget("repeatEndDate")}><Text style={styles.line}>{calendarT("repeatEndDate")}: {newCalendarRepeatEndDate ? formatCalendarDateButtonLabel(newCalendarRepeatEndDate, language) : calendarT("setRepeatEndDate")}</Text></Pressable>{newCalendarRepeatEndDate ? <SecondaryButton label={calendarT("clearRepeatEndDate")} onPress={() => onChangeNewCalendarRepeatEndDate("")} styles={styles} /> : null}</View> : null}<TextInput value={newCalendarDescription} onChangeText={onChangeNewCalendarDescription} style={[styles.input, styles.textArea]} placeholder={newCalendarEntryType === "reminder" ? calendarT("reminderPlaceholder") : calendarT("manualPlaceholder")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} multiline /><TextInput value={newCalendarLeaderNotes} onChangeText={onChangeNewCalendarLeaderNotes} style={[styles.input, styles.textArea]} placeholder={calendarT("leaderNotes")} placeholderTextColor={INPUT_PLACEHOLDER_COLOR} selectionColor={INPUT_SELECTION_COLOR} multiline />{!newCalendarAllDay ? <Text style={styles.hint}>{calendarT("timezoneHint", { value: getServerTimeLabel() })}</Text> : null}{calendarFormError ? <Text style={styles.error}>{calendarFormError}</Text> : null}<View style={styles.row}><Pressable style={[styles.secondaryButton, styles.half, newCalendarLeaderOnly && styles.modeButtonActive]} onPress={onToggleLeaderOnly}><Text style={[styles.secondaryButtonText, newCalendarLeaderOnly && styles.modeButtonTextActive]}>{newCalendarLeaderOnly ? calendarT("leaderOnlyEntry") : calendarT("visibleToEveryone")}</Text></Pressable><View style={styles.half}><PrimaryButton label={editingCalendarEntryId ? calendarT("saveChanges") : calendarT("addToCalendar")} onPress={onCreateEntry} styles={styles} /></View></View>{editingCalendarEntryId ? <SecondaryButton label={calendarT("cancelEditing")} onPress={onCancelEdit} styles={styles} /> : null}</AppCard> : null}
    <CalendarTimePickerModal visible={calendarTimePickerTarget === "start" || calendarTimePickerTarget === "end"} title={calendarTimePickerTarget === "end" ? calendarT("pickEndTime") : calendarT("pickStartTime")} value={calendarTimePickerTarget === "end" ? newCalendarEndTime : newCalendarStartTime} minValue={calendarTimePickerTarget === "end" && newCalendarEndDate === newCalendarDate ? newCalendarStartTime : ""} onChange={(nextValue) => { if (calendarTimePickerTarget === "end") { onChangeNewCalendarEndTime(nextValue); } else { onChangeNewCalendarStartTime(nextValue); } }} onClose={() => onChangeCalendarTimePickerTarget("")} language={language} t={t} />
    <CalendarDatePickerModal visible={calendarDatePickerTarget === "startDate" || calendarDatePickerTarget === "endDate" || calendarDatePickerTarget === "repeatEndDate"} title={calendarDatePickerTarget === "repeatEndDate" ? calendarT("repeatEndDate") : calendarDatePickerTarget === "endDate" ? calendarT("endDate") : calendarT("pickDate")} value={calendarDatePickerTarget === "repeatEndDate" ? (newCalendarRepeatEndDate || newCalendarDate) : calendarDatePickerTarget === "endDate" ? newCalendarEndDate : newCalendarDate} onChange={(nextValue) => { if (calendarDatePickerTarget === "repeatEndDate") { onChangeNewCalendarRepeatEndDate(nextValue); } else if (calendarDatePickerTarget === "endDate") { onChangeNewCalendarEndDate(nextValue); } else { onChangeNewCalendarDate(nextValue); } }} onClose={() => onChangeCalendarDatePickerTarget("")} language={language} t={t} />
  </View>;
}
