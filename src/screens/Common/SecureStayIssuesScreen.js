import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import shadows from '../../theme/shadows';
import {
  getAssignmentIssues,
  refreshAssignmentIssues,
} from '../../api/securestay';

/**
 * Full SecureStay issues list for one assignment. Reachable from
 * the SecureStayIssuesCard. Splits issues into "Recurring patterns"
 * (top) and "Active / recent" (bottom).
 */
export default function SecureStayIssuesScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { assignmentId, propertyName } = route.params || {};
  const [data, setData] = useState({ lookup: null, issues: [], counts: null, summary: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const fresh = await getAssignmentIssues(assignmentId);
      setData(fresh);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [assignmentId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await refreshAssignmentIssues(assignmentId);
      setData(fresh);
    } catch (err) {
      console.warn('refresh failed:', err.message);
    } finally {
      setRefreshing(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const recurring = (data.issues || []).filter((i) => i.is_recurring);
  const active = (data.issues || []).filter((i) => !i.is_recurring);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingTop: spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Property Issues</Text>
          {propertyName ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{propertyName}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary.main} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <LookupBanner lookup={data.lookup} counts={data.counts} />
          <SummaryCard summary={data.summary} />
          <CleanerReportCard report={data.lookup?.cleaner_report} />

          {recurring.length > 0 && (
            <Section
              title="Recurring patterns"
              subtitle="Categories that have flagged 3+ times for this property"
              issues={recurring}
              accent={colors.status.warning}
            />
          )}

          {active.length > 0 && (
            <Section
              title="Active & recent"
              subtitle="Open issues, plus anything reported in the last 90 days"
              issues={active}
              accent={colors.primary.main}
            />
          )}

          {data.issues?.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark" size={48} color={colors.status.success} />
              <Text style={styles.emptyText}>No SecureStay issues found</Text>
              <Text style={styles.emptySubtext}>
                {data.lookup?.match_strategy === 'none'
                  ? 'No matching SecureStay listing was found for this property\'s address.'
                  : 'This property has a clean record in SecureStay.'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ summary }) {
  if (!summary || summary.total === 0) return null;
  const stats = [
    { label: 'Open', value: summary.open, color: colors.status.error },
    { label: 'Recent (30d)', value: summary.recent_30d, color: colors.accent.info },
    { label: 'Recurring', value: summary.recurring, color: colors.status.warning },
  ];
  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <Ionicons name="analytics-outline" size={20} color={colors.primary.main} />
        <Text style={styles.summaryHeadline}>{summary.headline}</Text>
      </View>
      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View key={s.label} style={styles.statTile}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>
      {summary.recurring_categories?.length > 0 ? (
        <View style={styles.chipRow}>
          <Text style={styles.chipLabel}>Recurring categories:</Text>
          {summary.recurring_categories.map((c) => (
            <View key={c.category} style={styles.chip}>
              <Text style={styles.chipText}>{c.category} · {c.count}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CleanerReportCard({ report }) {
  if (!report) return null;
  const watchFor = report.watch_for || [];
  const quotes = report.low_rated_quotes || [];
  if (watchFor.length === 0 && quotes.length === 0) return null;
  return (
    <View style={styles.reportCard}>
      <View style={styles.reportHeader}>
        <Ionicons name="bulb-outline" size={20} color={colors.accent.info} />
        <Text style={styles.reportTitle}>What to watch for</Text>
      </View>
      {report.headline ? <Text style={styles.reportSubhead}>{report.headline}</Text> : null}
      {watchFor.length > 0 ? (
        <View style={{ marginTop: spacing.sm }}>
          {watchFor.slice(0, 8).map((line, i) => (
            <View key={`w-${i}`} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {quotes.length > 0 ? (
        <View style={{ marginTop: spacing.md }}>
          <Text style={styles.quotesLabel}>Recent guest complaints</Text>
          {quotes.slice(0, 3).map((q, i) => (
            <View key={`q-${i}`} style={styles.quoteBox}>
              <Text style={styles.quoteText} numberOfLines={3}>
                "{q.quote || q.text || q}"
              </Text>
              {q.rating != null ? (
                <Text style={styles.quoteMeta}>★ {q.rating}/10{q.guest_name ? ` · ${q.guest_name}` : ''}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LookupBanner({ lookup, counts }) {
  if (!lookup) return null;
  const fetchedAt = lookup.fetched_at ? new Date(lookup.fetched_at).toLocaleString() : '—';
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerLine}>
        Match strategy: <Text style={styles.bannerBold}>{lookup.match_strategy || 'none'}</Text>
      </Text>
      {lookup.matched_listing_id ? (
        <Text style={styles.bannerLine}>SecureStay listing #{lookup.matched_listing_id}</Text>
      ) : null}
      <Text style={styles.bannerLine}>
        {counts?.total ?? 0} cached · {counts?.recurring ?? 0} recurring · last refreshed {fetchedAt}
      </Text>
    </View>
  );
}

function Section({ title, subtitle, issues, accent }) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { borderLeftColor: accent }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {issues.map((issue) => (
        <IssueRow key={issue.id} issue={issue} />
      ))}
    </View>
  );
}

function statusColor(status) {
  if (status === 'New') return colors.status.error;
  if (status === 'In Progress') return colors.status.warning;
  if (status === 'Scheduled') return colors.primary.main;
  if (status === 'Completed') return colors.status.success;
  return colors.text.tertiary;
}

function IssueRow({ issue }) {
  const reportedAt = issue.issue_reported_at
    ? new Date(issue.issue_reported_at).toLocaleDateString()
    : null;
  return (
    <View style={styles.issueCard}>
      <View style={styles.issueHeaderRow}>
        <View style={[styles.statusPill, { backgroundColor: statusColor(issue.status) + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(issue.status) }]} />
          <Text style={[styles.statusText, { color: statusColor(issue.status) }]}>
            {issue.status || 'Unknown'}
          </Text>
        </View>
        {issue.is_recurring ? (
          <View style={styles.recurringPill}>
            <Ionicons name="repeat" size={12} color={colors.status.warning} />
            <Text style={styles.recurringText}>Recurring</Text>
          </View>
        ) : null}
      </View>
      {issue.category ? <Text style={styles.category}>{issue.category}</Text> : null}
      {issue.issue_description ? (
        <Text style={styles.description}>{issue.issue_description}</Text>
      ) : null}
      <View style={styles.metaRow}>
        {reportedAt ? <Text style={styles.metaText}>Reported {reportedAt}</Text> : null}
        {issue.guest_name ? <Text style={styles.metaText}>Guest: {issue.guest_name}</Text> : null}
        {issue.channel ? <Text style={styles.metaText}>{issue.channel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backBtn: { padding: spacing.xs, marginRight: spacing.sm },
  refreshBtn: { padding: spacing.xs },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.md },

  banner: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  bannerLine: { fontSize: typography.fontSize.xs, color: colors.text.secondary, marginBottom: 2 },
  bannerBold: { color: colors.text.primary, fontWeight: typography.fontWeight.semibold },

  summaryCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryHeadline: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  chipLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  chip: {
    backgroundColor: colors.accent.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  chipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.status.warning,
  },

  section: { marginBottom: spacing.lg },
  sectionHeader: {
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  issueCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  issueHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wide,
  },
  recurringPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent.warningLight,
  },
  recurringText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.status.warning,
  },
  category: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    letterSpacing: typography.letterSpacing.wide,
  },
  description: {
    marginTop: 4,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  metaText: { fontSize: typography.fontSize.xs, color: colors.text.tertiary },

  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  reportCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reportTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  reportSubhead: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 6 },
  bulletDot: { fontSize: typography.fontSize.md, color: colors.accent.info, lineHeight: 20 },
  bulletText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  quotesLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wide,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  quoteBox: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  quoteText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
  quoteMeta: {
    marginTop: 4,
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});
