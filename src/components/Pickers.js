import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { formatReminderDateKey, isValidReminderDateKey, parseReminderTimeValue } from "../lib/reminders";

function buildWheelValues(start, end, formatter = (value) => String(value)) {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push({ value, label: formatter(value) });
  }
  return values;
}

function formatTwoDigit(value) {
  return String(value).padStart(2, "0");
}

function CalendarTimeWheelColumn({ value, values, onChange, styles, itemHeight }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const index = Math.max(0, values.findIndex((entry) => entry.value === value));
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: index * itemHeight, animated: false });
    });
  }, [itemHeight, value, values]);

  return <View style={styles.calendarWheelColumn}>
    <ScrollView
      ref={scrollRef}
      showsVerticalScrollIndicator={false}
      snapToInterval={itemHeight}
      decelerationRate="fast"
      contentContainerStyle={styles.calendarWheelContent}
      onMomentumScrollEnd={(event) => {
        const index = Math.max(0, Math.min(values.length - 1, Math.round(event.nativeEvent.contentOffset.y / itemHeight)));
        const nextValue = values[index]?.value;
        if (nextValue !== undefined && nextValue !== value) {
          onChange(nextValue);
        }
      }}
    >
      {values.map((entry) => <Pressable key={`${entry.value}`} style={styles.calendarWheelItem} onPress={() => onChange(entry.value)}>
        <Text style={[styles.calendarWheelText, entry.value === value && styles.calendarWheelTextActive]}>{entry.label}</Text>
      </Pressable>)}
    </ScrollView>
    <View pointerEvents="none" style={styles.calendarWheelHighlight} />
  </View>;
}

export function CalendarTimePickerModal({ visible, title, value, minValue = "", onChange, onClose, styles, itemHeight, BottomSheetModal, SectionHeader, PrimaryButton }) {
  const parsedValue = parseReminderTimeValue(value || "00:00") || { hours: 0, minutes: 0 };
  const parsedMin = parseReminderTimeValue(minValue || "") || null;
  const [hourValue, setHourValue] = useState(parsedValue.hours);
  const [minuteValue, setMinuteValue] = useState(parsedValue.minutes);

  useEffect(() => {
    setHourValue(parsedValue.hours);
    setMinuteValue(parsedValue.minutes);
  }, [value]);

  useEffect(() => {
    if (!parsedMin) return;
    if (hourValue < parsedMin.hours) {
      setHourValue(parsedMin.hours);
      setMinuteValue(parsedMin.minutes);
      return;
    }
    if (hourValue === parsedMin.hours && minuteValue < parsedMin.minutes) {
      setMinuteValue(parsedMin.minutes);
    }
  }, [hourValue, minuteValue, parsedMin]);

  useEffect(() => {
    onChange(`${formatTwoDigit(hourValue)}:${formatTwoDigit(minuteValue)}`);
  }, [hourValue, minuteValue]);

  const hourOptions = buildWheelValues(parsedMin ? parsedMin.hours : 0, 23, formatTwoDigit);
  const minuteStart = parsedMin && hourValue === parsedMin.hours ? parsedMin.minutes : 0;
  const minuteOptions = buildWheelValues(minuteStart, 59, formatTwoDigit);

  if (!visible) return null;

  return <BottomSheetModal visible={visible} onClose={onClose}>
    <SectionHeader eyebrow="Picker" title={title} detail="" />
    <View style={styles.calendarWheelHeader}>
      <Text style={styles.hint}>Hour</Text>
      <Text style={styles.hint}>Minute</Text>
    </View>
    <View style={styles.calendarWheelRow}>
      <CalendarTimeWheelColumn value={hourValue} values={hourOptions} onChange={setHourValue} styles={styles} itemHeight={itemHeight} />
      <CalendarTimeWheelColumn value={minuteValue} values={minuteOptions} onChange={setMinuteValue} styles={styles} itemHeight={itemHeight} />
    </View>
    <PrimaryButton label="Done" onPress={onClose} />
  </BottomSheetModal>;
}

