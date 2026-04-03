import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StatusBar, Text, View } from "react-native";

export function ScreenContainer({ children, styles }) {
  return <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="light-content" />
    <KeyboardAvoidingView style={styles.keyboardShell} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
      {children}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function SectionHeader({ eyebrow, title, detail, styles }) {
  return <View style={styles.sectionHeader}>
    {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
    <Text style={styles.sectionHeaderTitle}>{title}</Text>
    {detail ? <Text style={styles.sectionHeaderDetail}>{detail}</Text> : null}
  </View>;
}

export function AppBackHeader({ title, onBack, backLabel = "Back", styles }) {
  return <View style={styles.appBackHeader}>
    <Pressable onPress={onBack} style={styles.appBackButton} accessibilityRole="button" accessibilityLabel={`${backLabel}: ${title}`}>
      <Ionicons name="chevron-back" size={20} color="#F4F7FB" />
      <Text style={styles.appBackButtonText}>{backLabel}</Text>
    </Pressable>
    <Text style={styles.appBackHeaderTitle} numberOfLines={1}>{title}</Text>
    <View style={styles.appBackHeaderSpacer} />
  </View>;
}

export function AppCard({ children, variant = "default", style, onPress, disabled = false, styles }) {
  const variantStyle = variant === "active"
    ? styles.cardActive
    : variant === "info"
      ? styles.cardInfo
      : variant === "warning"
        ? styles.cardWarning
        : variant === "danger"
          ? styles.cardDanger
          : variant === "purple"
            ? styles.cardPurple
            : styles.card;
  if (onPress) {
    return <Pressable disabled={disabled} onPress={onPress} style={[variantStyle, disabled && styles.disabled, style]}>{children}</Pressable>;
  }
  return <View style={[variantStyle, style]}>{children}</View>;
}

export function StatusBadge({ label, tone = "neutral", style, styles }) {
  const toneStyle = tone === "success"
    ? styles.statusBadgeSuccess
    : tone === "warning"
      ? styles.statusBadgeWarning
      : tone === "info"
        ? styles.statusBadgeInfo
        : tone === "danger"
          ? styles.statusBadgeDanger
          : tone === "purple"
            ? styles.statusBadgePurple
            : styles.statusBadgeNeutral;
  const textStyle = tone === "success"
    ? styles.statusBadgeTextSuccess
    : tone === "warning"
      ? styles.statusBadgeTextWarning
      : tone === "info"
        ? styles.statusBadgeTextInfo
        : tone === "danger"
          ? styles.statusBadgeTextDanger
          : tone === "purple"
            ? styles.statusBadgeTextPurple
            : styles.statusBadgeTextNeutral;
  return <View style={[styles.statusBadge, toneStyle, style]}>
    <Text style={[styles.statusBadgeText, textStyle]}>{label}</Text>
  </View>;
}

export function PrimaryButton({ label, onPress, disabled = false, style, tone = "green", styles }) {
  const toneStyle = tone === "blue" ? styles.primaryButtonBlue : tone === "purple" ? styles.primaryButtonPurple : tone === "red" ? styles.primaryButtonRed : styles.primaryButton;
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.buttonBase, toneStyle, disabled && styles.disabledButton, style]}>
    <Text style={styles.buttonText}>{label}</Text>
  </Pressable>;
}

export function SecondaryButton({ label, onPress, disabled = false, style, styles }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[styles.buttonBase, styles.secondaryButton, disabled && styles.disabledButton, style]}>
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </Pressable>;
}

export function ListRow({ title, detail, right, style, styles }) {
  return <View style={[styles.listRow, style]}>
    <View style={styles.listRowContent}>
      <Text style={styles.listRowTitle}>{title}</Text>
      {detail ? <Text style={styles.listRowDetail}>{detail}</Text> : null}
    </View>
    {right ? <View style={styles.listRowRight}>{right}</View> : null}
  </View>;
}

export function BottomSheetModal({ visible, onClose, children, styles }) {
  if (!visible) {
    return null;
  }

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.modalBackdrop}>
      <Pressable style={styles.modalBackdropDismissArea} onPress={onClose} />
      <SafeAreaView style={styles.modalSafeArea} pointerEvents="box-none">
        <View style={styles.modalSheetShell}>
          <View style={styles.modalHandle} />
          <View style={styles.modalCard}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    </View>
  </Modal>;
}

