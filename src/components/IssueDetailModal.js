import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Full-screen-ish modal that shows every detail we have on a brief
 * watch_for item. Used by:
 *   - PreCleaningBriefScreen → WatchItem (tap)
 *   - IssueAckCard           → info icon (tap)
 *   - PropertyWideIssuesScreen
 *   - RoomCaptureScreen recent-issues
 *
 * Keep this component dumb — it just renders whatever it receives.
 *
 * Props:
 *   visible:    boolean
 *   onClose:    () => void
 *   item:       WatchForItem (server shape) — see brief.js
 */
export default function IssueDetailModal({ visible, onClose, item }) {
  if (!item) return null;

  const isReview = item.type === 'review';
  const isOpen = item.source === 'open';
  const isRecurringHistorical = item.source === 'recurring';
  const isRecent = item.source === 'reported';

  let badgeLabel = 'REPORTED';
  let badgeColor = '#6B7280';
  if (isOpen) {
    badgeLabel = 'STILL OPEN';
    badgeColor = '#EF4444';
  } else if (isReview) {
    badgeLabel = typeof item.rating === 'number' ? `${item.rating}★ REVIEW` : 'GUEST REVIEW';
    badgeColor = '#8B5CF6';
  } else if (isRecurringHistorical) {
    badgeLabel = 'RECURRING (HISTORICAL)';
    badgeColor = '#F59E0B';
  } else if (isRecent) {
    badgeLabel = 'REPORTED · LAST 30 DAYS';
    badgeColor = '#3B82F6';
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['top']} style={{ flex: 1 }}>
            <View style={styles.handleBar} />
            <View style={styles.headerRow}>
              <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                <Text style={styles.badgeText}>{badgeLabel}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            >
              {item.category ? (
                <Text style={styles.category}>{item.category.toUpperCase()}</Text>
              ) : null}

              <Text style={styles.description}>
                {item.full_review || item.description || 'No description available.'}
              </Text>

              {item.is_recurring && item.recurring_count > 0 ? (
                <View style={styles.calloutAmber}>
                  <Ionicons name="repeat" size={16} color="#B45309" />
                  <Text style={styles.calloutText}>
                    Recurring · seen {item.recurring_count}× recently
                  </Text>
                </View>
              ) : null}

              {!item.is_recurring && item.category_recurrence && item.category_recurrence.count > 0 ? (
                <View style={styles.calloutAmber}>
                  <Ionicons name="trending-up" size={16} color="#B45309" />
                  <Text style={styles.calloutText}>
                    Pattern: {item.category_recurrence.category} reported{' '}
                    {item.category_recurrence.count}× in last{' '}
                    {item.category_recurrence.window_days}d at this property —
                    this specific issue may or may not be a repeat.
                  </Text>
                </View>
              ) : null}

              {item.photo_required ? (
                <View style={styles.calloutBlue}>
                  <Ionicons name="camera-outline" size={16} color="#1E40AF" />
                  <Text style={styles.calloutBlueText}>
                    A photo helps verify this — uploading one boosts your score.
                  </Text>
                </View>
              ) : null}

              <View style={styles.metaGrid}>
                {item.status ? (
                  <MetaRow icon="information-circle-outline" label="Status" value={item.status} />
                ) : null}
                {item.reported_at ? (
                  <MetaRow
                    icon="calendar-outline"
                    label={isReview ? 'Submitted' : 'Reported'}
                    value={fmtDate(item.reported_at)}
                  />
                ) : null}
                {item.guest_name ? (
                  <MetaRow icon="person-outline" label="Guest" value={item.guest_name} />
                ) : null}
                {item.channel ? (
                  <MetaRow icon="globe-outline" label="Channel" value={item.channel} />
                ) : null}
                {item.urgency ? (
                  <MetaRow icon="alert-circle-outline" label="Urgency" value={String(item.urgency)} />
                ) : null}
                {item.due_date ? (
                  <MetaRow icon="time-outline" label="Due" value={fmtDate(item.due_date)} />
                ) : null}
              </View>

              {Array.isArray(item.detected_categories) && item.detected_categories.length > 1 ? (
                <View style={styles.tagsWrap}>
                  <Text style={styles.tagsLabel}>Detected topics:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {item.detected_categories.map((c) => (
                      <View key={c} style={styles.tag}>
                        <Text style={styles.tagText}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MetaRow({ icon, label, value }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={16} color="#6B7280" style={{ marginRight: 8 }} />
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function fmtDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(d);
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '50%',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
    color: '#111827',
    marginBottom: 16,
  },
  calloutAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  calloutText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  calloutBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  calloutBlueText: {
    fontSize: 13,
    color: '#1E40AF',
    fontWeight: '600',
    flex: 1,
  },
  metaGrid: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    width: 90,
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  tagsWrap: {
    marginTop: 16,
  },
  tagsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },
});
