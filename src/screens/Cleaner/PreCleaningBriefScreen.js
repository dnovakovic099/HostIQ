import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPreCleaningBrief,
  acknowledgePreCleaningBrief,
} from '../../api/securestay';
import colors from '../../theme/colors';

/**
 * Required pre-cleaning brief screen. Loads the SecureStay-derived
 * brief for the inspection's listing (recent issues, last guest,
 * recurring patterns, watch-for items) and forces the cleaner to
 * acknowledge before proceeding to media capture.
 *
 * Routed to instead of CaptureMedia. On acknowledge (or when no
 * brief is available), forwards to CaptureMedia with the same
 * route params via navigation.replace().
 *
 * Route params:
 *   inspectionId: string  (required)
 *   nextScreen:   string  (default 'CaptureMedia')
 *   nextParams:   object  (forwarded as-is)
 */
export default function PreCleaningBriefScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const {
    inspectionId,
    nextScreen = 'CaptureMedia',
    nextParams = {},
  } = route?.params || {};

  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [acknowledging, setAcknowledging] = useState(false);
  const proceededRef = useRef(false);

  const proceed = (replace = true) => {
    if (proceededRef.current) return;
    proceededRef.current = true;
    if (replace) navigation.replace(nextScreen, nextParams);
    else navigation.navigate(nextScreen, nextParams);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!inspectionId) {
        proceed();
        return;
      }
      try {
        const data = await getPreCleaningBrief(inspectionId);
        if (!alive) return;
        if (!data?.available) {
          // No SS link or no integration — skip silently.
          proceed();
          return;
        }
        if (data.acknowledged_at) {
          // Already acknowledged previously (refresh case).
          proceed();
          return;
        }
        setState({ loading: false, error: null, data });
      } catch (err) {
        console.warn('[PreCleaningBrief] load failed:', err.message);
        // On error, don't block the cleaner.
        proceed();
      }
    })();
    return () => {
      alive = false;
    };
  }, [inspectionId]);

  const onAcknowledge = async () => {
    setAcknowledging(true);
    try {
      await acknowledgePreCleaningBrief(inspectionId);
      proceed();
    } catch (err) {
      Alert.alert('Could not save', err.response?.data?.error || err.message);
    } finally {
      setAcknowledging(false);
    }
  };

  if (state.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loaderText}>Loading pre-cleaning brief…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const brief = state.data?.brief;
  if (!brief) {
    proceed();
    return null;
  }

  const { listing, headline, last_guest, recurring_categories, open_issues, recent_issues, watch_for, low_rated_quotes, counts } = brief;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradients.dashboardHeader}
        locations={colors.gradients.dashboardHeaderLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Pre-Cleaning Brief</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {listing?.name || 'Property'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline card */}
        <View style={styles.headlineCard}>
          <Ionicons name="alert-circle-outline" size={20} color={colors.accent.info} />
          <Text style={styles.headlineText}>{headline}</Text>
        </View>

        {/* Last guest */}
        {last_guest ? (
          <Section
            icon="person-outline"
            title="Last guest"
            tint={last_guest.notable ? colors.status.warning : colors.accent.info}
          >
            <Text style={styles.cardSubtext}>{last_guest.headline}</Text>
            <View style={styles.metaRow}>
              {last_guest.guest_name ? <Meta label="Guest" value={last_guest.guest_name} /> : null}
              {last_guest.arrival_date ? (
                <Meta
                  label="Stay"
                  value={`${fmtDate(last_guest.arrival_date)} – ${fmtDate(last_guest.departure_date)}`}
                />
              ) : null}
              {typeof last_guest.review?.rating === 'number' ? (
                <Meta label="Rating" value={`${last_guest.review.rating}/10`} />
              ) : null}
            </View>
            {last_guest.review?.public_review ? (
              <View style={styles.quoteBox}>
                <Text style={styles.quoteText} numberOfLines={5}>
                  "{last_guest.review.public_review}"
                </Text>
              </View>
            ) : null}
            {last_guest.issues_during_or_after_stay?.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subheading}>
                  Issues from this stay ({last_guest.issues_during_or_after_stay.length})
                </Text>
                {last_guest.issues_during_or_after_stay.slice(0, 5).map((i) => (
                  <IssueRow key={i.id} issue={i} />
                ))}
              </View>
            ) : null}
          </Section>
        ) : null}

        {/* Recurring patterns */}
        {recurring_categories?.length > 0 ? (
          <Section
            icon="repeat"
            title="Recurring patterns"
            tint={colors.status.warning}
            subtitle="Categories flagged 3+ times — give them extra attention"
          >
            <View style={styles.chipRow}>
              {recurring_categories.slice(0, 6).map((c) => (
                <View key={c.category} style={styles.chip}>
                  <Text style={styles.chipText}>
                    {c.category} · {c.count}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* Open issues */}
        {open_issues?.length > 0 ? (
          <Section icon="alert-circle" title={`Open issues (${open_issues.length})`} tint={colors.status.error}>
            {open_issues.map((i) => (
              <IssueRow key={i.id} issue={i} />
            ))}
          </Section>
        ) : null}

        {/* Recent (closed-but-recent) issues */}
        {recent_issues?.length > 0 ? (
          <Section icon="time-outline" title={`Recent (last 30 days)`} tint={colors.accent.info}>
            {recent_issues.slice(0, 5).map((i) => (
              <IssueRow key={i.id} issue={i} />
            ))}
          </Section>
        ) : null}

        {/* Watch-for bullets */}
        {watch_for?.length > 0 ? (
          <Section icon="bulb-outline" title="What to watch for" tint={colors.accent.info}>
            {watch_for.slice(0, 8).map((w, idx) => (
              <View key={idx} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{w.text || w}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {/* Low-rated quotes */}
        {low_rated_quotes?.length > 0 ? (
          <Section icon="chatbubble-ellipses-outline" title="Recent guest complaints" tint={colors.status.warning}>
            {low_rated_quotes.slice(0, 3).map((q, idx) => (
              <View key={idx} style={styles.quoteBox}>
                <Text style={styles.quoteText} numberOfLines={4}>"{q.public_review || q.quote || q}"</Text>
                {typeof q.rating === 'number' ? (
                  <Text style={styles.quoteMeta}>★ {q.rating}/10{q.guest_name ? ` · ${q.guest_name}` : ''}</Text>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {/* Counts footer */}
        {counts ? (
          <Text style={styles.countsLine}>
            Window: last {brief.window_days || 90} days · {counts.open_issues} open · {counts.recent_issues} recent · {counts.recurring_categories} recurring categories · {counts.bad_reviews}/{counts.reviews_window} low ratings
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.acknowledgeBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.acknowledgeBtn, acknowledging && styles.acknowledgeBtnDisabled]}
          onPress={onAcknowledge}
          disabled={acknowledging}
          activeOpacity={0.85}
        >
          {acknowledging ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.acknowledgeText}>I've reviewed this — start cleaning</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Section({ icon, title, subtitle, tint, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: (tint || colors.accent.info) + '22' }]}>
          <Ionicons name={icon} size={16} color={tint || colors.accent.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View>{children}</View>
    </View>
  );
}

function IssueRow({ issue }) {
  return (
    <View style={styles.issueRow}>
      <View style={[styles.statusDot, { backgroundColor: statusColor(issue.status) }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.issueLine} numberOfLines={3}>
          {issue.description || issue.category || 'Issue'}
        </Text>
        <Text style={styles.issueMeta}>
          {[
            issue.category,
            issue.status,
            issue.reported_at ? fmtDate(issue.reported_at) : null,
            issue.guest_name ? `Guest: ${issue.guest_name}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </View>
  );
}

function Meta({ label, value }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}
function statusColor(status) {
  if (status === 'New' || status === 'Open') return colors.status.error;
  if (status === 'In Progress') return colors.status.warning;
  if (status === 'Scheduled') return colors.primary.main;
  if (status === 'Completed') return colors.status.success;
  return colors.text.tertiary;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backBtn: { padding: 6, marginTop: 4 },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },

  loaderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: colors.text.secondary, fontSize: 14 },

  scroll: { padding: 16 },
  headlineCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.background.elevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  headlineText: { flex: 1, color: colors.text.primary, fontSize: 14, fontWeight: '600', lineHeight: 20 },

  sectionCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionIconWrap: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
  sectionSubtitle: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
  cardSubtext: { color: colors.text.primary, fontSize: 14, lineHeight: 20 },
  subheading: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  metaPill: {
    backgroundColor: colors.background.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  metaLabel: { color: colors.text.tertiary, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  metaValue: { color: colors.text.primary, fontSize: 13, fontWeight: '600', marginTop: 2 },

  quoteBox: {
    backgroundColor: colors.background.elevated,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  quoteText: { color: colors.text.primary, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  quoteMeta: { color: colors.text.tertiary, fontSize: 11, marginTop: 4 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.accent.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: { color: colors.status.warning, fontSize: 12, fontWeight: '700' },

  issueRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  issueLine: { color: colors.text.primary, fontSize: 13, lineHeight: 18 },
  issueMeta: { color: colors.text.tertiary, fontSize: 11, marginTop: 3 },

  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bulletDot: { color: colors.accent.info, fontSize: 14, lineHeight: 18 },
  bulletText: { flex: 1, color: colors.text.primary, fontSize: 13, lineHeight: 18 },

  countsLine: { color: colors.text.tertiary, fontSize: 11, marginTop: 12, textAlign: 'center' },

  acknowledgeBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  acknowledgeBtn: {
    backgroundColor: colors.primary.main,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  acknowledgeBtnDisabled: { opacity: 0.6 },
  acknowledgeText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
