import React from "react";
import { Pressable, Text, View } from "react-native";

export function LanguageSelector({ language, onChangeLanguage, options, styles, t }) {
  return <View style={styles.section}>
    <Text style={styles.sectionTitle}>{t("language")}</Text>
    <View style={styles.languageRow}>
      {options.map((option) => <Pressable key={option.code} style={[styles.languageButton, language === option.code && styles.languageButtonActive]} onPress={() => onChangeLanguage(option.code)}>
        <Text style={[styles.languageButtonText, language === option.code && styles.languageButtonTextActive]}>{option.label}</Text>
      </Pressable>)}
    </View>
  </View>;
}

export function RankSelector({ value, onChange, options, style, styles }) {
  return <View style={[styles.rankSelectorWrap, style]}>
    <View style={styles.rankDropdown}>
      {options.map((rank, index) => <Pressable key={rank} style={[styles.rankOption, index === 0 && { borderTopWidth: 0 }, value === rank && styles.rankOptionActive]} onPress={() => onChange(rank)}>
        <Text style={[styles.rankOptionText, value === rank && styles.rankOptionTextActive]}>{rank}</Text>
      </Pressable>)}
    </View>
  </View>;
}
