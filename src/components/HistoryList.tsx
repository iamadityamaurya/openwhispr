import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { DictationItem } from '../services/storage';
import { Theme } from '../constants/designSystem';

interface HistoryListProps {
  items: DictationItem[];
  onSpeakItem: (text: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  items,
  onSpeakItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="mic" size={26} color={Theme.colors.cyan} />
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySubtitle}>
          Your transcriptions and refined dictations will appear here automatically.
        </Text>

        <View style={styles.tipBox}>
          <Ionicons name="sparkles-outline" size={14} color={Theme.colors.cyan} />
          <Text style={styles.tipText}>
            Tip: Speak naturally — OpenWhispr removes “ums”, stutters, and fixes grammar along the way.
          </Text>
        </View>
      </View>
    );
  }

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const countWords = (text: string) => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Ionicons name="time-outline" size={13} color={Theme.colors.cyan} />
          <Text style={styles.headerTitle}>Recent dictations · {items.length}</Text>
        </View>
        <TouchableOpacity
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onClearAll();
          }}
          style={styles.clearBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const words = countWords(item.cleanedText);
          const durationSec = ((item.durationMs || 0) / 1000).toFixed(1);
          const providerColor =
            item.sttProvider === 'deepgram'
              ? Theme.colors.cyan
              : item.sttProvider === 'groq'
              ? Theme.colors.amber
              : item.sttProvider === 'openai'
              ? Theme.colors.purple
              : '#D9A441';

          return (
            <View style={styles.card}>
              <View style={[styles.cardAccentStripe, { backgroundColor: providerColor }]} />

              <View style={styles.cardBody}>
                {/* Meta row */}
                <View style={styles.cardHeader}>
                  <View style={styles.metaRow}>
                    <View style={[styles.providerBadge, { borderColor: providerColor }]}>
                      <Text style={[styles.providerText, { color: providerColor }]}>
                        {item.sttProvider}
                      </Text>
                    </View>
                    <Text style={styles.pipelineArrow}>➔</Text>
                    <Text style={styles.llmText}>{item.llmProvider}</Text>
                    <Text style={styles.dot}>•</Text>
                    <Text style={styles.timeTag}>{formatTimestamp(item.timestamp)}</Text>
                    {item.cleanupMode && item.cleanupMode !== 'natural' && (
                      <>
                        <Text style={styles.dot}>•</Text>
                        <View style={styles.personaBadge}>
                          <Text style={styles.personaBadgeText}>
                            {item.cleanupMode === 'casual'
                              ? '💬 Casual'
                              : item.cleanupMode === 'email'
                              ? '✉️ Email'
                              : item.cleanupMode === 'notes'
                              ? '☑️ Notes'
                              : item.cleanupMode === 'translate_en'
                              ? '文A English'
                              : '✨ Natural'}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onSpeakItem(item.cleanedText);
                      }}
                      style={styles.actionIconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="volume-medium-outline" size={15} color={Theme.colors.cyan} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCopy(item.cleanedText)}
                      style={styles.actionIconBtn}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="copy-outline" size={14} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onDeleteItem(item.id);
                      }}
                      style={styles.actionIconBtnDelete}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={13} color="#E0857E" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Cleaned text */}
                <Text style={styles.cleanedText} selectable>
                  {item.cleanedText}
                </Text>

                {/* Footer details */}
                <View style={styles.cardFooter}>
                  <View style={styles.statPill}>
                    <Ionicons name="text-outline" size={11} color={Theme.colors.textMuted} />
                    <Text style={styles.statPillText}>{words} words</Text>
                  </View>
                  {item.durationMs > 0 && (
                    <View style={styles.statPill}>
                      <Ionicons name="mic-outline" size={11} color={Theme.colors.textMuted} />
                      <Text style={styles.statPillText}>{durationSec}s</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: Theme.fonts.semiBold,
    letterSpacing: 0.2,
  },
  clearBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(229, 72, 77, 0.1)',
  },
  clearBtnText: {
    color: '#E0857E',
    fontSize: 11,
    fontFamily: Theme.fonts.semiBold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 24,
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
    marginTop: 14,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(63, 174, 110, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Theme.fonts.title,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    fontFamily: Theme.fonts.regular,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 16,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(63, 174, 110, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.15)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 320,
  },
  tipText: {
    color: Theme.colors.cyanBright,
    fontSize: 11.5,
    fontFamily: Theme.fonts.regular,
    lineHeight: 16,
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.cardGlass,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  cardAccentStripe: {
    width: 3.5,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  providerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 246, 230, 0.04)',
  },
  providerText: {
    fontSize: 10,
    fontFamily: Theme.fonts.monoBold,
    letterSpacing: 0.4,
  },
  personaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(63, 174, 110, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(63, 174, 110, 0.22)',
  },
  personaBadgeText: {
    fontSize: 10,
    fontFamily: Theme.fonts.semiBold,
    color: Theme.colors.cyanBright,
  },
  pipelineArrow: {
    color: Theme.colors.textMuted,
    fontSize: 10,
  },
  llmText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: Theme.fonts.mono,
  },
  dot: {
    color: Theme.colors.textMuted,
    fontSize: 10,
  },
  timeTag: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.mono,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 246, 230, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 246, 230, 0.08)',
  },
  actionIconBtnDelete: {
    padding: 6,
    backgroundColor: 'rgba(229, 72, 77, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(229, 72, 77, 0.2)',
  },
  cleanedText: {
    color: '#F7F1E6',
    fontSize: 14.5,
    lineHeight: 22,
    fontFamily: Theme.fonts.regular,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 246, 230, 0.05)',
    paddingTop: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statPillText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    fontFamily: Theme.fonts.mono,
  },
});
