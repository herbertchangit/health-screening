import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        style={[styles.option, language === 'en' && styles.optionActive]}
        onPress={() => setLanguage('en')}
      >
        <Text style={[styles.optionText, language === 'en' && styles.optionTextActive]}>
          {t('language.english')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.option, language === 'zh' && styles.optionActive]}
        onPress={() => setLanguage('zh')}
      >
        <Text style={[styles.optionText, language === 'zh' && styles.optionTextActive]}>
          {t('language.chinese')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    overflow: 'hidden',
  },
  containerCompact: {
    alignSelf: 'center',
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  optionActive: {
    backgroundColor: '#ffffff',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  optionTextActive: {
    color: '#1a73e8',
  },
});