export function CalendarDatePickerModal({ visible, title, value, onChange, onClose, styles, itemHeight, BottomSheetModal, SectionHeader, PrimaryButton }) {
  const safeValue = isValidReminderDateKey(value) ? value : formatReminderDateKey(new Date());
  const [yearValue, setYearValue] = useState(Number.parseInt(safeValue.slice(0, 4), 10));
  const [monthValue, setMonthValue] = useState(Number.parseInt(safeValue.slice(5, 7), 10));
  const [dayValue, setDayValue] = useState(Number.parseInt(safeValue.slice(8, 10), 10));

  useEffect(() => {
    const normalized = isValidReminderDateKey(value) ? value : formatReminderDateKey(new Date());
    setYearValue(Number.parseInt(normalized.slice(0, 4), 10));
    setMonthValue(Number.parseInt(normalized.slice(5, 7), 10));
    setDayValue(Number.parseInt(normalized.slice(8, 10), 10));
  }, [value]);

  const maxDay = new Date(yearValue, monthValue, 0).getDate();
  useEffect(() => {
    if (dayValue > maxDay) setDayValue(maxDay);
  }, [dayValue, maxDay]);

  useEffect(() => {
    onChange(`${yearValue}-${formatTwoDigit(monthValue)}-${formatTwoDigit(Math.min(dayValue, maxDay))}`);
  }, [yearValue, monthValue, dayValue, maxDay]);

  const monthOptions = buildWheelValues(1, 12, formatTwoDigit);
  const dayOptions = buildWheelValues(1, maxDay, formatTwoDigit);
  const currentYear = new Date().getFullYear();
  const yearOptions = buildWheelValues(currentYear - 1, currentYear + 3, String);

  if (!visible) return null;

  return <BottomSheetModal visible={visible} onClose={onClose}>
    <SectionHeader eyebrow="Picker" title={title} />
    <View style={styles.calendarWheelHeader}>
      <Text style={styles.hint}>Month</Text>
      <Text style={styles.hint}>Day</Text>
      <Text style={styles.hint}>Year</Text>
    </View>
    <View style={styles.calendarWheelRow}>
      <CalendarTimeWheelColumn value={monthValue} values={monthOptions} onChange={setMonthValue} styles={styles} itemHeight={itemHeight} />
      <CalendarTimeWheelColumn value={Math.min(dayValue, maxDay)} values={dayOptions} onChange={setDayValue} styles={styles} itemHeight={itemHeight} />
      <CalendarTimeWheelColumn value={yearValue} values={yearOptions} onChange={setYearValue} styles={styles} itemHeight={itemHeight} />
    </View>
    <PrimaryButton label="Done" onPress={onClose} />
  </BottomSheetModal>;
}

export function ReminderDurationPickerModal({ visible, title, valueSeconds, onChange, onClose, styles, itemHeight, BottomSheetModal, SectionHeader, PrimaryButton }) {
  const totalSeconds = Math.max(0, Number(valueSeconds) || 0);
  const [hours, setHours] = useState(Math.floor(totalSeconds / 3600));
  const [minutes, setMinutes] = useState(Math.floor((totalSeconds % 3600) / 60));
  const [seconds, setSeconds] = useState(totalSeconds % 60);

  useEffect(() => {
    const normalized = Math.max(0, Number(valueSeconds) || 0);
    setHours(Math.floor(normalized / 3600));
    setMinutes(Math.floor((normalized % 3600) / 60));
    setSeconds(normalized % 60);
  }, [valueSeconds]);

  useEffect(() => {
    onChange(hours * 3600 + minutes * 60 + seconds);
  }, [hours, minutes, seconds]);

  if (!visible) return null;

  return <BottomSheetModal visible={visible} onClose={onClose}>
    <SectionHeader eyebrow="Reminder" title={title} detail="Set hours, minutes, and seconds for the countdown." />
    <View style={styles.calendarWheelHeader}>
      <Text style={styles.hint}>Hours</Text>
      <Text style={styles.hint}>Minutes</Text>
      <Text style={styles.hint}>Seconds</Text>
    </View>
    <View style={styles.calendarWheelRow}>
      <CalendarTimeWheelColumn value={hours} values={buildWheelValues(0, 23, formatTwoDigit)} onChange={setHours} styles={styles} itemHeight={itemHeight} />
      <CalendarTimeWheelColumn value={minutes} values={buildWheelValues(0, 59, formatTwoDigit)} onChange={setMinutes} styles={styles} itemHeight={itemHeight} />
      <CalendarTimeWheelColumn value={seconds} values={buildWheelValues(0, 59, formatTwoDigit)} onChange={setSeconds} styles={styles} itemHeight={itemHeight} />
    </View>
    <PrimaryButton label="Done" onPress={onClose} />
  </BottomSheetModal>;
}
