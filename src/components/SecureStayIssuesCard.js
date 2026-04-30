import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import shadows from '../theme/shadows';
import {
  getAssignmentIssues,
  refreshAssignmentIssues,
} from '../api/securestay';

/**
 * Compact card surfaced on assignment lists. Shows a one-line summary
 * of SecureStay-detected issues for the property and a tap target that
 * opens the full list (handled by the parent via `onPress`).
 *
 * Stays mostly invisible when there's nothing useful to show:
 *   - lookup not run yet  -> spinner
 *   - SecureStay not connected -> hidden (returns null)
 *   - no issues found -> compact "no known issues" pill
 */
export default function SecureStayIssuesCard({ assignmentId, onPress, hideWhenEmpty = false }) {
  const [state, setState] = useState({
    loading: true, lookup: null, issues: [], counts: null, summary: null,
  });

  const load = useCallback(async () => {
    try {
      const data = await getAssignmentIssues(assignmentId);
      setState({
        loading: false,
        lookup: data.lookup,
        issues: data.issues || [],
        counts: data.counts || { total: 0, active: 0, recurring: 0 },
        summary: data.summary || null,
      });
    } catch (err) {
      console.warn('[SecureStayIssuesCard] load failed:', err.message);
      setState({ loading: false, lookup: null, issues: [], counts: { total: 0, active: 0, recurring: 0 }, summary: null });
    }
  }, [assignmentId]);

  useEffect(() => {
    if (assignmentId) load();
  }, [assignmentId, load]);

  if (!assignmentId) return null;
  if (state.loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.primary.main} />
        <Text style={styles.subtleText}>Checking SecureStay...</Text>
      </View>
    );
  }

  const status = state.lookup?.status;

  // No integration connected — hide entirely (avoids noise for owners
  // who don't use SecureStay).
  if (status === 'SKIPPED') return null;
  if (!state.lookup && hideWhenEmpty) return null;

  if (status === 'PENDING' || status === 'RUNNING') {
    return (
      <View style={[styles.card, styles.cardInfo]}>
        <Ionicons name="time-outline" size={18} color={colors.accent.info} />
        <Text style={styles.subtleText}>SecureStay sync in progress…</Text>
      </View>
    );
  }

  if (status === 'ERROR') {
    return (
      <View style={[styles.card, styles.cardError]}>
        <Ionicons name="alert-circle-outline" size={18} color={colors.status.error} />
        <Text style={styles.subtleText} numberOfLines={1}>
          SecureStay error: {state.lookup?.error_message || 'Try again later'}
        </Text>
      </View>
    );
  }

  const total = state.counts?.total || 0;
  const recurring = state.counts?.recurring || 0;
  const summary = state.summary;
  const open = summary?.open || 0;
  const isCritical = open > 0 || recurring > 0;

  if (total === 0) {
    if (hideWhenEmpty) return null;
    return (
      <View style={[styles.card, styles.cardOk]}>
        <Ionicons name="shield-checkmark" size={18} color={colors.status.success} />
        <Text style={styles.okText}>No known SecureStay issues</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.card, isCritical ? styles.cardWarn : styles.cardInfo]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name={isCritical ? 'warning' : 'information-circle-outline'}
          size={18}
          color={isCritical ? colors.status.warning : colors.accent.info}
        />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.headline} numberOfLines={1}>
          SecureStay · {summary?.headline || `${total} known issue${total === 1 ? '' : 's'}`}
        </Text>
        <Text style={styles.subline} numberOfLines={1}>
          {summary?.recurring_categories?.length > 0
            ? `Top: ${summary.recurring_categories.map((c) => c.category).slice(0, 2).join(', ')}`
            : 'Tap to view details'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
}

/**
 * Helper for the parent screen — refreshes a cached lookup and returns the
 * updated payload. Exposed so the modal/list component doesn't need its own
 * import.
 */
SecureStayIssuesCard.refresh = (assignmentId) => refreshAssignmentIssues(assignmentId);
SecureStayIssuesCard.fetch = (assignmentId) => getAssignmentIssues(assignmentId);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.elevated,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  cardInfo: { backgroundColor: colors.accent.infoLight, borderColor: colors.accent.infoLight },
  cardOk: { backgroundColor: colors.accent.successLight, borderColor: colors.accent.successLight },
  cardWarn: { backgroundColor: colors.accent.warningLight, borderColor: colors.status.warning + '40' },
  cardError: { backgroundColor: colors.accent.errorLight, borderColor: colors.accent.errorLight },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: { flex: 1 },
  headline: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  subline: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  subtleText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  okText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
});
